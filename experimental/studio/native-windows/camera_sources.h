#pragma once

#include <string>
#include <vector>

namespace cari::native {

struct CameraSourceInfo {
    std::wstring friendly_name;
    std::wstring symbolic_link;
};

std::vector<CameraSourceInfo> enumerate_cameras();

} // namespace cari::native
