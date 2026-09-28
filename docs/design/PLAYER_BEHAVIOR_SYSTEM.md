# Rocket Bunny Petty — Player Behavior System

STATUS: PROPOSED
IMPLEMENTED: NO
VALIDATED: NO

Concept:
Player Behavior → Character Perception → Diegetic Reaction

Candidate variables: attention, patience, curiosity, persistence, indecision, exploration, dialogue engagement, risk-taking.

Candidate signals: idle time, dialogue skips, repeated missions, repeated actions, character usage, menu time, exploration.

These are game-state abstractions, not claims about player psychology.

Example: prolonged inactivity → a character interprets it as the trainer thinking or distracted. Prefer a diegetic authored line over raw telemetry such as an AFK message.

Constraints:
- No generative AI is required; prefer authored deterministic rules.
- Do not break the fourth wall unless explicitly chosen later.
- Do not implement in Phase 9.5.
- Do not claim improved retention, fun, immersion or engagement without playtesting.
- Avoid sensitive inference; use narrow observable game signals.
- Keep rules explainable and testable.

Potential flow: Observed Signal → Rule/Threshold → Behavior Variable → Character Context → Authored Reaction.

Open research: useful signals, variable count, character-like reactions, decay/reset rules, and whether the system creates memorable moments without becoming intrusive. UNKNOWN until tested.
