#include "audio_probe.h"

#include <windows.h>
#include <functiondiscoverykeys_devpkey.h>
#include <wrl/client.h>

#include <utility>

using Microsoft::WRL::ComPtr;

namespace cari::native {

namespace {

void append_endpoints(
    IMMDeviceEnumerator* enumerator,
    EDataFlow flow,
    std::vector<AudioEndpointInfo>& result) {
    ComPtr<IMMDeviceCollection> devices;
    if (FAILED(enumerator->EnumAudioEndpoints(
            flow, DEVICE_STATE_ACTIVE, &devices))) {
        return;
    }

    UINT count = 0;
    if (FAILED(devices->GetCount(&count))) {
        return;
    }

    for (UINT index = 0; index < count; ++index) {
        ComPtr<IMMDevice> device;
        if (FAILED(devices->Item(index, &device))) {
            continue;
        }

        LPWSTR raw_id = nullptr;
        if (FAILED(device->GetId(&raw_id))) {
            continue;
        }
        std::wstring id(raw_id);
        CoTaskMemFree(raw_id);

        ComPtr<IPropertyStore> properties;
        if (FAILED(device->OpenPropertyStore(STGM_READ, &properties))) {
            continue;
        }

        PROPVARIANT value;
        PropVariantInit(&value);
        std::wstring name;
        if (SUCCEEDED(properties->GetValue(PKEY_Device_FriendlyName, &value)) &&
            value.vt == VT_LPWSTR && value.pwszVal) {
            name = value.pwszVal;
        }
        PropVariantClear(&value);

        result.push_back({std::move(id), std::move(name), flow});
    }
}

} // namespace

std::vector<AudioEndpointInfo> enumerate_audio_endpoints() {
    std::vector<AudioEndpointInfo> result;

    ComPtr<IMMDeviceEnumerator> enumerator;
    const HRESULT hr = CoCreateInstance(
        __uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL,
        IID_PPV_ARGS(&enumerator));
    if (FAILED(hr)) {
        return result;
    }

    append_endpoints(enumerator.Get(), eRender, result);
    append_endpoints(enumerator.Get(), eCapture, result);
    return result;
}

} // namespace cari::native
