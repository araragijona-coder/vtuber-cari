#pragma once

#include <atomic>
#include <cstdint>
#include <functional>
#include <memory>
#include <mutex>
#include <string>

#include <dxgi.h>
#include <windows.h>
#include <wrl/client.h>
#include <winrt/Windows.Graphics.Capture.h>

namespace cari::native {

struct CaptureStats {
    std::uint64_t frames = 0;
    std::uint64_t delivered = 0;
    std::uint64_t errors = 0;
    std::uint64_t recreates = 0;
    std::uint64_t device_recoveries = 0;
    double fps = 0.0;
    std::int32_t width = 0;
    std::int32_t height = 0;
};

struct CapturedFrame {
    std::uint64_t sequence = 0;
    std::int64_t timestamp = 0;
    std::int32_t width = 0;
    std::int32_t height = 0;
    Microsoft::WRL::ComPtr<IDXGISurface> surface;
};

using FrameCallback = std::function<void(const CapturedFrame&)>;

class CaptureEngine final {
public:
    struct Impl;

    CaptureEngine() = default;
    ~CaptureEngine();

    CaptureEngine(const CaptureEngine&) = delete;
    CaptureEngine& operator=(const CaptureEngine&) = delete;

    bool start_window(HWND target_window);
    bool start_display(HMONITOR monitor);
    void stop();

    void set_frame_callback(FrameCallback callback);
    void clear_frame_callback();

    bool is_running() const noexcept { return running_; }
    CaptureStats stats() const noexcept;
    std::wstring last_error() const;

private:
    bool start_capture_item(
        winrt::Windows::Graphics::Capture::GraphicsCaptureItem item);

    std::shared_ptr<Impl> impl_;
    std::wstring last_start_error_;
    mutable std::mutex callback_mutex_;
    FrameCallback callback_;
    bool running_ = false;
};

} // namespace cari::native
