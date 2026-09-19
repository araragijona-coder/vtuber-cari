const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const files = [
  "runtime/studio-controller.js",
  "avatar/acting-bridge.js",
  "avatar/face-tracker.js",
  "avatar/face-tracking-bridge.js",
  "avatar/three-avatar.js",
  "renderer/main.js"
];

for (const relative of files) {
  const filename = path.join(root, relative);
  const source = fs.readFileSync(filename, "utf8");
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "--check"],
    { input: source, encoding: "utf8" }
  );

  if (result.status !== 0) {
    process.stderr.write(
      `ESM syntax error in ${relative}\n${result.stderr || result.stdout || ""}`
    );
    process.exit(result.status || 1);
  }

  process.stdout.write(`ESM syntax OK: ${relative}\n`);
}
