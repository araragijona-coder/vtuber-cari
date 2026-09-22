(() => {
  "use strict";

  const canvas = document.getElementById("combat-canvas");
  const context = canvas?.getContext("2d") ?? null;

  const state = {
    combatInit: null,
    turnResult: null
  };

  function resizeCanvas() {
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
  }

  function isPlainObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function hasExactKeys(object, keys) {
    if (!isPlainObject(object)) return false;

    const actual = Object.keys(object).sort();
    const expected = [...keys].sort();

    return actual.length === expected.length &&
      actual.every((key, index) => key === expected[index]);
  }

  function isString(value) {
    return typeof value === "string";
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function isInteger(value) {
    return Number.isInteger(value);
  }

  function isBoolean(value) {
    return typeof value === "boolean";
  }

  function isTeam(value) {
    return value === "player" || value === "enemy";
  }

  function validateCombatant(value) {
    return hasExactKeys(value, [
      "slot",
      "character_id",
      "name",
      "level",
      "hp",
      "max_hp",
      "card_hd_url",
      "sprite_base_url"
    ]) &&
      isInteger(value.slot) &&
      isString(value.character_id) &&
      isString(value.name) &&
      isInteger(value.level) &&
      isFiniteNumber(value.hp) &&
      isFiniteNumber(value.max_hp) &&
      isString(value.card_hd_url) &&
      isString(value.sprite_base_url);
  }

  function validateTeam(value) {
    return Array.isArray(value) && value.every(validateCombatant);
  }

  function validateCombatInitDTO(dto) {
    return hasExactKeys(dto, [
      "battle_id",
      "player_team",
      "enemy_team"
    ]) &&
      isString(dto.battle_id) &&
      validateTeam(dto.player_team) &&
      validateTeam(dto.enemy_team);
  }

  function validateAttacker(value) {
    return hasExactKeys(value, [
      "team",
      "slot",
      "trigger_cut_in"
    ]) &&
      isTeam(value.team) &&
      isInteger(value.slot) &&
      isBoolean(value.trigger_cut_in);
  }

  function validateTarget(value) {
    return hasExactKeys(value, [
      "team",
      "slot"
    ]) &&
      isTeam(value.team) &&
      isInteger(value.slot);
  }

  function validateCombatMath(value) {
    return hasExactKeys(value, [
      "damage_dealt",
      "is_critical",
      "elemental_modifier"
    ]) &&
      isFiniteNumber(value.damage_dealt) &&
      isBoolean(value.is_critical) &&
      isFiniteNumber(value.elemental_modifier);
  }

  function validatePostActionState(value) {
    return hasExactKeys(value, [
      "target_remaining_hp",
      "is_target_dead"
    ]) &&
      isFiniteNumber(value.target_remaining_hp) &&
      isBoolean(value.is_target_dead);
  }

  function validateTurnResultDTO(dto) {
    return hasExactKeys(dto, [
      "turn_number",
      "action_type",
      "attacker",
      "target",
      "combat_math",
      "post_action_state"
    ]) &&
      isInteger(dto.turn_number) &&
      isString(dto.action_type) &&
      validateAttacker(dto.attacker) &&
      validateTarget(dto.target) &&
      validateCombatMath(dto.combat_math) &&
      validatePostActionState(dto.post_action_state);
  }

  function drawCombatDebug() {
    if (!canvas || !context) return;

    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);

    const init = state.combatInit;
    const result = state.turnResult;

    context.font = "600 16px system-ui, sans-serif";
    context.textBaseline = "top";

    if (!init) {
      context.fillText("Combat client ready — waiting for CombatInitDTO", 16, 16);
      return;
    }

    context.fillText("Battle: " + init.battle_id, 16, 16);
    context.fillText(
      "Player team: " + init.player_team.length +
      " · Enemy team: " + init.enemy_team.length,
      16,
      42
    );

    if (!result) {
      context.fillText("Waiting for TurnResultDTO", 16, 68);
      return;
    }

    context.fillText(
      "Turn " + result.turn_number + " · " + result.action_type,
      16,
      68
    );
    context.fillText(
      "Attacker: " + result.attacker.team +
      " / slot " + result.attacker.slot +
      " · cut-in=" + String(result.attacker.trigger_cut_in),
      16,
      94
    );
    context.fillText(
      "Target: " + result.target.team +
      " / slot " + result.target.slot,
      16,
      120
    );
    context.fillText(
      "Damage: " + result.combat_math.damage_dealt +
      " · critical=" + String(result.combat_math.is_critical) +
      " · elemental=" + result.combat_math.elemental_modifier,
      16,
      146
    );
    context.fillText(
      "Target HP: " + result.post_action_state.target_remaining_hp +
      " · dead=" + String(result.post_action_state.is_target_dead),
      16,
      172
    );
  }

  function logCombatInitDTO(dto) {
    console.log("[CariCombat] CombatInitDTO ready:", {
      battle_id: dto.battle_id,
      player_team: dto.player_team,
      enemy_team: dto.enemy_team
    });

    dto.player_team.forEach((character) => {
      console.log("[CariCombat] player_team entry:", {
        slot: character.slot,
        character_id: character.character_id,
        name: character.name,
        level: character.level,
        hp: character.hp,
        max_hp: character.max_hp,
        card_hd_url: character.card_hd_url,
        sprite_base_url: character.sprite_base_url
      });
    });

    dto.enemy_team.forEach((character) => {
      console.log("[CariCombat] enemy_team entry:", {
        slot: character.slot,
        character_id: character.character_id,
        name: character.name,
        level: character.level,
        hp: character.hp,
        max_hp: character.max_hp,
        card_hd_url: character.card_hd_url,
        sprite_base_url: character.sprite_base_url
      });
    });
  }

  function logTurnResultDTO(dto) {
    console.log("[CariCombat] TurnResultDTO ready:", {
      turn_number: dto.turn_number,
      action_type: dto.action_type,
      attacker: dto.attacker,
      target: dto.target,
      combat_math: dto.combat_math,
      post_action_state: dto.post_action_state
    });

    console.log("[CariCombat] turn fields:", {
      turn_number: dto.turn_number,
      action_type: dto.action_type,
      attacker_team: dto.attacker.team,
      attacker_slot: dto.attacker.slot,
      trigger_cut_in: dto.attacker.trigger_cut_in,
      target_team: dto.target.team,
      target_slot: dto.target.slot,
      damage_dealt: dto.combat_math.damage_dealt,
      is_critical: dto.combat_math.is_critical,
      elemental_modifier: dto.combat_math.elemental_modifier,
      target_remaining_hp: dto.post_action_state.target_remaining_hp,
      is_target_dead: dto.post_action_state.is_target_dead
    });
  }

  function receiveCombatInit(dto) {
    if (!validateCombatInitDTO(dto)) {
      console.error(
        "[CariCombat] Invalid CombatInitDTO. Expected exactly: " +
        "battle_id, player_team, enemy_team."
      );
      return false;
    }

    state.combatInit = structuredClone(dto);
    state.turnResult = null;

    logCombatInitDTO(state.combatInit);
    drawCombatDebug();
    return true;
  }

  function receiveTurnResult(dto) {
    if (!validateTurnResultDTO(dto)) {
      console.error(
        "[CariCombat] Invalid TurnResultDTO. Expected exactly: " +
        "turn_number, action_type, attacker, target, combat_math, " +
        "post_action_state."
      );
      return false;
    }

    state.turnResult = structuredClone(dto);

    logTurnResultDTO(state.turnResult);
    drawCombatDebug();
    return true;
  }

  function receiveCombatInitJSON(json) {
    try {
      return receiveCombatInit(JSON.parse(json));
    } catch (error) {
      console.error("[CariCombat] Invalid CombatInitDTO JSON:", error);
      return false;
    }
  }

  function receiveTurnResultJSON(json) {
    try {
      return receiveTurnResult(JSON.parse(json));
    } catch (error) {
      console.error("[CariCombat] Invalid TurnResultDTO JSON:", error);
      return false;
    }
  }

  // Kept as compatibility names for the existing webapp shell.
  function receiveCombatState(dto) {
    return receiveCombatInit(dto);
  }

  function receiveCombatResult(dto) {
    return receiveTurnResult(dto);
  }

  function receiveCombatEvent(_dto) {}

  function receivePlayerState(_dto) {}

  window.CariCombat = Object.freeze({
    canvas,
    context,
    resizeCanvas,
    validateCombatInitDTO,
    validateTurnResultDTO,
    receiveCombatInit,
    receiveTurnResult,
    receiveCombatInitJSON,
    receiveTurnResultJSON,
    receiveCombatState,
    receiveCombatResult,
    receiveCombatEvent,
    receivePlayerState
  });

  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();
  drawCombatDebug();
})();
