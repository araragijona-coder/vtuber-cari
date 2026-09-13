#include "../core/pipeline.h"

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

    std::cout << "Cari Core smoke: PASS\n";
    return 0;
}
