#pragma once

#include "media_clock.h"

namespace cari::studio::core {

struct RealtimePacerConfig {
    Timestamp early_tolerance = 20'000; // 2 ms.
    Timestamp late_tolerance = 1'000'000; // 100 ms.
};

enum class RealtimePaceDecision {
    wait,
    emit,
    late,
};

// Deterministic global ordering for the two raw media streams.
// Ties intentionally prefer audio so the audio clock is not starved when
// packet timestamps coincide. The transport still remains raw and timestamp-less.
enum class MediaStreamKind {
    none,
    audio,
    video,
};

struct MediaInterleaver final {
    [[nodiscard]] static MediaStreamKind select(
        bool has_audio,
        Timestamp audio_pts,
        bool has_video,
        Timestamp video_pts) noexcept {
        if (!has_audio && !has_video) {
            return MediaStreamKind::none;
        }
        if (!has_video) {
            return MediaStreamKind::audio;
        }
        if (!has_audio) {
            return MediaStreamKind::video;
        }
        return audio_pts <= video_pts
            ? MediaStreamKind::audio
            : MediaStreamKind::video;
    }
};

class RealtimePacer final {
public:
    explicit RealtimePacer(RealtimePacerConfig config = {}) noexcept
        : config_(config) {}

    void reset() noexcept {
        initialized_ = false;
        media_origin_ = 0;
        wall_origin_ = 0;
    }

    void arm(Timestamp media_origin, Timestamp wall_origin) noexcept {
        initialized_ = true;
        media_origin_ = media_origin;
        wall_origin_ = wall_origin;
    }

    [[nodiscard]] bool initialized() const noexcept {
        return initialized_;
    }

    [[nodiscard]] RealtimePaceDecision decide(
        Timestamp media_pts,
        Timestamp wall_now) noexcept {
        if (!initialized_) {
            initialized_ = true;
            media_origin_ = media_pts;
            wall_origin_ = wall_now;
        }

        const Timestamp media_elapsed = media_pts - media_origin_;
        const Timestamp wall_elapsed = wall_now - wall_origin_;
        const Timestamp delta = wall_elapsed - media_elapsed;

        if (delta + config_.early_tolerance < 0) {
            return RealtimePaceDecision::wait;
        }
        if (delta > config_.late_tolerance) {
            return RealtimePaceDecision::late;
        }
        return RealtimePaceDecision::emit;
    }

    [[nodiscard]] Timestamp media_origin() const noexcept {
        return media_origin_;
    }

    [[nodiscard]] Timestamp wall_origin() const noexcept {
        return wall_origin_;
    }

private:
    RealtimePacerConfig config_{};
    bool initialized_ = false;
    Timestamp media_origin_ = 0;
    Timestamp wall_origin_ = 0;
};

} // namespace cari::studio::core
