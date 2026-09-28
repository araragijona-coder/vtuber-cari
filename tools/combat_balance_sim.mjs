#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const ROOT = new URL("../intento_2/webapp/js/game/", import.meta.url);
const MODULES = [
  "balance.js", "rng.js", "cards.js", "energy.js", "enemies.js",
  "state.js", "actions.js", "rules.js", "enemy.js"
];

async function loadRuntime() {
  const context = vm.createContext({
    window: {}, JSON, Number, String, Object, Array, Error, TypeError, Math
  });
  for (const module of MODULES) {
    const source = await readFile(new URL(module, ROOT), "utf8");
    vm.runInContext(source, context, { filename: module });
  }
  return context.window;
}

function choosePlayerCard(state, w) {
  const combat = state.combat;
  const hand = combat.cards.hand;
  const affordable = hand
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

function runBattle(w, enemyId, seed, maxTurns = 40) {
  const state = w.GameState.createGameState({ playerId: "balance-sim" });
  w.GameState.startBattle(state, {
    battleId: "balance-" + enemyId + "-" + seed,
    seed,
    player: { id: "player", hp: 120, maxHp: 120, stats: { atk: 20, def: 5, skillDamage: 40 } },
    enemy: w.EnemyCatalog.createEnemy(enemyId)
  });

  const stats = { turns: 0, damage: 0, criticals: 0, cards: {} };

  while (state.combat.outcome === w.GameState.OUTCOME.IN_PROGRESS && stats.turns < maxTurns) {
    const card = choosePlayerCard(state, w);
    if (!card) break;
    const action = w.GameActions.createPlayerCardAction(state, card.instanceId);
    const resolution = w.CombatEngine.resolveAction(state, action);
    stats.damage += resolution.damage;
    stats.criticals += resolution.critical ? 1 : 0;
    stats.cards[card.cardId] = (stats.cards[card.cardId] || 0) + 1;
    if (resolution.outcome !== w.GameState.OUTCOME.IN_PROGRESS) break;

    const enemyAction = w.EnemyAI.decide(state);
    if (!enemyAction) break;
    const enemyResolution = w.CombatEngine.resolveAction(state, enemyAction);
    stats.damage += enemyResolution.damage;
    stats.criticals += enemyResolution.critical ? 1 : 0;
    stats.turns += 1;
  }

  return { outcome: state.combat.outcome, ...stats };
}

const w = await loadRuntime();
const seeds = Array.from({ length: 100 }, (_, index) => index + 1);
const summary = {};
for (const enemyId of w.EnemyCatalog.ENEMY_SEQUENCE) {
  const battles = seeds.map((seed) => runBattle(w, enemyId, seed));
  summary[enemyId] = {
    battles: battles.length,
    wins: battles.filter((battle) => battle.outcome === w.GameState.OUTCOME.VICTORY).length,
    defeats: battles.filter((battle) => battle.outcome === w.GameState.OUTCOME.DEFEAT).length,
    averageTurns: Number((battles.reduce((sum, battle) => sum + battle.turns, 0) / battles.length).toFixed(2)),
    averageDamage: Number((battles.reduce((sum, battle) => sum + battle.damage, 0) / battles.length).toFixed(2)),
    criticalFrequency: Number((battles.reduce((sum, battle) => sum + battle.criticals, 0) / Math.max(1, battles.reduce((sum, battle) => sum + battle.turns * 2, 0))).toFixed(4))
  };
}
console.log(JSON.stringify(summary, null, 2));
