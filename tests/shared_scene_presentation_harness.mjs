import { readFile } from "node:fs/promises";
import vm from "node:vm";

export const SCENE_PRESENTATION_FILES = Object.freeze([
  "intento_2/webapp/js/scene/world_space.js",
  "intento_2/webapp/js/scene/camera.js",
  "intento_2/webapp/js/scene/animation.js",
  "intento_2/webapp/js/scene/actor.js",
  "intento_2/webapp/js/scene/scene.js",
  "intento_2/webapp/js/scene/renderer.js",
  "intento_2/webapp/js/scene/presentation_events.js",
  "intento_2/webapp/js/combat_shot_director.js",
  "intento_2/webapp/js/combat_presentation.js"
]);

function createCanvasMock(width = 1000, height = 600) {
  const textCalls = [];
  const imageRequests = [];
  const imageDraws = [];
  const operations = [];
  let clearCount = 0;
  const gradient = { addColorStop() {} };

  const context = {
    textCalls,
    imageRequests,
    imageDraws,
    operations,
    filter: "none",
    globalAlpha: 1,
    lineWidth: 1,
    font: "",
    textAlign: "left",
    textBaseline: "middle",
    fillStyle: "",
    strokeStyle: "",
    save() { operations.push("save"); },
    restore() { operations.push("restore"); },
    translate() { operations.push("translate"); },
    scale() { operations.push("scale"); },
    rotate() { operations.push("rotate"); },
    setTransform() { operations.push("setTransform"); },
    clearRect() { clearCount += 1; operations.push("clearRect"); },
    fillRect() { operations.push("fillRect"); },
    strokeRect() { operations.push("strokeRect"); },
    beginPath() { operations.push("beginPath"); },
    closePath() { operations.push("closePath"); },
    moveTo() { operations.push("moveTo"); },
    lineTo() { operations.push("lineTo"); },
    stroke() { operations.push("stroke"); },
    fill() { operations.push("fill"); },
    arc() { operations.push("arc"); },
    ellipse() { operations.push("ellipse"); },
    arcTo() { operations.push("arcTo"); },
    drawImage(image) {
      imageDraws.push(String(image?.src || image || ""));
      operations.push("drawImage");
    },
    fillText(text) {
      textCalls.push(String(text));
      operations.push("fillText");
    },
    strokeText() { operations.push("strokeText"); },
    setLineDash() { operations.push("setLineDash"); },
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    measureText() { return { width: 0 }; }
  };

  const canvas = {
    getBoundingClientRect() {
      return { width, height };
    }
  };

  return {
    canvas,
    context,
    textCalls,
    imageRequests,
    imageDraws,
    operations,
    get clearCount() { return clearCount; },
    reset() {
      textCalls.length = 0;
      imageRequests.length = 0;
      imageDraws.length = 0;
      operations.length = 0;
      clearCount = 0;
    }
  };
}

function createDomFixture() {
  const elements = new Set();
  let elementSequence = 0;

  function createElement(tagName = "div", id = "") {
    const listeners = new Map();
    const element = {
      id,
      tagName: String(tagName).toUpperCase(),
      children: [],
      parentElement: null,
      dataset: {},
      style: {},
      hidden: false,
      disabled: false,
      textContent: "",
      innerHTML: "",
      className: "",
      name: "",
      type: "",
      value: "",
      _listeners: listeners,
      setAttribute(name, value) {
        const key = String(name);
        const normalized = key === "class" ? "className" : key;
        this[normalized] = String(value);
      },
      addEventListener(type, listener) {
        const key = String(type);
        const list = listeners.get(key) || [];
        list.push(listener);
        listeners.set(key, list);
      },
      removeEventListener(type, listener) {
        const key = String(type);
        const list = listeners.get(key) || [];
        listeners.set(key, list.filter((entry) => entry !== listener));
      },
      dispatch(type, detail = {}) {
        const event = {
          type: String(type),
          currentTarget: this,
          target: this,
          detail
        };
        for (const listener of listeners.get(String(type)) || []) listener(event);
      },
      appendChild(child) {
        if (child.parentElement) {
          child.parentElement.children = child.parentElement.children.filter((entry) => entry !== child);
        }
        child.parentElement = this;
        this.children.push(child);
        return child;
      },
      insertBefore(child, reference) {
        if (child.parentElement) {
          child.parentElement.children = child.parentElement.children.filter((entry) => entry !== child);
        }
        child.parentElement = this;
        const index = this.children.indexOf(reference);
        if (index < 0) this.children.push(child);
        else this.children.splice(index, 0, child);
        return child;
      },
      remove() {
        if (!this.parentElement) return;
        this.parentElement.children = this.parentElement.children.filter((entry) => entry !== this);
        this.parentElement = null;
      }
    };
    element.__testId = ++elementSequence;
    elements.add(element);
    return element;
  }

  const body = createElement("body", "body");

  function snapshotNode(node) {
    return {
      tagName: node.tagName,
      id: node.id,
      dataset: { ...node.dataset },
      disabled: Boolean(node.disabled),
      hidden: Boolean(node.hidden),
      textContent: String(node.textContent || ""),
      innerHTML: String(node.innerHTML || ""),
      className: String(node.className || ""),
      children: node.children.map(snapshotNode)
    };
  }

  const document = {
    body,
    createElement(tagName) {
      return createElement(tagName);
    },
    getElementById(id) {
      for (const element of elements) {
        if (element.id === String(id)) return element;
      }
      return null;
    }
  };

  return Object.freeze({
    document,
    body,
    createElement,
    snapshot() {
      return snapshotNode(body);
    }
  });
}

function createRafDriver() {
  let nextId = 1;
  const queue = new Map();

  return Object.freeze({
    request(callback) {
      const id = nextId++;
      queue.set(id, callback);
      return id;
    },
    cancel(id) {
      queue.delete(id);
    },
    pending() {
      return queue.size;
    },
    step(timestamp) {
      const entry = queue.entries().next();
      if (entry.done) return false;
      const [id, callback] = entry.value;
      queue.delete(id);
      callback(timestamp);
      return true;
    }
  });
}

function createFakeImageTracker(imageRequests) {
  return class FakeImage {
    constructor() {
      this.complete = true;
      this.naturalWidth = 128;
      this.decoding = "async";
      this._src = "";
    }

    set src(value) {
      this._src = String(value);
      imageRequests.push(this._src);
    }

    get src() {
      return this._src;
    }
  };
}

export function makeCombatFixture(overrides = {}) {
  const base = {
    battleId: "shared-scene-harness",
    outcome: "IN_PROGRESS",
    player: {
      id: "player",
      hp: 100,
      maxHp: 120,
      block: 14,
      statuses: {},
      identity: { characterId: "yuri" }
    },
    enemy: {
      id: "enemy",
      name: "STREET PUNK",
      hp: 72,
      maxHp: 100,
      block: 0,
      statuses: {},
      breakState: { state: "READY", current: 64, max: 100, remainingMs: 0 }
    },
    enemyIntent: {
      type: "ATTACK",
      label: "ATTACK 7",
      remainingMs: 900
    },
    enemyBehavior: { telegraphMs: 1200 },
    resources: { energy: 50, maxEnergy: 100 }
  };

  return {
    ...base,
    ...overrides,
    player: { ...base.player, ...(overrides.player || {}) },
    enemy: {
      ...base.enemy,
      ...(overrides.enemy || {}),
      breakState: {
        ...base.enemy.breakState,
        ...(overrides.enemy?.breakState || {})
      }
    },
    enemyIntent: { ...base.enemyIntent, ...(overrides.enemyIntent || {}) },
    enemyBehavior: { ...base.enemyBehavior, ...(overrides.enemyBehavior || {}) },
    resources: { ...base.resources, ...(overrides.resources || {}) }
  };
}

export async function createScenePresentationHarness(options = {}) {
  let now = Number(options.now ?? 0) || 0;
  const canvas = createCanvasMock(options.width ?? 1000, options.height ?? 600);
  const dom = createDomFixture();
  const raf = createRafDriver();
  const imageRequests = [];
  const audioEvents = [];

  const storageValues = new Map();
  const localStorage = {
    getItem(key) { return storageValues.has(String(key)) ? storageValues.get(String(key)) : null; },
    setItem(key, value) { storageValues.set(String(key), String(value)); },
    removeItem(key) { storageValues.delete(String(key)); },
    clear() { storageValues.clear(); }
  };

  const FakeImage = options.fakeImage ? createFakeImageTracker(imageRequests) : undefined;
  const window = {
    document: dom.document,
    devicePixelRatio: 1,
    localStorage,
    requestAnimationFrame: raf.request,
    cancelAnimationFrame: raf.cancel,
    BreakSystem: {
      isBroken: () => false
    },
    BurstSystem: {
      canUse: () => false,
      chargeOf: () => 0,
      maxChargeOf: () => 100
    },
    StatusSystem: {
      entries: () => []
    }
  };

  if (FakeImage) window.Image = FakeImage;

  const contextVm = vm.createContext({
    window,
    document: dom.document,
    localStorage,
    performance: { now: () => now },
    Image: FakeImage,
    console,
    Math,
    Number,
    String,
    Object,
    Array,
    Set,
    Map,
    JSON,
    Date,
    Promise,
    Error,
    TypeError,
    Infinity,
    NaN
  });

  for (const file of SCENE_PRESENTATION_FILES) {
    const source = await readFile(file, "utf8");
    vm.runInContext(source, contextVm, { filename: file });
  }

  const presentation = contextVm.window.CombatPresentation.create(
    canvas.canvas,
    canvas.context
  );

  return {
    window: contextVm.window,
    presentation,
    canvas,
    dom,
    raf,
    imageRequests,
    audioEvents,
    setNow(value) {
      now = Number(value) || 0;
    },
    render(combat, timestamp = now) {
      now = Number(timestamp) || 0;
      presentation.render(combat, now);
      return presentation.getSceneFoundation();
    }
  };
}
