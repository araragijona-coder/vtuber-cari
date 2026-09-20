#include "raw_media_adapter.h"

#include <limits>

namespace cari::native {

bool RawMediaAdapter::make_video(
    const cari::studio::core::Frame& frame,
    const std::shared_ptr<std::vector<std::uint8_t>>& bgra,
    RawVideoFrame& output) noexcept {
    output = {};
    output.pts = frame.pts;
    output.sequence = frame.sequence;
    output.width = frame.width;
    output.height = frame.height;
    output.bgra = bgra;
    return validate_video(output);
}

bool RawMediaAdapter::make_audio(
    const cari::studio::core::AudioPacket& packet,
    RawAudioFrame& output) noexcept {
    output = {};
    output.pts = packet.pts;
    output.sequence = packet.sequence;
    output.sample_rate = packet.sample_rate;
    output.channels = packet.channels;

    try {
        output.samples = std::make_shared<const std::vector<float>>(packet.samples);
    } catch (...) {
        output = {};
        return false;
    }
    return validate_audio(output);
}

bool RawMediaAdapter::validate_video(const RawVideoFrame& frame) noexcept {
    if (!frame.bgra || frame.width == 0 || frame.height == 0) {
        return false;
    }

    const auto pixel_count = static_cast<std::uint64_t>(frame.width) * frame.height;
    if (pixel_count > (std::numeric_limits<std::size_t>::max() / 4u)) {
        return false;
    }
    return frame.bgra->size() == static_cast<std::size_t>(pixel_count * 4u);
}

bool RawMediaAdapter::validate_audio(const RawAudioFrame& frame) noexcept {
    if (!frame.samples || frame.sample_rate == 0 || frame.channels == 0) {
        return false;
    }
    if (frame.samples->empty()) {
        return false;
    }
    return (frame.samples->size() % frame.channels) == 0;
}

const std::uint8_t* RawMediaAdapter::audio_bytes(const RawAudioFrame& frame) noexcept {
    if (!validate_audio(frame)) {
        return nullptr;
    }
    return reinterpret_cast<const std::uint8_t*>(frame.samples->data());
}

std::size_t RawMediaAdapter::audio_byte_size(const RawAudioFrame& frame) noexcept {
    if (!validate_audio(frame)) {
        return 0;
    }
    if (frame.samples->size() > std::numeric_limits<std::size_t>::max() / sizeof(float)) {
        return 0;
    }
    return frame.samples->size() * sizeof(float);
}

} // namespace cari::native
