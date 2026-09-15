#pragma once

#include "capture_engine.h"
#include "../core/types.h"

#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace cari::native {

struct BridgedFrame {
    cari::studio::core::Frame frame;
    // CPU-readable BGRA8 payload for the reference compositor path.
    // This is intentionally a correctness bridge first; GPU-direct paths can
    // replace it later without changing the core Frame contract.
    std::shared_ptr<std::vector<std::uint8_t>> pixels;
};

class FrameBridge final {
public:
    // Returns a CPU-readable BGRA8 frame. The returned shared payload owns the
    // copied bytes and is safe to hand to downstream pipeline code.
    static bool copy_to_cpu(
        const CapturedFrame& captured,
        BridgedFrame& output,
        std::wstring& error);
};

} // namespace cari::native
