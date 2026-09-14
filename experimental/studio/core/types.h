#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace cari::studio::core {

using Timestamp = std::int64_t;

struct Frame {
    Timestamp pts = 0;
    std::uint32_t width = 0;
    std::uint32_t height = 0;
    std::uint32_t stride = 0;
    std::uint32_t format = 0;
    std::uint64_t sequence = 0;
};

struct AudioPacket {
    Timestamp pts = 0;
    std::uint32_t sample_rate = 48000;
    std::uint16_t channels = 2;
    std::uint64_t sequence = 0;
    std::vector<float> samples;
};

struct SourceHealth {
    bool active = false;
    std::uint64_t frames = 0;
    std::uint64_t dropped = 0;
    std::uint64_t errors = 0;
    double fps = 0.0;
};

struct OutputMetrics {
    std::uint64_t frames = 0;
    std::uint64_t audio_frames = 0;
    std::uint64_t dropped = 0;
    std::uint64_t encoded = 0;
    double fps = 0.0;
    double bitrate_mbps = 0.0;
};

struct SourceDescriptor {
    std::string id;
    std::string name;
    std::string kind;
    bool enabled = true;
};

} // namespace cari::studio::core
