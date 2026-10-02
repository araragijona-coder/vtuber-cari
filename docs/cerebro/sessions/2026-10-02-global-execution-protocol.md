# 2026-10-02 — GLOBAL EXECUTION PROTOCOL

## Status

MANDATORY / GLOBAL / CURRENT

## Decision

Mach-Girls adopts a global execution protocol for all Brain and Worker agents.

Primary objective:

> Prevent saturation, oversized responses, task accumulation, indefinite processing, repeated work after interruption, and loss of recoverable state.

Core operating loop:

```
ONE TASK
→ ONE RESULT
→ ONE CHECKPOINT
→ NEXT TASK
```

## Mandatory rules

- one active task per agent;
- small task decomposition;
- stop and split when scope grows;
- early checkpoints;
- concise completion reports;
- inspect state before recovering an interrupted task;
- finite retry policy;
- controlled parallelism;
- GitHub as durable checkpoint memory;
- no unnecessary scope expansion;
- explicit task states: PENDING / ACTIVE / PAUSED / BLOCKED / TESTING / CLOSED.

## Relationship to development

The protocol controls **execution mechanics**, not game direction.

The Master Game Development Directive remains authoritative for product and architecture quality.

The execution protocol must therefore reduce saturation without encouraging superficial completion.

## Persistence

The protocol was added to:

```
docs/cerebro/MACH_GIRLS_GLOBAL_EXECUTION_PROTOCOL.md
```

and linked from:

```
docs/cerebro/MACH_GIRLS_GAME_BRAIN.md
```

