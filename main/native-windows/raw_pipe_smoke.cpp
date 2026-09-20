#include "raw_pipe.h"

#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#include <array>
#include <chrono>
#include <iostream>
#include <string>
#include <thread>

namespace {

bool check(bool condition, const char* message) {
    if (!condition) {
        std::cerr << "raw-pipe-smoke: " << message << "\n";
        return false;
    }
    return true;
}

} // namespace

int main() {
    const std::wstring pipe_name =
        L"\\\\.\\pipe\\cari-studio-raw-pipe-smoke-" +
        std::to_wstring(GetCurrentProcessId());

    cari::native::RawPipe pipe;
    if (!check(pipe.create(pipe_name, 64 * 1024), "create failed")) {
        return 1;
    }

    std::array<std::uint8_t, 32> payload{};
    const std::string expected = "cari-raw-pipe-ok";
    std::copy(expected.begin(), expected.end(), payload.begin());

    std::string received;
    std::thread client([&] {
        const HANDLE handle = CreateFileW(
            pipe_name.c_str(),
            GENERIC_READ,
            0,
            nullptr,
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL,
            nullptr);
        if (handle == INVALID_HANDLE_VALUE) {
            return;
        }

        std::array<char, 64> buffer{};
        DWORD bytes_read = 0;
        if (ReadFile(handle, buffer.data(), static_cast<DWORD>(buffer.size()), &bytes_read, nullptr)) {
            received.assign(buffer.data(), buffer.data() + bytes_read);
        }
        CloseHandle(handle);
    });

    if (!check(pipe.wait_for_client(2000), "client connection timed out")) {
        client.join();
        return 1;
    }

    if (!check(pipe.write(payload.data(), expected.size()), "write failed")) {
        client.join();
        return 1;
    }

    for (int i = 0; i < 200 && received.empty(); ++i) {
        if (!check(pipe.poll(), "poll failed")) {
            client.join();
            return 1;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
    }
    client.join();

    if (!check(received == expected, "payload mismatch")) {
        return 1;
    }
    if (!check(pipe.metrics().writes_completed == 1, "expected one completed write")) {
        return 1;
    }
    if (!check(pipe.metrics().bytes_written == expected.size(), "unexpected byte count")) {
        return 1;
    }

    pipe.close();
    std::cout << "raw-pipe-smoke: PASS\n";
    return 0;
}
