#pragma once

#include "types.h"

#include <algorithm>
#include <string>
#include <utility>
#include <vector>

namespace cari::studio::core {

struct SceneLayer {
    std::string source_id;
    int z_order = 0;
    bool visible = true;
    float opacity = 1.0f;
    std::int32_t x = 0;
    std::int32_t y = 0;
    float scale_x = 1.0f;
    float scale_y = 1.0f;
};

class Scene final {
public:
    explicit Scene(std::string id = {}) : id_(std::move(id)) {}

    [[nodiscard]] const std::string& id() const noexcept { return id_; }
    void set_id(std::string id) { id_ = std::move(id); }

    bool add_layer(SceneLayer layer) {
        if (layer.source_id.empty() || layer.scale_x <= 0.0f || layer.scale_y <= 0.0f) {
            return false;
        }
        if (std::any_of(layers_.begin(), layers_.end(), [&](const SceneLayer& item) {
                return item.source_id == layer.source_id;
            })) {
            return false;
        }
        layer.opacity = std::clamp(layer.opacity, 0.0f, 1.0f);
        layers_.push_back(std::move(layer));
        sort_layers();
        return true;
    }

    bool remove_layer(const std::string& source_id) {
        const auto old_size = layers_.size();
        layers_.erase(std::remove_if(layers_.begin(), layers_.end(), [&](const SceneLayer& layer) {
            return layer.source_id == source_id;
        }), layers_.end());
        return layers_.size() != old_size;
    }

    bool set_visible(const std::string& source_id, bool visible) {
        for (auto& layer : layers_) {
            if (layer.source_id == source_id) {
                layer.visible = visible;
                return true;
            }
        }
        return false;
    }

    [[nodiscard]] const std::vector<SceneLayer>& layers() const noexcept { return layers_; }

private:
    void sort_layers() {
        std::stable_sort(layers_.begin(), layers_.end(), [](const SceneLayer& a, const SceneLayer& b) {
            return a.z_order < b.z_order;
        });
    }

    std::string id_;
    std::vector<SceneLayer> layers_;
};

} // namespace cari::studio::core
