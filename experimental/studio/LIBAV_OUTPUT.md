# Cari Studio — direct Libav output (experimental)

## Purpose

LibavMediaOutput is the optional native output path for the explicit timestamp gate (P04).

The existing FfmpegAvOutput CLI/named-pipe path remains the default and is not replaced.

The direct path uses FFmpeg libraries:

- libavcodec for video/audio encoding;
- libavformat for muxing and output protocols;
- libswscale for BGRA conversion;
- libswresample for audio conversion;
- libavutil for frames, packets and audio FIFO.

FFmpeg documents the send/receive encoder API and the muxer contract around packet timestamps. av_interleaved_write_frame() requires packet timestamps in the stream timebase and performs container interleaving. The implementation therefore maps Cari's signed 100 ns timestamps into encoder/stream timebases and records the packet PTS used by the muxer. citeturn267948search3turn267948search0

## Activation

The target is disabled by default.

-DCARI_ENABLE_LIBAV_OUTPUT=ON -DCARI_FFMPEG_ROOT=<FFmpeg development root>

The development root must contain:

- include/libavcodec/avcodec.h
- include/libavformat/avformat.h
- include/libavutil/...
- include/libswscale/...
- include/libswresample/...
- matching development libraries in lib/.

## Timestamp path

Frame.pts / AudioPacket.pts

→ shared media origin

→ FFmpeg encoder timebase

→ encoded AVPacket.pts

→ stream timebase

→ av_interleaved_write_frame()

This closes the architectural gap of the raw pipe path, where bytes are transported but the original source PTS are not part of the pipe payload.

## Current behavior

- First submitted media item establishes the shared origin.
- Video PTS are rescaled from 100 ns ticks to the video encoder timebase.
- Audio PTS are rescaled to the audio encoder timebase.
- Encoded packet timestamps are rescaled to stream timebases before muxing.
- Backward input PTS are rejected.
- Audio FIFO emits full encoder-sized frames during normal operation and flushes the remainder on stop.
- Local file output and RTMP output contexts are supported by the direct Libav layer.

## Verification status

IMPLEMENTED — NOT YET VERIFIED ON WINDOWS.

The smoke target is cari-libav-pts-smoke.

It requires an FFmpeg development installation, not only ffmpeg.exe.

The current repository does not promote this path into the production MediaGraphController until the Windows development build and sustained output tests pass.

## Do not repeat

Do not create a second timestamp transport or replace FfmpegAvOutput until this Libav gate has Windows evidence and the production encoder boundary is explicitly promoted.