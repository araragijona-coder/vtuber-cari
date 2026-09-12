#pragma once

#include <mmdeviceapi.h>

#include <string>
#include <vector>

namespace cari::native {

struct AudioEndpointInfo {
    std::wstring id;
    std::wstring name;
    EDataFlow flow;
};

std::vector<AudioEndpointInfo> enumerate_audio_endpoints();

} // namespace cari::native
