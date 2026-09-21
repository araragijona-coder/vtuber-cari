import { evaluateResourceDemand, isNativeCommand } from "./resource-policy.mjs";

const DEFAULT_RTMP_RE = /^rtmps?:\/\//i;

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? "unknown error");
}

function acceptedResponse(result) {
  return Boolean(result && result.ok !== false);
}

export class StudioSessionManager {
  constructor(nativeApi) {
    this.native = nativeApi;
    this.queue = Promise.resolve();
    this.state = {
      engine: false,
      capture: false,
      audio: false,
      output: false,
      source: "window",
      windowIndex: 0,
      voice: "off",
      cameraIndex: 0,
      captureOwnedByOutput: false,
      audioOwnedByOutput: false
    };
  }

  snapshot() {
    return { ...this.state };
  }

  async #serialize(task) {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  async start() {
    return this.#serialize(async () => {
      if (this.state.engine) return { running: true, state: this.snapshot() };
      const result = await this.native.start();
      if (result?.running) this.state.engine = true;
      return { ...result, state: this.snapshot() };
    });
  }

  async stop() {
    return this.#serialize(async () => {
      if (!this.state.engine) return { ok: true, state: this.snapshot() };

      let outputResult = { ok: true };
      try {
        if (this.state.output) {
          outputResult = await this.native.send({ type: "output.stop" });
        }
      } finally {
        this.state.output = false;
        this.state.capture = false;
        this.state.audio = false;
        const result = await this.native.stop().catch(error => ({
          ok: false,
          error: asErrorMessage(error)
        }));
        this.state.engine = false;
        return {
          ok: acceptedResponse(result) && acceptedResponse(outputResult),
          output: outputResult,
          native: result,
          state: this.snapshot()
        };
      }
    });
  }

  async status() {
    return this.#serialize(async () => {
      const engine = await this.native.status();
      if (!engine.running) {
        this.state.engine = false;
      }
      if (!engine.running) {
        return { engine, state: this.snapshot(), native: null };
      }

      const native = await this.native.send({ type: "status" });
      this.#syncFromNativeMessage(native?.message);
      return { engine, native, state: this.snapshot() };
    });
  }

  async send(type, payload = {}) {
    return this.#serialize(async () => {
      // Voice selection is configuration until audio is actually active.
      // Never spawn the native engine only to store a voice preference.
      if (type === "voice.set" && !this.state.engine && !this.state.audio) {
        this.state.voice = payload.effect || "off";
        return {
          ok: true,
          skipped: true,
          message: "voice=configured-no-audio",
          state: this.snapshot()
        };
      }

      if (!this.state.engine && isNativeCommand(type)) {
        const started = await this.native.start();
        if (!started?.running) {
          return {
            ok: false,
            error: started?.error || "native engine failed to start",
            state: this.snapshot()
          };
        }
        this.state.engine = true;
      }

      const result = await this.native.send({ type, ...payload });
      if (result?.ok === false) {
        return { ...result, state: this.snapshot() };
      }

      this.#applyCommandState(type, payload, result);
      return { ...result, state: this.snapshot() };
    });
  }

  async captureStart(source = "window", sourceIndex = undefined) {
    if (source !== "screen" && source !== "window" && source !== "camera") {
      return {
        ok: false,
        error: "unsupported capture source",
        state: this.snapshot()
      };
    }

    const fallbackIndex =
      source === "camera" ? this.state.cameraIndex : this.state.windowIndex;
    const normalizedIndex = Number.isInteger(Number(sourceIndex))
      ? Number(sourceIndex)
      : fallbackIndex;

    if ((source === "window" || source === "camera") &&
        (normalizedIndex < 0 || normalizedIndex > 9999)) {
      return {
        ok: false,
        error: source === "camera"
          ? "invalid camera index"
          : "invalid capture window index",
        state: this.snapshot()
      };
    }

    return this.send("capture.start", {
      source,
      window_index: source === "window" ? normalizedIndex : -1,
      camera_index: source === "camera" ? normalizedIndex : -1
    });
  }

  async captureStop() {
    return this.#stopOnlyWhenRunning("capture.stop", "capture");
  }

  async audioStart() {
    return this.send("audio.start");
  }

  async microphoneSet(enabled = true) {
    const desired = Boolean(enabled);
    if (!this.state.engine && !desired) {
      return { ok: true, skipped: true, message: "microphone=off", state: this.snapshot() };
    }
    if (!this.state.engine) {
      const started = await this.native.start();
      if (!started?.running) {
        return {
          ok: false,
          error: started?.error || "native engine failed to start",
          state: this.snapshot()
        };
      }
      this.state.engine = true;
    }

    if (!this.state.audio && desired) {
      const audio = await this.native.send({ type: "audio.start" });
      if (!acceptedResponse(audio)) {
        return { ...audio, state: this.snapshot() };
      }
      this.state.audio = true;
    }

    const result = await this.native.send({
      type: "microphone.set",
      enabled: desired
    });
    return { ...result, state: this.snapshot() };
  }

  async audioStop() {
    return this.#stopOnlyWhenRunning("audio.stop", "audio");
  }

  async outputStart(profile = "local-record", target = "") {
    return this.#serialize(async () => {
      if (profile !== "local-record" && profile !== "rtmp") {
        return { ok: false, error: "unsupported output profile", state: this.snapshot() };
      }

      if (profile === "rtmp" && !DEFAULT_RTMP_RE.test(String(target).trim())) {
        return {
          ok: false,
          error: "RTMP target must start with rtmp:// or rtmps://",
          state: this.snapshot()
        };
      }

      if (!this.state.engine) {
        const started = await this.native.start();
        if (!started?.running) {
          return {
            ok: false,
            error: started?.error || "native engine failed to start",
            state: this.snapshot()
          };
        }
        this.state.engine = true;
      }

      let captureStartedHere = false;
      let audioStartedHere = false;

      try {
        if (!this.state.capture) {
          const capture = await this.native.send({
            type: "capture.start",
            source: this.state.source,
            window_index: this.state.source === "window" ? this.state.windowIndex : -1,
            camera_index: this.state.source === "camera" ? this.state.cameraIndex : -1
          });
          if (!acceptedResponse(capture)) {
            return { ...capture, state: this.snapshot() };
          }
          captureStartedHere = capture.message === "capture=started";
          this.state.captureOwnedByOutput = captureStartedHere;
          this.state.capture = true;
        }

        if (!this.state.audio) {
          const audio = await this.native.send({ type: "audio.start" });
          if (!acceptedResponse(audio)) {
            if (captureStartedHere) await this.native.send({ type: "capture.stop" });
            return { ...audio, state: this.snapshot() };
          }
          audioStartedHere = audio.message === "audio=started";
          this.state.audioOwnedByOutput = audioStartedHere;
          this.state.audio = true;
        }

        const output = await this.native.send({
          type: "output.start",
          profile,
          target: String(target || "").trim()
        });

        if (!acceptedResponse(output)) {
          if (audioStartedHere) await this.native.send({ type: "audio.stop" });
          if (captureStartedHere) await this.native.send({ type: "capture.stop" });
          if (audioStartedHere) this.state.audio = false;
          if (captureStartedHere) this.state.capture = false;
          this.state.audioOwnedByOutput = false;
          this.state.captureOwnedByOutput = false;
          await this.#releaseNativeIfIdle();
          return { ...output, state: this.snapshot() };
        }

        this.state.output = true;
        return { ...output, state: this.snapshot() };
      } catch (error) {
        if (audioStartedHere) await this.native.send({ type: "audio.stop" }).catch(() => undefined);
        if (captureStartedHere) await this.native.send({ type: "capture.stop" }).catch(() => undefined);
        if (audioStartedHere) this.state.audio = false;
        if (captureStartedHere) this.state.capture = false;
        this.state.audioOwnedByOutput = false;
        this.state.captureOwnedByOutput = false;
        await this.#releaseNativeIfIdle();
        return { ok: false, error: asErrorMessage(error), state: this.snapshot() };
      }
    });
  }

  async outputStop() {
    return this.#serialize(async () => {
      if (!this.state.engine || !this.state.output) {
        return { ok: true, skipped: true, state: this.snapshot() };
      }

      const result = await this.native.send({ type: "output.stop" });
      if (result?.ok !== false) {
        this.state.output = false;
      }

      if (result?.ok !== false && this.state.captureOwnedByOutput) {
        await this.native.send({ type: "capture.stop" }).catch(() => undefined);
        this.state.capture = false;
        this.state.captureOwnedByOutput = false;
      }

      if (result?.ok !== false && this.state.audioOwnedByOutput) {
        await this.native.send({ type: "audio.stop" }).catch(() => undefined);
        this.state.audio = false;
        this.state.audioOwnedByOutput = false;
      }

      await this.#releaseNativeIfIdle();
      return { ...result, state: this.snapshot() };
    });
  }

  async #stopOnlyWhenRunning(type, stateKey) {
    return this.#serialize(async () => {
      if (!this.state.engine || !this.state[stateKey]) {
        return { ok: true, skipped: true, state: this.snapshot() };
      }

      const result = await this.native.send({ type });
      if (result?.ok !== false) {
        this.#applyCommandState(type, {}, result);
        if (stateKey === "capture") this.state.captureOwnedByOutput = false;
        if (stateKey === "audio") this.state.audioOwnedByOutput = false;
      }
      await this.#releaseNativeIfIdle();
      return { ...result, state: this.snapshot() };
    });
  }

  async setVoiceEffect(effect = "off") {
    if (effect !== "off" && effect !== "anime-bright") {
      return {
        ok: false,
        error: "unsupported voice effect",
        state: this.snapshot()
      };
    }
    if (!this.state.engine && !this.state.audio) {
      this.state.voice = effect;
      return {
        ok: true,
        skipped: true,
        message: "voice=configured-no-audio",
        state: this.snapshot()
      };
    }
    return this.send("voice.set", { effect });
  }

  resourceDemand({ previewVisible = false, avatarOverlay = false, obs = {}, twitch = {} } = {}) {
    return evaluateResourceDemand({
      native: {
        engine: this.state.engine,
        capture: this.state.capture,
        audio: this.state.audio,
        output: this.state.output
      },
      obs,
      twitch,
      preview: { visible: previewVisible },
      avatarOverlay
    });
  }

  handleNativeEvent(event) {
    if (event?.type === "exit" || event?.type === "error") {
      this.state.engine = false;
      this.state.capture = false;
      this.state.audio = false;
      this.state.output = false;
      this.state.captureOwnedByOutput = false;
      this.state.audioOwnedByOutput = false;
    }
    if (event?.ok === true) {
      this.#syncFromNativeMessage(event.message);
    }
    return this.snapshot();
  }

  async #releaseNativeIfIdle() {
    if (!this.state.engine ||
        this.state.capture ||
        this.state.audio ||
        this.state.output) {
      return { ok: true, skipped: true, state: this.snapshot() };
    }

    const result = await this.native.stop().catch(error => ({
      ok: false,
      error: asErrorMessage(error)
    }));
    this.state.engine = false;
    return { ...result, state: this.snapshot() };
  }

  #applyCommandState(type, payload, result) {
    if (result?.ok === false) return;

    switch (type) {
      case "capture.start":
        this.state.capture = true;
        if (payload.source === "screen" || payload.source === "window") {
          this.state.source = payload.source;
        }
        if (payload.source === "window" && Number.isInteger(Number(payload.window_index))) {
          this.state.windowIndex = Number(payload.window_index);
        }
        if (payload.source === "camera" && Number.isInteger(Number(payload.camera_index))) {
          this.state.cameraIndex = Number(payload.camera_index);
        }
        break;
      case "capture.stop":
        this.state.capture = false;
        this.state.captureOwnedByOutput = false;
        break;
      case "audio.start":
        this.state.audio = true;
        break;
      case "audio.stop":
        this.state.audio = false;
        this.state.audioOwnedByOutput = false;
        break;
      case "microphone.set":
        break;
      case "output.start":
        this.state.output = true;
        break;
      case "output.stop":
        this.state.output = false;
        break;
      case "voice.set":
        this.state.voice = payload.effect || "off";
        break;
      default:
        break;
    }
  }

  #syncFromNativeMessage(message) {
    const values = Object.fromEntries(
      String(message || "")
        .split(";")
        .map(item => {
          const index = item.indexOf("=");
          return index > 0 ? [item.slice(0, index), item.slice(index + 1)] : null;
        })
        .filter(Boolean)
    );

    if (values.capture === "running") this.state.capture = true;
    if (values.capture_source === "camera") this.state.source = "camera";
    if (values.capture === "stopped") this.state.capture = false;
    if (values.output === "running") this.state.output = true;
    if (values.output === "stopped") this.state.output = false;
    if (values.voice_effect === "anime-bright" || values.voice_effect === "off") {
      this.state.voice = values.voice_effect;
    }
  }
}
