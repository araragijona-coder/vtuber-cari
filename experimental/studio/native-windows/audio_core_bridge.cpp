#include "audio_core_bridge.h"

#include <utility>
#include <algorithm>
#include <cmath>

namespace cari::native {
namespace {

std::wstring widen_ascii(const char* text) {
    std::wstring result;
    if (!text) return result;
    while (*text) result.push_back(static_cast<wchar_t>(*text++));
    return result;
}

cari::studio::core::AudioPacket to_core_packet(
    const AudioCapturePacket& packet,
    std::uint64_t sequence) {
    cari::studio::core::AudioPacket result;
    result.pts = packet.timestamp;
    result.sample_rate = packet.sample_rate;
    result.channels = packet.channels;
    result.sequence = sequence;
    result.samples = packet.samples;
    return result;
}

} // namespace

AudioCoreBridge::AudioCoreBridge() {

}

AudioCoreBridge::~AudioCoreBridge() {
    stop();
}

bool AudioCoreBridge::start() {
    stop();
    running_.store(false, std::memory_order_relaxed);
    callbacks_.store(0);
    packets_.store(0);
    samples_.store(0);
    errors_.store(0);
    peak_.store(0.0f);
    timeline_mixer_.clear();
    {
        std::lock_guard lock(error_mutex_);
        last_error_.clear();
    }

    bool any_started = false;

    const bool microphone_started = microphone_.start(
        WasapiMode::microphone,
        [this](const AudioCapturePacket& packet) { on_packet("microphone", packet); });
    if (!microphone_started) {
        set_error(L"WASAPI microphone capture could not start: " + microphone_.last_error());
    } else {
        any_started = true;
    }

    const bool system_started = system_loopback_.start(
        WasapiMode::system_loopback,
        [this](const AudioCapturePacket& packet) { on_packet("system", packet); });
    if (!system_started) {
        set_error(L"WASAPI system loopback capture could not start: " + system_loopback_.last_error());
    } else {
        any_started = true;
    }

    if (!any_started) {
        microphone_.stop();
        system_loopback_.stop();
        return false;
    }

    running_.store(true, std::memory_order_relaxed);
    return true;
}

void AudioCoreBridge::stop() noexcept {
    running_.store(false, std::memory_order_relaxed);
    microphone_.stop();
    system_loopback_.stop();
}

void AudioCoreBridge::on_packet(const char* track_id, const AudioCapturePacket& packet) {
    const auto callback_sequence = callbacks_.fetch_add(1, std::memory_order_relaxed) + 1;

    if (packet.sample_rate == 0 || packet.channels == 0 || packet.samples.empty()) {
        errors_.fetch_add(1, std::memory_order_relaxed);
        return;
    }

    const auto sequence = callback_sequence;
    const auto core_packet = to_core_packet(packet, sequence);
    float packet_peak = 0.0f;
    for (const auto sample : core_packet.samples) packet_peak = std::max(packet_peak, std::fabs(sample));

    float observed = peak_.load(std::memory_order_relaxed);
    while (packet_peak > observed &&
           !peak_.compare_exchange_weak(
               observed, packet_peak,
               std::memory_order_relaxed,
               std::memory_order_relaxed)) {
    }

    try {
        std::lock_guard lock(mixer_mutex_);
        if (!timeline_mixer_.push(track_id, core_packet)) {
            set_error(L"AudioTimelineMixer rejected packet for track: " + widen_ascii(track_id));
            return;
        }
    } catch (...) {
        set_error(L"WASAPI to AudioTimelineMixer bridge failed");
        return;
    }

    packets_.fetch_add(1, std::memory_order_relaxed);
    samples_.fetch_add(core_packet.samples.size(), std::memory_order_relaxed);
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
    return peak_.load(std::memory_order_relaxed);
}

std::vector<float> AudioCoreBridge::mixed_samples(std::size_t sample_count) const {
    if (sample_count == 0) return {};
    std::lock_guard lock(mixer_mutex_);
    cari::studio::core::AudioPacket packet;
    if (!timeline_mixer_.pop(packet)) return {};
    const auto count = std::min(sample_count, packet.samples.size());
    return std::vector<float>(packet.samples.begin(), packet.samples.begin() + count);
}

bool AudioCoreBridge::pop_mixed_audio(cari::studio::core::AudioPacket& output) {
    std::lock_guard lock(mixer_mutex_);
    return timeline_mixer_.pop(output);
}

std::wstring AudioCoreBridge::last_error() const {
    std::lock_guard lock(error_mutex_);
    return last_error_;
}

} // namespace cari::native
