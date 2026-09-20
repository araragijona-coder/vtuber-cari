#pragma once

#include "../core/types.h"

#include <atomic>
#include <cstdint>
#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

namespace cari::native {

struct MediaFoundationCameraInfo {
    std::wstring friendly_name;
    std::wstring symbolic_link;
};

struct MediaFoundationCameraStats {
    std::uint64_t frames = 0;
    std::uint64_t samples = 0;
    std::uint64_t errors = 0;
    std::uint32_t width = 0;
    std::uint32_t height = 0;
    std::uint32_t fps_num = 0;
    std::uint32_t fps_den = 1;
};

using MediaFoundationCameraCallback = std::function<void(
    const cari::studio::core::Frame&,
    const std::shared_ptr<std::vector<std::uint8_t>>&)>;

class MediaFoundationCamera final {
public:
    MediaFoundationCamera() = default;
    ~MediaFoundationCamera();

    MediaFoundationCamera(const MediaFoundationCamera&) = delete;
    MediaFoundationCamera& operator=(const MediaFoundationCamera&) = delete;

    bool start(
        std::size_t device_index,
        MediaFoundationCameraCallback callback,
        std::uint32_t requested_width = 1280,
        std::uint32_t requested_height = 720,
        std::uint32_t requested_fps = 30);

    void stop() noexcept;

    [[nodiscard]] bool running() const noexcept {
        return running_.load(std::memory_order_relaxed);
    }

    [[nodiscard]] MediaFoundationCameraStats stats() const noexcept;
    [[nodiscard]] std::wstring last_error() const;

    static std::vector<MediaFoundationCameraInfo> enumerate();

private:
    void run(
        std::size_t device_index,
        MediaFoundationCameraCallback callback,
        std::uint32_t requested_width,
        std::uint32_t requested_height,
        std::uint32_t requested_fps);

    void set_error(std::wstring message);

    std::atomic<bool> running_{false};
    std::atomic<std::uint64_t> frames_{0};
    std::atomic<std::uint64_t> samples_{0};
    std::atomic<std::uint64_t> errors_{0};
    std::atomic<std::uint32_t> width_{0};
    std::atomic<std::uint32_t> height_{0};
    std::atomic<std::uint32_t> fps_num_{0};
    std::atomic<std::uint32_t> fps_den_{1};

    mutable std::mutex error_mutex_;
    std::wstring last_error_;
    std::thread worker_;
};

} // namespace cari::native
