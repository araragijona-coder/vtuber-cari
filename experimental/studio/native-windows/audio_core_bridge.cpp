#include "audio_core_bridge.h"

#include <algorithm>
#include <string_view>
#include <utility>

namespace cari::native {
namespace {

std::wstring widen_ascii(const char* text) {
    std::wstring result;
    if (!text) return result;
    while (*text) {
        result.push_back(static_cast<wchar_t>(*text++));
    }
    return result;
}

} // namespace

AudioCoreBridge::AudioCoreBridge() {
    mixer_.add_track("microphone");
    mixer_.add_track("system");
}

AudioCoreBridge::~AudioCoreBridge() {
    stop();
}

bool AudioCoreBridge::start() {
    stop();
    callbacks_.store(0);
    packets_.store(0);
    samples_.store(0);
    errors_.store(0);
    peak_.store(0.0f);
    {
        std::lock_guard lock(error_mutex_);
        last_error_.clear();
    }

    const bool microphone_started = microphone_.start(
        WasapiMode::microphone,
        [this](const AudioCapturePacket& packet) { on_packet("microphone", packet); });
    if (!microphone_started) {
        set_error(L"WASAPI microphone capture could not start: " + microphone_.last_error());
        return false;
    }

    const bool system_started = system_loopback_.start(
        WasapiMode::system_loopback,
        [this](const AudioCapturePacket& packet) { on_packet("system", packet); });
    if (!system_started) {
        microphone_.stop();
        set_error(L"WASAPI system loopback capture could not start: " + system_loopback_.last_error());
        return false;
    }

    return true;
}

void AudioCoreBridge::stop() noexcept {
    microphone_.stop();
    system_loopback_.stop();
}

void AudioCoreBridge::on_packet(const char* track_id, const AudioCapturePacket& packet) {
    callbacks_.fetch_add(1, std::memory_order_relaxed);

    if (packet.sample_rate == 0 || packet.channels == 0 || packet.samples.empty()) {
        errors_.fetch_add(1, std::memory_order_relaxed);
        return;
    }

    const auto sample_count = packet.samples.size();
    const float packet_peak = mixer_.peak(packet.samples);
    float observed = peak_.load(std::memory_order_relaxed);
    while (packet_peak > observed &&
           !peak_.compare_exchange_weak(
               observed, packet_peak, std::memory_order_relaxed, std::memory_order_relaxed)) {
    }

    try {
        std::lock_guard lock(mixer_mutex_);
        if (!mixer_.set_samples(track_id, packet.samples)) {
            set_error(L"AudioMixer track is missing: " + widen_ascii(track_id));
            return;
        }
    } catch (...) {
        set_error(L"WASAPI to AudioPacket/AudioMixer bridge failed");
        return;
    }

    packets_.fetch_add(1, std::memory_order_relaxed);
    samples_.fetch_add(sample_count, std::memory_order_relaxed);
}

void AudioCoreBridge::set_error(std::wstring error) {
    {
        std::lock_guard lock(error_mutex_);
        last_error_ = std::move(error);
    }
    errors_.fetch_add(1, std::memory_order_relaxed);
}

AudioCoreBridgeStats AudioCoreBridge::stats() const noexcept {
    return {
        callbacks_.load(std::memory_order_relaxed),
        packets_.load(std::memory_order_relaxed),
        samples_.load(std::memory_order_relaxed),
        errors_.load(std::memory_order_relaxed),
        peak_.load(std::memory_order_relaxed),
    };
}

float AudioCoreBridge::mix_peak() const {
    std::lock_guard lock(mixer_mutex_);
    return mixer_.peak(mixer_.mix(4096));
}

std::vector<float> AudioCoreBridge::mixed_samples(std::size_t sample_count) const {
    std::lock_guard lock(mixer_mutex_);
    return mixer_.mix(sample_count);
}

std::wstring AudioCoreBridge::last_error() const {
    std::lock_guard lock(error_mutex_);
    return last_error_;
}

} // namespace cari::native
