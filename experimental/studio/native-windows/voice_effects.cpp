#include "voice_effects.h"

#include <algorithm>
#include <cmath>

namespace cari::native {
namespace {

constexpr float kPi = 3.14159265358979323846f;

float soft_clip(float value, float drive) noexcept {
    const float scaled = value * std::max(0.1f, drive);
    return std::tanh(scaled);
}

} // namespace

void VoiceEffectProcessor::set_config(VoiceEffectConfig config) noexcept {
    config.drive = std::clamp(config.drive, 0.5f, 3.0f);
    config.presence = std::clamp(config.presence, 0.0f, 0.8f);
    config.output_gain = std::clamp(config.output_gain, 0.1f, 1.0f);

    if (config.style != VoiceEffectStyle::anime_bright) {
        config.style = VoiceEffectStyle::off;
    }

    if (config.style != config_.style) {
        reset();
    }
    config_ = config;
}

void VoiceEffectProcessor::reset() noexcept {
    previous_input_[0] = previous_input_[1] = 0.0f;
    previous_output_[0] = previous_output_[1] = 0.0f;
}

void VoiceEffectProcessor::process(
    std::vector<float>& samples,
    std::uint32_t sample_rate,
    std::uint16_t channels) noexcept {
    if (config_.style == VoiceEffectStyle::off ||
        sample_rate == 0 || channels == 0 || samples.empty()) {
        return;
    }

    const std::size_t frame_count = samples.size() / channels;
    if (frame_count == 0) return;

    // Gentle one-pole high-pass. The presence stage accentuates upper
    // harmonics without changing duration or sample count, keeping the effect
    // safe for the existing timeline mixer.
    const float cutoff = 110.0f;
    const float dt = 1.0f / static_cast<float>(sample_rate);
    const float rc = 1.0f / (2.0f * kPi * cutoff);
    const float alpha = rc / (rc + dt);

    for (std::size_t frame = 0; frame < frame_count; ++frame) {
        for (std::uint16_t channel = 0; channel < channels; ++channel) {
            const auto state_channel = std::min<std::uint16_t>(channel, 1);
            const std::size_t index = frame * channels + channel;
            const float input = std::clamp(samples[index], -1.0f, 1.0f);

            const float high_pass =
                alpha * (previous_output_[state_channel] + input -
                         previous_input_[state_channel]);
            previous_input_[state_channel] = input;
            previous_output_[state_channel] = high_pass;

            const float presence = input + high_pass * config_.presence;
            samples[index] =
                std::clamp(soft_clip(presence, config_.drive) * config_.output_gain,
                           -1.0f, 1.0f);
        }
    }
}

} // namespace cari::native
