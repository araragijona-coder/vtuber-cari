#include "media_clock.h"

#include <cassert>
#include <iostream>

int main() {
    using namespace cari::studio::core;

    assert(MediaClock::seconds_to_ticks(1.0) == 10'000'000);
    assert(MediaClock::milliseconds_to_ticks(250) == 2'500'000);
    assert(MediaClock::ticks_to_seconds(5'000'000) == 0.5);

    const Timestamp origin = 12'000'000;
    assert(MediaClock::normalize(14'500'000, origin) == 2'500'000);
    assert(MediaClock::clamp_non_decreasing(90, 100) == 100);
    assert(MediaClock::clamp_non_decreasing(110, 100) == 110);

    const Timestamp first = MediaClock::monotonic_now();
    const Timestamp second = MediaClock::monotonic_now();
    assert(second >= first);

    std::cout << "Media clock smoke: PASS\n";
    return 0;
}
