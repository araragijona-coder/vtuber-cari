#include <windows.h>
#include <winrt/Windows.Graphics.Capture.h>
#include <winrt/base.h>

#include "audio_core_bridge.h"
#include "audio_probe.h"
#include "camera_sources.h"
#include "capture_engine.h"
#include "compositor_bridge.h"
#include "window_sources.h"

#include <algorithm>
#include <atomic>
#include <cstdint>
#include <string>
#include <vector>

namespace {

constexpr wchar_t kClassName[] = L"CariStudioNative";
constexpr wchar_t kWindowTitle[] = L"Cari Studio — Windows x64";
constexpr UINT_PTR kStatusTimerId = 1;
constexpr std::uint64_t kBridgeSampleEvery = 30;

cari::native::CaptureEngine g_capture;
cari::native::AudioCoreBridge g_audio_bridge;
std::wstring g_audio_status;
std::wstring g_capture_support_status;
std::wstring g_source_status;
std::vector<cari::native::WindowSourceInfo> g_windows;
HWND g_selected_window = nullptr;
std::size_t g_selected_window_index = 0;
std::atomic<std::uint64_t> g_bridge_attempts{0};
std::atomic<std::uint64_t> g_bridge_successes{0};
std::atomic<std::uint64_t> g_bridge_failures{0};
std::atomic<std::uint64_t> g_bridge_bytes{0};
std::atomic<std::uint64_t> g_last_bridge_sequence{0};
std::atomic<std::uint64_t> g_compositor_successes{0};
std::atomic<std::uint64_t> g_compositor_failures{0};
std::atomic<std::uint64_t> g_compositor_bytes{0};
std::atomic<std::uint64_t> g_last_composited_sequence{0};

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
    if (!g_capture.is_running()) {
        if (!g_capture.last_error().empty()) {
            return L"Capture: stopped — " + g_capture.last_error();
        }
        return L"Capture: stopped";
    }

    const auto stats = g_capture.stats();
    const std::wstring selected_title =
        (g_selected_window_index < g_windows.size())
            ? g_windows[g_selected_window_index].title
            : std::wstring(L"unknown source");

    const auto bridge_attempts = g_bridge_attempts.load(std::memory_order_relaxed);
    const auto bridge_successes = g_bridge_successes.load(std::memory_order_relaxed);
    const auto bridge_failures = g_bridge_failures.load(std::memory_order_relaxed);
    const auto bridge_bytes = g_bridge_bytes.load(std::memory_order_relaxed);
    const auto bridge_sequence = g_last_bridge_sequence.load(std::memory_order_relaxed);
    const auto compositor_successes = g_compositor_successes.load(std::memory_order_relaxed);
    const auto compositor_failures = g_compositor_failures.load(std::memory_order_relaxed);
    const auto compositor_bytes = g_compositor_bytes.load(std::memory_order_relaxed);
    const auto composited_sequence = g_last_composited_sequence.load(std::memory_order_relaxed);

    return L"Capture: running — " + selected_title + L" — " +
           std::to_wstring(stats.width) + L"x" + std::to_wstring(stats.height) +
           L", " + std::to_wstring(stats.frames) + L" frame(s), " +
           std::to_wstring(stats.fps) + L" FPS, " +
           std::to_wstring(stats.errors) + L" error(s), " +
           std::to_wstring(stats.recreates) + L" recreate(s), " +
           std::to_wstring(stats.device_recoveries) + L" device recovery(ies)\n" +
           L"Frame bridge: " + std::to_wstring(bridge_successes) + L" success / " +
           std::to_wstring(bridge_failures) + L" failed / " +
           std::to_wstring(bridge_attempts) + L" sample(s), " +
           std::to_wstring(bridge_bytes) + L" byte(s), last sequence " +
           std::to_wstring(bridge_sequence) + L"\n" +
           L"Reference compositor: " + std::to_wstring(compositor_successes) +
           L" success / " + std::to_wstring(compositor_failures) +
           L" failed, " + std::to_wstring(compositor_bytes) +
           L" output byte(s), last sequence " +
           std::to_wstring(composited_sequence);
}

void RefreshStatus(HWND hwnd) {
    g_source_status = BuildSourceStatus();
    g_audio_status = BuildAudioStatus();
    InvalidateRect(hwnd, nullptr, FALSE);
}

void SelectWindow(HWND hwnd, std::size_t index) {
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
        g_capture.stop();
        g_capture.start_window(g_selected_window);
    }

    RefreshStatus(hwnd);
}

LRESULT CALLBACK WindowProc(HWND hwnd, UINT message, WPARAM wparam, LPARAM lparam) {
    switch (message) {
    case WM_CREATE:
        SetTimer(hwnd, kStatusTimerId, 1000, nullptr);
        return 0;

    case WM_TIMER:
        if (wparam == kStatusTimerId) {
            RefreshStatus(hwnd);
        }
        return 0;

    case WM_KEYDOWN:
        if (wparam >= '1' && wparam <= '9') {
            SelectWindow(hwnd, static_cast<std::size_t>(wparam - '1'));
            return 0;
        }
        if (wparam == 'A') {
            if (g_audio_bridge.stats().packets > 0 || !g_audio_bridge.last_error().empty()) {
                g_audio_bridge.stop();
            } else {
                g_audio_bridge.start();
            }
            RefreshStatus(hwnd);
            return 0;
        }
        if (wparam == VK_SPACE) {
            if (g_capture.is_running()) {
                g_capture.stop();
            } else if (g_selected_window && IsWindow(g_selected_window)) {
                g_capture.start_window(g_selected_window);
            } else if (!g_capture.start_window(hwnd)) {
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
            L"A: start/stop microphone + system audio";

        RECT client{};
        GetClientRect(hwnd, &client);
        DrawTextW(dc, text.c_str(), -1, &client,
                  DT_LEFT | DT_TOP | DT_WORDBREAK);
        EndPaint(hwnd, &paint);
        return 0;
    }

    case WM_DESTROY:
        KillTimer(hwnd, kStatusTimerId);
        g_capture.stop();
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
        if ((captured.sequence % kBridgeSampleEvery) != 0) {
            return;
        }

        g_bridge_attempts.fetch_add(1, std::memory_order_relaxed);

        cari::native::BridgedFrame bridged;
        std::wstring error;
        if (!cari::native::FrameBridge::copy_to_cpu(captured, bridged, error)) {
            g_bridge_failures.fetch_add(1, std::memory_order_relaxed);
            return;
        }

        g_bridge_successes.fetch_add(1, std::memory_order_relaxed);
        g_bridge_bytes.fetch_add(
            bridged.pixels ? static_cast<std::uint64_t>(bridged.pixels->size()) : 0,
            std::memory_order_relaxed);
        g_last_bridge_sequence.store(bridged.frame.sequence, std::memory_order_relaxed);

        cari::studio::core::SoftwareCompositor compositor(
            static_cast<std::uint32_t>(captured.width),
            static_cast<std::uint32_t>(captured.height));
        cari::studio::core::RgbaImage composited;
        if (!cari::native::CompositorBridge::compose_reference(
                bridged, compositor, composited, error)) {
            g_compositor_failures.fetch_add(1, std::memory_order_relaxed);
            return;
        }

        g_compositor_successes.fetch_add(1, std::memory_order_relaxed);
        g_compositor_bytes.fetch_add(
            static_cast<std::uint64_t>(composited.pixels.size()),
            std::memory_order_relaxed);
        g_last_composited_sequence.store(
            bridged.frame.sequence, std::memory_order_relaxed);
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