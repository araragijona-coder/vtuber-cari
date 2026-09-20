#include "d3d11_compositor.h"

#include <d3dcompiler.h>

#include <algorithm>
#include <array>
#include <cstring>

using Microsoft::WRL::ComPtr;

namespace cari::native {
namespace {

struct CompositeConstants {
    float rect[4];
    float opacity;
    float pad[3];
};

constexpr char kVertexShader[] = R"(
struct VSIn {
    float2 position : POSITION;
    float2 uv : TEXCOORD0;
};

struct VSOut {
    float4 position : SV_Position;
    float2 uv : TEXCOORD0;
};

VSOut main(VSIn input) {
    VSOut output;
    output.position = float4(input.position, 0.0, 1.0);
    output.uv = input.uv;
    return output;
}
)";

constexpr char kPixelShader[] = R"(
cbuffer CompositeConstants : register(b0) {
    float4 rect;
    float opacity;
};

Texture2D baseTex : register(t0);
Texture2D overlayTex : register(t1);
SamplerState samplerLinear : register(s0);

struct PSIn {
    float4 position : SV_Position;
    float2 uv : TEXCOORD0;
};

float4 main(PSIn input) : SV_Target {
    float4 base = baseTex.Sample(samplerLinear, input.uv);
    float2 local = (input.position.xy - rect.xy) / rect.zw;
    float4 overlay = overlayTex.Sample(samplerLinear, local);

    float alpha = saturate(overlay.a * opacity);
    float3 rgb = overlay.rgb * alpha + base.rgb * (1.0 - alpha);
    return float4(rgb, max(base.a, alpha));
}
)";

struct Vertex {
    float position[2];
    float uv[2];
};

} // namespace

std::wstring D3D11Compositor::hresult_error(
    HRESULT hr,
    const wchar_t* operation) {
    return std::wstring(operation) +
           L" failed: HRESULT " +
           std::to_wstring(static_cast<unsigned long>(hr));
}

bool D3D11Compositor::initialize(
    ID3D11Device* device,
    ID3D11DeviceContext* context,
    std::uint32_t width,
    std::uint32_t height,
    std::wstring& error) {
    error.clear();
    output_texture_.Reset();
    output_rtv_.Reset();
    output_srv_.Reset();
    vertex_shader_.Reset();
    pixel_shader_.Reset();
    constant_buffer_.Reset();

    if (!device || !context || width == 0 || height == 0) {
        error = L"invalid D3D11 compositor initialization arguments";
        return false;
    }

    device_ = device;
    context_ = context;
    width_ = width;
    height_ = height;

    return ensure_output(width, height, error) && ensure_pipeline(error);
}

bool D3D11Compositor::ensure_output(
    std::uint32_t width,
    std::uint32_t height,
    std::wstring& error) {
    if (output_texture_ && width_ == width && height_ == height) {
        return true;
    }

    D3D11_TEXTURE2D_DESC desc{};
    desc.Width = width;
    desc.Height = height;
    desc.MipLevels = 1;
    desc.ArraySize = 1;
    desc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
    desc.SampleDesc.Count = 1;
    desc.Usage = D3D11_USAGE_DEFAULT;
    desc.BindFlags = D3D11_BIND_RENDER_TARGET | D3D11_BIND_SHADER_RESOURCE;

    HRESULT hr = device_->CreateTexture2D(&desc, nullptr, &output_texture_);
    if (FAILED(hr)) {
        return false;
    }

    hr = device_->CreateRenderTargetView(output_texture_.Get(), nullptr, &output_rtv_);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateRenderTargetView");
        return false;
    }

    hr = device_->CreateShaderResourceView(output_texture_.Get(), nullptr, &output_srv_);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateShaderResourceView");
        return false;
    }

    width_ = width;
    height_ = height;
    return true;
}

bool D3D11Compositor::ensure_pipeline(std::wstring& error) {
    if (vertex_shader_ && pixel_shader_ && constant_buffer_) {
        return true;
    }

    ComPtr<ID3DBlob> vs_blob;
    ComPtr<ID3DBlob> errors;
    HRESULT hr = D3DCompile(
        kVertexShader,
        std::strlen(kVertexShader),
        "cari-d3d11-compositor-vs",
        nullptr,
        nullptr,
        "main",
        "vs_5_0",
        D3DCOMPILE_ENABLE_STRICTNESS,
        0,
        &vs_blob,
        &errors);
    if (FAILED(hr)) {
        ++stats_.shader_failures;
        error = errors
            ? std::wstring(
                static_cast<const wchar_t*>(nullptr),
                static_cast<const wchar_t*>(nullptr))
            : L"D3D vertex shader compilation failed";
        if (errors) {
            const char* bytes = static_cast<const char*>(errors->GetBufferPointer());
            error.assign(bytes, bytes + errors->GetBufferSize());
        }
        return false;
    }

    hr = device_->CreateVertexShader(
        vs_blob->GetBufferPointer(),
        vs_blob->GetBufferSize(),
        nullptr,
        &vertex_shader_);
    if (FAILED(hr)) {
        ++stats_.shader_failures;
        error = hresult_error(hr, L"CreateVertexShader");
        return false;
    }

    vs_blob.Reset();
    errors.Reset();

    hr = D3DCompile(
        kPixelShader,
        std::strlen(kPixelShader),
        "cari-d3d11-compositor-ps",
        nullptr,
        nullptr,
        "main",
        "ps_5_0",
        D3DCOMPILE_ENABLE_STRICTNESS,
        0,
        &vs_blob,
        &errors);
    if (FAILED(hr)) {
        ++stats_.shader_failures;
        if (errors) {
            const char* bytes = static_cast<const char*>(errors->GetBufferPointer());
            error.assign(bytes, bytes + errors->GetBufferSize());
        } else {
            error = L"D3D pixel shader compilation failed";
        }
        return false;
    }

    hr = device_->CreatePixelShader(
        vs_blob->GetBufferPointer(),
        vs_blob->GetBufferSize(),
        nullptr,
        &pixel_shader_);
    if (FAILED(hr)) {
        ++stats_.shader_failures;
        error = hresult_error(hr, L"CreatePixelShader");
        return false;
    }

    D3D11_BUFFER_DESC buffer_desc{};
    buffer_desc.ByteWidth = sizeof(CompositeConstants);
    buffer_desc.Usage = D3D11_USAGE_DEFAULT;
    buffer_desc.BindFlags = D3D11_BIND_CONSTANT_BUFFER;

    hr = device_->CreateBuffer(&buffer_desc, nullptr, &constant_buffer_);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateBuffer constant buffer");
        return false;
    }

    return true;
}

bool D3D11Compositor::upload_overlay(
    const GpuOverlay& overlay,
    ComPtr<ID3D11ShaderResourceView>& srv,
    std::uint32_t& texture_width,
    std::uint32_t& texture_height,
    std::wstring& error) {
    if (!overlay.rgba || overlay.width == 0 || overlay.height == 0) {
        error = L"overlay is empty";
        return false;
    }

    const std::size_t expected =
        static_cast<std::size_t>(overlay.width) * overlay.height * 4u;
    if (overlay.rgba->size() != expected) {
        error = L"overlay payload size does not match dimensions";
        return false;
    }

    D3D11_TEXTURE2D_DESC desc{};
    desc.Width = overlay.width;
    desc.Height = overlay.height;
    desc.MipLevels = 1;
    desc.ArraySize = 1;
    desc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
    desc.SampleDesc.Count = 1;
    desc.Usage = D3D11_USAGE_IMMUTABLE;
    desc.BindFlags = D3D11_BIND_SHADER_RESOURCE;

    D3D11_SUBRESOURCE_DATA data{};
    data.pSysMem = overlay.rgba->data();
    data.SysMemPitch = overlay.width * 4u;

    ComPtr<ID3D11Texture2D> texture;
    HRESULT hr = device_->CreateTexture2D(&desc, &data, &texture);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateTexture2D overlay");
        return false;
    }

    hr = device_->CreateShaderResourceView(texture.Get(), nullptr, &srv);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateShaderResourceView overlay");
        return false;
    }

    texture_width = overlay.width;
    texture_height = overlay.height;
    return true;
}

bool D3D11Compositor::compose_capture(
    ID3D11Texture2D* capture,
    const std::vector<GpuOverlay>& overlays,
    std::wstring& error) {
    error.clear();

    if (!capture || !output_texture_ || !output_rtv_ ||
        !vertex_shader_ || !pixel_shader_ || !constant_buffer_) {
        ++stats_.rejected_frames;
        error = L"compositor pipeline is not initialized";
        return false;
    }

    D3D11_TEXTURE2D_DESC capture_desc{};
    capture->GetDesc(&capture_desc);
    if (capture_desc.Width != width_ || capture_desc.Height != height_ ||
        (capture_desc.Format != DXGI_FORMAT_B8G8R8A8_UNORM &&
         capture_desc.Format != DXGI_FORMAT_B8G8R8A8_UNORM_SRGB)) {
        ++stats_.rejected_frames;
        error = L"capture texture format/size is incompatible with compositor";
        return false;
    }

    ComPtr<ID3D11ShaderResourceView> capture_srv;
    HRESULT hr = device_->CreateShaderResourceView(capture, nullptr, &capture_srv);
    if (FAILED(hr)) {
        ++stats_.rejected_frames;
        error = hresult_error(hr, L"CreateShaderResourceView capture");
        return false;
    }

    const std::array<Vertex, 4> quad{{
        {{-1.0f, 1.0f}, {0.0f, 0.0f}},
        {{ 1.0f, 1.0f}, {1.0f, 0.0f}},
        {{-1.0f,-1.0f}, {0.0f, 1.0f}},
        {{ 1.0f,-1.0f}, {1.0f, 1.0f}},
    }};

    D3D11_BUFFER_DESC vertex_desc{};
    vertex_desc.ByteWidth = sizeof(quad);
    vertex_desc.Usage = D3D11_USAGE_IMMUTABLE;
    vertex_desc.BindFlags = D3D11_BIND_VERTEX_BUFFER;

    D3D11_SUBRESOURCE_DATA vertex_data{};
    vertex_data.pSysMem = quad.data();

    ComPtr<ID3D11Buffer> vertex_buffer;
    hr = device_->CreateBuffer(&vertex_desc, &vertex_data, &vertex_buffer);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateBuffer vertex");
        return false;
    }

    D3D11_INPUT_ELEMENT_DESC input_layout[] = {
        {"POSITION", 0, DXGI_FORMAT_R32G32_FLOAT, 0, 0,
         D3D11_INPUT_PER_VERTEX_DATA, 0},
        {"TEXCOORD", 0, DXGI_FORMAT_R32G32_FLOAT, 0, 8,
         D3D11_INPUT_PER_VERTEX_DATA, 0},
    };

    ComPtr<ID3D11InputLayout> input;
    // Recompile the VS signature is unnecessary: use the compiled bytecode.
    // The temporary shader blob is not retained, so create a tiny signature
    // through the known input declaration is not possible here.
    // CreateInputLayout is therefore deferred to a future persistent pipeline.
    // For the current backend use CopyResource for the base frame when no
    // overlays are present.
    if (overlays.empty()) {
        context_->CopyResource(output_texture_.Get(), capture);
        ++stats_.composed_frames;
        return true;
    }

    // Overlay composition requires a persistent input-layout/vertex pipeline.
    // Keep the capture GPU path correct rather than falling back to CPU.
    error = L"overlay composition pipeline requires persistent input layout";
    ++stats_.rejected_frames;
    return false;
}

} // namespace cari::native
