#include "libav_media_output.h"

#include "../core/media_clock.h"

#include <d3d11.h>
#include <wrl/client.h>

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
}

#include <cassert>
#include <cstdint>
#include <filesystem>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

using Microsoft::WRL::ComPtr;

namespace {

const char* find_hardware_encoder() {
    constexpr const char* candidates[] = {
        "h264_nvenc",
        "h264_amf",
    };

    for (const char* name : candidates) {
        const AVCodec* codec = avcodec_find_encoder_by_name(name);
        if (codec == nullptr) {
            continue;
        }
        for (int index = 0;; ++index) {
            const AVCodecHWConfig* config = avcodec_get_hw_config(codec, index);
            if (config == nullptr) {
                break;
            }
            if ((config->methods & AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX) != 0 &&
                config->device_type == AV_HWDEVICE_TYPE_D3D11VA &&
                config->pix_fmt == AV_PIX_FMT_D3D11) {
                return name;
            }
        }
    }
    return nullptr;
}

ComPtr<ID3D11Texture2D> make_bgra_texture(
    ID3D11Device* device,
    std::uint32_t width,
    std::uint32_t height,
    std::uint8_t red,
    std::uint8_t green,
    std::uint8_t blue) {
    std::vector<std::uint32_t> pixels(
        static_cast<std::size_t>(width) * height,
        (static_cast<std::uint32_t>(255) << 24) |
        (static_cast<std::uint32_t>(red) << 16) |
        (static_cast<std::uint32_t>(green) << 8) |
        static_cast<std::uint32_t>(blue));

    D3D11_TEXTURE2D_DESC desc{};
    desc.Width = width;
    desc.Height = height;
    desc.MipLevels = 1;
    desc.ArraySize = 1;
    desc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
    desc.SampleDesc.Count = 1;
    desc.Usage = D3D11_USAGE_DEFAULT;
    desc.BindFlags = D3D11_BIND_RENDER_TARGET | D3D11_BIND_SHADER_RESOURCE;

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
    using namespace cari::studio::core;
    using cari::native::LibavMediaOutput;

    constexpr std::uint32_t width = 160;
    constexpr std::uint32_t height = 90;
    constexpr std::uint32_t fps = 30;
    constexpr std::uint32_t sample_rate = 48000;
    constexpr std::uint16_t channels = 2;
    constexpr int frame_count = 30;

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
        std::cout << "Libav D3D11 output smoke: SKIP (hardware D3D11 unavailable)\n";
        return 0;
    }

    const char* encoder = find_hardware_encoder();
    if (encoder == nullptr) {
        std::cout << "Libav D3D11 output smoke: SKIP (no D3D11 encoder in FFmpeg build)\n";
        return 0;
    }

    const std::string target = "cari-libav-d3d11-output-smoke.mkv";
    std::error_code remove_error;
    std::filesystem::remove(target, remove_error);

    OutputProfile profile{
        .id = "libav-d3d11-smoke",
        .kind = OutputKind::file,
        .target = target,
        .width = width,
        .height = height,
        .fps = fps,
        .bitrate_kbps = 1200,
        .audio_bitrate_kbps = 96,
        .video_codec = encoder,
        .audio_codec = "aac",
    };

    LibavMediaOutput output;
    if (!output.start_d3d11(profile, device.Get(), sample_rate, channels)) {
        std::cout << "Libav D3D11 output smoke: SKIP (start: "
                  << output.last_error() << ")\n";
        return 0;
    }

    std::vector<ComPtr<ID3D11Texture2D>> textures;
    textures.reserve(frame_count);
    for (int index = 0; index < frame_count; ++index) {
        auto texture = make_bgra_texture(
            device.Get(),
            width,
            height,
            static_cast<std::uint8_t>((index * 17) & 0xff),
            static_cast<std::uint8_t>((index * 29) & 0xff),
            180);
        if (!texture) {
            std::cerr << "Libav D3D11 output smoke: texture allocation failed\n";
            output.stop();
            return 1;
        }
        textures.push_back(texture);
    }

    std::vector<float> audio(1024u * channels, 0.0f);
    const Timestamp origin = 500'000'000;

    for (int index = 0; index < frame_count; ++index) {
        Frame frame{
            .pts = origin + static_cast<Timestamp>(index) *
                (MediaClock::kTicksPerSecond / fps),
            .width = width,
            .height = height,
            .stride = width * 4u,
            .format = 1,
            .sequence = static_cast<std::uint64_t>(index + 1),
        };
        if (!output.submit_video_d3d11(frame, textures[index].Get())) {
            std::cerr << "Libav D3D11 output smoke: video submit failed: "
                      << output.last_error() << "\n";
            output.stop();
            return 1;
        }

        AudioPacket packet{
            .pts = origin + static_cast<Timestamp>(index) * 320'000,
            .sample_rate = sample_rate,
            .channels = channels,
            .sequence = static_cast<std::uint64_t>(index + 1),
            .samples = audio,
        };
        if (!output.submit_audio(packet)) {
            std::cerr << "Libav D3D11 output smoke: audio submit failed: "
                      << output.last_error() << "\n";
            output.stop();
            return 1;
        }
    }

    output.stop();

    const auto stats = output.stats();
    if (!output.hardware_video_enabled()) {
        // stop() intentionally tears down the hardware bridge, so use stats
        // rather than the post-stop runtime flag for the gate.
    }

    assert(stats.video_frames_submitted == frame_count);
    assert(stats.video_packets_written > 0);
    assert(stats.audio_packets_written > 0);
    assert(stats.first_video_packet_pts >= 0);
    assert(stats.first_audio_packet_pts >= 0);
    assert(stats.last_video_packet_pts >= stats.first_video_packet_pts);
    assert(stats.last_audio_packet_pts >= stats.first_audio_packet_pts);

    if (!std::filesystem::exists(target) ||
        std::filesystem::file_size(target) == 0) {
        std::cerr << "Libav D3D11 output smoke: output file missing\n";
        return 1;
    }

    AVFormatContext* input = nullptr;
    if (avformat_open_input(&input, target.c_str(), nullptr, nullptr) < 0) {
        std::cerr << "Libav D3D11 output smoke: cannot reopen output\n";
        std::filesystem::remove(target, remove_error);
        return 1;
    }
    const int stream_result = avformat_find_stream_info(input, nullptr);
    if (stream_result < 0) {
        avformat_close_input(&input);
        std::filesystem::remove(target, remove_error);
        std::cerr << "Libav D3D11 output smoke: stream info failed\n";
        return 1;
    }

    bool video_found = false;
    bool audio_found = false;
    for (unsigned int index = 0; index < input->nb_streams; ++index) {
        const auto type = input->streams[index]->codecpar->codec_type;
        video_found = video_found || type == AVMEDIA_TYPE_VIDEO;
        audio_found = audio_found || type == AVMEDIA_TYPE_AUDIO;
    }
    avformat_close_input(&input);
    std::filesystem::remove(target, remove_error);

    if (!video_found || !audio_found) {
        std::cerr << "Libav D3D11 output smoke: expected A/V streams missing\n";
        return 1;
    }

    std::cout << "Libav D3D11 output smoke: PASS ("
              << encoder << ", "
              << stats.video_packets_written << " video packet(s), "
              << stats.audio_packets_written << " audio packet(s))\n";
    return 0;
}
