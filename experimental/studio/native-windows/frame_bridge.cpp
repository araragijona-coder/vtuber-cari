#include "frame_bridge.h"

#include <d3d11.h>
#include <dxgi.h>
#include <wrl/client.h>

#include <algorithm>
#include <cstring>
#include <limits>

using Microsoft::WRL::ComPtr;

namespace cari::native {

namespace {

std::wstring hresult_error(HRESULT hr, const wchar_t* operation) {
    return std::wstring(operation) + L" failed: HRESULT " +
           std::to_wstring(static_cast<unsigned long>(hr));
}

} // namespace

bool FrameBridge::copy_to_cpu(
    const CapturedFrame& captured,
    BridgedFrame& output,
    std::wstring& error) {
    output = {};
    error.clear();

    if (!captured.surface || captured.width <= 0 || captured.height <= 0) {
        error = L"Captured frame has no surface or an invalid size";
        return false;
    }

    ComPtr<ID3D11Texture2D> source_texture;
    const HRESULT query_hr = captured.surface.As(&source_texture);
    if (FAILED(query_hr)) {
        error = hresult_error(query_hr, L"IDXGISurface -> ID3D11Texture2D conversion");
        return false;
    }

    ComPtr<ID3D11Device> device;
    source_texture->GetDevice(&device);
    if (!device) {
        error = L"Captured texture did not expose its D3D11 device";
        return false;
    }

    ComPtr<ID3D11DeviceContext> context;
    device->GetImmediateContext(&context);
    if (!context) {
        error = L"Captured texture device did not expose an immediate context";
        return false;
    }

    D3D11_TEXTURE2D_DESC desc{};
    source_texture->GetDesc(&desc);
    if (desc.Format != DXGI_FORMAT_B8G8R8A8_UNORM &&
        desc.Format != DXGI_FORMAT_B8G8R8A8_UNORM_SRGB) {
        error = L"Unsupported capture format for CPU bridge";
        return false;
    }

    if (desc.Width != static_cast<UINT>(captured.width) ||
        desc.Height != static_cast<UINT>(captured.height)) {
        error = L"Captured surface size changed before CPU readback";
        return false;
    }

    D3D11_TEXTURE2D_DESC staging_desc = desc;
    staging_desc.Usage = D3D11_USAGE_STAGING;
    staging_desc.BindFlags = 0;
    staging_desc.CPUAccessFlags = D3D11_CPU_ACCESS_READ;
    staging_desc.MiscFlags = 0;

    ComPtr<ID3D11Texture2D> staging;
    const HRESULT create_hr = device->CreateTexture2D(&staging_desc, nullptr, &staging);
    if (FAILED(create_hr)) {
        error = hresult_error(create_hr, L"CreateTexture2D staging texture");
        return false;
    }

    context->CopyResource(staging.Get(), source_texture.Get());

    D3D11_MAPPED_SUBRESOURCE mapped{};
    const HRESULT map_hr = context->Map(
        staging.Get(),
        0,
        D3D11_MAP_READ,
        0,
        &mapped);
    if (FAILED(map_hr)) {
        error = hresult_error(map_hr, L"Map staging texture");
        return false;
    }

    constexpr std::uint32_t bytes_per_pixel = 4;
    const std::uint64_t row_bytes64 =
        static_cast<std::uint64_t>(desc.Width) * bytes_per_pixel;
    const std::uint64_t total_bytes64 =
        row_bytes64 * static_cast<std::uint64_t>(desc.Height);

    bool success = true;
    if (row_bytes64 > std::numeric_limits<std::size_t>::max() ||
        total_bytes64 > std::numeric_limits<std::size_t>::max()) {
        error = L"Capture frame is too large for the CPU bridge";
        success = false;
    } else {
        auto pixels = std::make_shared<std::vector<std::uint8_t>>(
            static_cast<std::size_t>(total_bytes64));
        auto* destination = pixels->data();
        const auto* source = static_cast<const std::uint8_t*>(mapped.pData);
        const auto row_bytes = static_cast<std::size_t>(row_bytes64);

        for (UINT row = 0; row < desc.Height; ++row) {
            std::memcpy(
                destination + static_cast<std::size_t>(row) * row_bytes,
                source + static_cast<std::size_t>(row) * mapped.RowPitch,
                row_bytes);
        }

        output.frame.pts = captured.timestamp;
        output.frame.width = desc.Width;
        output.frame.height = desc.Height;
        output.frame.stride = static_cast<std::uint32_t>(row_bytes);
        output.frame.format = static_cast<std::uint32_t>(desc.Format);
        output.frame.sequence = captured.sequence;
        output.pixels = std::move(pixels);
    }

    context->Unmap(staging.Get(), 0);
    return success;
}

} // namespace cari::native
