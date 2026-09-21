#pragma once

#include "ffmpeg_av_output.h"

#include "../core/output_diagnostics.h"
#include "../core/output_retry.h"
#include "../core/output_profile.h"
#include "../core/types.h"

#include <cstddef>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace cari::native {

struct MultiStreamDestinationStatus {
    std::string id;
    std::string target;
    std::string state;
    std::string failure_category;
    std::uint64_t retries = 0;
    std::uint64_t video_frames = 0;
    std::uint64_t audio_packets = 0;
    std::uint64_t video_drops = 0;
    std::uint64_t audio_drops = 0;
};

struct MultiStreamOutputStats {
    std::uint64_t video_frames_submitted = 0;
    std::uint64_t audio_packets_submitted = 0;
    std::uint64_t destinations_started = 0;
    std::uint64_t destinations_running = 0;
    std::uint64_t destinations_failed = 0;
    std::uint64_t retry_attempts = 0;
    std::uint64_t submit_failures = 0;
    std::size_t destination_limit = 4;
};

class MultiStreamOutput final {
public:
    static constexpr std::size_t kMaxDestinations = 4;

    MultiStreamOutput() = default;
    ~MultiStreamOutput();

    MultiStreamOutput(const MultiStreamOutput&) = delete;
    MultiStreamOutput& operator=(const MultiStreamOutput&) = delete;

    bool start(
        const cari::studio::core::OutputProfile& base_profile,
        const std::vector<std::string>& targets,
        const std::wstring& ffmpeg_executable = L"ffmpeg.exe");

    bool submit_video(
        const cari::studio::core::Frame& frame,
        const std::shared_ptr<std::vector<std::uint8_t>>& bgra) noexcept;

    bool submit_audio(
        const cari::studio::core::AudioPacket& packet) noexcept;

    bool poll() noexcept;
    void stop() noexcept;

    [[nodiscard]] bool running() const noexcept;
    [[nodiscard]] std::size_t destination_count() const noexcept;
    [[nodiscard]] MultiStreamOutputStats stats() const noexcept;
    [[nodiscard]] std::vector<MultiStreamDestinationStatus> destinations() const;

private:
    struct Destination;
    bool start_destination(Destination& destination);
    void schedule_retry(Destination& destination) noexcept;

    std::vector<std::unique_ptr<Destination>> destinations_;
    MultiStreamOutputStats stats_{};
};

} // namespace cari::native
