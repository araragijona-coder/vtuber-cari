#pragma once

#include "ffmpeg_av_output.h"
#include "raw_media_adapter.h"

#include "../core/output_profile.h"
#include "../core/types.h"

#include <cstddef>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace cari::native {

struct NativeMediaOutputBridgeStats {
    std::uint64_t video_frames = 0;
    std::uint64_t audio_frames = 0;
    std::uint64_t video_bytes = 0;
    std::uint64_t audio_bytes = 0;
    std::uint64_t video_rejected = 0;
    std::uint64_t audio_rejected = 0;
    std::uint64_t video_write_failures = 0;
    std::uint64_t audio_write_failures = 0;
    std::uint64_t poll_failures = 0;
};

// Connects already timestamped/validated native media to FfmpegAvOutput.
// It deliberately does not mix audio, resample, invent timestamps, or alter
// video cadence. Those responsibilities remain upstream in the media graph.
class NativeMediaOutputBridge final {
public:
    NativeMediaOutputBridge() = default;
    ~NativeMediaOutputBridge();

    NativeMediaOutputBridge(const NativeMediaOutputBridge&) = delete;
    NativeMediaOutputBridge& operator=(const NativeMediaOutputBridge&) = delete;

    bool start(
        const cari::studio::core::OutputProfile& profile,
        std::uint32_t audio_sample_rate,
        std::uint16_t audio_channels,
        std::size_t max_video_pending_bytes = 16u * 1024u * 1024u,
        std::size_t max_audio_pending_bytes = 4u * 1024u * 1024u,
        const std::wstring& ffmpeg_executable = L"ffmpeg.exe",
        const std::wstring& working_directory = {});

    bool submit_video(const cari::studio::core::Frame& frame,
                      const std::shared_ptr<std::vector<std::uint8_t>>& bgra) noexcept;
    bool submit_audio(const cari::studio::core::AudioPacket& packet) noexcept;
    bool poll() noexcept;
    void stop() noexcept;

    [[nodiscard]] bool running() const noexcept { return output_.running(); }
    [[nodiscard]] bool connected() const noexcept { return output_.connected(); }
    [[nodiscard]] FfmpegAvOutputState state() const noexcept { return output_.state(); }
    [[nodiscard]] const std::string& last_error() const noexcept { return last_error_; }
    [[nodiscard]] const std::string& stderr_text() const noexcept { return output_.stderr_text(); }
    [[nodiscard]] NativeMediaOutputBridgeStats stats() const noexcept { return stats_; }
    [[nodiscard]] FfmpegAvOutputMetrics transport_metrics() const noexcept { return output_.metrics(); }

private:
    void reject_video(const char* message) noexcept;
    void reject_audio(const char* message) noexcept;

    FfmpegAvOutput output_;
    NativeMediaOutputBridgeStats stats_{};
    std::string last_error_;
};

} // namespace cari::native
