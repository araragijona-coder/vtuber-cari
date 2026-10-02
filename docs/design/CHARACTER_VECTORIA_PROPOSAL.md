# Mach-Girls — VECTORIA Character Proposal

## Status

~~~
VECTORIA
= PROPOSED DESIGN CANDIDATE

RUNTIME CHARACTER
= NOT CREATED

PLAYABLE
= NOT CREATED

CANON
= NOT ESTABLISHED

STATUS
= PROPOSED — REQUIRES HUMAN APPROVAL
~~~

This document is a bounded authoring proposal for a second Mach-Girls character candidate after TASK 29-K established that the repository currently contains no second real non-test playable character.

This is design documentation only. It does not create a runtime character, modify the roster, modify combat rules, resolve historical identity questions, or approve final art.

## 1. Source boundary

The existing Mach-Girls documents already describe VECTORIA as a PROPOSED DESIGN EXAMPLE associated with:

- vector
- direction
- velocity
- control
- leader / street commander / strategist
- target manipulation
- ally control
- positioning
- direction changes
- support
- the example concept VECTOR SHIFT

Those sources do not establish a final biography, age, family, romance, sexuality, canon relationships, faction membership, or playable runtime identity.

Therefore all of the following remain:

~~~
OPEN DESIGN QUESTION

age
age_status
family
romance
sexuality
canon relationships
final faction membership
final narrative chronology
final commercial naming
final playable status
~~~

The identifier in this document is proposal vocabulary only:

~~~
proposed character_id = vectoria
runtime characterId = NOT CREATED
~~~

## 2. Authoring chain

~~~
PERSONALITY
↓
ROLE
↓
DRIVING STYLE
↓
COMBAT IDENTITY
↓
CARD IDENTITY
↓
EFFECTS
↓
ANIMATION
↓
VFX
↓
UI PRESENTATION
~~~

The design starts from identity and fantasy rather than from damage values.

## 3. Core identity

### Character ID

vectoria

Classification: PROPOSED ONLY.

### Display name

VECTORIA

Classification: PROPOSED ONLY.

### Personality

PROPOSED.

Vectoria is conceived as a composed leader and strategist.

Core traits:

- observant
- deliberate
- decisive
- spatially aware
- coordination-oriented
- prefers controlling the situation over uncontrolled escalation

Defining fantasy:

> decidir hacia dónde se mueve la pelea.

This is design direction, not finalized narrative canon.

### Fantasy

PROPOSED.

~~~
DIRECCIÓN
+
CONTROL
+
POSICIONAMIENTO
+
COORDINACIÓN
~~~

The player should feel that Vectoria turns a chaotic battlefield into readable lines, priorities and controlled openings.

## 4. Role

### Primary role

PROPOSED.

~~~
SUPPORT / CONTROL
~~~

### Subrole

PROPOSED.

~~~
VECTOR / COORDINATION
~~~

This subrole is descriptive design vocabulary, not a new engine class.

### Role integrity

Vectoria must not become Yuri with different names.

Direct damage may exist incidentally, but the highest-value decisions should primarily reward:

- controlling threat or target priority
- improving positioning or timing
- coordinating defensive or offensive windows
- converting enemy information into advantage

Raw damage, repeated multi-hit and BREAK racing must not become the dominant identity.

## 5. Driving style

PROPOSED.

Vectoria's riding language is controlled direction change rather than maximum straight-line acceleration.

Driving principles:

- precise line selection
- controlled lane changes
- deliberate braking and re-entry
- short efficient corrections
- advantageous spacing
- strong alignment before commitment

The motorcycle should communicate:

~~~
CONTROLLED VECTOR CHANGE
rather than
PURE ACCELERATION
~~~

This is intentionally distinct from Yuri's existing SPEED / BREAK identity.

## 6. Combat identity

PROPOSED.

~~~
READ
→
REPOSITION
→
REDIRECT
→
ENABLE
→
PUNISH THE OPENING
~~~

Primary identity signals:

- positioning
- target manipulation
- ally coordination
- timing
- support
- defensive control

Secondary identity signals:

- a decisive single attack after an opening exists
- limited defensive stabilization
- setup for another actor's payoff

### Semi-real-time rhythm

Vectoria reuses the existing continuous-time combat model.

~~~
enemy telegraph
→
read the threat
→
change priority / position
→
create a safer or more favorable line
→
follow-up action
~~~

No END TURN, turn order, hard pause or new combat clock is proposed.

## 7. Resource / rhythm

PROPOSED.

Vectoria should reuse the existing Energy + cooldown model.

No new runtime resource is proposed.

Intended rhythm:

~~~
LOW COST CONTROL
→
WAIT / READ
→
PRECISE WINDOW
→
HIGH-VALUE COORDINATION
~~~

Resource identity should come from when Energy is spent, not from a separate meter.

Future systems such as Momentum or G-Force Affinity remain separate OPEN DESIGN QUESTION items.

## 8. Card identity

PROPOSED.

Vectoria cards should read as commands applied to battlefield geometry.

Preferred vocabulary:

- direction
- redirection
- positioning
- coordination
- protection
- controlled exposure
- timing

Preferred card grammar:

~~~
CHANGE THE SITUATION
rather than
DEAL THE MOST DAMAGE
~~~

Existing engine primitives that can later contribute include:

- single-target targeting
- Energy
- cooldowns
- Shield
- WEAK
- EXPOSED
- BREAK preparation
- card draw
- telegraph presentation

The current repository explicitly treats target manipulation, interception / redirect, telegraph modification and broader ally protection as future design gaps. This proposal does not pretend those gaps are already implemented.

## 9. Ability concepts

Exactly two concepts are proposed. Neither is a runtime ability or Card definition.

### 9.1 VECTOR SHIFT

Status: PROPOSED.

Fantasy:

Vectoria changes the direction of a combat situation so the next action occurs along a more favorable line.

Gameplay function:

~~~
TARGET MANIPULATION / POSITIONING
~~~

Potential future behavior:

- change which combatant is considered the priority target
- or reposition the relevant combat relationship for the next action
- create a setup state that improves a later attack or defensive response

The exact mechanic remains OPEN DESIGN QUESTION because the current runtime does not expose a general target-manipulation primitive.

Presentation identity:

A directional path sweeps across the battlefield before the combatants settle into the new relationship.

Motion idea:

~~~
micro-step
→
directional turn
→
controlled lateral / diagonal shift
→
precise stop
~~~

Contact model:

No damage is required. A future contact event would represent a directional lock / reposition confirmation rather than a heavy hit.

Impact idea:

A compact directional snap, line convergence or geometric lock.

VFX idea:

- vector arrows
- guide lines
- converging markers
- short geometric traces
- restrained directional glow

Camera idea:

Reuse existing focus / approach language to emphasize the new line of action. No new camera subsystem.

Implementation dependency:

Target manipulation must be explicitly implemented as a gameplay primitive before this concept can become a runtime card or ability. Presentation must not secretly rewrite targets.

### 9.2 VECTOR GUARD

Status: PROPOSED.

Fantasy:

Vectoria establishes a protected directional lane that stabilizes the next dangerous moment.

Gameplay function:

~~~
SUPPORT / PROTECTION
~~~

Potential future behavior:

- temporary Shield as the immediately expressible baseline
- future Intercept / Redirect as the identity-defining extension

Presentation identity:

A geometric protective plane appears between the protected actor and the incoming threat.

Motion idea:

~~~
brace
→
small lateral alignment
→
protective vector plane
→
hold
→
release
~~~

Contact model:

If interception is implemented later, the incoming hit would visibly contact the protective plane before reaching the protected actor.

Impact idea:

A compressed directional impact with a brief rebound or deflection cue.

VFX idea:

- transparent vector plane
- directional chevrons
- compact shock ring
- protected-target marker
- restrained motion lines

Camera idea:

Reuse existing defensive / impact presentation vocabulary. Do not add a camera system.

Implementation dependency:

Shield is currently available. True interception / redirection remains a PROPOSED design gap.

## 10. Animation language

PROPOSED.

Vectoria's animation language communicates controlled intent.

Characteristics:

- small preparatory movement
- precise stops
- lateral or diagonal corrections
- deliberate rider / vehicle alignment
- short commitment windows
- minimal wasted motion

Contrast:

~~~
YURI
= forward pressure / acceleration / BREAK commitment

VECTORIA
= alignment / redirection / control
~~~

A future implementation must reuse the existing animation state machine and motion-track infrastructure.

No new animation system is authorized by this proposal.

## 11. VFX language

PROPOSED.

Vectoria uses geometric direction language rather than explosive saturation.

Preferred motifs:

- arrows
- vector lines
- lane guides
- directional rings
- path traces
- stabilization fields
- compact impact geometry

Avoid making the identity depend primarily on:

- repeated hit chains
- speed-trail saturation
- large explosion spam
- BREAK fracture as the main signature

No final VFX asset is created or approved here.

## 12. UI presentation

PROPOSED.

Vectoria should be readable through command and control language.

Suggested vocabulary:

~~~
DIRECTION
TARGET
ALLY
WINDOW
PROTECTED
REDIRECT
~~~

The interface should communicate the decision being enabled rather than only a damage value.

Cards should be visually grouped as:

- control
- support / protection
- setup

No production UI component is created by this phase.

## 13. Visual identity

PROPOSED DESIGN LANGUAGE, NOT FINAL ART.

### Silhouette

- upright and composed rider posture
- controlled center of mass
- clear directional geometry
- fewer exaggerated forward-driving shapes than a speed striker

### Motorcycle / riding posture

- stable chassis presentation
- precise steering angle
- controlled lean
- visible alignment with the chosen path

The motorcycle should feel like an instrument of precision rather than a projectile.

### Motion language

~~~
VECTOR CHANGE
+
CONTROLLED DRIFT
+
PRECISE STOP
~~~

### Camera language

Prefer:

- lateral framing
- readable spatial relationships
- clear target / ally geometry
- moderate approach
- controlled correction

Avoid making every ability a high-speed attack shot.

### Color / material direction

PROPOSED.

Use a technical vector / grid vocabulary:

- cool technical neutrals
- luminous directional accents
- engineered surfaces
- clean line motifs
- restrained contrast that emphasizes movement paths

No exact production palette is fixed.

## 14. Auto-combat behavior concept

PROPOSED.

Vectoria's future auto-combat behavior should prioritize state reading over raw DPS.

Conceptual priority:

~~~
PROTECT CRITICAL STATE
→
RESPOND TO TELEGRAPH
→
ENABLE POSITION / TARGET ADVANTAGE
→
USE SUPPORT WINDOW
→
ONLY THEN COMMIT DAMAGE
~~~

This is a concept, not implementation.

AutoAttackSystem and EnemyBehaviorSystem are unchanged.

## 15. BREAK identity

PROPOSED.

Vectoria should not be defined by maximizing BREAK pressure.

Possible role:

- prepare a favorable state before BREAK
- stabilize or reposition around a BREAK window
- help another actor exploit a BREAK opening

Direct BREAK damage is secondary.

BreakSystem remains unchanged.

## 16. BURST identity

PROPOSED.

Vectoria's Burst fantasy emphasizes field control becoming decisive rather than simple damage escalation.

Possible visual sequence:

~~~
multiple vector lines
→
convergence
→
controlled lock
→
decisive resolution
~~~

Exact Burst behavior remains OPEN DESIGN QUESTION.

BurstSystem remains unchanged.

## 17. Counterplay

PROPOSED.

Potential counterplay:

- mistimed control reduces value
- incorrect target selection creates a weak window
- control actions have meaningful Energy / cooldown opportunity cost
- direct damage remains below a dedicated Striker's primary payoff
- changing enemy intent can pressure predictable defensive setup

Exact values and rules require later validation.

## 18. Current-engine compatibility

### Reusable current primitives

VERIFIED / CURRENT ENGINE:

- Energy
- cooldowns
- single-target actions
- Shield
- WEAK / EXPOSED
- BREAK state
- BURST state
- telegraph presentation
- existing animation state machine
- existing motion tracks
- existing camera shots
- existing CombatPresentation
- existing VFX/effect plumbing

### Future primitives required for full Vectoria identity

PROPOSED / DESIGN GAP:

- target manipulation
- intercept / redirect
- telegraph modification
- broader ally protection
- broader spatial gameplay semantics

Missing primitives are not assumed to exist.

## 19. Identity validation — VECTORIA ≠ YURI

| Dimension | Yuri | Vectoria |
|---|---|---|
| Primary role | STRIKER | SUPPORT / CONTROL |
| Combat fantasy | speed, pressure, BREAK | direction, positioning, coordination |
| Driving style | acceleration / forward commitment | controlled line changes / alignment |
| Card identity | attack, tempo, BREAK exploitation | control, support, protection, setup |
| Presentation identity | lunge, impact, speed trail | alignment, redirection, geometric control |

Validation rule:

~~~
VECTORIA
≠
YURI WITH RENAMED CARDS
~~~

The proposal must be rejected or redesigned later if implementation collapses into:

- raw speed as the dominant payoff
- repeated multi-hit as the dominant payoff
- direct BREAK racing
- attack-first Energy spending
- Yuri-like forward-pressure presentation

## 20. Production boundary

This proposal does NOT authorize:

~~~
CharacterKitSystem changes
cards.js changes
CombatEngine changes
SkillResolver changes
CombatClock changes
Energy changes
RNG changes
BREAK changes
BURST changes
AutoAttackSystem changes
EnemyBehaviorSystem changes
SaveManager changes
renderer changes
presentation runtime changes
assets
art approval
roster expansion
canonization
~~~

Future implementation must reuse the existing architecture before adding new systems.

## 21. Human approval gate

Human review is required for:

- character concept
- role
- driving philosophy
- combat identity
- ability direction
- visual language
- eventual canon status
- future runtime scope

Creation of this document does not imply approval.

~~~
STATUS:
PROPOSED — REQUIRES HUMAN APPROVAL
~~~

Only after explicit approval may a later phase define a minimal runtime implementation contract.

## 22. Source and provenance

Primary repository sources used:

- docs/design/MACH_GIRLS_CREATIVE_DIRECTION.md
- docs/design/CHARACTER_BIBLE.md
- docs/design/CHARACTER_CLASS_CARD_EFFECT_SYSTEM.md
- docs/design/CARD_EFFECT_CATALOG.md
- docs/design/MACH_GIRLS_MASTER_REFERENCE.md

Repository classification remains:

~~~
VECTORIA
= PROPOSED CHARACTER CONCEPT

vectoria
= proposal-only identifier in this document

runtime CharacterKit
= NOT CREATED
~~~

Historical Rocket Bunny Petty material is not rewritten by this proposal.

---
AUTHORING STATUS: PROPOSED — REQUIRES HUMAN APPROVAL
