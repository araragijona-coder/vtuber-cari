#include "media_foundation_camera.h"

#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <mferror.h>
#include <propvarutil.h>
#include <wrl/client.h>

#include <algorithm>
#include <cmath>
#include <cstring>
#include <utility>

using Microsoft::WRL::ComPtr;

namespace cari::native {
namespace {

std::wstring hresult_message(const wchar_t* operation, HRESULT hr) {
    return std::wstring(operation) + L" failed: HRESULT " +
        std::to_wstring(static_cast<unsigned long>(hr));
}

std::wstring read_activate_string(IMFActivate* activate, const GUID& key) {
    if (!activate) return {};

    UINT32 length = 0;
    if (FAILED(activate->GetStringLength(key, &length))) return {};

    std::wstring value(static_cast<std::size_t>(length) + 1, L'\0');
    if (FAILED(activate->GetString(key, value.data(), length + 1, nullptr))) {
        return {};
    }
    value.resize(length);
    return value;
}

bool select_video_type(
    IMFSourceReader* reader,
    std::uint32_t requested_width,
    std::uint32_t requested_height,
    std::uint32_t requested_fps) {
    ComPtr<IMFMediaType> type;
    if (FAILED(MFCreateMediaType(&type))) return false;

    type->SetGUID(MF_MT_MAJOR_TYPE, MFMediaType_Video);
    type->SetGUID(MF_MT_SUBTYPE, MFVideoFormat_RGB32);
    type->SetUINT32(MF_MT_INTERLACE_MODE, MFVideoInterlace_Progressive);
    type->SetUINT32(MF_MT_FRAME_SIZE, ((requested_width & 0xffffu) << 16) | (requested_height & 0xffffu));
    type->SetUINT32(MF_MT_FRAME_RATE, ((requested_fps & 0xffffu) << 16) | 1u);

    const HRESULT hr = reader->SetCurrentMediaType(
        MF_SOURCE_READER_FIRST_VIDEO_STREAM,
        nullptr,
        type.Get());
    return SUCCEEDED(hr);
}

bool read_current_type(
    IMFSourceReader* reader,
    std::uint32_t& width,
    std::uint32_t& height,
    std::uint32_t& fps_num,
    std::uint32_t& fps_den) {
    ComPtr<IMFMediaType> type;
    if (FAILED(reader->GetCurrentMediaType(
            MF_SOURCE_READER_FIRST_VIDEO_STREAM,
            &type))) {
        return false;
    }

    UINT32 frame_size = 0;
    UINT32 frame_rate = 0;
    if (FAILED(type->GetUINT32(MF_MT_FRAME_SIZE, &frame_size))) return false;
    type->GetUINT32(MF_MT_FRAME_RATE, &frame_rate);

    width = frame_size >> 16;
    height = frame_size & 0xffffu;
    fps_num = frame_rate >> 16;
    fps_den = std::max<std::uint32_t>(1, frame_rate & 0xffffu);
    return width != 0 && height != 0;
}

bool sample_to_bgra(
    IMFSample* sample,
    std::uint32_t width,
    std::uint32_t height,
    std::shared_ptr<std::vector<std::uint8_t>>& pixels) {
    if (!sample || width == 0 || height == 0) return false;

    ComPtr<IMFMediaBuffer> buffer;
    if (FAILED(sample->ConvertToContiguousBuffer(&buffer))) return false;

    BYTE* bytes = nullptr;
    DWORD max_length = 0;
    DWORD current_length = 0;
    if (FAILED(buffer->Lock(&bytes, &max_length, &current_length))) return false;

    const std::size_t row_bytes = static_cast<std::size_t>(width) * 4u;
    const std::size_t expected = row_bytes * static_cast<std::size_t>(height);
    bool ok = current_length >= expected;

    if (ok) {
        try {
            pixels = std::make_shared<std::vector<std::uint8_t>>(expected);
            std::memcpy(pixels->data(), bytes, expected);
        } catch (...) {
            pixels.reset();
            ok = false;
        }
    }

    buffer->Unlock();
    return ok;
}

} // namespace

MediaFoundationCamera::~MediaFoundationCamera() {
    stop();
}

std::vector<MediaFoundationCameraInfo> MediaFoundationCamera::enumerate() {
    std::vector<MediaFoundationCameraInfo> result;

    if (FAILED(MFStartup(MF_VERSION, MFSTARTUP_LITE))) {
        return result;
    }

    ComPtr<IMFAttributes> attributes;
    if (FAILED(MFCreateAttributes(&attributes, 1))) {
        MFShutdown();
        return result;
    }

    if (FAILED(attributes->SetGUID(
            MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE,
            MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE_VIDCAP_GUID))) {
        MFShutdown();
        return result;
    }

    IMFActivate** devices = nullptr;
    UINT32 count = 0;
    const HRESULT hr = MFEnumDeviceSources(attributes.Get(), &devices, &count);
    if (SUCCEEDED(hr) && devices != nullptr) {
        for (UINT32 i = 0; i < count; ++i) {
            if (!devices[i]) continue;

            const auto friendly = read_activate_string(
                devices[i], MF_DEVSOURCE_ATTRIBUTE_FRIENDLY_NAME);
            const auto symbolic = read_activate_string(
                devices[i], MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE_VIDCAP_SYMBOLIC_LINK);

            if (!friendly.empty()) {
                result.push_back({friendly, symbolic});
            }
            devices[i]->Release();
        }
        CoTaskMemFree(devices);
    }

    MFShutdown();
    return result;
}

bool MediaFoundationCamera::start(
    std::size_t device_index,
    MediaFoundationCameraCallback callback,
    std::uint32_t requested_width,
    std::uint32_t requested_height,
    std::uint32_t requested_fps) {
    stop();

    if (!callback || requested_width == 0 || requested_height == 0 || requested_fps == 0) {
        set_error(L"invalid Media Foundation camera start arguments");
        return false;
    }

    const auto devices = enumerate();
    if (device_index >= devices.size()) {
        set_error(L"Media Foundation camera device index is out of range");
        return false;
    }

    running_.store(true, std::memory_order_relaxed);
    frames_.store(0, std::memory_order_relaxed);
    samples_.store(0, std::memory_order_relaxed);
    errors_.store(0, std::memory_order_relaxed);
    width_.store(0, std::memory_order_relaxed);
    height_.store(0, std::memory_order_relaxed);
    fps_num_.store(0, std::memory_order_relaxed);
    fps_den_.store(1, std::memory_order_relaxed);
    {
        std::lock_guard lock(error_mutex_);
        last_error_.clear();
    }

    try {
        worker_ = std::thread(
            [this, device_index, callback = std::move(callback),
             requested_width, requested_height, requested_fps]() mutable {
                run(
                    device_index,
                    std::move(callback),
                    requested_width,
                    requested_height,
                    requested_fps);
            });
    } catch (...) {
        running_.store(false, std::memory_order_relaxed);
        set_error(L"unable to create Media Foundation camera worker thread");
        return false;
    }

    return true;
}

void MediaFoundationCamera::stop() noexcept {
    running_.store(false, std::memory_order_relaxed);
    if (worker_.joinable()) {
        worker_.join();
    }
}

void MediaFoundationCamera::set_error(std::wstring message) {
    {
        std::lock_guard lock(error_mutex_);
        last_error_ = std::move(message);
    }
    errors_.fetch_add(1, std::memory_order_relaxed);
}

MediaFoundationCameraStats MediaFoundationCamera::stats() const noexcept {
    return {
        frames_.load(std::memory_order_relaxed),
        samples_.load(std::memory_order_relaxed),
        errors_.load(std::memory_order_relaxed),
        width_.load(std::memory_order_relaxed),
        height_.load(std::memory_order_relaxed),
        fps_num_.load(std::memory_order_relaxed),
        fps_den_.load(std::memory_order_relaxed),
    };
}

std::wstring MediaFoundationCamera::last_error() const {
    std::lock_guard lock(error_mutex_);
    return last_error_;
}

void MediaFoundationCamera::run(
    std::size_t device_index,
    MediaFoundationCameraCallback callback,
    std::uint32_t requested_width,
    std::uint32_t requested_height,
    std::uint32_t requested_fps) {
    HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    const bool should_uninitialize = SUCCEEDED(hr);
    if (FAILED(hr) && hr != RPC_E_CHANGED_MODE) {
        set_error(hresult_message(L"CoInitializeEx", hr));
        running_.store(false, std::memory_order_relaxed);
        return;
    }

    if (FAILED(MFStartup(MF_VERSION, MFSTARTUP_FULL))) {
        set_error(L"MFStartup failed");
        if (should_uninitialize) CoUninitialize();
        running_.store(false, std::memory_order_relaxed);
        return;
    }

    ComPtr<IMFAttributes> attributes;
    hr = MFCreateAttributes(&attributes, 2);
    if (FAILED(hr)) {
        set_error(hresult_message(L"MFCreateAttributes", hr));
        MFShutdown();
        if (should_uninitialize) CoUninitialize();
        running_.store(false, std::memory_order_relaxed);
        return;
    }

    hr = attributes->SetGUID(
        MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE,
        MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE_VIDCAP_GUID);
    if (FAILED(hr)) {
        set_error(hresult_message(L"SetGUID(video capture source type)", hr));
        MFShutdown();
        if (should_uninitialize) CoUninitialize();
        running_.store(false, std::memory_order_relaxed);
        return;
    }

    hr = attributes->SetUINT32(MF_SOURCE_READER_ENABLE_VIDEO_PROCESSING, TRUE);
    if (FAILED(hr)) {
        set_error(hresult_message(L"SetUINT32(MF_SOURCE_READER_ENABLE_VIDEO_PROCESSING)", hr));
        MFShutdown();
        if (should_uninitialize) CoUninitialize();
        running_.store(false, std::memory_order_relaxed);
        return;
    }

    ComPtr<IMFActivate> activate;
    {
        IMFActivate** devices = nullptr;
        UINT32 count = 0;
        hr = MFEnumDeviceSources(attributes.Get(), &devices, &count);
        if (SUCCEEDED(hr) && devices != nullptr) {
            if (device_index < count) {
                activate.Attach(devices[device_index]);
                devices[device_index] = nullptr;
            }
            for (UINT32 i = 0; i < count; ++i) {
                if (devices[i]) devices[i]->Release();
            }
            CoTaskMemFree(devices);
        }
    }

    if (!activate) {
        set_error(L"failed to activate selected Media Foundation camera");
        MFShutdown();
        if (should_uninitialize) CoUninitialize();
        running_.store(false, std::memory_order_relaxed);
        return;
    }

    ComPtr<IMFMediaSource> source;
    hr = activate->ActivateObject(
        __uuidof(IMFMediaSource),
        reinterpret_cast<void**>(source.GetAddressOf()));
    if (FAILED(hr)) {
        set_error(hresult_message(L"IMFActivate::ActivateObject", hr));
        MFShutdown();
        if (should_uninitialize) CoUninitialize();
        running_.store(false, std::memory_order_relaxed);
        return;
    }

    ComPtr<IMFAttributes> reader_attributes;
    MFCreateAttributes(&reader_attributes, 2);
    if (reader_attributes) {
        reader_attributes->SetUINT32(
            MF_SOURCE_READER_ENABLE_VIDEO_PROCESSING, TRUE);
    }

    ComPtr<IMFSourceReader> reader;
    hr = MFCreateSourceReaderFromMediaSource(
        source.Get(),
        reader_attributes.Get(),
        &reader);
    if (FAILED(hr)) {
        set_error(hresult_message(L"MFCreateSourceReaderFromMediaSource", hr));
        source->Shutdown();
        MFShutdown();
        if (should_uninitialize) CoUninitialize();
        running_.store(false, std::memory_order_relaxed);
        return;
    }

    if (!select_video_type(
            reader.Get(),
            requested_width,
            requested_height,
            requested_fps)) {
        // Fall back to the camera's native video type and request RGB32
        // only if the source supports conversion.
        ComPtr<IMFMediaType> native_type;
        if (FAILED(reader->GetNativeMediaType(
                MF_SOURCE_READER_FIRST_VIDEO_STREAM, 0, &native_type))) {
            set_error(L"camera does not expose a readable video media type");
            source->Shutdown();
            MFShutdown();
            if (should_uninitialize) CoUninitialize();
            running_.store(false, std::memory_order_relaxed);
            return;
        }
        native_type->SetGUID(MF_MT_SUBTYPE, MFVideoFormat_RGB32);
        if (FAILED(reader->SetCurrentMediaType(
                MF_SOURCE_READER_FIRST_VIDEO_STREAM, nullptr, native_type.Get()))) {
            set_error(L"camera could not be configured as RGB32");
            source->Shutdown();
            MFShutdown();
            if (should_uninitialize) CoUninitialize();
            running_.store(false, std::memory_order_relaxed);
            return;
        }
    }

    std::uint32_t width = 0;
    std::uint32_t height = 0;
    std::uint32_t fps_num = 0;
    std::uint32_t fps_den = 1;
    if (!read_current_type(
            reader.Get(), width, height, fps_num, fps_den)) {
        set_error(L"failed to read active Media Foundation camera format");
        source->Shutdown();
        MFShutdown();
        if (should_uninitialize) CoUninitialize();
        running_.store(false, std::memory_order_relaxed);
        return;
    }

    width_.store(width, std::memory_order_relaxed);
    height_.store(height, std::memory_order_relaxed);
    fps_num_.store(fps_num, std::memory_order_relaxed);
    fps_den_.store(fps_den, std::memory_order_relaxed);

    while (running_.load(std::memory_order_relaxed)) {
        DWORD stream_index = 0;
        DWORD flags = 0;
        LONGLONG timestamp = 0;
        ComPtr<IMFSample> sample;

        hr = reader->ReadSample(
            MF_SOURCE_READER_FIRST_VIDEO_STREAM,
            0,
            &stream_index,
            &flags,
            &timestamp,
            &sample);

        if (FAILED(hr)) {
            set_error(hresult_message(L"IMFSourceReader::ReadSample", hr));
            break;
        }

        if (flags & MF_SOURCE_READERF_ENDOFSTREAM) {
            break;
        }

        if (flags & MF_SOURCE_READERF_ERROR) {
            set_error(L"Media Foundation camera reported a source reader error");
            break;
        }

        if (!sample) {
            continue;
        }

        std::shared_ptr<std::vector<std::uint8_t>> pixels;
        if (!sample_to_bgra(sample.Get(), width, height, pixels)) {
            set_error(L"failed to convert Media Foundation camera sample to BGRA");
            break;
        }

        cari::studio::core::Frame frame{};
        frame.pts = static_cast<cari::studio::core::Timestamp>(timestamp);
        frame.width = width;
        frame.height = height;
        frame.stride = width * 4u;
        frame.format = 1; // BGRA8, matching the native capture/output contract.
        frame.sequence = frames_.load(std::memory_order_relaxed) + 1;

        try {
            callback(frame, pixels);
        } catch (...) {
            set_error(L"Media Foundation camera callback raised an exception");
            break;
        }

        frames_.fetch_add(1, std::memory_order_relaxed);
        samples_.fetch_add(1, std::memory_order_relaxed);
    }

    source->Shutdown();
    MFShutdown();
    if (should_uninitialize) CoUninitialize();
    running_.store(false, std::memory_order_relaxed);
}

} // namespace cari::native
