#include "d3d11_av_frame_bridge.h"

#include <d3d11.h>
#include <wrl/client.h>

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavutil/error.h>
#include <libavutil/frame.h>
#include <libavutil/hwcontext.h>
#include <libavutil/pixfmt.h>
}

#include <cstdint>
#include <cstdio>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

using Microsoft::WRL::ComPtr;

namespace {

std::string ffmpeg_error(int code) {
    char buffer[AV_ERROR_MAX_STRING_SIZE]{};
    av_strerror(code, buffer, sizeof(buffer));
    return buffer;
}

const AVCodec* find_d3d11_encoder() {
    const char* candidates[] = {
        "h264_nvenc",
        "h264_amf",
        nullptr,
    };

    for (const char* name : candidates) {
        const AVCodec* codec = avcodec_find_encoder_by_name(name);
        if (codec == nullptr) {
            continue;
        }

        for (int index = 0;; ++index) {
            const AVCodecHWConfig* config =
                avcodec_get_hw_config(codec, index);
            if (config == nullptr) {
                break;
            }
            if ((config->methods & AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX) != 0 &&
                config->device_type == AV_HWDEVICE_TYPE_D3D11VA &&
                config->pix_fmt == AV_PIX_FMT_D3D11) {
                return codec;
            }
        }
    }

    return nullptr;
}

ComPtr<ID3D11Texture2D> make_texture(
    ID3D11Device* device,
    std::uint32_t width,
    std::uint32_t height,
    std::uint8_t red,
    std::uint8_t green,
    std::uint8_t blue) {
    D3D11_TEXTURE2D_DESC desc{};
    desc.Width = width;
    desc.Height = height;
    desc.MipLevels = 1;
    desc.ArraySize = 1;
    desc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
    desc.SampleDesc.Count = 1;
    desc.Usage = D3D11_USAGE_DEFAULT;
    desc.BindFlags = D3D11_BIND_RENDER_TARGET | D3D11_BIND_SHADER_RESOURCE;

    std::vector<std::uint32_t> pixels(
        static_cast<std::size_t>(width) * height,
        (static_cast<std::uint32_t>(255) << 24) |
        (static_cast<std::uint32_t>(red) << 16) |
        (static_cast<std::uint32_t>(green) << 8) |
        static_cast<std::uint32_t>(blue));

    D3D11_SUBRESOURCE_DATA data{};
    data.pSysMem = pixels.data();
    data.SysMemPitch = width * 4u;

    ComPtr<ID3D11Texture2D> texture;
    if (FAILED(device->CreateTexture2D(&desc, &data, &texture))) {
        return nullptr;
    }
    return texture;
}

} // namespace

int main() {
    constexpr std::uint32_t width = 160;
    constexpr std::uint32_t height = 90;
    constexpr int fps = 30;
    constexpr int frame_count = 12;

    D3D_FEATURE_LEVEL feature_level{};
    ComPtr<ID3D11Device> device;
    ComPtr<ID3D11DeviceContext> context;

    const HRESULT d3d_result = D3D11CreateDevice(
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

    if (FAILED(d3d_result) || !device || !context) {
        std::cout << "D3D11 hardware encoder smoke: SKIP (hardware D3D11 unavailable)\n";
        return 0;
    }

    const AVCodec* encoder = find_d3d11_encoder();
    if (encoder == nullptr) {
        std::cout << "D3D11 hardware encoder smoke: SKIP (no D3D11 hardware encoder in FFmpeg build)\n";
        return 0;
    }

    cari::native::D3D11AvFrameBridge bridge;
    std::string error;
    if (!bridge.initialize(device.Get(), width, height, error)) {
        std::cout << "D3D11 hardware encoder smoke: SKIP (bridge init: "
                  << error << ")\n";
        return 0;
    }

    AVCodecContext* codec = avcodec_alloc_context3(encoder);
    if (codec == nullptr) {
        std::cerr << "D3D11 hardware encoder smoke: allocation failed\n";
        return 1;
    }

    codec->width = static_cast<int>(width);
    codec->height = static_cast<int>(height);
    codec->pix_fmt = AV_PIX_FMT_D3D11;
    codec->time_base = AVRational{1, fps};
    codec->framerate = AVRational{fps, 1};
    codec->bit_rate = 1'000'000;
    codec->gop_size = fps * 2;
    codec->max_b_frames = 0;
    codec->hw_frames_ctx = av_buffer_ref(bridge.frames_ref());

    if (codec->hw_frames_ctx == nullptr) {
        std::cerr << "D3D11 hardware encoder smoke: hw_frames_ctx allocation failed\n";
        avcodec_free_context(&codec);
        return 1;
    }

    const int open_result = avcodec_open2(codec, encoder, nullptr);
    if (open_result < 0) {
        std::cout << "D3D11 hardware encoder smoke: SKIP (encoder open: "
                  << ffmpeg_error(open_result) << ")\n";
        avcodec_free_context(&codec);
        return 0;
    }

    std::vector<ComPtr<ID3D11Texture2D>> textures;
    textures.reserve(frame_count);
    for (int index = 0; index < frame_count; ++index) {
        auto texture = make_texture(
            device.Get(),
            width,
            height,
            static_cast<std::uint8_t>((index * 31) & 0xff),
            static_cast<std::uint8_t>((index * 17) & 0xff),
            200);
        if (!texture) {
            std::cerr << "D3D11 hardware encoder smoke: texture allocation failed\n";
            avcodec_free_context(&codec);
            return 1;
        }
        textures.push_back(texture);
    }

    AVPacket* packet = av_packet_alloc();
    if (packet == nullptr) {
        avcodec_free_context(&codec);
        return 1;
    }

    std::uint64_t packets = 0;
    for (int index = 0; index < frame_count; ++index) {
        AVFrame* frame = bridge.wrap_texture(
            textures[index].Get(),
            index,
            0,
            error);
        if (frame == nullptr) {
            std::cerr << "D3D11 hardware encoder smoke: wrap failed: "
                      << error << "\n";
            av_packet_free(&packet);
            avcodec_free_context(&codec);
            return 1;
        }

        const int send_result = avcodec_send_frame(codec, frame);
        av_frame_free(&frame);
        if (send_result < 0) {
            std::cerr << "D3D11 hardware encoder smoke: send failed: "
                      << ffmpeg_error(send_result) << "\n";
            av_packet_free(&packet);
            avcodec_free_context(&codec);
            return 1;
        }

        for (;;) {
            const int receive_result = avcodec_receive_packet(codec, packet);
            if (receive_result == AVERROR(EAGAIN) ||
                receive_result == AVERROR_EOF) {
                break;
            }
            if (receive_result < 0) {
                std::cerr << "D3D11 hardware encoder smoke: receive failed: "
                          << ffmpeg_error(receive_result) << "\n";
                av_packet_free(&packet);
                avcodec_free_context(&codec);
                return 1;
            }

            if (packet->pts != AV_NOPTS_VALUE) {
                ++packets;
            }
            av_packet_unref(packet);
        }
    }

    if (avcodec_send_frame(codec, nullptr) < 0) {
        std::cerr << "D3D11 hardware encoder smoke: encoder flush failed\n";
        av_packet_free(&packet);
        avcodec_free_context(&codec);
        return 1;
    }

    for (;;) {
        const int receive_result = avcodec_receive_packet(codec, packet);
        if (receive_result == AVERROR(EAGAIN) ||
            receive_result == AVERROR_EOF) {
            break;
        }
        if (receive_result < 0) {
            std::cerr << "D3D11 hardware encoder smoke: flush receive failed: "
                      << ffmpeg_error(receive_result) << "\n";
            av_packet_free(&packet);
            avcodec_free_context(&codec);
            return 1;
        }
        if (packet->pts != AV_NOPTS_VALUE) {
            ++packets;
        }
        av_packet_unref(packet);
    }

    av_packet_free(&packet);
    avcodec_free_context(&codec);

    if (packets == 0) {
        std::cerr << "D3D11 hardware encoder smoke: encoder produced no timestamped packets\n";
        return 1;
    }

    std::cout << "D3D11 hardware encoder smoke: PASS ("
              << encoder->name << ", " << packets
              << " timestamped packet(s))\n";
    return 0;
}
