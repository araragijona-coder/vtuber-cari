#pragma once

#include <cstdint>
#include <string>

namespace cari::native {

enum class ControlCommandType {
    invalid,
    status,
    capture_start,
    capture_stop,
    audio_start,
    audio_stop,
    output_start,
    output_stop,
};

struct ControlCommand {
    ControlCommandType type = ControlCommandType::invalid;
    std::string source = "window";
    std::string profile = "local-record";
};

ControlCommand parse_control_command(const std::string& line) noexcept;
std::string control_response(bool ok, const std::string& message);

} // namespace cari::native
