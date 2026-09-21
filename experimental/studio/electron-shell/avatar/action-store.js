import { AVATAR_EXPRESSIONS } from "./avatar-contract.js";

const STORAGE_KEY = "cari.studio.avatar-actions.v1";
const MAX_DATA_URL_BYTES = 8 * 1024 * 1024;
const MAX_FRAMES_PER_ACTION = 24;

const DEFAULT_ACTIONS = [
  { id: "neutral", label: "Neutral", icon: "○", expression: "neutral" },
  { id: "happy", label: "Feliz", icon: "☺", expression: "happy" },
  { id: "sad", label: "Triste", icon: "◡", expression: "sad" },
  { id: "angry", label: "Enojada", icon: "△", expression: "angry" },
  { id: "afraid", label: "Asustada", icon: "!", expression: "afraid" },
  { id: "embarrassed", label: "Avergonzada", icon: "〃", expression: "embarrassed" },
  { id: "exhausted", label: "Agotada", icon: "z", expression: "exhausted" },
  { id: "confused", label: "Confundida", icon: "?", expression: "confused" },
  { id: "focused", label: "Concentrada", icon: "●", expression: "focused" },
  { id: "talking", label: "Hablar", icon: "◉", expression: "neutral", mouthOpen: 0.9 },
  { id: "silent", label: "Callar", icon: "○", expression: "neutral", mouthOpen: 0 }
];

function uid(prefix = "id") {
  return prefix + "-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function normalizeAction(input, index = 0) {
  const fallback = DEFAULT_ACTIONS[index] || DEFAULT_ACTIONS[0];
  return {
    id: String(input?.id || uid("action")),
    label: String(input?.label || fallback.label || "Nueva acción").slice(0, 48),
    icon: String(input?.icon || fallback.icon || "+").slice(0, 4),
    expression: AVATAR_EXPRESSIONS.includes(input?.expression)
      ? input.expression
      : (fallback.expression || "neutral"),
    mouthOpen: Math.max(0, Math.min(1, Number(input?.mouthOpen) || Number(fallback.mouthOpen) || 0)),
    durationMs: Math.max(80, Math.min(10000, Number(input?.durationMs) || 800)),
    loop: input?.loop !== false,
    opacity: Math.max(0, Math.min(1, Number(input?.opacity) || 1)),
    scale: Math.max(0.1, Math.min(3, Number(input?.scale) || 1)),
    offsetX: Math.max(-50, Math.min(50, Number(input?.offsetX) || 0)),
    offsetY: Math.max(-50, Math.min(50, Number(input?.offsetY) || 0)),
    frames: Array.isArray(input?.frames)
      ? input.frames.slice(0, MAX_FRAMES_PER_ACTION).map(frame => ({
          id: String(frame.id || uid("frame")),
          name: String(frame.name || "image").slice(0, 120),
          dataUrl: typeof frame.dataUrl === "string" ? frame.dataUrl : "",
          url: typeof frame.url === "string" ? frame.url : "",
          mime: String(frame.mime || "image/png"),
          size: Number(frame.size) || 0,
          bundled: frame.bundled === true
        })).filter(frame => frame.dataUrl || frame.url)
      : []
  };
}

export class AvatarActionStore {
  constructor(
    storage = typeof window !== "undefined" ? window.localStorage : null,
    persistence = typeof window !== "undefined" ? window.cari?.avatarActions : null
  ) {
    this.storage = storage;
    this.persistence = persistence;
    this.persistenceError = null;
    this.persistQueue = Promise.resolve();
    this.actions = this.#loadLocal();
    this.ready = this.#hydrate();
  }

  #loadLocal() {
    if (!this.storage?.getItem) {
      return DEFAULT_ACTIONS.map((item, index) => normalizeAction(item, index));
    }

    try {
      const parsed = JSON.parse(this.storage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map((item, index) => normalizeAction(item, index));
      }
    } catch {
      this.persistenceError = "local action storage was corrupt and was reset";
    }
    return DEFAULT_ACTIONS.map((item, index) => normalizeAction(item, index));
  }

  async #hydrate() {
    if (!this.persistence?.load) return this.list();

    try {
      const payload = await this.persistence.load();
      if (payload?.version === 1 && Array.isArray(payload.actions) && payload.actions.length) {
        this.actions = payload.actions.map((item, index) => normalizeAction(item, index));
        return this.list();
      }

      if (this.actions.length) {
        await this.#persist();
      }
    } catch (error) {
      this.persistenceError = String(error?.message || error || "disk persistence unavailable");
    }
    return this.list();
  }

  #persist() {
    const serialized = JSON.stringify(this.actions);
    if (this.storage?.setItem) {
      try {
        this.storage.setItem(STORAGE_KEY, serialized);
      } catch (error) {
        this.persistenceError = String(error?.message || error || "local storage write failed");
      }
    }

    if (!this.persistence?.save) return Promise.resolve();

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      actions: this.list()
    };
    this.persistQueue = this.persistQueue
      .then(() => this.persistence.save(payload))
      .catch(error => {
        this.persistenceError = String(error?.message || error || "disk persistence failed");
      });
    return this.persistQueue;
  }

  async flush() {
    return this.persistQueue;
  }

  list() {
    return this.actions.map(action => ({
      ...action,
      frames: action.frames.map(frame => ({ ...frame }))
    }));
  }

  get(id) {
    const action = this.actions.find(item => item.id === id);
    return action ? { ...action, frames: action.frames.map(frame => ({ ...frame })) } : null;
  }

  add(label = "Nueva acción") {
    const action = normalizeAction({
      id: uid("action"),
      label,
      icon: "+",
      expression: "neutral",
      frames: []
    });
    this.actions.push(action);
    this.#persist();
    return { ...action };
  }

  duplicate(id) {
    const source = this.actions.find(item => item.id === id);
    if (!source) return null;
    const copy = normalizeAction({
      ...source,
      id: uid("action"),
      label: source.label + " copia",
      frames: source.frames.map(frame => ({ ...frame, id: uid("frame") }))
    });
    this.actions.push(copy);
    this.#persist();
    return { ...copy };
  }

  remove(id) {
    if (this.actions.length <= 1) return false;
    const before = this.actions.length;
    this.actions = this.actions.filter(item => item.id !== id);
    if (this.actions.length === before) return false;
    this.#persist();
    return true;
  }

  update(id, patch) {
    const index = this.actions.findIndex(item => item.id === id);
    if (index < 0) return null;
    this.actions[index] = normalizeAction({
      ...this.actions[index],
      ...patch,
      id
    });
    this.#persist();
    return { ...this.actions[index] };
  }

  async seedBundledFrames(assetUrls = {}) {
    const mapping = [
      ["neutral", "neutral", "cari_neutral.png"],
      ["happy", "happy", "cari_happy.png"],
      ["angry", "angry", "cari_angry.png"]
    ];

    let changed = false;
    for (const [actionId, key, filename] of mapping) {
      const action = this.actions.find(item => item.id === actionId);
      const url = typeof assetUrls[key] === "string" ? assetUrls[key] : "";
      if (!action || !url || action.frames.length) continue;

      action.frames.push({
        id: "bundled-" + actionId,
        name: filename,
        dataUrl: "",
        url,
        mime: "image/png",
        size: 0,
        bundled: true
      });
      changed = true;
    }

    if (changed) this.#persist();
    return changed;
  }

  addFrame(id, file) {
    const index = this.actions.findIndex(item => item.id === id);
    if (index < 0 || !(file instanceof File)) return Promise.reject(new Error("Acción o archivo inválido"));
    if (this.actions[index].frames.length >= MAX_FRAMES_PER_ACTION) {
      return Promise.reject(new Error("Máximo de 24 imágenes por acción"));
    }
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      return Promise.reject(new Error("Usá PNG, JPG o WebP"));
    }
    if (file.size > MAX_DATA_URL_BYTES) {
      return Promise.reject(new Error("La imagen supera el límite de 8 MiB"));
    }

    return fileToDataUrl(file).then(dataUrl => {
      const frame = {
        id: uid("frame"),
        name: file.name,
        dataUrl,
        mime: file.type || "image/png",
        size: file.size
      };
      this.actions[index].frames.push(frame);
      this.#persist();
      return { ...frame };
    });
  }

  removeFrame(actionId, frameId) {
    const action = this.actions.find(item => item.id === actionId);
    if (!action) return false;
    const before = action.frames.length;
    action.frames = action.frames.filter(frame => frame.id !== frameId);
    if (before === action.frames.length) return false;
    this.#persist();
    return true;
  }

  moveFrame(actionId, frameId, direction) {
    const action = this.actions.find(item => item.id === actionId);
    if (!action) return false;
    const index = action.frames.findIndex(frame => frame.id === frameId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= action.frames.length) return false;
    [action.frames[index], action.frames[target]] = [action.frames[target], action.frames[index]];
    this.#persist();
    return true;
  }

  exportJson() {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      actions: this.actions
    }, null, 2);
  }

  importJson(text) {
    const parsed = JSON.parse(text);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.actions)) {
      throw new Error("Preset de acciones incompatible");
    }
    const next = parsed.actions.map((item, index) => normalizeAction(item, index));
    if (!next.length) throw new Error("El preset no contiene acciones");
    this.actions = next;
    this.#persist();
    return this.list();
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer " + file.name));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}
