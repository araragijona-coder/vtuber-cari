cmake_minimum_required(VERSION 3.25)
project(CariStudioNative LANGUAGES CXX)

if(NOT WIN32)
    message(FATAL_ERROR "Cari Studio native prototype requires Windows")
endif()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(cari-studio-native WIN32
    main.cpp
    audio_probe.cpp
    capture_engine.cpp
    wasapi_capture.cpp
    window_sources.cpp
    camera_sources.cpp
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
)

target_include_directories(cari-core-smoke PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../core
)

enable_testing()
add_test(NAME cari-core-smoke COMMAND cari-core-smoke)

# Native capture/audio stays isolated from the Python application until the
# Windows hardware paths pass CI and real-machine validation.
