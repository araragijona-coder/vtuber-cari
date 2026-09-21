#include "libav_media_output.h"

#include "../core/output_profile.h"

extern "C" {
#include <libavformat/avformat.h>
#include <libavutil/channel_layout.h>
}

#include <cassert>
#include <chrono>
#include <cstdio>
#include <filesystem>
#include <iostream>
#include <memory>
#include <vector>

namespace {

bool check(bool ok, const char* message) {
    if (!ok) {
        std::cerr << "libav-output-smoke: " << message << "\n";
    }
    return ok;
}

} // namespace

int main() {
    using namespace cari::studio::core;
    using cari::native::LibavMediaOutput;

    constexpr std::uint32_t width = 160;
    constexpr std::uint32_t height = 90;
    constexpr std::uint32_t fps = 30;
    constexpr std::uint32_t sample_rate = 48000;
    constexpr std::uint16_t channels = 2;
    constexpr std::size_t video_frames = 60;

    const std::string target = "cari-libav-pts-smoke.mkv";
    std::error_code remove_error;
    std::filesystem::remove(target, remove_error);

    OutputProfile profile{
        .id = "libav-pts-smoke",
        .kind = OutputKind::file,
        .target = target,
        .width = width,
        .height = height,
        .fps = fps,
        .bitrate_kbps = 1200,
        .audio_bitrate_kbps = 96,
        .video_codec = "libx264",
        .audio_codec = "aac",
    };

    LibavMediaOutput output;
    if (!check(output.start(profile, sample_rate, channels),
               "could not start direct libav output")) {
        return 1;
    }

    const std::size_t video_bytes =
        static_cast<std::size_t>(width) * height * 4u;
    auto pixels = std::make_shared<std::vector<std::uint8_t>>(video_bytes);
    for (std::size_t i = 0; i < pixels->size(); i += 4u) {
        (*pixels)[i + 0] = 40;
        (*pixels)[i + 1] = static_cast<std::uint8_t>((i / 4u) & 0xffu);
        (*pixels)[i + 2] = 180;
        (*pixels)[i + 3] = 255;
    }

    std::vector<float> samples(960u * channels);
    for (std::size_t i = 0; i < 960u; ++i) {
        samples[i * channels + 0] = 0.10f;
        samples[i * channels + 1] = -0.10f;
    }

    const Timestamp origin = 100'000'000;
    for (std::size_t i = 0; i < video_frames; ++i) {
        Frame frame{
            .pts = origin + static_cast<Timestamp>(i) *
                   (MediaClock::kTicksPerSecond / fps),
            .width = width,
            .height = height,
            .stride = width * 4u,
            .format = 1,
            .sequence = i + 1,
        };
        if (!check(output.submit_video(frame, pixels),
                   "video submission failed")) {
            output.stop();
            return 1;
        }

        AudioPacket packet{
            .pts = origin + static_cast<Timestamp>(i) *
                   320'000, // 32 ms; deliberately different from video cadence.
            .sample_rate = sample_rate,
            .channels = channels,
            .sequence = i + 1,
            .samples = samples,
        };
        if (!check(output.submit_audio(packet),
                   "audio submission failed")) {
            output.stop();
            return 1;
        }
    }

    const auto before_stop = output.stats();
    if (!check(before_stop.first_input_pts == origin,
               "first input PTS was not captured")) {
        output.stop();
        return 1;
    }
    if (!check(before_stop.last_video_input_pts == origin +
               static_cast<Timestamp>(video_frames - 1) *
               (MediaClock::kTicksPerSecond / fps),
               "last video input PTS mismatch")) {
        output.stop();
        return 1;
    }

    output.stop();

    if (!check(std::filesystem::exists(target) &&
               std::filesystem::file_size(target) > 0,
               "output file was not produced")) {
        return 1;
    }

    AVFormatContext* input = nullptr;
    if (!check(avformat_open_input(
                   &input, target.c_str(), nullptr, nullptr) >= 0,
               "libav could not reopen output file")) {
        return 1;
    }
    if (!check(avformat_find_stream_info(input, nullptr) >= 0,
               "libav could not read stream info")) {
        avformat_close_input(&input);
        return 1;
    }

    int video_index = -1;
    int audio_index = -1;
    for (unsigned int i = 0; i < input->nb_streams; ++i) {
        if (input->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
            video_index = static_cast<int>(i);
        } else if (input->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_AUDIO) {
            audio_index = static_cast<int>(i);
        }
    }

    if (!check(video_index >= 0 && audio_index >= 0,
               "output does not contain both media streams")) {
        avformat_close_input(&input);
        return 1;
    }

    avformat_close_input(&input);
    std::filesystem::remove(target, remove_error);

    const auto stats = output.stats();
    if (!check(stats.video_packets_written > 0 && stats.audio_packets_written > 0,
               "encoded packet counts were not recorded")) {
        return 1;
    }
    if (!check(stats.first_video_packet_pts >= 0 && stats.last_video_packet_pts >= stats.first_video_packet_pts,
               "video packet PTS bounds are invalid")) {
        return 1;
    }
    if (!check(stats.first_audio_packet_pts >= 0 && stats.last_audio_packet_pts >= stats.first_audio_packet_pts,
               "audio packet PTS bounds are invalid")) {
        return 1;
    }
    if (!check(stats.last_video_input_pts == origin +
               static_cast<Timestamp>(video_frames - 1) *
               (MediaClock::kTicksPerSecond / fps),
               "video input PTS changed during encoding")) {
        return 1;
    }
    if (!check(stats.last_audio_input_pts == origin +
               static_cast<Timestamp>(video_frames - 1) *
               320'000,
               "audio input PTS changed during encoding")) {
        return 1;
    }
    if (!check(stats.video_frames_submitted == video_frames,
               "unexpected submitted video frame count")) {
        return 1;
    }
    if (!check(stats.audio_packets_submitted == video_frames,
               "unexpected submitted audio packet count")) {
        return 1;
    }

    std::cout << "Direct libav PTS smoke: PASS\n";
    return 0;
}
