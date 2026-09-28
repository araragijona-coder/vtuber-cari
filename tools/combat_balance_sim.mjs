#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const ROOT = new URL("../intento_2/webapp/js/game/", import.meta.url);
const MODULES = ["balance.js", "rng.js", "cards.js", "energy.js", "enemies.js", "state.js", "actions.js", "rules.js", "enemy.js"];

async function loadRuntime() {
  const context = vm.createContext({ window: {}, JSON, Number, String, Object, Array, Error, TypeError, Math });
  for (const module of MODULES) {
    const source = await readFile(new URL(module, ROOT), "utf8");
    vm.runInContext(source, context, { filename: module });
  }
  return context.window;
}

function choosePlayerCard(state, w) {
  const combat = state.combat;
  const affordable = combat.cards.hand
    .map((card) => ({ card, definition: w.CardSystem.definitionFor(card.cardId) }))
    .filter((entry) => entry.definition && entry.definition.cost <= combat.resources.energy);
  if (combat.player.hp / combat.player.maxHp <= 0.35) {
    const shield = affordable.find((entry) => entry.definition.id === "escudo_dark");
    if (shield) return shield.card;
  }
  return affordable
    .filter((entry) => entry.definition.type === "ATTACK")
    .sort((a, b) => b.definition.damage - a.definition.damage)[0]?.card
    ?? affordable[0]?.card
    ?? null;
}

function preventedByDefense(resolution) {
  if (!resolution || resolution.actionType !== "ATTACK" || resolution.damage <= 0) return 0;
  const postDefenseBase = Math.max(0, Math.floor(resolution.baseDamage * resolution.variance) - resolution.defense);
  const beforeDefenseStance = resolution.critical ? Math.floor(postDefenseBase * 1.5) : postDefenseBase;
  return Math.max(0, beforeDefenseStance - resolution.damage);
}

function runBattle(w, enemyId, seed, maxTurns = 80) {
  const state = w.GameState.createGameState({ playerId: "balance-sim" });
  w.GameState.startBattle(state, {
    battleId: "balance-" + enemyId + "-" + seed,
    seed,
    player: { id: "player", hp: 120, maxHp: 120, stats: { atk: 20, def: 5, skillDamage: 40 } },
    enemy: w.EnemyCatalog.createEnemy(enemyId)
  });
  const stats = {
    turns: 0, playerDamage: 0, enemyDamage: 0, criticals: 0, criticalDamage: 0,
    cardAttempts: 0, cardSuccesses: 0, cardRejections: 0, energySpent: 0,
    defenseUses: 0, damagePrevented: 0, enemyActions: { ATTACK: 0, DEFEND: 0 },
    cards: {
      disparo_neon: { uses: 0, damage: 0, energy: 0, criticals: 0 },
      embestida_nitro: { uses: 0, damage: 0, energy: 0, criticals: 0 },
      escudo_dark: { uses: 0, damage: 0, energy: 0, criticals: 0 }
    }
  };
  while (state.combat.outcome === w.GameState.OUTCOME.IN_PROGRESS && stats.turns < maxTurns) {
    const combat = state.combat;
    const card = choosePlayerCard(state, w);
    stats.cardAttempts += 1;
    if (!card) { stats.cardRejections += 1; break; }
    const energyBefore = combat.resources.energy;
    const resolution = w.CombatEngine.resolveAction(state, w.GameActions.createPlayerCardAction(state, card.instanceId));
    stats.cardSuccesses += 1;
    stats.energySpent += energyBefore - combat.resources.energy;
    const actualPlayerDamage = Math.min(resolution.damage, resolution.targetHpBefore);
    stats.playerDamage += actualPlayerDamage;
    stats.cards[card.cardId].uses += 1;
    stats.cards[card.cardId].damage += actualPlayerDamage;
    stats.cards[card.cardId].energy += energyBefore - combat.resources.energy;
    if (card.cardId === "escudo_dark") stats.defenseUses += 1;
    if (resolution.critical) {
      stats.criticals += 1;
      stats.criticalDamage += actualPlayerDamage;
      stats.cards[card.cardId].criticals += 1;
    }
    if (resolution.outcome !== w.GameState.OUTCOME.IN_PROGRESS) break;
    const enemyAction = w.EnemyAI.decide(state);
    if (!enemyAction) break;
    stats.enemyActions[enemyAction.type] = (stats.enemyActions[enemyAction.type] || 0) + 1;
    const wasDefending = combat.player.defending;
    const enemyResolution = w.CombatEngine.resolveAction(state, enemyAction);
    stats.enemyDamage += Math.min(enemyResolution.damage, enemyResolution.targetHpBefore);
    if (enemyResolution.critical) {
      stats.criticals += 1;
      stats.criticalDamage += Math.min(enemyResolution.damage, enemyResolution.targetHpBefore);
    }
    if (wasDefending) stats.damagePrevented += preventedByDefense(enemyResolution);
    stats.turns += 1;
  }
  return { outcome: state.combat.outcome, ...stats };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function summarize(battles, w) {
  const count = battles.length;
  const wins = battles.filter((battle) => battle.outcome === w.GameState.OUTCOME.VICTORY).length;
  const defeats = battles.filter((battle) => battle.outcome === w.GameState.OUTCOME.DEFEAT).length;
  const unfinished = count - wins - defeats;
  const sum = (selector) => battles.reduce((total, battle) => total + selector(battle), 0);
  const playerActions = sum((battle) => battle.cardSuccesses);
  const enemyActions = sum((battle) => battle.enemyActions.ATTACK + battle.enemyActions.DEFEND);
  const result = {
    simulations: count, wins, defeats, unfinished,
    winRate: Number((wins / count).toFixed(4)),
    lossRate: Number((defeats / count).toFixed(4)),
    averageTurns: Number((sum((battle) => battle.turns) / count).toFixed(3)),
    medianTurns: median(battles.map((battle) => battle.turns)),
    minimumTurns: Math.min(...battles.map((battle) => battle.turns)),
    maximumTurns: Math.max(...battles.map((battle) => battle.turns)),
    averageDamageDealt: Number((sum((battle) => battle.playerDamage) / count).toFixed(3)),
    averageDamageReceived: Number((sum((battle) => battle.enemyDamage) / count).toFixed(3)),
    criticalFrequency: Number((sum((battle) => battle.criticals) / Math.max(1, playerActions + enemyActions)).toFixed(4)),
    averageCriticalDamage: Number((sum((battle) => battle.criticalDamage) / Math.max(1, sum((battle) => battle.criticals))).toFixed(3)),
    cardSuccessRate: Number((playerActions / Math.max(1, sum((battle) => battle.cardAttempts))).toFixed(4)),
    cardRejectionRate: Number((sum((battle) => battle.cardRejections) / Math.max(1, sum((battle) => battle.cardAttempts))).toFixed(4)),
    averageEnergySpent: Number((sum((battle) => battle.energySpent) / count).toFixed(3)),
    averageDefenseUses: Number((sum((battle) => battle.defenseUses) / count).toFixed(3)),
    averageDamagePrevented: Number((sum((battle) => battle.damagePrevented) / count).toFixed(3)),
    enemyActionFrequency: {
      attack: Number((sum((battle) => battle.enemyActions.ATTACK) / Math.max(1, enemyActions)).toFixed(4)),
      defend: Number((sum((battle) => battle.enemyActions.DEFEND) / Math.max(1, enemyActions)).toFixed(4))
    },
    cards: {}
  };
  for (const cardId of ["disparo_neon", "embestida_nitro", "escudo_dark"]) {
    const uses = sum((battle) => battle.cards[cardId].uses);
    const energy = sum((battle) => battle.cards[cardId].energy);
    result.cards[cardId] = {
      usageRate: Number((uses / Math.max(1, playerActions)).toFixed(4)),
      averageUses: Number((uses / count).toFixed(3)),
      damageContribution: Number((sum((battle) => battle.cards[cardId].damage) / count).toFixed(3)),
      energySpent: Number((energy / count).toFixed(3)),
      damagePerEnergy: Number((sum((battle) => battle.cards[cardId].damage) / Math.max(1, energy)).toFixed(3)),
      criticalFrequency: Number((sum((battle) => battle.cards[cardId].criticals) / Math.max(1, uses)).toFixed(4))
    };
  }
  return result;
}

const w = await loadRuntime();
const seeds = Array.from({ length: 10000 }, (_, index) => index + 1);
const summary = {};
for (const enemyId of w.EnemyCatalog.ENEMY_SEQUENCE) {
  const battles = seeds.map((seed) => runBattle(w, enemyId, seed));
  summary[enemyId] = summarize(battles, w);
}
console.log(JSON.stringify({ seedRange: [1, 10000], summary }, null, 2));
