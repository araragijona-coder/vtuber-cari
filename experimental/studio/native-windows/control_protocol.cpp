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

std::int32_t read_int_field(const std::string& compact, const char* field) {
    const std::string prefix = std::string("\"") + field + "\":";
    const auto begin = compact.find(prefix);
    if (begin == std::string::npos) {
        return -1;
    }

    std::size_t index = begin + prefix.size();
    bool negative = false;
    if (index < compact.size() && compact[index] == '-') {
        negative = true;
        ++index;
    }

    std::int32_t value = 0;
    bool found = false;
    while (index < compact.size() && std::isdigit(static_cast<unsigned char>(compact[index]))) {
        found = true;
        const int digit = compact[index] - '0';
        if (value > 1000000) {
            return -1;
        }
        value = value * 10 + digit;
        ++index;
    }

    if (!found) {
        return -1;
    }
    return negative ? -value : value;
}

std::string read_string_field(const std::string& compact, const char* field) {
    const std::string prefix = std::string("\"") + field + "\":\"";
    const auto begin = compact.find(prefix);
    if (begin == std::string::npos) {
        return {};
    }

    const auto value_begin = begin + prefix.size();
    std::string value;
    value.reserve(32);
    bool escaped = false;
    for (std::size_t index = value_begin; index < compact.size(); ++index) {
        const char c = compact[index];
        if (escaped) {
            value.push_back(c);
            escaped = false;
            continue;
        }
        if (c == '\\') {
            escaped = true;
            continue;
        }
        if (c == '"') {
            return value;
        }
        value.push_back(c);
    }
    return {};
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
    else if (has(compact, "\"type\":\"voice.set\"")) command.type = ControlCommandType::voice_set;

    if (has(compact, "\"source\":\"screen\"")) command.source = "screen";
    else if (has(compact, "\"source\":\"window\"")) command.source = "window";
    if (has(compact, "\"profile\":\"local-record\"")) command.profile = "local-record";
    if (has(compact, "\"profile\":\"rtmp\"")) command.profile = "rtmp";
    if (has(compact, "\"effect\":\"anime-bright\"")) command.effect = "anime-bright";
    if (has(compact, "\"effect\":\"off\"")) command.effect = "off";
    command.target = read_string_field(compact, "target");
    command.window_index = read_int_field(compact, "window_index");
    command.request_id = read_string_field(compact, "id");
    return command;
}

std::string escape_json_string(const std::string& value) {
    std::string escaped;
    escaped.reserve(value.size());
    for (char c : value) {
        switch (c) {
        case '\\': escaped += "\\\\"; break;
        case '"': escaped += "\\\""; break;
        case '\n': escaped += "\\n"; break;
        case '\r': escaped += "\\r"; break;
        case '\t': escaped += "\\t"; break;
        default: escaped.push_back(c); break;
        }
    }
    return escaped;
}

std::string control_response(
    bool ok,
    const std::string& message,
    const std::string& request_id) {
    const std::string id_fragment = request_id.empty()
        ? std::string()
        : std::string(",\"id\":\"") + escape_json_string(request_id) + "\"";
    return std::string("{\"ok\":") + (ok ? "true" : "false") +
           id_fragment + ",\"message\":\"" +
           escape_json_string(message) + "\"}\n";
}

} // namespace cari::native
