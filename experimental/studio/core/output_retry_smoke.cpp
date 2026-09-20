#include "output_retry.h"

#include <cassert>
#include <iostream>

int main() {
    using namespace cari::studio::core;

    OutputRetryPolicy policy(OutputRetryConfig{
        .initial_delay = 10,
        .maximum_delay = 35,
        .maximum_attempts = 4,
    });

    constexpr Timestamp now = 100;

    assert(!policy.pending());
    assert(policy.schedule_failure(now));
    assert(policy.attempts() == 1);
    assert(policy.pending());
    assert(!policy.ready(now + 9));
    assert(policy.ready(now + 10));
    policy.consume_attempt();
    assert(!policy.pending());

    assert(policy.schedule_failure(now + 10));
    assert(policy.next_attempt() == now + 30); // +20
    policy.consume_attempt();

    assert(policy.schedule_failure(now + 30));
    assert(policy.next_attempt() == now + 65); // +35 capped
    policy.consume_attempt();

    assert(policy.schedule_failure(now + 65));
    assert(policy.attempts() == 4);
    policy.consume_attempt();
    assert(!policy.schedule_failure(now + 100));

    policy.on_success();
    assert(policy.attempts() == 0);
    assert(!policy.pending());

    std::cout << "Output retry policy smoke: PASS\n";
    return 0;
}
