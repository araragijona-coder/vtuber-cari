#include "../core/output_profile.h"
#include "ffmpeg_supervisor.h"

#include <cassert>
#include <iostream>

int main() {
    using namespace cari::studio::core;
    using cari::native::FfmpegState;
    using cari::native::FfmpegSupervisor;

    OutputProfile invalid{
        .id = "twitch",
        .kind = OutputKind::rtmp,
        .target = "https://example.test/live/key",
        .width = 1280,
        .height = 720,
        .fps = 60,
        .bitrate_kbps = 4500,
        .audio_bitrate_kbps = 160,
        .video_codec = "libx264",
        .audio_codec = "aac",
    };

    FfmpegSupervisor supervisor;
    assert(!supervisor.start(invalid, L"definitely-missing-ffmpeg.exe"));
    assert(supervisor.state() == FfmpegState::failed);
    assert(!supervisor.last_error().empty());

    OutputProfile valid{
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
    supervisor.stop();
    assert(supervisor.state() == FfmpegState::stopped);

    // Do not contact a real RTMP service in CI. This smoke verifies the
    // deterministic validation boundary and executable-launch failure path.
    assert(!supervisor.start(valid, L"definitely-missing-ffmpeg.exe"));
    assert(supervisor.state() == FfmpegState::failed);

    std::cout << "FFmpeg Supervisor smoke: PASS\n";
    return 0;
}
