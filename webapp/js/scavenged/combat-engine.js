/**
 * Scavenged mechanic: turn-based combat kernel.
 * Conceptual provenance: browser turn-based battle prototypes with critical hits,
 * attack/defense and battle logs. This implementation is original and dependency-free.
 */
export class CombatEngine {
  constructor({ rng = Math.random } = {}) { this.rng = rng; this.turn = 0; }

  resolveAttack(attacker, defender, move = {}) {
    const power = Math.max(0, Number(move.power ?? 10));
    const attack = Math.max(0, Number(attacker.attack ?? 1));
    const defense = Math.max(0, Number(defender.defense ?? 0));
    const critChance = Math.min(1, Math.max(0, Number(move.critChance ?? attacker.critChance ?? 0.1)));
    const varianceMin = Math.min(1, Math.max(0, Number(move.varianceMin ?? 0.9)));
    const varianceMax = Math.max(varianceMin, Number(move.varianceMax ?? 1.1));
    const critical = this.rng() < critChance;
    const variance = varianceMin + (varianceMax - varianceMin) * this.rng();
    const raw = (power + attack) * variance;
    const mitigation = defense / (defense + 100);
    const multiplier = critical ? Number(move.critMultiplier ?? 1.5) : 1;
    const damage = Math.max(1, Math.floor(raw * (1 - mitigation) * multiplier));
    defender.hp = Math.max(0, Number(defender.hp ?? 0) - damage);
    this.turn += 1;
    return { turn: this.turn, damage, critical, defeated: defender.hp <= 0, remainingHp: defender.hp };
  }
}
