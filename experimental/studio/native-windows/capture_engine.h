#pragma once

#include <cstdint>
#include <memory>
#include <string>

#include <windows.h>

namespace cari::native {

struct CaptureStats {
    std::uint64_t frames = 0;
    std::uint64_t errors = 0;
    double fps = 0.0;
    std::int32_t width = 0;
    std::int32_t height = 0;
};

class CaptureEngine final {
public:
    struct Impl;

    CaptureEngine() = default;
    ~CaptureEngine();

    CaptureEngine(const CaptureEngine&) = delete;
    CaptureEngine& operator=(const CaptureEngine&) = delete;

    bool start_window(HWND target_window);
    void stop();

    bool is_running() const noexcept { return running_; }
    CaptureStats stats() const noexcept;
    std::wstring last_error() const;

private:
    std::shared_ptr<Impl> impl_;
    bool running_ = false;
};

} // namespace cari::native
