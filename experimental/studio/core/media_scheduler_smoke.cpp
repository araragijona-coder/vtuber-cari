#include "media_scheduler.h"

#include <cassert>
#include <iostream>

int main() {
    using namespace cari::studio::core;

    RealtimePacer pacer;
    pacer.reset();

    constexpr Timestamp t0 = 10'000'000;
    constexpr Timestamp wall0 = 50'000'000;

    assert(pacer.decide(t0, wall0) == RealtimePaceDecision::emit);
    assert(pacer.decide(t0 + 330'000, wall0) == RealtimePaceDecision::wait);
    assert(pacer.decide(t0 + 330'000, wall0 + 330'000) == RealtimePaceDecision::emit);
    assert(pacer.decide(t0 + 330'000, wall0 + 2'000'000) == RealtimePaceDecision::late);

    // Backward media PTS are clamped so a malformed source cannot move the
    // scheduling timeline backwards.
    assert(pacer.decide(t0 + 100'000, wall0 + 100'000)
           != RealtimePaceDecision::wait);

    std::cout << "Realtime media scheduler smoke: PASS\n";
    return 0;
}
