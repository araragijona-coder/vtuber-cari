#pragma once

#include "types.h"

#include <algorithm>
#include <string>

namespace cari::studio::core {

enum class HealthLevel {
    excellent,
    good,
    attention,
    high,
    problem,
};

struct RuntimeHealth {
    double cpu_percent = 0.0;
    double gpu_percent = 0.0;
    double memory_percent = 0.0;
    double render_fps = 0.0;
    double target_fps = 60.0;
    std::uint64_t dropped_frames = 0;
    double audio_latency_ms = 0.0;
    double bitrate_mbps = 0.0;
};

inline HealthLevel classify_load(double value_percent) noexcept {
    if (value_percent >= 95.0) return HealthLevel::problem;
    if (value_percent >= 85.0) return HealthLevel::high;
    if (value_percent >= 70.0) return HealthLevel::attention;
    if (value_percent >= 45.0) return HealthLevel::good;
    return HealthLevel::excellent;
}

inline HealthLevel classify_fps(double fps, double target_fps) noexcept {
    if (target_fps <= 0.0) return HealthLevel::problem;
    const double ratio = fps / target_fps;
    if (ratio < 0.50) return HealthLevel::problem;
    if (ratio < 0.80) return HealthLevel::high;
    if (ratio < 0.95) return HealthLevel::attention;
    if (ratio < 1.00) return HealthLevel::good;
    return HealthLevel::excellent;
}

} // namespace cari::studio::core
