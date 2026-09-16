#include "../core/output_profile.h"
#include "ffmpeg_supervisor.h"

#include <cassert>
#include <iostream>

int main() {
    using namespace cari::studio::core;
    using cari::native::FfmpegState;
    using cari::native::FfmpegSupervisor;

    OutputProfile invalid{
        "twitch", OutputKind::rtmp, "https://example.test/live/key",
        1280, 720, 60, 4500, "libx264", "aac"
    };

    FfmpegSupervisor supervisor;
    assert(!supervisor.start(invalid, L"definitely-missing-ffmpeg.exe"));
    assert(supervisor.state() == FfmpegState::failed);
    assert(!supervisor.last_error().empty());

    OutputProfile valid{
        "twitch", OutputKind::rtmp, "rtmps://example.test/live/key",
        1280, 720, 60, 4500, "libx264", "aac"
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
