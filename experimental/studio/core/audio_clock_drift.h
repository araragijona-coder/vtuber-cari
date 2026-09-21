#pragma once

#include "types.h"

#include <cmath>
#include <cstdint>
#include <limits>

namespace cari::studio::core {

struct AudioClockDriftConfig {
    double smoothing_alpha = 0.10;
    double maximum_abs_ppm = 5000.0;
    std::uint64_t minimum_frames = 4800; // 100 ms at 48 kHz.
};

struct AudioClockDriftEstimate {
    bool ready = false;
    double measured_sample_rate = 0.0;
    double drift_ppm = 0.0;
    double correction_ppm = 0.0;
    std::uint64_t observed_frames = 0;
    Timestamp elapsed_ticks = 0;
};

class AudioClockDriftEstimator final {
public:
    explicit AudioClockDriftEstimator(AudioClockDriftConfig config = {}) noexcept
        : config_(config) {}

    void reset() noexcept {
        have_origin_ = false;
        origin_pts_ = 0;
        origin_frames_ = 0;
        filtered_ppm_ = 0.0;
        estimate_ = {};
    }

    [[nodiscard]] AudioClockDriftEstimate observe(
        Timestamp pts,
        std::uint64_t cumulative_frames,
        std::uint32_t nominal_sample_rate) noexcept {
        estimate_ = {};
        if (nominal_sample_rate == 0) {
            return estimate_;
        }

        if (!have_origin_) {
            have_origin_ = true;
            origin_pts_ = pts;
            origin_frames_ = cumulative_frames;
            return estimate_;
        }

        if (pts <= origin_pts_ || cumulative_frames <= origin_frames_) {
            return estimate_;
        }

        const Timestamp elapsed_ticks = pts - origin_pts_;
        const std::uint64_t frames = cumulative_frames - origin_frames_;
        if (frames < config_.minimum_frames) {
            return estimate_;
        }

        const double elapsed_seconds =
            static_cast<double>(elapsed_ticks) / 10'000'000.0;
        if (!(elapsed_seconds > 0.0) || !std::isfinite(elapsed_seconds)) {
            return estimate_;
        }

        const double measured_rate =
            static_cast<double>(frames) / elapsed_seconds;
        const double nominal = static_cast<double>(nominal_sample_rate);
        double drift_ppm = ((measured_rate - nominal) / nominal) * 1'000'000.0;
        drift_ppm = std::fmax(
            -config_.maximum_abs_ppm,
            std::fmin(config_.maximum_abs_ppm, drift_ppm));

        filtered_ppm_ =
            filtered_ppm_ * (1.0 - config_.smoothing_alpha) +
            drift_ppm * config_.smoothing_alpha;

        estimate_.ready = true;
        estimate_.measured_sample_rate = measured_rate;
        estimate_.drift_ppm = filtered_ppm_;
        // Compensation is the inverse sign: a device running fast must be
        // resampled down, while a slow device must be resampled up.
        estimate_.correction_ppm = -filtered_ppm_;
        estimate_.observed_frames = frames;
        estimate_.elapsed_ticks = elapsed_ticks;
        return estimate_;
    }

    [[nodiscard]] AudioClockDriftEstimate estimate() const noexcept {
        return estimate_;
    }

private:
    AudioClockDriftConfig config_{};
    bool have_origin_ = false;
    Timestamp origin_pts_ = 0;
    std::uint64_t origin_frames_ = 0;
    double filtered_ppm_ = 0.0;
    AudioClockDriftEstimate estimate_{};
};

} // namespace cari::studio::core
