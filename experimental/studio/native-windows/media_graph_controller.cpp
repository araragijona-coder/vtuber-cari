#include "media_graph_controller.h"

#include "../core/media_scheduler.h"

#include <algorithm>
#include <limits>
#include <utility>

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
    std::lock_guard lock(mutex_);
    stats_ = {};
    last_error_.clear();
    pending_video_.clear();
    pending_audio_.clear();
    pacer_.reset();

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
    std::lock_guard lock(mutex_);
    if (!output_.running() || !bgra) {
        ++stats_.video_dropped;
        last_error_ = "video submitted while output is not running";
        return false;
    }

    if (pending_video_.size() >= kMaxPendingVideo) {
        pending_video_.pop_front();
        ++stats_.video_dropped_overflow;
        ++stats_.video_dropped;
    }

    pending_video_.push_back(PendingVideo{frame, bgra});
    ++stats_.video_queued;
    return true;
}

bool MediaGraphController::submit_audio(
    const cari::studio::core::AudioPacket& packet) noexcept {
    std::lock_guard lock(mutex_);
    if (!output_.running() || packet.samples.empty() ||
        packet.sample_rate == 0 || packet.channels == 0 ||
        packet.samples.size() % packet.channels != 0) {
        ++stats_.audio_dropped;
        last_error_ = "invalid audio packet or output is not running";
        return false;
    }

    if (pending_audio_.size() >= kMaxPendingAudio) {
        ++stats_.audio_dropped_overflow;
        ++stats_.audio_dropped;
        return false;
    }

    pending_audio_.push_back(packet);
    ++stats_.audio_queued;
    return true;
}

bool MediaGraphController::poll() noexcept {
    std::lock_guard lock(mutex_);
    ++stats_.polls;
    if (!output_.poll()) {
        ++stats_.poll_failures;
        last_error_ = output_.last_error();
        pending_video_.clear();
        pending_audio_.clear();
        return false;
    }

    if (!output_.running()) {
        // FFmpeg exited or the output was closed. Release queued media now;
        // do not retain frames/audio until the next session.
        pending_video_.clear();
        pending_audio_.clear();
        return true;
    }

    if (!output_.connected()) {
        // Both named pipes must be connected before any bytes are written.
        return true;
    }

    const auto wall_now = cari::studio::core::MediaClock::monotonic_now();
    if (!pacer_.initialized() &&
        (!pending_audio_.empty() || !pending_video_.empty())) {
        const auto audio_pts = pending_audio_.empty()
            ? std::numeric_limits<cari::studio::core::Timestamp>::max()
            : pending_audio_.front().pts;
        const auto video_pts = pending_video_.empty()
            ? std::numeric_limits<cari::studio::core::Timestamp>::max()
            : pending_video_.front().frame.pts;
        pacer_.arm(std::min(audio_pts, video_pts), wall_now);
    }

    while (!pending_audio_.empty()) {
        const auto decision = pacer_.decide(
            pending_audio_.front().pts, wall_now);
        if (decision == cari::studio::core::RealtimePaceDecision::wait) {
            break;
        }

        auto packet = std::move(pending_audio_.front());
        pending_audio_.pop_front();
        if (!output_.submit_audio(packet)) {
            ++stats_.audio_dropped;
            last_error_ = output_.last_error();
            break;
        }
        ++stats_.audio_submitted;
    }

    while (!pending_video_.empty()) {
        const auto decision = pacer_.decide(
            pending_video_.front().frame.pts, wall_now);
        if (decision == cari::studio::core::RealtimePaceDecision::wait) {
            break;
        }

        if (decision == cari::studio::core::RealtimePaceDecision::late) {
            pending_video_.pop_front();
            ++stats_.video_dropped_late;
            ++stats_.video_dropped;
            continue;
        }

        auto video = std::move(pending_video_.front());
        pending_video_.pop_front();
        if (!output_.submit_video(video.frame, video.bgra)) {
            ++stats_.video_dropped;
            last_error_ = output_.last_error();
            break;
        }
        ++stats_.video_submitted;
    }

    return true;
}

void MediaGraphController::stop() noexcept {
    std::lock_guard lock(mutex_);
    pending_video_.clear();
    pending_audio_.clear();
    pacer_.reset();
    output_.stop();
}

bool MediaGraphController::running() const noexcept {
    std::lock_guard lock(mutex_);
    return output_.running();
}

bool MediaGraphController::connected() const noexcept {
    std::lock_guard lock(mutex_);
    return output_.connected();
}

std::string MediaGraphController::last_error() const {
    std::lock_guard lock(mutex_);
    return last_error_;
}

std::string MediaGraphController::stderr_text() const {
    std::lock_guard lock(mutex_);
    return output_.stderr_text();
}

MediaGraphStats MediaGraphController::stats() const noexcept {
    std::lock_guard lock(mutex_);
    return stats_;
}

FfmpegAvOutputMetrics MediaGraphController::transport_metrics() const noexcept {
    std::lock_guard lock(mutex_);
    return output_.transport_metrics();
}

} // namespace cari::native
