#pragma once

#include <condition_variable>
#include <cstddef>
#include <cstdint>
#include <mutex>
#include <optional>
#include <utility>

namespace cari::studio::core {

struct LatestQueueStats {
    std::uint64_t pushed = 0;
    std::uint64_t replaced = 0;
    std::uint64_t popped = 0;
};

template <typename T>
class LatestItemQueue final {
public:
    LatestItemQueue() = default;
    LatestItemQueue(const LatestItemQueue&) = delete;
    LatestItemQueue& operator=(const LatestItemQueue&) = delete;

    bool push(T item) {
        {
            std::lock_guard lock(mutex_);
            if (stopped_) {
                return false;
            }
            if (latest_.has_value()) {
                ++stats_.replaced;
            }
            latest_ = std::move(item);
            ++stats_.pushed;
        }
        condition_.notify_one();
        return true;
    }

    bool wait_pop(T& item) {
        std::unique_lock lock(mutex_);
        condition_.wait(lock, [this] {
            return stopped_ || latest_.has_value();
        });

        if (!latest_.has_value()) {
            return false;
        }

        item = std::move(*latest_);
        latest_.reset();
        ++stats_.popped;
        return true;
    }

    void stop() noexcept {
        {
            std::lock_guard lock(mutex_);
            stopped_ = true;
            latest_.reset();
        }
        condition_.notify_all();
    }

    void reset() noexcept {
        std::lock_guard lock(mutex_);
        stopped_ = false;
        latest_.reset();
        stats_ = {};
    }

    [[nodiscard]] bool stopped() const noexcept {
        std::lock_guard lock(mutex_);
        return stopped_;
    }

    [[nodiscard]] LatestQueueStats stats() const noexcept {
        std::lock_guard lock(mutex_);
        return stats_;
    }

private:
    mutable std::mutex mutex_;
    std::condition_variable condition_;
    std::optional<T> latest_;
    LatestQueueStats stats_{};
    bool stopped_ = false;
};

} // namespace cari::studio::core
