#include "audio_clock_drift.h"

#include <cassert>
#include <cmath>
#include <iostream>

int main() {
    using namespace cari::studio::core;

    AudioClockDriftEstimator estimator(AudioClockDriftConfig{
        .smoothing_alpha = 1.0,
        .maximum_abs_ppm = 5000.0,
        .minimum_frames = 4800
    });

    constexpr std::uint32_t nominal_rate = 48'000;
    constexpr Timestamp elapsed = 10'000'000;

    auto first = estimator.observe(0, 0, nominal_rate);
    assert(!first.ready);

    // 48,048 frames in exactly one second means +1000 ppm device drift.
    auto second = estimator.observe(elapsed, 48'048, nominal_rate);
    assert(second.ready);
    assert(std::fabs(second.drift_ppm - 1000.0) < 0.5);
    assert(std::fabs(second.correction_ppm + 1000.0) < 0.5);
    assert(second.observed_frames == 48'048);

    estimator.reset();
    estimator.observe(0, 0, nominal_rate);
    auto clamped = estimator.observe(elapsed, 48'240, nominal_rate);
    assert(clamped.ready);
    assert(clamped.drift_ppm <= 5000.0);

    std::cout << "Audio clock drift estimator smoke: PASS\n";
    return 0;
}