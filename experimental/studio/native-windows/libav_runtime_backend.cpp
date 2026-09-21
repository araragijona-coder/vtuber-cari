#include "libav_runtime_backend.h"

extern "C" {
#include <libavcodec/avcodec.h>
}

#include <string>

namespace cari::native {
namespace {

bool supports_d3d11_hw_frames(const AVCodec* codec) {
    if (codec == nullptr) {
        return false;
    }

    for (int index = 0;; ++index) {
        const AVCodecHWConfig* config = avcodec_get_hw_config(codec, index);
        if (config == nullptr) {
            break;
        }
        if ((config->methods & AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX) != 0 &&
            config->device_type == AV_HWDEVICE_TYPE_D3D11VA &&
            config->pix_fmt == AV_PIX_FMT_D3D11) {
            return true;
        }
    }
    return false;
}

const AVCodec* choose_d3d11_encoder() {
    constexpr const char* kCandidates[] = {
        "h264_nvenc",
        "h264_amf",
    };

    for (const char* name : kCandidates) {
        const AVCodec* codec = avcodec_find_encoder_by_name(name);
        if (supports_d3d11_hw_frames(codec)) {
            return codec;
        }
    }
    return nullptr;
}

} // namespace

LibavRuntimeBackend::~LibavRuntimeBackend() {
    stop();
}

bool LibavRuntimeBackend::configure(
    const cari::studio::core::OutputProfile& profile,
    std::uint32_t input_audio_sample_rate,
    std::uint16_t input_audio_channels) {
    stop();
    error_.clear();

    const auto validation = cari::studio::core::validate_output_profile(profile);
    if (!validation.valid) {
        error_ = validation.error;
        return false;
    }
    if (input_audio_sample_rate == 0 || input_audio_channels == 0) {
        error_ = "invalid Libav runtime audio format";
        return false;
    }

    profile_ = profile;
    input_audio_sample_rate_ = input_audio_sample_rate;
    input_audio_channels_ = input_audio_channels;
    configured_ = true;
    return true;
}

bool LibavRuntimeBackend::ensure_started(ID3D11Device* device) noexcept {
    if (!configured_) {
        error_ = "Libav runtime backend is not configured";
        return false;
    }
    if (output_.running()) {
        return true;
    }
    if (device == nullptr) {
        error_ = "Libav runtime backend requires a D3D11 device";
        return false;
    }

    try {
        const AVCodec* encoder = choose_d3d11_encoder();
        if (encoder == nullptr) {
            error_ =
                "no H.264 D3D11 hardware encoder is available in the FFmpeg build";
            return false;
        }

        profile_.video_codec = encoder->name;
        encoder_name_ = encoder->name;

        if (!output_.start_d3d11(
                profile_,
                device,
                input_audio_sample_rate_,
                input_audio_channels_)) {
            error_ = output_.last_error();
            encoder_name_.clear();
            return false;
        }
        return true;
    } catch (const std::exception& exception) {
        error_ = std::string("Libav runtime startup exception: ") + exception.what();
        return false;
    } catch (...) {
        error_ = "Libav runtime startup unknown exception";
        return false;
    }
}

bool LibavRuntimeBackend::submit_video(
    const cari::studio::core::Frame& frame,
    ID3D11Texture2D* texture) noexcept {
    if (!output_.running()) {
        error_ = "Libav runtime video submitted before output startup";
        return false;
    }

    try {
        if (!output_.submit_video_d3d11(frame, texture)) {
            error_ = output_.last_error();
            return false;
        }
        return true;
    } catch (const std::exception& exception) {
        error_ = std::string("Libav runtime video exception: ") + exception.what();
        return false;
    } catch (...) {
        error_ = "Libav runtime video unknown exception";
        return false;
    }
}

bool LibavRuntimeBackend::submit_audio(
    const cari::studio::core::AudioPacket& packet) noexcept {
    if (!output_.running()) {
        return false;
    }

    try {
        if (!output_.submit_audio(packet)) {
            error_ = output_.last_error();
            return false;
        }
        return true;
    } catch (const std::exception& exception) {
        error_ = std::string("Libav runtime audio exception: ") + exception.what();
        return false;
    } catch (...) {
        error_ = "Libav runtime audio unknown exception";
        return false;
    }
}

void LibavRuntimeBackend::stop() noexcept {
    output_.stop();
    configured_ = false;
    encoder_name_.clear();
}

std::string LibavRuntimeBackend::last_error() const {
    if (!error_.empty()) {
        return error_;
    }
    return output_.last_error();
}

} // namespace cari::native
