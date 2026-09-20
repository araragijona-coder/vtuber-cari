#include "ffmpeg_av_output.h"
#include "process_runner.h"
#include "../core/output_profile.h"

#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <algorithm>
#include <cassert>
#include <cstdint>
#include <filesystem>
#include <iostream>
#include <string>
#include <vector>

namespace {

std::wstring temp_output_path() {
    wchar_t temp_path[MAX_PATH]{};
    const DWORD length = GetTempPathW(MAX_PATH, temp_path);
    if (length == 0 || length >= MAX_PATH) {
        return {};
    }

    std::wstring path(temp_path, temp_path + length);
    path += L"CariStudio-e2e-";
    path += std::to_wstring(GetCurrentProcessId());
    path += L".mkv";
    DeleteFileW(path.c_str());
    return path;
}

std::wstring configured_ffmpeg() {
    wchar_t buffer[4096]{};
    constexpr DWORD capacity =
        static_cast<DWORD>(sizeof(buffer) / sizeof(buffer[0]));
    const DWORD length = GetEnvironmentVariableW(
        L"CARI_FFMPEG_EXECUTABLE",
        buffer,
        capacity);
    if (length == 0 || length >= capacity) {
        return L"ffmpeg.exe";
    }
    return std::wstring(buffer, buffer + length);
}

bool pump_until_connected(cari::native::FfmpegAvOutput& output) {
    for (int i = 0; i < 500; ++i) {
        if (!output.poll()) {
            return false;
        }
        if (output.connected()) {
            return true;
        }
        Sleep(10);
    }
    return false;
}

bool validate_muxed_output(const std::wstring& ffmpeg,
                           const std::wstring& path) {
    cari::native::ProcessRunner verifier;
    const std::vector<std::wstring> arguments = {
        L"-hide_banner",
        L"-loglevel", L"error",
        L"-i", path,
        L"-map", L"0:v:0",
        L"-map", L"0:a:0",
        L"-f", L"null",
        L"-",
    };

    if (!verifier.start_with_stderr_capture(ffmpeg, arguments)) {
        return false;
    }

    const auto result = verifier.wait(10'000);
    std::string stderr_text;
    verifier.drain_stderr(stderr_text);
    if (!result.exited || result.exit_code != 0) {
        std::cerr << stderr_text;
        return false;
    }
    return true;
}

} // namespace

int main() {
    using namespace cari::studio::core;
    using cari::native::FfmpegAvOutput;

    constexpr std::uint32_t width = 320;
    constexpr std::uint32_t height = 180;
    constexpr std::uint32_t fps = 30;
    constexpr std::uint32_t sample_rate = 48'000;
    constexpr std::uint16_t channels = 2;
    constexpr std::size_t frames = 30;
    constexpr std::size_t audio_packets = 50;
    constexpr std::size_t audio_samples_per_packet = 960;

    const std::wstring target = temp_output_path();
    assert(!target.empty());

    OutputProfile profile{
        .id = "windows-named-pipe-e2e",
        .kind = OutputKind::file,
        .target = std::filesystem::path(target).u8string(),
        .width = width,
        .height = height,
        .fps = fps,
        .bitrate_kbps = 1200,
        .audio_bitrate_kbps = 96,
        .video_codec = "libx264",
        .audio_codec = "aac",
    };

    FfmpegAvOutput output;
    assert(output.start(
        profile,
        sample_rate,
        channels,
        32u * 1024u * 1024u,
        8u * 1024u * 1024u,
        configured_ffmpeg()));

    assert(pump_until_connected(output));

    const std::size_t video_bytes =
        static_cast<std::size_t>(width) * height * 4u;
    std::vector<std::uint8_t> video(video_bytes);
    std::vector<float> audio(audio_samples_per_packet * channels);

    for (std::size_t frame = 0; frame < frames; ++frame) {
        for (std::size_t index = 0; index < video.size(); index += 4) {
            video[index + 0] = static_cast<std::uint8_t>((index / 4 + frame) & 0xFF);
            video[index + 1] = static_cast<std::uint8_t>(frame * 7);
            video[index + 2] = 96;
            video[index + 3] = 255;
        }

        assert(output.write_video(video.data(), video.size()));

        if (frame < audio_packets) {
            for (std::size_t sample = 0; sample < audio.size(); sample += 2) {
                const float value =
                    ((sample / 2) % 100 < 50) ? 0.08f : -0.08f;
                audio[sample + 0] = value;
                audio[sample + 1] = value;
            }
            assert(output.write_audio(
                reinterpret_cast<const std::uint8_t*>(audio.data()),
                audio.size() * sizeof(float)));
        }

        for (int spin = 0; spin < 8; ++spin) {
            assert(output.poll());
            Sleep(2);
        }
    }

    for (int i = 0; i < 100; ++i) {
        assert(output.poll());
        Sleep(2);
    }

    output.stop();

    assert(std::filesystem::exists(std::filesystem::path(target)));
    assert(std::filesystem::file_size(std::filesystem::path(target)) > 4096);
    assert(validate_muxed_output(configured_ffmpeg(), target));

    DeleteFileW(target.c_str());
    std::cout << "FFmpeg named-pipe A/V end-to-end smoke: PASS\n";
    return 0;
}
