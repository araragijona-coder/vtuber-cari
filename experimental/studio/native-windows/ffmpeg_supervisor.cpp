#include "ffmpeg_supervisor.h"

#include <utility>

namespace cari::native {

namespace {

std::wstring widen_ascii(const std::string& value) {
    return std::wstring(value.begin(), value.end());
}

} // namespace

bool FfmpegSupervisor::start(
    const cari::studio::core::OutputProfile& profile,
    const std::wstring& ffmpeg_executable,
    const std::wstring& working_directory) {
    stop();
    stderr_text_.clear();
    last_error_.clear();
    exit_code_ = 0;

    const auto validation = cari::studio::core::validate_output_profile(profile);
    if (!validation.valid) {
        state_ = FfmpegState::failed;
        last_error_ = validation.error;
        return false;
    }

    const auto command = cari::studio::core::build_ffmpeg_rtmp_command(profile);
    std::vector<std::wstring> arguments;
    arguments.reserve(command.arguments.size());
    for (const auto& argument : command.arguments) {
        arguments.push_back(widen_ascii(argument));
    }

    state_ = FfmpegState::starting;
    if (!process_.start_with_stderr_capture(
            ffmpeg_executable, arguments, working_directory)) {
        state_ = FfmpegState::failed;
        last_error_ = "failed to create ffmpeg process";
        return false;
    }

    state_ = FfmpegState::running;
    return true;
}

bool FfmpegSupervisor::poll() noexcept {
    if (state_ != FfmpegState::running && state_ != FfmpegState::starting) {
        return true;
    }

    std::string chunk;
    if (!process_.drain_stderr(chunk)) {
        last_error_ = "failed to drain ffmpeg stderr";
        state_ = FfmpegState::failed;
        return false;
    }
    stderr_text_.append(chunk);

    const auto result = process_.wait(0);
    if (!result.exited) {
        return true;
    }

    exit_code_ = result.exit_code;
    std::string final_chunk;
    if (process_.drain_stderr(final_chunk)) {
        stderr_text_.append(final_chunk);
    }

    state_ = (exit_code_ == 0) ? FfmpegState::exited : FfmpegState::failed;
    if (state_ == FfmpegState::failed && last_error_.empty()) {
        last_error_ = "ffmpeg exited with a non-zero code";
    }
    return true;
}

void FfmpegSupervisor::stop() noexcept {
    if (process_.running()) {
        process_.terminate();
        const auto result = process_.wait(1000);
        if (result.exited) {
            exit_code_ = result.exit_code;
        }
    }

    std::string final_chunk;
    if (process_.captures_stderr() && process_.drain_stderr(final_chunk)) {
        stderr_text_.append(final_chunk);
    }

    if (state_ == FfmpegState::running || state_ == FfmpegState::starting) {
        state_ = FfmpegState::stopped;
    }
}

} // namespace cari::native
