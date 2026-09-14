#include <windows.h>
#include <winrt/Windows.Graphics.Capture.h>
#include <winrt/base.h>

#include "audio_probe.h"
#include "camera_sources.h"
#include "capture_engine.h"
#include "window_sources.h"

#include <string>

namespace {

constexpr wchar_t kClassName[] = L"CariStudioNativePrototype";
constexpr wchar_t kWindowTitle[] = L"Cari Studio — Windows Native Prototype";
constexpr UINT_PTR kStatusTimerId = 1;

cari::native::CaptureEngine g_capture;
std::wstring g_audio_status;
std::wstring g_capture_support_status;
std::wstring g_source_status;

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

    return L"Audio endpoints: " + std::to_wstring(inputs) + L" input(s), " +
           std::to_wstring(outputs) + L" output(s)";
}

std::wstring BuildSourceStatus() {
    const auto windows = cari::native::enumerate_capturable_windows();
    const auto cameras = cari::native::enumerate_cameras();
    return L"Sources: " + std::to_wstring(windows.size()) + L" window(s), " +
           std::to_wstring(cameras.size()) + L" camera(s)";
}

std::wstring BuildCaptureStatus() {
    if (!g_capture.is_running()) {
        if (!g_capture.last_error().empty()) {
            return L"Capture test: stopped — " + g_capture.last_error();
        }
        return L"Capture test: stopped";
    }

    const auto stats = g_capture.stats();
    return L"Capture test: running — " + std::to_wstring(stats.width) + L"x" +
           std::to_wstring(stats.height) + L", " + std::to_wstring(stats.frames) +
           L" frame(s), " + std::to_wstring(stats.fps) + L" FPS, " +
           std::to_wstring(stats.errors) + L" error(s)";
}

void RefreshStatus(HWND hwnd) {
    g_source_status = BuildSourceStatus();
    InvalidateRect(hwnd, nullptr, FALSE);
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
        if (wparam == VK_SPACE) {
            if (g_capture.is_running()) {
                g_capture.stop();
            } else if (!g_capture.start_window(hwnd)) {
                // The error is retained by the engine and surfaced in the status view.
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
            L"Windows-native foundation — no AI, API or internet required.\n\n" +
            g_capture_support_status + L"\n" + g_audio_status + L"\n" +
            g_source_status + L"\n\n" + BuildCaptureStatus() + L"\n\n" +
            L"SPACE: start/stop native capture test for this window";

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
        PostQuitMessage(0);
        return 0;

    default:
        return DefWindowProcW(hwnd, message, wparam, lparam);
    }
}

} // namespace

int WINAPI wWinMain(HINSTANCE instance, HINSTANCE, PWSTR, int show_command) {
    winrt::init_apartment(winrt::apartment_type::single_threaded);

    const bool capture_supported =
        winrt::Windows::Graphics::Capture::GraphicsCaptureSession::IsSupported();
    g_capture_support_status = capture_supported
        ? L"Windows Graphics Capture: supported"
        : L"Windows Graphics Capture: unsupported";
    g_audio_status = BuildAudioStatus();
    g_source_status = BuildSourceStatus();

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
        760,
        420,
        nullptr,
        nullptr,
        instance,
        nullptr);
    if (!hwnd) {
        return 2;
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
