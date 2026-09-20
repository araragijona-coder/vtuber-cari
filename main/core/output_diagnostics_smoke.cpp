#include "output_diagnostics.h"

#include <cassert>
#include <iostream>

int main() {
    using namespace cari::studio::core;

    assert(classify_output_failure("") == OutputFailureCategory::none);
    assert(classify_output_failure("Connection timed out")
           == OutputFailureCategory::network);
    assert(classify_output_failure("Connection reset by peer")
           == OutputFailureCategory::network);
    assert(classify_output_failure("Broken pipe")
           != OutputFailureCategory::network);
    assert(classify_output_failure("Error initializing output stream")
           == OutputFailureCategory::encoder);
    assert(classify_output_failure("Error writing trailer")
           == OutputFailureCategory::mux);
    assert(classify_output_failure("Permission denied")
           == OutputFailureCategory::permission);
    assert(classify_output_failure("No such file or directory")
           == OutputFailureCategory::input);
    assert(classify_output_failure("something unexpected")
           == OutputFailureCategory::unknown);

    std::cout << "Output diagnostics smoke: PASS\n";
    return 0;
}
