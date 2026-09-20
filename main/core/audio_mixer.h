#pragma once

#include "types.h"

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <string>
#include <utility>
#include <vector>

namespace cari::studio::core {

struct AudioTrack {
    std::string id;
    float volume = 1.0f;
    bool muted = false;
    std::vector<float> samples;
};

class AudioMixer final {
public:
    bool add_track(std::string id) {
        if (id.empty()) {
            return false;
        }
        for (const auto& track : tracks_) {
            if (track.id == id) {
                return false;
            }
        }
        tracks_.push_back({std::move(id), 1.0f, false, {}});
        return true;
    }

    bool set_volume(const std::string& id, float volume) {
        for (auto& track : tracks_) {
            if (track.id == id) {
                track.volume = std::clamp(volume, 0.0f, 2.0f);
                return true;
            }
        }
        return false;
    }

    bool set_muted(const std::string& id, bool muted) {
        for (auto& track : tracks_) {
            if (track.id == id) {
                track.muted = muted;
                return true;
            }
        }
        return false;
    }

    bool set_samples(const std::string& id, std::vector<float> samples) {
        for (auto& track : tracks_) {
            if (track.id == id) {
                track.samples = std::move(samples);
                return true;
            }
        }
        return false;
    }

    [[nodiscard]] std::vector<float> mix(std::size_t sample_count) const {
        std::vector<float> result(sample_count, 0.0f);
        for (const auto& track : tracks_) {
            if (track.muted) {
                continue;
            }
            const auto count = std::min(sample_count, track.samples.size());
            for (std::size_t i = 0; i < count; ++i) {
                result[i] += track.samples[i] * track.volume;
            }
        }
        for (auto& sample : result) {
            sample = std::clamp(sample, -1.0f, 1.0f);
        }
        return result;
    }

    [[nodiscard]] float peak(const std::vector<float>& samples) const {
        float peak_value = 0.0f;
        for (const auto sample : samples) {
            peak_value = std::max(peak_value, std::fabs(sample));
        }
        return peak_value;
    }

    [[nodiscard]] const std::vector<AudioTrack>& tracks() const noexcept { return tracks_; }

private:
    std::vector<AudioTrack> tracks_;
};

} // namespace cari::studio::core
