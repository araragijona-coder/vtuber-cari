# Open-source VTuber patterns worth evaluating

Status: `RESEARCH`

This document records ideas from public projects without importing their code. Every candidate must be adapted to Cari's dependency-light architecture and tested before entering `main`.

## 1. Attention before expensive reasoning

ProjectBEA describes a perception bus followed by an attention gate, so not every event reaches the expensive reasoning layer. This matches Cari's local-first goal: cheap filtering/ranking should decide what deserves an LLM turn.

**Cari candidate:** strengthen the existing comment gate with explicit reasons such as `ignore`, `local_rule`, `queue`, and `strong_reasoning` rather than silently treating every message alike.

## 2. Fast local path + swappable providers

Open-LLM-VTuber keeps LLM, ASR and TTS implementations replaceable and supports local as well as remote providers. Its newer architecture also emphasizes asynchronous operations and memory management. citeturn1search4turn1search6

**Cari decision:** keep optional heavyweight providers out of the base installation. Do not add a model just because another project bundles one.

## 3. Local-first is a proven VTuber pattern

Current open-source projects demonstrate that a VTuber can run the full text interaction path locally: AIRIS-VtuberAI describes a no-API/offline design, while another Windows-oriented project documents a pipeline of Twitch + local Ollama + TTS + VTube Studio. citeturn1search1turn1search16

**Cari decision:** no API bypass is necessary. The clean solution is local inference through Ollama/llama.cpp. Cloud providers remain optional escalation paths.

## 4. Long-term memory with controlled recall

Warashi combines curated long-term memory, searchable history and proactive topics. Cari already has persistent/session memory, so the next safe step is better recall policy rather than storing everything. citeturn1search5

**Cari candidate:** classify memories by importance and only inject a small relevant set into a response.

## 5. Producer/consumer voice pipeline

Open-LLM-VTuber documents background TTS synthesis so generation does not block the audio player. Cari already has a voice arbiter and explicit speech lifecycle. citeturn1search6

**Cari decision:** preserve the arbiter as the single owner of speaking state before introducing asynchronous synthesis.

## 6. Explicit state-machine orchestration

Lumi_Nox uses an event bus, global state machine and speaker scheduler; this is a useful reference for coordinating multiple realtime events without letting individual modules directly control each other. citeturn1search0

**Cari candidate:** use the existing event bus/state components as the single coordination layer when Twitch, timers, proactive messages and user chat begin competing for attention.

## 7. Bounded queues and backpressure

Ollama itself exposes queue/concurrency controls, and current VTuber projects use smart request queues to prevent chat bursts from overwhelming the model or freezing the interface. citeturn1search10turn1search15

**Cari candidate:** add a bounded reasoning queue with message coalescing and a discard policy for low-priority stale chat. This belongs in `experimental/` until load-tested.

## 8. Reusable skills/plugins

ProjectBEA and newer local-first agent projects treat capabilities as skills/plugins. This is attractive for future actions, but plugin loading can introduce security and dependency risks.

**Cari status:** `CANDIDATE`, experimental only. No arbitrary plugin execution is allowed in production yet.

## 9. Important lesson

The useful pattern is not "copy another VTuber." The useful pattern is to keep boundaries clear:

`chat/event → attention → local rule → local reasoning → optional cloud escalation → response contract → voice arbitration → avatar`

That lets Cari grow without coupling the LLM to rendering, audio, Twitch, or memory.

## Sources

- Open-LLM-VTuber: modular local/offline LLM, ASR and TTS architecture. citeturn1search4turn1search6
- Warashi: curated long-term memory, deep recall and proactive topics. citeturn1search5
- Lumi_Nox: event bus, state machine, speaker scheduler and memory. citeturn1search0
- AIRIS-VtuberAI: fully local/no-API VTuber approach. citeturn1search1
- Ollama documentation: local model API and queue/concurrency behavior. citeturn0search0turn1search10
- Mai-chan/neuro-sama-style project: local Ollama + TTS + VTube Studio pipeline. citeturn1search16

All source projects were reviewed as architectural references only. No source code is copied into Cari by this document.
