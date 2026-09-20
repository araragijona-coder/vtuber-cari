#pragma once

#include <string_view>

namespace cari::studio::core {

enum class OutputFailureCategory {
    none,
    network,
    encoder,
    input,
    mux,
    permission,
    unknown,
};

[[nodiscard]] inline OutputFailureCategory classify_output_failure(
    std::string_view message) noexcept {
    if (message.empty()) {
        return OutputFailureCategory::none;
    }

    auto contains = [message](std::string_view needle) noexcept {
        return message.find(needle) != std::string_view::npos;
    };

    if (contains("Connection refused") ||
        contains("Connection timed out") ||
        contains("Network is unreachable") ||
        contains("Could not resolve host") ||
        contains("Name or service not known") ||
        contains("Broken pipe") ||
        contains("TLS handshake failed") ||
        contains("Network error")) {
        return OutputFailureCategory::network;
    }

    if (contains("Permission denied") ||
        contains("Access is denied")) {
        return OutputFailureCategory::permission;
    }

    if (contains("No such file") ||
        contains("Invalid argument") ||
        contains("Invalid data found") ||
        contains("Input/output error")) {
        return OutputFailureCategory::input;
    }

    if (contains("Error initializing output stream") ||
        contains("Encoder") ||
        contains("Unknown encoder") ||
        contains("Could not open encoder")) {
        return OutputFailureCategory::encoder;
    }

    if (contains("Error writing trailer") ||
        contains("Error muxing") ||
        contains("Muxer") ||
        contains("Could not write header")) {
        return OutputFailureCategory::mux;
    }

    return OutputFailureCategory::unknown;
}

} // namespace cari::studio::core
