(() => {
  "use strict";

  const STORAGE_KEY = "bosozoku_player_save";
  const CURRENT_SAVE_VERSION = 1;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createDefaultSave(playerId = "local-player") {
    return {
      saveVersion: CURRENT_SAVE_VERSION,
      player: {
        id: normalizeId(playerId),
        level: 1,
        xp: 0,
        currency: 0,
        wins: 0,
        losses: 0
      },
      progression: {},
      lastBattle: null,
      completedBattles: [],
      rewardLedger: []
    };
  }

  function normalizeId(value) {
    const id = typeof value === "string" ? value.trim() : "";
    return id || "local-player";
  }

  function isNonNegativeInteger(value) {
    return Number.isInteger(value) && Number.isFinite(value) && value >= 0;
  }

  function validatePlayer(player) {
    if (!player || typeof player !== "object" || Array.isArray(player)) {
      return { valid: false, errors: ["player debe ser un objeto."] };
    }

    const errors = [];
    if (typeof player.id !== "string" || !player.id.trim()) errors.push("player.id inválido.");
    if (!isNonNegativeInteger(player.level) || player.level < 1) errors.push("player.level inválido.");
    if (!isNonNegativeInteger(player.xp)) errors.push("player.xp inválido.");
    if (!isNonNegativeInteger(player.currency)) errors.push("player.currency inválido.");
    if (!isNonNegativeInteger(player.wins)) errors.push("player.wins inválido.");
    if (!isNonNegativeInteger(player.losses)) errors.push("player.losses inválido.");

    return { valid: errors.length === 0, errors };
  }

  function validateSave(value) {
    const errors = [];
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { valid: false, errors: ["SaveState debe ser un objeto."] };
    }

    if (!Number.isInteger(value.saveVersion) || value.saveVersion < 1) {
      errors.push("saveVersion inválido.");
    }

    if (value.saveVersion !== CURRENT_SAVE_VERSION) {
      errors.push("saveVersion no soportado.");
    }

    errors.push(...validatePlayer(value.player).errors);

    if (!value.progression || typeof value.progression !== "object" || Array.isArray(value.progression)) {
      errors.push("progression inválido.");
    }

    if (value.lastBattle !== null && (typeof value.lastBattle !== "object" || Array.isArray(value.lastBattle))) {
      errors.push("lastBattle inválido.");
    }

    if (!Array.isArray(value.completedBattles) ||
        !value.completedBattles.every((id) => typeof id === "string" && id.length > 0)) {
      errors.push("completedBattles inválido.");
    }

    if (!Array.isArray(value.rewardLedger)) {
      errors.push("rewardLedger inválido.");
    }

    return { valid: errors.length === 0, errors };
  }

  function migrateSave(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { migrated: false, save: null, reason: "invalid_payload" };
    }

    if (value.saveVersion === CURRENT_SAVE_VERSION) {
      return { migrated: false, save: value, reason: null };
    }

    return {
      migrated: false,
      save: null,
      reason: "no_safe_migration_for_version_" + String(value.saveVersion)
    };
  }

  function getStorage() {
    if (typeof window === "undefined" || !window.localStorage) {
      throw new Error("localStorage no disponible.");
    }
    return window.localStorage;
  }

  function load() {
    let raw;
    try {
      raw = getStorage().getItem(STORAGE_KEY);
    } catch (error) {
      return {
        success: true,
        source: "defaults",
        save: createDefaultSave(),
        reason: "storage_unavailable",
        error: error instanceof Error ? error.message : String(error)
      };
    }

    if (raw === null) {
      return {
        success: true,
        source: "defaults",
        save: createDefaultSave(),
        reason: "missing"
      };
    }

    try {
      const parsed = JSON.parse(raw);
      const migration = migrateSave(parsed);

      if (!migration.save) {
        return {
          success: true,
          source: "defaults",
          save: createDefaultSave(),
          reason: migration.reason
        };
      }

      const validation = validateSave(migration.save);
      if (!validation.valid) {
        return {
          success: true,
          source: "defaults",
          save: createDefaultSave(),
          reason: "validation_failed",
          errors: validation.errors
        };
      }

      return {
        success: true,
        source: "localStorage",
        save: clone(migration.save),
        reason: migration.migrated ? "migrated" : null
      };
    } catch (error) {
      return {
        success: true,
        source: "defaults",
        save: createDefaultSave(),
        reason: "corrupt_json",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  function save(value) {
    const validation = validateSave(value);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(" ") };
    }

    try {
      getStorage().setItem(STORAGE_KEY, JSON.stringify(value));
      return { success: true, save: clone(value) };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  function clear() {
    try {
      getStorage().removeItem(STORAGE_KEY);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  function saveFromGameState(gameState, outcome = null) {
    if (!gameState || typeof gameState !== "object" || !gameState.player) {
      return { success: false, error: "GameState inválido." };
    }

    const current = load().save;
    const next = createDefaultSave(gameState.player.id);

    next.player = {
      id: normalizeId(gameState.player.id),
      level: current.player.level,
      xp: current.player.xp,
      currency: current.player.currency,
      wins: current.player.wins,
      losses: current.player.losses
    };

    const battleId = gameState.combat ? String(gameState.combat.battleId) : null;
    const duplicateTerminalResult = Boolean(
      battleId &&
      current.lastBattle &&
      String(current.lastBattle.battleId) === battleId &&
      current.lastBattle.outcome === outcome &&
      (outcome === "VICTORY" || outcome === "DEFEAT")
    );

    if (!duplicateTerminalResult && outcome === "VICTORY") next.player.wins += 1;
    if (!duplicateTerminalResult && outcome === "DEFEAT") next.player.losses += 1;

    next.progression = clone(current.progression);
    next.completedBattles = [...current.completedBattles];
    next.rewardLedger = [...current.rewardLedger];

    if (gameState.combat) {
      next.lastBattle = {
        battleId: String(gameState.combat.battleId),
        turn: Number(gameState.combat.turn),
        outcome: gameState.combat.outcome,
        playerHp: Number(gameState.combat.player.hp),
        enemyHp: Number(gameState.combat.enemy.hp),
        completedAt: new Date().toISOString()
      };

      if (
        outcome === "VICTORY" &&
        !next.completedBattles.includes(String(gameState.combat.battleId))
      ) {
        next.completedBattles.push(String(gameState.combat.battleId));
      }
    }

    return save(next);
  }

  window.SaveManager = Object.freeze({
    STORAGE_KEY,
    CURRENT_SAVE_VERSION,
    createDefaultSave,
    validateSave,
    migrateSave,
    load,
    save,
    clear,
    saveFromGameState
  });
})();