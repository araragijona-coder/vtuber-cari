#pragma once

#include <cstdint>
#include <memory>
#include <vector>

namespace cari::native {

class PlaceholderAvatarGpuSource final {
public:
    static std::shared_ptr<std::vector<std::uint8_t>> make_rgba(
        std::uint32_t width = 192,
        std::uint32_t height = 192);
};

} // namespace cari::native
