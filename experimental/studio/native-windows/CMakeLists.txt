cmake_minimum_required(VERSION 3.25)
project(CariStudioNative LANGUAGES CXX)

if(NOT WIN32)
    message(FATAL_ERROR "Cari Studio native runtime requires Windows")
endif()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(cari-studio-native WIN32
    main.cpp
    control_protocol.cpp
    audio_probe.cpp
    audio_core_bridge.cpp
    audio_timeline_mixer.cpp
    camera_sources.cpp
    capture_engine.cpp
    compositor_bridge.cpp
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
    wasapi_capture.cpp
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
add_test(NAME cari-frame-bridge-smoke COMMAND cari-frame-bridge-smoke)
add_test(NAME cari-audio-timeline-mixer-smoke COMMAND cari-audio-timeline-mixer-smoke)
add_test(NAME cari-audio-core-bridge-smoke COMMAND cari-audio-core-bridge-smoke)
add_test(NAME cari-raw-pipe-smoke COMMAND cari-raw-pipe-smoke)
add_test(NAME cari-av-sync-smoke COMMAND cari-av-sync-smoke)
add_test(NAME cari-media-clock-smoke COMMAND cari-media-clock-smoke)
add_test(NAME cari-control-protocol-smoke COMMAND cari-control-protocol-smoke)

# Native capture/audio/output infrastructure is isolated behind stable
# interfaces so hardware-dependent validation can happen on the target PC.
