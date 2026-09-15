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
    terminate();
    close_handles();
    std::wstring command_line = build_command_line(executable, arguments);
    STARTUPINFOW startup{};
    startup.cb = sizeof(startup);
    PROCESS_INFORMATION process{};
    std::wstring mutable_working_directory = working_directory;
    const BOOL created = CreateProcessW(
        executable.c_str(),
        command_line.data(),
        nullptr, nullptr, FALSE, CREATE_NO_WINDOW, nullptr,
        working_directory.empty() ? nullptr : mutable_working_directory.data(),
        &startup, &process);
    if (!created) return false;
    process_handle_ = process.hProcess;
    thread_handle_ = process.hThread;
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
    close_handles();
    return result;
}

void ProcessRunner::close_handles() noexcept {
    if (thread_handle_ != nullptr) {
        CloseHandle(static_cast<HANDLE>(thread_handle_));
        thread_handle_ = nullptr;
    }
    if (process_handle_ != nullptr) {
        CloseHandle(static_cast<HANDLE>(process_handle_));
        process_handle_ = nullptr;
    }
}

} // namespace cari::native
