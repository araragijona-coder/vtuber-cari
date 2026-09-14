#pragma once

#include <cstdint>
#include <string>
#include <utility>
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

struct OutputProfileValidation {
    bool valid = false;
    std::string error;
};

inline OutputProfileValidation validate_output_profile(const OutputProfile& profile) {
    if (profile.id.empty()) {
        return {false, "output profile id is required"};
    }
    if (profile.target.empty()) {
        return {false, "output target is required"};
    }
    if (profile.width == 0 || profile.height == 0) {
        return {false, "output dimensions must be non-zero"};
    }
    if (profile.fps == 0 || profile.fps > 240) {
        return {false, "output fps must be between 1 and 240"};
    }
    if (profile.bitrate_kbps == 0) {
        return {false, "output bitrate must be non-zero"};
    }
    if (profile.video_codec.empty()) {
        return {false, "video codec is required"};
    }
    if (profile.audio_codec.empty()) {
        return {false, "audio codec is required"};
    }
    if (profile.kind == OutputKind::rtmp &&
        profile.target.rfind("rtmp://", 0) != 0 &&
        profile.target.rfind("rtmps://", 0) != 0) {
        return {false, "RTMP output target must use rtmp:// or rtmps://"};
    }
    return {true, {}};
}

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
