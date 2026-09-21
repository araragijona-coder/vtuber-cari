#pragma once

#include <atomic>
#include <cstdint>
#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

namespace cari::native {

enum class WasapiMode {
    microphone,
    system_loopback,
};

struct AudioCapturePacket {
    std::int64_t timestamp = 0;
    std::uint32_t sample_rate = 0;
    std::uint16_t channels = 0;
    std::vector<float> samples;
};

using AudioFrameCallback = std::function<void(const AudioCapturePacket&)>;

struct AudioCaptureStats {
    std::uint64_t packets = 0;
    std::uint64_t frames = 0;
    std::uint64_t errors = 0;
    std::uint32_t sample_rate = 0;
    std::uint16_t channels = 0;
};

class WasapiCapture final {
public:
    WasapiCapture();
    ~WasapiCapture();

    WasapiCapture(const WasapiCapture&) = delete;
    WasapiCapture& operator=(const WasapiCapture&) = delete;

    bool start(WasapiMode mode, AudioFrameCallback callback);
    void stop() noexcept;

    [[nodiscard]] bool running() const noexcept { return running_.load(); }
    [[nodiscard]] AudioCaptureStats stats() const noexcept;
    [[nodiscard]] std::wstring last_error() const;

private:
    void run(WasapiMode mode, AudioFrameCallback callback);
    void set_error(std::wstring message);

    std::atomic<bool> running_{false};
    std::atomic<std::uint64_t> packets_{0};
    std::atomic<std::uint64_t> frames_{0};
    std::atomic<std::uint64_t> errors_{0};
    std::atomic<std::uint32_t> sample_rate_{0};
    std::atomic<std::uint16_t> channels_{0};

    mutable std::mutex error_mutex_;
    std::wstring last_error_;
    std::thread worker_;
};

} // namespace cari::native
