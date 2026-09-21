#include "latest_item_queue.h"

#include <cassert>
#include <iostream>
#include <thread>

int main() {
    using cari::studio::core::LatestItemQueue;

    LatestItemQueue<int> queue;
    assert(queue.push(1));
    assert(queue.push(2));

    int value = 0;
    assert(queue.wait_pop(value));
    assert(value == 2);

    const auto stats = queue.stats();
    assert(stats.pushed == 2);
    assert(stats.replaced == 1);
    assert(stats.popped == 1);

    queue.stop();
    assert(!queue.push(3));
    assert(!queue.wait_pop(value));

    queue.reset();
    assert(queue.push(4));
    assert(queue.wait_pop(value));
    assert(value == 4);

    std::cout << "Latest item queue smoke: PASS\n";
    return 0;
}
