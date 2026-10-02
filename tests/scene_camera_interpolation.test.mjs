import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCamera() {
  const source = await readFile("intento_2/webapp/js/scene/camera.js", "utf8");
  const context = vm.createContext({
    window: {},
    performance: { now: () => 0 },
    Math, Number, String, Object
  });
  vm.runInContext(source, context, { filename: "intento_2/webapp/js/scene/camera.js" });
  return context.window.MachGirlsSceneCamera;
}

test("camera interpolation preserves start, reaches mid, locks target at end and overrun", async () => {
  const Camera = await loadCamera();
  const camera = Camera.create({ x: 100, y: 50, zoom: 1, offsetX: 0, offsetY: 0, now: 0 });

  camera.setTarget({ x: 300, y: 150, zoom: 2, offsetX: 40, offsetY: -20, durationMs: 1000 }, 0);

  const start = camera.update(0);
  assert.equal(start.x, 100);
  assert.equal(start.y, 50);
  assert.equal(start.zoom, 1);
  assert.equal(start.offsetX, 0);
  assert.equal(start.offsetY, 0);

  const mid = camera.update(500);
  assert.equal(mid.x, 200);
  assert.equal(mid.y, 100);
  assert.equal(mid.zoom, 1.5);
  assert.equal(mid.offsetX, 20);
  assert.equal(mid.offsetY, -10);

  const end = camera.update(1000);
  assert.equal(end.x, 300);
  assert.equal(end.y, 150);
  assert.equal(end.zoom, 2);
  assert.equal(end.offsetX, 40);
  assert.equal(end.offsetY, -20);

  const over = camera.update(1500);
  assert.equal(over.x, 300);
  assert.equal(over.y, 150);
  assert.equal(over.zoom, 2);
  assert.equal(over.offsetX, 40);
  assert.equal(over.offsetY, -20);
});

test("camera easing uses the saved start state rather than cumulative interpolation", async () => {
  const Camera = await loadCamera();
  const camera = Camera.create({ x: 0, y: 0, zoom: 1, now: 0 });

  camera.setTarget({ x: 100, y: 60, zoom: 2, durationMs: 1000 }, 0);
  const early = camera.update(250);
  const later = camera.update(750);

  assert.equal(early.x, 15.625);
  assert.equal(early.y, 9.375);
  assert.equal(early.zoom, 1.15625);
  assert.equal(later.x, 84.375);
  assert.equal(later.y, 50.625);
  assert.equal(later.zoom, 1.84375);
});

test("interrupted camera transition starts B from the current interpolated A state", async () => {
  const Camera = await loadCamera();
  const camera = Camera.create({ x: 0, y: 0, zoom: 1, now: 0 });

  camera.setTarget({ x: 100, y: 0, zoom: 2, durationMs: 1000 }, 0);
  const midA = camera.update(500);

  camera.setTarget({ x: 200, y: 100, zoom: 0.5, offsetX: 30, durationMs: 1000 }, 500);
  const startB = camera.update(500);

  assert.equal(startB.x, midA.x);
  assert.equal(startB.y, midA.y);
  assert.equal(startB.zoom, midA.zoom);
  assert.equal(startB.offsetX, 0);
  assert.equal(startB.offsetY, 0);

  const midB = camera.update(1000);
  assert.equal(midB.x, 125);
  assert.equal(midB.y, 50);
  assert.equal(midB.zoom, 1);
  assert.equal(midB.offsetX, 15);
  assert.ok(midB.x > midA.x);
  assert.ok(midB.x < 200);
  assert.ok(midB.y > midA.y);
  assert.ok(midB.y < 100);
  assert.ok(midB.zoom < midA.zoom);
});

test("zero-duration camera transition applies the target immediately", async () => {
  const Camera = await loadCamera();
  const camera = Camera.create({ x: 10, y: 20, zoom: 1, offsetX: 3, offsetY: 4, now: 0 });

  const result = camera.setTarget({
    x: 80, y: 90, zoom: 1.4, offsetX: -12, offsetY: 7, durationMs: 0, name: "ZERO"
  }, 100);

  assert.equal(result.x, 80);
  assert.equal(result.y, 90);
  assert.equal(result.zoom, 1.4);
  assert.equal(result.offsetX, -12);
  assert.equal(result.offsetY, 7);
  assert.equal(camera.update(1000).x, 80);
  assert.equal(camera.update(1000).y, 90);
});

test("snap remains an immediate target operation", async () => {
  const Camera = await loadCamera();
  const camera = Camera.create({ x: 10, y: 20, now: 0 });

  const result = camera.snap({ x: 500, y: 400, zoom: 1.25, offsetX: 8, offsetY: -6, name: "SNAP" });
  assert.equal(result.x, 500);
  assert.equal(result.y, 400);
  assert.equal(result.zoom, 1.25);
  assert.equal(result.offsetX, 8);
  assert.equal(result.offsetY, -6);
});
