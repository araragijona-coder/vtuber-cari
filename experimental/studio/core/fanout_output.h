#pragma once

#include "pipeline.h"

#include <memory>
#include <mutex>
#include <vector>

namespace cari::studio::core {

class FanoutOutput final : public IOutput {
public:
    bool add_output(std::shared_ptr<IOutput> output) {
        if (!output || active_) {
            return false;
        }
        std::lock_guard lock(mutex_);
        outputs_.push_back(std::move(output));
        return true;
    }

    bool start() override {
        std::lock_guard lock(mutex_);
        if (active_ || outputs_.empty()) {
            return false;
        }

        std::size_t started = 0;
        for (auto& output : outputs_) {
            if (!output->start()) {
                for (std::size_t i = 0; i < started; ++i) {
                    outputs_[i]->stop();
                }
                return false;
            }
            ++started;
        }
        active_ = true;
        return true;
    }

    void stop() noexcept override {
        std::lock_guard lock(mutex_);
        for (auto& output : outputs_) {
            output->stop();
        }
        active_ = false;
    }

    bool submit(const Frame& frame) override {
        std::lock_guard lock(mutex_);
        if (!active_) {
            return false;
        }
        bool any_success = false;
        for (auto& output : outputs_) {
            any_success = output->submit(frame) || any_success;
        }
        return any_success;
    }

    OutputMetrics metrics() const noexcept override {
        std::lock_guard lock(mutex_);
        OutputMetrics combined{};
        for (const auto& output : outputs_) {
            const auto current = output->metrics();
            combined.frames += current.frames;
            combined.dropped += current.dropped;
            combined.encoded += current.encoded;
            combined.bitrate_mbps += current.bitrate_mbps;
        }
        return combined;
    }

    [[nodiscard]] std::size_t output_count() const noexcept {
        std::lock_guard lock(mutex_);
        return outputs_.size();
    }

private:
    mutable std::mutex mutex_;
    std::vector<std::shared_ptr<IOutput>> outputs_;
    bool active_ = false;
};

} // namespace cari::studio::core
