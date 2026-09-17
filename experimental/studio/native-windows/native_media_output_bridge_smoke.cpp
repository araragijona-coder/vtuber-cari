#include "native_media_output_bridge.h"

#include <cassert>
#include <cstdint>
#include <iostream>
#include <memory>
#include <vector>

int main() {
    using namespace cari::native;
    using cari::studio::core::AudioPacket;
    using cari::studio::core::Frame;
    using cari::studio::core::OutputKind;
    using cari::studio::core::OutputProfile;

    NativeMediaOutputBridge bridge;

    OutputProfile invalid;
    invalid.id = "invalid";
    invalid.kind = OutputKind::file;
    invalid.target = "test.mp4";

    assert(!bridge.start(invalid, 48000, 2, 1024, 1024, L"definitely-missing-ffmpeg.exe"));

    Frame frame;
    frame.pts = 100;
    frame.sequence = 1;
    frame.width = 2;
    frame.height = 1;

    auto pixels = std::make_shared<std::vector<std::uint8_t>>(
        std::initializer_list<std::uint8_t>{0, 1, 2, 255, 3, 4, 5, 255});

    assert(!bridge.submit_video(frame, pixels));
    assert(bridge.stats().video_rejected == 1);

    AudioPacket audio;
    audio.pts = 200;
    audio.sequence = 1;
    audio.sample_rate = 48000;
    audio.channels = 2;
    audio.samples = {0.0f, 0.25f, -0.25f, 0.0f};

    assert(!bridge.submit_audio(audio));
    assert(bridge.stats().audio_write_failures == 0);
    assert(bridge.stats().audio_rejected == 1);

    bridge.stop();
    std::cout << "native media output bridge smoke: PASS\n";
    return 0;
}
