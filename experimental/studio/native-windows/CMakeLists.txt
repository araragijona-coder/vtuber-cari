cmake_minimum_required(VERSION 3.25)
project(CariStudioNative LANGUAGES CXX)

if(NOT WIN32)
    message(FATAL_ERROR "Cari Studio native runtime requires Windows")
endif()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(cari-studio-native WIN32
    main.cpp
    audio_probe.cpp
    audio_core_bridge.cpp
    camera_sources.cpp
    capture_engine.cpp
    compositor_bridge.cpp
    frame_bridge.cpp
    process_runner.cpp
    ffmpeg_supervisor.cpp
    ffmpeg_av_output.cpp
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

add_executable(cari-raw-pipe-smoke
    raw_pipe_smoke.cpp
    raw_pipe.cpp
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
add_test(NAME cari-raw-pipe-smoke COMMAND cari-raw-pipe-smoke)

# Native capture/audio/output infrastructure is isolated behind stable
# interfaces so hardware-dependent validation can happen on the target PC.
