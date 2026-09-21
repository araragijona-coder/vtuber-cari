#include "d3d11_compositor.h"

#include <d3dcompiler.h>

#include <algorithm>
#include <array>
#include <cstring>
#include <string_view>

using Microsoft::WRL::ComPtr;

namespace cari::native {
namespace {

struct CompositeConstants {
    float rect[4];
    float output_size[2];
    float opacity;
    float padding;
};

struct Vertex {
    float position[2];
    float uv[2];
};

constexpr std::array<Vertex, 4> kQuad{{
    {{0.0f, 0.0f}, {0.0f, 0.0f}},
    {{1.0f, 0.0f}, {1.0f, 0.0f}},
    {{0.0f, 1.0f}, {0.0f, 1.0f}},
    {{1.0f, 1.0f}, {1.0f, 1.0f}},
}};

constexpr char kVertexShader[] = R"(
cbuffer CompositeConstants : register(b0) {
    float4 rect;
    float2 outputSize;
    float opacity;
    float padding;
};

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

    float x0 = (rect.x / outputSize.x) * 2.0 - 1.0;
    float x1 = ((rect.x + rect.z) / outputSize.x) * 2.0 - 1.0;
    float y0 = 1.0 - (rect.y / outputSize.y) * 2.0;
    float y1 = 1.0 - ((rect.y + rect.w) / outputSize.y) * 2.0;

    float2 position = float2(
        lerp(x0, x1, input.position.x),
        lerp(y0, y1, input.position.y)
    );

    output.position = float4(position, 0.0, 1.0);
    output.uv = input.uv;
    return output;
}
)";

constexpr char kPixelShader[] = R"(
cbuffer CompositeConstants : register(b0) {
    float4 rect;
    float2 outputSize;
    float opacity;
    float padding;
};

Texture2D overlayTex : register(t0);
SamplerState samplerLinear : register(s0);

struct PSIn {
    float4 position : SV_Position;
    float2 uv : TEXCOORD0;
};

float4 main(PSIn input) : SV_Target {
    float4 color = overlayTex.Sample(samplerLinear, input.uv);
    color.a = saturate(color.a * opacity);
    return color;
}
)";

std::wstring blob_error(ID3DBlob* errors, const wchar_t* fallback) {
    if (!errors || errors->GetBufferSize() == 0) {
        return fallback;
    }

    const auto* bytes = static_cast<const unsigned char*>(errors->GetBufferPointer());
    const auto size = errors->GetBufferSize();

    // D3DCompile diagnostics are normally ASCII/UTF-8-compatible. Keep the
    // conversion local and allocation-free so this path remains safe in a
    // failure handler; non-ASCII bytes are widened one-to-one for logging.
    std::wstring result;
    result.reserve(size);
    for (std::size_t i = 0; i < size; ++i) {
        result.push_back(static_cast<wchar_t>(bytes[i]));
    }
    return result;
}

} // namespace

std::wstring D3D11Compositor::hresult_error(
    HRESULT hr,
    const wchar_t* operation) {
    return std::wstring(operation) +
           L" failed: HRESULT " +
           std::to_wstring(static_cast<unsigned long>(hr));
}

std::wstring D3D11Compositor::shader_error(
    ID3DBlob* errors,
    const wchar_t* fallback) {
    return blob_error(errors, fallback);
}

bool D3D11Compositor::initialize(
    ID3D11Device* device,
    ID3D11DeviceContext* context,
    std::uint32_t width,
    std::uint32_t height,
    std::wstring& error) {
    error.clear();

    if (!device || !context || width == 0 || height == 0) {
        error = L"invalid D3D11 compositor initialization arguments";
        return false;
    }

    device_ = device;
    context_ = context;
    width_ = width;
    height_ = height;

    for (auto& entry : overlay_cache_) {
        entry = {};
    }
    overlay_cache_clock_ = 0;

    output_texture_.Reset();
    output_rtv_.Reset();
    output_srv_.Reset();
    vertex_shader_.Reset();
    pixel_shader_.Reset();
    input_layout_.Reset();
    vertex_buffer_.Reset();
    constant_buffer_.Reset();
    blend_state_.Reset();
    sampler_state_.Reset();

    return ensure_output(width, height, error) &&
           ensure_pipeline(error);
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
        error = hresult_error(hr, L"CreateTexture2D output");
        return false;
    }

    hr = device_->CreateRenderTargetView(
        output_texture_.Get(),
        nullptr,
        &output_rtv_);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateRenderTargetView");
        return false;
    }

    hr = device_->CreateShaderResourceView(
        output_texture_.Get(),
        nullptr,
        &output_srv_);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateShaderResourceView output");
        return false;
    }

    width_ = width;
    height_ = height;
    return true;
}

bool D3D11Compositor::ensure_pipeline(std::wstring& error) {
    if (vertex_shader_ &&
        pixel_shader_ &&
        input_layout_ &&
        vertex_buffer_ &&
        constant_buffer_ &&
        blend_state_ &&
        sampler_state_) {
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
        error = shader_error(errors.Get(), L"D3D vertex shader compilation failed");
        return false;
    }

    hr = device_->CreateVertexShader(
        vs_blob->GetBufferPointer(),
        vs_blob->GetBufferSize(),
        nullptr,
        &vertex_shader_);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateVertexShader");
        return false;
    }

    const D3D11_INPUT_ELEMENT_DESC input_elements[] = {
        {
            "POSITION", 0, DXGI_FORMAT_R32G32_FLOAT, 0, 0,
            D3D11_INPUT_PER_VERTEX_DATA, 0
        },
        {
            "TEXCOORD", 0, DXGI_FORMAT_R32G32_FLOAT, 0, 8,
            D3D11_INPUT_PER_VERTEX_DATA, 0
        },
    };

    hr = device_->CreateInputLayout(
        input_elements,
        static_cast<UINT>(std::size(input_elements)),
        vs_blob->GetBufferPointer(),
        vs_blob->GetBufferSize(),
        &input_layout_);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateInputLayout");
        return false;
    }

    D3D11_BUFFER_DESC vertex_desc{};
    vertex_desc.ByteWidth = sizeof(kQuad);
    vertex_desc.Usage = D3D11_USAGE_IMMUTABLE;
    vertex_desc.BindFlags = D3D11_BIND_VERTEX_BUFFER;

    D3D11_SUBRESOURCE_DATA vertex_data{};
    vertex_data.pSysMem = kQuad.data();

    hr = device_->CreateBuffer(
        &vertex_desc,
        &vertex_data,
        &vertex_buffer_);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateBuffer vertex");
        return false;
    }

    D3D11_BUFFER_DESC constant_desc{};
    constant_desc.ByteWidth = sizeof(CompositeConstants);
    constant_desc.Usage = D3D11_USAGE_DEFAULT;
    constant_desc.BindFlags = D3D11_BIND_CONSTANT_BUFFER;

    hr = device_->CreateBuffer(
        &constant_desc,
        nullptr,
        &constant_buffer_);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateBuffer constants");
        return false;
    }

    D3D11_BLEND_DESC blend_desc{};
    blend_desc.AlphaToCoverageEnable = FALSE;
    blend_desc.IndependentBlendEnable = FALSE;
    blend_desc.RenderTarget[0].BlendEnable = TRUE;
    blend_desc.RenderTarget[0].SrcBlend = D3D11_BLEND_SRC_ALPHA;
    blend_desc.RenderTarget[0].DestBlend = D3D11_BLEND_INV_SRC_ALPHA;
    blend_desc.RenderTarget[0].BlendOp = D3D11_BLEND_OP_ADD;
    blend_desc.RenderTarget[0].SrcBlendAlpha = D3D11_BLEND_ONE;
    blend_desc.RenderTarget[0].DestBlendAlpha = D3D11_BLEND_INV_SRC_ALPHA;
    blend_desc.RenderTarget[0].BlendOpAlpha = D3D11_BLEND_OP_ADD;
    blend_desc.RenderTarget[0].RenderTargetWriteMask = D3D11_COLOR_WRITE_ENABLE_ALL;

    hr = device_->CreateBlendState(&blend_desc, &blend_state_);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateBlendState");
        return false;
    }

    D3D11_SAMPLER_DESC sampler_desc{};
    sampler_desc.Filter = D3D11_FILTER_MIN_MAG_MIP_LINEAR;
    sampler_desc.AddressU = D3D11_TEXTURE_ADDRESS_CLAMP;
    sampler_desc.AddressV = D3D11_TEXTURE_ADDRESS_CLAMP;
    sampler_desc.AddressW = D3D11_TEXTURE_ADDRESS_CLAMP;

    hr = device_->CreateSamplerState(&sampler_desc, &sampler_state_);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateSamplerState");
        return false;
    }

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
        error = shader_error(errors.Get(), L"D3D pixel shader compilation failed");
        return false;
    }

    hr = device_->CreatePixelShader(
        vs_blob->GetBufferPointer(),
        vs_blob->GetBufferSize(),
        nullptr,
        &pixel_shader_);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreatePixelShader");
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

    const std::uint64_t pixel_count =
        static_cast<std::uint64_t>(overlay.width) * overlay.height;
    if (pixel_count > (static_cast<std::uint64_t>(SIZE_MAX) / 4u)) {
        error = L"overlay is too large";
        return false;
    }

    const std::size_t expected =
        static_cast<std::size_t>(pixel_count * 4u);
    if (overlay.rgba->size() != expected) {
        error = L"overlay payload size does not match dimensions";
        return false;
    }

    ++overlay_cache_clock_;

    const void* identity = overlay.rgba.get();
    for (auto& entry : overlay_cache_) {
        if (entry.srv &&
            entry.identity == identity &&
            entry.generation == overlay.generation &&
            entry.width == overlay.width &&
            entry.height == overlay.height) {
            entry.last_used = overlay_cache_clock_;
            srv = entry.srv;
            texture_width = entry.width;
            texture_height = entry.height;
            ++stats_.overlay_cache_hits;
            return true;
        }
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
    HRESULT hr = device_->CreateTexture2D(
        &desc,
        &data,
        &texture);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateTexture2D overlay");
        return false;
    }

    hr = device_->CreateShaderResourceView(
        texture.Get(),
        nullptr,
        &srv);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateShaderResourceView overlay");
        return false;
    }

    std::size_t slot = 0;
    for (std::size_t index = 1; index < overlay_cache_.size(); ++index) {
        if (!overlay_cache_[index].srv) {
            slot = index;
            break;
        }
        if (overlay_cache_[index].last_used <
            overlay_cache_[slot].last_used) {
            slot = index;
        }
    }

    overlay_cache_[slot].identity = identity;
    overlay_cache_[slot].generation = overlay.generation;
    overlay_cache_[slot].width = overlay.width;
    overlay_cache_[slot].height = overlay.height;
    overlay_cache_[slot].last_used = overlay_cache_clock_;
    overlay_cache_[slot].srv = srv;

    texture_width = overlay.width;
    texture_height = overlay.height;
    ++stats_.overlay_uploads;
    return true;
}

bool D3D11Compositor::compose_capture(
    ID3D11Texture2D* capture,
    const std::vector<GpuOverlay>& overlays,
    std::wstring& error) {
    error.clear();

    if (!capture || !device_ || !context_ ||
        !output_texture_ || !output_rtv_ ||
        !vertex_shader_ || !pixel_shader_ ||
        !input_layout_ || !vertex_buffer_ ||
        !constant_buffer_ || !blend_state_ || !sampler_state_) {
        ++stats_.rejected_frames;
        error = L"compositor pipeline is not initialized";
        return false;
    }

    D3D11_TEXTURE2D_DESC capture_desc{};
    capture->GetDesc(&capture_desc);
    if (capture_desc.Width != width_ ||
        capture_desc.Height != height_ ||
        capture_desc.Format != DXGI_FORMAT_B8G8R8A8_UNORM) {
        ++stats_.rejected_frames;
        error = L"capture texture format/size is incompatible with compositor";
        return false;
    }

    context_->CopyResource(output_texture_.Get(), capture);

    if (!overlays.empty()) {
        const UINT stride = sizeof(Vertex);
        const UINT offset = 0;
        const float blend_factor[4] = {0, 0, 0, 0};

        context_->OMSetRenderTargets(
            1,
            output_rtv_.GetAddressOf(),
            nullptr);
        context_->OMSetBlendState(
            blend_state_.Get(),
            blend_factor,
            0xffffffffu);

        context_->IASetInputLayout(input_layout_.Get());
        context_->IASetVertexBuffers(
            0,
            1,
            vertex_buffer_.GetAddressOf(),
            &stride,
            &offset);
        context_->IASetPrimitiveTopology(
            D3D11_PRIMITIVE_TOPOLOGY_TRIANGLESTRIP);

        context_->VSSetShader(vertex_shader_.Get(), nullptr, 0);
        context_->PSSetShader(pixel_shader_.Get(), nullptr, 0);
        context_->PSSetSamplers(
            0,
            1,
            sampler_state_.GetAddressOf());

        D3D11_VIEWPORT viewport{};
        viewport.Width = static_cast<float>(width_);
        viewport.Height = static_cast<float>(height_);
        viewport.MinDepth = 0.0f;
        viewport.MaxDepth = 1.0f;
        context_->RSSetViewports(1, &viewport);

        for (const auto& overlay : overlays) {
            ComPtr<ID3D11ShaderResourceView> overlay_srv;
            std::uint32_t tex_width = 0;
            std::uint32_t tex_height = 0;
            if (!upload_overlay(
                    overlay,
                    overlay_srv,
                    tex_width,
                    tex_height,
                    error)) {
                ID3D11ShaderResourceView* null_srv = nullptr;
                context_->PSSetShaderResources(0, 1, &null_srv);
                return false;
            }

            const float scaled_width =
                static_cast<float>(tex_width) * std::max(0.001f, overlay.scale);
            const float scaled_height =
                static_cast<float>(tex_height) * std::max(0.001f, overlay.scale);

            CompositeConstants constants{};
            constants.rect[0] = static_cast<float>(overlay.x);
            constants.rect[1] = static_cast<float>(overlay.y);
            constants.rect[2] = scaled_width;
            constants.rect[3] = scaled_height;
            constants.output_size[0] = static_cast<float>(width_);
            constants.output_size[1] = static_cast<float>(height_);
            constants.opacity = std::clamp(overlay.opacity, 0.0f, 1.0f);

            context_->UpdateSubresource(
                constant_buffer_.Get(),
                0,
                nullptr,
                &constants,
                0,
                0);

            context_->VSSetConstantBuffers(
                0,
                1,
                constant_buffer_.GetAddressOf());
            context_->PSSetConstantBuffers(
                0,
                1,
                constant_buffer_.GetAddressOf());
            context_->PSSetShaderResources(
                0,
                1,
                overlay_srv.GetAddressOf());
            context_->Draw(4, 0);

            ID3D11ShaderResourceView* null_srv = nullptr;
            context_->PSSetShaderResources(0, 1, &null_srv);
        }

        ID3D11RenderTargetView* null_rtv = nullptr;
        context_->OMSetRenderTargets(1, &null_rtv, nullptr);
    }

    ++stats_.composed_frames;
    return true;
}

bool D3D11Compositor::copy_output_to_cpu(
    std::shared_ptr<std::vector<std::uint8_t>>& pixels,
    std::wstring& error) {
    error.clear();
    pixels.reset();

    if (!output_texture_ || !device_ || !context_ ||
        width_ == 0 || height_ == 0) {
        error = L"compositor output is not initialized";
        return false;
    }

    D3D11_TEXTURE2D_DESC desc{};
    output_texture_->GetDesc(&desc);
    desc.Usage = D3D11_USAGE_STAGING;
    desc.BindFlags = 0;
    desc.CPUAccessFlags = D3D11_CPU_ACCESS_READ;
    desc.MiscFlags = 0;

    ComPtr<ID3D11Texture2D> staging;
    HRESULT hr = device_->CreateTexture2D(&desc, nullptr, &staging);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"CreateTexture2D staging output");
        return false;
    }

    context_->CopyResource(staging.Get(), output_texture_.Get());

    D3D11_MAPPED_SUBRESOURCE mapped{};
    hr = context_->Map(staging.Get(), 0, D3D11_MAP_READ, 0, &mapped);
    if (FAILED(hr)) {
        error = hresult_error(hr, L"Map staging output");
        return false;
    }

    try {
        const std::size_t row_bytes =
            static_cast<std::size_t>(width_) * 4u;
        const std::size_t total_bytes =
            row_bytes * static_cast<std::size_t>(height_);
        auto result = std::make_shared<std::vector<std::uint8_t>>(total_bytes);
        auto* source = static_cast<const std::uint8_t*>(mapped.pData);

        for (std::uint32_t row = 0; row < height_; ++row) {
            std::memcpy(
                result->data() + static_cast<std::size_t>(row) * row_bytes,
                source + static_cast<std::size_t>(row) * mapped.RowPitch,
                row_bytes);
        }

        context_->Unmap(staging.Get(), 0);
        pixels = std::move(result);
        ++stats_.cpu_readbacks;
        return true;
    } catch (...) {
        context_->Unmap(staging.Get(), 0);
        error = L"failed to allocate CPU output frame";
        return false;
    }
}

} // namespace cari::native
