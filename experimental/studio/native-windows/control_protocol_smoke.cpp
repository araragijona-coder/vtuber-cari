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
        R"({"type" : "output.start", "profile" : "local-record"})");
    assert(output.type == ControlCommandType::output_start);
    assert(output.profile == "local-record");

    const auto invalid = cari::native::parse_control_command(
        R"({"type":"not-a-command"})");
    assert(invalid.type == ControlCommandType::invalid);

    const auto response = cari::native::control_response(true, "ok\nready");
    assert(response == "{\"ok\":true,\"message\":\"ok\\nready\"}\n");

    std::cout << "control protocol smoke: OK\n";
    return 0;
}
