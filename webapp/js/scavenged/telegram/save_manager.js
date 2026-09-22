(() => {
  "use strict";

  const DEFAULT_KEY = "cari_profile_v1";
  const CLOUD_TIMEOUT_MS = 1500;

  function getWebApp() {
    return window.Telegram?.WebApp || null;
  }

  function getCloudStorage() {
    const storage = getWebApp()?.CloudStorage;
    if (!storage ||
        typeof storage.setItem !== "function" ||
        typeof storage.getItem !== "function") {
      return null;
    }
    return storage;
  }

  function getLocalStorage() {
    try {
      return window.localStorage || null;
    } catch (_error) {
      return null;
    }
  }

  function cloneProfile(data) {
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      throw new TypeError("profile must be a non-array object");
    }

    return JSON.parse(JSON.stringify(data));
  }

  function parseProfile(serialized) {
    if (typeof serialized !== "string" || serialized.trim() === "") {
      return null;
    }

    try {
      const parsed = JSON.parse(serialized);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return null;
      }
      return parsed;
    } catch (_error) {
      return null;
    }
  }

  function withTimeout(promise, timeoutMs = CLOUD_TIMEOUT_MS) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        window.setTimeout(
          () => reject(new Error("CloudStorage operation timed out")),
          timeoutMs
        );
      })
    ]);
  }

  function callCloud(methodName, key, value) {
    const storage = getCloudStorage();
    if (!storage) {
      return Promise.reject(new Error("Telegram CloudStorage unavailable"));
    }

    return withTimeout(new Promise((resolve, reject) => {
      let settled = false;

      const settleSuccess = (result) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      const settleFailure = (error) => {
        if (settled) return;
        settled = true;
        reject(error instanceof Error ? error : new Error(String(error || "CloudStorage error")));
      };

      const callback = (error, result) => {
        if (error) {
          settleFailure(error);
        } else {
          settleSuccess(result);
        }
      };

      try {
        const result = methodName === "setItem"
          ? storage.setItem(key, value, callback)
          : storage.getItem(key, callback);

        if (result && typeof result.then === "function") {
          result.then(settleSuccess, settleFailure);
        }
      } catch (error) {
        settleFailure(error);
      }
    }));
  }

  function localSave(key, serialized) {
    const storage = getLocalStorage();
    if (!storage) return false;

    try {
      storage.setItem(key, serialized);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function localLoad(key) {
    const storage = getLocalStorage();
    if (!storage) return null;

    try {
      return parseProfile(storage.getItem(key));
    } catch (_error) {
      return null;
    }
  }

  async function saveProfile(data) {
    const profile = cloneProfile(data);
    const serialized = JSON.stringify(profile);
    const key = DEFAULT_KEY;

    try {
      const result = await callCloud("setItem", key, serialized);
      if (result === false) {
        throw new Error("Telegram CloudStorage rejected the profile");
      }
      return true;
    } catch (_cloudError) {
      return localSave(key, serialized);
    }
  }

  async function loadProfile() {
    const key = DEFAULT_KEY;

    try {
      const serialized = await callCloud("getItem", key);
      const cloudProfile = parseProfile(serialized);

      if (cloudProfile) {
        return cloudProfile;
      }

      return localLoad(key);
    } catch (_cloudError) {
      return localLoad(key);
    }
  }

  function isCloudStorageAvailable() {
    return getCloudStorage() !== null;
  }

  window.CariSaveManager = Object.freeze({
    saveProfile,
    loadProfile,
    isCloudStorageAvailable,
    key: DEFAULT_KEY
  });
})();