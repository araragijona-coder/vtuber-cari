#include "multi_stream_output.h"

#include <cassert>
#include <chrono>
#include <filesystem>
#include <iostream>
#include <memory>
#include <thread>
#include <vector>

int main() {
    using namespace cari::studio::core;
    using cari::native::MultiStreamOutput;

    constexpr std::uint32_t width = 64;
    constexpr std::uint32_t height = 36;
    constexpr std::uint32_t sample_rate = 48000;
    constexpr std::uint16_t channels = 2;
    constexpr std::size_t frames = 30;

    const std::vector<std::string> targets{
        "cari-multistream-a.mkv",
        "cari-multistream-b.mkv"
    };
    for (const auto& target : targets) {
        std::error_code error;
        std::filesystem::remove(target, error);
    }

    OutputProfile profile{
        .id = "multistream-smoke",
        .kind = OutputKind::file,
        .target = targets.front(),
        .width = width,
        .height = height,
        .fps = 30,
        .bitrate_kbps = 1200,
        .audio_bitrate_kbps = 96,
        .video_codec = "libx264",
        .audio_codec = "aac"
    };

    MultiStreamOutput output;
    if (!output.start(profile, targets)) {
        std::cerr << "Multistream smoke: no destination started\n";
        return 1;
    }
    assert(output.destination_count() == 2);

    for (int attempt = 0; attempt < 500; ++attempt) {
        if (!output.poll()) {
            std::cerr << "Multistream smoke: all destinations failed during handshake\n";
            output.stop();
            return 1;
        }
        const auto statuses = output.destinations();
        bool all_connected = statuses.size() == 2;
        for (const auto& destination : statuses) {
            all_connected = all_connected &&
                destination.state == "running" &&
                destination.video_drops == 0 &&
                destination.audio_drops == 0;
        }
        if (all_connected) {
            break;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }

    auto pixels = std::make_shared<std::vector<std::uint8_t>>(
        static_cast<std::size_t>(width) * height * 4u, 0u);
    std::vector<float> audio(960u * channels, 0.0f);

    for (std::size_t i = 0; i < frames; ++i) {
        Frame frame;
        frame.width = width;
        frame.height = height;
        frame.pts = static_cast<Timestamp>(i) * 333'333;
        frame.sequence = i + 1;
        assert(output.submit_video(frame, pixels));

        AudioPacket packet;
        packet.sample_rate = sample_rate;
        packet.channels = channels;
        packet.pts = frame.pts;
        packet.sequence = i + 1;
        packet.samples = audio;
        assert(output.submit_audio(packet));

        output.poll();
        std::this_thread::sleep_for(std::chrono::milliseconds(2));
    }

    output.stop();

    for (const auto& target : targets) {
        assert(std::filesystem::exists(target));
        assert(std::filesystem::file_size(target) > 0);
        std::error_code error;
        std::filesystem::remove(target, error);
    }

    std::cout << "Multistream local fan-out smoke: PASS\n";
    return 0;
}
