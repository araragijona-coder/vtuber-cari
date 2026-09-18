#pragma once

#include "native_media_output_bridge.h"

#include "../core/output_profile.h"
#include "../core/types.h"

#include <cstddef>
#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace cari::native {

struct MediaGraphStats {
    std::uint64_t video_submitted = 0;
    std::uint64_t video_dropped = 0;
    std::uint64_t audio_submitted = 0;
    std::uint64_t audio_dropped = 0;
    std::uint64_t polls = 0;
    std::uint64_t poll_failures = 0;
};

class MediaGraphController final {
public:
    MediaGraphController() = default;
    ~MediaGraphController();

    MediaGraphController(const MediaGraphController&) = delete;
    MediaGraphController& operator=(const MediaGraphController&) = delete;

    bool start(
        const cari::studio::core::OutputProfile& profile,
        std::uint32_t audio_sample_rate = 48000,
        std::uint16_t audio_channels = 2,
        const std::wstring& ffmpeg_executable = L"ffmpeg.exe",
        const std::wstring& working_directory = {});

    bool submit_video(
        const cari::studio::core::Frame& frame,
        const std::shared_ptr<std::vector<std::uint8_t>>& bgra) noexcept;

    bool submit_audio(const cari::studio::core::AudioPacket& packet) noexcept;

    bool poll() noexcept;
    void stop() noexcept;

    [[nodiscard]] bool running() const noexcept { return output_.running(); }
    [[nodiscard]] bool connected() const noexcept { return output_.connected(); }
    [[nodiscard]] const std::string& last_error() const noexcept { return last_error_; }
    [[nodiscard]] const std::string& stderr_text() const noexcept { return output_.stderr_text(); }
    [[nodiscard]] MediaGraphStats stats() const noexcept { return stats_; }
    [[nodiscard]] FfmpegAvOutputMetrics transport_metrics() const noexcept {
        return output_.transport_metrics();
    }

private:
    NativeMediaOutputBridge output_;
    MediaGraphStats stats_{};
    std::string last_error_;
};

} // namespace cari::native
