#include <windows.h>
#include <winrt/Windows.Graphics.Capture.h>
#include <winrt/base.h>

#include "audio_core_bridge.h"
#include "audio_probe.h"
#include "camera_sources.h"
#include "media_foundation_camera.h"
#include "capture_engine.h"
#include "compositor_bridge.h"
#include "d3d11_compositor.h"
#include "avatar_gpu_overlay.h"
#include "window_sources.h"
#include "media_graph_controller.h"
#include "control_protocol.h"
#include "../core/output_profile.h"
#include "../core/output_retry.h"
#include "../core/output_diagnostics.h"

#include <algorithm>
#include <atomic>
#include <cstdint>
#include <string>
#include <vector>
#include <thread>
#include <iostream>
#include <memory>
#include <mutex>

namespace {

using Microsoft::WRL::ComPtr;


constexpr wchar_t kClassName[] = L"CariStudioNative";
constexpr wchar_t kWindowTitle[] = L"Cari Studio — Windows x64";
constexpr UINT_PTR kStatusTimerId = 1;
constexpr UINT_PTR kMediaTimerId = 2;
constexpr UINT kControlCommandMessage = WM_APP + 42;
constexpr std::uint64_t kBridgeSampleEvery = 30;
constexpr cari::studio::core::Timestamp kOutputStableTicks = 300'000'000; // 30 s.

cari::native::CaptureEngine g_capture;
cari::native::AudioCoreBridge g_audio_bridge;
std::wstring g_audio_status;
std::wstring g_capture_support_status;
std::wstring g_source_status;
std::vector<cari::native::WindowSourceInfo> g_windows;
HWND g_selected_window = nullptr;
std::size_t g_selected_window_index = 0;
std::size_t g_selected_camera_index = 0;
std::string g_capture_source = "window";
std::atomic<std::uint64_t> g_bridge_attempts{0};
std::atomic<std::uint64_t> g_bridge_successes{0};
std::atomic<std::uint64_t> g_bridge_failures{0};
std::atomic<std::uint64_t> g_bridge_bytes{0};
std::atomic<std::uint64_t> g_last_bridge_sequence{0};
std::atomic<std::uint64_t> g_compositor_successes{0};
std::atomic<std::uint64_t> g_compositor_failures{0};
std::atomic<std::uint64_t> g_compositor_bytes{0};
std::atomic<std::uint64_t> g_last_composited_sequence{0};
cari::native::MediaGraphController g_media_graph;
std::atomic<bool> g_media_enabled{false};
MediaFoundationCamera g_camera;
cari::native::D3D11Compositor g_gpu_compositor;
std::mutex g_gpu_compositor_mutex;
std::shared_ptr<std::vector<std::uint8_t>> g_gpu_avatar_placeholder;
std::string g_gpu_compositor_error;
cari::studio::core::OutputRetryPolicy g_output_retry{};
std::string g_last_output_profile;
std::string g_last_output_target;
std::string g_last_output_category = "none";
cari::studio::core::Timestamp g_output_started_at = 0;

std::wstring BuildAudioStatus() {
    const auto endpoints = cari::native::enumerate_audio_endpoints();
    std::size_t inputs = 0;
    std::size_t outputs = 0;

    for (const auto& endpoint : endpoints) {
        if (endpoint.flow == eCapture) {
            ++inputs;
        } else if (endpoint.flow == eRender) {
            ++outputs;
        }
    }

    const auto stats = g_audio_bridge.stats();
    std::wstring result =
        L"Audio endpoints: " + std::to_wstring(inputs) + L" input(s), " +
        std::to_wstring(outputs) + L" output(s)\n" +
        L"Audio core bridge: " + std::to_wstring(stats.packets) +
        L" packet(s), " + std::to_wstring(stats.samples) +
        L" sample(s), peak " + std::to_wstring(stats.peak) +
        L", mixer peak " + std::to_wstring(g_audio_bridge.mix_peak());

    if (!g_audio_bridge.last_error().empty()) {
        result += L"\nAudio bridge error: " + g_audio_bridge.last_error();
    }
    return result;
}

bool CaptureIsRunning() {
    return g_capture.is_running() || g_camera.running();
}

void StopCaptureSource() noexcept {
    g_camera.stop();
    g_capture.stop();
}

struct ActiveCaptureFormat {
    bool running = false;
    std::uint32_t width = 0;
    std::uint32_t height = 0;
    std::uint32_t fps = 30;
};

ActiveCaptureFormat GetActiveCaptureFormat() {
    if (g_camera.running() || g_capture_source == "camera") {
        const auto camera = g_camera.stats();
        const std::uint32_t fps = camera.fps_num > 0
            ? std::max<std::uint32_t>(
                1,
                static_cast<std::uint32_t>(
                    (static_cast<std::uint64_t>(camera.fps_num) +
                     camera.fps_den / 2u) /
                    std::max<std::uint32_t>(1, camera.fps_den)))
            : 30u;
        return {
            g_camera.running(),
            camera.width,
            camera.height,
            fps
        };
    }

    const auto capture = g_capture.stats();
    return {
        g_capture.is_running(),
        static_cast<std::uint32_t>(capture.width),
        static_cast<std::uint32_t>(capture.height),
        30u
    };
}

std::wstring BuildSourceStatus() {
    g_windows = cari::native::enumerate_capturable_windows();
    const auto cameras = cari::native::enumerate_cameras();

    std::wstring result =
        L"Sources: " + std::to_wstring(g_windows.size()) + L" window(s), " +
        std::to_wstring(cameras.size()) + L" camera(s)\n";

    const std::size_t visible_count = std::min<std::size_t>(g_windows.size(), 9);
    for (std::size_t index = 0; index < visible_count; ++index) {
        const bool selected = index == g_selected_window_index;
        result += std::to_wstring(index + 1) + L") ";
        result += selected ? L"[selected] " : L"";
        result += g_windows[index].title;
        result += L"\n";
    }

    if (g_windows.size() > visible_count) {
        result += L"... " + std::to_wstring(g_windows.size() - visible_count) +
                  L" more window(s)\n";
    }

    return result;
}

std::wstring BuildCaptureStatus() {
    if (!CaptureIsRunning()) {
        if (!g_camera.last_error().empty() && g_capture_source == "camera") {
            return L"Capture: stopped — " + g_camera.last_error();
        }
        if (!g_capture.last_error().empty()) {
            return L"Capture: stopped — " + g_capture.last_error();
        }
        return L"Capture: stopped";
    }

    std::uint32_t width = 0;
    std::uint32_t height = 0;
    double fps = 0.0;
    std::uint64_t frames = 0;
    std::uint64_t errors = 0;
    if (g_capture_source == "camera") {
        const auto camera = g_camera.stats();
        width = camera.width;
        height = camera.height;
        fps = camera.fps_num > 0 && camera.fps_den > 0
            ? static_cast<double>(camera.fps_num) / camera.fps_den
            : 0.0;
        frames = camera.frames;
        errors = camera.errors;
    } else {
        const auto capture = g_capture.stats();
        width = static_cast<std::uint32_t>(capture.width);
        height = static_cast<std::uint32_t>(capture.height);
        fps = capture.fps;
        frames = capture.frames;
        errors = capture.errors;
    }

    const std::wstring selected_title =
        g_capture_source == "screen"
            ? std::wstring(L"primary display")
            : (g_capture_source == "camera"
                ? std::wstring(L"camera #") + std::to_wstring(g_selected_camera_index + 1)
                : ((g_selected_window_index < g_windows.size())
                    ? g_windows[g_selected_window_index].title
                    : std::wstring(L"unknown source")));

    return L"Capture: running — " + selected_title + L" — " +
           std::to_wstring(width) + L"x" + std::to_wstring(height) +
           L", " + std::to_wstring(frames) + L" frame(s), " +
           std::to_wstring(fps) + L" FPS, " +
           std::to_wstring(errors) + L" error(s)\n" +
           L"Source: " + std::wstring(g_capture_source.begin(), g_capture_source.end());
}

void RefreshStatus(HWND hwnd);

bool StartOutput(
    HWND hwnd,
    const std::string& output_profile,
    const std::string& target,
    bool reset_retry_on_success = true);

const char* OutputFailureCategoryName(cari::studio::core::OutputFailureCategory category) {
    switch (category) {
    case cari::studio::core::OutputFailureCategory::network: return "network";
    case cari::studio::core::OutputFailureCategory::encoder: return "encoder";
    case cari::studio::core::OutputFailureCategory::input: return "input";
    case cari::studio::core::OutputFailureCategory::mux: return "mux";
    case cari::studio::core::OutputFailureCategory::permission: return "permission";
    case cari::studio::core::OutputFailureCategory::unknown: return "unknown";
    case cari::studio::core::OutputFailureCategory::none: default: return "none";
    }
}

void ResetOutputRetry() {
    g_output_retry.on_success();
    g_last_output_category = "none";
}

bool ScheduleOutputRetryIfEligible() {
    if (g_last_output_profile != "rtmp") return false;
    const std::string diagnostic =
        g_media_graph.last_error() + "\n" + g_media_graph.stderr_text();
    const auto category = cari::studio::core::classify_output_failure(diagnostic);
    g_last_output_category = OutputFailureCategoryName(category);
    if (category != cari::studio::core::OutputFailureCategory::network) return false;
    return g_output_retry.schedule_failure(cari::studio::core::MediaClock::monotonic_now());
}

const char* MediaOutputStateName(cari::native::FfmpegAvOutputState state) {
    switch (state) {
    case cari::native::FfmpegAvOutputState::starting:
        return "starting";
    case cari::native::FfmpegAvOutputState::running:
        return "running";
    case cari::native::FfmpegAvOutputState::exited:
        return "exited";
    case cari::native::FfmpegAvOutputState::failed:
        return "failed";
    case cari::native::FfmpegAvOutputState::stopped:
    default:
        return "stopped";
    }
}

std::string BuildControlStatusMessage() {
    const auto capture = g_capture.stats();
    const auto audio = g_audio_bridge.stats();
    const auto media = g_media_graph.stats();
    const auto transport = g_media_graph.transport_metrics();

    std::string result = "capture=";
    result += CaptureIsRunning() ? "running" : "stopped";
    result += ";capture_source=" + g_capture_source;
    result += ";camera_index=" + std::to_string(g_selected_camera_index);
    result += ";frames=" + std::to_string(capture.frames);
    result += ";fps=" + std::to_string(capture.fps);
    result += ";capture_errors=" + std::to_string(capture.errors);
    result += ";audio_packets=" + std::to_string(audio.packets);
    result += ";audio_samples=" + std::to_string(audio.samples);
    result += ";audio_peak=" + std::to_string(audio.peak);
    result += ";audio_level=" + std::to_string(g_audio_bridge.current_mix_level());
    result += ";voice_effect=";
    const auto voice_style = g_audio_bridge.voice_effect().style;
    result += voice_style == cari::native::VoiceEffectStyle::anime_bright
        ? "anime-bright"
        : "off";
    const output_running =
        g_media_enabled.load(std::memory_order_relaxed) && g_media_graph.running();
    result += ";output=" + std::string(output_running ? "running" : "stopped");
    result += ";output_state=" + MediaOutputStateName(g_media_graph.output_state());
    result += ";output_exit_code=" + std::to_string(g_media_graph.output_exit_code());
    result += ";output_retry_pending=" + std::string(g_output_retry.pending() ? "true" : "false");
    result += ";output_retry_attempts=" + std::to_string(g_output_retry.attempts());
    result += ";output_failure_category=" + g_last_output_category;
    result += ";video_queued=" + std::to_string(media.video_queued);
    result += ";video_submitted=" + std::to_string(media.video_submitted);
    result += ";video_dropped=" + std::to_string(media.video_dropped);
    result += ";video_dropped_late=" + std::to_string(media.video_dropped_late);
    result += ";video_dropped_overflow=" + std::to_string(media.video_dropped_overflow);
    result += ";video_dropped_cadence=" + std::to_string(media.video_dropped_cadence);
    result += ";video_dropped_format=" + std::to_string(media.video_dropped_format);
    result += ";audio_queued=" + std::to_string(media.audio_queued);
    result += ";audio_submitted=" + std::to_string(media.audio_submitted);
    result += ";audio_dropped=" + std::to_string(media.audio_dropped);
    result += ";audio_dropped_overflow=" + std::to_string(media.audio_dropped_overflow);
    result += ";audio_dropped_format=" + std::to_string(media.audio_dropped_format);
    result += ";audio_late=" + std::to_string(media.audio_late);
    result += ";pacing_budget_exhausted=" + std::to_string(media.pacing_budget_exhausted);
    result += ";video_bytes=" + std::to_string(transport.video.bytes_written);
    result += ";audio_bytes=" + std::to_string(transport.audio.bytes_written);
    result += ";video_pipe_drops=" + std::to_string(transport.video.writes_dropped);
    result += ";audio_pipe_drops=" + std::to_string(transport.audio.writes_dropped);
    return result;
}

void PollMediaGraph(HWND hwnd) {
    if (!g_media_enabled.load(std::memory_order_relaxed) &&
        g_output_retry.pending() &&
        g_output_retry.ready(cari::studio::core::MediaClock::monotonic_now())) {
        g_output_retry.consume_attempt();
        if (!StartOutput(hwnd, g_last_output_profile, g_last_output_target, false)) {
            const std::string diagnostic =
                g_media_graph.last_error() + "\n" + g_media_graph.stderr_text();
            const auto category =
                cari::studio::core::classify_output_failure(diagnostic);
            g_last_output_category = OutputFailureCategoryName(category);
            if (category == cari::studio::core::OutputFailureCategory::network) {
                ScheduleOutputRetryIfEligible();
            }
        }
        return;
    }

    if (!g_media_enabled.load(std::memory_order_relaxed)) {
        return;
    }

    if (g_media_graph.connected()) {
        cari::studio::core::AudioPacket packet;
        while (g_audio_bridge.pop_mixed_audio(packet)) {
            if (!g_media_graph.submit_audio(packet)) {
                break;
            }
        }
    }

    if (!g_media_graph.poll()) {
        const bool retry = ScheduleOutputRetryIfEligible();
        g_media_enabled.store(false, std::memory_order_relaxed);
        g_media_graph.stop();
        if (retry) {
            RefreshStatus(hwnd);
        }
        return;
    }

    if (!g_media_graph.running()) {
        const bool retry = ScheduleOutputRetryIfEligible();
        g_media_enabled.store(false, std::memory_order_relaxed);
        g_media_graph.stop();
        if (retry) {
            RefreshStatus(hwnd);
        }
        return;
    }

    if (g_output_retry.attempts() > 0 &&
        g_output_started_at > 0 &&
        cari::studio::core::MediaClock::monotonic_now() - g_output_started_at >=
            kOutputStableTicks) {
        ResetOutputRetry();
    }
}

bool StartCaptureSource(
    HWND hwnd,
    const std::string& source,
    std::int32_t requested_window_index = -1,
    std::int32_t requested_camera_index = -1) {
    if (source == "screen") {
        const HMONITOR monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTOPRIMARY);
        const bool started = g_capture.start_display(monitor);
        if (started) {
            g_capture_source = "screen";
        }
        return started;
    }

    if (source == "camera") {
        const auto cameras = MediaFoundationCamera::enumerate();
        if (requested_camera_index >= 0) {
            const auto index = static_cast<std::size_t>(requested_camera_index);
            if (index >= cameras.size()) {
                return false;
            }
            g_selected_camera_index = index;
        } else if (g_selected_camera_index >= cameras.size()) {
            g_selected_camera_index = 0;
        }

        const bool started = g_camera.start(
            g_selected_camera_index,
            [](const cari::studio::core::Frame& frame,
               const std::shared_ptr<std::vector<std::uint8_t>>& pixels) {
                if (g_media_enabled.load(std::memory_order_relaxed) &&
                    g_media_graph.connected() && pixels) {
                    g_media_graph.submit_video(frame, pixels);
                }
            },
            1280,
            720,
            30);
        if (started) {
            g_capture_source = "camera";
        }
        return started;
    }

    if (source != "window") {
        return false;
    }

    if (requested_window_index >= 0) {
        g_windows = cari::native::enumerate_capturable_windows();
        if (static_cast<std::size_t>(requested_window_index) >= g_windows.size()) {
            return false;
        }
        g_selected_window_index = static_cast<std::size_t>(requested_window_index);
        g_selected_window = g_windows[g_selected_window_index].hwnd;
    }

    if (g_selected_window && IsWindow(g_selected_window)) {
        const bool started = g_capture.start_window(g_selected_window);
        if (started) {
            g_capture_source = "window";
        }
        return started;
    }
    const bool started = g_capture.start_window(hwnd);
    if (started) {
        g_capture_source = "window";
    }
    return started;
}

std::wstring configured_ffmpeg_executable() {
    wchar_t buffer[4096]{};
    constexpr DWORD capacity = static_cast<DWORD>(sizeof(buffer) / sizeof(buffer[0]));
    const DWORD length = GetEnvironmentVariableW(
        L"CARI_FFMPEG_EXECUTABLE",
        buffer,
        capacity);
    if (length == 0 || length >= capacity) {
        return L"ffmpeg.exe";
    }
    return std::wstring(buffer, buffer + length);
}

bool StartOutput(
    HWND hwnd,
    const std::string& output_profile,
    const std::string& target,
    bool reset_retry_on_success) {
    bool started_capture = false;
    bool started_audio = false;

    if (!CaptureIsRunning()) {
        if (!StartCaptureSource(hwnd, g_capture_source, -1, -1)) {
            return false;
        }
        started_capture = true;
    }

    if (!g_audio_bridge.running()) {
        if (!g_audio_bridge.start()) {
            if (started_capture) StopCaptureSource();
            return false;
        }
        started_audio = true;
    }

    const bool streaming = output_profile == "rtmp";
    if (output_profile != "local-record" && !streaming) {
        if (started_audio) g_audio_bridge.stop();
        if (started_capture) StopCaptureSource();
        return false;
    }

    const std::string resolved_target =
        target.empty()
            ? (streaming
                ? std::string()
                : std::string("cari-capture.mkv"))
            : target;

    const auto capture_format = GetActiveCaptureFormat();
    if (capture_format.width == 0 || capture_format.height == 0) {
        if (g_capture_source == "camera") {
            for (int attempt = 0; attempt < 100 && g_camera.running(); ++attempt) {
                if (g_camera.stats().width != 0 && g_camera.stats().height != 0) {
                    break;
                }
                Sleep(10);
            }
        }
    }
    const auto active_format = GetActiveCaptureFormat();
    if (active_format.width == 0 || active_format.height == 0) {
        if (started_audio) g_audio_bridge.stop();
        if (started_capture) StopCaptureSource();
        return false;
    }

    cari::studio::core::OutputProfile profile{
        .id = output_profile,
        .kind = streaming
            ? cari::studio::core::OutputKind::rtmp
            : cari::studio::core::OutputKind::file,
        .target = resolved_target,
        .width = active_format.width,
        .height = active_format.height,
        .fps = active_format.fps,
        .bitrate_kbps = 4500,
        .audio_bitrate_kbps = 160,
        .video_codec = "libx264",
        .audio_codec = "aac",
    };

    if (streaming &&
        profile.target.rfind("rtmp://", 0) != 0 &&
        profile.target.rfind("rtmps://", 0) != 0) {
        if (started_audio) g_audio_bridge.stop();
        if (started_capture) g_capture.stop();
        return false;
    }

    if (!g_media_graph.start(
            profile,
            48000,
            2,
            configured_ffmpeg_executable())) {
        if (started_audio) g_audio_bridge.stop();
        if (started_capture) g_capture.stop();
        return false;
    }

    g_last_output_profile = output_profile;
    g_last_output_target = resolved_target;
    g_output_started_at = cari::studio::core::MediaClock::monotonic_now();
    if (reset_retry_on_success) {
        ResetOutputRetry();
    }
    g_media_enabled.store(true, std::memory_order_relaxed);
    return true;
}
std::string HandleControlCommand(const cari::native::ControlCommand& command, HWND hwnd) {
    switch (command.type) {
    case cari::native::ControlCommandType::status:
        return cari::native::control_response(
            true, BuildControlStatusMessage(), command.request_id);
    case cari::native::ControlCommandType::capture_start:
        if (g_media_enabled.load(std::memory_order_relaxed)) {
            return cari::native::control_response(
                false, "capture=busy-output-active", command.request_id);
        }
        if (CaptureIsRunning()) {
            if (g_capture_source == command.source) {
                return cari::native::control_response(
                    true, "capture=running", command.request_id);
            }
            StopCaptureSource();
        }
        if (command.source != "screen" && command.source != "window" && command.source != "camera") {
            return cari::native::control_response(
                false, "capture=unsupported-source", command.request_id);
        }
        if (!StartCaptureSource(hwnd, command.source, command.window_index, command.camera_index)) {
            RefreshStatus(hwnd);
            return cari::native::control_response(
                false, "capture=start-failed", command.request_id);
        }
        RefreshStatus(hwnd);
        return cari::native::control_response(true, "capture=started", command.request_id);
    case cari::native::ControlCommandType::capture_stop:
        if (g_media_enabled.load(std::memory_order_relaxed)) {
            return cari::native::control_response(
                false, "capture=busy-output-active", command.request_id);
        }
        StopCaptureSource();
        RefreshStatus(hwnd);
        return cari::native::control_response(true, "capture=stopped", command.request_id);
    case cari::native::ControlCommandType::audio_start:
        if (!g_audio_bridge.running()) g_audio_bridge.start();
        RefreshStatus(hwnd);
        return cari::native::control_response(
            g_audio_bridge.running(),
            g_audio_bridge.running() ? "audio=started" : "audio=start-failed",
            command.request_id);
    case cari::native::ControlCommandType::audio_stop:
        if (g_media_enabled.load(std::memory_order_relaxed)) {
            return cari::native::control_response(
                false, "audio=busy-output-active", command.request_id);
        }
        g_audio_bridge.stop();
        RefreshStatus(hwnd);
        return cari::native::control_response(true, "audio=stopped", command.request_id);
    case cari::native::ControlCommandType::voice_set: {
        cari::native::VoiceEffectConfig config{};
        if (command.effect == "anime-bright") {
            config.style = cari::native::VoiceEffectStyle::anime_bright;
            config.drive = 1.4f;
            config.presence = 0.30f;
            config.output_gain = 0.95f;
        } else if (command.effect == "off") {
            config.style = cari::native::VoiceEffectStyle::off;
        } else {
            return cari::native::control_response(
                false, "unsupported voice effect", command.request_id);
        }

        g_audio_bridge.set_voice_effect(config);
        return cari::native::control_response(
            true,
            command.effect == "anime-bright"
                ? "voice=anime-bright"
                : "voice=off",
            command.request_id);
    }
    case cari::native::ControlCommandType::output_start:
        ResetOutputRetry();
        if (command.profile != "local-record" && command.profile != "rtmp")
            return cari::native::control_response(
                false, "unsupported output profile", command.request_id);
        if (g_media_enabled.load(std::memory_order_relaxed))
            return cari::native::control_response(true, "output=running", command.request_id);
        if (!StartOutput(hwnd, command.profile, command.target))
            return cari::native::control_response(false, "output=start-failed", command.request_id);
        RefreshStatus(hwnd);
        return cari::native::control_response(true, "output=started", command.request_id);
    case cari::native::ControlCommandType::output_stop:
        ResetOutputRetry();
        g_media_graph.stop();
        g_media_enabled.store(false, std::memory_order_relaxed);
        RefreshStatus(hwnd);
        return cari::native::control_response(true, "output=stopped", command.request_id);
    default:
        return cari::native::control_response(false, "invalid command", command.request_id);
    }
}

void StartControlReader(HWND hwnd) {
    std::thread([hwnd]() {
        std::string line;
        while (std::getline(std::cin, line)) {
            auto* payload = new std::string(std::move(line));
            if (!PostMessageW(hwnd, kControlCommandMessage, 0,
                              reinterpret_cast<LPARAM>(payload))) {
                delete payload;
                break;
            }
        }
    }).detach();
}

void RefreshStatus(HWND hwnd) {
    g_source_status = BuildSourceStatus();
    g_audio_status = BuildAudioStatus();
    InvalidateRect(hwnd, nullptr, FALSE);
}

void SelectWindow(HWND hwnd, std::size_t index) {
    if (g_media_enabled.load(std::memory_order_relaxed)) {
        RefreshStatus(hwnd);
        return;
    }
    RefreshStatus(hwnd);
    if (index >= g_windows.size()) {
        return;
    }

    const HWND target = g_windows[index].hwnd;
    if (!IsWindow(target)) {
        RefreshStatus(hwnd);
        return;
    }

    g_selected_window_index = index;
    g_selected_window = target;

    if (g_capture.is_running()) {
        StopCaptureSource();
        if (g_capture.start_window(g_selected_window)) {
            g_capture_source = "window";
        }
    }

    RefreshStatus(hwnd);
}

LRESULT CALLBACK WindowProc(HWND hwnd, UINT message, WPARAM wparam, LPARAM lparam) {
    switch (message) {
    case WM_CREATE:
        SetTimer(hwnd, kStatusTimerId, 1000, nullptr);
        SetTimer(hwnd, kMediaTimerId, 10, nullptr);
        return 0;

    case kControlCommandMessage: {
        std::unique_ptr<std::string> line(
            reinterpret_cast<std::string*>(lparam));
        const auto command = cari::native::parse_control_command(*line);
        const auto response = HandleControlCommand(command, hwnd);
        std::cout << response << std::flush;
        return 0;
    }

    case WM_TIMER:
        if (wparam == kStatusTimerId) {
            RefreshStatus(hwnd);
        } else if (wparam == kMediaTimerId) {
            PollMediaGraph(hwnd);
        }
        return 0;

    case WM_KEYDOWN:
        if (wparam >= '1' && wparam <= '9') {
            SelectWindow(hwnd, static_cast<std::size_t>(wparam - '1'));
            return 0;
        }
        if (wparam == 'R') {
            if (g_media_enabled.load(std::memory_order_relaxed)) {
                g_media_graph.stop();
                g_media_enabled.store(false, std::memory_order_relaxed);
            } else {
                StartOutput(hwnd, "local-record", "");
            }
            RefreshStatus(hwnd);
            return 0;
        }
        if (wparam == 'A') {
            if (g_media_enabled.load(std::memory_order_relaxed)) {
                RefreshStatus(hwnd);
                return 0;
            }
            if (g_audio_bridge.running()) {
                g_audio_bridge.stop();
            } else {
                g_audio_bridge.start();
            }
            RefreshStatus(hwnd);
            return 0;
        }
        if (wparam == VK_SPACE) {
            if (g_media_enabled.load(std::memory_order_relaxed)) {
                RefreshStatus(hwnd);
                return 0;
            }
            if (CaptureIsRunning()) {
                StopCaptureSource();
            } else if (!StartCaptureSource(hwnd, g_capture_source, -1, -1)) {
                // The engine keeps the concrete error for the status view.
            }
            RefreshStatus(hwnd);
            return 0;
        }
        return 0;

    case WM_PAINT: {
        PAINTSTRUCT paint{};
        HDC dc = BeginPaint(hwnd, &paint);

        const std::wstring text =
            L"Cari Studio\n\n"
            L"Windows-native runtime — no AI, API or internet required.\n\n" +
            g_capture_support_status + L"\n" + g_audio_status + L"\n" +
            g_source_status + L"\n" + BuildCaptureStatus() + L"\n\n" +
            L"1-9: select a window\n"
            L"SPACE: start/stop capture\n"
            L"A: start/stop microphone + system audio\n"
            L"R: start/stop local A/V recording (experimental)";

        RECT client{};
        GetClientRect(hwnd, &client);
        DrawTextW(dc, text.c_str(), -1, &client,
                  DT_LEFT | DT_TOP | DT_WORDBREAK);
        EndPaint(hwnd, &paint);
        return 0;
    }

    case WM_DESTROY:
        KillTimer(hwnd, kStatusTimerId);
        KillTimer(hwnd, kMediaTimerId);
        g_media_graph.stop();
        g_media_enabled.store(false, std::memory_order_relaxed);
        StopCaptureSource();
        g_audio_bridge.stop();
        PostQuitMessage(0);
        return 0;

    default:
        return DefWindowProcW(hwnd, message, wparam, lparam);
    }
}

} // namespace

int WINAPI wWinMain(HINSTANCE instance, HINSTANCE, PWSTR, int show_command) {
    winrt::init_apartment(winrt::apartment_type::single_threaded);

    g_capture.set_frame_callback([](const cari::native::CapturedFrame& captured) {
        const bool diagnostic_sample = (captured.sequence % kBridgeSampleEvery) == 0;

        cari::studio::core::Frame final_frame{};
        final_frame.pts = captured.timestamp;
        final_frame.width = static_cast<std::uint32_t>(captured.width);
        final_frame.height = static_cast<std::uint32_t>(captured.height);
        final_frame.stride = static_cast<std::uint32_t>(captured.width * 4);
        final_frame.format = static_cast<std::uint32_t>(
            DXGI_FORMAT_B8G8R8A8_UNORM);
        final_frame.sequence = captured.sequence;

        std::shared_ptr<std::vector<std::uint8_t>> final_pixels;
        std::wstring error;
        cari::native::BridgedFrame diagnostic_bridged;

        // CPU readback is now lazy. It is used only for sampled diagnostics or
        // when the GPU composition path cannot provide the final frame required
        // by the current CPU-byte FFmpeg boundary.
        auto ensure_cpu_frame = [&]() -> bool {
            if (final_pixels) {
                return true;
            }

            ++g_bridge_attempts;
            if (!cari::native::FrameBridge::copy_to_cpu(
                    captured, diagnostic_bridged, error)) {
                g_bridge_failures.fetch_add(1, std::memory_order_relaxed);
                return false;
            }

            final_pixels = diagnostic_bridged.pixels;
            final_frame = diagnostic_bridged.frame;

            g_bridge_successes.fetch_add(1, std::memory_order_relaxed);
            g_bridge_bytes.fetch_add(
                final_pixels
                    ? static_cast<std::uint64_t>(final_pixels->size())
                    : 0,
                std::memory_order_relaxed);
            g_last_bridge_sequence.store(
                final_frame.sequence,
                std::memory_order_relaxed);
            return true;
        };

        if (diagnostic_sample && ensure_cpu_frame() && diagnostic_bridged.pixels) {
            cari::studio::core::SoftwareCompositor compositor(
                static_cast<std::uint32_t>(captured.width),
                static_cast<std::uint32_t>(captured.height));
            cari::studio::core::RgbaImage composited;
            if (!cari::native::CompositorBridge::compose_reference(
                    diagnostic_bridged, compositor, composited, error)) {
                g_compositor_failures.fetch_add(1, std::memory_order_relaxed);
            } else {
                g_compositor_successes.fetch_add(1, std::memory_order_relaxed);
                g_compositor_bytes.fetch_add(
                    static_cast<std::uint64_t>(composited.pixels.size()),
                    std::memory_order_relaxed);
                g_last_composited_sequence.store(
                    diagnostic_bridged.frame.sequence,
                    std::memory_order_relaxed);
            }
        }

        // GPU composition is preferred. The current placeholder is procedural
        // and deliberately contains no proprietary avatar asset. The final
        // GPU texture still requires a CPU readback because the current FFmpeg
        // boundary accepts BGRA bytes; removing that final readback is a separate
        // encoder-boundary task.
        if (captured.surface) {
            ComPtr<ID3D11Texture2D> capture_texture;
            if (SUCCEEDED(captured.surface.As(&capture_texture)) && capture_texture) {
                ComPtr<ID3D11Device> device;
                capture_texture->GetDevice(&device);
                ComPtr<ID3D11DeviceContext> context;
                if (device) {
                    device->GetImmediateContext(&context);
                }

                if (device && context) {
                    std::lock_guard gpu_lock(g_gpu_compositor_mutex);
                    D3D11_TEXTURE2D_DESC desc{};
                    capture_texture->GetDesc(&desc);

                    if (!g_gpu_avatar_placeholder) {
                        g_gpu_avatar_placeholder =
                            cari::native::PlaceholderAvatarGpuSource::make_rgba();
                    }

                    const bool needs_init =
                        g_gpu_compositor.output_texture() == nullptr ||
                        desc.Width != static_cast<UINT>(captured.width) ||
                        desc.Height != static_cast<UINT>(captured.height);

                    std::wstring gpu_error;
                    if (needs_init &&
                        !g_gpu_compositor.initialize(
                            device.Get(),
                            context.Get(),
                            static_cast<std::uint32_t>(desc.Width),
                            static_cast<std::uint32_t>(desc.Height),
                            gpu_error)) {
                        g_gpu_compositor_error.assign(
                            gpu_error.begin(),
                            gpu_error.end());
                    }

                    if (g_gpu_compositor.output_texture()) {
                        const std::int32_t overlay_x =
                            static_cast<std::int32_t>(
                                desc.Width > 220 ? desc.Width - 210 : 8);
                        const std::int32_t overlay_y =
                            static_cast<std::int32_t>(
                                desc.Height > 210 ? desc.Height - 210 : 8);

                        cari::native::GpuOverlay avatar_overlay{
                            .width = 192,
                            .height = 192,
                            .rgba = g_gpu_avatar_placeholder,
                            .opacity = 0.92f,
                            .x = overlay_x,
                            .y = overlay_y,
                            .scale = 1.0f,
                        };

                        if (g_gpu_compositor.compose_capture(
                                capture_texture.Get(),
                                std::vector<cari::native::GpuOverlay>{
                                    avatar_overlay
                                },
                                gpu_error)) {
                            std::shared_ptr<std::vector<std::uint8_t>> gpu_pixels;
                            if (g_gpu_compositor.copy_output_to_cpu(
                                    gpu_pixels,
                                    gpu_error) &&
                                gpu_pixels) {
                                final_pixels = std::move(gpu_pixels);
                                final_frame.width =
                                    static_cast<std::uint32_t>(desc.Width);
                                final_frame.height =
                                    static_cast<std::uint32_t>(desc.Height);
                                final_frame.stride =
                                    static_cast<std::uint32_t>(desc.Width * 4u);
                                final_frame.format =
                                    static_cast<std::uint32_t>(
                                        DXGI_FORMAT_B8G8R8A8_UNORM);
                                final_frame.sequence = captured.sequence;
                                final_frame.pts = captured.timestamp;
                                g_gpu_compositor_error.clear();
                            } else {
                                g_gpu_compositor_error.assign(
                                    gpu_error.begin(),
                                    gpu_error.end());
                            }
                        } else {
                            g_gpu_compositor_error.assign(
                                gpu_error.begin(),
                                gpu_error.end());
                        }
                    }
                }
            }
        }

        if (g_media_enabled.load(std::memory_order_relaxed) &&
            g_media_graph.connected()) {
            if (!final_pixels && !ensure_cpu_frame()) {
                return;
            }
            if (final_pixels) {
                g_media_graph.submit_video(final_frame, final_pixels);
            }
        }
    });

    const bool capture_supported =
        winrt::Windows::Graphics::Capture::GraphicsCaptureSession::IsSupported();
    g_capture_support_status = capture_supported
        ? L"Windows Graphics Capture: supported"
        : L"Windows Graphics Capture: unsupported";
    g_audio_status = BuildAudioStatus();

    WNDCLASSW window_class{};
    window_class.lpfnWndProc = WindowProc;
    window_class.hInstance = instance;
    window_class.lpszClassName = kClassName;
    window_class.hCursor = LoadCursorW(nullptr, IDC_ARROW);

    if (!RegisterClassW(&window_class)) {
        return 1;
    }

    HWND hwnd = CreateWindowExW(
        0,
        kClassName,
        kWindowTitle,
        WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT,
        CW_USEDEFAULT,
        900,
        650,
        nullptr,
        nullptr,
        instance,
        nullptr);
    if (!hwnd) {
        return 2;
    }

    StartControlReader(hwnd);

    g_source_status = BuildSourceStatus();
    if (!g_windows.empty()) {
        g_selected_window_index = 0;
        g_selected_window = g_windows.front().hwnd;
    }

    ShowWindow(hwnd, show_command);
    UpdateWindow(hwnd);

    MSG message{};
    while (GetMessageW(&message, nullptr, 0, 0) > 0) {
        TranslateMessage(&message);
        DispatchMessageW(&message);
    }
    return static_cast<int>(message.wParam);
}