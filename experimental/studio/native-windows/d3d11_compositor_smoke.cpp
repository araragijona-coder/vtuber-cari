#include "d3d11_compositor.h"

#include <d3d11.h>
#include <cassert>
#include <cmath>
#include <cstdint>
#include <iostream>
#include <memory>
#include <vector>
#include <wrl/client.h>

using Microsoft::WRL::ComPtr;

namespace {

ComPtr<ID3D11Texture2D> make_texture(
    ID3D11Device* device,
    std::uint32_t width,
    std::uint32_t height,
    std::uint8_t b,
    std::uint8_t g,
    std::uint8_t r,
    std::uint8_t a) {
    const std::size_t size =
        static_cast<std::size_t>(width) * height * 4u;
    std::vector<std::uint8_t> pixels(size);
    for (std::size_t i = 0; i < size; i += 4) {
        pixels[i + 0] = b;
        pixels[i + 1] = g;
        pixels[i + 2] = r;
        pixels[i + 3] = a;
    }

    D3D11_TEXTURE2D_DESC desc{};
    desc.Width = width;
    desc.Height = height;
    desc.MipLevels = 1;
    desc.ArraySize = 1;
    desc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
    desc.SampleDesc.Count = 1;
    desc.Usage = D3D11_USAGE_DEFAULT;

    D3D11_SUBRESOURCE_DATA data{};
    data.pSysMem = pixels.data();
    data.SysMemPitch = width * 4u;

    ComPtr<ID3D11Texture2D> texture;
    const HRESULT hr = device->CreateTexture2D(&desc, &data, &texture);
    assert(SUCCEEDED(hr));
    return texture;
}

std::shared_ptr<std::vector<std::uint8_t>> make_overlay(
    std::uint32_t width,
    std::uint32_t height) {
    auto pixels = std::make_shared<std::vector<std::uint8_t>>(
        static_cast<std::size_t>(width) * height * 4u,
        0);

    const auto cx = static_cast<float>(width) * 0.5f;
    const auto cy = static_cast<float>(height) * 0.5f;
    const auto radius = static_cast<float>(width) * 0.45f;

    for (std::uint32_t y = 0; y < height; ++y) {
        for (std::uint32_t x = 0; x < width; ++x) {
            const float dx = static_cast<float>(x) - cx;
            const float dy = static_cast<float>(y) - cy;
            const float distance = std::sqrt(dx * dx + dy * dy);
            if (distance > radius) continue;

            const std::size_t index =
                (static_cast<std::size_t>(y) * width + x) * 4u;
            (*pixels)[index + 0] = 80;   // R
            (*pixels)[index + 1] = 180;  // G
            (*pixels)[index + 2] = 255;  // B
            (*pixels)[index + 3] = 220;  // A
        }
    }

    return pixels;
}

} // namespace

int main() {
    ComPtr<ID3D11Device> device;
    ComPtr<ID3D11DeviceContext> context;
    const HRESULT device_hr = D3D11CreateDevice(
        nullptr,
        D3D_DRIVER_TYPE_WARP,
        nullptr,
        D3D11_CREATE_DEVICE_BGRA_SUPPORT,
        nullptr,
        0,
        D3D11_SDK_VERSION,
        &device,
        nullptr,
        &context);
    assert(SUCCEEDED(device_hr));

    cari::native::D3D11Compositor compositor;
    std::wstring error;
    assert(compositor.initialize(device.Get(), context.Get(), 64, 36, error));

    auto capture = make_texture(device.Get(), 64, 36, 20, 30, 40, 255);
    cari::native::GpuOverlay overlay{
        .width = 16,
        .height = 16,
        .rgba = make_overlay(16, 16),
        .generation = 1,
        .opacity = 1.0f,
        .x = 24,
        .y = 10,
        .scale = 1.0f,
    };

    assert(compositor.compose_capture(
        capture.Get(),
        std::vector<cari::native::GpuOverlay>{overlay},
        error));

    assert(compositor.output_texture() != nullptr);
    assert(compositor.stats().composed_frames == 1);
    assert(compositor.stats().overlay_uploads == 1);
    assert(compositor.stats().overlay_cache_hits == 0);

    assert(compositor.compose_capture(
        capture.Get(),
        std::vector<cari::native::GpuOverlay>{overlay},
        error));
    assert(compositor.stats().composed_frames == 2);
    assert(compositor.stats().overlay_uploads == 1);
    assert(compositor.stats().overlay_cache_hits == 1);

    auto changed_overlay = overlay;
    changed_overlay.generation = 2;
    assert(compositor.compose_capture(
        capture.Get(),
        std::vector<cari::native::GpuOverlay>{changed_overlay},
        error));
    assert(compositor.stats().composed_frames == 3);
    assert(compositor.stats().overlay_uploads == 2);

    D3D11_TEXTURE2D_DESC output_desc{};
    compositor.output_texture()->GetDesc(&output_desc);
    output_desc.Usage = D3D11_USAGE_STAGING;
    output_desc.BindFlags = 0;
    output_desc.CPUAccessFlags = D3D11_CPU_ACCESS_READ;
    output_desc.MiscFlags = 0;

    ComPtr<ID3D11Texture2D> staging;
    assert(SUCCEEDED(device->CreateTexture2D(
        &output_desc, nullptr, &staging)));
    context->CopyResource(staging.Get(), compositor.output_texture());

    D3D11_MAPPED_SUBRESOURCE mapped{};
    assert(SUCCEEDED(context->Map(
        staging.Get(), 0, D3D11_MAP_READ, 0, &mapped)));

    const auto* row = static_cast<const std::uint8_t*>(mapped.pData);
    const std::size_t offset =
        static_cast<std::size_t>(11) * mapped.RowPitch +
        static_cast<std::size_t>(25) * 4u;
    const auto b = row[offset + 0];
    const auto g = row[offset + 1];
    const auto r = row[offset + 2];
    const auto a = row[offset + 3];

    context->Unmap(staging.Get(), 0);

    // The capture started as B=20/G=30/R=40. The blue-ish RGBA overlay
    // should visibly change the pixel while retaining an opaque result.
    assert(r != 40 || g != 30 || b != 20);
    assert(a == 255);

    std::cout << "D3D11 compositor WARP smoke: PASS\n";
    return 0;
}
