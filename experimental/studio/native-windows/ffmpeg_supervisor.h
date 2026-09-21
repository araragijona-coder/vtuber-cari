#pragma once

#include "../core/output_profile.h"
#include "process_runner.h"

#include <string>

namespace cari::native {

enum class FfmpegState {
    stopped,
    starting,
    running,
    exited,
    failed,
};

class FfmpegSupervisor final {
public:
    FfmpegSupervisor() = default;
    ~FfmpegSupervisor() = default;

    FfmpegSupervisor(const FfmpegSupervisor&) = delete;
    FfmpegSupervisor& operator=(const FfmpegSupervisor&) = delete;

    bool start(const cari::studio::core::OutputProfile& profile,
               const std::wstring& ffmpeg_executable = L"ffmpeg.exe",
               const std::wstring& working_directory = {});

    // Polls process lifetime and drains any currently available stderr.
    // Returns false only when the supervisor itself cannot be polled safely.
    bool poll() noexcept;

    void stop() noexcept;

    [[nodiscard]] FfmpegState state() const noexcept { return state_; }
    [[nodiscard]] bool running() const noexcept {
        return state_ == FfmpegState::starting || state_ == FfmpegState::running;
    }
    [[nodiscard]] unsigned long exit_code() const noexcept { return exit_code_; }
    [[nodiscard]] const std::string& stderr_text() const noexcept { return stderr_text_; }
    [[nodiscard]] const std::string& last_error() const noexcept { return last_error_; }

private:
    ProcessRunner process_;
    FfmpegState state_ = FfmpegState::stopped;
    unsigned long exit_code_ = 0;
    std::string stderr_text_;
    std::string last_error_;
};

} // namespace cari::native
