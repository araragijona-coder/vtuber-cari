const NATIVE_COMMANDS = new Set(["capture.start","capture.stop","audio.start","audio.stop","output.start","output.stop"]);

function obsMediaSinkActive(obs) {
  if (!obs?.connected) return false;
  const runtime = obs.runtime || {};
  return runtime.streaming === true || runtime.recording === true || runtime.virtualCamera === true;
}

function twitchControlOnly(twitch) {
  return twitch?.connected === true || twitch?.authorized === true;
}

export function evaluateResourceDemand({ native = {}, obs = {}, twitch = {}, preview = {}, avatarOverlay = false } = {}) {
  const nativeOutput = native.output === true;
  const localPreview = preview.visible === true;
  const externalObsOutput = obsMediaSinkActive(obs);
  const externalMediaSink = nativeOutput || externalObsOutput || localPreview || avatarOverlay;
  return {
    nativeEngineNeeded: native.capture === true || native.audio === true || native.output === true,
    nativeMediaSink: nativeOutput || localPreview,
    externalObsOutput,
    twitchControlOnly: twitchControlOnly(twitch),
    mediaSinkAvailable: externalMediaSink,
    shouldGenerateNativeFrames: nativeOutput || localPreview,
    shouldEncodeNativeOutput: nativeOutput,
    shouldRenderAvatar: localPreview || externalObsOutput || avatarOverlay,
    reason: externalMediaSink ? "consumer-available" : (twitchControlOnly(twitch) ? "twitch-control-only" : "no-media-consumer")
  };
}

export function isNativeCommand(type) { return NATIVE_COMMANDS.has(String(type || "")); }
