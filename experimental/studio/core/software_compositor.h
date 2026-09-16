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
    float scale_x = 1.0f;
    float scale_y = 1.0f;
};

class SoftwareCompositor final {
public:
    explicit SoftwareCompositor(std::uint32_t width, std::uint32_t height)
        : width_(width), height_(height) {
        output_.width = width;
        output_.height = height;
        output_.pixels.resize(static_cast<std::size_t>(width) * height * 4u, 0);
    }

    [[nodiscard]] const RgbaImage& output() const noexcept { return output_; }

    void clear() { std::fill(output_.pixels.begin(), output_.pixels.end(), 0); }

    bool compose(const std::vector<SoftwareLayer>& layers) {
        if (!output_.valid()) return false;
        clear();
        for (const auto& layer : layers) {
            if (!layer.visible || !layer.image.valid() || layer.opacity <= 0.0f ||
                layer.scale_x <= 0.0f || layer.scale_y <= 0.0f) {
                continue;
            }
            blit(layer);
        }
        return true;
    }

private:
    void blit(const SoftwareLayer& layer) {
        const float opacity = std::clamp(layer.opacity, 0.0f, 1.0f);
        const float scale_x = layer.scale_x;
        const float scale_y = layer.scale_y;
        const auto scaled_width = static_cast<std::int32_t>(
            static_cast<float>(layer.image.width) * scale_x + 0.5f);
        const auto scaled_height = static_cast<std::int32_t>(
            static_cast<float>(layer.image.height) * scale_y + 0.5f);
        if (scaled_width <= 0 || scaled_height <= 0) return;

        for (std::int32_t dy_local = 0; dy_local < scaled_height; ++dy_local) {
            const auto dy_signed = static_cast<std::int64_t>(dy_local) + layer.y;
            if (dy_signed < 0 || dy_signed >= static_cast<std::int64_t>(height_)) continue;
            const auto dy = static_cast<std::uint32_t>(dy_signed);
            const auto sy = static_cast<std::uint32_t>(
                std::min<std::int32_t>(
                    static_cast<std::int32_t>(layer.image.height - 1),
                    static_cast<std::int32_t>(static_cast<float>(dy_local) / scale_y)));

            for (std::int32_t dx_local = 0; dx_local < scaled_width; ++dx_local) {
                const auto dx_signed = static_cast<std::int64_t>(dx_local) + layer.x;
                if (dx_signed < 0 || dx_signed >= static_cast<std::int64_t>(width_)) continue;
                const auto dx = static_cast<std::uint32_t>(dx_signed);
                const auto sx = static_cast<std::uint32_t>(
                    std::min<std::int32_t>(
                        static_cast<std::int32_t>(layer.image.width - 1),
                        static_cast<std::int32_t>(static_cast<float>(dx_local) / scale_x)));

                const auto src = (static_cast<std::size_t>(sy) * layer.image.width + sx) * 4u;
                const auto dst = (static_cast<std::size_t>(dy) * width_ + dx) * 4u;
                const float src_alpha =
                    (static_cast<float>(layer.image.pixels[src + 3]) / 255.0f) * opacity;
                const float dst_alpha =
                    static_cast<float>(output_.pixels[dst + 3]) / 255.0f;
                const float out_alpha = src_alpha + dst_alpha * (1.0f - src_alpha);
                if (out_alpha <= 0.0f) continue;

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
