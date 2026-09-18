#include "av_sync.h"

#include <cassert>
#include <iostream>
#include <vector>

using namespace cari::studio::core;

static Frame video(Timestamp pts, std::uint64_t sequence) {
    Frame frame;
    frame.pts = pts;
    frame.sequence = sequence;
    return frame;
}

static AudioPacket audio(Timestamp pts, std::uint64_t sequence) {
    AudioPacket packet;
    packet.pts = pts;
    packet.sequence = sequence;
    packet.samples.assign(960, 0.0f);
    return packet;
}

int main() {
    AvSyncController sync;
    assert(!sync.next().has_value());

    sync.push_video(video(20'000'000, 2));
    sync.push_video(video(10'000'000, 1));
    auto first_video = sync.next();
    assert(first_video.has_value());
    assert(first_video->kind == AvSyncController::Event::Kind::video);
    assert(first_video->frame.has_value());
    assert(first_video->frame->pts == 10'000'000);

    sync.reset();
    sync.push_audio(audio(10'000'000, 1));
    sync.push_audio(audio(20'000'000, 2));
    sync.push_video(video(15'000'000, 3));

    auto first = sync.next();
    assert(first.has_value());
    assert(first->kind == AvSyncController::Event::Kind::audio);
    assert(first->audio->pts == 10'000'000);

    auto second = sync.next();
    assert(second.has_value());
    assert(second->kind == AvSyncController::Event::Kind::video);
    assert(second->frame->pts == 15'000'000);

    auto third = sync.next();
    assert(third.has_value());
    assert(third->kind == AvSyncController::Event::Kind::audio);
    assert(third->audio->pts == 20'000'000);

    assert(sync.stats().emitted_audio == 2);
    assert(sync.stats().emitted_video == 1);

    AvSyncController overflow(AvSyncConfig{.max_video_queue = 2, .max_audio_queue = 2});
    overflow.push_video(video(1, 1));
    overflow.push_video(video(2, 2));
    overflow.push_video(video(3, 3));
    assert(overflow.pending_video() == 2);
    assert(overflow.stats().video_dropped_overflow == 1);

    std::cout << "A/V sync ordering smoke: PASS\n";
    return 0;
}
