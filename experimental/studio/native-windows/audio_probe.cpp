#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <functiondiscoverykeys_devpkey.h>
#include <wrl/client.h>

#include <string>
#include <utility>
#include <vector>

using Microsoft::WRL::ComPtr;

namespace cari::native {

struct AudioEndpointInfo {
    std::wstring id;
    std::wstring name;
    EDataFlow flow;
};

std::vector<AudioEndpointInfo> enumerate_audio_endpoints() {
    std::vector<AudioEndpointInfo> result;

    ComPtr<IMMDeviceEnumerator> enumerator;
    HRESULT hr = CoCreateInstance(
        __uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL,
        IID_PPV_ARGS(&enumerator));
    if (FAILED(hr)) {
        return result;
    }

    ComPtr<IMMDeviceCollection> devices;
    hr = enumerator->EnumAudioEndpoints(
        eAll, DEVICE_STATE_ACTIVE, &devices);
    if (FAILED(hr)) {
        return result;
    }

    UINT count = 0;
    if (FAILED(devices->GetCount(&count))) {
        return result;
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

        EDataFlow flow = eAll;
        if (FAILED(device->Activate(
                __uuidof(IAudioClient), CLSCTX_ALL, nullptr, nullptr))) {
            // Discovery remains useful even when an endpoint cannot currently
            // expose an audio client. Keep the endpoint rather than failing the
            // entire enumeration.
        }

        result.push_back({std::move(id), std::move(name), flow});
    }

    return result;
}

} // namespace cari::native
