
import { StudioSessionManager } from "../runtime/session-manager.js";
import { FaceTracker } from "../avatar/face-tracker.js";
import { FaceTrackingBridge } from "../avatar/face-tracking-bridge.js";
import { ThreeAvatarRenderer } from "../avatar/three-avatar.js";
import { AvatarActingBridge } from "../avatar/acting-bridge.js";
import { AudioLipSync } from "../avatar/audio-lipsync.js";
import { AvatarActionStore } from "../avatar/action-store.js";
import { STUDIO_MENU, CAPABILITIES } from "./menu-config.js";

const $ = selector => document.querySelector(selector);
const ui = {
  avatar: $("#avatar"),
  editorAvatar: $("#editor-avatar"),
  actionOverlay: $("#action-overlay"),
  editorOverlay: $("#editor-overlay"),
  camera: $("#camera"),
  trackingCamera: $("#tracking-camera"),
  settingsAvatar: $("#avatar-settings-preview"),
  menuSearch: $("#menu-search"),
  status: $("#status"),
  engine: $("#engine-chip"),
  metrics: $("#metrics"),
  tracking: $("#tracking"),
  trackingBadge: $("#tracking-badge"),
  previewAction: $("#preview-action"),
  model: $("#model"),
  sideDiagnostics: $("#side-diagnostics"),
  actionGrid: $("#action-grid"),
  inspector: $("#inspector-content"),
  editorTitle: $("#editor-action-title"),
  editorFrames: $("#editor-frame-count"),
  liveActions: $("#live-action-bar"),
  assets: $("#asset-summary"),
  scenes: $("#scene-list"),
  liveState: $("#live-state"),
  fps: $("#stat-fps"),
  audio: $("#stat-audio"),
  output: $("#stat-output"),
  capture: $("#capture-state"),
  dashEngine: $("#dash-engine"),
  dashCapture: $("#dash-capture"),
  dashAudio: $("#dash-audio"),
  dashOutput: $("#dash-output"),
  workspace: $("#workspace-state"),
  fileInput: $("#action-file-input"),
  presetInput: $("#action-preset-input")
};

const session = new StudioSessionManager(window.cari.native);
const acting = new AvatarActingBridge();
const renderer = new ThreeAvatarRenderer(ui.avatar);
const editorRenderer = new ThreeAvatarRenderer(ui.editorAvatar);
const settingsRenderer = new ThreeAvatarRenderer(ui.settingsAvatar);
const tracking = new FaceTrackingBridge(acting);
const lipSync = new AudioLipSync(acting);
const actionStore = new AvatarActionStore();

let faceTracker = null;
let cameraStream = null;
let selectedActionId = actionStore.list()[0]?.id || null;
let frameIndex = 0;
let actionTimer = null;
let refreshBusy = false;
let twitchRead = false;

const scenes = loadScenes();
const twitch = {
  clientId: $("#twitch-client-id"),
  channel: $("#twitch-channel"),
  status: $("#twitch-status"),
  log: $("#chat-log"),
  input: $("#chat-input"),
  read: $("#chat-read"),
  events: $("#event-log")
};

function loadScenes() {
  try {
    const value = JSON.parse(localStorage.getItem("cari.studio.scenes.v1") || "null");
    if (Array.isArray(value) && value.length) return value;
  } catch {}
  return [
    { id: "live", name: "En vivo", description: "VTuber + cámara + chat", action: "neutral" },
    { id: "chatting", name: "Just Chatting", description: "Chat + avatar + acciones", action: "happy" },
    { id: "gaming", name: "Gaming", description: "Captura + avatar", action: "neutral" }
  ];
}

function saveScenes() {
  localStorage.setItem("cari.studio.scenes.v1", JSON.stringify(scenes));
}

function showStatus(message) {
  ui.status.textContent = String(message || "");
}

function renderNavigation() {
  const container = $("#nav-container");
  if (!container) return;
  container.innerHTML = "";
  const groups = [];
  for (const item of STUDIO_MENU) {
    let group = groups.find(value => value.name === item.group);
    if (!group) {
      group = { name: item.group, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  for (const group of groups) {
    const section = document.createElement("div");
    section.className = "nav-group";
    const label = document.createElement("div");
    label.className = "nav-label";
    label.textContent = group.name;
    section.appendChild(label);

    for (const item of group.items) {
      const button = document.createElement("button");
      button.className = "nav-item";
      button.dataset.view = item.id;
      button.title = item.description;
      button.innerHTML = '<span class="nav-icon">' + esc(item.icon) + '</span><span>' + esc(item.label) + '</span>';
      button.onclick = () => switchView(item.id);
      section.appendChild(button);
    }
    container.appendChild(section);
  }
}

function renderCapabilityCatalog(target, items) {
  const container = $(target);
  if (!container) return;
  container.innerHTML = "";

  const labels = {
    connected: "conectado",
    eventsub: "EventSub",
    prepared: "preparado",
    planned: "en desarrollo"
  };

  for (const [name, api, state] of items) {
    const card = document.createElement("div");
    card.className = "capability-card " + state;
    card.innerHTML =
      '<div class="capability-top"><h4>' + esc(name) + '</h4>' +
      '<span class="cap-status">' + esc(labels[state] || state) + '</span></div>' +
      '<div class="capability-api">' + esc(api) + '</div>';
    container.appendChild(card);
  }
}

function renderExpressionPanel() {
  const container = $("#expression-grid");
  if (!container) return;
  container.innerHTML = "";

  for (const action of actionStore.list()) {
    const card = document.createElement("button");
    card.className = "expression-button";
    card.innerHTML =
      '<h4>' + esc(action.icon + " " + action.label) + '</h4>' +
      '<p>' + esc(action.expression + " · " + action.frames.length + " frame(s)") + '</p>';
    card.onclick = () => setAction(action.id);
    container.appendChild(card);
  }
}

function renderHotkeys() {
  const container = $("#hotkey-grid");
  if (!container) return;
  const entries = [
    ["En vivo", "Ctrl+1", "Cambiar a control de emisión"],
    ["VTuber", "Ctrl+2", "Abrir editor de acciones"],
    ["Twitch", "Ctrl+3", "Abrir centro Twitch"],
    ["OBS", "Ctrl+4", "Abrir centro OBS"],
    ["Tracking", "Ctrl+5", "Abrir tracking facial"],
    ["Escenas", "Ctrl+6", "Abrir composición"],
    ["Audio", "Ctrl+7", "Abrir mixer"],
    ["Salidas", "Ctrl+8", "Abrir streaming/recording"],
    ["Buscar", "Ctrl+K", "Enfocar el buscador de herramientas"]
  ];
  container.innerHTML = entries.map(([name, key, description]) =>
    '<div class="hotkey-card"><h4>' + esc(name) + '</h4><p>' +
    esc(description) + '</p><kbd>' + esc(key) + '</kbd></div>'
  ).join("");
}

function renderTwitchTriggers() {
  const container = $("#event-triggers");
  if (!container) return;
  const rows = [
    ["Follow", "Acción de bienvenida"],
    ["Subscribe / Gift", "Acción de suscripción"],
    ["Cheer", "Acción de Bits"],
    ["Raid", "Cambio de escena / alert"],
    ["Channel Points", "Acción personalizada"],
    ["Poll / Prediction", "Automatización"],
    ["Hype Train", "Modo evento"],
    ["Ad Break", "Estado comercial"],
    ["Shoutout", "Alert de canal"],
    ["Shield / Moderation", "Protección"],
    ["Stream Online / Offline", "Estado del canal"]
  ];
  container.innerHTML = rows.map(([name, action]) =>
    '<div class="trigger-row"><span>' + esc(name) + '</span><span class="small muted">' +
    esc(action) + '</span></div>'
  ).join("");
}

function obsListItems(target, values, buttonLabel, callback) {
  const container = $(target);
  if (!container) return;
  container.innerHTML = "";
  for (const value of values || []) {
    const row = document.createElement("div");
    row.className = "obs-item";
    const label = typeof value === "string"
      ? value
      : (value.sceneName || value.inputName || value.name || "item");
    const button = document.createElement("button");
    button.textContent = buttonLabel;
    if (callback) button.onclick = () => callback(value);
    row.append(document.createElement("span"), button);
    row.firstChild.textContent = label;
    container.appendChild(row);
  }
  if (!container.children.length) {
    container.innerHTML = '<div class="small muted">Sin datos.</div>';
  }
}

async function refreshObsCenter() {
  const pill = $("#obs-status-pill");
  const current = await window.cari.native.obs.status().catch(() => ({ connected: false }));
  const connected = current?.connected === true;
  if (pill) pill.textContent = connected ? "connected" : "offline";
  if (connected) {
    try {
      const [scenesData, inputsData, statsData, studioData, profilesData, collectionsData] = await Promise.all([
        window.cari.native.obs.scenes(),
        window.cari.native.obs.inputs(),
        window.cari.native.obs.stats(),
        window.cari.native.obs.studioMode(),
        window.cari.native.obs.profiles(),
        window.cari.native.obs.sceneCollections()
      ]);

      const scenes = scenesData?.scenes || [];
      obsListItems("#obs-scenes", scenes, "Program", scene => {
        const name = scene.sceneName || scene.name;
        command(window.cari.native.obs.setScene ? window.cari.native.obs.setScene(name) : Promise.reject(new Error("OBS scene control unavailable")));
      });
      const currentScene = scenesData?.currentProgramSceneName || "—";
      $("#obs-current-scene").textContent = "Program: " + currentScene;

      const inputs = inputsData?.inputs || [];
      obsListItems("#obs-inputs", inputs, "Ver", value => showStatus("OBS input: " + (value.inputName || value.name || "source")));

      const stats = statsData || {};
      $("#obs-stats").textContent = JSON.stringify({
        cpu: stats.cpuUsage,
        fps: stats.activeFps,
        render: stats.renderTotalFrames,
        framesMissed: stats.renderMissedFrames,
        outputSkipped: stats.outputSkippedFrames
      }, null, 2);

      $("#obs-studio-state").textContent =
        studioData?.studioModeEnabled ? "Studio Mode ON" : "Studio Mode OFF";

      const profiles = profilesData?.profiles || [];
      obsListItems("#obs-profiles", profiles, "Usar", value => {
        command(window.cari.native.obs.setProfile(value.profileName || value.name));
      });

      const collections = collectionsData?.sceneCollections || [];
      obsListItems("#obs-collections", collections, "Usar", value => {
        command(window.cari.native.obs.setSceneCollection(value.sceneCollectionName || value.name));
      });
    } catch (error) {
      showStatus("OBS: " + error.message);
    }
  } else {
    $("#obs-scenes").innerHTML = '<div class="small muted">Conectá OBS para cargar escenas.</div>';
    $("#obs-inputs").innerHTML = '<div class="small muted">Conectá OBS para cargar sources.</div>';
    $("#obs-profiles").innerHTML = '<div class="small muted">Conectá OBS para cargar perfiles.</div>';
    $("#obs-collections").innerHTML = '<div class="small muted">Conectá OBS para cargar colecciones.</div>';
    $("#obs-stats").textContent = "offline";
    $("#obs-studio-state").textContent = "offline";
    $("#obs-current-scene").textContent = "Program: —";
  }
}


function addEvent(message) {
  const row = document.createElement("div");
  row.className = "event-line";
  row.textContent = String(message);
  twitch.events.appendChild(row);
  twitch.events.scrollTop = twitch.events.scrollHeight;
}

function addChat(message, outbound = false) {
  const row = document.createElement("div");
  row.className = "chat-line";
  const name = document.createElement("span");
  name.className = "chat-name";
  name.textContent = outbound ? "Cari" : (message.user_name || message.user_login || "viewer");
  row.append(name, document.createTextNode(": " + (message.text || "")));
  twitch.log.appendChild(row);
  twitch.log.scrollTop = twitch.log.scrollHeight;

  const command = String(message.text || "").trim().toLowerCase();
  const map = {
    "!happy": "happy", "!feliz": "happy", "!sad": "sad", "!triste": "sad",
    "!talk": "talking", "!hablar": "talking", "!silent": "silent", "!callar": "silent",
    "!angry": "angry", "!enojada": "angry", "!neutral": "neutral"
  };
  if (map[command]) setActionByIdOrLabel(map[command]);

  if (!outbound && twitchRead && "speechSynthesis" in window) {
    const speech = new SpeechSynthesisUtterance(String(message.text || "").slice(0, 500));
    speech.rate = 1.05;
    speech.pitch = 1.15;
    speechSynthesis.cancel();
    speechSynthesis.speak(speech);
  }
}

function parseStatus(message) {
  return Object.fromEntries(String(message || "").split(";").map(part => {
    const index = part.indexOf("=");
    return index > 0 ? [part.slice(0, index), part.slice(index + 1)] : null;
  }).filter(Boolean).map(([key, value]) => [
    key, /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : value
  ]));
}

function formatBytes(value) {
  const n = Number(value) || 0;
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KiB";
  return (n / 1048576).toFixed(1) + " MiB";
}

function currentAction() {
  return actionStore.get(selectedActionId) || actionStore.list()[0] || null;
}

function stopActionAnimation() {
  if (actionTimer !== null) clearInterval(actionTimer);
  actionTimer = null;
}

function renderActionFrame(action, index = 0) {
  const frames = action?.frames || [];
  frameIndex = frames.length ? Math.max(0, Math.min(index, frames.length - 1)) : 0;
  const frame = frames[frameIndex];

  for (const image of [ui.actionOverlay, ui.editorOverlay]) {
    if (!image) continue;
    if (!frame?.dataUrl) {
      image.removeAttribute("src");
      image.style.display = "none";
      continue;
    }
    image.src = frame.dataUrl;
    image.style.display = "block";
    image.style.opacity = String(action.opacity ?? 1);
    image.style.transform =
      "translate(calc(-50% + " + (action.offsetX ?? 0) +
      "%), calc(-50% + " + (action.offsetY ?? 0) +
      "%)) scale(" + (action.scale ?? 1) + ")";
  }
  renderer.render();
  editorRenderer.render();
}

function playAction(action) {
  stopActionAnimation();
  renderActionFrame(action);
  if (!action || !action.loop || action.frames.length < 2) return;
  let index = 0;
  actionTimer = setInterval(() => {
    index = (index + 1) % action.frames.length;
    renderActionFrame(actionStore.get(action.id) || action, index);
  }, Math.max(80, Number(action.durationMs) || 800));
}

function setAction(id) {
  const action = actionStore.get(id);
  if (!action) return;
  selectedActionId = action.id;
  acting.set({
    expression: ["neutral", "happy", "angry"].includes(action.expression)
      ? action.expression : "neutral",
    mouthOpen: Number(action.mouthOpen) || 0
  });
  ui.previewAction.textContent = action.label;
  ui.editorTitle.textContent = action.label;
  ui.workspace.textContent = "Acción: " + action.label;
  playAction(action);
  renderActionGrid();
  renderActionInspector();
  renderLiveActions();
}

function setActionByIdOrLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const found = actionStore.list().find(action =>
    action.id === value || action.label.toLowerCase() === normalized
  );
  if (found) setAction(found.id);
}

function renderActionGrid() {
  ui.actionGrid.innerHTML = "";
  actionStore.list().forEach(action => {
    const card = document.createElement("div");
    card.className = "action-card" + (action.id === selectedActionId ? " selected" : "");
    const icon = document.createElement("div");
    icon.className = "action-icon";
    icon.textContent = action.icon || "+";
    const name = document.createElement("div");
    name.className = "action-name";
    name.textContent = action.label;
    const count = document.createElement("div");
    count.className = "action-count";
    count.textContent = action.frames.length + (action.frames.length === 1 ? " imagen" : " imágenes");
    card.append(icon, name, count);
    card.onclick = () => setAction(action.id);
    ui.actionGrid.appendChild(card);
  });

  const add = document.createElement("div");
  add.className = "action-card add-card";
  add.innerHTML = '<div><div style="font-size:30px;text-align:center">＋</div><div class="action-name">Nueva acción</div><div class="action-count">Agregar pose o estado</div></div>';
  add.onclick = addAction;
  ui.actionGrid.appendChild(add);
}

function renderActionInspector() {
  const action = currentAction();
  if (!action) {
    ui.inspector.innerHTML = '<div class="inspector-empty">Creá una acción con ＋.</div>';
    return;
  }

  ui.editorTitle.textContent = action.label;
  ui.editorFrames.textContent = action.frames.length + (action.frames.length === 1 ? " imagen" : " imágenes");
  ui.inspector.innerHTML =
    '<div class="form-row"><label>Nombre</label><input id="action-name" maxlength="48" value="' + esc(action.label) + '"></div>' +
    '<div class="form-grid">' +
    '<div class="form-row"><label>Icono</label><input id="action-icon" maxlength="4" value="' + esc(action.icon) + '"></div>' +
    '<div class="form-row"><label>Expresión base</label><select id="action-expression">' +
    opt("neutral", action.expression) + opt("happy", action.expression) + opt("angry", action.expression) +
    '</select></div></div>' +
    '<div class="form-grid">' +
    '<div class="form-row"><label>Frame (ms)</label><input id="action-duration" type="number" min="80" max="10000" value="' + Number(action.durationMs) + '"></div>' +
    '<div class="form-row"><label>Boca (0–1)</label><input id="action-mouth" type="number" min="0" max="1" step="0.05" value="' + Number(action.mouthOpen) + '"></div></div>' +
    '<div class="inline"><input id="action-loop" type="checkbox" ' + (action.loop ? "checked" : "") + '><span class="small">Repetir frames</span></div>' +
    '<div class="form-grid" style="margin-top:10px">' +
    '<div class="form-row"><label>Escala</label><input id="action-scale" type="number" min="0.1" max="3" step="0.05" value="' + Number(action.scale) + '"></div>' +
    '<div class="form-row"><label>Opacidad</label><input id="action-opacity" type="number" min="0" max="1" step="0.05" value="' + Number(action.opacity) + '"></div>' +
    '<div class="form-row"><label>Offset X (%)</label><input id="action-x" type="number" min="-50" max="50" value="' + Number(action.offsetX) + '"></div>' +
    '<div class="form-row"><label>Offset Y (%)</label><input id="action-y" type="number" min="-50" max="50" value="' + Number(action.offsetY) + '"></div></div>' +
    '<div class="dropzone" id="action-dropzone"><strong>Arrastrá PNG/JPG/WebP</strong><div class="small muted" style="margin-top:4px">o añadí varias imágenes</div><button id="action-add-images" class="primary" style="margin-top:9px">＋ Añadir imágenes</button></div>';

  const frameList = document.createElement("div");
  frameList.className = "frame-list";
  frameList.style.marginTop = "10px";

  if (!action.frames.length) {
    frameList.innerHTML = '<div class="inspector-empty">Sin imágenes. Agregá PNG/JPG/WebP para esta acción.</div>';
  } else {
    action.frames.forEach((frame, index) => {
      const item = document.createElement("div");
      item.className = "frame-item";
      const image = document.createElement("img");
      image.className = "frame-thumb";
      image.src = frame.dataUrl;
      const info = document.createElement("div");
      info.innerHTML = '<div class="frame-name">' + esc(frame.name) + '</div><div class="small muted">Frame ' + (index + 1) + ' · ' + formatBytes(frame.size) + '</div>';
      const controls = document.createElement("div");
      controls.className = "frame-actions";

      [["↑", -1], ["↓", 1]].forEach(([label, direction]) => {
        const button = document.createElement("button");
        button.textContent = label;
        button.onclick = event => { event.stopPropagation(); moveFrame(frame.id, direction); };
        controls.appendChild(button);
      });

      const remove = document.createElement("button");
      remove.textContent = "×";
      remove.onclick = event => { event.stopPropagation(); removeFrame(frame.id); };
      controls.appendChild(remove);

      item.append(image, info, controls);
      item.onclick = () => renderActionFrame(action, index);
      frameList.appendChild(item);
    });
  }

  const frameCard = document.createElement("div");
  frameCard.className = "card";
  frameCard.style.margin = "10px 0 0";
  frameCard.innerHTML = '<div class="section-title"><h3>Frames</h3><span class="small muted">máx. 24</span></div>';
  frameCard.appendChild(frameList);
  ui.inspector.appendChild(frameCard);

  const buttons = document.createElement("div");
  buttons.className = "toolbar";
  buttons.style.marginTop = "10px";

  const duplicate = document.createElement("button");
  duplicate.textContent = "Duplicar";
  duplicate.onclick = () => {
    const copy = actionStore.duplicate(action.id);
    if (copy) setAction(copy.id);
  };

  const remove = document.createElement("button");
  remove.className = "danger";
  remove.textContent = "Eliminar";
  remove.onclick = () => {
    if (!actionStore.remove(action.id)) return showStatus("Debe quedar al menos una acción");
    selectedActionId = actionStore.list()[0]?.id || null;
    setAction(selectedActionId);
  };

  buttons.append(duplicate, remove);
  ui.inspector.appendChild(buttons);

  const fields = [
    ["#action-name", "label", value => value],
    ["#action-icon", "icon", value => value],
    ["#action-expression", "expression", value => value],
    ["#action-duration", "durationMs", Number],
    ["#action-mouth", "mouthOpen", Number],
    ["#action-scale", "scale", Number],
    ["#action-opacity", "opacity", Number],
    ["#action-x", "offsetX", Number],
    ["#action-y", "offsetY", Number]
  ];
  fields.forEach(([selector, key, convert]) => {
    const field = $(selector);
    field.onchange = () => {
      actionStore.update(action.id, { [key]: convert(field.value) });
      setAction(action.id);
    };
  });

  $("#action-loop").onchange = event => {
    actionStore.update(action.id, { loop: event.target.checked });
    playAction(actionStore.get(action.id));
  };

  $("#action-add-images").onclick = () => ui.fileInput.click();
  const dropzone = $("#action-dropzone");
  dropzone.ondragover = event => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  };
  dropzone.ondragleave = () => dropzone.classList.remove("dragover");
  dropzone.ondrop = event => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
    addFiles([...event.dataTransfer.files]);
  };
}

function addFiles(files) {
  const id = selectedActionId;
  (async () => {
    for (const file of files) {
      try {
        await actionStore.addFrame(id, file);
      } catch (error) {
        addEvent("Asset rechazado: " + error.message);
      }
    }
    setAction(id);
    renderAssets();
    showStatus("Imágenes agregadas a " + (actionStore.get(id)?.label || "acción"));
  })();
}

function removeFrame(frameId) {
  if (actionStore.removeFrame(selectedActionId, frameId)) {
    setAction(selectedActionId);
    renderAssets();
  }
}

function moveFrame(frameId, direction) {
  if (actionStore.moveFrame(selectedActionId, frameId, direction)) {
    setAction(selectedActionId);
  }
}

function addAction() {
  const action = actionStore.add("Nueva acción");
  selectedActionId = action.id;
  switchView("vtuber");
  setAction(action.id);
  showStatus("Acción creada. Poné el nombre y agregá sus PNG.");
}

function renderLiveActions() {
  ui.liveActions.innerHTML = "";
  actionStore.list().forEach(action => {
    const button = document.createElement("button");
    button.textContent = action.label;
    if (action.id === selectedActionId) button.className = "primary";
    button.onclick = () => setAction(action.id);
    ui.liveActions.appendChild(button);
  });
  const add = document.createElement("button");
  add.textContent = "＋";
  add.onclick = addAction;
  ui.liveActions.appendChild(add);
}

function renderAssets() {
  const list = actionStore.list();
  const total = list.reduce((sum, action) => sum + action.frames.length, 0);
  ui.assets.innerHTML =
    '<div class="stat-row">' +
    stat("Acciones", list.length) + stat("Imágenes", total) +
    stat("Activa", currentAction()?.label || "—") + stat("Guardado", "Local") +
    '</div>';

  list.forEach(action => {
    const row = document.createElement("div");
    row.className = "list-card";
    row.style.marginTop = "8px";
    row.innerHTML = '<span><b>' + esc(action.label) + '</b> <span class="small muted">' +
      action.frames.length + ' frame(s)</span></span>';
    const button = document.createElement("button");
    button.textContent = "Editar";
    button.onclick = () => { setAction(action.id); switchView("vtuber"); };
    row.appendChild(button);
    ui.assets.appendChild(row);
  });
}

function renderScenes() {
  ui.scenes.innerHTML = "";
  scenes.forEach(scene => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = '<div class="section-title"><h3>' + esc(scene.name) +
      '</h3><span class="pill">scene</span></div><div class="small muted">' +
      esc(scene.description) + '</div>';
    const toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    toolbar.style.marginTop = "9px";
    const activate = document.createElement("button");
    activate.className = "primary";
    activate.textContent = "Activar";
    activate.onclick = () => setActionByIdOrLabel(scene.action);
    toolbar.appendChild(activate);
    card.appendChild(toolbar);
    ui.scenes.appendChild(card);
  });
}

function stat(label, value) {
  return '<div class="stat"><div class="label">' + esc(label) + '</div><div class="value">' + esc(value) + '</div></div>';
}

function opt(value, selected) {
  return '<option value="' + value + '"' + (value === selected ? " selected" : "") + '>' + value + '</option>';
}

function esc(value) {
  return String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function switchView(view) {
  document.querySelectorAll(".nav-item").forEach(button =>
    button.classList.toggle("active", button.dataset.view === view)
  );
  document.querySelectorAll("[data-view-panel]").forEach(panel =>
    panel.classList.toggle("active", panel.dataset.viewPanel === view)
  );
  const item = STUDIO_MENU.find(entry => entry.id === view);
  ui.workspace.textContent = item ? item.label : ("Workspace: " + view);

  if (view === "vtuber") {
    renderActionGrid();
    renderActionInspector();
  } else if (view === "assets") {
    renderAssets();
  } else if (view === "scenes") {
    renderScenes();
  } else if (view === "expressions") {
    renderExpressionPanel();
  } else if (view === "twitch-center") {
    renderCapabilityCatalog("#twitch-capabilities", CAPABILITIES.twitch);
    renderTwitchTriggers();
  } else if (view === "obs-center") {
    renderCapabilityCatalog("#obs-capabilities", CAPABILITIES.obs);
    refreshObsCenter();
  } else if (view === "hotkeys") {
    renderHotkeys();
  }
}

async function startCamera() {
  if (cameraStream) return;
  cameraStream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 60 } },
    audio: false
  });
  ui.camera.srcObject = cameraStream;
  if (ui.trackingCamera) ui.trackingCamera.srcObject = cameraStream;
  await ui.camera.play();
  if (ui.trackingCamera) await ui.trackingCamera.play();
  ui.tracking.textContent = "camera active";
  ui.trackingBadge.textContent = "camera active";
  const config = await window.cari.config();
  if (!config.mediaPipeModelPath) return;
  faceTracker?.close();
  faceTracker = new FaceTracker({ modelPath: config.mediaPipeModelPath });
  await faceTracker.init();
  tracking.setEnabled(true);
  ui.tracking.textContent = "camera + MediaPipe";
  ui.trackingBadge.textContent = "camera + MediaPipe";
  $("#tracking-status").textContent = "MediaPipe";
}

function stopCamera() {
  if (!cameraStream) return;
  cameraStream.getTracks().forEach(track => track.stop());
  ui.camera.srcObject = null;
  if (ui.trackingCamera) ui.trackingCamera.srcObject = null;
  cameraStream = null;
  tracking.setEnabled(false);
  faceTracker?.close();
  faceTracker = null;
  ui.tracking.textContent = "tracking idle";
  ui.trackingBadge.textContent = "tracking idle";
  $("#tracking-status").textContent = "idle";
}

function trackingLoop(timestamp) {
  requestAnimationFrame(trackingLoop);
  if (!faceTracker || !cameraStream || ui.camera.readyState < 2) return;
  const result = faceTracker.detect(ui.camera, timestamp);
  if (result) tracking.apply(result);
}

acting.subscribe(state => {
  const params = acting.toRenderParameters();
  renderer.apply(params);
  editorRenderer.apply(params);
  settingsRenderer.apply(params);
  renderer.render();
  editorRenderer.render();
  settingsRenderer.render();
  window.cari.native.avatar.setState(params).catch(() => undefined);
  ui.previewAction.textContent = currentAction()?.label || state.expression;
  $("#track-head-x").textContent = Number(state.head?.x ?? 0).toFixed(2);
  $("#track-head-y").textContent = Number(state.head?.y ?? 0).toFixed(2);
  $("#track-roll").textContent = Number(state.head?.z ?? 0).toFixed(2);
  $("#track-gaze-x").textContent = Number(state.gaze?.x ?? 0).toFixed(2);
  $("#track-gaze-y").textContent = Number(state.gaze?.y ?? 0).toFixed(2);
  $("#track-mouth").textContent = Number(state.mouthOpen ?? 0).toFixed(2);
  $("#track-blink").textContent = Number(state.blink ?? 0).toFixed(2);
  $("#track-expression").textContent = state.expression || "neutral";});

window.cari.native.onEvent(event => {
  if (event.type === "integration.health") {
    const obsState = event.obs || {};
    const twitchState = event.twitch || {};
    const obsLabel = obsState.connected
      ? "connected"
      : (obsState.processDetected ? "open · not connected" : "offline");
    $("#service-obs-text").textContent = obsLabel;
    $("#obs-status-pill").textContent = obsLabel;
    $("#obs-chip").innerHTML = "OBS <b>" +
      (obsState.connected ? "ON" : (obsState.processDetected ? "OPEN" : "OFF")) +
      "</b>";
    $("#service-obs-dot").classList.toggle(
      "on",
      obsState.connected || obsState.processDetected
    );

    const twitchLabel = twitchState.connected
      ? (twitchState.streamOnline ? "connected · live" : "connected · offline")
      : "offline";
    twitch.status.textContent = twitchLabel;
    $("#twitch-center-status").textContent = twitchLabel;
    $("#service-twitch-text").textContent = twitchLabel;
    $("#service-twitch-dot").classList.toggle("on", twitchState.connected);
    return;
  }
  if (event.type === "twitch.chat") {
    addChat(event);
    addEvent("chat ← " + (event.user_name || event.user_login || "viewer"));
    return;
  }
  if (event.type === "twitch.chat.sent") { addChat(event, true); return; }
  if (event.type === "twitch.status") {
    const label = event.connected
      ? (event.streamOnline ? "Connected · live" : "Connected · offline")
      : "Disconnected";
    twitch.status.textContent = label;
    const center = $("#twitch-center-status");
    if (center) center.textContent = event.connected
      ? (event.streamOnline ? "connected · live" : "connected · offline")
      : "offline";
    return;
  }
  if (event.type === "twitch.eventsub.welcome") { addEvent("EventSub connected"); return; }
  if (event.type === "twitch.eventsub.keepalive") { addEvent("EventSub keepalive"); return; }
  if (event.type === "twitch.eventsub.reconnect") { addEvent("EventSub reconnecting"); return; }
  if (event.type === "obs.status") {
    const connected = event.connected === true;
    $("#service-obs-text").textContent = connected ? "connected" : "offline";
    $("#obs-status-pill").textContent = connected ? "connected" : "offline";
    $("#obs-chip").innerHTML = "OBS <b>" + (connected ? "ON" : "OFF") + "</b>";
    $("#service-obs-dot").classList.toggle("on", connected);
    return;
  }
  if (event.type === "obs.event") {
    const data = event.data || {};
    const type = String(event.type || "OBS");
    const labelMap = {
      StreamStateChanged: data.outputActive ? "OBS stream: ON" : "OBS stream: OFF",
      RecordStateChanged: data.outputActive ? "OBS recording: ON" : "OBS recording: OFF",
      VirtualcamStateChanged: data.outputActive ? "OBS virtual camera: ON" : "OBS virtual camera: OFF",
      CurrentProgramSceneChanged: "OBS program: " + (data.sceneName || "—"),
      CurrentPreviewSceneChanged: "OBS preview: " + (data.sceneName || "—"),
      StudioModeStateChanged: data.studioModeEnabled ? "OBS Studio Mode: ON" : "OBS Studio Mode: OFF"
    };
    addEvent(labelMap[type] || "OBS event: " + type);
    if (type === "CurrentProgramSceneChanged" && data.sceneName) {
      $("#obs-current-scene").textContent = "Program: " + data.sceneName;
    }
    if (type === "StudioModeStateChanged") {
      $("#obs-studio-state").textContent = data.studioModeEnabled ? "Studio Mode ON" : "Studio Mode OFF";
    }
    return;
  }
  if (event.type === "twitch.event") {
    const type = String(event.eventType || event.typeName || "unknown");
    const payload = event.payload || {};
    const viewer = payload.user_name || payload.user_login || payload.from_broadcaster_user_name || "";
    addEvent("Twitch event: " + type + (viewer ? " · " + viewer : ""));
    const actionByEvent = {
      "channel.raid": "happy",
      "stream.online": "happy",
      "stream.offline": "silent",
      "channel.update": "neutral",
      "channel.shared_chat.begin": "happy",
      "channel.shared_chat.update": "talking",
      "channel.shared_chat.end": "neutral"
    };
    const action = actionByEvent[type];
    if (action) setActionByIdOrLabel(action);
    if (twitchRead && "speechSynthesis" in window && action) {
      const names = {
        "channel.raid": "¡Raid recibido!",
        "stream.online": "El stream está en línea.",
        "stream.offline": "El stream terminó.",
        "channel.update": payload.title ? "Canal actualizado: " + payload.title : "Canal actualizado.",
        "channel.shared_chat.begin": "Shared Chat iniciado.",
        "channel.shared_chat.update": "Shared Chat actualizado.",
        "channel.shared_chat.end": "Shared Chat terminado."
      };
      const speech = new SpeechSynthesisUtterance(names[type] || "Evento de Twitch.");
      speech.rate = 1.05;
      speech.pitch = 1.15;
      speechSynthesis.cancel();
      speechSynthesis.speak(speech);
    }
    return;
  }
  if (event.type === "twitch.error") { addEvent("Twitch error: " + event.message); return; }
  session.handleNativeEvent(event);
  if (event.type === "error") showStatus("Native error: " + event.message);
});

async function command(action) {
  try {
    const result = await action;
    showStatus(result?.ok === false ? (result.error || "Command failed") : (result?.message || "OK"));
    return result;
  } catch (error) {
    showStatus(error.message);
    return { ok: false, error: error.message };
  }
}

$("#header-start").onclick = async () => {
  if (session.snapshot().engine) { await session.stop(); stopCamera(); }
  else await session.start();
  await refresh();
};
$("#live-record").onclick = () => command(session.outputStart("local-record"));
$("#live-stream").onclick = () => command(session.outputStart("rtmp", $("#rtmp-target").value.trim()));
$("#capture-window").onclick = () => {
  const value = Number.parseInt($("#window-index").value, 10);
  command(session.captureStart("window", value - 1));
};
$("#capture-screen").onclick = () => command(session.captureStart("screen"));
$("#capture-stop").onclick = () => command(session.captureStop());
$("#stream-start").onclick = () => command(session.outputStart("rtmp", $("#rtmp-target").value.trim()));
$("#stream-stop").onclick = () => command(session.outputStop());
$("#record").onclick = () => command(session.outputStart("local-record"));
$("#voice-off").onclick = () => command(session.setVoiceEffect("off"));
$("#voice-anime").onclick = () => command(session.setVoiceEffect("anime-bright"));
$("#camera-start").onclick = () => startCamera().catch(error => showStatus("Camera: " + error.message));
$("#camera-stop").onclick = stopCamera;

$("#model-pick").onclick = async () => {
  try {
    const result = await window.cari.native.avatar.chooseModel();
    if (result?.canceled) return;
    const source = result.dataUrl || result.url;
    await renderer.load(source);
    await editorRenderer.load(source);
    await settingsRenderer.load(source);
    ui.model.textContent = result.name || "GLB avatar";
    $("#model-side").textContent = result.name || "GLB avatar";
    showStatus("Avatar cargado");
  } catch (error) {
    showStatus("Avatar: " + error.message);
  }
};

$("#overlay-show").onclick = () => window.cari.native.avatar.overlay.show();
$("#overlay-hide").onclick = () => window.cari.native.avatar.overlay.hide();

$("#obs-connect").onclick = () => command(window.cari.native.obs.connect({}));
$("#obs-start").onclick = () => command(window.cari.native.obs.startStream());
$("#obs-stop").onclick = () => command(window.cari.native.obs.stopStream());

$("#twitch-connect").onclick = async () => {
  localStorage.setItem("cari.twitch.clientId", twitch.clientId.value.trim());
  localStorage.setItem("cari.twitch.channel", twitch.channel.value.trim());
  await command(window.cari.native.twitch.connect({
    clientId: twitch.clientId.value.trim(),
    channel: twitch.channel.value.trim()
  }));
};
$("#twitch-disconnect").onclick = () => command(window.cari.native.twitch.disconnect());
$("#chat-send").onclick = async () => {
  const message = twitch.input.value.trim();
  if (!message) return;
  await command(window.cari.native.twitch.sendChat(message));
  twitch.input.value = "";
};
twitch.input.onkeydown = event => {
  if (event.key === "Enter") { event.preventDefault(); $("#chat-send").click(); }
};
$("#chat-read").onclick = () => {
  twitchRead = !twitchRead;
  twitch.read.textContent = "Leer chat: " + (twitchRead ? "On" : "Off");
};

$("#action-add").onclick = addAction;
$("#action-import").onclick = () => ui.presetInput.click();
$("#action-export").onclick = () => {
  const blob = new Blob([actionStore.exportJson()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "cari-actions.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  showStatus("Preset exportado");
};
ui.fileInput.onchange = event => { addFiles([...event.target.files]); event.target.value = ""; };
ui.presetInput.onchange = async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    actionStore.importJson(await file.text());
    selectedActionId = actionStore.list()[0]?.id || null;
    setAction(selectedActionId);
    renderAssets();
    showStatus("Preset importado");
  } catch (error) {
    showStatus("Preset inválido: " + error.message);
  }
  event.target.value = "";
};

$("#scene-transition-apply").onclick = () => {
  showStatus("Transición " + $("#scene-transition").value + " · " +
    $("#scene-transition-duration").value + " ms preparada para la escena activa");
};
$("#scene-add").onclick = () => {
  scenes.push({
    id: "scene-" + Date.now(),
    name: "Nueva escena",
    description: "Escena creada desde Cari Studio",
    action: selectedActionId
  });
  saveScenes();
  renderScenes();
};

$("#goto-vtuber").onclick = () => switchView("vtuber");
$("#assets-open-editor").onclick = () => switchView("vtuber");
document.querySelectorAll("[data-quick-action]").forEach(button =>
  button.onclick = () => setActionByIdOrLabel(button.dataset.quickAction)
);
renderNavigation();
renderCapabilityCatalog("#twitch-capabilities", CAPABILITIES.twitch);
renderCapabilityCatalog("#obs-capabilities", CAPABILITIES.obs);
renderExpressionPanel();
renderHotkeys();
renderTwitchTriggers();

document.querySelectorAll("[data-nav-target]").forEach(button => {
  button.onclick = () => switchView(button.dataset.navTarget);
});

ui.menuSearch.oninput = () => {
  const query = ui.menuSearch.value.trim().toLowerCase();
  document.querySelectorAll(".nav-item").forEach(button => {
    const item = STUDIO_MENU.find(entry => entry.id === button.dataset.view);
    const haystack = [item?.label, item?.description, item?.group].join(" ").toLowerCase();
    button.classList.toggle("nav-hidden", Boolean(query) && !haystack.includes(query));
  });
};

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    ui.menuSearch.focus();
    ui.menuSearch.select();
    return;
  }
  if (!event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
  const map = {
    "1": "live", "2": "vtuber", "3": "twitch-center", "4": "obs-center",
    "5": "tracking", "6": "scenes", "7": "audio", "8": "outputs"
  };
  const target = map[event.key];
  if (target) {
    event.preventDefault();
    switchView(target);
  }
});


$("#obs-disconnect").onclick = () => command(window.cari.native.obs.disconnect());
$("#obs-record-start").onclick = () => command(window.cari.native.obs.startRecord());
$("#obs-record-stop").onclick = () => command(window.cari.native.obs.stopRecord());
$("#obs-vcam-start").onclick = () => command(window.cari.native.obs.startVirtualCamera());
$("#obs-vcam-stop").onclick = () => command(window.cari.native.obs.stopVirtualCamera());
$("#obs-refresh-scenes").onclick = refreshObsCenter;
$("#obs-refresh-inputs").onclick = refreshObsCenter;
$("#obs-refresh-stats").onclick = refreshObsCenter;
$("#obs-refresh-studio").onclick = refreshObsCenter;
$("#obs-transition").onclick = () => command(window.cari.native.obs.transition());
$("#obs-refresh-scenes").ondblclick = refreshObsCenter;

$("#twitch-center-connect").onclick = async () => {
  const current = await window.cari.native.twitch.status().catch(() => ({ connected: false }));
  if (current.connected) {
    await command(window.cari.native.twitch.disconnect());
    return;
  }
  switchView("chat");
  await command(window.cari.native.twitch.connect({
    clientId: twitch.clientId.value.trim(),
    channel: twitch.channel.value.trim()
  }));
};

$("#source-screen").onclick = () => command(session.captureStart("screen"));
$("#source-window").onclick = () => {
  const value = Number.parseInt($("#window-index").value, 10);
  command(session.captureStart("window", value - 1));
};
$("#source-camera").onclick = () => startCamera().catch(error => showStatus("Camera: " + error.message));

$("#audio-start").onclick = () => command(session.audioStart ? session.audioStart() : window.cari.native.send({ type: "audio.start" }));
$("#audio-stop").onclick = () => command(session.audioStop ? session.audioStop() : window.cari.native.send({ type: "audio.stop" }));
$("#voice-anime-2").onclick = () => command(session.setVoiceEffect("anime-bright"));
$("#voice-off-2").onclick = () => command(session.setVoiceEffect("off"));
$("#voice-anime-3").onclick = () => command(session.setVoiceEffect("anime-bright"));

$("#tracking-camera-start").onclick = () => startCamera().catch(error => showStatus("Camera: " + error.message));
$("#tracking-camera-stop").onclick = stopCamera;

$("#output-record").onclick = () => command(session.outputStart("local-record"));
$("#output-rtmp").onclick = () => command(session.outputStart("rtmp", $("#rtmp-target-2").value.trim()));
$("#output-stop").onclick = () => command(session.outputStop());

$("#model-pick-side").onclick = () => $("#model-pick").click();
$("#overlay-show-side").onclick = () => command(window.cari.native.avatar.overlay.show());
$("#overlay-hide-side").onclick = () => command(window.cari.native.avatar.overlay.hide());

twitch.clientId.value = localStorage.getItem("cari.twitch.clientId") || "";
twitch.channel.value = localStorage.getItem("cari.twitch.channel") || "";

renderScenes();
renderAssets();
renderActionGrid();
renderActionInspector();
renderLiveActions();
setAction(selectedActionId);
trackingLoop(performance.now());
refresh().catch(() => undefined);
setInterval(() => refresh().catch(() => undefined), 500);

async function refresh() {
  if (refreshBusy) return;
  refreshBusy = true;
  try {
    const result = await session.status();
    const health = await window.cari.native.integrations.status().catch(() => ({ obs: { connected: false, processDetected: false, runtime: {} }, twitch: { connected: false } }));
    const twitchState = health.twitch || { connected: false };
    const obsState = health.obs || { connected: false, processDetected: false, runtime: {} };
    const engineOn = result.engine?.running === true;
    $("#engine-chip").innerHTML = "ENGINE <b>" + (engineOn ? "ON" : "OFF") + "</b>";
    $("#twitch-chip").innerHTML = "TWITCH <b>" + (twitchState.connected ? "ON" : "OFF") + "</b>";
    $("#twitch-center-status").textContent = twitchState.connected
      ? (twitchState.streamOnline ? "connected · live" : "connected · offline")
      : "offline";
    const obsLabel = obsState.connected
      ? "connected"
      : (obsState.processDetected ? "open · not connected" : "offline");
    $("#obs-chip").innerHTML = "OBS <b>" + (obsState.connected ? "ON" : (obsState.processDetected ? "OPEN" : "OFF")) + "</b>";
    $("#dash-twitch").textContent = twitchState.connected
      ? (twitchState.streamOnline ? "connected · live" : "connected · offline")
      : "offline";
    $("#dash-obs").textContent = obsLabel;
    $("#service-twitch-text").textContent = twitchState.connected
      ? (twitchState.streamOnline ? "connected · live" : "connected")
      : "offline";
    $("#service-obs-text").textContent = obsLabel;
    $("#service-engine-text").textContent = engineOn ? "running" : "offline";
    $("#service-twitch-dot").classList.toggle("on", twitchState.connected);
    $("#service-obs-dot").classList.toggle("on", obsState.connected || obsState.processDetected);
    $("#service-engine-dot").classList.toggle("on", engineOn);
    ui.engine.textContent = result.engine?.running ? "running (" + result.engine.pid + ")" : "offline";
    ui.dashEngine.textContent = ui.engine.textContent;

    if (!result.engine?.running || result.native?.ok !== true) {
      ui.metrics.textContent = "native engine offline";
      ui.sideDiagnostics.textContent = result.native?.error || "Motor nativo offline";
      return;
    }

    const metrics = parseStatus(result.native.message);
    lipSync.update(metrics.audio_level ?? 0);
    ui.liveState.innerHTML = '<span class="dot"></span><span>' + (metrics.output === "running" ? "LIVE" : "OFFLINE") + "</span>";
    ui.fps.textContent = Number(metrics.fps ?? 0).toFixed(1);
    ui.audio.textContent = String(metrics.audio_packets ?? 0);
    const peak = Math.max(0, Math.min(1, Number(metrics.audio_peak ?? 0)));
    $("#mix-mic").style.width = (peak * 100).toFixed(1) + "%";
    $("#mix-mic-label").textContent = Math.round(peak * 100) + "%";
    $("#mix-system").style.width = Math.min(100, peak * 70).toFixed(1) + "%";
    $("#mix-system-label").textContent = Math.round(peak * 70) + "%";    ui.output.textContent = metrics.output === "running" ? "LIVE" : "stopped";
    $("#side-output-state").textContent = metrics.output_state || metrics.output || "offline";
    $("#output-resilience").textContent =
      "Retry " + (metrics.output_retry_attempts ?? 0) +
      " · " + (metrics.output_retry_pending ? "pending" : "idle") +
      " · " + (metrics.output_failure_category || "none");
    $("#dash-failure").textContent = metrics.output_failure_category || "none";
    ui.capture.textContent = metrics.capture || "stopped";
    ui.dashCapture.textContent = metrics.capture || "stopped";
    ui.dashAudio.textContent = metrics.audio_packets ? "running" : "stopped";
    ui.dashOutput.textContent = metrics.output === "running" ? "LIVE" : "stopped";

    const text =
      "Capture " + (metrics.frames ?? 0) + " @ " + Number(metrics.fps ?? 0).toFixed(1) + " FPS · " +
      "Audio " + (metrics.audio_packets ?? 0) + " · " +
      "Output " + (metrics.output_state ?? "unknown") + " (" + (metrics.output_exit_code ?? 0) + ") · " +
      "Retry " + (metrics.output_retry_attempts ?? 0) + " " + (metrics.output_retry_pending ? "pending" : "idle") + " · " +
      "Failure " + (metrics.output_failure_category ?? "none") + " · " +
      "Drops V/A " + (metrics.video_dropped ?? 0) + "/" + (metrics.audio_dropped ?? 0) + " · " +
      "Late V/A " + (metrics.video_dropped_late ?? 0) + "/" + (metrics.audio_late ?? 0) + " · " +
      "Pacing " + (metrics.pacing_budget_exhausted ?? 0) + " · " +
      "Video " + formatBytes(metrics.video_bytes) + " · Audio " + formatBytes(metrics.audio_bytes);
    ui.metrics.textContent = text;
    ui.sideDiagnostics.textContent = text;
  } finally {
    refreshBusy = false;
  }
}
