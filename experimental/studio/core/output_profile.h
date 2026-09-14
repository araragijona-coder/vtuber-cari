#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace cari::studio::core {

enum class OutputKind {
    file,
    rtmp,
};

struct OutputProfile {
    std::string id;
    OutputKind kind = OutputKind::file;
    std::string target;
    std::uint32_t width = 1920;
    std::uint32_t height = 1080;
    std::uint32_t fps = 60;
    std::uint32_t bitrate_kbps = 6000;
    std::string video_codec = "h264";
    std::string audio_codec = "aac";
};

struct EncoderCommand {
    std::string executable;
    std::vector<std::string> arguments;
};

inline EncoderCommand build_ffmpeg_rtmp_command(const OutputProfile& profile) {
    EncoderCommand command;
    command.executable = "ffmpeg";
    command.arguments = {
        "-hide_banner", "-loglevel", "warning",
        "-f", "rawvideo",
        "-pix_fmt", "bgra",
        "-video_size", std::to_string(profile.width) + "x" + std::to_string(profile.height),
        "-framerate", std::to_string(profile.fps),
        "-i", "-",
        "-c:v", profile.video_codec,
        "-b:v", std::to_string(profile.bitrate_kbps) + "k",
        "-f", "flv",
        profile.target,
    };
    return command;
}

} // namespace cari::studio::core
