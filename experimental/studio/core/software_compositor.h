#pragma once

#include "scene.h"

#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace cari::studio::core {

struct RgbaImage {
    std::uint32_t width = 0;
    std::uint32_t height = 0;
    std::vector<std::uint8_t> pixels;

    [[nodiscard]] bool valid() const noexcept {
        const std::size_t expected =
            static_cast<std::size_t>(width) * height * 4u;
        return width > 0 && height > 0 && pixels.size() == expected;
    }
};

struct SoftwareLayer {
    std::string source_id;
    RgbaImage image;
    std::int32_t x = 0;
    std::int32_t y = 0;
    bool visible = true;
    float opacity = 1.0f;
};

class SoftwareCompositor final {
public:
    explicit SoftwareCompositor(std::uint32_t width, std::uint32_t height)
        : width_(width), height_(height), output_(width, height, 0) {}

    [[nodiscard]] const RgbaImage& output() const noexcept { return output_; }

    void clear() {
        std::fill(output_.pixels.begin(), output_.pixels.end(), 0);
    }

    bool compose(const std::vector<SoftwareLayer>& layers) {
        if (!output_.valid()) {
            return false;
        }

        clear();
        for (const auto& layer : layers) {
            if (!layer.visible || !layer.image.valid() || layer.opacity <= 0.0f) {
                continue;
            }
            blit(layer);
        }
        return true;
    }

private:
    void blit(const SoftwareLayer& layer) {
        const float opacity = std::clamp(layer.opacity, 0.0f, 1.0f);
        for (std::uint32_t sy = 0; sy < layer.image.height; ++sy) {
            const auto dy_signed = static_cast<std::int64_t>(sy) + layer.y;
            if (dy_signed < 0 || dy_signed >= static_cast<std::int64_t>(height_)) {
                continue;
            }
            const auto dy = static_cast<std::uint32_t>(dy_signed);

            for (std::uint32_t sx = 0; sx < layer.image.width; ++sx) {
                const auto dx_signed = static_cast<std::int64_t>(sx) + layer.x;
                if (dx_signed < 0 || dx_signed >= static_cast<std::int64_t>(width_)) {
                    continue;
                }
                const auto dx = static_cast<std::uint32_t>(dx_signed);

                const auto src =
                    (static_cast<std::size_t>(sy) * layer.image.width + sx) * 4u;
                const auto dst =
                    (static_cast<std::size_t>(dy) * width_ + dx) * 4u;

                const float src_alpha =
                    (static_cast<float>(layer.image.pixels[src + 3]) / 255.0f) * opacity;
                const float dst_alpha =
                    static_cast<float>(output_.pixels[dst + 3]) / 255.0f;
                const float out_alpha = src_alpha + dst_alpha * (1.0f - src_alpha);

                if (out_alpha <= 0.0f) {
                    continue;
                }

                for (std::size_t channel = 0; channel < 3; ++channel) {
                    const float src_value =
                        static_cast<float>(layer.image.pixels[src + channel]) / 255.0f;
                    const float dst_value =
                        static_cast<float>(output_.pixels[dst + channel]) / 255.0f;
                    const float mixed =
                        (src_value * src_alpha + dst_value * dst_alpha * (1.0f - src_alpha)) /
                        out_alpha;
                    output_.pixels[dst + channel] = static_cast<std::uint8_t>(
                        std::clamp(mixed, 0.0f, 1.0f) * 255.0f + 0.5f);
                }
                output_.pixels[dst + 3] = static_cast<std::uint8_t>(
                    std::clamp(out_alpha, 0.0f, 1.0f) * 255.0f + 0.5f);
            }
        }
    }

    const std::uint32_t width_;
    const std::uint32_t height_;
    RgbaImage output_;
};

} // namespace cari::studio::core
