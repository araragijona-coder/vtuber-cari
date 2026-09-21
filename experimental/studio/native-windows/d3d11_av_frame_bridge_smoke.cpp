#include "d3d11_av_frame_bridge.h"

#include <d3d11.h>

#include <cassert>
#include <cstdint>
#include <iostream>
#include <string>

#pragma comment(lib, "d3d11.lib")

int main() {
    D3D_FEATURE_LEVEL feature_level{};
    ID3D11Device* device = nullptr;
    ID3D11DeviceContext* context = nullptr;

    const HRESULT device_result = D3D11CreateDevice(
        nullptr,
        D3D_DRIVER_TYPE_HARDWARE,
        nullptr,
        0,
        nullptr,
        0,
        D3D11_SDK_VERSION,
        &device,
        &feature_level,
        &context);

    if (FAILED(device_result)) {
        std::cout << "D3D11 AV frame bridge smoke: SKIP (hardware D3D11 unavailable)\n";
        return 0;
    }

    constexpr UINT width = 160;
    constexpr UINT height = 90;

    D3D11_TEXTURE2D_DESC desc{};
    desc.Width = width;
    desc.Height = height;
    desc.MipLevels = 1;
    desc.ArraySize = 1;
    desc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
    desc.SampleDesc.Count = 1;
    desc.Usage = D3D11_USAGE_DEFAULT;
    desc.BindFlags = D3D11_BIND_RENDER_TARGET | D3D11_BIND_SHADER_RESOURCE;

    ID3D11Texture2D* texture = nullptr;
    const HRESULT texture_result =
        device->CreateTexture2D(&desc, nullptr, &texture);
    assert(SUCCEEDED(texture_result));

    cari::native::D3D11AvFrameBridge bridge;
    std::string error;
    const bool initialized =
        bridge.initialize(device, width, height, error);

    if (!initialized) {
        std::cout << "D3D11 AV frame bridge smoke: SKIP (FFmpeg D3D11VA init unavailable)\n";
        texture->Release();
        context->Release();
        device->Release();
        return 0;
    }

    AVFrame* frame = bridge.copy_texture_to_hwframe(texture, 1234, error);
    assert(frame != nullptr);
    assert(frame->format == AV_PIX_FMT_D3D11);
    assert(frame->width == static_cast<int>(width));
    assert(frame->height == static_cast<int>(height));
    assert(frame->pts == 1234);
    assert(frame->data[0] != nullptr);
    assert(frame->data[1] == nullptr);

    av_frame_free(&frame);
    texture->Release();
    context->Release();
    device->Release();

    std::cout << "D3D11 AV frame bridge smoke: PASS\n";
    return 0;
}
