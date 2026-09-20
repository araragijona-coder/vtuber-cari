#include "media_foundation_camera.h"

#include <cassert>
#include <iostream>

int main() {
    const auto cameras = cari::native::MediaFoundationCamera::enumerate();

    for (const auto& camera : cameras) {
        assert(!camera.friendly_name.empty());
    }

    std::cout << "Media Foundation camera enumeration smoke: PASS ("
              << cameras.size() << " device(s))\n";
    return 0;
}
