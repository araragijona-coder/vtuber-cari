#pragma once

#include <cstdint>
#include <vector>

namespace cari::native {

enum class VoiceEffectStyle {
    off,
    anime_bright,
};

struct VoiceEffectConfig {
    VoiceEffectStyle style = VoiceEffectStyle::off;
    float drive = 1.25f;
    float presence = 0.22f;
    float output_gain = 0.96f;
};

class VoiceEffectProcessor final {
public:
    VoiceEffectProcessor() = default;

    void set_config(VoiceEffectConfig config) noexcept;
    [[nodiscard]] VoiceEffectConfig config() const noexcept { return config_; }

    void reset() noexcept;
    void process(std::vector<float>& samples,
                 std::uint32_t sample_rate,
                 std::uint16_t channels) noexcept;

private:
    VoiceEffectConfig config_{};
    float previous_input_[2] = {0.0f, 0.0f};
    float previous_output_[2] = {0.0f, 0.0f};
};

} // namespace cari::native
