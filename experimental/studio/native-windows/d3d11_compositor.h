#pragma once

#include <d3d11.h>
#include <wrl/client.h>

#include <cstdint>
#include <memory>
#include <string>
#include <vector>

namespace cari::native {

struct GpuOverlay {
    std::uint32_t width = 0;
    std::uint32_t height = 0;
    std::shared_ptr<std::vector<std::uint8_t>> rgba;
    float opacity = 1.0f;
    std::int32_t x = 0;
    std::int32_t y = 0;
    float scale = 1.0f;
};

struct D3D11CompositorStats {
    std::uint64_t composed_frames = 0;
    std::uint64_t overlay_uploads = 0;
    std::uint64_t rejected_frames = 0;
    std::uint64_t cpu_readbacks = 0;
    std::uint64_t shader_failures = 0;
};

class D3D11Compositor final {
public:
    D3D11Compositor() = default;
    ~D3D11Compositor() = default;

    D3D11Compositor(const D3D11Compositor&) = delete;
    D3D11Compositor& operator=(const D3D11Compositor&) = delete;

    bool initialize(
        ID3D11Device* device,
        ID3D11DeviceContext* context,
        std::uint32_t width,
        std::uint32_t height,
        std::wstring& error);

    bool compose_capture(
        ID3D11Texture2D* capture,
        const std::vector<GpuOverlay>& overlays,
        std::wstring& error);

    bool copy_output_to_cpu(
        std::shared_ptr<std::vector<std::uint8_t>>& pixels,
        std::wstring& error);

    [[nodiscard]] ID3D11Texture2D* output_texture() const noexcept {
        return output_texture_.Get();
    }

    [[nodiscard]] ID3D11ShaderResourceView* output_srv() const noexcept {
        return output_srv_.Get();
    }

    [[nodiscard]] const D3D11CompositorStats& stats() const noexcept {
        return stats_;
    }

private:
    bool ensure_output(
        std::uint32_t width,
        std::uint32_t height,
        std::wstring& error);

    bool ensure_pipeline(std::wstring& error);

    bool upload_overlay(
        const GpuOverlay& overlay,
        Microsoft::WRL::ComPtr<ID3D11ShaderResourceView>& srv,
        std::uint32_t& texture_width,
        std::uint32_t& texture_height,
        std::wstring& error);

    static std::wstring hresult_error(HRESULT hr, const wchar_t* operation);
    static std::wstring shader_error(ID3DBlob* errors, const wchar_t* fallback);

    Microsoft::WRL::ComPtr<ID3D11Device> device_;
    Microsoft::WRL::ComPtr<ID3D11DeviceContext> context_;

    Microsoft::WRL::ComPtr<ID3D11Texture2D> output_texture_;
    Microsoft::WRL::ComPtr<ID3D11RenderTargetView> output_rtv_;
    Microsoft::WRL::ComPtr<ID3D11ShaderResourceView> output_srv_;

    Microsoft::WRL::ComPtr<ID3D11VertexShader> vertex_shader_;
    Microsoft::WRL::ComPtr<ID3D11PixelShader> pixel_shader_;
    Microsoft::WRL::ComPtr<ID3D11InputLayout> input_layout_;
    Microsoft::WRL::ComPtr<ID3D11Buffer> vertex_buffer_;
    Microsoft::WRL::ComPtr<ID3D11Buffer> constant_buffer_;
    Microsoft::WRL::ComPtr<ID3D11BlendState> blend_state_;
    Microsoft::WRL::ComPtr<ID3D11SamplerState> sampler_state_;

    std::uint32_t width_ = 0;
    std::uint32_t height_ = 0;
    D3D11CompositorStats stats_{};
};

} // namespace cari::native
