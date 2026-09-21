#pragma once

#include "media_clock.h"

#include <cstddef>
#include <cstdint>

namespace cari::studio::core {

struct OutputRetryConfig {
    Timestamp initial_delay = 10'000'000; // 1 second.
    Timestamp maximum_delay = 300'000'000; // 30 seconds.
    std::size_t maximum_attempts = 5;
};

class OutputRetryPolicy final {
public:
    explicit OutputRetryPolicy(OutputRetryConfig config = {}) noexcept
        : config_(config) {
        reset();
    }

    void reset() noexcept {
        attempts_ = 0;
        delay_ = config_.initial_delay;
        next_attempt_ = 0;
        pending_ = false;
    }

    void on_success() noexcept {
        reset();
    }

    bool schedule_failure(Timestamp now) noexcept {
        if (config_.maximum_attempts == 0 || attempts_ >= config_.maximum_attempts) {
            pending_ = false;
            return false;
        }

        ++attempts_;
        pending_ = true;
        next_attempt_ = now + delay_;

        const Timestamp doubled =
            delay_ > (config_.maximum_delay / 2)
                ? config_.maximum_delay
                : delay_ * 2;
        delay_ = doubled > config_.maximum_delay
            ? config_.maximum_delay
            : doubled;
        return true;
    }

    [[nodiscard]] bool pending() const noexcept {
        return pending_;
    }

    [[nodiscard]] bool ready(Timestamp now) const noexcept {
        return pending_ && now >= next_attempt_;
    }

    void consume_attempt() noexcept {
        pending_ = false;
    }

    [[nodiscard]] std::size_t attempts() const noexcept {
        return attempts_;
    }

    [[nodiscard]] Timestamp next_attempt() const noexcept {
        return next_attempt_;
    }

private:
    OutputRetryConfig config_{};
    std::size_t attempts_ = 0;
    Timestamp delay_ = 0;
    Timestamp next_attempt_ = 0;
    bool pending_ = false;
};

} // namespace cari::studio::core
