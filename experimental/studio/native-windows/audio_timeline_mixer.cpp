#include "audio_timeline_mixer.h"

#include <algorithm>
#include <cmath>

namespace cari::native {
namespace {

constexpr std::int64_t kHundredNsPerSecond = 10'000'000;

std::size_t frame_count(const std::vector<float>& samples, std::uint16_t channels) {
    return channels == 0 ? 0 : samples.size() / channels;
}

} // namespace

AudioTimelineMixer::AudioTimelineMixer(AudioTimelineMixerConfig config)
    : config_(config) {
    if (config_.sample_rate == 0) config_.sample_rate = 48000;
    if (config_.channels == 0) config_.channels = 2;
    if (config_.quantum_ms == 0) config_.quantum_ms = 20;
    if (config_.max_queue_ms < config_.quantum_ms) config_.max_queue_ms = config_.quantum_ms;
}

std::int64_t AudioTimelineMixer::sample_duration_100ns(
    std::size_t frames,
    std::uint32_t sample_rate) {
    if (frames == 0 || sample_rate == 0) return 0;
    return static_cast<std::int64_t>(
        (static_cast<std::uint64_t>(frames) * kHundredNsPerSecond) / sample_rate);
}

std::int64_t AudioTimelineMixer::sample_time_100ns(
    std::size_t frame,
    std::uint32_t sample_rate) {
    return sample_duration_100ns(frame, sample_rate);
}

std::size_t AudioTimelineMixer::frames_for_duration(
    std::int64_t duration_100ns,
    std::uint32_t sample_rate) {
    if (duration_100ns <= 0 || sample_rate == 0) return 0;
    return static_cast<std::size_t>(
        (static_cast<std::uint64_t>(duration_100ns) * sample_rate) /
        kHundredNsPerSecond);
}

std::vector<float> AudioTimelineMixer::convert_channels(
    const std::vector<float>& samples,
    std::uint16_t input_channels,
    std::uint16_t output_channels) {
    if (input_channels == 0 || output_channels == 0 ||
        samples.size() % input_channels != 0) {
        return {};
    }
    if (input_channels == output_channels) return samples;

    const auto frames = frame_count(samples, input_channels);
    std::vector<float> output(frames * output_channels, 0.0f);

    for (std::size_t frame = 0; frame < frames; ++frame) {
        const auto in_base = frame * input_channels;
        const auto out_base = frame * output_channels;

        if (output_channels == 1) {
            float sum = 0.0f;
            for (std::uint16_t channel = 0; channel < input_channels; ++channel) {
                sum += samples[in_base + channel];
            }
            output[out_base] = sum / static_cast<float>(input_channels);
        } else if (input_channels == 1) {
            for (std::uint16_t channel = 0; channel < output_channels; ++channel) {
                output[out_base + channel] = samples[in_base];
            }
        } else {
            for (std::uint16_t channel = 0; channel < output_channels; ++channel) {
                const auto source = std::min<std::uint16_t>(channel, input_channels - 1);
                output[out_base + channel] = samples[in_base + source];
            }
        }
    }
    return output;
}

std::vector<float> AudioTimelineMixer::resample_linear(
    const std::vector<float>& samples,
    std::uint16_t channels,
    std::uint32_t input_rate,
    std::uint32_t output_rate) {
    if (channels == 0 || input_rate == 0 || output_rate == 0 ||
        samples.size() % channels != 0) {
        return {};
    }

    const auto input_frames = frame_count(samples, channels);
    if (input_frames == 0) return {};
    if (input_rate == output_rate || input_frames == 1) return samples;

    const auto output_frames = std::max<std::size_t>(
        1,
        static_cast<std::size_t>(
            (static_cast<std::uint64_t>(input_frames) * output_rate) / input_rate));
    std::vector<float> output(output_frames * channels, 0.0f);
    const double ratio = static_cast<double>(input_rate) / output_rate;

    for (std::size_t out_frame = 0; out_frame < output_frames; ++out_frame) {
        const double source_position = static_cast<double>(out_frame) * ratio;
        const auto left = std::min<std::size_t>(
            static_cast<std::size_t>(source_position), input_frames - 1);
        const auto right = std::min<std::size_t>(left + 1, input_frames - 1);
        const float fraction = static_cast<float>(source_position - left);

        for (std::uint16_t channel = 0; channel < channels; ++channel) {
            const float a = samples[left * channels + channel];
            const float b = samples[right * channels + channel];
            output[out_frame * channels + channel] = a + (b - a) * fraction;
        }
    }
    return output;
}

bool AudioTimelineMixer::push(
    const std::string& track_id,
    const cari::studio::core::AudioPacket& packet) {
    std::lock_guard lock(mutex_);
    ++stats_.packets_received;

    if (track_id.empty() || packet.sample_rate == 0 || packet.channels == 0 ||
        packet.samples.empty() || packet.samples.size() % packet.channels != 0) {
        ++stats_.packets_rejected;
        return false;
    }

    auto converted = convert_channels(packet.samples, packet.channels, config_.channels);
    if (converted.empty()) {
        ++stats_.packets_rejected;
        return false;
    }

    if (packet.sample_rate != config_.sample_rate) {
        converted = resample_linear(
            converted, config_.channels, packet.sample_rate, config_.sample_rate);
        if (converted.empty()) {
            ++stats_.packets_rejected;
            return false;
        }
        ++stats_.packets_resampled;
    }

    const auto frames = frame_count(converted, config_.channels);
    const auto duration = sample_duration_100ns(frames, config_.sample_rate);
    if (clock_ready_ && packet.pts + duration <= next_pts_) {
        ++stats_.queue_overflows;
        return false;
    }

    auto& track = tracks_[track_id];
    track.active = true;

    Chunk chunk;
    chunk.pts = packet.pts;
    chunk.sequence = packet.sequence;
    chunk.samples = std::move(converted);

    auto position = track.chunks.end();
    while (position != track.chunks.begin() && std::prev(position)->pts > chunk.pts) {
        --position;
    }
    track.chunks.insert(position, std::move(chunk));

    const auto max_duration = static_cast<std::int64_t>(config_.max_queue_ms) * 10'000;
    const auto newest_pts = track.chunks.back().pts;
    const auto cutoff = newest_pts > max_duration ? newest_pts - max_duration : 0;
    trim_track(track, cutoff);

    if (!clock_ready_) {
        next_pts_ = track.chunks.front().pts;
        clock_ready_ = true;
    }
    return true;
}

void AudioTimelineMixer::trim_track(
    Track& track,
    cari::studio::core::Timestamp cutoff) {
    while (!track.chunks.empty()) {
        const auto frames = frame_count(track.chunks.front().samples, config_.channels);
        const auto end = track.chunks.front().pts +
                         sample_duration_100ns(frames, config_.sample_rate);
        if (end >= cutoff) break;
        track.chunks.pop_front();
    }
}

bool AudioTimelineMixer::has_coverage(
    const Track& track,
    cari::studio::core::Timestamp start,
    cari::studio::core::Timestamp end) const {
    for (const auto& chunk : track.chunks) {
        const auto frames = frame_count(chunk.samples, config_.channels);
        const auto chunk_end = chunk.pts +
                               sample_duration_100ns(frames, config_.sample_rate);
        if (chunk.pts <= start && chunk_end >= end) return true;
        if (chunk.pts > start) break;
    }
    return false;
}

float AudioTimelineMixer::sample_at(
    const Track& track,
    cari::studio::core::Timestamp timestamp,
    std::uint16_t channel) const {
    for (const auto& chunk : track.chunks) {
        const auto frames = frame_count(chunk.samples, config_.channels);
        if (frames == 0) continue;
        const auto end = chunk.pts +
                         sample_duration_100ns(frames, config_.sample_rate);
        if (timestamp < chunk.pts) break;
        if (timestamp >= end) continue;

        const auto offset = timestamp - chunk.pts;
        const auto frame = std::min<std::size_t>(
            frames - 1,
            frames_for_duration(offset, config_.sample_rate));
        return chunk.samples[frame * config_.channels + channel];
    }
    return 0.0f;
}

bool AudioTimelineMixer::pop(cari::studio::core::AudioPacket& output) {
    std::lock_guard lock(mutex_);
    if (!clock_ready_ || tracks_.empty()) return false;

    const auto quantum_frames = static_cast<std::size_t>(
        (static_cast<std::uint64_t>(config_.sample_rate) * config_.quantum_ms) / 1000);
    if (quantum_frames == 0) return false;

    const auto quantum_duration = sample_duration_100ns(quantum_frames, config_.sample_rate);
    const auto end_pts = next_pts_ + quantum_duration;

    bool any_coverage = false;
    bool all_active_covered = true;
    for (const auto& [id, track] : tracks_) {
        if (!track.active) continue;
        if (has_coverage(track, next_pts_, end_pts)) {
            any_coverage = true;
        } else {
            all_active_covered = false;
        }
    }

    if (!any_coverage) return false;
    if (!all_active_covered) ++stats_.underruns;

    output = {};
    output.pts = next_pts_;
    output.sample_rate = config_.sample_rate;
    output.channels = config_.channels;
    output.sequence = ++output_sequence_;
    output.samples.assign(quantum_frames * config_.channels, 0.0f);

    for (std::size_t frame = 0; frame < quantum_frames; ++frame) {
        const auto timestamp = next_pts_ + sample_time_100ns(frame, config_.sample_rate);
        for (std::uint16_t channel = 0; channel < config_.channels; ++channel) {
            float mixed = 0.0f;
            for (const auto& [id, track] : tracks_) {
                if (track.active) mixed += sample_at(track, timestamp, channel);
            }
            output.samples[frame * config_.channels + channel] =
                std::clamp(mixed, -1.0f, 1.0f);
        }
    }

    next_pts_ = end_pts;
    for (auto& [id, track] : tracks_) {
        while (!track.chunks.empty()) {
            const auto frames = frame_count(track.chunks.front().samples, config_.channels);
            const auto chunk_end = track.chunks.front().pts +
                                   sample_duration_100ns(frames, config_.sample_rate);
            if (chunk_end <= next_pts_) {
                track.chunks.pop_front();
            } else {
                break;
            }
        }
    }

    ++stats_.packets_mixed;
    stats_.samples_mixed += output.samples.size();
    return true;
}

void AudioTimelineMixer::clear() noexcept {
    std::lock_guard lock(mutex_);
    tracks_.clear();
    next_pts_ = 0;
    clock_ready_ = false;
    output_sequence_ = 0;
}

bool AudioTimelineMixer::empty() const noexcept {
    std::lock_guard lock(mutex_);
    for (const auto& [id, track] : tracks_) {
        if (!track.chunks.empty()) return false;
    }
    return true;
}

std::size_t AudioTimelineMixer::queued_samples() const noexcept {
    std::lock_guard lock(mutex_);
    std::size_t total = 0;
    for (const auto& [id, track] : tracks_) {
        for (const auto& chunk : track.chunks) total += chunk.samples.size();
    }
    return total;
}

AudioTimelineMixerStats AudioTimelineMixer::stats() const noexcept {
    std::lock_guard lock(mutex_);
    return stats_;
}

} // namespace cari::native
