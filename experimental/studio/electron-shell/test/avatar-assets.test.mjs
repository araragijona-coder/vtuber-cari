import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.."
);
const assetRoot = path.join(repoRoot, "assets", "cari", "expressions");

test("Cari bundled expression manifest resolves to PNG files", async () => {
  const manifest = JSON.parse(
    await fs.readFile(path.join(assetRoot, "manifest.json"), "utf8")
  );

  assert.equal(manifest.asset_id, "cari-base-art-v0");
  assert.deepEqual(Object.keys(manifest.expressions).sort(), [
    "angry",
    "happy",
    "neutral"
  ]);

  for (const filename of Object.values(manifest.expressions)) {
    const file = path.join(assetRoot, filename);
    const bytes = await fs.readFile(file);
    assert.ok(bytes.length > 32, filename);
    assert.deepEqual([...bytes.subarray(0, 8)], [
      0x89, 0x50, 0x4e, 0x47,
      0x0d, 0x0a, 0x1a, 0x0a
    ]);
  }
});
