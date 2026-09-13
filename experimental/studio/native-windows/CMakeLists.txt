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
    d3d11
    dxgi
    windowsapp
)

# This target stays isolated from the Python application until the native
# capture/audio paths pass real Windows hardware and CI tests.
