#include "compositor_bridge.h"

#include <cstddef>
#include <cstdint>
#include <utility>

namespace cari::native {

bool CompositorBridge::compose_reference(
    const BridgedFrame& frame,
    cari::studio::core::SoftwareCompositor& compositor,
    cari::studio::core::RgbaImage& output,
    std::wstring& error) {
    error.clear();
    output = {};

    if (!frame.pixels || !frame.frame.width || !frame.frame.height) {
        error = L"Bridged frame has no CPU payload or invalid dimensions";
        return false;
    }

    const std::size_t expected =
        static_cast<std::size_t>(frame.frame.width) * frame.frame.height * 4u;
    if (frame.pixels->size() != expected) {
        error = L"Bridged frame payload size does not match dimensions";
        return false;
    }

    cari::studio::core::RgbaImage image;
    image.width = frame.frame.width;
    image.height = frame.frame.height;
    image.pixels.resize(expected);

    // Windows Graphics Capture supplies BGRA8 here; the reference compositor
    // contract uses RGBA8. Keep this conversion explicit so the later GPU path
    // can replace it without changing the compositor contract.
    for (std::size_t i = 0; i < expected; i += 4) {
        image.pixels[i + 0] = (*frame.pixels)[i + 2];
        image.pixels[i + 1] = (*frame.pixels)[i + 1];
        image.pixels[i + 2] = (*frame.pixels)[i + 0];
        image.pixels[i + 3] = (*frame.pixels)[i + 3];
    }

    cari::studio::core::SoftwareLayer layer;
    layer.source_id = "capture/window";
    layer.image = std::move(image);
    layer.x = 0;
    layer.y = 0;
    layer.visible = true;
    layer.opacity = 1.0f;

    if (!compositor.compose({layer})) {
        error = L"Reference software compositor rejected the capture layer";
        return false;
    }

    output = compositor.output();
    return output.valid();
}

} // namespace cari::native
