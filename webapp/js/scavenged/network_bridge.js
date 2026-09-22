(() => {
  "use strict";

  const DEFAULT_ENDPOINT = "/api/combat/action";
  const DEFAULT_TIMEOUT_MS = 8000;
  const DEFAULT_MAX_RETRIES = 3;
  const DEFAULT_BACKOFF_MS = 250;
  const DEFAULT_MAX_BACKOFF_MS = 2000;

  const hooks = {
    onServerState: null,
    onCorrection: null,
    onReplay: null
  };

  function telegramInitData() {
    return window.Telegram?.WebApp?.initData || "";
  }

  function isAbortError(error) {
    return error?.name === "AbortError";
  }

  function isNetworkFailure(error) {
    return error instanceof TypeError || isAbortError(error);
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function backoffDelay(retryNumber, baseMs, maxMs) {
    const exponential = Math.min(
      maxMs,
      baseMs * Math.pow(2, Math.max(0, retryNumber - 1))
    );
    const jitter = Math.floor(Math.random() * Math.max(1, exponential * 0.25));
    return Math.min(maxMs, exponential + jitter);
  }

  function comparableResolution(resolution) {
    if (!resolution || typeof resolution !== "object") return null;
    return {
      damage: resolution.damage,
      targetHpBefore: resolution.targetHpBefore,
      targetHpAfter: resolution.targetHpAfter,
      isCritical: resolution.isCritical,
      variance: resolution.variance,
      outcome: resolution.outcome
    };
  }

  function detectCorrection(requestPayload, responseData) {
    const local = comparableResolution(requestPayload?.resolution);
    const authoritative = comparableResolution(responseData?.resolution);
    if (!local || !authoritative) return null;

    const fields = Object.keys(authoritative).filter(
      (field) => local[field] !== authoritative[field]
    );
    if (fields.length === 0) return null;

    return {
      fields,
      local: structuredClone(local),
      server: structuredClone(authoritative)
    };
  }

  async function requestJson(url, options = {}) {
    const {
      method = "GET",
      body,
      timeoutMs = DEFAULT_TIMEOUT_MS,
      maxRetries = DEFAULT_MAX_RETRIES,
      backoffMs = DEFAULT_BACKOFF_MS,
      maxBackoffMs = DEFAULT_MAX_BACKOFF_MS,
      headers = {}
    } = options;

    let lastError = null;

    for (let retryNumber = 0; retryNumber <= maxRetries; retryNumber += 1) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const requestHeaders = new Headers(headers);
        requestHeaders.set("Accept", "application/json");

        const initData = telegramInitData();
        if (initData) requestHeaders.set("X-Telegram-Init-Data", initData);
        if (body !== undefined) requestHeaders.set("Content-Type", "application/json");

        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body === undefined ? undefined : JSON.stringify(body),
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal
        });

        const text = await response.text();
        let data = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (_error) {
            throw new Error("Server returned a non-JSON response (HTTP " + response.status + ")");
          }
        }

        if (!response.ok) {
          const error = new Error(
            data?.error || "HTTP request failed with status " + response.status
          );
          error.name = "HttpError";
          error.status = response.status;
          error.data = data;
          throw error;
        }

        return { ok: true, status: response.status, data };
      } catch (error) {
        lastError = error;
        if (!isNetworkFailure(error) || retryNumber >= maxRetries) throw error;
        await sleep(backoffDelay(retryNumber + 1, backoffMs, maxBackoffMs));
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    throw lastError || new Error("Network request failed");
  }

  async function sendCombatAction(payload, options = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new TypeError("combat payload must be an object");
    }

    const result = await requestJson(options.endpoint || DEFAULT_ENDPOINT, {
      method: "POST",
      body: payload,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      backoffMs: options.backoffMs ?? DEFAULT_BACKOFF_MS,
      maxBackoffMs: options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS
    });

    const responseData = result.data;
    if (!responseData || responseData.ok !== true) {
      const error = new Error(responseData?.error || "Combat request was rejected");
      error.name = "CombatResponseError";
      error.status = result.status;
      error.data = responseData;
      throw error;
    }

    if (responseData.serverState) {
      hooks.onServerState?.(structuredClone(responseData.serverState), structuredClone(responseData));
    }
    if (responseData.replayed) hooks.onReplay?.(structuredClone(responseData));

    const correction = detectCorrection(payload, responseData);
    if (correction) {
      hooks.onCorrection?.(structuredClone(correction), structuredClone(responseData));
    }

    return structuredClone(responseData);
  }

  function configure(nextHooks = {}) {
    for (const key of Object.keys(hooks)) {
      if (typeof nextHooks[key] === "function" || nextHooks[key] === null) hooks[key] = nextHooks[key];
    }
    return Object.freeze({ ...hooks });
  }

  window.CariNetwork = Object.freeze({
    requestJson,
    sendCombatAction,
    configure
  });
})();