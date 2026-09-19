#pragma once

#include "wasapi_capture.h"
#include "audio_timeline_mixer.h"
#include "voice_effects.h"
#include "../core/types.h"

#include <atomic>
#include <cstdint>
#include <mutex>
#include <string>
#include <vector>

namespace cari::native {

struct AudioCoreBridgeStats {
    std::uint64_t callbacks = 0;
    std::uint64_t packets = 0;
    std::uint64_t samples = 0;
    std::uint64_t errors = 0;
    float peak = 0.0f;
};

class AudioCoreBridge final {
public:
    AudioCoreBridge();
    ~AudioCoreBridge();

    AudioCoreBridge(const AudioCoreBridge&) = delete;
    AudioCoreBridge& operator=(const AudioCoreBridge&) = delete;

    bool start();
    void stop() noexcept;

    [[nodiscard]] bool running() const noexcept { return running_.load(std::memory_order_relaxed); }
    [[nodiscard]] AudioCoreBridgeStats stats() const noexcept;
    [[nodiscard]] float mix_peak() const;
    [[nodiscard]] std::vector<float> mixed_samples(std::size_t sample_count) const;
    bool pop_mixed_audio(cari::studio::core::AudioPacket& output);
    [[nodiscard]] std::wstring last_error() const;

    void set_voice_effect(VoiceEffectConfig config) noexcept;

private:
    void on_packet(const char* track_id, const AudioCapturePacket& packet);
    void set_error(std::wstring error);

    WasapiCapture microphone_;
    WasapiCapture system_loopback_;
    mutable AudioTimelineMixer timeline_mixer_;

    mutable std::mutex mixer_mutex_;
    mutable std::mutex error_mutex_;
    std::wstring last_error_;

    std::atomic<bool> running_{false};
    std::atomic<std::uint64_t> callbacks_{0};
    std::atomic<std::uint64_t> packets_{0};
    std::atomic<std::uint64_t> samples_{0};
    std::atomic<std::uint64_t> errors_{0};
    std::atomic<float> peak_{0.0f};
};

} // namespace cari::native
