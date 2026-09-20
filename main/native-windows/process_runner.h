#pragma once

#include <string>
#include <vector>

namespace cari::native {

struct ProcessResult {
    bool started = false;
    bool exited = false;
    unsigned long exit_code = 0;
    std::wstring error;
};

class ProcessRunner final {
public:
    ProcessRunner() = default;
    ~ProcessRunner();

    ProcessRunner(const ProcessRunner&) = delete;
    ProcessRunner& operator=(const ProcessRunner&) = delete;

    bool start(const std::wstring& executable,
               const std::vector<std::wstring>& arguments,
               const std::wstring& working_directory = {});

    // Same lifecycle as start(), but redirects the child stderr stream into a
    // bounded, caller-drained pipe. stdout remains attached to the process's
    // normal inherited output.
    bool start_with_stderr_capture(const std::wstring& executable,
                                   const std::vector<std::wstring>& arguments,
                                   const std::wstring& working_directory = {});

    void terminate() noexcept;
    ProcessResult wait(unsigned long timeout_ms = 0xFFFFFFFFu) noexcept;

    // Returns currently available stderr bytes without blocking. The caller
    // can poll while the process is running and drain once more after exit.
    bool drain_stderr(std::string& output) noexcept;

    [[nodiscard]] bool running() const noexcept { return process_handle_ != nullptr; }
    [[nodiscard]] bool captures_stderr() const noexcept { return stderr_read_handle_ != nullptr; }

private:
    bool start_internal(const std::wstring& executable,
                        const std::vector<std::wstring>& arguments,
                        const std::wstring& working_directory,
                        bool capture_stderr);
    void close_process_handles() noexcept;
    void close_handles() noexcept;

    void* process_handle_ = nullptr;
    void* thread_handle_ = nullptr;
    void* stderr_read_handle_ = nullptr;
};

} // namespace cari::native
