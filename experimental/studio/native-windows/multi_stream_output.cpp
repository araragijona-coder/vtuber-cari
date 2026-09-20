#include "multi_stream_output.h"

#include <algorithm>
#include <mutex>

namespace cari::native {

struct MultiStreamOutput::Destination {
    std::string id;
    std::string target;
    cari::studio::core::OutputProfile profile;
    std::wstring ffmpeg_executable;
    FfmpegAvOutput output;
    cari::studio::core::OutputRetryPolicy retry;
    cari::studio::core::OutputFailureCategory failure_category =
        cari::studio::core::OutputFailureCategory::none;
    std::uint64_t retry_attempts = 0;
    bool failed = false;
};

namespace {

const char* category_name(cari::studio::core::OutputFailureCategory category) noexcept {
    switch (category) {
    case cari::studio::core::OutputFailureCategory::network: return "network";
    case cari::studio::core::OutputFailureCategory::encoder: return "encoder";
    case cari::studio::core::OutputFailureCategory::input: return "input";
    case cari::studio::core::OutputFailureCategory::mux: return "mux";
    case cari::studio::core::OutputFailureCategory::permission: return "permission";
    case cari::studio::core::OutputFailureCategory::unknown: return "unknown";
    case cari::studio::core::OutputFailureCategory::none: default: return "none";
    }
}

std::string state_name(FfmpegAvOutputState state) {
    switch (state) {
    case FfmpegAvOutputState::starting: return "starting";
    case FfmpegAvOutputState::running: return "running";
    case FfmpegAvOutputState::exited: return "exited";
    case FfmpegAvOutputState::failed: return "failed";
    case FfmpegAvOutputState::stopped: default: return "stopped";
    }
}

} // namespace

MultiStreamOutput::~MultiStreamOutput() {
    stop();
}

bool MultiStreamOutput::start(
    const cari::studio::core::OutputProfile& base_profile,
    const std::vector<std::string>& targets,
    const std::wstring& ffmpeg_executable) {
    stop();
    stats_ = {};
    stats_.destination_limit = kMaxDestinations;

    if (targets.empty() || targets.size() > kMaxDestinations) {
        return false;
    }

    for (std::size_t index = 0; index < targets.size(); ++index) {
        if (targets[index].empty()) {
            continue;
        }
        auto destination = std::make_unique<Destination>();
        destination->id = "output-" + std::to_string(index + 1);
        destination->target = targets[index];
        destination->profile = base_profile;
        destination->profile.target = targets[index];
        destination->ffmpeg_executable = ffmpeg_executable;

        if (start_destination(*destination)) {
            ++stats_.destinations_started;
        } else {
            destination->failed = true;
            ++stats_.destinations_failed;
        }
        destinations_.push_back(std::move(destination));
    }

    return stats_.destinations_started > 0;
}

bool MultiStreamOutput::start_destination(Destination& destination) {
    if (!destination.output.start(
            destination.profile, 48000, 2,
            8u * 1024u * 1024u, 2u * 1024u * 1024u,
            destination.ffmpeg_executable)) {
        const std::string diagnostic =
            destination.output.last_error() + "\n" +
            destination.output.stderr_text();
        destination.failure_category =
            cari::studio::core::classify_output_failure(diagnostic);
        return false;
    }
    destination.failed = false;
    destination.failure_category = cari::studio::core::OutputFailureCategory::none;
    destination.retry.on_success();
    return true;
}

void MultiStreamOutput::schedule_retry(Destination& destination) noexcept {
    const std::string diagnostic =
        destination.output.last_error() + "\n" +
        destination.output.stderr_text();
    const auto category =
        cari::studio::core::classify_output_failure(diagnostic);
    destination.failure_category = category;

    if (destination.profile.kind != cari::studio::core::OutputKind::rtmp ||
        category != cari::studio::core::OutputFailureCategory::network) {
        return;
    }

    if (destination.retry.schedule_failure(cari::studio::core::MediaClock::monotonic_now())) {
        ++destination.retry_attempts;
        ++stats_.retry_attempts;
    }
}

bool MultiStreamOutput::submit_video(
    const cari::studio::core::Frame& frame,
    const std::shared_ptr<std::vector<std::uint8_t>>& bgra) noexcept {
    bool any_success = false;
    ++stats_.video_frames_submitted;
    for (auto& destination : destinations_) {
        if (!destination || destination->failed || !destination->output.running()) continue;
        if (destination->output.write_video(bgra->data(), bgra->size())) {
            any_success = true;
        }
    }
    if (!any_success) ++stats_.submit_failures;
    (void)frame;
    return any_success;
}

bool MultiStreamOutput::submit_audio(
    const cari::studio::core::AudioPacket& packet) noexcept {
    if (packet.samples.empty()) {
        ++stats_.submit_failures;
        return false;
    }
    bool any_success = false;
    ++stats_.audio_packets_submitted;
    const auto bytes = packet.samples.size() * sizeof(float);
    const auto* data = reinterpret_cast<const std::uint8_t*>(packet.samples.data());
    for (auto& destination : destinations_) {
        if (!destination || destination->failed || !destination->output.running()) continue;
        if (destination->output.write_audio(data, bytes)) any_success = true;
    }
    if (!any_success) ++stats_.submit_failures;
    return any_success;
}

bool MultiStreamOutput::poll() noexcept {
    std::size_t running_count = 0;
    for (auto& destination : destinations_) {
        if (!destination) continue;

        if (destination->failed &&
            destination->retry.pending() &&
            destination->retry.ready(cari::studio::core::MediaClock::monotonic_now())) {
            destination->retry.consume_attempt();
            if (start_destination(*destination)) {
                destination->failed = false;
            } else {
                schedule_retry(*destination);
            }
        }

        if (!destination->failed) {
            if (!destination->output.poll()) {
                destination->failed = true;
                schedule_retry(*destination);
                destination->output.stop();
            } else if (!destination->output.running()) {
                destination->failed = true;
                schedule_retry(*destination);
                destination->output.stop();
            }
        }

        if (!destination->failed && destination->output.running()) ++running_count;
    }
    stats_.destinations_running = running_count;
    return running_count > 0;
}

void MultiStreamOutput::stop() noexcept {
    for (auto& destination : destinations_) {
        if (destination) destination->output.stop();
    }
    destinations_.clear();
    stats_.destinations_running = 0;
}

bool MultiStreamOutput::running() const noexcept {
    return stats_.destinations_running > 0;
}

std::size_t MultiStreamOutput::destination_count() const noexcept {
    return destinations_.size();
}

MultiStreamOutputStats MultiStreamOutput::stats() const noexcept {
    return stats_;
}

std::vector<MultiStreamDestinationStatus> MultiStreamOutput::destinations() const {
    std::vector<MultiStreamDestinationStatus> result;
    result.reserve(destinations_.size());
    for (const auto& destination : destinations_) {
        if (!destination) continue;
        const auto metrics = destination->output.metrics();
        result.push_back({
            destination->id,
            destination->target,
            state_name(destination->output.state()),
            category_name(destination->failure_category),
            destination->retry_attempts,
            metrics.video.writes_completed,
            metrics.audio.writes_completed,
            metrics.video.writes_dropped,
            metrics.audio.writes_dropped
        });
    }
    return result;
}

} // namespace cari::native
