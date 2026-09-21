#pragma once

#include "types.h"

#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

namespace cari::studio::core {

class ISource {
public:
    virtual ~ISource() = default;
    virtual SourceDescriptor descriptor() const = 0;
    virtual bool start() = 0;
    virtual void stop() noexcept = 0;
    virtual SourceHealth health() const noexcept = 0;
};

class SourceRegistry final {
public:
    bool add(std::shared_ptr<ISource> source) {
        if (!source) {
            return false;
        }
        const auto id = source->descriptor().id;
        if (id.empty()) {
            return false;
        }
        std::lock_guard lock(mutex_);
        return sources_.emplace(id, std::move(source)).second;
    }

    bool remove(const std::string& id) {
        std::lock_guard lock(mutex_);
        return sources_.erase(id) != 0;
    }

    std::shared_ptr<ISource> get(const std::string& id) const {
        std::lock_guard lock(mutex_);
        const auto it = sources_.find(id);
        return it == sources_.end() ? nullptr : it->second;
    }

    std::vector<SourceDescriptor> descriptors() const {
        std::lock_guard lock(mutex_);
        std::vector<SourceDescriptor> result;
        result.reserve(sources_.size());
        for (const auto& [id, source] : sources_) {
            (void)id;
            result.push_back(source->descriptor());
        }
        return result;
    }

private:
    mutable std::mutex mutex_;
    std::unordered_map<std::string, std::shared_ptr<ISource>> sources_;
};

} // namespace cari::studio::core
