#include "media_foundation_camera.h"

#include <atomic>
#include <chrono>
#include <cstdlib>
#include <iostream>
#include <thread>

int main() {
    using namespace cari::native;

    const auto cameras = MediaFoundationCamera::enumerate();
    for (const auto& camera : cameras) {
        if (camera.friendly_name.empty() || camera.symbolic_link.empty()) {
            std::cerr << "Media Foundation camera smoke: malformed enumeration entry\n";
            return 1;
        }
    }

    if (cameras.empty()) {
        if (std::getenv("CARI_CAMERA_SMOKE_REQUIRED") != nullptr) {
            std::cerr << "No camera available but CARI_CAMERA_SMOKE_REQUIRED is set\n";
            return 2;
        }
        std::cout << "Media Foundation camera smoke: PASS (0 devices; runtime capture skipped)\n";
        return 0;
    }

    MediaFoundationCamera capture;
    std::atomic<std::uint64_t> received{0};
    if (!capture.start(
            0,
            [&received](
                const cari::studio::core::Frame&,
                const std::shared_ptr<std::vector<std::uint8_t>>& pixels) {
                if (pixels && !pixels->empty()) {
                    received.fetch_add(1, std::memory_order_relaxed);
                }
            },
            640,
            480,
            30)) {
        std::wcerr << L"Media Foundation camera smoke: start failed: "
                   << capture.last_error() << L"\n";
        return 1;
    }

    std::this_thread::sleep_for(std::chrono::milliseconds(750));
    const auto stats = capture.stats();
    const bool running_before_stop = capture.running();
    capture.stop();

    if (running_before_stop && stats.width == 0) {
        std::cerr << "Media Foundation camera smoke: missing negotiated width\n";
        return 1;
    }

    if (std::getenv("CARI_CAMERA_SMOKE_REQUIRED") != nullptr &&
        received.load(std::memory_order_relaxed) == 0) {
        std::cerr << "Media Foundation camera smoke: no frames received\n";
        return 3;
    }

    std::cout << "Media Foundation camera smoke: PASS ("
              << received.load(std::memory_order_relaxed)
              << " frame(s))\n";
    return 0;
}
