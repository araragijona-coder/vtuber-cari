#pragma once

#include <cstdint>
#include <functional>
#include <memory>
#include <mutex>
#include <string>

#include <dxgi.h>
#include <windows.h>
#include <wrl/client.h>

namespace cari::native {

struct CaptureStats {
    std::uint64_t frames = 0;
    std::uint64_t delivered = 0;
    std::uint64_t errors = 0;
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
    void stop();

    void set_frame_callback(FrameCallback callback);
    void clear_frame_callback();

    bool is_running() const noexcept { return running_; }
    CaptureStats stats() const noexcept;
    std::wstring last_error() const;

private:
    std::shared_ptr<Impl> impl_;
    std::wstring last_start_error_;
    bool running_ = false;
};

} // namespace cari::native
