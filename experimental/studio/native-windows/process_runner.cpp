#include "process_runner.h"

#include <windows.h>

#include <string>

namespace cari::native {

namespace {

std::wstring quote_argument(const std::wstring& value) {
    if (value.empty()) return L"\"\"";
    bool needs_quotes = false;
    for (wchar_t character : value) {
        if (character == L' ' || character == L'\t' || character == L'\"') {
            needs_quotes = true;
            break;
        }
    }
    if (!needs_quotes) return value;
    std::wstring quoted;
    quoted.push_back(L'\"');
    unsigned backslashes = 0;
    for (wchar_t character : value) {
        if (character == L'\\') { ++backslashes; continue; }
        if (character == L'\"') {
            quoted.append(backslashes * 2u + 1u, L'\\');
            quoted.push_back(L'\"');
            backslashes = 0;
            continue;
        }
        if (backslashes != 0) { quoted.append(backslashes, L'\\'); backslashes = 0; }
        quoted.push_back(character);
    }
    quoted.append(backslashes * 2u, L'\\');
    quoted.push_back(L'\"');
    return quoted;
}

std::wstring build_command_line(const std::wstring& executable,
                                const std::vector<std::wstring>& arguments) {
    std::wstring command_line = quote_argument(executable);
    for (const auto& argument : arguments) {
        command_line.push_back(L' ');
        command_line += quote_argument(argument);
    }
    return command_line;
}

} // namespace

ProcessRunner::~ProcessRunner() {
    terminate();
    close_handles();
}

bool ProcessRunner::start(const std::wstring& executable,
                          const std::vector<std::wstring>& arguments,
                          const std::wstring& working_directory) {
    return start_internal(executable, arguments, working_directory, false);
}

bool ProcessRunner::start_with_stderr_capture(
    const std::wstring& executable,
    const std::vector<std::wstring>& arguments,
    const std::wstring& working_directory) {
    return start_internal(executable, arguments, working_directory, true);
}

bool ProcessRunner::start_internal(const std::wstring& executable,
                                   const std::vector<std::wstring>& arguments,
                                   const std::wstring& working_directory,
                                   bool capture_stderr) {
    terminate();
    close_handles();

    SECURITY_ATTRIBUTES security_attributes{};
    security_attributes.nLength = sizeof(security_attributes);
    security_attributes.bInheritHandle = TRUE;

    HANDLE stderr_read = nullptr;
    HANDLE stderr_write = nullptr;
    HANDLE null_output = nullptr;

    if (capture_stderr) {
        if (!CreatePipe(&stderr_read, &stderr_write, &security_attributes, 0)) {
            return false;
        }
        if (!SetHandleInformation(stderr_read, HANDLE_FLAG_INHERIT, 0)) {
            CloseHandle(stderr_read);
            CloseHandle(stderr_write);
            return false;
        }
        null_output = CreateFileW(
            L"NUL", GENERIC_WRITE, FILE_SHARE_READ | FILE_SHARE_WRITE,
            &security_attributes, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
        if (null_output == INVALID_HANDLE_VALUE) {
            CloseHandle(stderr_read);
            CloseHandle(stderr_write);
            return false;
        }
    }

    std::wstring command_line = build_command_line(executable, arguments);
    STARTUPINFOW startup{};
    startup.cb = sizeof(startup);
    PROCESS_INFORMATION process{};

    if (capture_stderr) {
        startup.dwFlags |= STARTF_USESTDHANDLES;
        startup.hStdInput = GetStdHandle(STD_INPUT_HANDLE);
        startup.hStdOutput = null_output;
        startup.hStdError = stderr_write;
    }

    std::wstring mutable_working_directory = working_directory;
    const BOOL created = CreateProcessW(
        executable.c_str(),
        command_line.data(),
        nullptr, nullptr, capture_stderr ? TRUE : FALSE, CREATE_NO_WINDOW, nullptr,
        working_directory.empty() ? nullptr : mutable_working_directory.data(),
        &startup, &process);

    if (capture_stderr) {
        CloseHandle(stderr_write);
        CloseHandle(null_output);
    }

    if (!created) {
        if (stderr_read != nullptr) CloseHandle(stderr_read);
        return false;
    }

    process_handle_ = process.hProcess;
    thread_handle_ = process.hThread;
    stderr_read_handle_ = stderr_read;
    return true;
}

void ProcessRunner::terminate() noexcept {
    if (process_handle_ == nullptr) return;
    const auto process = static_cast<HANDLE>(process_handle_);
    if (WaitForSingleObject(process, 0) == WAIT_TIMEOUT) {
        TerminateProcess(process, 1);
        WaitForSingleObject(process, 1000);
    }
}

ProcessResult ProcessRunner::wait(unsigned long timeout_ms) noexcept {
    ProcessResult result{};
    if (process_handle_ == nullptr) return result;
    result.started = true;
    const auto process = static_cast<HANDLE>(process_handle_);
    const DWORD wait_status = WaitForSingleObject(process, timeout_ms);
    if (wait_status == WAIT_TIMEOUT || wait_status != WAIT_OBJECT_0) return result;
    result.exited = true;
    DWORD exit_code = 0;
    if (GetExitCodeProcess(process, &exit_code)) result.exit_code = exit_code;
    close_process_handles();
    return result;
}

bool ProcessRunner::drain_stderr(std::string& output) noexcept {
    output.clear();
    if (stderr_read_handle_ == nullptr) return false;

    const auto pipe = static_cast<HANDLE>(stderr_read_handle_);
    for (;;) {
        DWORD available = 0;
        if (!PeekNamedPipe(pipe, nullptr, 0, nullptr, &available, nullptr)) {
            return GetLastError() == ERROR_BROKEN_PIPE;
        }
        if (available == 0) return true;

        constexpr DWORD kChunkSize = 4096;
        const DWORD bytes_to_read = available < kChunkSize ? available : kChunkSize;
        char buffer[kChunkSize]{};
        DWORD bytes_read = 0;
        if (!ReadFile(pipe, buffer, bytes_to_read, &bytes_read, nullptr)) {
            return GetLastError() == ERROR_BROKEN_PIPE;
        }
        if (bytes_read == 0) return true;
        output.append(buffer, buffer + bytes_read);
    }
}

void ProcessRunner::close_process_handles() noexcept {
    if (thread_handle_ != nullptr) {
        CloseHandle(static_cast<HANDLE>(thread_handle_));
        thread_handle_ = nullptr;
    }
    if (process_handle_ != nullptr) {
        CloseHandle(static_cast<HANDLE>(process_handle_));
        process_handle_ = nullptr;
    }
}

void ProcessRunner::close_handles() noexcept {
    close_process_handles();
    if (stderr_read_handle_ != nullptr) {
        CloseHandle(static_cast<HANDLE>(stderr_read_handle_));
        stderr_read_handle_ = nullptr;
    }
}

} // namespace cari::native
