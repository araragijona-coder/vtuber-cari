#include "libav_media_output.h"
#include "d3d11_av_frame_bridge.h"

extern "C" {
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/audio_fifo.h>
#include <libavutil/channel_layout.h>
#include <libavutil/error.h>
#include <libavutil/imgutils.h>
#include <libavutil/mathematics.h>
#include <libavutil/opt.h>
#include <libavutil/samplefmt.h>
#include <libswresample/swresample.h>
#include <libswscale/swscale.h>
}

#include <algorithm>
#include <cmath>
#include <cstring>
#include <mutex>
#include <utility>
#include <string_view>

namespace cari::native {
namespace {

constexpr AVRational kSourceTimeBase{1, 10'000'000};

std::string ffmpeg_error(int error_code) {
    char buffer[AV_ERROR_MAX_STRING_SIZE]{};
    av_strerror(error_code, buffer, sizeof(buffer));
    return std::string(buffer);
}

bool has_pix_fmt(const AVCodec* codec, AVPixelFormat format) {
    if (codec == nullptr || codec->pix_fmts == nullptr) {
        return false;
    }

    for (const auto* current = codec->pix_fmts;
         *current != AV_PIX_FMT_NONE;
         ++current) {
        if (*current == format) {
            return true;
        }
    }
    return false;
}

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

AVPixelFormat choose_video_format(const AVCodec* codec) {
    if (has_pix_fmt(codec, AV_PIX_FMT_YUV420P)) {
        return AV_PIX_FMT_YUV420P;
    }
    if (codec != nullptr && codec->pix_fmts != nullptr &&
        codec->pix_fmts[0] != AV_PIX_FMT_NONE) {
        return codec->pix_fmts[0];
    }
    return AV_PIX_FMT_YUV420P;
}

bool has_sample_fmt(const AVCodec* codec, AVSampleFormat format) {
    if (codec == nullptr || codec->sample_fmts == nullptr) {
        return false;
    }

    for (const auto* current = codec->sample_fmts;
         *current != AV_SAMPLE_FMT_NONE;
         ++current) {
        if (*current == format) {
            return true;
        }
    }
    return false;
}

AVSampleFormat choose_audio_format(const AVCodec* codec) {
    if (has_sample_fmt(codec, AV_SAMPLE_FMT_FLTP)) {
        return AV_SAMPLE_FMT_FLTP;
    }
    if (codec != nullptr && codec->sample_fmts != nullptr &&
        codec->sample_fmts[0] != AV_SAMPLE_FMT_NONE) {
        return codec->sample_fmts[0];
    }
    return AV_SAMPLE_FMT_FLTP;
}

std::int64_t normalize_pts(
    cari::studio::core::Timestamp pts,
    cari::studio::core::Timestamp origin) {
    if (pts < origin) {
        return 0;
    }
    return pts - origin;
}

} // namespace

struct LibavMediaOutput::Impl {
    mutable std::mutex mutex;

    AVFormatContext* format = nullptr;
    AVCodecContext* video_codec = nullptr;
    AVCodecContext* audio_codec = nullptr;
    AVStream* video_stream = nullptr;
    AVStream* audio_stream = nullptr;
    SwsContext* scaler = nullptr;
    SwrContext* resampler = nullptr;
    AVAudioFifo* audio_fifo = nullptr;
    AVFrame* video_frame = nullptr;
    AVFrame* audio_frame = nullptr;
    AVPacket* packet = nullptr;

    AVPixelFormat video_pixel_format = AV_PIX_FMT_YUV420P;
    AVSampleFormat audio_sample_format = AV_SAMPLE_FMT_FLTP;
    std::uint32_t input_audio_sample_rate = 0;
    std::uint16_t input_audio_channels = 0;
    std::uint32_t output_audio_sample_rate = 48000;

    cari::studio::core::Timestamp media_origin = -1;
    cari::studio::core::Timestamp next_audio_pts = 0;
    bool audio_pts_ready = false;
    bool header_written = false;
    bool running = false;
    bool network_initialized = false;
    bool hardware_video = false;
    std::unique_ptr<D3D11AvFrameBridge> d3d11_bridge;

    LibavMediaOutputStats stats{};
    std::string error;

    ~Impl() {
        stop_locked();
    }

    void set_error(const std::string& message) {
        error = message;
    }

    bool ensure_origin(cari::studio::core::Timestamp pts) {
        if (media_origin < 0) {
            media_origin = pts;
            stats.first_input_pts = pts;
        }
        return true;
    }

    bool write_packets_from_encoder(
        AVCodecContext* codec,
        AVStream* stream,
        bool video) {
        for (;;) {
            const int receive_result = avcodec_receive_packet(codec, packet);
            if (receive_result == AVERROR(EAGAIN) ||
                receive_result == AVERROR_EOF) {
                return true;
            }
            if (receive_result < 0) {
                set_error(
                    std::string("encoder receive failed: ") +
                    ffmpeg_error(receive_result));
                return false;
            }

            av_packet_rescale_ts(packet, codec->time_base, stream->time_base);
            packet->stream_index = stream->index;

            const std::int64_t packet_pts = packet->pts;
            if (packet_pts != AV_NOPTS_VALUE) {
                if (video) {
                    if (stats.first_video_packet_pts < 0) {
                        stats.first_video_packet_pts = packet_pts;
                    }
                } else if (stats.first_audio_packet_pts < 0) {
                    stats.first_audio_packet_pts = packet_pts;
                }
            }
            const int write_result =
                av_interleaved_write_frame(format, packet);
            av_packet_unref(packet);

            if (write_result < 0) {
                set_error(
                    std::string("mux write failed: ") +
                    ffmpeg_error(write_result));
                return false;
            }

            if (video) {
                ++stats.video_packets_written;
                stats.last_video_packet_pts = packet_pts;
            } else {
                ++stats.audio_packets_written;
                stats.last_audio_packet_pts = packet_pts;
            }
        }
    }

    bool encode_video(AVFrame* frame) {
        const int send_result = avcodec_send_frame(video_codec, frame);
        if (send_result < 0) {
            set_error(
                std::string("video encoder send failed: ") +
                ffmpeg_error(send_result));
            return false;
        }
        return write_packets_from_encoder(video_codec, video_stream, true);
    }

    bool encode_audio(AVFrame* frame) {
        const int send_result = avcodec_send_frame(audio_codec, frame);
        if (send_result < 0) {
            set_error(
                std::string("audio encoder send failed: ") +
                ffmpeg_error(send_result));
            return false;
        }
        return write_packets_from_encoder(audio_codec, audio_stream, false);
    }

    bool drain_audio_fifo(bool flush_remainder = false) {
        const int frame_size =
            audio_codec->frame_size > 0 ? audio_codec->frame_size : 1024;

        while (av_audio_fifo_size(audio_fifo) >= frame_size ||
               (flush_remainder && av_audio_fifo_size(audio_fifo) > 0)) {
            const int available = av_audio_fifo_size(audio_fifo);
            const int samples_to_encode =
                std::min(available, frame_size);

            av_frame_unref(audio_frame);
            audio_frame->format = audio_sample_format;
            audio_frame->sample_rate = static_cast<int>(audio_codec->sample_rate);
            audio_frame->nb_samples = samples_to_encode;
            if (av_channel_layout_copy(
                    &audio_frame->ch_layout,
                    &audio_codec->ch_layout) < 0) {
                set_error("failed to copy audio channel layout");
                return false;
            }

            int result = av_frame_get_buffer(audio_frame, 0);
            if (result < 0) {
                set_error(
                    std::string("audio frame allocation failed: ") +
                    ffmpeg_error(result));
                return false;
            }

            if (!audio_pts_ready) {
                next_audio_pts = 0;
                audio_pts_ready = true;
            }

            audio_frame->pts = next_audio_pts;
            if (av_audio_fifo_read(
                    audio_fifo,
                    reinterpret_cast<void**>(audio_frame->data),
                    samples_to_encode) < samples_to_encode) {
                set_error("audio fifo read returned fewer samples than requested");
                return false;
            }

            if (!encode_audio(audio_frame)) {
                return false;
            }
            next_audio_pts += samples_to_encode;
        }

        return true;
    }

    bool flush_resampler() {
        const int sample_rate = static_cast<int>(audio_codec->sample_rate);
        for (;;) {
            const int delayed =
                static_cast<int>(swr_get_delay(resampler, input_audio_sample_rate));
            const int capacity = static_cast<int>(
                av_rescale_rnd(
                    delayed + 1,
                    sample_rate,
                    input_audio_sample_rate,
                    AV_ROUND_UP));
            if (capacity <= 0) {
                return true;
            }

            std::uint8_t** output_data = nullptr;
            int output_linesize = 0;
            int result = av_samples_alloc_array_and_samples(
                &output_data,
                &output_linesize,
                audio_codec->ch_layout.nb_channels,
                capacity,
                audio_sample_format,
                0);
            if (result < 0) {
                set_error(
                    std::string("audio converter buffer allocation failed: ") +
                    ffmpeg_error(result));
                return false;
            }

            result = swr_convert(
                resampler,
                output_data,
                capacity,
                nullptr,
                0);
            if (result <= 0) {
                av_freep(&output_data[0]);
                av_freep(&output_data);
                return result == 0;
            }

            if (av_audio_fifo_write(
                    audio_fifo,
                    reinterpret_cast<void**>(output_data),
                    result) < result) {
                av_freep(&output_data[0]);
                av_freep(&output_data);
                set_error("audio fifo write failed during resampler flush");
                return false;
            }

            av_freep(&output_data[0]);
            av_freep(&output_data);
            if (!drain_audio_fifo()) {
                return false;
            }
        }
    }

    bool drain_all_audio_for_stop() {
        if (!flush_resampler()) {
            return false;
        }
        return drain_audio_fifo(true);
    }

    void stop_locked() noexcept {
        if (format != nullptr && running && header_written) {
            if (audio_codec != nullptr) {
                if (audio_pts_ready) {
                    if (drain_all_audio_for_stop()) {
                        encode_audio(nullptr);
                    }
                }
            }
            if (video_codec != nullptr) {
                encode_video(nullptr);
            }
            av_write_trailer(format);
        }

        if (format != nullptr && !(format->oformat->flags & AVFMT_NOFILE) &&
            format->pb != nullptr) {
            avio_closep(&format->pb);
        }

        if (audio_frame != nullptr) {
            av_frame_free(&audio_frame);
        }
        if (video_frame != nullptr) {
            av_frame_free(&video_frame);
        }
        if (packet != nullptr) {
            av_packet_free(&packet);
        }
        if (audio_fifo != nullptr) {
            av_audio_fifo_free(audio_fifo);
        }
        if (resampler != nullptr) {
            swr_free(&resampler);
        }
        if (scaler != nullptr) {
            sws_freeContext(scaler);
        }
        if (audio_codec != nullptr) {
            avcodec_free_context(&audio_codec);
        }
        if (video_codec != nullptr) {
            avcodec_free_context(&video_codec);
        }
        d3d11_bridge.reset();
        hardware_video = false;
        if (format != nullptr) {
            avformat_free_context(format);
        }
        format = nullptr;
        audio_stream = nullptr;
        video_stream = nullptr;
        header_written = false;
        running = false;
        if (network_initialized) {
            avformat_network_deinit();
            network_initialized = false;
        }
    }

    bool configure(
        const cari::studio::core::OutputProfile& profile,
        ID3D11Device* d3d11_device = nullptr) {
        if (profile.width == 0 || profile.height == 0 || profile.fps == 0 ||
            input_audio_sample_rate == 0 || input_audio_channels == 0) {
            set_error("invalid libav media output profile");
            return false;
        }

        const AVCodec* video_encoder =
            avcodec_find_encoder_by_name(profile.video_codec.c_str());
        if (video_encoder == nullptr) {
            set_error(
                std::string("video encoder not found: ") +
                profile.video_codec);
            return false;
        }

        const AVCodec* audio_encoder =
            avcodec_find_encoder_by_name(profile.audio_codec.c_str());
        if (audio_encoder == nullptr) {
            set_error(
                std::string("audio encoder not found: ") +
                profile.audio_codec);
            return false;
        }

        const char* forced_format =
            profile.kind == cari::studio::core::OutputKind::rtmp
                ? "flv"
                : nullptr;
        int result = avformat_alloc_output_context2(
            &format,
            nullptr,
            forced_format,
            profile.target.c_str());
        if (result < 0 || format == nullptr) {
            set_error(
                std::string("output context allocation failed: ") +
                ffmpeg_error(result));
            return false;
        }

        video_stream = avformat_new_stream(format, nullptr);
        audio_stream = avformat_new_stream(format, nullptr);
        if (video_stream == nullptr || audio_stream == nullptr) {
            set_error("failed to create media output streams");
            return false;
        }

        video_codec = avcodec_alloc_context3(video_encoder);
        audio_codec = avcodec_alloc_context3(audio_encoder);
        if (video_codec == nullptr || audio_codec == nullptr) {
            set_error("failed to allocate encoder contexts");
            return false;
        }

        if (d3d11_device != nullptr) {
            if (!supports_d3d11_hw_frames(video_encoder)) {
                set_error(
                    std::string("video encoder does not expose D3D11 hardware frames: ") +
                    profile.video_codec);
                return false;
            }

            d3d11_bridge = std::make_unique<D3D11AvFrameBridge>();
            std::string bridge_error;
            if (!d3d11_bridge->initialize(
                    d3d11_device,
                    profile.width,
                    profile.height,
                    bridge_error)) {
                set_error(
                    std::string("D3D11 frame bridge initialization failed: ") +
                    bridge_error);
                return false;
            }
            video_pixel_format = AV_PIX_FMT_D3D11;
            hardware_video = true;
        } else {
            video_pixel_format = choose_video_format(video_encoder);
        }

        video_codec->codec_type = AVMEDIA_TYPE_VIDEO;
        video_codec->codec_id = video_encoder->id;
        video_codec->width = static_cast<int>(profile.width);
        video_codec->height = static_cast<int>(profile.height);
        video_codec->pix_fmt = video_pixel_format;
        if (hardware_video) {
            video_codec->hw_frames_ctx = av_buffer_ref(d3d11_bridge->frames_ref());
            if (video_codec->hw_frames_ctx == nullptr) {
                set_error("failed to reference D3D11 hardware frame context");
                return false;
            }
        }
        video_codec->time_base = AVRational{
            1,
            static_cast<int>(profile.fps)};
        video_codec->framerate = AVRational{
            static_cast<int>(profile.fps),
            1};
        video_codec->bit_rate =
            static_cast<int64_t>(profile.bitrate_kbps) * 1000;
        video_codec->gop_size =
            static_cast<int>(profile.fps) * 2;
        video_codec->max_b_frames =
            profile.kind == cari::studio::core::OutputKind::rtmp ? 0 : 2;

        if (format->oformat->flags & AVFMT_GLOBALHEADER) {
            video_codec->flags |= AV_CODEC_FLAG_GLOBAL_HEADER;
        }

        AVDictionary* video_options = nullptr;
        if (profile.video_codec == "libx264") {
            av_dict_set(&video_options, "preset", "veryfast", 0);
            av_dict_set(&video_options, "tune", "zerolatency", 0);
        }

        result = avcodec_open2(video_codec, video_encoder, &video_options);
        av_dict_free(&video_options);
        if (result < 0) {
            set_error(
                std::string("video encoder open failed: ") +
                ffmpeg_error(result));
            return false;
        }

        audio_sample_format = choose_audio_format(audio_encoder);
        output_audio_sample_rate = 48000;
        if (audio_encoder->supported_samplerates != nullptr) {
            int nearest_rate = audio_encoder->supported_samplerates[0];
            int best_distance =
                std::abs(nearest_rate - static_cast<int>(output_audio_sample_rate));
            for (const int* rate = audio_encoder->supported_samplerates;
                 *rate != 0;
                 ++rate) {
                const int distance =
                    std::abs(*rate - static_cast<int>(input_audio_sample_rate));
                if (distance < best_distance) {
                    best_distance = distance;
                    nearest_rate = *rate;
                }
            }
            output_audio_sample_rate =
                static_cast<std::uint32_t>(nearest_rate);
        }

        audio_codec->codec_type = AVMEDIA_TYPE_AUDIO;
        audio_codec->codec_id = audio_encoder->id;
        audio_codec->sample_fmt = audio_sample_format;
        audio_codec->sample_rate = static_cast<int>(output_audio_sample_rate);
        av_channel_layout_default(
            &audio_codec->ch_layout,
            static_cast<int>(input_audio_channels));
        audio_codec->bit_rate =
            static_cast<int64_t>(profile.audio_bitrate_kbps) * 1000;
        audio_codec->time_base = AVRational{
            1,
            audio_codec->sample_rate};

        if (format->oformat->flags & AVFMT_GLOBALHEADER) {
            audio_codec->flags |= AV_CODEC_FLAG_GLOBAL_HEADER;
        }

        result = avcodec_open2(audio_codec, audio_encoder, nullptr);
        if (result < 0) {
            set_error(
                std::string("audio encoder open failed: ") +
                ffmpeg_error(result));
            return false;
        }

        video_stream->time_base = video_codec->time_base;
        audio_stream->time_base = audio_codec->time_base;

        result = avcodec_parameters_from_context(
            video_stream->codecpar, video_codec);
        if (result < 0) {
            set_error("failed to export video codec parameters");
            return false;
        }
        result = avcodec_parameters_from_context(
            audio_stream->codecpar, audio_codec);
        if (result < 0) {
            set_error("failed to export audio codec parameters");
            return false;
        }

        if (!hardware_video) {
            scaler = sws_getContext(
                static_cast<int>(profile.width),
                static_cast<int>(profile.height),
                AV_PIX_FMT_BGRA,
                static_cast<int>(profile.width),
                static_cast<int>(profile.height),
                video_pixel_format,
                SWS_BILINEAR,
                nullptr,
                nullptr,
                nullptr);
            if (scaler == nullptr) {
                set_error("failed to create BGRA video scaler");
                return false;
            }
        }

        AVChannelLayout input_layout{};
        av_channel_layout_default(
            &input_layout,
            static_cast<int>(input_audio_channels));
        result = swr_alloc_set_opts2(
            &resampler,
            &audio_codec->ch_layout,
            audio_sample_format,
            audio_codec->sample_rate,
            &input_layout,
            AV_SAMPLE_FMT_FLT,
            static_cast<int>(input_audio_sample_rate),
            0,
            nullptr);
        av_channel_layout_uninit(&input_layout);
        if (result < 0 || resampler == nullptr) {
            set_error(
                std::string("audio resampler allocation failed: ") +
                ffmpeg_error(result));
            return false;
        }

        result = swr_init(resampler);
        if (result < 0) {
            set_error(
                std::string("audio resampler init failed: ") +
                ffmpeg_error(result));
            return false;
        }

        audio_fifo = av_audio_fifo_alloc(
            audio_sample_format,
            audio_codec->ch_layout.nb_channels,
            1);
        if (audio_fifo == nullptr) {
            set_error("failed to allocate audio fifo");
            return false;
        }

        packet = av_packet_alloc();
        video_frame = av_frame_alloc();
        audio_frame = av_frame_alloc();
        if (packet == nullptr || video_frame == nullptr || audio_frame == nullptr) {
            set_error("failed to allocate libav frame/packet storage");
            return false;
        }

        if (!(format->oformat->flags & AVFMT_NOFILE)) {
            result = avio_open2(
                &format->pb,
                profile.target.c_str(),
                AVIO_FLAG_WRITE,
                nullptr,
                nullptr);
            if (result < 0) {
                set_error(
                    std::string("output open failed: ") +
                    ffmpeg_error(result));
                return false;
            }
        }

        result = avformat_write_header(format, nullptr);
        if (result < 0) {
            set_error(
                std::string("output header failed: ") +
                ffmpeg_error(result));
            return false;
        }

        header_written = true;
        running = true;
        return true;
    }

    bool submit_video_d3d11_locked(
        const cari::studio::core::Frame& input_frame,
        ID3D11Texture2D* texture,
        std::intptr_t subresource_index) {
        if (!hardware_video || !running || format == nullptr ||
            d3d11_bridge == nullptr || texture == nullptr) {
            ++stats.video_packets_dropped;
            set_error("D3D11 video submitted without a hardware video output");
            return false;
        }

        D3D11_TEXTURE2D_DESC desc{};
        texture->GetDesc(&desc);
        if (desc.Width != static_cast<UINT>(video_codec->width) ||
            desc.Height != static_cast<UINT>(video_codec->height) ||
            desc.Format != DXGI_FORMAT_B8G8R8A8_UNORM) {
            ++stats.video_packets_dropped;
            set_error("D3D11 texture does not match configured BGRA dimensions");
            return false;
        }

        ensure_origin(input_frame.pts);
        if (stats.last_video_input_pts >= 0 &&
            input_frame.pts < stats.last_video_input_pts) {
            ++stats.video_packets_dropped;
            set_error("video PTS moved backwards");
            return false;
        }
        stats.last_video_input_pts = input_frame.pts;
        ++stats.video_frames_submitted;

        const std::int64_t normalized =
            normalize_pts(input_frame.pts, media_origin);
        const std::int64_t encoder_pts = av_rescale_q(
            normalized,
            kSourceTimeBase,
            video_codec->time_base);

        (void)subresource_index;
        std::string bridge_error;
        AVFrame* hardware_frame =
            d3d11_bridge->copy_texture_to_hwframe(
                texture,
                encoder_pts,
                bridge_error);
        if (hardware_frame == nullptr) {
            ++stats.video_packets_dropped;
            set_error(
                std::string("D3D11 frame wrap failed: ") + bridge_error);
            return false;
        }

        const bool encoded = encode_video(hardware_frame);
        av_frame_free(&hardware_frame);
        return encoded;
    }

    bool submit_video_locked(
        const cari::studio::core::Frame& input_frame,
        const std::shared_ptr<std::vector<std::uint8_t>>& bgra) {
        if (!running || format == nullptr || bgra == nullptr) {
            ++stats.video_packets_dropped;
            return false;
        }

        const std::size_t required =
            static_cast<std::size_t>(input_frame.width) *
            static_cast<std::size_t>(input_frame.height) * 4u;
        if (input_frame.width == 0 || input_frame.height == 0 ||
            bgra->size() != required ||
            input_frame.width != video_codec->width ||
            input_frame.height != video_codec->height) {
            ++stats.video_packets_dropped;
            set_error("invalid BGRA video frame for libav output");
            return false;
        }

        ensure_origin(input_frame.pts);
        if (stats.last_video_input_pts >= 0 &&
            input_frame.pts < stats.last_video_input_pts) {
            ++stats.video_packets_dropped;
            set_error("video PTS moved backwards");
            return false;
        }
        stats.last_video_input_pts = input_frame.pts;
        ++stats.video_frames_submitted;

        av_frame_unref(video_frame);
        video_frame->format = video_pixel_format;
        video_frame->width = video_codec->width;
        video_frame->height = video_codec->height;
        if (av_frame_get_buffer(video_frame, 32) < 0) {
            set_error("failed to allocate libav video frame buffer");
            return false;
        }

        const std::uint8_t* source_data[4] = {
            bgra->data(), nullptr, nullptr, nullptr
        };
        const int source_stride[4] = {
            static_cast<int>(input_frame.width * 4u), 0, 0, 0
        };
        sws_scale(
            scaler,
            source_data,
            source_stride,
            0,
            input_frame.height,
            video_frame->data,
            video_frame->linesize);

        const std::int64_t normalized =
            normalize_pts(input_frame.pts, media_origin);
        video_frame->pts = av_rescale_q(
            normalized,
            kSourceTimeBase,
            video_codec->time_base);

        return encode_video(video_frame);
    }

    bool submit_audio_locked(
        const cari::studio::core::AudioPacket& input_packet) {
        if (!running || format == nullptr ||
            input_packet.samples.empty() ||
            input_packet.sample_rate == 0 ||
            input_packet.channels == 0 ||
            input_packet.samples.size() % input_packet.channels != 0) {
            ++stats.audio_packets_dropped;
            set_error("invalid audio packet for libav output");
            return false;
        }

        ensure_origin(input_packet.pts);
        if (stats.last_audio_input_pts >= 0 &&
            input_packet.pts < stats.last_audio_input_pts) {
            ++stats.audio_packets_dropped;
            set_error("audio PTS moved backwards");
            return false;
        }
        stats.last_audio_input_pts = input_packet.pts;
        ++stats.audio_packets_submitted;

        const int fifo_samples_before = av_audio_fifo_size(audio_fifo);

        const int input_samples =
            static_cast<int>(
                input_packet.samples.size() / input_packet.channels);
        const int max_output_samples = static_cast<int>(
            av_rescale_rnd(
                swr_get_delay(
                    resampler,
                    input_packet.sample_rate),
                audio_codec->sample_rate,
                input_packet.sample_rate,
                AV_ROUND_UP) +
            av_rescale_rnd(
                input_samples,
                audio_codec->sample_rate,
                input_packet.sample_rate,
                AV_ROUND_UP));

        std::uint8_t** output_data = nullptr;
        int output_linesize = 0;
        int result = av_samples_alloc_array_and_samples(
            &output_data,
            &output_linesize,
            audio_codec->ch_layout.nb_channels,
            std::max(1, max_output_samples),
            audio_sample_format,
            0);
        if (result < 0) {
            set_error(
                std::string("audio conversion buffer allocation failed: ") +
                ffmpeg_error(result));
            return false;
        }

        const std::uint8_t* input_data[1] = {
            reinterpret_cast<const std::uint8_t*>(input_packet.samples.data())
        };
        result = swr_convert(
            resampler,
            output_data,
            std::max(1, max_output_samples),
            input_data,
            input_samples);
        if (result < 0) {
            av_freep(&output_data[0]);
            av_freep(&output_data);
            set_error(
                std::string("audio conversion failed: ") +
                ffmpeg_error(result));
            return false;
        }

        const int written = av_audio_fifo_write(
            audio_fifo,
            reinterpret_cast<void**>(output_data),
            result);
        av_freep(&output_data[0]);
        av_freep(&output_data);
        if (written < result) {
            set_error("audio fifo write returned fewer samples than produced");
            return false;
        }

        // A newly empty FIFO marks a safe synchronization boundary. Re-anchor
        // the audio sample clock to the real input PTS instead of assuming the
        // previous block was perfectly contiguous. This preserves explicit PTS
        // across normal mixer discontinuities while keeping already queued data
        // untouched.
        if (!audio_pts_ready || fifo_samples_before == 0) {
            next_audio_pts = av_rescale_q(
                normalize_pts(input_packet.pts, media_origin),
                kSourceTimeBase,
                audio_codec->time_base);
            audio_pts_ready = true;
        }

        return drain_audio_fifo(false);
    }

    void stop_now() noexcept {
        std::lock_guard lock_guard(mutex);
        stop_locked();
    }
};

LibavMediaOutput::LibavMediaOutput()
    : impl_(std::make_unique<Impl>()) {}

LibavMediaOutput::~LibavMediaOutput() = default;

bool LibavMediaOutput::start(
    const cari::studio::core::OutputProfile& profile,
    std::uint32_t input_audio_sample_rate,
    std::uint16_t input_audio_channels) {
    std::lock_guard lock(impl_->mutex);
    impl_->stop_locked();
    impl_->error.clear();
    impl_->stats = {};
    impl_->input_audio_sample_rate = input_audio_sample_rate;
    impl_->input_audio_channels = input_audio_channels;
    impl_->media_origin = -1;
    impl_->next_audio_pts = 0;
    impl_->audio_pts_ready = false;

    if (profile.kind == cari::studio::core::OutputKind::rtmp) {
        avformat_network_init();
        impl_->network_initialized = true;
    }

    const auto validation =
        cari::studio::core::validate_output_profile(profile);
    if (!validation.valid) {
        impl_->set_error(validation.error);
        return false;
    }

    return impl_->configure(profile);
}

bool LibavMediaOutput::start_d3d11(
    const cari::studio::core::OutputProfile& profile,
    ID3D11Device* device,
    std::uint32_t input_audio_sample_rate,
    std::uint16_t input_audio_channels) {
    if (device == nullptr) {
        std::lock_guard lock(impl_->mutex);
        impl_->error = "D3D11 device is required for hardware output";
        return false;
    }

    std::lock_guard lock(impl_->mutex);
    impl_->stop_locked();
    impl_->error.clear();
    impl_->stats = {};
    impl_->input_audio_sample_rate = input_audio_sample_rate;
    impl_->input_audio_channels = input_audio_channels;
    impl_->media_origin = -1;
    impl_->next_audio_pts = 0;
    impl_->audio_pts_ready = false;

    if (profile.kind == cari::studio::core::OutputKind::rtmp) {
        avformat_network_init();
        impl_->network_initialized = true;
    }

    const auto validation =
        cari::studio::core::validate_output_profile(profile);
    if (!validation.valid) {
        impl_->set_error(validation.error);
        return false;
    }

    return impl_->configure(profile, device);
}

bool LibavMediaOutput::submit_video(
    const cari::studio::core::Frame& frame,
    const std::shared_ptr<std::vector<std::uint8_t>>& bgra) noexcept {
    std::lock_guard lock(impl_->mutex);
    try {
        return impl_->submit_video_locked(frame, bgra);
    } catch (const std::exception& exception) {
        impl_->set_error(std::string("video submit exception: ") + exception.what());
        ++impl_->stats.video_packets_dropped;
        return false;
    } catch (...) {
        impl_->set_error("video submit unknown exception");
        ++impl_->stats.video_packets_dropped;
        return false;
    }
}

bool LibavMediaOutput::submit_video_d3d11(
    const cari::studio::core::Frame& frame,
    ID3D11Texture2D* texture,
    std::intptr_t subresource_index) noexcept {
    std::lock_guard lock(impl_->mutex);
    try {
        return impl_->submit_video_d3d11_locked(
            frame,
            texture,
            subresource_index);
    } catch (const std::exception& exception) {
        impl_->set_error(
            std::string("D3D11 video submit exception: ") + exception.what());
        ++impl_->stats.video_packets_dropped;
        return false;
    } catch (...) {
        impl_->set_error("D3D11 video submit unknown exception");
        ++impl_->stats.video_packets_dropped;
        return false;
    }
}

bool LibavMediaOutput::submit_audio(
    const cari::studio::core::AudioPacket& packet) noexcept {
    std::lock_guard lock(impl_->mutex);
    try {
        return impl_->submit_audio_locked(packet);
    } catch (const std::exception& exception) {
        impl_->set_error(std::string("audio submit exception: ") + exception.what());
        ++impl_->stats.audio_packets_dropped;
        return false;
    } catch (...) {
        impl_->set_error("audio submit unknown exception");
        ++impl_->stats.audio_packets_dropped;
        return false;
    }
}

void LibavMediaOutput::stop() noexcept {
    if (impl_ != nullptr) {
        impl_->stop_now();
    }
}

bool LibavMediaOutput::running() const noexcept {
    if (impl_ == nullptr) return false;
    std::lock_guard lock(impl_->mutex);
    return impl_->running;
}

std::string LibavMediaOutput::last_error() const {
    if (impl_ == nullptr) return {};
    std::lock_guard lock(impl_->mutex);
    return impl_->error;
}

bool LibavMediaOutput::hardware_video_enabled() const noexcept {
    std::lock_guard lock(impl_->mutex);
    return impl_->hardware_video;
}

LibavMediaOutputStats LibavMediaOutput::stats() const noexcept {
    if (impl_ == nullptr) return {};
    std::lock_guard lock(impl_->mutex);
    return impl_->stats;
}

