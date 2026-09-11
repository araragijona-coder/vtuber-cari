# Foundation Pass 21 — State-Aware Intent Admission

Pass 21 connects the runtime lifecycle to the intent system without coupling Twitch, proactive behavior, avatar code, or provider adapters to one another.

## Policy

```text
OFFLINE / STARTING / STOPPING -> reject all intents
IDLE / LISTENING             -> normal intents allowed
THINKING / SPEAKING / SLEEP  -> only high-priority ALERT intents
```

Default interrupt threshold: priority `8`.

`IntentCoordinator` applies `IntentAdmissionPolicy` before `IntentArbiter`, producing one deterministic winner for the execution layer.

The policy does not generate text, call an LLM, move the avatar, play audio, own Twitch connections, or change runtime state.
