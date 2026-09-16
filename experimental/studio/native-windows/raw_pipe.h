#pragma once

#include <cstddef>
#include <cstdint>
#include <string>

namespace cari::native {

struct RawPipeMetrics {
    std::uint64_t bytes_written = 0;
    std::uint64_t writes_completed = 0;
    std::uint64_t writes_pending = 0;
    std::uint64_t writes_dropped = 0;
    std::uint64_t errors = 0;
};

// Windows-only byte transport for feeding a local media process without
// blocking capture/audio producer threads. The server owns the pipe and
// exposes a client endpoint name for the child process to open.
class RawPipe final {
public:
    RawPipe() = default;
    ~RawPipe();

    RawPipe(const RawPipe&) = delete;
    RawPipe& operator=(const RawPipe&) = delete;

    bool create(const std::wstring& name, std::size_t max_pending_bytes);
    bool wait_for_client(unsigned long timeout_ms) noexcept;
    bool write(const std::uint8_t* data, std::size_t size) noexcept;
    bool poll() noexcept;
    void close() noexcept;

    [[nodiscard]] bool created() const noexcept { return pipe_handle_ != nullptr; }
    [[nodiscard]] bool connected() const noexcept { return connected_; }
    [[nodiscard]] const std::wstring& name() const noexcept { return name_; }
    [[nodiscard]] const RawPipeMetrics& metrics() const noexcept { return metrics_; }
    [[nodiscard]] std::string last_error() const { return last_error_; }

private:
    bool begin_write(const std::uint8_t* data, std::size_t size) noexcept;
    void fail(const char* message) noexcept;

    void* pipe_handle_ = nullptr;
    void* event_handle_ = nullptr;
    bool connected_ = false;
    bool connect_pending_ = false;
    bool write_pending_ = false;
    std::size_t max_pending_bytes_ = 0;
    std::size_t pending_bytes_ = 0;
    std::wstring name_;
    std::string pending_buffer_;
    std::string last_error_;
    RawPipeMetrics metrics_{};
};

} // namespace cari::native
