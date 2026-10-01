# Mach-Girls — Character Identity, Class & Card Effect Design System

## Status
PHASE 20 — DESIGN RESEARCH / DOCUMENTATION
NO RUNTIME IMPLEMENTATION. NO NEW PLAYABLE CHARACTERS. NO NEW EXECUTABLE MECHANICS.

Labels:
- HISTORICAL — previously established project material.
- CURRENT — present implementation or current project state.
- VERIFIED — directly checked in current source/evidence.
- PROPOSED — design proposal for a later phase.
- OPEN DESIGN QUESTION — unresolved and requiring a later decision or validation.

## 1. Scope
Phase 20 defines the design language that future Mach-Girls characters and cards must use.
It does not modify CombatEngine, CombatClock, Energy, AutoAttackSystem, EnemyBehaviorSystem, SkillResolver, BreakSystem, BurstSystem, SaveManager, RNG, Telemetry or runtime card definitions.

Naming remains:
Rocket Bunny Petty = HISTORICAL / ORIGINAL WORKING TITLE
Mach-Girls = PROPOSED CURRENT FRANCHISE / DESIGN DIRECTION

## 2. Character-to-combat pipeline
PERSONALITY → FANTASY → BAND / PHILOSOPHY → DRIVING STYLE → PRIMARY CLASS → SUBROLE → AUTO-COMBAT BEHAVIOR → RESOURCE / RHYTHM → CARD IDENTITY → EFFECTS → ANIMATION → VFX / AUDIO / UI

Design rule: do not start with numbers and invent a personality afterward. A card should read like something that character would actually do.

## 3. External research patterns
### Honkai: Star Rail
HoYoWiki groups characters by Paths such as Destruction, The Hunt, Erudition, Harmony, Nihility, Preservation and Abundance. This is a useful precedent for a role-family vocabulary: a character belongs to a functional family while individual actions can still mix damage, setup and support.
Source: HoYoWiki — Characters: https://wiki.hoyolab.com/pc/hsr/aggregate/character?lang=en-us

Mach-Girls takeaway: class communicates the dominant combat contribution; it does not require every action to perform the same function.

### Chasing Kaleidorider
Secondary character guides show support-oriented characters that still perform normal/damaging actions while their defining contribution comes from healing, ally buffs, Energy interactions or conditional team effects. Akiko combines damage with Energy/buff support; Metis combines damage with healing and protective effects.
Sources: Hideout Guides — Akiko and Metis.

Mach-Girls takeaway: Support/Healer does not mean zero damage. Its highest-value decisions should still be supportive.

### Telegraphing and readability
GameDeveloper's combat-design material treats telegraphing and anticipation as communication: players need enough information to recognize the incoming question and act on it. Larger threats can justify clearer anticipation, while excessive anticipation can reduce responsiveness.
Sources: GameDeveloper — Enemy Attacks and Telegraphing; The 12 principles of animation in video games.

Mach-Girls takeaway: role identity should also be readable through timing, anticipation, action shape and VFX.

## 4. Primary classes
### STRIKER / DPS
Fantasy: create decisive offensive pressure.
Objective: convert timing, openings, speed or momentum into HP/BREAK progress.
Strengths: burst, multi-hit, BREAK exploitation, execution, high offensive tempo.
Weaknesses: often lower defensive utility; may depend on windows or setup.
Rhythm: proactive, opportunistic, window-driven.
Priority effects: damage, conditional damage, multi-hit, critical timing, BREAK damage, execution, burst payoff.
VFX: speed lines, motion trails, directional impacts, concentrated hit flashes.

Subarchetypes (PROPOSED):
- BURST STRIKER — decisive spikes.
- SPEED STRIKER — rapid tempo and repeated interventions.
- BREAK STRIKER — specialist in stagger pressure and broken-state payoff.

### DEFENDER / TANK
Fantasy: remain in the fight while actively controlling danger.
Objective: absorb, reduce, redirect or punish incoming pressure.
Strengths: shield, mitigation, protection, counters, stability.
Weaknesses: usually lower offensive ceiling; requires prediction for full value.
Rhythm: anticipation and response.
Priority effects: shield, damage reduction, interception, counter, temporary immunity, protection.
VFX: barriers, impact absorption, guard cues, controlled camera shake.

Subarchetypes (PROPOSED):
- SHIELDER — absorb direct pressure.
- GUARDIAN — protect another target.
- COUNTER — punish committed attacks.
- INTERCEPTOR — redirect who receives danger.
- STABILITY — resist disruption and maintain defensive uptime.

### SUPPORT / HEALER
Fantasy: improve the team's ability to continue fighting.
Objective: turn vulnerable states into survivability, tempo, Energy or setup advantages.
Allowed secondary contribution: basic attacks or incidental damage.
Strengths: heal, regeneration, shield, buff, Energy support, cooldown support, cleanse, emergency rescue.
Weaknesses: value depends on timing and ally state; direct damage ceiling may be lower.
Rhythm: reactive, anticipatory or tempo-supporting.
VFX: restorative pulses, linked effects, rescue cues, clean status removal.

Subarchetypes (PROPOSED):
- HEALER — direct healing and regeneration.
- BUFFER — amplify ally output.
- ENERGY SUPPORT — accelerate access to important actions.
- CLEANSE SUPPORT — remove harmful states.
- HYBRID SUPPORT — deliberately combines two support functions.

### DEBUFFER / CONTROL
Fantasy: win by changing what the enemy is allowed or encouraged to do.
Objective: create openings, reduce threat, manipulate timing or prepare BREAK.
Strengths: WEAK, EXPOSED, attack/defense reduction, timing disruption, telegraph control, target control, BREAK preparation.
Weaknesses: setup can lack value in short fights or without follow-up.
Rhythm: setup → deny → exploit.
VFX: status marks, warning distortion, altered target cues, fracture indicators.

Subroles (PROPOSED):
- DEBUFFER — weaken the target.
- CONTROL — alter target/timing behavior.
- SETUP — prepare a later payoff.

## 5. Personality × Class
Class is a combat function, not a personality stereotype.

| Personality | Striker | Defender | Support | Debuffer / Control |
|---|---|---|---|---|
| CALM | surgical precision | measured protection | efficient triage | quiet manipulation |
| RECKLESS | all-in burst | risk-heavy counter | emergency rescue | aggressive disruption |
| COLD | exact execution | uncompromising stability | resource optimization | clinical setup |
| PLAYFUL | trick attacks | bait/counter | morale/tempo support | misdirection |
| LEADER | coordinated offense | formation control | team command | tactical control |
| PROTECTIVE | focused finisher | guardian | rescue/healing | threat suppression |

These are design checks only; no character is canonized by this table.

## 6. Driving-style vocabulary
| Driving style | Combat expression |
|---|---|
| SPEED | fast interventions, low-delay pressure |
| PRECISION | timing windows, conditional payoff |
| MOMENTUM | escalating actions after successful continuity |
| DRIFT | repositioning, redirection, flexible targets |
| CONTROL | target/timing manipulation |
| STABILITY | defensive uptime and resistance |
| RISK | larger payoff when danger is accepted |
| SYNC | stronger effects when rider, bike and timing align |

These are conceptual vocabulary, not implemented resources.

### APEX — PROPOSED DESIGN EXAMPLE
- Personality: cold, calculating, precise, perfectionist.
- Class: Striker / Precision.
- Driving philosophy: apex precision and timing.
- Core mechanic: timing-window payoff.
- Card philosophy: high-value actions for exact interventions.
- VFX: narrow trails, line geometry, precise impact frames.

### VECTORIA — PROPOSED DESIGN EXAMPLE
- Personality: leader / strategist.
- Class: Support / Control or Defender / Guardian.
- Driving philosophy: direction + control.
- Core mechanic: target or ally vector manipulation.
- Card philosophy: redirect danger and coordinate the next payoff.
- VFX: directional lines, vector arrows, coordinated motion.

### INERCIA — PROPOSED DESIGN EXAMPLE
- Personality: not finalised.
- Class: Striker / Momentum.
- Driving philosophy: once acceleration starts, stopping becomes increasingly difficult.
- Core mechanic: future Momentum stacking.
- Card philosophy: continuity increases the next action's value; disruption breaks the chain.
- VFX: longer trails, stronger distortion, increasing impact weight.

APEX, VECTORIA and INERCIA remain PROPOSED DESIGN EXAMPLES, not playable characters.

## 7. ROLE INTEGRITY RULES
A character breaks role integrity when its highest-value decisions repeatedly reward another class identity than its declared primary class.

Examples:
- A Support may attack, but if its most important cards are raw damage, crit, execution and burst damage, the kit is drifting toward Striker.
- A Tank may deal damage, but its core decisions should remain about survival, protection or retaliation.
- A Debuffer may have a strong hit, but its primary payoff should still come from vulnerability, disruption or setup.
- A Striker may have defense, but that defense should usually preserve offensive tempo rather than become the dominant game plan.

Review future kits using:
PRIMARY PAYOFF → FREQUENCY OF USE → RESOURCE PRIORITY → COMBAT-WIN CONDITION

If those signals all point to another class, revisit the classification.

## 8. Semi-real-time design contract
Every future card specification must answer:
- When can it be used?
- What is happening while the player waits?
- What happens if the enemy telegraphs?
- What happens during BREAK?
- What happens during BURST?
- What happens if the player misses the window?

The design is not turn-based:
- no END TURN;
- no turn order;
- no traditional turn lock.

Timing should be represented through conditions, cooldowns, telegraph response or presentation rather than a turn gate.

## 9. Official character template
```text
NAME
BAND
PERSONALITY
AGE STATUS
DRIVING STYLE
PRIMARY CLASS
SECONDARY ROLE
COMBAT FANTASY
AUTO-ATTACK STYLE
RESOURCE RELATION
CARD IDENTITY
BREAK IDENTITY
BURST IDENTITY
STRENGTHS
WEAKNESSES
COUNTERPLAY
VISUAL LANGUAGE
VFX LANGUAGE
```

AGE STATUS remains mandatory for future sexualized presentation. The existing adult gate in CHARACTER_BIBLE.md remains unchanged: age_status must be VERIFIED and age must be >= 18.

## 10. Official card template
```text
CARD NAME
CHARACTER
CLASS
SUBROLE
FANTASY
TARGET
COST
TIMING
PRIMARY EFFECT
SECONDARY EFFECT
CONDITION
SYNERGY
COUNTERPLAY
BREAK INTERACTION
BURST INTERACTION
AUTO-COMBAT RELATION
VISUAL IDENTITY
VFX IDENTITY
ANIMATION HOOK
AUDIO HOOK
```

## 11. Implementation gate
A future implementation phase may implement a proposed character/card only after its design record establishes role integrity, character fantasy, current-engine primitives, missing primitives marked PROPOSED, counterplay, semi-real-time timing and presentation hooks.

No character or card in this document is runtime content.

## 12. Research references
- HoYoWiki — Characters, Honkai: Star Rail. https://wiki.hoyolab.com/pc/hsr/aggregate/character?lang=en-us
- Hideout Guides — Akiko / Metis, Chasing Kaleidorider.
- GameDeveloper — Enemy Attacks and Telegraphing; The 12 principles of animation in video games.
External sources are used for patterns and principles only. No external character, text, exact kit, art or balance is copied.

## Phase 21 — research and vertical slice

### VERIFIED FROM EXTERNAL SOURCES

- Honkai: Star Rail official/HoYoLAB material describes Preservation as defensive/protective, Harmony as buff-oriented, Nihility as enemy weakening, and Abundance as healing-oriented. This supports role families as high-level combat functions rather than identical kits. Sources: https://www.hoyolab.com/article/17237205 and https://wiki.hoyolab.com/pc/hsr/aggregate/character?lang=en-us
- Public Chasing KaleidoRIDER material establishes the high-level combination of motorcycle riders and card-based combat. It is used only as category-level inspiration; no names, assets, balance or implementation are copied. Sources: https://kaleidorider.com/ and https://gachagames.fandom.com/wiki/Chasing_Kaleidorider
- Magic: The Gathering design commentary provides a general precedent for assigning mechanics to the play pattern a card is intended to encourage. Source: https://magic.wizards.com/en/news/making-magic/designing-boros-2013-02-04

### VERIFIED FROM CURRENT CODE

- HEAL clamps at max HP and does not revive or regenerate over time.
- DAMAGE_OUT BUFF is timed and uses replace stacking.
- CLEANSE explicitly removes WEAK and EXPOSED only.
- MULTI-HIT is one action with deterministic per-hit resolution; BREAK damage is per hit.
- DAMAGE REDUCTION modifies incoming HP damage and does not reduce BREAK damage or consume Shield.
- Save schema remains version 1.

### CURRENT PROPOSED PLAYABLE KIT — YURI

Yuri is a STRIKER with the proposed SPEED / BREAK subrole. The first runtime kit contains RACHA NEÓN, IMPULSO MACH, DERRAPE YURI and LÍNEA DE RUPTURA. This is a proposed gameplay identity, not a rewrite of historical lore.

### TEST-ONLY CHARACTER — TEST SUPPORT

TEST SUPPORT exists only to validate HEAL, BUFF, CLEANSE and DAMAGE REDUCTION. It is not a roster/canon declaration.

### OPEN DESIGN QUESTION

Ally targeting beyond the current one-player/one-enemy slice, regeneration, AoE, counter/interception, cooldown manipulation, slow/telegraph manipulation, Momentum, G-Force Affinity, Mach Breaker and the final Yuri canon kit remain future decisions.