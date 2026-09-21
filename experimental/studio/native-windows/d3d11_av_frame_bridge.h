#pragma once

#include <d3d11.h>
#include <wrl/client.h>

#include <cstdint>
#include <string>

extern "C" {
#include <libavutil/frame.h>
}

namespace cari::native {

// Experimental adapter from an existing Cari D3D11 output texture to an
// FFmpeg hardware AVFrame. It never performs a CPU readback.
// The texture must remain valid until the returned AVFrame is freed.
class D3D11AvFrameBridge final {
public:
    D3D11AvFrameBridge() = default;
    ~D3D11AvFrameBridge();

    D3D11AvFrameBridge(const D3D11AvFrameBridge&) = delete;
    D3D11AvFrameBridge& operator=(const D3D11AvFrameBridge&) = delete;

    bool initialize(
        ID3D11Device* device,
        std::uint32_t width,
        std::uint32_t height,
        std::string& error);

    void reset() noexcept;

    [[nodiscard]] AVFrame* wrap_texture(
        ID3D11Texture2D* texture,
        std::int64_t pts,
        std::intptr_t subresource_index,
        std::string& error) const;

    // Allocate a frame from FFmpeg's D3D11 hardware-frame pool and copy the
    // supplied texture into that pool-owned surface on the GPU. This avoids
    // reusing a compositor surface while an encoder may still reference it.
    [[nodiscard]] AVFrame* copy_texture_to_hwframe(
        ID3D11Texture2D* texture,
        std::int64_t pts,
        std::string& error) const;

    [[nodiscard]] bool initialized() const noexcept {
        return device_ != nullptr && frames_ref_ != nullptr;
    }

    [[nodiscard]] AVBufferRef* frames_ref() const noexcept {
        return frames_ref_;
    }

private:
    ID3D11Device* device_ = nullptr;
    Microsoft::WRL::ComPtr<ID3D11DeviceContext> context_;
    AVBufferRef* device_ref_ = nullptr;
    AVBufferRef* frames_ref_ = nullptr;
    std::uint32_t width_ = 0;
    std::uint32_t height_ = 0;
};

} // namespace cari::native
