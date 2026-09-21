#pragma once

#include <string>
#include <vector>
#include <windows.h>

namespace cari::native {

struct WindowSourceInfo {
    HWND hwnd = nullptr;
    std::wstring title;
    std::wstring class_name;
    bool visible = false;
};

std::vector<WindowSourceInfo> enumerate_capturable_windows();

} // namespace cari::native
