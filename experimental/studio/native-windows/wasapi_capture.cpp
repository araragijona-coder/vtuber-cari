#include "wasapi_capture.h"

#include <audioclient.h>
#include <mmdeviceapi.h>
#include <ksmedia.h>
#include <windows.h>
#include <wrl/client.h>

#include <algorithm>
#include <cstring>
#include <utility>

using Microsoft::WRL::ComPtr;

namespace cari::native {
namespace {

std::wstring hresult_message(const wchar_t* operation, HRESULT hr) {
    return std::wstring(operation) + L" failed: HRESULT " +
           std::to_wstring(static_cast<unsigned long>(hr));
}

float pcm16_to_float(const std::uint8_t* data) {
    std::int16_t value = 0;
    std::memcpy(&value, data, sizeof(value));
    return static_cast<float>(value) / 32768.0f;
}

float pcm32_to_float(const std::uint8_t* data) {
    std::int32_t value = 0;
    std::memcpy(&value, data, sizeof(value));
    return static_cast<float>(value) / 2147483648.0f;
}

std::int64_t raw_qpc_to_100ns(std::int64_t qpc) {
    LARGE_INTEGER frequency{};
    if (!QueryPerformanceFrequency(&frequency) || frequency.QuadPart <= 0) {
        return 0;
    }
    const long double scaled =
        (static_cast<long double>(qpc) * 10000000.0L) /
        static_cast<long double>(frequency.QuadPart);
    return static_cast<std::int64_t>(scaled);
}

std::int64_t current_qpc_100ns() {
    LARGE_INTEGER qpc{};
    if (!QueryPerformanceCounter(&qpc)) {
        return 0;
    }
    return raw_qpc_to_100ns(qpc.QuadPart);
}

} // namespace

WasapiCapture::WasapiCapture() = default;

WasapiCapture::~WasapiCapture() {
    stop();
}

bool WasapiCapture::start(WasapiMode mode, AudioFrameCallback callback) {
    if (running_.exchange(true)) {
        return false;
    }

    packets_.store(0);
    frames_.store(0);
    errors_.store(0);
    sample_rate_.store(0);
    channels_.store(0);
    {
        std::lock_guard lock(error_mutex_);
        last_error_.clear();
    }

    try {
        worker_ = std::thread([this, mode, callback = std::move(callback)]() mutable {
            run(mode, std::move(callback));
        });
    } catch (...) {
        running_.store(false);
        set_error(L"Unable to create WASAPI worker thread");
        return false;
    }
    return true;
}

void WasapiCapture::stop() noexcept {
    running_.store(false);
    if (worker_.joinable()) {
        worker_.join();
    }
}

void WasapiCapture::set_error(std::wstring message) {
    {
        std::lock_guard lock(error_mutex_);
        last_error_ = std::move(message);
    }
    errors_.fetch_add(1, std::memory_order_relaxed);
}

AudioCaptureStats WasapiCapture::stats() const noexcept {
    return {
        packets_.load(std::memory_order_relaxed),
        frames_.load(std::memory_order_relaxed),
        errors_.load(std::memory_order_relaxed),
        sample_rate_.load(std::memory_order_relaxed),
        channels_.load(std::memory_order_relaxed),
    };
}

std::wstring WasapiCapture::last_error() const {
    std::lock_guard lock(error_mutex_);
    return last_error_;
}

void WasapiCapture::run(WasapiMode mode, AudioFrameCallback callback) {
    HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    const bool uninit = SUCCEEDED(hr);
    if (FAILED(hr) && hr != RPC_E_CHANGED_MODE) {
        set_error(hresult_message(L"CoInitializeEx", hr));
        running_.store(false);
        return;
    }

    ComPtr<IMMDeviceEnumerator> enumerator;
    hr = CoCreateInstance(
        __uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL,
        IID_PPV_ARGS(&enumerator));
    if (FAILED(hr)) {
        set_error(hresult_message(L"CoCreateInstance(MMDeviceEnumerator)", hr));
        if (uninit) CoUninitialize();
        running_.store(false);
        return;
    }

    const EDataFlow flow = mode == WasapiMode::microphone ? eCapture : eRender;
    ComPtr<IMMDevice> device;
    hr = enumerator->GetDefaultAudioEndpoint(flow, eConsole, &device);
    if (FAILED(hr)) {
        set_error(hresult_message(L"GetDefaultAudioEndpoint", hr));
        if (uninit) CoUninitialize();
        running_.store(false);
        return;
    }

    ComPtr<IAudioClient> client;
    hr = device->Activate(__uuidof(IAudioClient), CLSCTX_ALL, nullptr, &client);
    if (FAILED(hr)) {
        set_error(hresult_message(L"IMMDevice::Activate(IAudioClient)", hr));
        if (uninit) CoUninitialize();
        running_.store(false);
        return;
    }

    WAVEFORMATEX* mix_format = nullptr;
    hr = client->GetMixFormat(&mix_format);
    if (FAILED(hr) || !mix_format) {
        set_error(hresult_message(L"IAudioClient::GetMixFormat", hr));
        if (uninit) CoUninitialize();
        running_.store(false);
        return;
    }

    const bool is_float =
        mix_format->wFormatTag == WAVE_FORMAT_IEEE_FLOAT ||
        (mix_format->wFormatTag == WAVE_FORMAT_EXTENSIBLE &&
         mix_format->cbSize >= sizeof(WAVEFORMATEXTENSIBLE) - sizeof(WAVEFORMATEX) &&
         reinterpret_cast<const WAVEFORMATEXTENSIBLE*>(mix_format)->SubFormat ==
             KSDATAFORMAT_SUBTYPE_IEEE_FLOAT);
    const bool is_pcm =
        mix_format->wFormatTag == WAVE_FORMAT_PCM ||
        (mix_format->wFormatTag == WAVE_FORMAT_EXTENSIBLE &&
         mix_format->cbSize >= sizeof(WAVEFORMATEXTENSIBLE) - sizeof(WAVEFORMATEX) &&
         reinterpret_cast<const WAVEFORMATEXTENSIBLE*>(mix_format)->SubFormat ==
             KSDATAFORMAT_SUBTYPE_PCM);

    if (!is_float && !is_pcm) {
        CoTaskMemFree(mix_format);
        set_error(L"Unsupported WASAPI mix format");
        if (uninit) CoUninitialize();
        running_.store(false);
        return;
    }

    const std::uint32_t channels = mix_format->nChannels;
    const std::uint32_t sample_rate = mix_format->nSamplesPerSec;
    const std::uint32_t bits_per_sample = mix_format->wBitsPerSample;
    sample_rate_.store(sample_rate, std::memory_order_relaxed);
    channels_.store(static_cast<std::uint16_t>(channels), std::memory_order_relaxed);

    constexpr REFERENCE_TIME buffer_duration = 1000000; // 100 ms.
    DWORD flags = AUDCLNT_STREAMFLAGS_EVENTCALLBACK;
    if (mode == WasapiMode::system_loopback) {
        flags |= AUDCLNT_STREAMFLAGS_LOOPBACK;
    }

    hr = client->Initialize(
        AUDCLNT_SHAREMODE_SHARED, flags, buffer_duration, 0, mix_format, nullptr);
    if (FAILED(hr)) {
        CoTaskMemFree(mix_format);
        set_error(hresult_message(L"IAudioClient::Initialize", hr));
        if (uninit) CoUninitialize();
        running_.store(false);
        return;
    }

    HANDLE event = CreateEventW(nullptr, FALSE, FALSE, nullptr);
    if (!event) {
        CoTaskMemFree(mix_format);
        set_error(L"CreateEventW failed for WASAPI capture");
        if (uninit) CoUninitialize();
        running_.store(false);
        return;
    }

    hr = client->SetEventHandle(event);
    if (FAILED(hr)) {
        CloseHandle(event);
        CoTaskMemFree(mix_format);
        set_error(hresult_message(L"IAudioClient::SetEventHandle", hr));
        if (uninit) CoUninitialize();
        running_.store(false);
        return;
    }

    ComPtr<IAudioCaptureClient> capture;
    hr = client->GetService(IID_PPV_ARGS(&capture));
    if (FAILED(hr)) {
        CloseHandle(event);
        CoTaskMemFree(mix_format);
        set_error(hresult_message(L"IAudioClient::GetService(IAudioCaptureClient)", hr));
        if (uninit) CoUninitialize();
        running_.store(false);
        return;
    }

    hr = client->Start();
    if (FAILED(hr)) {
        CloseHandle(event);
        CoTaskMemFree(mix_format);
        set_error(hresult_message(L"IAudioClient::Start", hr));
        if (uninit) CoUninitialize();
        running_.store(false);
        return;
    }

    while (running_.load(std::memory_order_relaxed)) {
        const DWORD wait = WaitForSingleObject(event, 200);
        if (wait == WAIT_TIMEOUT) continue;
        if (wait != WAIT_OBJECT_0) {
            set_error(L"WaitForSingleObject failed for WASAPI event");
            break;
        }

        UINT32 packet_frames = 0;
        hr = capture->GetNextPacketSize(&packet_frames);
        if (FAILED(hr)) {
            set_error(hresult_message(L"IAudioCaptureClient::GetNextPacketSize", hr));
            break;
        }

        while (packet_frames > 0 && running_.load(std::memory_order_relaxed)) {
            BYTE* data = nullptr;
            UINT32 frames_available = 0;
            DWORD packet_flags = 0;
            UINT64 device_position = 0;
            UINT64 qpc_position = 0;
            hr = capture->GetBuffer(
                &data, &frames_available, &packet_flags,
                &device_position, &qpc_position);
            if (FAILED(hr)) {
                set_error(hresult_message(L"IAudioCaptureClient::GetBuffer", hr));
                break;
            }

            AudioCapturePacket packet;
            packet.sample_rate = sample_rate;
            packet.channels = static_cast<std::uint16_t>(channels);
            packet.timestamp =
                (qpc_position != 0 &&
                 (packet_flags & AUDCLNT_BUFFERFLAGS_TIMESTAMP_ERROR) == 0)
                    ? static_cast<std::int64_t>(qpc_position)
                    : current_qpc_100ns();
            packet.samples.resize(static_cast<std::size_t>(frames_available) * channels);

            if (packet_flags & AUDCLNT_BUFFERFLAGS_SILENT) {
                std::fill(packet.samples.begin(), packet.samples.end(), 0.0f);
            } else if (is_float && bits_per_sample == 32) {
                for (std::size_t i = 0; i < packet.samples.size(); ++i) {
                    float value = 0.0f;
                    std::memcpy(&value, data + i * sizeof(float), sizeof(float));
                    packet.samples[i] = std::clamp(value, -1.0f, 1.0f);
                }
            } else if (is_pcm && bits_per_sample == 16) {
                for (std::size_t i = 0; i < packet.samples.size(); ++i) {
                    packet.samples[i] = pcm16_to_float(data + i * sizeof(std::int16_t));
                }
            } else if (is_pcm && bits_per_sample == 32) {
                for (std::size_t i = 0; i < packet.samples.size(); ++i) {
                    packet.samples[i] = pcm32_to_float(data + i * sizeof(std::int32_t));
                }
            } else if (is_pcm && bits_per_sample == 24) {
                for (std::size_t i = 0; i < packet.samples.size(); ++i) {
                    const std::size_t offset = i * 3;
                    std::int32_t value =
                        static_cast<std::int32_t>(data[offset]) |
                        (static_cast<std::int32_t>(data[offset + 1]) << 8) |
                        (static_cast<std::int32_t>(data[offset + 2]) << 16);
                    if (value & 0x00800000) value |= 0xFF000000;
                    packet.samples[i] = static_cast<float>(value) / 8388608.0f;
                }
            } else {
                capture->ReleaseBuffer(frames_available);
                set_error(L"Unsupported WASAPI sample format");
                running_.store(false);
                break;
            }

            capture->ReleaseBuffer(frames_available);

            if (callback) {
                try {
                    callback(packet);
                } catch (...) {
                    set_error(L"WASAPI audio callback raised an exception");
                    running_.store(false);
                    break;
                }
            }

            packets_.fetch_add(1, std::memory_order_relaxed);
            frames_.fetch_add(frames_available, std::memory_order_relaxed);

            hr = capture->GetNextPacketSize(&packet_frames);
            if (FAILED(hr)) {
                set_error(hresult_message(L"IAudioCaptureClient::GetNextPacketSize", hr));
                running_.store(false);
                break;
            }
        }
    }

    client->Stop();
    CloseHandle(event);
    CoTaskMemFree(mix_format);
    if (uninit) CoUninitialize();
    running_.store(false);
}

} // namespace cari::native
