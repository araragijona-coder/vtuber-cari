#include "audio_timeline_mixer.h"

#include <cmath>
#include <cstdint>
#include <iostream>
#include <vector>

namespace {

cari::studio::core::AudioPacket make_packet(
    std::int64_t pts,
    std::uint32_t sample_rate,
    std::uint16_t channels,
    float value,
    std::uint64_t sequence) {
    cari::studio::core::AudioPacket packet;
    packet.pts = pts;
    packet.sample_rate = sample_rate;
    packet.channels = channels;
    packet.sequence = sequence;
    const std::size_t frames = static_cast<std::size_t>(sample_rate / 50);
    packet.samples.assign(frames * channels, value);
    return packet;
}

bool require(bool condition, const char* message) {
    if (!condition) {
        std::cerr << "FAIL: " << message << '\n';
        return false;
    }
    return true;
}

} // namespace

int main() {
    using cari::native::AudioTimelineMixer;
    using cari::native::AudioTimelineMixerConfig;

    AudioTimelineMixer mixer(AudioTimelineMixerConfig{48000, 2, 20, 2000});

    const auto mic0 = make_packet(0, 48000, 1, 0.25f, 1);
    const auto system0 = make_packet(0, 48000, 2, 0.50f, 2);
    const auto mic1 = make_packet(200'000, 48000, 1, 0.20f, 3);
    const auto system1 = make_packet(200'000, 48000, 2, 0.30f, 4);

    if (!require(mixer.push("microphone", mic0), "microphone packet accepted")) return 1;
    if (!require(mixer.push("system", system0), "system packet accepted")) return 1;

    cari::studio::core::AudioPacket mixed;
    if (!require(mixer.pop(mixed), "20 ms mixed packet produced")) return 1;
    if (!require(mixed.pts == 0, "mixed packet preserves timeline origin")) return 1;
    if (!require(mixed.sample_rate == 48000 && mixed.channels == 2,
                  "mixed format is normalized to stereo 48 kHz")) return 1;
    if (!require(mixed.samples.size() == 1920, "mixed packet has 20 ms of stereo audio")) return 1;
    if (!require(std::fabs(mixed.samples.front() - 0.75f) < 0.0001f,
                  "microphone and system samples are summed")) return 1;

    if (!require(mixer.push("microphone", mic1), "second microphone packet accepted")) return 1;
    if (!require(mixer.push("system", system1), "second system packet accepted")) return 1;

    const auto resampled = make_packet(200'000, 44100, 2, 0.10f, 5);
    if (!require(mixer.push("tts", resampled), "different-rate TTS packet accepted")) return 1;
    const auto stats = mixer.stats();
    if (!require(stats.packets_resampled == 1, "different sample rate is resampled")) return 1;

    cari::studio::core::AudioPacket next;
    if (!require(mixer.pop(next), "next temporal packet produced")) return 1;
    if (!require(next.pts > mixed.pts, "output PTS advances monotonically")) return 1;
    if (!require(std::fabs(next.samples.front() - 0.60f) < 0.02f,
                  "second mixed packet contains microphone and system audio")) return 1;

    cari::studio::core::AudioPacket invalid;
    invalid.pts = 0;
    invalid.sample_rate = 48000;
    invalid.channels = 2;
    invalid.samples = {0.0f};
    if (!require(!mixer.push("invalid", invalid), "malformed packet rejected")) return 1;

    const auto final_stats = mixer.stats();
    if (!require(final_stats.packets_rejected == 1, "rejection metric increments")) return 1;
    if (!require(final_stats.packets_mixed == 2, "two output packets were mixed")) return 1;

    std::cout << "audio timeline mixer smoke passed\n";
    return 0;
}
