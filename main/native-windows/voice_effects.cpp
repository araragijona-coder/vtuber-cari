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

float compress(float value, float threshold, float ratio) noexcept {
    const float magnitude = std::fabs(value);
    const float safe_threshold = std::clamp(threshold, 0.05f, 0.98f);
    const float safe_ratio = std::max(1.0f, ratio);
    if (magnitude <= safe_threshold) {
        return value;
    }
    const float excess = magnitude - safe_threshold;
    const float compressed = safe_threshold + excess / safe_ratio;
    return std::copysign(compressed, value);
}

} // namespace

void VoiceEffectProcessor::set_config(VoiceEffectConfig config) noexcept {
    config.drive = std::clamp(config.drive, 0.5f, 3.0f);
    config.presence = std::clamp(config.presence, 0.0f, 0.8f);
    config.output_gain = std::clamp(config.output_gain, 0.1f, 1.0f);
    config.compressor_threshold = std::clamp(config.compressor_threshold, 0.20f, 0.90f);
    config.compressor_ratio = std::clamp(config.compressor_ratio, 1.0f, 12.0f);
    config.limiter_ceiling = std::clamp(config.limiter_ceiling, 0.70f, 0.99f);

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
            const float compressed = compress(
                presence,
                config_.compressor_threshold,
                config_.compressor_ratio);
            const float saturated = soft_clip(compressed, config_.drive);
            samples[index] = std::clamp(
                saturated * config_.output_gain,
                -config_.limiter_ceiling,
                config_.limiter_ceiling);
        }
    }
}

} // namespace cari::native
