#include "../core/audio_mixer.h"
#include "../core/av_sync.h"
#include "../core/bounded_queue.h"
#include "../core/fanout_output.h"
#include "../core/monitoring.h"
#include "../core/output_profile.h"
#include "../core/pipeline.h"
#include "../core/software_compositor.h"
#include "process_runner.h"

#include <cassert>
#include <iostream>
#include <memory>

namespace {

cari::studio::core::RgbaImage solid(
    std::uint32_t width,
    std::uint32_t height,
    std::uint8_t r,
    std::uint8_t g,
    std::uint8_t b,
    std::uint8_t a = 255) {
    cari::studio::core::RgbaImage image{width, height, {}};
    image.pixels.resize(static_cast<std::size_t>(width) * height * 4u);
    for (std::size_t i = 0; i < image.pixels.size(); i += 4) {
        image.pixels[i] = r;
        image.pixels[i + 1] = g;
        image.pixels[i + 2] = b;
        image.pixels[i + 3] = a;
    }
    return image;
}

} // namespace

int main() {
    using namespace cari::studio::core;

    BoundedQueue<int> queue(2);
    assert(queue.push(1));
    assert(queue.push(2));
    assert(queue.push(3));
    assert(queue.dropped() == 1);
    assert(queue.try_pop().value() == 2);
    assert(queue.try_pop().value() == 3);
    assert(!queue.try_pop().has_value());
    queue.close();
    assert(!queue.push(4));
    assert(!queue.wait_pop().has_value());
    queue.reset();
    assert(!queue.closed());
    assert(queue.dropped() == 0);

    AvSyncController sync(AvSyncConfig{.video_lead_tolerance = 10,
                                       .video_lag_tolerance = 20,
                                       .max_video_queue = 3,
                                       .max_audio_queue = 3});
    sync.push_video(Frame{100, 1280, 720, 5120, 1, 1});
    sync.push_video(Frame{110, 1280, 720, 5120, 1, 2});
    sync.push_audio(AudioPacket{105, 48000, 2, 1, {0.1f, 0.2f}});
    auto first_event = sync.next();
    assert(first_event.has_value());
    assert(first_event->kind == AvSyncController::Event::Kind::video);
    assert(first_event->frame->pts == 100);
    auto second_event = sync.next();
    assert(second_event.has_value());
    assert(second_event->kind == AvSyncController::Event::Kind::audio);
    assert(second_event->audio->pts == 105);
    assert(sync.stats().audio_clock_ready);
    assert(sync.stats().emitted_video == 1);
    assert(sync.stats().emitted_audio == 1);

    sync.push_audio(AudioPacket{1'000, 48000, 2, 2, {0.1f, 0.2f}});
    sync.push_video(Frame{900, 1280, 720, 5120, 3, 3});
    assert(!sync.next().has_value());
    assert(sync.stats().video_dropped_late == 1);

    AudioMixer mixer;
    assert(mixer.add_track("mic"));
    assert(mixer.add_track("game"));
    assert(mixer.set_volume("game", 0.5f));
    assert(mixer.set_samples("mic", {0.25f, 0.5f, 1.0f}));
    assert(mixer.set_samples("game", {0.5f, 0.5f, 0.5f}));
    const auto mixed = mixer.mix(3);
    assert(mixed.size() == 3);
    assert(mixed[0] == 0.5f);
    assert(mixed[1] == 0.75f);
    assert(mixer.peak(mixed) <= 1.0f);

    assert(classify_load(40.0) == HealthLevel::excellent);
    assert(classify_load(90.0) == HealthLevel::high);
    assert(classify_fps(30.0, 60.0) == HealthLevel::high);

    SoftwareCompositor compositor(3, 3);
    const auto background = solid(2, 2, 20, 40, 60);
    const auto overlay = solid(1, 1, 220, 10, 30, 255);
    assert(compositor.compose({
        {"background", background, 0, 0, true, 1.0f},
        {"overlay", overlay, 1, 1, true, 1.0f},
    }));
    assert(compositor.output().valid());

    Scene scene("test-scene");
    assert(scene.add_layer(SceneLayer{"background", 0, true, 1.0f, 0, 0, 1.0f, 1.0f}));
    assert(scene.add_layer(SceneLayer{"overlay", 1, true, 1.0f, 1, 1, 2.0f, 2.0f}));
    SoftwareCompositor transformed_compositor(4, 4);
    assert(transformed_compositor.compose_scene(
        scene,
        {
            {"background", background, 0, 0, true, 1.0f},
            {"overlay", overlay, 0, 0, true, 1.0f},
        }));
    assert(transformed_compositor.output().valid());
    assert(transformed_compositor.output().pixels.size() == 4u * 4u * 4u);

    OutputProfile rtmp_profile{
        "twitch", OutputKind::rtmp, "rtmps://example.test/live/key",
        1920, 1080, 60, 6000, "libx264", "aac"
    };
    assert(validate_output_profile(rtmp_profile).valid);
    const auto command = build_ffmpeg_rtmp_command(rtmp_profile);
    assert(command.executable == "ffmpeg");
    assert(!command.arguments.empty());

    auto invalid_profile = rtmp_profile;
    invalid_profile.target = "https://example.test/live";
    const auto invalid_result = validate_output_profile(invalid_profile);
    assert(!invalid_result.valid);
    assert(!invalid_result.error.empty());

    StudioPipeline pipeline(2, 2);
    auto output = std::make_shared<NullOutput>();
    assert(pipeline.set_output(output));
    assert(pipeline.start());
    assert(pipeline.submit_frame(Frame{100, 1280, 720, 5120, 1, 1}));
    assert(pipeline.submit_frame(Frame{200, 1280, 720, 5120, 1, 2}));
    assert(pipeline.submit_frame(Frame{300, 1280, 720, 5120, 1, 3}));
    assert(pipeline.submit_audio(AudioPacket{150, 48000, 2, 1, {0.1f, 0.2f, 0.3f, 0.4f}}));
    assert(pipeline.dropped_video() == 1);
    assert(pipeline.pump_once() == 2);
    assert(pipeline.output_metrics().frames == 2);
    assert(pipeline.output_metrics().audio_frames == 2);
    assert(output->last_pts() == 300);
    assert(pipeline.av_sync_stats().audio_clock_ready);
    pipeline.stop();

    assert(pipeline.start());
    assert(pipeline.submit_frame(Frame{400, 1280, 720, 5120, 1, 4}));
    assert(pipeline.pump_once() == 1);
    assert(pipeline.output_metrics().frames == 1);
    pipeline.stop();

    auto first = std::make_shared<NullOutput>();
    auto second = std::make_shared<NullOutput>();
    FanoutOutput fanout;
    assert(fanout.add_output(first));
    assert(fanout.add_output(second));
    assert(fanout.output_count() == 2);
    assert(fanout.start());
    assert(fanout.submit(Frame{500, 1280, 720, 5120, 1, 5}));
    assert(fanout.submit_audio(AudioPacket{550, 48000, 2, 6, {0.1f, 0.2f, 0.3f, 0.4f}}));
    assert(fanout.metrics().frames == 2);
    assert(fanout.metrics().audio_frames == 4);
    fanout.stop();

    cari::native::ProcessRunner runner;
    assert(runner.start(L"cmd.exe", {L"/C", L"exit", L"0"}));
    const auto process_result = runner.wait(5000);
    assert(process_result.started);
    assert(process_result.exited);
    assert(process_result.exit_code == 0);

    std::cout << "Cari Core smoke: PASS\n";
    return 0;
}