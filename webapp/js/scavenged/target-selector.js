/**
 * Scavenged mechanic: deterministic target selection.
 * Conceptual provenance: zero-dependency browser target-selection/pathfinding
 * sandboxes and touch-friendly arcade/battle prototypes.
 */
export function selectTarget(targets, pointer, { maxDistance = Infinity, filter = target => target && target.active !== false } = {}) {
  const px = Number(pointer?.x ?? 0), py = Number(pointer?.y ?? 0);
  let best = null, bestDistance = maxDistance;
  for (const target of targets ?? []) {
    if (!filter(target)) continue;
    const dx = Number(target.x ?? 0) - px, dy = Number(target.y ?? 0) - py;
    const distance = Math.hypot(dx, dy);
    if (distance <= bestDistance) { best = target; bestDistance = distance; }
  }
  return best;
}

export function bindCanvasTargetSelection(canvas, targets, onSelect, options) {
  const pick = event => {
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
    const target = selectTarget(targets, point, options);
    if (target) onSelect(target, point);
  };
  canvas.addEventListener("pointerdown", pick);
  return () => canvas.removeEventListener("pointerdown", pick);
}
