#pragma once

#include "native_media_output_bridge.h"

#include "../core/media_scheduler.h"

#include "../core/output_profile.h"
#include "../core/types.h"

#include <cstddef>
#include <cstdint>
#include <deque>
#include <memory>
#include <mutex>
#include <string>
#include <vector>

namespace cari::native {

struct MediaGraphStats {
    std::uint64_t video_queued = 0;
    std::uint64_t video_submitted = 0;
    std::uint64_t video_dropped = 0;
    std::uint64_t video_dropped_late = 0;
    std::uint64_t video_dropped_overflow = 0;
    std::uint64_t video_dropped_cadence = 0;
    std::uint64_t video_dropped_format = 0;
    std::uint64_t audio_queued = 0;
    std::uint64_t audio_submitted = 0;
    std::uint64_t audio_dropped = 0;
    std::uint64_t audio_dropped_overflow = 0;
    std::uint64_t audio_dropped_format = 0;
    std::uint64_t audio_late = 0;
    std::uint64_t polls = 0;
    std::uint64_t poll_failures = 0;
};

class MediaGraphController final {
public:
    MediaGraphController() = default;
    ~MediaGraphController();

    MediaGraphController(const MediaGraphController&) = delete;
    MediaGraphController& operator=(const MediaGraphController&) = delete;

    bool start(
        const cari::studio::core::OutputProfile& profile,
        std::uint32_t audio_sample_rate = 48000,
        std::uint16_t audio_channels = 2,
        const std::wstring& ffmpeg_executable = L"ffmpeg.exe",
        const std::wstring& working_directory = {});

    bool submit_video(
        const cari::studio::core::Frame& frame,
        const std::shared_ptr<std::vector<std::uint8_t>>& bgra) noexcept;

    bool submit_audio(const cari::studio::core::AudioPacket& packet) noexcept;

    bool poll() noexcept;
    void stop() noexcept;

    [[nodiscard]] bool running() const noexcept;
    [[nodiscard]] bool connected() const noexcept;
    [[nodiscard]] FfmpegAvOutputState output_state() const noexcept;
    [[nodiscard]] unsigned long output_exit_code() const noexcept;
    [[nodiscard]] std::string last_error() const;
    [[nodiscard]] std::string stderr_text() const;
    [[nodiscard]] MediaGraphStats stats() const noexcept;
    [[nodiscard]] FfmpegAvOutputMetrics transport_metrics() const noexcept;

private:
    struct PendingVideo {
        cari::studio::core::Frame frame;
        std::shared_ptr<std::vector<std::uint8_t>> bgra;
    };

    static constexpr std::size_t kMaxPendingVideo = 8;
    static constexpr std::size_t kMaxPendingAudio = 32;

    mutable std::mutex mutex_;
    NativeMediaOutputBridge output_;
    std::deque<PendingVideo> pending_video_;
    std::deque<cari::studio::core::AudioPacket> pending_audio_;
    cari::studio::core::RealtimePacer pacer_{};
    std::uint32_t output_width_ = 0;
    std::uint32_t output_height_ = 0;
    std::uint32_t output_fps_ = 0;
    std::uint32_t output_audio_sample_rate_ = 0;
    std::uint16_t output_audio_channels_ = 0;
    cari::studio::core::Timestamp last_video_pts_ = 0;
    bool have_last_video_pts_ = false;
    MediaGraphStats stats_{};
    std::string last_error_;
};

} // namespace cari::native
