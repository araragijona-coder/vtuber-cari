#include "frame_bridge.h"

#include <cassert>
#include <iostream>

int main() {
    using namespace cari::native;

    CapturedFrame empty{};
    BridgedFrame output;
    std::wstring error;

    assert(!FrameBridge::copy_to_cpu(empty, output, error));
    assert(!error.empty());
    assert(!output.pixels);
    assert(output.frame.width == 0);
    assert(output.frame.height == 0);

    CapturedFrame invalid_size{};
    invalid_size.width = 1920;
    invalid_size.height = 0;
    assert(!FrameBridge::copy_to_cpu(invalid_size, output, error));
    assert(!error.empty());

    std::cout << "frame bridge smoke: PASS\n";
    return 0;
}
