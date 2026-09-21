#pragma once

#include "frame_bridge.h"
#include "../core/software_compositor.h"

#include <string>

namespace cari::native {

class CompositorBridge final {
public:
    static bool compose_reference(
        const BridgedFrame& frame,
        cari::studio::core::SoftwareCompositor& compositor,
        cari::studio::core::RgbaImage& output,
        std::wstring& error);
};

} // namespace cari::native
