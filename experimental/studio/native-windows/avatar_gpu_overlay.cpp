#include "avatar_gpu_overlay.h"

#include <algorithm>
#include <cmath>

namespace cari::native {
namespace {

void set_pixel(
    std::vector<std::uint8_t>& pixels,
    std::uint32_t width,
    std::uint32_t x,
    std::uint32_t y,
    std::uint8_t r,
    std::uint8_t g,
    std::uint8_t b,
    std::uint8_t a) {
    const std::size_t index =
        (static_cast<std::size_t>(y) * width + x) * 4u;
    pixels[index + 0] = r;
    pixels[index + 1] = g;
    pixels[index + 2] = b;
    pixels[index + 3] = a;
}

} // namespace

std::shared_ptr<std::vector<std::uint8_t>>
PlaceholderAvatarGpuSource::make_rgba(
    std::uint32_t width,
    std::uint32_t height) {
    if (width == 0 || height == 0) {
        return std::make_shared<std::vector<std::uint8_t>>();
    }

    auto pixels = std::make_shared<std::vector<std::uint8_t>>(
        static_cast<std::size_t>(width) * height * 4u,
        0);

    const float cx = static_cast<float>(width) * 0.5f;
    const float cy = static_cast<float>(height) * 0.52f;
    const float radius = static_cast<float>(std::min(width, height)) * 0.42f;

    for (std::uint32_t y = 0; y < height; ++y) {
        for (std::uint32_t x = 0; x < width; ++x) {
            const float dx = static_cast<float>(x) - cx;
            const float dy = static_cast<float>(y) - cy;
            if (std::sqrt(dx * dx + dy * dy) > radius) {
                continue;
            }

            // Flat placeholder face. It is deliberately procedural and carries
            // no proprietary character asset.
            set_pixel(*pixels, width, x, y, 247, 212, 196, 235);
        }
    }

    const std::uint32_t eye_y = height / 2;
    const std::uint32_t eye_offset = width / 7;
    const std::uint32_t eye_size = std::max<std::uint32_t>(3, width / 28);

    for (std::uint32_t y = eye_y - eye_size; y <= eye_y + eye_size; ++y) {
        for (std::uint32_t x = cx - eye_offset - eye_size;
             x <= cx - eye_offset + eye_size; ++x) {
            if (x < width && y < height) {
                set_pixel(*pixels, width, x, y, 40, 45, 60, 255);
            }
        }
        for (std::uint32_t x = cx + eye_offset - eye_size;
             x <= cx + eye_offset + eye_size; ++x) {
            if (x < width && y < height) {
                set_pixel(*pixels, width, x, y, 40, 45, 60, 255);
            }
        }
    }

    const std::uint32_t mouth_y = static_cast<std::uint32_t>(
        static_cast<float>(height) * 0.68f);
    const std::uint32_t mouth_w = width / 8;
    for (std::uint32_t y = mouth_y; y < std::min(height, mouth_y + height / 18); ++y) {
        for (std::uint32_t x = static_cast<std::uint32_t>(cx) - mouth_w;
             x <= static_cast<std::uint32_t>(cx) + mouth_w && x < width; ++x) {
            set_pixel(*pixels, width, x, y, 120, 55, 70, 220);
        }
    }

    return pixels;
}

} // namespace cari::native
