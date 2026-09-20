#include "ffmpeg_av_output.h"
#include "process_runner.h"
#include "../core/output_profile.h"

#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <chrono>
#include <cstdint>
#include <filesystem>
#include <iostream>
#include <string>
#include <thread>
#include <vector>

namespace {

bool check(bool condition, const char* message) {
    if (condition) return true;
    std::cerr << "ffmpeg-named-pipe-e2e: " << message << std::endl;
    return false;
}

std::wstring ffmpeg_path() {
    wchar_t buffer[4096]{};
    const DWORD length = GetEnvironmentVariableW(
        L"CARI_FFMPEG_EXECUTABLE", buffer, 4096);
    return length > 0 && length < 4096
        ? std::wstring(buffer, buffer + length)
        : L"ffmpeg.exe";
}

bool pump(cari::native::FfmpegAvOutput& output) {
    return output.poll();
}

bool wait_connected(cari::native::FfmpegAvOutput& output) {
    for (int i = 0; i < 500; ++i) {
        if (!pump(output)) return false;
        if (output.connected()) return true;
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    return false;
}

bool wait_writes(
    cari::native::FfmpegAvOutput& output,
    std::uint64_t video_writes,
    std::uint64_t audio_writes) {
    for (int i = 0; i < 5000; ++i) {
        if (!pump(output)) return false;
        const auto m = output.metrics();
        if (m.video.writes_completed >= video_writes &&
            m.audio.writes_completed >= audio_writes &&
            m.video.writes_pending == 0 &&
            m.audio.writes_pending == 0) {
            return true;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }
    return false;
}

bool verify_output(const std::wstring& ffmpeg, const std::string& input) {
    cari::native::ProcessRunner verifier;
    const std::vector<std::wstring> args{
        L"-hide_banner", L"-loglevel", L"error", L"-i",
        std::wstring(input.begin(), input.end()),
        L"-map", L"0:v:0", L"-map", L"0:a:0", L"-f", L"null", L"-"};
    if (!verifier.start_with_stderr_capture(ffmpeg, args, {})) return false;
    const auto result = verifier.wait(10'000);
    std::string error;
    verifier.drain_stderr(error);
    if (!error.empty()) std::cerr << error << std::endl;
    return result.exited && result.exit_code == 0;
}
}

int main() {
    using namespace cari::studio::core;
    using cari::native::FfmpegAvOutput;
    using cari::native::FfmpegAvOutputState;

    constexpr std::uint32_t width = 64;
    constexpr std::uint32_t height = 36;
    constexpr std::uint32_t sample_rate = 48000;
    constexpr std::uint16_t channels = 2;
    constexpr std::size_t video_frames = 30;
    constexpr std::size_t audio_packets = 50;
    constexpr std::size_t samples_per_packet = 960;

    const std::string target = "cari-ffmpeg-named-pipe-e2e.mkv";
    std::error_code error;
    std::filesystem::remove(target, error);

    OutputProfile profile{
        .id = "named-pipe-e2e",
        .kind = OutputKind::file,
        .target = target,
        .width = width,
        .height = height,
        .fps = 30,
        .bitrate_kbps = 1200,
        .audio_bitrate_kbps = 96,
        .video_codec = "libx264",
        .audio_codec = "aac",
    };

    FfmpegAvOutput output;
    if (!check(output.start(profile, sample_rate, channels,
                            4u * 1024u * 1024u, 2u * 1024u * 1024u,
                            ffmpeg_path()),
               "FFmpeg output start failed")) {
        return 1;
    }
    if (!check(wait_connected(output), "named pipes did not connect")) {
        output.stop();
        return 1;
    }
    if (!check(output.state() == FfmpegAvOutputState::running,
               "output did not reach running state")) {
        output.stop();
        return 1;
    }

    const std::size_t video_bytes =
        static_cast<std::size_t>(width) * height * 4u;
    std::vector<std::uint8_t> video(video_bytes);
    for (std::size_t i = 0; i < video.size(); i += 4) {
        video[i + 0] = static_cast<std::uint8_t>(i & 0xffu);
        video[i + 1] = static_cast<std::uint8_t>((i / 4u) & 0xffu);
        video[i + 2] = 96;
        video[i + 3] = 255;
    }

    std::vector<float> audio(samples_per_packet * channels);
    for (std::size_t i = 0; i < samples_per_packet; ++i) {
        const float sample =
            static_cast<float>(static_cast<int>(i % 32u) - 16) / 32.0f;
        audio[i * channels + 0] = sample;
        audio[i * channels + 1] = -sample;
    }

    for (std::size_t i = 0; i < video_frames || i < audio_packets; ++i) {
        if (i < video_frames) {
            if (!check(output.write_video(video.data(), video.size()), "video write failed")) { output.stop(); return 1; }
        }
        if (i < audio_packets) {
            if (!check(output.write_audio(
                    reinterpret_cast<const std::uint8_t*>(audio.data()),
                    audio.size() * sizeof(float)),
                    "audio write failed")) {
                output.stop();
                return 1;
            }
        }
        if (!check(pump(output), "FFmpeg polling failed")) { output.stop(); return 1; }
        std::this_thread::sleep_for(std::chrono::milliseconds(2));
    }

    if (!check(wait_writes(output, video_frames, audio_packets),
               "raw pipe writes did not complete")) {
        output.stop();
        return 1;
    }
    const auto before_stop = output.metrics();
    if (!check(before_stop.video.writes_completed == video_frames,
               "unexpected completed video writes")) {
        output.stop();
        return 1;
    }
    if (!check(before_stop.audio.writes_completed == audio_packets,
               "unexpected completed audio writes")) {
        output.stop();
        return 1;
    }

    output.stop();
    if (!check(!output.running(), "output still running after stop")) {
        return 1;
    }
    if (!check(std::filesystem::exists(target),
               "FFmpeg did not create the output file")) {
        return 1;
    }
    if (!check(std::filesystem::file_size(target) > 0,
               "FFmpeg output file is empty")) {
        return 1;
    }
    if (!check(verify_output(ffmpeg_path(), target),
               "FFmpeg verifier rejected output")) {
        return 1;
    }

    std::cout << "FFmpeg named-pipe A/V E2E smoke: PASS" << std::endl;
    std::filesystem::remove(target, error);
    return 0;
}
