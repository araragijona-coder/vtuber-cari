# MACH-GIRLS — GLOBAL EXECUTION PROTOCOL

## STATUS

**MANDATORY / GLOBAL / CURRENT**

This protocol applies to every **Brain** and **Worker** agent participating in Mach-Girls.

Its purpose is operational continuity:

> **Finish small, verified, recoverable units of work without saturating agents, sessions, context windows, or responses.**

This protocol complements the Master Game Development Directive.

The Master Game Development Directive defines **what game to build**.

This protocol defines **how agents execute the work safely and continuously**.

---

# 1. ONE ACTIVE TASK PER AGENT

Each Brain or Worker may have at most:

```
1 ACTIVE TASK
```

A queue of pending work may exist, but only one task is executed at a time.

Correct:

```
TASK 01 → ACTIVE
TASK 02 → PENDING
TASK 03 → PENDING
TASK 04 → PENDING
```

Incorrect:

```
TASK 01 → ACTIVE
TASK 02 → ACTIVE
TASK 03 → ACTIVE
TASK 04 → WAITING
```

When the active task closes:

```
TASK 01 → CLOSED
TASK 02 → ACTIVE
```

---

# 2. BRAIN LOAD CONTROL

Before assigning work, the Brain must determine whether the Worker already has an active task.

If:

```
ACTIVE
```

do not assign another task.

The Worker may receive another task only when the current task is:

```
CLOSED
BLOCKED
PAUSED
```

Independent work may be reassigned to another Worker when that actually reduces risk and coordination cost.

---

# 3. SMALL TASKS

Large requests must be decomposed into small executable units.

Preferred flow:

```
PLAN
↓
NEXT TASK
↓
EXECUTE
↓
TEST
↓
CHECKPOINT
↓
RESULT
↓
NEXT TASK
```

Do not generate giant task queues up front.

Planning must be proportional to the work.

---

# 4. TASK SPLITTING

If a task grows beyond its original scope:

> **STOP AND SPLIT IT.**

Example:

```
TASK-021
↓
requires A
requires B
requires C
requires D
```

Convert to:

```
TASK-021A
TASK-021B
TASK-021C
TASK-021D
```

Then execute only one.

---

# 5. PROCESSING LIMIT

An agent must not keep an operation effectively indefinite.

If the task is becoming too large in time, context, tool calls, or output:

```
PAUSE
↓
SAVE STATE
↓
CHECKPOINT
↓
REPORT
↓
CONTINUE LATER
```

Do not continue blindly until a connection or context fails.

The target is always:

> **A useful recoverable state.**

---

# 6. EARLY CHECKPOINTS

Whenever a meaningful unit is complete:

```
TEST
↓
COMMIT
↓
PUSH
↓
VERIFY REMOTE
```

Do not accumulate dozens of unrelated changes before saving.

A checkpoint must be a real repository state, not only conversational memory.

---

# 7. CONVERSATION OUTPUT LIMIT

Agents must prioritize execution over explanation.

Default completion format:

```
TASK:
RESULT:
TEST:
COMMIT:
STATUS:
NEXT:
```

Do not dump large explanations when the same information already exists in GitHub.

Do not paste complete files into chat merely because they were edited in the repository.

---

# 8. INTERRUPT / TRUNCATION RECOVERY

If the session reports:

```
Connection interrupted
Waiting for complete response
Timeout
Cancelled
Truncated response
Agent error
```

DO NOT repeat the entire task automatically.

First inspect:

```
Git state
latest commit
branch
changed files
tests
task status
latest checkpoint
```

Then continue from the last verified point.

---

# 9. NO INFINITE RETRIES

When a task fails:

```
ATTEMPT 1
↓
DIAGNOSE
↓
ATTEMPT 2
```

If the same fundamental cause persists:

```
BLOCKED
```

Record:

```
ERROR
CAUSE
ATTEMPTS
EVIDENCE
REQUIRED INPUT / FIX
```

Do not burn the session repeating the same failing operation.

---

# 10. CONTROLLED PARALLELISM

Parallel work is allowed only when it is genuinely independent.

Safe:

```
WORKER A → research
WORKER B → independent test design
```

Unsafe:

```
WORKER A → edit same runtime file
WORKER B → edit same runtime file
WORKER C → edit same runtime file
```

Only one agent should modify the same logical code surface at a time unless explicit coordination exists.

---

# 11. SPEED

Never interpret:

> "Hazlo rápido"

as:

> "Haz muchas tareas simultáneamente."

Correct interpretation:

> **Complete one small task, verify it, save it, and move to the next task.**

Speed comes from closed checkpoints, not task accumulation.

---

# 12. TASK STATES

Every task must use exactly one of:

```
PENDING
ACTIVE
PAUSED
BLOCKED
TESTING
CLOSED
```

No task may remain indefinitely in:

```
ACTIVE
```

If progress stops:

```
PAUSED
```

or:

```
BLOCKED
```

---

# 13. BRAIN ROLE

The Brain is an orchestrator, not a constant emergency dispatcher.

Preferred flow:

```
BRAIN
↓
TASK
↓
WORKER
↓
EXECUTE
↓
CHECKPOINT
↓
BRAIN REVIEW
↓
NEXT TASK
```

Avoid:

```
assign
→ interrupt
→ reassign
→ interrupt
→ retry
→ reassign
```

unless evidence requires it.

---

# 14. WORKER ROLE

The Worker should execute the currently active task only.

The Worker should not opportunistically expand scope because:

> "ya que estamos..."

Additional discoveries become:

```
PENDING TASK
```

unless the current task cannot be correctly completed without them.

---

# 15. GITHUB AS CHECKPOINT MEMORY

Conversational memory is not a durable project checkpoint.

When information must survive a session:

```
WRITE TO REPOSITORY
→ COMMIT
→ PUSH
→ VERIFY REMOTE
```

Use:

- code;
- design docs;
- session records;
- task state;
- migration notes;
- test evidence;

as appropriate.

Never claim persistence without remote evidence.

---

# 16. RECOVERY PRINCIPLE

After any interruption:

```
1. DO NOT PANIC
2. DO NOT REPEAT EVERYTHING
3. INSPECT STATE
4. INSPECT GIT
5. IDENTIFY LAST CHECKPOINT
6. CONTINUE FROM THERE
```

The last verified checkpoint is the authoritative recovery point.

---

# 17. PROHIBITED BEHAVIOR

Never:

```
❌ infinite tasks
❌ giant task queues
❌ giant chat responses
❌ infinite retries
❌ multiple active tasks per Worker
❌ uncontrolled writes to the same file
❌ unnecessary accumulation of changes
❌ automatic full-task repetition after interruption
❌ thousands of lines explaining repository work already persisted
❌ scope expansion without authorization
```

---

# 18. QUALITY OVER VOLUME

Prefer:

```
SMALL
↓
VERIFIED
↓
SAVED
↓
RECOVERABLE
```

over:

```
LARGE
↓
LONG
↓
NO CHECKPOINT
↓
CONNECTION FAILURE
```

---

# 19. TASK COMPLETION TARGET

The purpose of each execution is not maximum work duration.

The target is:

> **The run ends in a useful, verified, recoverable state.**

If it can be finished now:

```
FINISH
```

If it must be divided:

```
SPLIT
```

If blocked:

```
BLOCKED
```

If already complete:

```
DO NOT REPEAT
```

---

# 20. TOOL / PLUGIN RULE

This protocol does not remove the project's tool-first policy.

Before using a manual fallback for a specialized task:

```
CHECK AVAILABLE TOOLS / PLUGINS
↓
SELECT THE BEST AVAILABLE TOOL
↓
USE IT
↓
VERIFY RESULT
↓
PERSIST IMPORTANT OUTPUT
```

Tool usage must remain proportional to the task.

Do not launch redundant generations, redundant browser sessions, or parallel tool calls merely to appear busy.

---

# 21. RELATION TO MACH-GIRLS DEVELOPMENT

The execution protocol must never be used as a reason to weaken the Master Game Development Directive.

Small tasks must still preserve the project's priority:

```
GAMEPLAY
→ SCENE
→ CAMERA
→ MOVEMENT
→ IMPACT
→ VFX
→ HUD
```

A tiny task that technically closes but moves Mach-Girls toward a web-dashboard presentation is not a successful task merely because it was small.

Execution discipline and visual/game quality are both mandatory.

---

# 22. FINAL PRINCIPLE

> **DO NOT FILL THE SESSION. DO NOT FILL THE WORKER. DO NOT FILL THE RESPONSE.**

> **ONE TASK → ONE RESULT → ONE CHECKPOINT → NEXT TASK.**

Priority:

```
STABILITY
>
CONTINUITY
>
CLOSED TASKS
>
SPEED
>
VOLUME
```

Operational roles:

```
BRAIN COORDINATES.
WORKER EXECUTES.
GITHUB STORES.
CHECKPOINTS ENABLE RECOVERY.
```
