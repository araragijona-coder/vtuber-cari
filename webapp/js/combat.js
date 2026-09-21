(() => {
  "use strict";

  const canvas = document.getElementById("combat-canvas");
  const context = canvas?.getContext("2d") ?? null;

  function resizeCanvas() {
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
  }

  function receiveCombatState(_dto) {}
  function receiveCombatResult(_dto) {}
  function receiveCombatEvent(_dto) {}
  function receivePlayerState(_dto) {}

  window.CariCombat = Object.freeze({
    canvas,
    context,
    resizeCanvas,
    receiveCombatState,
    receiveCombatResult,
    receiveCombatEvent,
    receivePlayerState
  });

  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();
})();
