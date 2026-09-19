const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

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
  new vm.SourceTextModule(source, { identifier: filename });
  process.stdout.write(`ESM syntax OK: ${relative}\n`);
}
