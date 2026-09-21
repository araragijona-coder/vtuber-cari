import test from "node:test";
import assert from "node:assert/strict";

import {
  AVATAR_MODEL_MAX_BYTES,
  normalizeAvatarAsset,
  supportedAvatarExtensions,
  validateAvatarAsset
} from "./asset-registry.mjs";

test("avatar asset registry accepts GLB/GLTF and rejects unknown formats", () => {
  assert.deepEqual(supportedAvatarExtensions(), ["glb", "gltf"]);

  const glb = normalizeAvatarAsset({
    url: "file:///assets/cari.glb",
    name: "cari.glb",
    sizeBytes: 1024
  });
  assert.equal(glb.kind, "avatar-model");
  assert.equal(glb.format, "glb");
  assert.equal(validateAvatarAsset(glb).valid, true);

  assert.equal(
    normalizeAvatarAsset({
      url: "file:///assets/cari.fbx",
      name: "cari.fbx"
    }),
    null
  );
});

test("avatar asset registry enforces the local size gate", () => {
  assert.equal(
    normalizeAvatarAsset({
      url: "file:///assets/cari.glb",
      sizeBytes: AVATAR_MODEL_MAX_BYTES
    })?.format,
    "glb"
  );

  assert.equal(
    normalizeAvatarAsset({
      url: "file:///assets/cari.glb",
      sizeBytes: AVATAR_MODEL_MAX_BYTES + 1
    }),
    null
  );

  assert.equal(
    validateAvatarAsset({
      format: "glb",
      url: "file:///assets/cari.glb",
      sizeBytes: -1
    }).valid,
    false
  );
});
