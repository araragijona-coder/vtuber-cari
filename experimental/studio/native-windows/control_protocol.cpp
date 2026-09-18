#include "control_protocol.h"

#include <cctype>
#include <string>

namespace cari::native {

namespace {

std::string compact_json(const std::string& line) {
    std::string result;
    result.reserve(line.size());
    bool in_string = false;
    bool escaped = false;

    for (const char c : line) {
        if (in_string) {
            result.push_back(c);
            if (escaped) {
                escaped = false;
            } else if (c == '\\') {
                escaped = true;
            } else if (c == '"') {
                in_string = false;
            }
            continue;
        }

        if (c == '"') {
            in_string = true;
            result.push_back(c);
        } else if (!std::isspace(static_cast<unsigned char>(c))) {
            result.push_back(c);
        }
    }
    return result;
}

bool has(const std::string& line, const char* token) {
    return line.find(token) != std::string::npos;
}

} // namespace

ControlCommand parse_control_command(const std::string& line) noexcept {
    ControlCommand command{};
    const auto compact = compact_json(line);

    if (has(compact, "\"type\":\"status\"")) command.type = ControlCommandType::status;
    else if (has(compact, "\"type\":\"capture.start\"")) command.type = ControlCommandType::capture_start;
    else if (has(compact, "\"type\":\"capture.stop\"")) command.type = ControlCommandType::capture_stop;
    else if (has(compact, "\"type\":\"audio.start\"")) command.type = ControlCommandType::audio_start;
    else if (has(compact, "\"type\":\"audio.stop\"")) command.type = ControlCommandType::audio_stop;
    else if (has(compact, "\"type\":\"output.start\"")) command.type = ControlCommandType::output_start;
    else if (has(compact, "\"type\":\"output.stop\"")) command.type = ControlCommandType::output_stop;

    if (has(compact, "\"source\":\"window\"")) command.source = "window";
    if (has(compact, "\"profile\":\"local-record\"")) command.profile = "local-record";
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
