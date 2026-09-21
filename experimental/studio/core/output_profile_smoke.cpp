#include "output_profile.h"

#include <cassert>
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>

int main() {
    using namespace cari::studio::core;

    OutputProfile profile{
        "local-record", OutputKind::file, "capture.flv",
        1280, 720, 30, 4500, 160, "libx264", "aac"
    };
    RawMediaInputs inputs{
        R"(\\.\pipe\cari_video_1)",
        R"(\\.\pipe\cari_audio_1)",
        48000,
        2,
    };

    const auto validation = validate_output_profile(profile);
    assert(validation.valid);

    const auto command = build_ffmpeg_av_command(profile, inputs);
    assert(command.executable == "ffmpeg");

    const auto has = [&](const std::string& value) {
        return std::find(command.arguments.begin(), command.arguments.end(), value) !=
               command.arguments.end();
    };

    assert(has("-f"));
    assert(has("rawvideo"));
    assert(has("f32le"));
    assert(has(inputs.video_input));
    assert(has(inputs.audio_input));
    assert(has("-ar"));
    assert(has("48000"));
    assert(has("-ac"));
    assert(has("2"));
    assert(has("-map"));
    assert(has("0:v:0"));
    assert(has("1:a:0"));
    assert(has("-c:v"));
    assert(has("-c:a"));
    assert(has("libx264"));
    assert(has("aac"));
    assert(has("160k"));
    // Raw inputs receive their timing from the input format (video cadence and
    // audio sample clock). Explicit source PTS are reserved for the Libav path.
    assert(has("-shortest"));
    assert(has("matroska"));

    std::cout << "Output profile A/V mapping smoke: PASS\n";
    return 0;
}
