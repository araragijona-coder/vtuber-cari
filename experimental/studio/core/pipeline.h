#pragma once

#include "bounded_queue.h"
#include "scene.h"
#include "source.h"
#include "types.h"

#include <cstddef>
#include <memory>
#include <mutex>
#include <utility>

namespace cari::studio::core {

class IOutput {
public:
    virtual ~IOutput() = default;
    virtual bool start() = 0;
    virtual void stop() noexcept = 0;
    virtual bool submit(const Frame& frame) = 0;
    virtual OutputMetrics metrics() const noexcept = 0;
};

class NullOutput final : public IOutput {
public:
    bool start() override {
        active_ = true;
        return true;
    }

    void stop() noexcept override { active_ = false; }

    bool submit(const Frame& frame) override {
        if (!active_) {
            return false;
        }
        std::lock_guard lock(mutex_);
        ++metrics_.frames;
        metrics_.encoded = metrics_.frames;
        last_pts_ = frame.pts;
        return true;
    }

    OutputMetrics metrics() const noexcept override {
        std::lock_guard lock(mutex_);
        return metrics_;
    }

    [[nodiscard]] Timestamp last_pts() const noexcept {
        std::lock_guard lock(mutex_);
        return last_pts_;
    }

private:
    bool active_ = false;
    mutable std::mutex mutex_;
    Timestamp last_pts_ = 0;
    OutputMetrics metrics_{};
};

class StudioPipeline final {
public:
    explicit StudioPipeline(std::size_t frame_capacity = 4,
                            std::size_t audio_capacity = 8)
        : frames_(frame_capacity), audio_(audio_capacity) {}

    bool set_output(std::shared_ptr<IOutput> output) {
        if (!output || running_) {
            return false;
        }
        output_ = std::move(output);
        return true;
    }

    bool start() {
        if (running_ || !output_) {
            return false;
        }
        frames_.reset();
        audio_.reset();
        if (!output_->start()) {
            return false;
        }
        running_ = true;
        return true;
    }

    void stop() noexcept {
        if (!running_ && frames_.closed() && audio_.closed()) {
            return;
        }
        running_ = false;
        frames_.close();
        audio_.close();
        if (output_) {
            output_->stop();
        }
    }

    bool submit_frame(Frame frame) {
        if (!running_) {
            return false;
        }
        return frames_.push(std::move(frame));
    }

    bool submit_audio(AudioPacket packet) {
        if (!running_) {
            return false;
        }
        return audio_.push(std::move(packet));
    }

    std::size_t pump_once() {
        if (!running_ || !output_) {
            return 0;
        }
        std::size_t submitted = 0;
        while (const auto frame = frames_.try_pop()) {
            if (output_->submit(*frame)) {
                ++submitted;
            }
        }
        return submitted;
    }

    [[nodiscard]] bool running() const noexcept { return running_; }
    [[nodiscard]] std::size_t pending_video() const { return frames_.size(); }
    [[nodiscard]] std::size_t pending_audio() const { return audio_.size(); }
    [[nodiscard]] std::size_t dropped_video() const { return frames_.dropped(); }
    [[nodiscard]] std::size_t dropped_audio() const { return audio_.dropped(); }

    [[nodiscard]] OutputMetrics output_metrics() const noexcept {
        return output_ ? output_->metrics() : OutputMetrics{};
    }

private:
    BoundedQueue<Frame> frames_;
    BoundedQueue<AudioPacket> audio_;
    std::shared_ptr<IOutput> output_;
    bool running_ = false;
};

} // namespace cari::studio::core
