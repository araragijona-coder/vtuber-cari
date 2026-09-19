const fs = require("node:fs");
const os = require("node:os");
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

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cari-esm-"));

try {
  for (const relative of files) {
    const source = fs.readFileSync(path.join(root, relative), "utf8");
    const tempFile = path.join(
      tempRoot,
      relative.replaceAll("/", "__").replace(/\.js$/, ".mjs")
    );

    fs.writeFileSync(tempFile, source, "utf8");

    const result = spawnSync(process.execPath, ["--check", tempFile], {
      encoding: "utf8"
    });

    if (result.status !== 0) {
      process.stderr.write(
        `ESM syntax error in ${relative}\n${result.stderr || result.stdout || ""}`
      );
      process.exit(result.status || 1);
    }

    process.stdout.write(`ESM syntax OK: ${relative}\n`);
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
