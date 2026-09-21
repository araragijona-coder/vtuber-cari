const SOURCE_PRIORITIES = Object.freeze({
  manual: 100,
  chat: 80,
  event: 70,
  voice: 30
});

const CHAT_COMMANDS = Object.freeze({
  "!happy": "happy",
  "!feliz": "happy",
  "!sad": "sad",
  "!triste": "sad",
  "!angry": "angry",
  "!enojada": "angry",
  "!afraid": "afraid",
  "!miedo": "afraid",
  "!embarrassed": "embarrassed",
  "!avergonzada": "embarrassed",
  "!exhausted": "exhausted",
  "!agotada": "exhausted",
  "!confused": "confused",
  "!confundida": "confused",
  "!focused": "focused",
  "!concentrada": "focused",
  "!talk": "talking",
  "!hablar": "talking",
  "!silent": "silent",
  "!callar": "silent",
  "!neutral": "neutral"
});

const TWITCH_EVENT_ACTIONS = Object.freeze({
  "channel.follow": "happy",
  "channel.subscribe": "happy",
  "channel.subscription.message": "happy",
  "channel.subscription.gift": "happy",
  "channel.cheer": "happy",
  "channel.raid": "happy",
  "stream.online": "happy",
  "stream.offline": "silent",
  "channel.update": "neutral",
  "channel.channel_points_custom_reward_redemption.add": "happy",
  "channel.shared_chat.begin": "happy",
  "channel.shared_chat.update": "talking",
  "channel.shared_chat.end": "neutral"
});

function normalizeActionLookup(value) {
  return String(value || "").trim().toLowerCase();
}

export class Avatar2DFramePlayer {
  constructor({
    store,
    renderFrame,
    onActionChange = () => undefined,
    timerFactory = globalThis.setTimeout,
    clearTimer = globalThis.clearTimeout,
    now = () => globalThis.performance?.now?.() ?? Date.now()
  }) {
    if (!store || typeof store.get !== "function" || typeof store.list !== "function") {
      throw new TypeError("Avatar2DFramePlayer requires an action store");
    }
    if (typeof renderFrame !== "function") {
      throw new TypeError("Avatar2DFramePlayer requires a renderFrame callback");
    }

    this.store = store;
    this.renderFrame = renderFrame;
    this.onActionChange = onActionChange;
    this.timerFactory = timerFactory;
    this.clearTimer = clearTimer;
    this.now = now;
    this.baseActionId = store.list()[0]?.id || null;
    this.overrides = new Map();
    this.sequence = 0;
    this.frameIndex = 0;
    this.timer = null;
    this.currentKey = "";
    this.destroyed = false;
    this.#renderResolved(false);
  }

  setBaseAction(id) {
    const action = this.store.get(id);
    if (!action) return false;
    this.baseActionId = action.id;
    this.#renderResolved(true);
    return true;
  }

  trigger(id, {
    source = "event",
    priority = SOURCE_PRIORITIES[source] ?? 50,
    holdMs = 0
  } = {}) {
    const action = this.store.get(id);
    if (!action) return false;

    const normalizedSource = String(source || "event");
    const numericPriority = Number.isFinite(Number(priority))
      ? Number(priority)
      : (SOURCE_PRIORITIES[normalizedSource] ?? 50);
    const existing = this.overrides.get(normalizedSource);
    if (existing && existing.priority > numericPriority) return false;

    this.sequence += 1;
    const duration = Number(holdMs);
    this.overrides.set(normalizedSource, {
      actionId: action.id,
      priority: numericPriority,
      expiresAt: duration > 0 ? this.now() + duration : Infinity,
      sequence: this.sequence
    });
    this.#renderResolved(true);
    return true;
  }

  release(source) {
    const key = String(source || "event");
    const removed = this.overrides.delete(key);
    if (removed) this.#renderResolved(true);
    return removed;
  }

  clearOverrides() {
    if (!this.overrides.size) return;
    this.overrides.clear();
    this.#renderResolved(true);
  }

  update(nowMs = this.now()) {
    if (this.destroyed) return false;
    let changed = false;
    for (const [source, override] of this.overrides) {
      if (override.expiresAt !== Infinity && nowMs >= override.expiresAt) {
        this.overrides.delete(source);
        changed = true;
      }
    }
    if (changed) this.#renderResolved(true);
    return changed;
  }

  currentAction() {
    this.update(this.now());
    const winner = this.#resolve();
    return winner ? this.store.get(winner.actionId) : null;
  }

  currentSource() {
    this.update(this.now());
    return this.#resolve()?.source || "base";
  }

  previewFrame(action, index = 0) {
    this.#cancelTimer();
    const frames = action?.frames || [];
    this.frameIndex = frames.length
      ? Math.max(0, Math.min(Number(index) || 0, frames.length - 1))
      : 0;
    this.renderFrame(action || null, this.frameIndex, { preview: true });
  }

  dispose() {
    this.destroyed = true;
    this.#cancelTimer();
    this.overrides.clear();
  }

  #resolve() {
    const now = this.now();
    let winner = this.baseActionId
      ? { actionId: this.baseActionId, priority: -1, sequence: 0, source: "base" }
      : null;

    for (const [source, override] of this.overrides) {
      if (override.expiresAt !== Infinity && now >= override.expiresAt) continue;
      const candidate = { ...override, source };
      if (
        !winner ||
        candidate.priority > winner.priority ||
        (candidate.priority === winner.priority && candidate.sequence > winner.sequence)
      ) {
        winner = candidate;
      }
    }
    return winner;
  }

  #renderResolved(notify) {
    const winner = this.#resolve();
    const action = winner ? this.store.get(winner.actionId) : null;
    const key = winner
      ? winner.source + ":" + winner.actionId + ":" + winner.sequence
      : "none";

    if (key !== this.currentKey) {
      this.currentKey = key;
      if (notify) this.onActionChange(action, winner?.source || "base");
    }

    this.#cancelTimer();

    if (!action) {
      this.renderFrame(null, 0, { preview: false });
      return;
    }

    this.frameIndex = 0;
    this.renderFrame(action, this.frameIndex, { preview: false });

    if (!action.loop || action.frames.length < 2) return;

    const scheduleNext = () => {
      if (this.destroyed) return;
      this.update(this.now());
      const current = this.#resolve();
      if (!current || current.actionId !== action.id || this.currentKey !== key) return;

      this.frameIndex = (this.frameIndex + 1) % action.frames.length;
      const currentAction = this.store.get(action.id) || action;
      this.renderFrame(currentAction, this.frameIndex, { preview: false });
      this.timer = this.timerFactory(
        scheduleNext,
        Math.max(80, Number(currentAction.durationMs) || 800)
      );
    };

    this.timer = this.timerFactory(
      scheduleNext,
      Math.max(80, Number(action.durationMs) || 800)
    );
  }

  #cancelTimer() {
    if (this.timer !== null) {
      this.clearTimer(this.timer);
      this.timer = null;
    }
  }
}

export class StudioActionRouter {
  constructor({
    actionStore,
    player,
    acting = null,
    chatHoldMs = 2400,
    eventHoldMs = 3600
  } = {}) {
    if (!actionStore || !player) {
      throw new TypeError("StudioActionRouter requires actionStore and player");
    }
    this.actionStore = actionStore;
    this.player = player;
    this.acting = acting;
    this.chatHoldMs = Math.max(250, Number(chatHoldMs) || 2400);
    this.eventHoldMs = Math.max(250, Number(eventHoldMs) || 3600);
    this.voiceSpeaking = false;
    this.lastAction = null;
    this.lastSource = "base";
  }

  setManualAction(id) {
    const ok = this.player.setBaseAction(id);
    if (!ok) return false;
    this.player.release("chat");
    this.player.release("event");
    this.syncActing();
    this.lastAction = this.actionStore.get(id);
    this.lastSource = "manual";
    return true;
  }

  trigger(actionOrExpression, {
    source = "event",
    holdMs,
    priority
  } = {}) {
    const action = this.#findAction(actionOrExpression);
    if (!action) return false;

    const ok = this.player.trigger(action.id, {
      source,
      holdMs: holdMs ?? (source === "chat" ? this.chatHoldMs : this.eventHoldMs),
      priority
    });
    if (!ok) return false;

    this.syncActing();
    this.lastAction = action;
    this.lastSource = source;
    return true;
  }

  handleChatMessage(text) {
    const clean = String(text || "").trim().toLowerCase();
    if (!clean) return null;

    const direct = CHAT_COMMANDS[clean];
    const actionCommand = clean.match(/^!action\s+(.+)$/);
    const requested = direct || actionCommand?.[1] || null;
    if (!requested) return null;

    return this.trigger(requested, {
      source: "chat",
      holdMs: this.chatHoldMs,
      priority: SOURCE_PRIORITIES.chat
    }) ? requested : null;
  }

  handleTwitchEvent(eventType) {
    const normalizedType = normalizeActionLookup(eventType);
    const action = TWITCH_EVENT_ACTIONS[normalizedType];
    if (!action) return null;

    const ok = this.trigger(action, {
      source: "event",
      holdMs: this.eventHoldMs,
      priority: SOURCE_PRIORITIES.event
    });
    return ok ? action : null;
  }

  setVoiceActivity({ speaking = false, active = true } = {}) {
    if (!active) {
      const changed = this.voiceSpeaking || this.player.currentSource() === "voice";
      this.voiceSpeaking = false;
      this.player.release("voice");
      this.syncActing();
      return changed;
    }

    const next = Boolean(speaking);
    const changed = next !== this.voiceSpeaking;
    if (!changed) {
      return false;
    }

    this.voiceSpeaking = next;
    const action = next ? "talking" : "silent";
    return this.trigger(action, {
      source: "voice",
      holdMs: 0,
      priority: SOURCE_PRIORITIES.voice
    });
  }

  release(source) {
    const removed = this.player.release(source);
    if (removed) this.syncActing();
    return removed;
  }

  syncActing() {
    if (!this.acting) return;
    const action = this.player.currentAction();
    if (action?.expression) this.acting.setManualExpression(action.expression);
  }

  snapshot() {
    const action = this.player.currentAction();
    return {
      actionId: action?.id || null,
      source: this.player.currentSource(),
      expression: action?.expression || "neutral",
      voiceSpeaking: this.voiceSpeaking,
      lastAction: this.lastAction?.id || null,
      lastSource: this.lastSource
    };
  }

  #findAction(value) {
    const normalized = normalizeActionLookup(value);
    if (!normalized) return null;
    return this.actionStore.list().find(action =>
      normalizeActionLookup(action.id) === normalized ||
      normalizeActionLookup(action.label) === normalized ||
      normalizeActionLookup(action.expression) === normalized
    ) || null;
  }
}

export { SOURCE_PRIORITIES, CHAT_COMMANDS, TWITCH_EVENT_ACTIONS };
