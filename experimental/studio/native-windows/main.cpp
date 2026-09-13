#include <windows.h>
#include <d3d11.h>
#include <dxgi1_2.h>
#include <winrt/Windows.Graphics.Capture.h>
#include <winrt/base.h>

#include "audio_probe.h"

#include <string>
#include <wrl/client.h>

using Microsoft::WRL::ComPtr;

namespace {

constexpr wchar_t kClassName[] = L"CariStudioNativePrototype";
constexpr wchar_t kWindowTitle[] = L"Cari Studio — Windows Native Prototype";

std::wstring CaptureStatus() {
    try {
        const bool supported =
            winrt::Windows::Graphics::Capture::GraphicsCaptureSession::IsSupported();
        if (!supported) {
            return L"Screen/window capture: unsupported";
        }

        // Create the D3D11 device that will back the future
        // Direct3D11CaptureFramePool. No capture session is started yet.
        ComPtr<ID3D11Device> device;
        ComPtr<ID3D11DeviceContext> context;
        constexpr D3D_FEATURE_LEVEL levels[] = {
            D3D_FEATURE_LEVEL_11_1,
            D3D_FEATURE_LEVEL_11_0,
        };
        D3D_FEATURE_LEVEL selected{};
        const HRESULT hr = D3D11CreateDevice(
            nullptr,
            D3D_DRIVER_TYPE_HARDWARE,
            nullptr,
            D3D11_CREATE_DEVICE_BGRA_SUPPORT,
            levels,
            ARRAYSIZE(levels),
            D3D11_SDK_VERSION,
            &device,
            &selected,
            &context);
        if (FAILED(hr)) {
            return L"Capture: Windows API available, D3D11 device unavailable";
        }

        return L"Capture: Windows API + D3D11 device ready";
    } catch (const winrt::hresult_error& error) {
        return L"Screen/window capture: unavailable (HRESULT " +
               std::to_wstring(static_cast<long>(error.code().value)) + L")";
    }
}

std::wstring AudioStatus() {
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

LRESULT CALLBACK WindowProc(HWND hwnd, UINT message, WPARAM wparam, LPARAM lparam) {
    switch (message) {
    case WM_PAINT: {
        PAINTSTRUCT paint{};
        HDC dc = BeginPaint(hwnd, &paint);

        const std::wstring text =
            L"Cari Studio\n\n"
            L"Native Windows foundation — no AI, API or internet required.\n\n" +
            CaptureStatus() + L"\n" + AudioStatus();

        RECT client{};
        GetClientRect(hwnd, &client);
        DrawTextW(dc, text.c_str(), -1, &client,
                  DT_LEFT | DT_TOP | DT_WORDBREAK);
        EndPaint(hwnd, &paint);
        return 0;
    }
    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;
    default:
        return DefWindowProcW(hwnd, message, wparam, lparam);
    }
}

} // namespace

int WINAPI wWinMain(HINSTANCE instance, HINSTANCE, PWSTR, int show_command) {
    winrt::init_apartment(winrt::apartment_type::single_threaded);

    WNDCLASSW window_class{};
    window_class.lpfnWndProc = WindowProc;
    window_class.hInstance = instance;
    window_class.lpszClassName = kClassName;
    window_class.hCursor = LoadCursorW(nullptr, IDC_ARROW);

    if (!RegisterClassW(&window_class)) {
        return 1;
    }

    HWND hwnd = CreateWindowExW(
        0, kClassName, kWindowTitle, WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT, 760, 420,
        nullptr, nullptr, instance, nullptr);
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
