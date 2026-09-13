#pragma once

#include <condition_variable>
#include <cstddef>
#include <deque>
#include <mutex>
#include <optional>

namespace cari::studio::core {

template <typename T>
class BoundedQueue final {
public:
    explicit BoundedQueue(std::size_t capacity) : capacity_(capacity == 0 ? 1 : capacity) {}

    BoundedQueue(const BoundedQueue&) = delete;
    BoundedQueue& operator=(const BoundedQueue&) = delete;

    bool push(T value) {
        std::lock_guard lock(mutex_);
        if (closed_) {
            return false;
        }
        if (items_.size() >= capacity_) {
            items_.pop_front();
            ++dropped_;
        }
        items_.push_back(std::move(value));
        not_empty_.notify_one();
        return true;
    }

    std::optional<T> try_pop() {
        std::lock_guard lock(mutex_);
        if (items_.empty()) {
            return std::nullopt;
        }
        T value = std::move(items_.front());
        items_.pop_front();
        return value;
    }

    std::optional<T> wait_pop() {
        std::unique_lock lock(mutex_);
        not_empty_.wait(lock, [this] { return closed_ || !items_.empty(); });
        if (items_.empty()) {
            return std::nullopt;
        }
        T value = std::move(items_.front());
        items_.pop_front();
        return value;
    }

    void close() {
        std::lock_guard lock(mutex_);
        closed_ = true;
        not_empty_.notify_all();
    }

    [[nodiscard]] std::size_t size() const {
        std::lock_guard lock(mutex_);
        return items_.size();
    }

    [[nodiscard]] std::size_t dropped() const {
        std::lock_guard lock(mutex_);
        return dropped_;
    }

private:
    const std::size_t capacity_;
    mutable std::mutex mutex_;
    std::condition_variable not_empty_;
    std::deque<T> items_;
    std::size_t dropped_ = 0;
    bool closed_ = false;
};

} // namespace cari::studio::core
