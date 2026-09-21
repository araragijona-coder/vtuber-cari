#pragma once

#include "libav_media_output.h"

namespace cari::native {

// Experimental opt-in runtime backend for the GPU path:
//
// D3D11 capture/compositor texture
//          -> pool-owned AVFrame
//          -> D3D11-capable hardware encoder
//          -> libavformat output
//
// It remains separate from the default raw FFmpeg CLI path until Windows
// validation proves the complete chain.
class LibavRuntimeBackend final {
public:
    LibavRuntimeBackend() = default;
    ~LibavRuntimeBackend();

    LibavRuntimeBackend(const LibavRuntimeBackend&) = delete;
    LibavRuntimeBackend& operator=(const LibavRuntimeBackend&) = delete;

    bool configure(
        const cari::studio::core::OutputProfile& profile,
        std::uint32_t input_audio_sample_rate = 48000,
        std::uint16_t input_audio_channels = 2);

    bool ensure_started(ID3D11Device* device) noexcept;

    bool submit_video(
        const cari::studio::core::Frame& frame,
        ID3D11Texture2D* texture) noexcept;

    bool submit_audio(
        const cari::studio::core::AudioPacket& packet) noexcept;

    void stop() noexcept;

    [[nodiscard]] bool configured() const noexcept {
        return configured_;
    }

    [[nodiscard]] bool running() const noexcept {
        return output_.running();
    }

    [[nodiscard]] const std::string& encoder_name() const noexcept {
        return encoder_name_;
    }

    [[nodiscard]] std::string last_error() const;

    [[nodiscard]] LibavMediaOutputStats stats() const noexcept {
        return output_.stats();
    }

private:
    bool configured_ = false;
    std::uint32_t input_audio_sample_rate_ = 48000;
    std::uint16_t input_audio_channels_ = 2;
    cari::studio::core::OutputProfile profile_{};
    LibavMediaOutput output_{};
    std::string encoder_name_;
    std::string error_;
};

} // namespace cari::native
