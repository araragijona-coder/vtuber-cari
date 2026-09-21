#include "audio_core_bridge.h"

#include <iostream>

int main() {
    cari::native::AudioCoreBridge bridge;

    const auto initial = bridge.stats();
    if (initial.callbacks != 0 || initial.packets != 0 || initial.samples != 0) {
        std::cerr << "FAIL: initial audio bridge counters are not zero\n";
        return 1;
    }

    cari::studio::core::AudioPacket packet;
    if (bridge.pop_mixed_audio(packet)) {
        std::cerr << "FAIL: empty timeline unexpectedly produced audio\n";
        return 1;
    }

    if (!bridge.mixed_samples(0).empty()) {
        std::cerr << "FAIL: zero sample request was not empty\n";
        return 1;
    }

    std::cout << "audio core bridge smoke passed\n";
    return 0;
}
