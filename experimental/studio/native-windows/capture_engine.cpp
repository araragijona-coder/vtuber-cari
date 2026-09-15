#include "capture_engine.h"

#include <d3d11.h>
#include <windows.graphics.capture.interop.h>
#include <windows.graphics.directx.direct3d11.interop.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Graphics.Capture.h>
#include <winrt/Windows.Graphics.DirectX.Direct3D11.h>
#include <winrt/base.h>
#include <wrl/client.h>

#include <atomic>
#include <chrono>
#include <exception>
#include <mutex>
#include <string>
#include <utility>

using Microsoft::WRL::ComPtr;

namespace cari::native {

struct CaptureEngine::Impl {
    ComPtr<ID3D11Device> d3d_device;
    ComPtr<ID3D11DeviceContext> d3d_context;
    winrt::Windows::Graphics::DirectX::Direct3D11::IDirect3DDevice winrt_device{nullptr};
    winrt::Windows::Graphics::Capture::Direct3D11CaptureFramePool frame_pool{nullptr};
    winrt::Windows::Graphics::Capture::GraphicsCaptureSession session{nullptr};
    winrt::event_token frame_token{};

    std::atomic<std::uint64_t> frames{0};
    std::atomic<std::uint64_t> delivered{0};
    std::atomic<std::uint64_t> errors{0};
    std::atomic<std::uint64_t> recreates{0};
    std::atomic<double> fps{0.0};
    std::atomic<std::int32_t> width{0};
    std::atomic<std::int32_t> height{0};

    mutable std::mutex error_mutex;
    std::wstring last_error;

    mutable std::mutex callback_mutex;
    FrameCallback callback;

    std::chrono::steady_clock::time_point sample_start = std::chrono::steady_clock::now();
    std::uint64_t sample_frames = 0;

    void set_error(std::wstring message) {
        std::lock_guard lock(error_mutex);
        last_error = std::move(message);
        errors.fetch_add(1, std::memory_order_relaxed);
    }
};

namespace {

bool create_d3d_device(CaptureEngine::Impl& impl) {
    constexpr D3D_FEATURE_LEVEL levels[] = {
        D3D_FEATURE_LEVEL_11_1,
        D3D_FEATURE_LEVEL_11_0,
    };
    D3D_FEATURE_LEVEL selected{};

    const HRESULT hr = D3D11CreateDevice(
        nullptr,
        D3D_DRIVER_TYPE_HARDWARE,
        nullptr,
        D3D11_CREATE_DEVICE_BGRA_SUPPORT,
        levels,
        ARRAYSIZE(levels),
        D3D11_SDK_VERSION,
        &impl.d3d_device,
        &selected,
        &impl.d3d_context);
    if (FAILED(hr)) {
        impl.set_error(L"D3D11CreateDevice failed: HRESULT " +
                       std::to_wstring(static_cast<unsigned long>(hr)));
        return false;
    }

    ComPtr<IDXGIDevice> dxgi_device;
    if (FAILED(impl.d3d_device.As(&dxgi_device))) {
        impl.set_error(L"The D3D11 device did not expose IDXGIDevice");
        return false;
    }

    winrt::com_ptr<IInspectable> inspectable;
    const HRESULT interop_hr = CreateDirect3D11DeviceFromDXGIDevice(
        dxgi_device.Get(), inspectable.put());
    if (FAILED(interop_hr)) {
        impl.set_error(L"CreateDirect3D11DeviceFromDXGIDevice failed: HRESULT " +
                       std::to_wstring(static_cast<unsigned long>(interop_hr)));
        return false;
    }

    impl.winrt_device = inspectable.as<
        winrt::Windows::Graphics::DirectX::Direct3D11::IDirect3DDevice>();
    return true;
}

winrt::Windows::Graphics::Capture::GraphicsCaptureItem create_item_for_window(HWND target) {
    auto factory = winrt::get_activation_factory<
        winrt::Windows::Graphics::Capture::GraphicsCaptureItem,
        IGraphicsCaptureItemInterop>();

    winrt::Windows::Graphics::Capture::GraphicsCaptureItem item{nullptr};
    winrt::check_hresult(factory->CreateForWindow(
        target,
        winrt::guid_of<winrt::Windows::Graphics::Capture::GraphicsCaptureItem>(),
        winrt::put_abi(item)));
    return item;
}

std::wstring narrow_error(const char* text) {
    std::wstring result;
    if (!text) {
        return result;
    }
    while (*text) {
        result.push_back(static_cast<unsigned char>(*text));
        ++text;
    }
    return result;
}

} // namespace

CaptureEngine::~CaptureEngine() {
    stop();
}

void CaptureEngine::set_frame_callback(FrameCallback callback) {
    {
        std::lock_guard lock(callback_mutex_);
        callback_ = std::move(callback);
    }
    if (impl_) {
        std::lock_guard lock(impl_->callback_mutex);
        impl_->callback = callback_;
    }
}

void CaptureEngine::clear_frame_callback() {
    {
        std::lock_guard lock(callback_mutex_);
        callback_ = nullptr;
    }
    if (impl_) {
        std::lock_guard lock(impl_->callback_mutex);
        impl_->callback = nullptr;
    }
}

bool CaptureEngine::start_window(HWND target_window) {
    stop();
    last_start_error_.clear();

    auto impl = std::make_shared<Impl>();
    {
        std::lock_guard lock(callback_mutex_);
        impl->callback = callback_;
    }

    if (!target_window || !IsWindow(target_window)) {
        last_start_error_ = L"Capture target HWND is invalid";
        impl_ = impl;
        return false;
    }

    try {
        if (!winrt::Windows::Graphics::Capture::GraphicsCaptureSession::IsSupported()) {
            last_start_error_ = L"Windows Graphics Capture is not supported on this system";
            impl_ = impl;
            return false;
        }

        if (!create_d3d_device(*impl)) {
            std::lock_guard lock(impl->error_mutex);
            last_start_error_ = impl->last_error;
            impl_ = impl;
            return false;
        }

        auto item = create_item_for_window(target_window);
        const auto size = item.Size();
        if (size.Width <= 0 || size.Height <= 0) {
            impl->set_error(L"Capture target returned an invalid size");
            std::lock_guard lock(impl->error_mutex);
            last_start_error_ = impl->last_error;
            impl_ = impl;
            return false;
        }

        impl->width.store(size.Width, std::memory_order_relaxed);
        impl->height.store(size.Height, std::memory_order_relaxed);
        impl->sample_start = std::chrono::steady_clock::now();

        impl->frame_pool =
            winrt::Windows::Graphics::Capture::Direct3D11CaptureFramePool::CreateFreeThreaded(
                impl->winrt_device,
                winrt::Windows::Graphics::DirectX::DirectXPixelFormat::B8G8R8A8UIntNormalized,
                3,
                size);

        std::weak_ptr<Impl> weak_impl = impl;
        impl->frame_token = impl->frame_pool.FrameArrived(
            [weak_impl](auto const& sender, auto const&) {
                auto state = weak_impl.lock();
                if (!state) {
                    return;
                }
                try {
                    auto frame = sender.TryGetNextFrame();
                    if (!frame) {
                        return;
                    }

                    const auto content = frame.ContentSize();
                    const auto previous_width = state->width.exchange(content.Width, std::memory_order_relaxed);
                    const auto previous_height = state->height.exchange(content.Height, std::memory_order_relaxed);

                    if (content.Width <= 0 || content.Height <= 0) {
                        state->set_error(L"Capture frame reported an invalid size");
                        return;
                    }

                    // Microsoft recommends recreating the frame pool when the captured
                    // size changes so queued surfaces are not reused at the old size.
                    if (previous_width != content.Width || previous_height != content.Height) {
                        state->frame_pool.Recreate(
                            state->winrt_device,
                            winrt::Windows::Graphics::DirectX::DirectXPixelFormat::B8G8R8A8UIntNormalized,
                            3,
                            content);
                        state->recreates.fetch_add(1, std::memory_order_relaxed);
                    }

                    const auto frame_count =
                        state->frames.fetch_add(1, std::memory_order_relaxed) + 1;

                    const auto now = std::chrono::steady_clock::now();
                    const auto elapsed = std::chrono::duration<double>(
                        now - state->sample_start).count();
                    if (elapsed >= 0.5) {
                        const double measured =
                            static_cast<double>(frame_count - state->sample_frames) / elapsed;
                        state->fps.store(measured, std::memory_order_relaxed);
                        state->sample_frames = frame_count;
                        state->sample_start = now;
                    }

                    ComPtr<IDXGISurface> dxgi_surface;
                    auto surface = frame.Surface();
                    auto access = surface.as<
                        ::Windows::Graphics::DirectX::Direct3D11::IDirect3DDxgiInterfaceAccess>();
                    winrt::check_hresult(access->GetInterface(
                        winrt::guid_of<IDXGISurface>(),
                        reinterpret_cast<void**>(dxgi_surface.GetAddressOf())));

                    FrameCallback callback;
                    {
                        std::lock_guard lock(state->callback_mutex);
                        callback = state->callback;
                    }

                    if (callback) {
                        CapturedFrame captured{
                            frame_count,
                            frame.SystemRelativeTime().count(),
                            content.Width,
                            content.Height,
                            dxgi_surface};
                        try {
                            callback(captured);
                            state->delivered.fetch_add(1, std::memory_order_relaxed);
                        } catch (const std::exception& error) {
                            state->set_error(
                                L"Capture frame callback failed: " + narrow_error(error.what()));
                        } catch (...) {
                            state->set_error(L"Capture frame callback failed with unknown exception");
                        }
                    }
                } catch (const winrt::hresult_error& error) {
                    state->set_error(
                        L"Capture frame processing failed: HRESULT " +
                        std::to_wstring(static_cast<unsigned long>(error.code().value)));
                } catch (const std::exception& error) {
                    state->set_error(
                        L"Capture frame processing failed: " + narrow_error(error.what()));
                }
            });

        impl->session = impl->frame_pool.CreateCaptureSession(item);
        impl->session.StartCapture();

        impl_ = std::move(impl);
        running_ = true;
        return true;
    } catch (const winrt::hresult_error& error) {
        impl->set_error(
            L"Capture startup failed: HRESULT " +
            std::to_wstring(static_cast<unsigned long>(error.code().value)));
        last_start_error_ = impl->last_error;
        impl_ = impl;
        return false;
    } catch (const std::exception& error) {
        impl->set_error(L"Capture startup failed: " + narrow_error(error.what()));
        last_start_error_ = impl->last_error;
        impl_ = impl;
        return false;
    } catch (...) {
        impl->set_error(L"Capture startup failed with an unknown native exception");
        last_start_error_ = impl->last_error;
        impl_ = impl;
        return false;
    }
}

void CaptureEngine::stop() {
    auto state = std::move(impl_);
    running_ = false;
    if (!state) {
        return;
    }

    try {
        if (state->frame_pool) {
            state->frame_pool.FrameArrived(state->frame_token);
        }
        state->session = nullptr;
        state->frame_pool = nullptr;
        state->winrt_device = nullptr;
        state->d3d_context.Reset();
        state->d3d_device.Reset();
    } catch (...) {
        // Shutdown must remain non-throwing.
    }
}

CaptureStats CaptureEngine::stats() const noexcept {
    CaptureStats result{};
    if (!impl_) {
        return result;
    }
    result.frames = impl_->frames.load(std::memory_order_relaxed);
    result.delivered = impl_->delivered.load(std::memory_order_relaxed);
    result.errors = impl_->errors.load(std::memory_order_relaxed);
    result.fps = impl_->fps.load(std::memory_order_relaxed);
    result.width = impl_->width.load(std::memory_order_relaxed);
    result.height = impl_->height.load(std::memory_order_relaxed);
    return result;
}

std::wstring CaptureEngine::last_error() const {
    if (!impl_) {
        return last_start_error_;
    }
    std::lock_guard lock(impl_->error_mutex);
    return impl_->last_error.empty() ? last_start_error_ : impl_->last_error;
}

} // namespace cari::native
