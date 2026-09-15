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
    void terminate() noexcept;
    ProcessResult wait(unsigned long timeout_ms = 0xFFFFFFFFu) noexcept;
    [[nodiscard]] bool running() const noexcept { return process_handle_ != nullptr; }

private:
    void close_handles() noexcept;

    void* process_handle_ = nullptr;
    void* thread_handle_ = nullptr;
};

} // namespace cari::native
