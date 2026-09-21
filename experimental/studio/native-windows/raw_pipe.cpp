#include "raw_pipe.h"

#include <algorithm>
#include <limits>

namespace cari::native {

namespace {

HANDLE as_handle(void* value) noexcept {
    return static_cast<HANDLE>(value);
}

void* as_ptr(HANDLE value) noexcept {
    return static_cast<void*>(value);
}

} // namespace

RawPipe::~RawPipe() {
    close();
}

bool RawPipe::create(const std::wstring& name, std::size_t max_pending_bytes) {
    close();
    last_error_.clear();
    metrics_ = {};
    pending_queue_.clear();
    pending_bytes_ = 0;
    connect_overlapped_ = {};
    write_overlapped_ = {};

    if (name.empty() || max_pending_bytes == 0 ||
        max_pending_bytes > static_cast<std::size_t>(std::numeric_limits<DWORD>::max())) {
        fail("invalid raw pipe configuration");
        return false;
    }

    const auto buffer_size = static_cast<DWORD>(
        std::min<std::size_t>(max_pending_bytes, 1u << 20));

    pipe_handle_ = as_ptr(CreateNamedPipeW(
        name.c_str(),
        PIPE_ACCESS_OUTBOUND | FILE_FLAG_OVERLAPPED,
        PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
        1,
        buffer_size,
        buffer_size,
        0,
        nullptr));
    if (!pipe_handle_) {
        fail("CreateNamedPipeW failed");
        return false;
    }

    event_handle_ = as_ptr(CreateEventW(nullptr, TRUE, FALSE, nullptr));
    if (!event_handle_) {
        fail("CreateEventW failed");
        close();
        return false;
    }

    name_ = name;
    max_pending_bytes_ = max_pending_bytes;
    return true;
}

bool RawPipe::wait_for_client(unsigned long timeout_ms) noexcept {
    if (!pipe_handle_) {
        fail("pipe is not created");
        return false;
    }
    if (connected_) {
        return true;
    }

    if (!connect_pending_) {
        connect_overlapped_ = {};
        connect_overlapped_.hEvent = as_handle(event_handle_);
        ResetEvent(connect_overlapped_.hEvent);

        const BOOL result = ConnectNamedPipe(
            as_handle(pipe_handle_),
            &connect_overlapped_);
        if (result != FALSE) {
            connected_ = true;
            return true;
        }

        const DWORD error = GetLastError();
        if (error == ERROR_PIPE_CONNECTED) {
            connected_ = true;
            return true;
        }
        if (error != ERROR_IO_PENDING) {
            fail("ConnectNamedPipe failed");
            return false;
        }
        connect_pending_ = true;
    }

    if (timeout_ms != 0) {
        const DWORD wait_result = WaitForSingleObject(
            as_handle(event_handle_),
            timeout_ms);
        if (wait_result == WAIT_TIMEOUT) {
            return false;
        }
        if (wait_result == WAIT_FAILED) {
            fail("WaitForSingleObject failed");
            return false;
        }
    }

    return check_connect_completion();
}

bool RawPipe::write(const std::uint8_t* data, std::size_t size) noexcept {
    if (!connected_ || !pipe_handle_ || !data || size == 0) {
        ++metrics_.writes_dropped;
        return false;
    }
    if (size > std::numeric_limits<DWORD>::max()) {
        ++metrics_.writes_dropped;
        fail("raw pipe write exceeds Windows DWORD size");
        return false;
    }
    if (pending_bytes_ + size > max_pending_bytes_) {
        ++metrics_.writes_dropped;
        return false;
    }

    try {
        pending_queue_.emplace_back(reinterpret_cast<const char*>(data), size);
    } catch (...) {
        ++metrics_.errors;
        last_error_ = "failed to allocate raw pipe buffer";
        return false;
    }
    pending_bytes_ += size;

    if (!write_pending_) {
        return begin_write();
    }
    return true;
}

bool RawPipe::poll() noexcept {
    if (!pipe_handle_) {
        return true;
    }

    if (connect_pending_) {
        if (!check_connect_completion()) {
            return last_error_.empty();
        }
    }
    if (write_pending_ && !check_write_completion()) {
        return false;
    }
    if (connected_ && !write_pending_ && !pending_queue_.empty()) {
        return begin_write();
    }
    return true;
}

bool RawPipe::begin_write() noexcept {
    if (!connected_ || write_pending_ || pending_queue_.empty()) {
        return true;
    }

    ResetEvent(as_handle(event_handle_));
    write_overlapped_ = {};
    write_overlapped_.hEvent = as_handle(event_handle_);
    auto& buffer = pending_queue_.front();
    if (buffer.size() > std::numeric_limits<DWORD>::max()) {
        fail("pending raw pipe buffer exceeds Windows DWORD size");
        return false;
    }

    DWORD written = 0;
    const BOOL result = WriteFile(
        as_handle(pipe_handle_),
        buffer.data(),
        static_cast<DWORD>(buffer.size()),
        &written,
        &write_overlapped_);

    if (result != FALSE) {
        if (written != buffer.size()) {
            fail("raw pipe short write");
            return false;
        }
        metrics_.bytes_written += written;
        ++metrics_.writes_completed;
        pending_bytes_ -= buffer.size();
        pending_queue_.pop_front();
        return true;
    }

    const DWORD error = GetLastError();
    if (error == ERROR_IO_PENDING) {
        write_pending_ = true;
        ++metrics_.writes_pending;
        return true;
    }
    if (error == ERROR_NO_DATA || error == ERROR_BROKEN_PIPE) {
        fail("raw pipe client disconnected");
        return false;
    }

    fail("WriteFile failed");
    return false;
}

bool RawPipe::check_connect_completion() noexcept {
    if (!connect_pending_) {
        return true;
    }

    DWORD transferred = 0;
    if (GetOverlappedResult(
            as_handle(pipe_handle_),
            &connect_overlapped_,
            &transferred,
            FALSE) == FALSE) {
        const DWORD error = GetLastError();
        if (error == ERROR_IO_INCOMPLETE) {
            return true;
        }
        if (error == ERROR_PIPE_CONNECTED) {
            connected_ = true;
            connect_pending_ = false;
            return true;
        }
        fail("GetOverlappedResult(connect) failed");
        return false;
    }

    connected_ = true;
    connect_pending_ = false;
    return true;
}

bool RawPipe::check_write_completion() noexcept {
    if (!write_pending_) {
        return true;
    }

    DWORD transferred = 0;
    if (GetOverlappedResult(
            as_handle(pipe_handle_),
            &write_overlapped_,
            &transferred,
            FALSE) == FALSE) {
        const DWORD error = GetLastError();
        if (error == ERROR_IO_INCOMPLETE) {
            return true;
        }
        if (error == ERROR_BROKEN_PIPE || error == ERROR_NO_DATA) {
            fail("raw pipe client disconnected during write");
            return false;
        }
        fail("GetOverlappedResult(write) failed");
        return false;
    }

    if (pending_queue_.empty()) {
        fail("raw pipe completed write with empty queue");
        return false;
    }

    auto& buffer = pending_queue_.front();
    if (transferred != buffer.size()) {
        fail("raw pipe short overlapped write");
        return false;
    }

    metrics_.bytes_written += transferred;
    ++metrics_.writes_completed;
    pending_bytes_ -= buffer.size();
    pending_queue_.pop_front();
    write_pending_ = false;
    return true;
}

void RawPipe::close() noexcept {
    if (pipe_handle_ && (connect_pending_ || write_pending_)) {
        CancelIoEx(as_handle(pipe_handle_), nullptr);
    }

    if (pipe_handle_) {
        DisconnectNamedPipe(as_handle(pipe_handle_));
        CloseHandle(as_handle(pipe_handle_));
    }
    if (event_handle_) {
        CloseHandle(as_handle(event_handle_));
    }

    pipe_handle_ = nullptr;
    event_handle_ = nullptr;
    connected_ = false;
    connect_pending_ = false;
    write_pending_ = false;
    pending_bytes_ = 0;
    pending_queue_.clear();
    max_pending_bytes_ = 0;
    name_.clear();
    connect_overlapped_ = {};
    write_overlapped_ = {};
}

void RawPipe::fail(const char* message) noexcept {
    ++metrics_.errors;
    last_error_ = message ? std::string(message) : std::string("raw pipe error");
}

} // namespace cari::native
