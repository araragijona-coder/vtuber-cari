#include "d3d11_av_frame_bridge.h"

extern "C" {
#include <libavutil/hwcontext.h>
#include <libavutil/hwcontext_d3d11va.h>
#include <libavutil/mem.h>
#include <libavutil/pixfmt.h>
}

#include <cstdint>
#include <wrl/client.h>

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

    Microsoft::WRL::ComPtr<ID3D11DeviceContext> immediate_context;
    device->GetImmediateContext(&immediate_context);
    if (!immediate_context) {
        av_buffer_unref(&device_ref);
        error = "D3D11 device has no immediate context";
        return false;
    }

    device->AddRef();
    d3d11_ctx->device = device;
    immediate_context->AddRef();
    d3d11_ctx->device_context = immediate_context.Get();

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
    context_ = immediate_context;
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
    context_.Reset();
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

AVFrame* D3D11AvFrameBridge::copy_texture_to_hwframe(
    ID3D11Texture2D* texture,
    std::int64_t pts,
    std::string& error) const {
    error.clear();

    if (!initialized() || !context_ || texture == nullptr) {
        error = "D3D11 frame bridge is not ready for GPU copy";
        return nullptr;
    }

    D3D11_TEXTURE2D_DESC source_desc{};
    texture->GetDesc(&source_desc);
    if (source_desc.Width != width_ ||
        source_desc.Height != height_ ||
        source_desc.Format != DXGI_FORMAT_B8G8R8A8_UNORM ||
        source_desc.SampleDesc.Count != 1) {
        error = "D3D11 source texture is incompatible with hardware frame pool";
        return nullptr;
    }

    Microsoft::WRL::ComPtr<ID3D11Device> source_device;
    texture->GetDevice(&source_device);
    if (!source_device || source_device.Get() != device_) {
        error = "D3D11 source texture belongs to a different device";
        return nullptr;
    }

    AVFrame* frame = av_frame_alloc();
    if (frame == nullptr) {
        error = "av_frame_alloc failed";
        return nullptr;
    }

    frame->format = AV_PIX_FMT_D3D11;
    frame->width = static_cast<int>(width_);
    frame->height = static_cast<int>(height_);
    frame->hw_frames_ctx = av_buffer_ref(frames_ref_);
    if (frame->hw_frames_ctx == nullptr) {
        av_frame_free(&frame);
        error = "av_buffer_ref(hw_frames_ctx) failed";
        return nullptr;
    }

    const int result = av_hwframe_get_buffer(
        frame->hw_frames_ctx,
        frame,
        0);
    if (result < 0) {
        av_frame_free(&frame);
        error = std::string("av_hwframe_get_buffer failed: ") +
                std::to_string(result);
        return nullptr;
    }

    auto* destination = reinterpret_cast<ID3D11Texture2D*>(frame->data[0]);
    if (destination == nullptr) {
        av_frame_free(&frame);
        error = "FFmpeg returned a hardware frame without a D3D11 texture";
        return nullptr;
    }

    D3D11_TEXTURE2D_DESC destination_desc{};
    destination->GetDesc(&destination_desc);
    if (destination_desc.Width != source_desc.Width ||
        destination_desc.Height != source_desc.Height ||
        destination_desc.Format != source_desc.Format ||
        destination_desc.SampleDesc.Count != source_desc.SampleDesc.Count ||
        destination_desc.ArraySize != 1) {
        av_frame_free(&frame);
        error = "FFmpeg hardware frame texture does not match source";
        return nullptr;
    }

    // The bridge installs the same immediate context into both FFmpeg's D3D11
    // device context and the compositor-side copy path. CopyResource therefore
    // establishes an ordered GPU dependency without a CPU readback.
    context_->CopyResource(destination, texture);
    frame->pts = pts;
    return frame;
}

} // namespace cari::native
