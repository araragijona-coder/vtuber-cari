#include "control_protocol.h"

#include <cassert>
#include <iostream>

int main() {
    using cari::native::ControlCommandType;

    const auto status = cari::native::parse_control_command(
        R"( { "type" : "status", "source" : "window" } )");
    assert(status.type == ControlCommandType::status);
    assert(status.source == "window");

    const auto output = cari::native::parse_control_command(
        R"({"type" : "output.start", "profile" : "local-record", "target" : "capture.mkv", "id" : "req-17"})");
    assert(output.type == ControlCommandType::output_start);
    assert(output.profile == "local-record");
    assert(output.target == "capture.mkv");
    assert(output.request_id == "req-17");

    const auto voice = cari::native::parse_control_command(
        R"({"type":"voice.set","effect":"anime-bright","id":"voice-01"})");
    assert(voice.type == ControlCommandType::voice_set);
    assert(voice.effect == "anime-bright");
    assert(voice.request_id == "voice-01");

    const auto invalid = cari::native::parse_control_command(
        R"({"type":"not-a-command"})");
    assert(invalid.type == ControlCommandType::invalid);

    const auto response = cari::native::control_response(true, "ok\nready", "req-17");
    assert(response == "{\"ok\":true,\"id\":\"req-17\",\"message\":\"ok\\nready\"}\n");

    const auto escaped = cari::native::control_response(
        true, "quote: \" slash: \\", "id-\\42");
    assert(
        escaped ==
        "{\"ok\":true,\"id\":\"id-\\\\42\",\"message\":\"quote: \\\" slash: \\\\ \"}\n");

    std::cout << "control protocol smoke: OK\n";
    return 0;
}
