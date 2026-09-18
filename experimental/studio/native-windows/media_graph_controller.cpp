#include "media_graph_controller.h"

namespace cari::native {

MediaGraphController::~MediaGraphController() {
    stop();
}

bool MediaGraphController::start(
    const cari::studio::core::OutputProfile& profile,
    std::uint32_t audio_sample_rate,
    std::uint16_t audio_channels,
    const std::wstring& ffmpeg_executable,
    const std::wstring& working_directory) {
    stop();
    stats_ = {};
    last_error_.clear();

    if (!output_.start(
            profile,
            audio_sample_rate,
            audio_channels,
            16u * 1024u * 1024u,
            4u * 1024u * 1024u,
            ffmpeg_executable,
            working_directory)) {
        last_error_ = output_.last_error();
        return false;
    }
    return true;
}

bool MediaGraphController::submit_video(
    const cari::studio::core::Frame& frame,
    const std::shared_ptr<std::vector<std::uint8_t>>& bgra) noexcept {
    if (!output_.submit_video(frame, bgra)) {
        ++stats_.video_dropped;
        last_error_ = output_.last_error();
        return false;
    }
    ++stats_.video_submitted;
    return true;
}

bool MediaGraphController::submit_audio(
    const cari::studio::core::AudioPacket& packet) noexcept {
    if (!output_.submit_audio(packet)) {
        ++stats_.audio_dropped;
        last_error_ = output_.last_error();
        return false;
    }
    ++stats_.audio_submitted;
    return true;
}

bool MediaGraphController::poll() noexcept {
    ++stats_.polls;
    if (!output_.poll()) {
        ++stats_.poll_failures;
        last_error_ = output_.last_error();
        return false;
    }
    return true;
}

void MediaGraphController::stop() noexcept {
    output_.stop();
}

} // namespace cari::native
