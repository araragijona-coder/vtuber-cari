#include "native_media_output_bridge.h"

#include <limits>

namespace cari::native {

NativeMediaOutputBridge::~NativeMediaOutputBridge() {
    stop();
}

bool NativeMediaOutputBridge::start(
    const cari::studio::core::OutputProfile& profile,
    std::uint32_t audio_sample_rate,
    std::uint16_t audio_channels,
    std::size_t max_video_pending_bytes,
    std::size_t max_audio_pending_bytes,
    const std::wstring& ffmpeg_executable,
    const std::wstring& working_directory) {
    stop();
    stats_ = {};
    last_error_.clear();

    if (audio_sample_rate == 0 || audio_channels == 0) {
        last_error_ = "Invalid audio format";
        return false;
    }

    if (!output_.start(
            profile,
            audio_sample_rate,
            audio_channels,
            max_video_pending_bytes,
            max_audio_pending_bytes,
            ffmpeg_executable,
            working_directory)) {
        last_error_ = output_.last_error();
        return false;
    }

    return true;
}

bool NativeMediaOutputBridge::submit_video(
    const cari::studio::core::Frame& frame,
    const std::shared_ptr<std::vector<std::uint8_t>>& bgra) noexcept {
    RawVideoFrame raw;
    if (!RawMediaAdapter::make_video(frame, bgra, raw) ||
        !RawMediaAdapter::validate_video(raw)) {
        reject_video("Raw video frame validation failed");
        return false;
    }

    const auto size = raw.bgra->size();
    if (!output_.write_video(raw.bgra->data(), size)) {
        ++stats_.video_write_failures;
        last_error_ = "FFmpeg video pipe write failed";
        return false;
    }

    ++stats_.video_frames;
    stats_.video_bytes += static_cast<std::uint64_t>(size);
    return true;
}

bool NativeMediaOutputBridge::submit_audio(
    const cari::studio::core::AudioPacket& packet) noexcept {
    RawAudioFrame raw;
    if (!RawMediaAdapter::make_audio(packet, raw) ||
        !RawMediaAdapter::validate_audio(raw)) {
        reject_audio("Raw audio frame validation failed");
        return false;
    }

    const auto size = RawMediaAdapter::audio_byte_size(raw);
    const auto* bytes = RawMediaAdapter::audio_bytes(raw);
    if (bytes == nullptr || size == 0) {
        reject_audio("Raw audio byte representation is empty");
        return false;
    }

    if (!output_.write_audio(bytes, size)) {
        ++stats_.audio_write_failures;
        last_error_ = "FFmpeg audio pipe write failed";
        return false;
    }

    ++stats_.audio_frames;
    stats_.audio_bytes += static_cast<std::uint64_t>(size);
    return true;
}

bool NativeMediaOutputBridge::poll() noexcept {
    if (!output_.poll()) {
        ++stats_.poll_failures;
        last_error_ = output_.last_error();
        return false;
    }
    return true;
}

void NativeMediaOutputBridge::stop() noexcept {
    output_.stop();
}

void NativeMediaOutputBridge::reject_video(const char* message) noexcept {
    ++stats_.video_rejected;
    last_error_ = message ? message : "Video rejected";
}

void NativeMediaOutputBridge::reject_audio(const char* message) noexcept {
    ++stats_.audio_rejected;
    last_error_ = message ? message : "Audio rejected";
}

} // namespace cari::native
