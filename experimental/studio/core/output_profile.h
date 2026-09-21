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
    std::uint32_t audio_bitrate_kbps = 160;
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
    if (profile.audio_bitrate_kbps == 0) {
        return {false, "audio bitrate must be non-zero"};
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

struct RawMediaInputs {
    std::string video_input = "-";
    std::string audio_input;
    std::uint32_t audio_sample_rate = 48000;
    std::uint16_t audio_channels = 2;
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

inline EncoderCommand build_ffmpeg_av_command(
    const OutputProfile& profile,
    const RawMediaInputs& inputs) {
    EncoderCommand command;
    command.executable = "ffmpeg";
    const char* output_format =
        profile.kind == OutputKind::rtmp ? "flv" : "matroska";
    command.arguments = {
        "-hide_banner", "-loglevel", "warning",
        "-f", "rawvideo",
        "-pix_fmt", "bgra",
        "-video_size", std::to_string(profile.width) + "x" + std::to_string(profile.height),
        "-framerate", std::to_string(profile.fps),
        "-i", inputs.video_input,
        "-f", "f32le",
        "-ar", std::to_string(inputs.audio_sample_rate),
        "-ac", std::to_string(inputs.audio_channels),
        "-i", inputs.audio_input,
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", profile.video_codec,
        "-b:v", std::to_string(profile.bitrate_kbps) + "k",
        "-c:a", profile.audio_codec,
        "-b:a", std::to_string(profile.audio_bitrate_kbps) + "k",
        "-shortest",
        "-f", output_format,
        profile.target,
    };
    return command;
}

// Explicit two-input contract for the eventual native A/V transport. The
// current supervisor intentionally does not call this overload yet: that
// connection is a later gate requiring real RawPipe producers and timestamps.
inline EncoderCommand build_ffmpeg_rtmp_command(
    const OutputProfile& profile,
    const RawMediaInputs& inputs) {
    EncoderCommand command;
    command.executable = "ffmpeg";
    command.arguments = {
        "-hide_banner", "-loglevel", "warning",
        "-f", "rawvideo",
        "-pix_fmt", "bgra",
        "-video_size", std::to_string(profile.width) + "x" + std::to_string(profile.height),
        "-framerate", std::to_string(profile.fps),
        "-i", inputs.video_input,
        "-f", "f32le",
        "-ar", std::to_string(inputs.audio_sample_rate),
        "-ac", std::to_string(inputs.audio_channels),
        "-i", inputs.audio_input,
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-c:v", profile.video_codec,
        "-b:v", std::to_string(profile.bitrate_kbps) + "k",
        "-c:a", profile.audio_codec,
        "-b:a", std::to_string(profile.audio_bitrate_kbps) + "k",
        "-f", "flv",
        profile.target,
    };
    return command;
}

} // namespace cari::studio::core
