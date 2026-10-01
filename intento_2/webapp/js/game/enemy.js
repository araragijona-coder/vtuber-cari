(() => {
  "use strict";

  // Compatibility surface retained while Phase 17A becomes historical.
  window.EnemyAI = Object.freeze({
    chooseEnemyAction(enemyState, combatState) {
      if (!combatState || combatState.outcome !== window.GameState.OUTCOME.IN_PROGRESS) return null;
      const intent = window.EnemyBehaviorSystem.previewIntent(combatState);
      if (!intent) return null;
      return window.EnemyBehaviorSystem.actionFor(combatState, intent);
    },
    decide(state) {
      return this.chooseEnemyAction(state?.combat?.enemy, state?.combat || null);
    },
    previewIntent(combatState) {
      return window.EnemyBehaviorSystem.previewIntent(combatState);
    }
  });
})();