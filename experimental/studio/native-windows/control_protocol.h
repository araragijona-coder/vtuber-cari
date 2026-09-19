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
    voice_set,
};

struct ControlCommand {
    ControlCommandType type = ControlCommandType::invalid;
    std::string source = "window";
    std::string profile = "local-record";
    std::string target;
    std::string request_id;
};

ControlCommand parse_control_command(const std::string& line) noexcept;
std::string control_response(
    bool ok,
    const std::string& message,
    const std::string& request_id = {});

} // namespace cari::native
