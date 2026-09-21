#pragma once

#include "types.h"

#include <cstdint>
#include <memory>
#include <string>

namespace cari::studio::core {

struct EncoderConfig {
    std::uint32_t width = 1920;
    std::uint32_t height = 1080;
    std::uint32_t fps = 60;
    std::uint32_t bitrate_kbps = 6000;
    std::string codec = "h264";
};

class IEncoder {
public:
    virtual ~IEncoder() = default;
    virtual bool open(const EncoderConfig& config) = 0;
    virtual void close() noexcept = 0;
    virtual bool encode(const Frame& frame) = 0;
    virtual OutputMetrics metrics() const noexcept = 0;
};

class EncoderBoundary final {
public:
    bool set_encoder(std::shared_ptr<IEncoder> encoder) {
        if (!encoder) {
            return false;
        }
        encoder_ = std::move(encoder);
        return true;
    }

    bool open(const EncoderConfig& config) {
        return encoder_ && encoder_->open(config);
    }

    void close() noexcept {
        if (encoder_) {
            encoder_->close();
        }
    }

    bool encode(const Frame& frame) {
        return encoder_ && encoder_->encode(frame);
    }

    [[nodiscard]] OutputMetrics metrics() const noexcept {
        return encoder_ ? encoder_->metrics() : OutputMetrics{};
    }

private:
    std::shared_ptr<IEncoder> encoder_;
};

} // namespace cari::studio::core
