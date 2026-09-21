#include "camera_sources.h"

#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <mferror.h>
#include <wrl/client.h>

namespace cari::native {
namespace {

using Microsoft::WRL::ComPtr;

std::wstring read_string(IMFAttributes* attributes, const GUID& key) {
    if (!attributes) {
        return {};
    }
    UINT32 length = 0;
    if (FAILED(attributes->GetStringLength(key, &length))) {
        return {};
    }
    std::wstring value(static_cast<std::size_t>(length) + 1, L'\0');
    if (FAILED(attributes->GetString(key, value.data(), length + 1, nullptr))) {
        return {};
    }
    value.resize(static_cast<std::size_t>(length));
    return value;
}

} // namespace

std::vector<CameraSourceInfo> enumerate_cameras() {
    std::vector<CameraSourceInfo> result;

    if (FAILED(MFStartup(MF_VERSION, MFSTARTUP_LITE))) {
        return result;
    }

    ComPtr<IMFAttributes> attributes;
    if (FAILED(MFCreateAttributes(&attributes, 1))) {
        MFShutdown();
        return result;
    }

    if (FAILED(attributes->SetGUID(
            MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE,
            MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE_VIDCAP_GUID))) {
        MFShutdown();
        return result;
    }

    IMFActivate** devices = nullptr;
    UINT32 count = 0;
    const HRESULT hr = MFEnumDeviceSources(attributes.Get(), &devices, &count);
    if (SUCCEEDED(hr)) {
        for (UINT32 index = 0; index < count; ++index) {
            if (!devices[index]) {
                continue;
            }
            const std::wstring friendly = read_string(
                devices[index], MF_DEVSOURCE_ATTRIBUTE_FRIENDLY_NAME);
            const std::wstring symbolic = read_string(
                devices[index], MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE_VIDCAP_SYMBOLIC_LINK);
            if (!friendly.empty()) {
                result.push_back({friendly, symbolic});
            }
            devices[index]->Release();
        }
        CoTaskMemFree(devices);
    }

    MFShutdown();
    return result;
}

} // namespace cari::native
