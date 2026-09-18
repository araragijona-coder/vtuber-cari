#pragma once

#include "types.h"

#include <chrono>
#include <cstdint>

namespace cari::studio::core {

// Canonical media clock: signed 100 ns ticks, matching Windows
// GraphicsCaptureFrame.SystemRelativeTime().count(). Sources with another
// timebase must convert before entering the core pipeline.
class MediaClock final {
public:
    static constexpr Timestamp kTicksPerSecond = 10'000'000;

    [[nodiscard]] static Timestamp seconds_to_ticks(double seconds) noexcept {
        return static_cast<Timestamp>(seconds * static_cast<double>(kTicksPerSecond));
    }

    [[nodiscard]] static Timestamp milliseconds_to_ticks(std::int64_t milliseconds) noexcept {
        return milliseconds * 10'000;
    }

    [[nodiscard]] static double ticks_to_seconds(Timestamp ticks) noexcept {
        return static_cast<double>(ticks) / static_cast<double>(kTicksPerSecond);
    }

    [[nodiscard]] static Timestamp monotonic_now() noexcept {
        const auto now = std::chrono::steady_clock::now().time_since_epoch();
        return std::chrono::duration_cast<std::chrono::duration<Timestamp, std::ratio<1, kTicksPerSecond>>>(
            now).count();
    }

    [[nodiscard]] static Timestamp normalize(Timestamp pts, Timestamp origin) noexcept {
        return pts - origin;
    }

    [[nodiscard]] static Timestamp clamp_non_decreasing(Timestamp pts, Timestamp previous) noexcept {
        return pts < previous ? previous : pts;
    }
};

} // namespace cari::studio::core
