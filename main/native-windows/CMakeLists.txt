cmake_minimum_required(VERSION 3.25)
project(CariStudioNative LANGUAGES CXX)

if(NOT WIN32)
    message(FATAL_ERROR "Cari Studio native runtime requires Windows")
endif()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

option(CARI_ENABLE_LIBAV_OUTPUT
    "Build experimental direct libavcodec/libavformat timestamped output"
    OFF
)
set(CARI_FFMPEG_ROOT
    "$ENV{CARI_FFMPEG_ROOT}"
    CACHE PATH
    "FFmpeg development root containing include/ and lib/"
)

if(MSVC)
    add_compile_options(/W4 /WX /permissive-)
endif()

add_executable(cari-studio-native WIN32
    main.cpp
    control_protocol.cpp
    audio_probe.cpp
    audio_core_bridge.cpp
    audio_timeline_mixer.cpp
    voice_effects.cpp
    camera_sources.cpp
    media_foundation_camera.cpp
    capture_engine.cpp
    compositor_bridge.cpp
    d3d11_compositor.cpp
    avatar_gpu_overlay.cpp
    frame_bridge.cpp
    process_runner.cpp
    ffmpeg_supervisor.cpp
    ffmpeg_av_output.cpp
    native_media_output_bridge.cpp
    media_graph_controller.cpp
    raw_media_adapter.cpp
    raw_pipe.cpp
    wasapi_capture.cpp
    window_sources.cpp
)

target_include_directories(cari-studio-native PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-studio-native PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-studio-native PRIVATE
    user32
    gdi32
    ole32
    avrt
    d3d11
    d3dcompiler
    dxgi
    mf
    mfplat
    mfreadwrite
    mfuuid
    windowsapp
)

add_executable(cari-core-smoke
    core_smoke.cpp
    process_runner.cpp
    ffmpeg_supervisor.cpp
)

target_include_directories(cari-core-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-core-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-core-smoke PRIVATE
    user32
)

add_executable(cari-ffmpeg-supervisor-smoke
    ffmpeg_supervisor_smoke.cpp
    process_runner.cpp
    ffmpeg_supervisor.cpp
)

target_include_directories(cari-ffmpeg-supervisor-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-ffmpeg-supervisor-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-ffmpeg-supervisor-smoke PRIVATE
    user32
)

add_executable(cari-ffmpeg-av-output-smoke
    ffmpeg_av_output_smoke.cpp
    ffmpeg_av_output.cpp
    process_runner.cpp
    raw_pipe.cpp
)

target_include_directories(cari-ffmpeg-av-output-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-ffmpeg-av-output-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-ffmpeg-av-output-smoke PRIVATE
    user32
)

add_executable(cari-raw-media-adapter-smoke
    raw_media_adapter_smoke.cpp
    raw_media_adapter.cpp
)

target_include_directories(cari-raw-media-adapter-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-raw-media-adapter-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-raw-media-adapter-smoke PRIVATE
    user32
)

add_executable(cari-ffmpeg-named-pipe-e2e-smoke
    ffmpeg_named_pipe_e2e_smoke.cpp
    ffmpeg_av_output.cpp
    process_runner.cpp
    raw_pipe.cpp
)

target_include_directories(cari-ffmpeg-named-pipe-e2e-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-ffmpeg-named-pipe-e2e-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-ffmpeg-named-pipe-e2e-smoke PRIVATE
    user32
)

add_executable(cari-multi-stream-output-smoke
    multi_stream_output_smoke.cpp
    multi_stream_output.cpp
    ffmpeg_av_output.cpp
    process_runner.cpp
    raw_pipe.cpp
)

target_include_directories(cari-multi-stream-output-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-multi-stream-output-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-multi-stream-output-smoke PRIVATE
    user32
)

add_executable(cari-native-media-output-bridge-smoke
    native_media_output_bridge_smoke.cpp
    native_media_output_bridge.cpp
    ffmpeg_av_output.cpp
    raw_media_adapter.cpp
    process_runner.cpp
    raw_pipe.cpp
)

target_include_directories(cari-native-media-output-bridge-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-native-media-output-bridge-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-native-media-output-bridge-smoke PRIVATE
    user32
)

add_executable(cari-d3d11-compositor-smoke
    d3d11_compositor_smoke.cpp
    d3d11_compositor.cpp
)

target_include_directories(cari-d3d11-compositor-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-d3d11-compositor-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-d3d11-compositor-smoke PRIVATE
    d3d11
    dxgi
    d3dcompiler
)

add_executable(cari-frame-bridge-smoke
    frame_bridge_smoke.cpp
    frame_bridge.cpp
)

target_include_directories(cari-frame-bridge-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-frame-bridge-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-frame-bridge-smoke PRIVATE
    d3d11
    dxgi
)

add_executable(cari-audio-timeline-mixer-smoke
    audio_timeline_mixer_smoke.cpp
    audio_timeline_mixer.cpp
)

add_executable(cari-audio-core-bridge-smoke
    audio_core_bridge_smoke.cpp
    audio_core_bridge.cpp
    audio_timeline_mixer.cpp
    voice_effects.cpp
    wasapi_capture.cpp
)

add_executable(cari-voice-effects-smoke
    voice_effects_smoke.cpp
    voice_effects.cpp
)

target_include_directories(cari-audio-core-bridge-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-audio-core-bridge-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-audio-core-bridge-smoke PRIVATE
    user32
    ole32
    avrt
)

target_compile_definitions(cari-voice-effects-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-voice-effects-smoke PRIVATE
    user32
)



target_include_directories(cari-audio-timeline-mixer-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-audio-timeline-mixer-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-audio-timeline-mixer-smoke PRIVATE
    user32
)

add_executable(cari-raw-pipe-smoke
    raw_pipe_smoke.cpp
    raw_pipe.cpp
)

add_executable(cari-av-sync-smoke
    ../core/av_sync_smoke.cpp
)

target_include_directories(cari-av-sync-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

add_executable(cari-media-clock-smoke
    ../core/media_clock_smoke.cpp
)

target_include_directories(cari-media-clock-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

add_executable(cari-media-scheduler-smoke
    ../core/media_scheduler_smoke.cpp
)

add_executable(cari-audio-clock-drift-smoke
    ../core/audio_clock_drift_smoke.cpp
)

target_include_directories(cari-audio-clock-drift-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

if(CARI_ENABLE_LIBAV_OUTPUT)
    find_path(CARI_LIBAV_INCLUDE_DIR
        NAMES libavcodec/avcodec.h
        PATHS
            ${CARI_FFMPEG_ROOT}/include
    )

    find_library(CARI_AVCODEC_LIBRARY NAMES avcodec PATHS ${CARI_FFMPEG_ROOT}/lib)
    find_library(CARI_AVFORMAT_LIBRARY NAMES avformat PATHS ${CARI_FFMPEG_ROOT}/lib)
    find_library(CARI_AVUTIL_LIBRARY NAMES avutil PATHS ${CARI_FFMPEG_ROOT}/lib)
    find_library(CARI_SWSCALE_LIBRARY NAMES swscale PATHS ${CARI_FFMPEG_ROOT}/lib)
    find_library(CARI_SWRESAMPLE_LIBRARY NAMES swresample PATHS ${CARI_FFMPEG_ROOT}/lib)

    if(NOT CARI_LIBAV_INCLUDE_DIR OR
       NOT CARI_AVCODEC_LIBRARY OR
       NOT CARI_AVFORMAT_LIBRARY OR
       NOT CARI_AVUTIL_LIBRARY OR
       NOT CARI_SWSCALE_LIBRARY OR
       NOT CARI_SWRESAMPLE_LIBRARY)
        message(FATAL_ERROR
            "CARI_ENABLE_LIBAV_OUTPUT=ON requires FFmpeg development headers and libraries.")
    endif()

    add_executable(cari-libav-pts-smoke
        libav_media_output_smoke.cpp
        libav_media_output.cpp
    )

    target_include_directories(cari-libav-pts-smoke PRIVATE
        ${CARI_LIBAV_INCLUDE_DIR}
        ${CMAKE_CURRENT_SOURCE_DIR}/../core
    )

    target_compile_definitions(cari-libav-pts-smoke PRIVATE
        UNICODE
        _UNICODE
        NOMINMAX
        WIN32_LEAN_AND_MEAN
    )

    target_link_libraries(cari-libav-pts-smoke PRIVATE
        ${CARI_AVCODEC_LIBRARY}
        ${CARI_AVFORMAT_LIBRARY}
        ${CARI_AVUTIL_LIBRARY}
        ${CARI_SWSCALE_LIBRARY}
        ${CARI_SWRESAMPLE_LIBRARY}
    )
endif()

add_executable(cari-media-foundation-camera-smoke
    media_foundation_camera_smoke.cpp
    media_foundation_camera.cpp
)

target_include_directories(cari-media-foundation-camera-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-media-foundation-camera-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

target_link_libraries(cari-media-foundation-camera-smoke PRIVATE
    ole32
    mf
    mfplat
    mfreadwrite
    mfuuid
)

add_executable(cari-latest-item-queue-smoke
    ../core/latest_item_queue_smoke.cpp
)

target_include_directories(cari-latest-item-queue-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

add_executable(cari-output-retry-smoke
    ../core/output_retry_smoke.cpp
)

target_include_directories(cari-output-retry-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

add_executable(cari-output-diagnostics-smoke
    ../core/output_diagnostics_smoke.cpp
)

target_include_directories(cari-output-diagnostics-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_include_directories(cari-media-scheduler-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

add_executable(cari-control-protocol-smoke
    control_protocol_smoke.cpp
    control_protocol.cpp
)

target_include_directories(cari-control-protocol-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

target_compile_definitions(cari-control-protocol-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)


target_compile_definitions(cari-raw-pipe-smoke PRIVATE
    UNICODE
    _UNICODE
    NOMINMAX
    WIN32_LEAN_AND_MEAN
)

enable_testing()
add_test(NAME cari-core-smoke COMMAND cari-core-smoke)
add_test(NAME cari-ffmpeg-supervisor-smoke COMMAND cari-ffmpeg-supervisor-smoke)
add_test(NAME cari-ffmpeg-av-output-smoke COMMAND cari-ffmpeg-av-output-smoke)
add_test(NAME cari-raw-media-adapter-smoke COMMAND cari-raw-media-adapter-smoke)
add_test(NAME cari-native-media-output-bridge-smoke COMMAND cari-native-media-output-bridge-smoke)
add_test(NAME cari-multi-stream-output-smoke COMMAND cari-multi-stream-output-smoke)
add_test(NAME cari-ffmpeg-named-pipe-e2e-smoke COMMAND cari-ffmpeg-named-pipe-e2e-smoke)
add_test(NAME cari-frame-bridge-smoke COMMAND cari-frame-bridge-smoke)
add_test(NAME cari-d3d11-compositor-smoke COMMAND cari-d3d11-compositor-smoke)
add_test(NAME cari-audio-timeline-mixer-smoke COMMAND cari-audio-timeline-mixer-smoke)
add_test(NAME cari-audio-core-bridge-smoke COMMAND cari-audio-core-bridge-smoke)
add_test(NAME cari-voice-effects-smoke COMMAND cari-voice-effects-smoke)
add_test(NAME cari-raw-pipe-smoke COMMAND cari-raw-pipe-smoke)
add_test(NAME cari-av-sync-smoke COMMAND cari-av-sync-smoke)
add_test(NAME cari-media-clock-smoke COMMAND cari-media-clock-smoke)
add_test(NAME cari-media-scheduler-smoke COMMAND cari-media-scheduler-smoke)
add_test(NAME cari-audio-clock-drift-smoke COMMAND cari-audio-clock-drift-smoke)
if(CARI_ENABLE_LIBAV_OUTPUT)
    add_test(NAME cari-libav-pts-smoke COMMAND cari-libav-pts-smoke)
endif()
add_test(NAME cari-media-foundation-camera-smoke COMMAND cari-media-foundation-camera-smoke)
add_test(NAME cari-latest-item-queue-smoke COMMAND cari-latest-item-queue-smoke)
add_test(NAME cari-output-retry-smoke COMMAND cari-output-retry-smoke)
add_test(NAME cari-output-diagnostics-smoke COMMAND cari-output-diagnostics-smoke)
add_test(NAME cari-control-protocol-smoke COMMAND cari-control-protocol-smoke)

# Native capture/audio/output infrastructure is isolated behind stable
# interfaces so hardware-dependent validation can happen on the target PC.
