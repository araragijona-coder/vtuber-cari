#pragma once

#include "../core/output_profile.h"
#include "../core/types.h"

#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace cari::native {

// Experimental direct FFmpeg-library output.
// Unlike the raw CLI pipe path, this class writes AVFrame/AVPacket timestamps
// directly through libavcodec/libavformat. It is intentionally separate from
// FfmpegAvOutput until a Windows development build is available and validated.
struct LibavMediaOutputStats {
    std::uint64_t video_frames_submitted = 0;
    std::uint64_t audio_packets_submitted = 0;
    std::uint64_t video_packets_written = 0;
    std::uint64_t audio_packets_written = 0;
    std::int64_t first_input_pts = -1;
    std::int64_t last_video_input_pts = -1;
    std::int64_t last_audio_input_pts = -1;
    std::int64_t last_video_packet_pts = -1;
    std::int64_t last_audio_packet_pts = -1;
    std::uint64_t video_packets_dropped = 0;
    std::uint64_t audio_packets_dropped = 0;
};

class LibavMediaOutput final {
public:
    LibavMediaOutput();
    ~LibavMediaOutput();

    LibavMediaOutput(const LibavMediaOutput&) = delete;
    LibavMediaOutput& operator=(const LibavMediaOutput&) = delete;

    bool start(
        const cari::studio::core::OutputProfile& profile,
        std::uint32_t input_audio_sample_rate = 48000,
        std::uint16_t input_audio_channels = 2);

    bool submit_video(
        const cari::studio::core::Frame& frame,
        const std::shared_ptr<std::vector<std::uint8_t>>& bgra) noexcept;

    bool submit_audio(
        const cari::studio::core::AudioPacket& packet) noexcept;

    void stop() noexcept;

    [[nodiscard]] bool running() const noexcept;
    [[nodiscard]] std::string last_error() const;
    [[nodiscard]] LibavMediaOutputStats stats() const noexcept;

private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

} // namespace cari::native
