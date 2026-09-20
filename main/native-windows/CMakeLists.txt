cmake_minimum_required(VERSION 3.25)
project(CariStudioNative LANGUAGES CXX)

if(NOT WIN32)
    message(FATAL_ERROR "Cari Studio native runtime requires Windows")
endif()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

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
add_test(NAME cari-media-foundation-camera-smoke COMMAND cari-media-foundation-camera-smoke)
add_test(NAME cari-latest-item-queue-smoke COMMAND cari-latest-item-queue-smoke)
add_test(NAME cari-output-retry-smoke COMMAND cari-output-retry-smoke)
add_test(NAME cari-output-diagnostics-smoke COMMAND cari-output-diagnostics-smoke)
add_test(NAME cari-control-protocol-smoke COMMAND cari-control-protocol-smoke)

# Native capture/audio/output infrastructure is isolated behind stable
# interfaces so hardware-dependent validation can happen on the target PC.
