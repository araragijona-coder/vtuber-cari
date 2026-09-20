#pragma once

#include "types.h"

#include <cstddef>
#include <cstdint>
#include <deque>
#include <optional>

namespace cari::studio::core {

// Cari timestamps use 100 ns units. Audio is the default master clock.
struct AvSyncConfig {
    Timestamp video_lead_tolerance = 5'000'000; // 500 ms
    Timestamp video_lag_tolerance = 15'000'000; // 1.5 s
    std::size_t max_video_queue = 16;
    std::size_t max_audio_queue = 64;
};

struct AvSyncStats {
    std::uint64_t video_queued = 0;
    std::uint64_t audio_queued = 0;
    std::uint64_t video_dropped_late = 0;
    std::uint64_t video_dropped_overflow = 0;
    std::uint64_t audio_dropped_overflow = 0;
    std::uint64_t emitted_video = 0;
    std::uint64_t emitted_audio = 0;
    Timestamp master_audio_pts = 0;
    bool audio_clock_ready = false;
};

class AvSyncController final {
public:
    struct Event {
        enum class Kind { video, audio };
        Kind kind = Kind::video;
        std::optional<Frame> frame;
        std::optional<AudioPacket> audio;
    };

    explicit AvSyncController(AvSyncConfig config = {}) : config_(config) {}

    void reset() noexcept {
        video_.clear();
        audio_.clear();
        stats_ = {};
        last_emitted_pts_ = 0;
        have_last_emitted_pts_ = false;
    }

    void push_video(Frame frame) {
        ++stats_.video_queued;
        if (frame.pts < 0) frame.pts = 0;
        insert_sorted(video_, std::move(frame));
        while (video_.size() > config_.max_video_queue) {
            video_.pop_front();
            ++stats_.video_dropped_overflow;
        }
    }

    void push_audio(AudioPacket packet) {
        ++stats_.audio_queued;
        if (packet.pts < 0) packet.pts = 0;
        insert_sorted(audio_, std::move(packet));
        while (audio_.size() > config_.max_audio_queue) {
            audio_.pop_front();
            ++stats_.audio_dropped_overflow;
        }
        if (!audio_.empty()) {
            stats_.master_audio_pts = audio_.back().pts;
            stats_.audio_clock_ready = true;
        }
    }

    [[nodiscard]] std::optional<Event> next() {
        if (audio_.empty() && video_.empty()) return std::nullopt;

        if (!stats_.audio_clock_ready) {
            return video_.empty() ? emit_audio() : emit_video();
        }

        const Timestamp master = stats_.master_audio_pts;
        while (!video_.empty() &&
               video_.front().pts + config_.video_lag_tolerance < master) {
            video_.pop_front();
            ++stats_.video_dropped_late;
        }

        const bool audio_ready = !audio_.empty() && audio_.front().pts <= master;
        const bool video_ready = !video_.empty() &&
                                 video_.front().pts <= master + config_.video_lead_tolerance;
        if (!audio_ready && !video_ready) return std::nullopt;
        if (audio_ready && (!video_ready || audio_.front().pts <= video_.front().pts)) {
            return emit_audio();
        }
        return emit_video();
    }

    [[nodiscard]] const AvSyncStats& stats() const noexcept { return stats_; }
    [[nodiscard]] std::size_t pending_video() const noexcept { return video_.size(); }
    [[nodiscard]] std::size_t pending_audio() const noexcept { return audio_.size(); }

private:
    template <typename T>
    static void insert_sorted(std::deque<T>& queue, T value) {
        if (queue.empty() || queue.back().pts <= value.pts) {
            queue.push_back(std::move(value));
            return;
        }
        auto it = queue.begin();
        while (it != queue.end() && it->pts <= value.pts) ++it;
        queue.insert(it, std::move(value));
    }

    [[nodiscard]] std::optional<Event> emit_video() {
        if (video_.empty()) return std::nullopt;
        Frame frame = std::move(video_.front());
        video_.pop_front();
        if (!have_last_emitted_pts_ || frame.pts >= last_emitted_pts_) {
            last_emitted_pts_ = frame.pts;
            have_last_emitted_pts_ = true;
        }
        ++stats_.emitted_video;
        return Event{Event::Kind::video, std::move(frame), std::nullopt};
    }

    [[nodiscard]] std::optional<Event> emit_audio() {
        if (audio_.empty()) return std::nullopt;
        AudioPacket packet = std::move(audio_.front());
        audio_.pop_front();
        if (!have_last_emitted_pts_ || packet.pts >= last_emitted_pts_) {
            last_emitted_pts_ = packet.pts;
            have_last_emitted_pts_ = true;
        }
        ++stats_.emitted_audio;
        return Event{Event::Kind::audio, std::nullopt, std::move(packet)};
    }

    AvSyncConfig config_{};
    std::deque<Frame> video_;
    std::deque<AudioPacket> audio_;
    AvSyncStats stats_{};
    Timestamp last_emitted_pts_ = 0;
    bool have_last_emitted_pts_ = false;
};

} // namespace cari::studio::core
