import { strict as assert } from "node:assert";
import test from "node:test";
import { evaluateResourceDemand, isNativeCommand } from "./resource-policy.mjs";

test("OBS connection alone is not a media sink", () => {
  const result = evaluateResourceDemand({ obs: { connected: true, runtime: { streaming: false, recording: false, virtualCamera: false } } });
  assert.equal(result.mediaSinkAvailable, false);
  assert.equal(result.shouldGenerateNativeFrames, false);
});
test("OBS active output is a media sink", () => {
  const result = evaluateResourceDemand({ obs: { connected: true, runtime: { streaming: true, recording: false, virtualCamera: false } } });
  assert.equal(result.externalObsOutput, true);
  assert.equal(result.shouldRenderAvatar, true);
});
test("Twitch connection is control-only", () => {
  const result = evaluateResourceDemand({ twitch: { connected: true } });
  assert.equal(result.twitchControlOnly, true);
  assert.equal(result.mediaSinkAvailable, false);
  assert.equal(result.shouldGenerateNativeFrames, false);
});
test("Cari native output is a real sink", () => {
  const result = evaluateResourceDemand({ native: { output: true, capture: true, audio: true } });
  assert.equal(result.mediaSinkAvailable, true);
  assert.equal(result.shouldGenerateNativeFrames, true);
  assert.equal(result.shouldEncodeNativeOutput, true);
});
test("local preview can justify avatar rendering", () => {
  const result = evaluateResourceDemand({ preview: { visible: true } });
  assert.equal(result.mediaSinkAvailable, true);
  assert.equal(result.shouldRenderAvatar, true);
  assert.equal(result.shouldEncodeNativeOutput, false);
});
test("native command classification stays explicit", () => {
  assert.equal(isNativeCommand("output.start"), true);
  assert.equal(isNativeCommand("obs:start-stream"), false);
  assert.equal(isNativeCommand("twitch:send-chat"), false);
});
