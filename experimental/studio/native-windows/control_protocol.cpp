#include "control_protocol.h"

#include <string>

namespace cari::native {

namespace {
bool has(const std::string& line, const char* token) {
    return line.find(token) != std::string::npos;
}
}

ControlCommand parse_control_command(const std::string& line) noexcept {
    ControlCommand command{};
    if (has(line, "\"type\":\"status\"")) command.type = ControlCommandType::status;
    else if (has(line, "\"type\":\"capture.start\"")) command.type = ControlCommandType::capture_start;
    else if (has(line, "\"type\":\"capture.stop\"")) command.type = ControlCommandType::capture_stop;
    else if (has(line, "\"type\":\"audio.start\"")) command.type = ControlCommandType::audio_start;
    else if (has(line, "\"type\":\"audio.stop\"")) command.type = ControlCommandType::audio_stop;
    else if (has(line, "\"type\":\"output.start\"")) command.type = ControlCommandType::output_start;
    else if (has(line, "\"type\":\"output.stop\"")) command.type = ControlCommandType::output_stop;

    if (has(line, "\"source\":\"window\"")) command.source = "window";
    if (has(line, "\"profile\":\"local-record\"")) command.profile = "local-record";
    return command;
}

std::string control_response(bool ok, const std::string& message) {
    std::string escaped;
    escaped.reserve(message.size());
    for (char c : message) {
        if (c == '\\' || c == '"') escaped.push_back('\\');
        if (c == '\n') { escaped += "\\n"; continue; }
        escaped.push_back(c);
    }
    return std::string("{\"ok\":") + (ok ? "true" : "false") +
           ",\"message\":\"" + escaped + "\"}\n";
}

} // namespace cari::native
