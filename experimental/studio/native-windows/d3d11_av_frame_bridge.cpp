#include "d3d11_av_frame_bridge.h"

extern "C" {
#include <libavutil/hwcontext.h>
#include <libavutil/hwcontext_d3d11va.h>
#include <libavutil/mem.h>
#include <libavutil/pixfmt.h>
}

#include <cstdint>

namespace cari::native {
namespace {

void release_texture(void* opaque, std::uint8_t* data) {
    auto* texture = static_cast<ID3D11Texture2D*>(opaque);
    if (texture != nullptr) {
        texture->Release();
    }
    av_free(data);
}

} // namespace

D3D11AvFrameBridge::~D3D11AvFrameBridge() {
    reset();
}

bool D3D11AvFrameBridge::initialize(
    ID3D11Device* device,
    std::uint32_t width,
    std::uint32_t height,
    std::string& error) {
    reset();
    error.clear();

    if (device == nullptr || width == 0 || height == 0) {
        error = "invalid D3D11 frame bridge arguments";
        return false;
    }

    AVBufferRef* device_ref = av_hwdevice_ctx_alloc(AV_HWDEVICE_TYPE_D3D11VA);
    if (device_ref == nullptr) {
        error = "av_hwdevice_ctx_alloc(D3D11VA) failed";
        return false;
    }

    auto* device_ctx =
        reinterpret_cast<AVHWDeviceContext*>(device_ref->data);
    auto* d3d11_ctx =
        static_cast<AVD3D11VADeviceContext*>(device_ctx->hwctx);

    device->AddRef();
    d3d11_ctx->device = device;

    const int device_result = av_hwdevice_ctx_init(device_ref);
    if (device_result < 0) {
        av_buffer_unref(&device_ref);
        error = "av_hwdevice_ctx_init(D3D11VA) failed";
        return false;
    }

    AVBufferRef* frames_ref = av_hwframe_ctx_alloc(device_ref);
    if (frames_ref == nullptr) {
        av_buffer_unref(&device_ref);
        error = "av_hwframe_ctx_alloc(D3D11VA) failed";
        return false;
    }

    auto* frames_ctx =
        reinterpret_cast<AVHWFramesContext*>(frames_ref->data);
    frames_ctx->format = AV_PIX_FMT_D3D11;
    frames_ctx->sw_format = AV_PIX_FMT_BGRA;
    frames_ctx->width = static_cast<int>(width);
    frames_ctx->height = static_cast<int>(height);
    frames_ctx->initial_pool_size = 0;

    const int frames_result = av_hwframe_ctx_init(frames_ref);
    if (frames_result < 0) {
        av_buffer_unref(&frames_ref);
        av_buffer_unref(&device_ref);
        error = "av_hwframe_ctx_init(D3D11VA) failed";
        return false;
    }

    device_ = device;
    device_ref_ = device_ref;
    frames_ref_ = frames_ref;
    width_ = width;
    height_ = height;
    return true;
}

void D3D11AvFrameBridge::reset() noexcept {
    if (frames_ref_ != nullptr) {
        av_buffer_unref(&frames_ref_);
    }
    if (device_ref_ != nullptr) {
        av_buffer_unref(&device_ref_);
    }
    device_ = nullptr;
    width_ = 0;
    height_ = 0;
}

AVFrame* D3D11AvFrameBridge::wrap_texture(
    ID3D11Texture2D* texture,
    std::int64_t pts,
    std::intptr_t subresource_index,
    std::string& error) const {
    error.clear();

    if (!initialized() || texture == nullptr) {
        error = "D3D11 frame bridge is not initialized";
        return nullptr;
    }

    D3D11_TEXTURE2D_DESC desc{};
    texture->GetDesc(&desc);
    if (desc.Width != width_ ||
        desc.Height != height_ ||
        desc.Format != DXGI_FORMAT_B8G8R8A8_UNORM) {
        error = "D3D11 texture dimensions/format do not match bridge";
        return nullptr;
    }

    AVFrame* frame = av_frame_alloc();
    if (frame == nullptr) {
        error = "av_frame_alloc failed";
        return nullptr;
    }

    auto* descriptor =
        static_cast<AVD3D11FrameDescriptor*>(
            av_mallocz(sizeof(AVD3D11FrameDescriptor)));
    if (descriptor == nullptr) {
        av_frame_free(&frame);
        error = "failed to allocate D3D11 frame descriptor";
        return nullptr;
    }

    texture->AddRef();
    descriptor->texture = texture;
    descriptor->index = subresource_index;

    AVBufferRef* buffer = av_buffer_create(
        reinterpret_cast<std::uint8_t*>(descriptor),
        sizeof(*descriptor),
        release_texture,
        texture,
        0);
    if (buffer == nullptr) {
        texture->Release();
        av_free(descriptor);
        av_frame_free(&frame);
        error = "av_buffer_create for D3D11 texture failed";
        return nullptr;
    }

    frame->buf[0] = buffer;
    frame->data[0] = reinterpret_cast<std::uint8_t*>(texture);
    frame->data[1] =
        reinterpret_cast<std::uint8_t*>(subresource_index);
    frame->format = AV_PIX_FMT_D3D11;
    frame->width = static_cast<int>(width_);
    frame->height = static_cast<int>(height_);
    frame->pts = pts;
    frame->hw_frames_ctx = av_buffer_ref(frames_ref_);

    if (frame->hw_frames_ctx == nullptr) {
        av_frame_free(&frame);
        error = "av_buffer_ref(hw_frames_ctx) failed";
        return nullptr;
    }

    return frame;
}

} // namespace cari::native
