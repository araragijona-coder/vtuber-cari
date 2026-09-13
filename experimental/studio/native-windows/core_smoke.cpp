#include "../core/audio_mixer.h"
#include "../core/fanout_output.h"
#include "../core/monitoring.h"
#include "../core/pipeline.h"
#include "../core/software_compositor.h"

#include <cassert>
#include <iostream>
#include <memory>

namespace {

class TestSource final : public cari::studio::core::ISource {
public:
    cari::studio::core::SourceDescriptor descriptor() const override {
        return {"test", "Test source", "synthetic", true};
    }

    bool start() override {
        active_ = true;
        return true;
    }

    void stop() noexcept override { active_ = false; }

    cari::studio::core::SourceHealth health() const noexcept override {
        return {active_, 3, 1, 0, 60.0};
    }

private:
    bool active_ = false;
};

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

    SourceRegistry registry;
    auto source = std::make_shared<TestSource>();
    assert(registry.add(source));
    assert(!registry.add(source));
    assert(registry.get("test") != nullptr);

    Scene scene("main");
    assert(scene.add_layer({"test", 0, true, 1.0f}));
    assert(!scene.add_layer({"test", 1, true, 1.0f}));
    assert(scene.set_visible("test", false));

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

    SoftwareCompositor compositor(2, 2);
    const auto background = solid(2, 2, 20, 40, 60);
    const auto overlay = solid(1, 1, 220, 10, 30, 128);
    assert(compositor.compose({
        {"background", background, 0, 0, true, 1.0f},
        {"overlay", overlay, 1, 1, true, 1.0f},
    }));
    const auto& composed = compositor.output();
    assert(composed.valid());
    assert(composed.pixels[(1u * 2u + 1u) * 4u + 3] == 255);
    assert(composed.pixels[(0u * 2u + 0u) * 4u] == 20);

    StudioPipeline pipeline(2, 2);
    auto output = std::make_shared<NullOutput>();
    assert(pipeline.set_output(output));
    assert(pipeline.start());

    assert(pipeline.submit_frame(Frame{100, 1280, 720, 5120, 1, 1}));
    assert(pipeline.submit_frame(Frame{200, 1280, 720, 5120, 1, 2}));
    assert(pipeline.submit_frame(Frame{300, 1280, 720, 5120, 1, 3}));
    assert(pipeline.dropped_video() == 1);
    assert(pipeline.pump_once() == 2);
    assert(pipeline.output_metrics().frames == 2);
    assert(output->last_pts() == 300);

    pipeline.stop();
    assert(!pipeline.running());
    assert(pipeline.start());
    assert(pipeline.submit_frame(Frame{400, 1280, 720, 5120, 1, 4}));
    assert(pipeline.pump_once() == 1);
    pipeline.stop();

    auto first = std::make_shared<NullOutput>();
    auto second = std::make_shared<NullOutput>();
    FanoutOutput fanout;
    assert(fanout.add_output(first));
    assert(fanout.add_output(second));
    assert(fanout.output_count() == 2);
    assert(fanout.start());
    assert(fanout.submit(Frame{500, 1280, 720, 5120, 1, 5}));
    assert(fanout.metrics().frames == 2);
    fanout.stop();

    std::cout << "Cari Core smoke: PASS\n";
    return 0;
}
