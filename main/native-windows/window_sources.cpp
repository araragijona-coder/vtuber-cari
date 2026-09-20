#include "window_sources.h"

#include <algorithm>

namespace cari::native {
namespace {

std::wstring get_window_text(HWND hwnd) {
    const int length = GetWindowTextLengthW(hwnd);
    if (length <= 0) {
        return {};
    }
    std::wstring text(static_cast<std::size_t>(length) + 1, L'\0');
    const int written = GetWindowTextW(hwnd, text.data(), length + 1);
    if (written <= 0) {
        return {};
    }
    text.resize(static_cast<std::size_t>(written));
    return text;
}

std::wstring get_class_name(HWND hwnd) {
    std::wstring text(256, L'\0');
    const int written = GetClassNameW(hwnd, text.data(), static_cast<int>(text.size()));
    if (written <= 0) {
        return {};
    }
    text.resize(static_cast<std::size_t>(written));
    return text;
}

BOOL CALLBACK enumerate_window(HWND hwnd, LPARAM parameter) {
    auto* result = reinterpret_cast<std::vector<WindowSourceInfo>*>(parameter);
    if (!result || !IsWindow(hwnd) || !IsWindowVisible(hwnd)) {
        return TRUE;
    }

    const auto title = get_window_text(hwnd);
    if (title.empty()) {
        return TRUE;
    }

    result->push_back({hwnd, title, get_class_name(hwnd), true});
    return TRUE;
}

} // namespace

std::vector<WindowSourceInfo> enumerate_capturable_windows() {
    std::vector<WindowSourceInfo> result;
    EnumWindows(enumerate_window, reinterpret_cast<LPARAM>(&result));
    std::sort(result.begin(), result.end(), [](const auto& lhs, const auto& rhs) {
        return lhs.title < rhs.title;
    });
    return result;
}

} // namespace cari::native
