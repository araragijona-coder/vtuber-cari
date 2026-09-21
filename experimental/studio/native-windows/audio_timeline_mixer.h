#pragma once

#include "../core/types.h"

#include <cstddef>
#include <cstdint>
#include <deque>
#include <map>
#include <mutex>
#include <string>
#include <vector>

namespace cari::native {

struct AudioTimelineMixerConfig {
    std::uint32_t sample_rate = 48000;
    std::uint16_t channels = 2;
    std::uint32_t quantum_ms = 20;
    std::uint32_t max_queue_ms = 2000;
};

struct AudioTimelineMixerStats {
    std::uint64_t packets_received = 0;
    std::uint64_t packets_rejected = 0;
    std::uint64_t packets_resampled = 0;
    std::uint64_t packets_mixed = 0;
    std::uint64_t samples_mixed = 0;
    std::uint64_t queue_overflows = 0;
    std::uint64_t underruns = 0;
};

class AudioTimelineMixer final {
public:
    explicit AudioTimelineMixer(AudioTimelineMixerConfig config = {});

    AudioTimelineMixer(const AudioTimelineMixer&) = delete;
    AudioTimelineMixer& operator=(const AudioTimelineMixer&) = delete;

    bool push(const std::string& track_id, const cari::studio::core::AudioPacket& packet);
    bool pop(cari::studio::core::AudioPacket& output);
    void clear() noexcept;

    [[nodiscard]] bool empty() const noexcept;
    [[nodiscard]] std::size_t queued_samples() const noexcept;
    [[nodiscard]] AudioTimelineMixerStats stats() const noexcept;
    [[nodiscard]] const AudioTimelineMixerConfig& config() const noexcept { return config_; }

private:
    struct Chunk {
        cari::studio::core::Timestamp pts = 0;
        std::uint64_t sequence = 0;
        std::vector<float> samples;
    };

    struct Track {
        std::deque<Chunk> chunks;
        bool active = false;
    };

    static std::vector<float> convert_channels(
        const std::vector<float>& samples,
        std::uint16_t input_channels,
        std::uint16_t output_channels);

    static std::vector<float> resample_linear(
        const std::vector<float>& samples,
        std::uint16_t channels,
        std::uint32_t input_rate,
        std::uint32_t output_rate);

    static std::int64_t sample_duration_100ns(std::size_t frames, std::uint32_t sample_rate);
    static std::int64_t sample_time_100ns(std::size_t frame, std::uint32_t sample_rate);
    static std::size_t frames_for_duration(std::int64_t duration_100ns, std::uint32_t sample_rate);

    void trim_track(Track& track, cari::studio::core::Timestamp cutoff);
    bool has_coverage(const Track& track,
                      cari::studio::core::Timestamp start,
                      cari::studio::core::Timestamp end) const;
    float sample_at(const Track& track,
                    cari::studio::core::Timestamp timestamp,
                    std::uint16_t channel) const;

    AudioTimelineMixerConfig config_;
    mutable std::mutex mutex_;
    std::map<std::string, Track> tracks_;
    cari::studio::core::Timestamp next_pts_ = 0;
    bool clock_ready_ = false;
    std::uint64_t output_sequence_ = 0;
    AudioTimelineMixerStats stats_;
};

} // namespace cari::native
