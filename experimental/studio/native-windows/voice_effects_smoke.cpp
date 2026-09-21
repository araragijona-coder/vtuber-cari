#include "voice_effects.h"

#include <cassert>
#include <cmath>
#include <cstddef>
#include <iostream>
#include <vector>

int main() {
    using cari::native::VoiceEffectConfig;
    using cari::native::VoiceEffectProcessor;
    using cari::native::VoiceEffectStyle;

    VoiceEffectProcessor processor;

    std::vector<float> samples(4800, 0.25f);
    processor.process(samples, 48000, 1);
    for (const auto sample : samples) {
        assert(std::fabs(sample - 0.25f) < 0.0001f);
    }

    processor.set_config(VoiceEffectConfig{
        .style = VoiceEffectStyle::anime_bright,
        .drive = 1.4f,
        .presence = 0.3f,
        .output_gain = 0.95f,
        .compressor_threshold = 0.55f,
        .compressor_ratio = 4.0f,
        .limiter_ceiling = 0.96f,
    });

    std::vector<float> effected(4800, 0.25f);
    processor.process(effected, 48000, 1);
    bool changed = false;
    for (const auto sample : effected) {
        assert(sample <= 1.0f && sample >= -1.0f);
        if (std::fabs(sample - 0.25f) > 0.01f) {
            changed = true;
            break;
        }
    }

    assert(changed);

    std::vector<float> transient(128, 2.0f);
    processor.process(transient, 48000, 1);
    for (const auto sample : transient) {
        assert(sample <= 0.96f + 0.001f);
        assert(sample >= -0.96f - 0.001f);
        assert(std::isfinite(sample));
    }

    std::vector<float> silence(4800, 0.0f);
    processor.reset();
    processor.process(silence, 48000, 1);
    for (const auto sample : silence) {
        assert(std::fabs(sample) < 0.001f);
    }

    processor.reset();

    std::cout << "voice effects smoke passed\n";
    return 0;
}
