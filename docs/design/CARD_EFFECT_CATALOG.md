# Mach-Girls — Card Effect Catalog & Current Engine Support Matrix

## Status
PHASE 20 — DESIGN RESEARCH / DOCUMENTATION
NO RUNTIME CHANGES.

Labels:
- VERIFIED FROM CURRENT CODE — checked directly in the current repository.
- PROPOSED DESIGN — future design vocabulary only.
- OPEN DESIGN QUESTION — unresolved design choice.
- DESIGN GAP — current primitive or card identity is weaker than the intended future identity.

## 1. Effect catalog
### DAMAGE
| Effect | Definition | Status |
|---|---|---|
| Single-target damage | direct damage to one enemy | VERIFIED FROM CURRENT CODE |
| Multi-hit | multiple distinct hits in one activation | PROPOSED DESIGN |
| AoE | one action damages multiple targets | PROPOSED DESIGN |
| Conditional damage | damage changes based on a condition | VERIFIED FROM CURRENT CODE |
| Burst damage | high-value damage tied to Burst timing | VERIFIED FROM CURRENT CODE |
| Counter damage | retaliatory damage after receiving/guarding an attack | PROPOSED DESIGN |
| BREAK-focused damage | direct contribution to BREAK meter | VERIFIED FROM CURRENT CODE |

### DEFENSE
| Effect | Definition | Status |
|---|---|---|
| Shield | temporary block absorbing real damage | VERIFIED FROM CURRENT CODE |
| Damage reduction | percentage or flat reduction before damage | PROPOSED DESIGN |
| Intercept | redirect an incoming attack to a protector | PROPOSED DESIGN |
| Counter | defend and retaliate under a condition | PROPOSED DESIGN |
| Temporary immunity | ignore a defined damage/status window | PROPOSED DESIGN |

### SUPPORT
| Effect | Definition | Status |
|---|---|---|
| Heal | restore HP | PROPOSED DESIGN — not in current runtime |
| Regeneration | repeated HP restoration over time | PROPOSED DESIGN |
| Energy restore | add Energy | VERIFIED FROM CURRENT CODE |
| Cooldown support | reduce or manipulate a cooldown | PROPOSED DESIGN |
| Buff | positive status/stat modification | PROPOSED DESIGN |
| Cleanse | remove a harmful status | PROPOSED DESIGN |
| Ally protection | prevent or redirect damage to an ally | PROPOSED DESIGN |

### CONTROL
| Effect | Definition | Status |
|---|---|---|
| WEAK | reduce outgoing damage | VERIFIED FROM CURRENT CODE |
| EXPOSED | increase incoming damage | VERIFIED FROM CURRENT CODE |
| Slow | alter enemy action interval/speed | PROPOSED DESIGN |
| Target manipulation | redirect or lock enemy target | PROPOSED DESIGN |
| Attack reduction | lower enemy offensive output | PROPOSED DESIGN |
| Defense reduction | lower enemy defense | PROPOSED DESIGN |
| Telegraph modification | alter warning timing or intent | PROPOSED DESIGN |
| BREAK preparation | create additional BREAK pressure/setup | VERIFIED FROM CURRENT CODE |

### RESOURCE
| Effect | Definition | Status |
|---|---|---|
| Energy gain | restore player Energy | VERIFIED FROM CURRENT CODE |
| Energy efficiency | reduce future Energy cost or improve efficiency | PROPOSED DESIGN |
| Cooldown interaction | reduce, reset or transfer cooldown | PROPOSED DESIGN; cooldown itself exists currently |
| Burst interaction | increase or consume Burst charge | VERIFIED FROM CURRENT CODE |
| Momentum | future action-stacking resource | PROPOSED DESIGN |
| G-Force Affinity | gameplay/presentation intensity language | OPEN DESIGN QUESTION / PROPOSED DESIGN |

### BREAK
| Effect | Definition | Status |
|---|---|---|
| BREAK damage | reduce enemy BREAK meter | VERIFIED FROM CURRENT CODE |
| BREAK preparation | actions designed primarily to set future BREAK | VERIFIED FROM CURRENT CODE |
| BREAK payoff | stronger value while enemy is Broken | VERIFIED FROM CURRENT CODE |
| BREAK exploitation | card-specific payoff from Broken state | VERIFIED FROM CURRENT CODE for Burst; PROPOSED DESIGN for future cards |

## 2. Current engine support matrix
| Capability | Current support? | Current system / evidence | Classification |
|---|---|---|---|
| Direct damage | Yes | rules.js resolveAttack / resolveSkill | VERIFIED FROM CURRENT CODE |
| Conditional damage | Yes | DERRAPE EXPUESTO checks EXPOSED | VERIFIED FROM CURRENT CODE |
| Single-target targeting | Yes | rules.js resolveTarget | VERIFIED FROM CURRENT CODE |
| Multi-target / AoE | No | no current target-group resolver | PROPOSED DESIGN |
| Multi-hit | No distinct primitive | one resolved damage result per action | PROPOSED DESIGN |
| Shield / block | Yes | SkillResolver + fighter block fields | VERIFIED FROM CURRENT CODE |
| Damage reduction | No general primitive | no generic modifier | PROPOSED DESIGN |
| Intercept / redirect | No | no target-redirection primitive | PROPOSED DESIGN |
| Counter | No | no counter resolver | PROPOSED DESIGN |
| Heal | No | no HP-restoration resolver | PROPOSED DESIGN |
| Regeneration | No | no HP regen effect | PROPOSED DESIGN |
| Energy gain | Yes | EnergySystem.gain + card effects | VERIFIED FROM CURRENT CODE |
| Energy regen | Yes | EnergySystem.regenerate at fixed step | VERIFIED FROM CURRENT CODE |
| Cooldown tracking | Yes | combat.cooldowns + fixed-step decrement | VERIFIED FROM CURRENT CODE |
| Cooldown manipulation | No | no public effect in card resolver | PROPOSED DESIGN |
| WEAK | Yes | StatusSystem | VERIFIED FROM CURRENT CODE |
| EXPOSED | Yes | StatusSystem | VERIFIED FROM CURRENT CODE |
| Slow | No | no status definition | PROPOSED DESIGN |
| Attack reduction | No | no dedicated modifier | PROPOSED DESIGN |
| Defense reduction | No | defense read directly from stats | PROPOSED DESIGN |
| Telegraph display | Yes | EnemyBehavior + combat presentation | VERIFIED FROM CURRENT CODE |
| Telegraph modification | No | no card effect | PROPOSED DESIGN |
| BREAK meter | Yes | BreakSystem | VERIFIED FROM CURRENT CODE |
| BREAK window | Yes | BreakSystem.isBroken | VERIFIED FROM CURRENT CODE |
| Burst charge | Yes | BurstSystem | VERIFIED FROM CURRENT CODE |
| Burst broken payoff | Yes | broken-state multiplier | VERIFIED FROM CURRENT CODE |
| Draw cards | Yes | CardSystem.drawCard / drawCards | VERIFIED FROM CURRENT CODE |
| Cleanse | No | no current status-removal card effect | PROPOSED DESIGN |
| General buff framework | No | current statuses are WEAK/EXPOSED | PROPOSED DESIGN |
| Momentum | No | no runtime system | PROPOSED DESIGN |
| G-Force Affinity | No | no runtime system | OPEN DESIGN QUESTION / PROPOSED DESIGN |
| Mach Breaker | No | no independent runtime system | OPEN DESIGN QUESTION / PROPOSED DESIGN |

## 3. Audit of the nine current cards
| Card | Primary role | Secondary role | Current effect | Identity reading | Class compatibility | Design gap |
|---|---|---|---|---|---|---|
| DISPARO NEÓN | ATTACK | BREAK | damage + 10 BREAK | fast offensive pressure | Striker | ownership/personality not encoded |
| EMBESTIDA NITRO | ATTACK | BREAK | heavy damage + 18 BREAK | committed impact | Striker | card name suggests future Nitro semantics; global Nitro remains unimplemented |
| DERRAPE EXPUESTO | ATTACK | SETUP PAYOFF | conditional bonus vs EXPOSED + 22 BREAK | exploit a prepared opening | Striker / Setup | stronger character linkage could be authored later |
| ESCUDO DARK | DEFENSE | STABILITY | shield for 1.4s | immediate protection | Defender | generic until tied to personality/driving style |
| BARRICADA NEÓN | DEFENSE | RESOURCE | shield + 10 Energy | defensive sustain / tempo | Defender / Support hybrid | hybrid identity should be assigned deliberately |
| ESPEJO URBANO | DEFENSE | SETUP | shield + EXPOSED | defensive preparation | Defender / Debuffer hybrid | target/status language can be formalized later |
| LECTURA TÁCTICA | SKILL | TEMPO | draw 2 | hand manipulation | Support / Utility | generic without an owner |
| SOBRECARGA | SKILL | RESOURCE | +26 Energy | resource recovery | Support / Utility | could become character-specific resource identity later |
| PULSO DEBILITANTE | SKILL | SETUP / BREAK | WEAK + 12 BREAK | debuff + BREAK preparation | Debuffer / Control | no character-specific ownership yet |

### Verified findings
- all nine card definitions are present in CardSystem;
- current cards use damage, BREAK, shield, draw, Energy, WEAK, EXPOSED and conditional damage;
- all current targeting is self or single enemy;
- cooldowns and Energy costs exist per card;
- heal, cleanse, general buff, AoE, multi-hit, counter, interception and cooldown manipulation are not general runtime card primitives;
- EMBESTIDA NITRO is a card identity, not a global Nitro resource system;
- DERRAPE EXPUESTO + ESPEJO URBANO demonstrate setup → payoff composition;
- PULSO DEBILITANTE demonstrates control + BREAK preparation;
- BARRICADA NEÓN + SOBRECARGA demonstrate resource-oriented effects.

### Design gaps
- The current deck is an MVP/protagonist vocabulary rather than a character-specific roster system.
- Hybrid cards exist, but subroles are not formally represented in runtime data.
- Character-specific automatic behavior is not encoded in the current card/runtime schema.

## 4. Compound-effect grammar
Prefer existing primitives + conditions + timing + presentation before creating a new system.

| Compound | Intended use | Status |
|---|---|---|
| DAMAGE + EXPOSED | punish setup | possible with current primitives |
| DAMAGE + BREAK | pressure stagger | possible with current primitives |
| HEAL + CLEANSE | emergency recovery | future |
| SHIELD + ENERGY | defensive tempo | possible with current primitives |
| BUFF + COOLDOWN | support timing | future |
| HEAL + EMERGENCY TRIGGER | rescue identity | future |
| DEBUFF + BREAK | controlled setup | partially expressible now |

## 5. Future card examples — Striker
All examples in this section are PROPOSED DESIGN ONLY.

### APEX LINE
Character: APEX concept. Class: Striker / Precision. Target: single enemy. Primary effect: high payoff inside a future timing window. Secondary effect: bonus BREAK on a perfect timing result. Visual: racing-line guide collapses into a precise impact.

### VELOCITY CUT
Class: Striker / Speed. Primary effect: rapid damage. Secondary effect: bonus when used during an enemy telegraph. Visual: compressed motion trail.

### BREAK CHASER
Class: Striker / BREAK. Primary effect: BREAK damage. Secondary effect: bonus against a nearly-broken enemy. Visual: fracture line across the target.

## 6. Future card examples — Defender
All examples are PROPOSED DESIGN ONLY.

### VECTOR GUARD
Class: Defender / Guardian. Primary effect: shield. Secondary effect: future interception/redirect. Visual: directional shield plane.

### BRAKE CHECK
Class: Defender / Counter. Primary effect: shield before a telegraphed hit. Secondary effect: future counter damage after successful block. Visual: compression impact followed by rebound.

### STABILITY LOCK
Class: Defender / Stability. Primary effect: future damage reduction. Secondary effect: future resistance to disruption. Visual: rigid lock-on frame.

## 7. Future card examples — Support / Healer
All examples are PROPOSED DESIGN ONLY.

### PIT CREW
Class: Support / Healer. Primary effect: future heal. Secondary effect: small Energy recovery. Visual: repair-light pulse.

### COOLANT SYNC
Class: Support / Energy Support. Primary effect: Energy restore. Secondary effect: future cooldown efficiency window. Visual: coolant flow linking allies.

### SAFE RETURN
Class: Support / Emergency Response. Primary effect: heal an ally below a threshold. Secondary effect: temporary protection. Visual: rescue marker + stabilizing field.

## 8. Future card examples — Debuffer / Control
All examples are PROPOSED DESIGN ONLY.

### BLIND SPOT
Class: Debuffer / Setup. Primary effect: EXPOSED. Secondary effect: future telegraph/accuracy disruption. Visual: warning ring distortion.

### SIGNAL JAM
Class: Control. Primary effect: future enemy telegraph modification. Secondary effect: future tempo reduction. Visual: fragmented warning UI/interference field.

### BREAK MARK
Class: Debuffer / Setup. Primary effect: BREAK preparation. Secondary effect: future bonus BREAK on the next qualifying hit. Visual: fracture marker.

## 9. Design review checklist
- Is the role obvious without reading only the damage number?
- Does personality support the role?
- Does the driving style appear in timing or effect language?
- Does automatic behavior reinforce the same identity?
- Is there at least one meaningful counterplay route?
- Does the card work in continuous time?
- Is telegraph response explicit?
- Are BREAK and BURST interactions explicit?
- Are missing engine primitives marked PROPOSED?

## 10. Research references
- HoYoWiki — Characters, Honkai: Star Rail.
- Hideout Guides — Akiko and Metis, Chasing Kaleidorider.
- GameDeveloper — Enemy Attacks and Telegraphing.
External sources were used for patterns only; Mach-Girls does not copy names, kits, numbers, text, UI or proprietary implementation.