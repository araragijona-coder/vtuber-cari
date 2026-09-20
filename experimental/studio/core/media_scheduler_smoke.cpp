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

    // A/V streams have independent packet timelines, so the pacer must not
    // enforce a single global monotonic PTS across both stream types.
    assert(pacer.decide(t0 + 100'000, wall0 + 100'000)
           != RealtimePaceDecision::wait);

    assert(MediaInterleaver::select(false, 0, false, 0)
           == MediaStreamKind::none);
    assert(MediaInterleaver::select(true, 100, false, 0)
           == MediaStreamKind::audio);
    assert(MediaInterleaver::select(false, 0, true, 100)
           == MediaStreamKind::video);
    assert(MediaInterleaver::select(true, 100, true, 200)
           == MediaStreamKind::audio);
    assert(MediaInterleaver::select(true, 300, true, 200)
           == MediaStreamKind::video);
    // Equal PTS deliberately prefer audio to avoid starving the audio clock.
    assert(MediaInterleaver::select(true, 200, true, 200)
           == MediaStreamKind::audio);

    std::cout << "Realtime media scheduler/interleaver smoke: PASS\n";
    return 0;
}
