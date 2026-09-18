#include "../core/output_profile.h"
#include "ffmpeg_av_output.h"

#include <cassert>
#include <cstdint>
#include <iostream>

int main() {
    using namespace cari::studio::core;
    using cari::native::FfmpegAvOutput;
    using cari::native::FfmpegAvOutputState;

    OutputProfile profile{
        .id = "twitch",
        .kind = OutputKind::rtmp,
        .target = "rtmps://example.test/live/key",
        .width = 1280,
        .height = 720,
        .fps = 60,
        .bitrate_kbps = 4500,
        .audio_bitrate_kbps = 160,
        .video_codec = "libx264",
        .audio_codec = "aac",
    };

    FfmpegAvOutput output;
    assert(!output.start(
        profile,
        48000,
        2,
        1024 * 1024,
        256 * 1024,
        L"definitely-missing-ffmpeg.exe"));
    assert(output.state() == FfmpegAvOutputState::failed);
    assert(!output.last_error().empty());
    assert(!output.connected());

    OutputProfile file_profile = profile;
    file_profile.kind = OutputKind::file;
    file_profile.target = "capture.mkv";
    assert(!output.start(
        file_profile,
        48000,
        2,
        1024 * 1024,
        256 * 1024,
        L"definitely-missing-ffmpeg.exe"));
    assert(output.state() == FfmpegAvOutputState::failed);
    assert(!output.last_error().empty());

    std::cout << "FFmpeg A/V output smoke: PASS\n";
    return 0;
}
