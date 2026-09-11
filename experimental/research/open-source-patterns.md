# Open-source VTuber patterns worth evaluating

Status: `RESEARCH`

This document records ideas from public projects without importing their code. Every candidate must be adapted to Cari's dependency-light architecture and tested before entering `main`.

## 1. Attention before expensive reasoning

ProjectBEA describes a perception bus followed by an attention gate, so not every event reaches the expensive reasoning layer. This matches Cari's local-first goal: cheap filtering/ranking should decide what deserves an LLM turn.

**Cari candidate:** strengthen the existing comment gate with explicit reasons such as `ignore`, `local_rule`, `queue`, and `strong_reasoning` rather than silently treating every message alike.

## 2. Fast local path + swappable providers

Open-LLM-VTuber keeps LLM, ASR and TTS implementations replaceable and supports local as well as remote providers. Cari already follows the same provider-neutral direction.

**Cari decision:** keep optional heavyweight providers out of the base installation. Do not add a model just because another project bundles one.

## 3. Long-term memory with controlled recall

Warashi combines curated long-term memory with searchable history and proactive topics. Cari already has persistent/session memory, so the next safe step is better recall policy rather than storing everything.

**Cari candidate:** classify memories by importance and only inject a small relevant set into a response.

## 4. Producer/consumer voice pipeline

Open-LLM-VTuber documents background TTS synthesis so generation does not block the audio player. Cari already has a voice arbiter and explicit speech lifecycle.

**Cari decision:** preserve the arbiter as the single owner of speaking state before introducing asynchronous synthesis.

## 5. Explicit state-machine orchestration

Animetta and other current VTuber frameworks use explicit orchestration/state-machine ideas to connect perception, reasoning, voice and avatar actions.

**Cari decision:** keep lifecycle transitions explicit and reject invalid transitions instead of hiding them inside UI code.

## 6. Reusable skills/plugins

ProjectBEA treats capabilities as skills/plugins. This is attractive for future actions, but plugin loading can introduce security and dependency risks.

**Cari status:** `CANDIDATE`, experimental only. No arbitrary plugin execution is allowed in production yet.

## 7. Important lesson

The useful pattern is not "copy another VTuber." The useful pattern is to keep boundaries clear:

`chat/event → attention → local rule → reasoning → response contract → voice arbitration → avatar`

That lets Cari grow without coupling the LLM to rendering, audio, Twitch, or memory.

## Sources

- Open-LLM-VTuber: modular LLM/ASR/TTS and local/offline operation.
- Warashi: curated long-term memory, deep recall and proactive topics.
- ProjectBEA: perception bus, attention gate and plugin skills.
- Animetta: explicit orchestration/state-machine architecture.

All source projects were reviewed as architectural references only. No source code is copied into Cari by this document.
