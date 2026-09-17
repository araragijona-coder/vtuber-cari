#pragma once

#include "process_runner.h"
#include "raw_pipe.h"

#include "../core/output_profile.h"

#include <cstddef>
#include <cstdint>
#include <string>

namespace cari::native {

enum class FfmpegAvOutputState {
    stopped,
    starting,
    running,
    exited,
    failed,
};

struct FfmpegAvOutputMetrics {
    RawPipeMetrics video;
    RawPipeMetrics audio;
};

// Native A/V output boundary. Video and audio are transported independently
// as raw byte streams into one local FFmpeg process. The transport itself does
// not invent timestamps: rawvideo uses the configured frame rate and raw PCM
// uses the configured sample rate, so upstream timestamp scheduling remains a
// separate pipeline responsibility.
class FfmpegAvOutput final {
public:
    FfmpegAvOutput() = default;
    ~FfmpegAvOutput();

    FfmpegAvOutput(const FfmpegAvOutput&) = delete;
    FfmpegAvOutput& operator=(const FfmpegAvOutput&) = delete;

    bool start(
        const cari::studio::core::OutputProfile& profile,
        std::uint32_t audio_sample_rate,
        std::uint16_t audio_channels,
        std::size_t max_video_pending_bytes = 16u * 1024u * 1024u,
        std::size_t max_audio_pending_bytes = 4u * 1024u * 1024u,
        const std::wstring& ffmpeg_executable = L"ffmpeg.exe",
        const std::wstring& working_directory = {});

    bool poll() noexcept;
    bool write_video(const std::uint8_t* data, std::size_t size) noexcept;
    bool write_audio(const std::uint8_t* data, std::size_t size) noexcept;
    void stop() noexcept;

    [[nodiscard]] FfmpegAvOutputState state() const noexcept { return state_; }
    [[nodiscard]] bool running() const noexcept {
        return state_ == FfmpegAvOutputState::starting ||
               state_ == FfmpegAvOutputState::running;
    }
    [[nodiscard]] bool connected() const noexcept {
        return video_pipe_.connected() && audio_pipe_.connected();
    }
    [[nodiscard]] unsigned long exit_code() const noexcept { return exit_code_; }
    [[nodiscard]] const std::string& stderr_text() const noexcept { return stderr_text_; }
    [[nodiscard]] const std::string& last_error() const noexcept { return last_error_; }
    [[nodiscard]] FfmpegAvOutputMetrics metrics() const noexcept {
        return {video_pipe_.metrics(), audio_pipe_.metrics()};
    }
    [[nodiscard]] const std::wstring& video_pipe_name() const noexcept {
        return video_pipe_.name();
    }
    [[nodiscard]] const std::wstring& audio_pipe_name() const noexcept {
        return audio_pipe_.name();
    }

private:
    bool start_pipes(
        std::size_t max_video_pending_bytes,
        std::size_t max_audio_pending_bytes);
    void fail(const char* message) noexcept;

    ProcessRunner process_;
    RawPipe video_pipe_;
    RawPipe audio_pipe_;
    FfmpegAvOutputState state_ = FfmpegAvOutputState::stopped;
    unsigned long exit_code_ = 0;
    std::string stderr_text_;
    std::string last_error_;
};

} // namespace cari::native
