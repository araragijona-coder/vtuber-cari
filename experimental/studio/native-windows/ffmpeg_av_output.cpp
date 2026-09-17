#include "ffmpeg_av_output.h"

#include "../core/output_profile.h"

#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <atomic>
#include <string>
#include <vector>

namespace cari::native {

namespace {

std::wstring widen_ascii(const std::string& value) {
    return std::wstring(value.begin(), value.end());
}

std::wstring make_pipe_name(const wchar_t* stream_name) {
    static std::atomic<unsigned long> sequence{0};
    const auto id = sequence.fetch_add(1, std::memory_order_relaxed) + 1;
    return L"\\\\.\\pipe\\cari-studio-" +
           std::to_wstring(GetCurrentProcessId()) +
           L"-" + std::to_wstring(id) +
           L"-" + stream_name;
}

} // namespace

FfmpegAvOutput::~FfmpegAvOutput() {
    stop();
}

bool FfmpegAvOutput::start(
    const cari::studio::core::OutputProfile& profile,
    std::uint32_t audio_sample_rate,
    std::uint16_t audio_channels,
    std::size_t max_video_pending_bytes,
    std::size_t max_audio_pending_bytes,
    const std::wstring& ffmpeg_executable,
    const std::wstring& working_directory) {
    stop();
    stderr_text_.clear();
    last_error_.clear();
    exit_code_ = 0;

    const auto validation = cari::studio::core::validate_output_profile(profile);
    if (!validation.valid) {
        fail(validation.error.c_str());
        return false;
    }
    if (profile.kind != cari::studio::core::OutputKind::rtmp) {
        fail("native FFmpeg A/V output currently requires an RTMP output profile");
        return false;
    }
    if (audio_sample_rate == 0 || audio_channels == 0) {
        fail("audio sample rate and channel count must be non-zero");
        return false;
    }

    if (!start_pipes(max_video_pending_bytes, max_audio_pending_bytes)) {
        state_ = FfmpegAvOutputState::failed;
        return false;
    }

    const cari::studio::core::RawMediaInputs inputs{
        .video_input = widen_ascii(std::string(video_pipe_name().begin(), video_pipe_name().end())),
        .audio_input = widen_ascii(std::string(audio_pipe_name().begin(), audio_pipe_name().end())),
        .audio_sample_rate = audio_sample_rate,
        .audio_channels = audio_channels,
    };

    const auto command = cari::studio::core::build_ffmpeg_rtmp_command(profile, inputs);
    std::vector<std::wstring> arguments;
    arguments.reserve(command.arguments.size());
    for (const auto& argument : command.arguments) {
        arguments.push_back(widen_ascii(argument));
    }

    state_ = FfmpegAvOutputState::starting;
    if (!process_.start_with_stderr_capture(
            ffmpeg_executable, arguments, working_directory)) {
        fail("failed to create FFmpeg A/V process");
        video_pipe_.close();
        audio_pipe_.close();
        state_ = FfmpegAvOutputState::failed;
        return false;
    }

    poll();
    return state_ != FfmpegAvOutputState::failed;
}

bool FfmpegAvOutput::start_pipes(
    std::size_t max_video_pending_bytes,
    std::size_t max_audio_pending_bytes) {
    if (!video_pipe_.create(make_pipe_name(L"video"), max_video_pending_bytes)) {
        fail(video_pipe_.last_error().empty()
                 ? "failed to create video raw pipe"
                 : video_pipe_.last_error().c_str());
        return false;
    }
    if (!audio_pipe_.create(make_pipe_name(L"audio"), max_audio_pending_bytes)) {
        fail(audio_pipe_.last_error().empty()
                 ? "failed to create audio raw pipe"
                 : audio_pipe_.last_error().c_str());
        video_pipe_.close();
        return false;
    }
    return true;
}

bool FfmpegAvOutput::poll() noexcept {
    if (state_ != FfmpegAvOutputState::starting &&
        state_ != FfmpegAvOutputState::running) {
        return true;
    }

    if (!video_pipe_.connected()) {
        video_pipe_.wait_for_client(0);
    }
    if (!audio_pipe_.connected()) {
        audio_pipe_.wait_for_client(0);
    }

    if (!video_pipe_.poll() || !audio_pipe_.poll()) {
        fail("raw A/V pipe polling failed");
        state_ = FfmpegAvOutputState::failed;
        return false;
    }

    std::string chunk;
    if (!process_.drain_stderr(chunk)) {
        fail("failed to drain FFmpeg A/V stderr");
        state_ = FfmpegAvOutputState::failed;
        return false;
    }
    stderr_text_.append(chunk);

    const auto result = process_.wait(0);
    if (result.exited) {
        exit_code_ = result.exit_code;
        std::string final_chunk;
        if (process_.drain_stderr(final_chunk)) {
            stderr_text_.append(final_chunk);
        }
        state_ = (exit_code_ == 0)
            ? FfmpegAvOutputState::exited
            : FfmpegAvOutputState::failed;
        if (state_ == FfmpegAvOutputState::failed && last_error_.empty()) {
            last_error_ = "FFmpeg A/V process exited with a non-zero code";
        }
        return true;
    }

    if (connected()) {
        state_ = FfmpegAvOutputState::running;
    }
    return true;
}

bool FfmpegAvOutput::write_video(const std::uint8_t* data, std::size_t size) noexcept {
    if (!running() || !video_pipe_.connected()) {
        return false;
    }
    return video_pipe_.write(data, size);
}

bool FfmpegAvOutput::write_audio(const std::uint8_t* data, std::size_t size) noexcept {
    if (!running() || !audio_pipe_.connected()) {
        return false;
    }
    return audio_pipe_.write(data, size);
}

void FfmpegAvOutput::stop() noexcept {
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

    video_pipe_.close();
    audio_pipe_.close();

    if (state_ == FfmpegAvOutputState::running ||
        state_ == FfmpegAvOutputState::starting) {
        state_ = FfmpegAvOutputState::stopped;
    }
}

void FfmpegAvOutput::fail(const char* message) noexcept {
    last_error_ = message ? message : "native FFmpeg A/V output error";
}

} // namespace cari::native
