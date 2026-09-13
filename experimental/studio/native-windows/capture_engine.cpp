#include "capture_engine.h"

#include <d3d11.h>
#include <windows.graphics.capture.interop.h>
#include <windows.graphics.directx.direct3d11.interop.h>
#include <winrt/Windows.Graphics.Capture.h>
#include <winrt/Windows.Graphics.DirectX.Direct3D11.h>
#include <winrt/base.h>
#include <wrl/client.h>

#include <atomic>
#include <chrono>
#include <mutex>
#include <new>

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
    std::atomic<std::uint64_t> errors{0};
    std::atomic<double> fps{0.0};
    std::atomic<std::int32_t> width{0};
    std::atomic<std::int32_t> height{0};

    mutable std::mutex error_mutex;
    std::wstring last_error;
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

    ComPtr<IInspectable> inspectable;
    const HRESULT interop_hr = CreateDirect3D11DeviceFromDXGIDevice(
        dxgi_device.Get(), &inspectable);
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
        winrt::guid_of<ABI::Windows::Graphics::Capture::IGraphicsCaptureItem>(),
        reinterpret_cast<void**>(winrt::put_abi(item))));
    return item;
}

} // namespace

CaptureEngine::~CaptureEngine() {
    stop();
}

bool CaptureEngine::start_window(HWND target_window) {
    stop();

    if (!target_window || !IsWindow(target_window)) {
        return false;
    }

    try {
        auto impl = std::make_unique<Impl>();
        if (!winrt::Windows::Graphics::Capture::GraphicsCaptureSession::IsSupported()) {
            impl->set_error(L"Windows Graphics Capture is not supported on this system");
            delete impl.release();
            return false;
        }

        if (!create_d3d_device(*impl)) {
            delete impl.release();
            return false;
        }

        auto item = create_item_for_window(target_window);
        const auto size = item.Size();
        if (size.Width <= 0 || size.Height <= 0) {
            impl->set_error(L"Capture target returned an invalid size");
            delete impl.release();
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

        auto weak_impl = impl.get();
        impl->frame_token = impl->frame_pool.FrameArrived(
            [weak_impl](auto const& sender, auto const&) {
                try {
                    auto frame = sender.TryGetNextFrame();
                    if (!frame) {
                        return;
                    }

                    const auto content = frame.ContentSize();
                    weak_impl->width.store(content.Width, std::memory_order_relaxed);
                    weak_impl->height.store(content.Height, std::memory_order_relaxed);
                    const auto frame_count =
                        weak_impl->frames.fetch_add(1, std::memory_order_relaxed) + 1;

                    const auto now = std::chrono::steady_clock::now();
                    const auto elapsed = std::chrono::duration<double>(
                        now - weak_impl->sample_start).count();
                    if (elapsed >= 0.5) {
                        const double measured =
                            static_cast<double>(frame_count - weak_impl->sample_frames) / elapsed;
                        weak_impl->fps.store(measured, std::memory_order_relaxed);
                        weak_impl->sample_frames = frame_count;
                        weak_impl->sample_start = now;
                    }
                } catch (const winrt::hresult_error& error) {
                    weak_impl->set_error(
                        L"Capture frame processing failed: HRESULT " +
                        std::to_wstring(static_cast<unsigned long>(error.code().value)));
                } catch (const std::exception& error) {
                    weak_impl->set_error(
                        winrt::to_hstring(error.what()).c_str());
                }
            });

        impl->session = impl->frame_pool.CreateCaptureSession(item);
        impl->session.StartCapture();

        impl_ = impl.release();
        running_ = true;
        return true;
    } catch (const winrt::hresult_error& error) {
        if (impl_) {
            impl_->set_error(
                L"Capture startup failed: HRESULT " +
                std::to_wstring(static_cast<unsigned long>(error.code().value)));
        }
        stop();
        return false;
    } catch (...) {
        stop();
        return false;
    }
}

void CaptureEngine::stop() {
    if (!impl_) {
        running_ = false;
        return;
    }

    try {
        if (impl_->frame_pool) {
            impl_->frame_pool.FrameArrived(impl_->frame_token);
        }
        if (impl_->session) {
            impl_->session.Close();
        }
        if (impl_->frame_pool) {
            impl_->frame_pool.Close();
        }
    } catch (...) {
        // Shutdown must be non-throwing; release native resources regardless.
    }

    delete impl_;
    impl_ = nullptr;
    running_ = false;
}

CaptureStats CaptureEngine::stats() const noexcept {
    CaptureStats result{};
    if (!impl_) {
        return result;
    }
    result.frames = impl_->frames.load(std::memory_order_relaxed);
    result.errors = impl_->errors.load(std::memory_order_relaxed);
    result.fps = impl_->fps.load(std::memory_order_relaxed);
    result.width = impl_->width.load(std::memory_order_relaxed);
    result.height = impl_->height.load(std::memory_order_relaxed);
    return result;
}

std::wstring CaptureEngine::last_error() const {
    if (!impl_) {
        return {};
    }
    std::lock_guard lock(impl_->error_mutex);
    return impl_->last_error;
}

} // namespace cari::native
