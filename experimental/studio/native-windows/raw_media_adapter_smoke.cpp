#include "raw_media_adapter.h"

#include <cassert>
#include <cstdint>
#include <iostream>
#include <memory>
#include <vector>

int main() {
    using namespace cari::studio::core;
    using cari::native::RawAudioFrame;
    using cari::native::RawMediaAdapter;
    using cari::native::RawVideoFrame;

    auto pixels = std::make_shared<std::vector<std::uint8_t>>(
        std::initializer_list<std::uint8_t>{
            1, 2, 3, 4,
            5, 6, 7, 8,
        });

    Frame frame{
        .pts = 1234,
        .width = 2,
        .height = 1,
        .stride = 8,
        .sequence = 7,
    };

    RawVideoFrame raw_video;
    assert(RawMediaAdapter::make_video(frame, pixels, raw_video));
    assert(raw_video.pts == 1234);
    assert(raw_video.sequence == 7);
    assert(raw_video.width == 2);
    assert(raw_video.height == 1);
    assert(raw_video.bgra == pixels);
    assert(RawMediaAdapter::validate_video(raw_video));

    AudioPacket packet{
        .pts = 2345,
        .sample_rate = 48000,
        .channels = 2,
        .sequence = 8,
        .samples = {0.25f, -0.5f, 0.75f, -1.0f},
    };

    RawAudioFrame raw_audio;
    assert(RawMediaAdapter::make_audio(packet, raw_audio));
    assert(raw_audio.pts == 2345);
    assert(raw_audio.sample_rate == 48000);
    assert(raw_audio.channels == 2);
    assert(raw_audio.sequence == 8);
    assert(RawMediaAdapter::validate_audio(raw_audio));
    assert(RawMediaAdapter::audio_bytes(raw_audio) != nullptr);
    assert(RawMediaAdapter::audio_byte_size(raw_audio) == 4u * sizeof(float));

    AudioPacket invalid_packet = packet;
    invalid_packet.samples = {0.25f, -0.5f, 0.75f};
    RawAudioFrame invalid_audio;
    assert(!RawMediaAdapter::make_audio(invalid_packet, invalid_audio));
    assert(!RawMediaAdapter::validate_audio(invalid_audio));

    RawVideoFrame invalid_video = raw_video;
    invalid_video.width = 3;
    assert(!RawMediaAdapter::validate_video(invalid_video));

    std::cout << "Raw media adapter smoke: PASS\n";
    return 0;
}
