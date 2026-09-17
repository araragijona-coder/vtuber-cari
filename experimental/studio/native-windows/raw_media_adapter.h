#pragma once

#include "../core/types.h"

#include <cstddef>
#include <cstdint>
#include <memory>
#include <vector>

namespace cari::native {

struct RawVideoFrame {
    std::int64_t pts = 0;
    std::uint64_t sequence = 0;
    std::uint32_t width = 0;
    std::uint32_t height = 0;
    std::shared_ptr<const std::vector<std::uint8_t>> bgra;
};

struct RawAudioFrame {
    std::int64_t pts = 0;
    std::uint64_t sequence = 0;
    std::uint32_t sample_rate = 0;
    std::uint16_t channels = 0;
    std::shared_ptr<const std::vector<float>> samples;
};

// Converts the core frame/audio payloads to the exact byte representation
// consumed by FFmpeg's rawvideo and f32le demuxers. No allocation occurs for
// video because the reference capture bridge already owns a byte payload.
class RawMediaAdapter final {
public:
    static bool make_video(
        const cari::studio::core::Frame& frame,
        const std::shared_ptr<std::vector<std::uint8_t>>& bgra,
        RawVideoFrame& output) noexcept;

    static bool make_audio(
        const cari::studio::core::AudioPacket& packet,
        RawAudioFrame& output) noexcept;

    static bool validate_video(const RawVideoFrame& frame) noexcept;
    static bool validate_audio(const RawAudioFrame& frame) noexcept;

    static const std::uint8_t* audio_bytes(
        const RawAudioFrame& frame) noexcept;
    static std::size_t audio_byte_size(const RawAudioFrame& frame) noexcept;
};

} // namespace cari::native
