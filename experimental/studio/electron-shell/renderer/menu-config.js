export const STUDIO_MENU = [
  {
    id: "live",
    group: "Studio",
    label: "En vivo",
    icon: "●",
    description: "Preview, salida y controles rápidos"
  },
  {
    id: "dashboard",
    group: "Studio",
    label: "Panel",
    icon: "▦",
    description: "Estado global y métricas"
  },
  {
    id: "scenes",
    group: "Producción",
    label: "Escenas",
    icon: "▤",
    description: "Layouts, transiciones y composición"
  },
  {
    id: "sources",
    group: "Producción",
    label: "Fuentes",
    icon: "◫",
    description: "Pantalla, ventana, cámara, media y overlays"
  },
  {
    id: "audio",
    group: "Producción",
    label: "Audio",
    icon: "◉",
    description: "Mixer, voz, rutas y monitoreo"
  },
  {
    id: "outputs",
    group: "Producción",
    label: "Salidas",
    icon: "↗",
    description: "Grabar, RTMP y estado del encoder"
  },
  {
    id: "vtuber",
    group: "VTuber",
    label: "Editor",
    icon: "✦",
    description: "Acciones, poses, frames y presets"
  },
  {
    id: "tracking",
    group: "VTuber",
    label: "Tracking",
    icon: "◎",
    description: "Cámara, rostro, mirada y boca"
  },
  {
    id: "avatar",
    group: "VTuber",
    label: "Avatar",
    icon: "◇",
    description: "Modelos 3D y backends de render"
  },
  {
    id: "expressions",
    group: "VTuber",
    label: "Expresiones",
    icon: "☺",
    description: "Estados, hotkeys y actuación"
  },
  {
    id: "assets",
    group: "VTuber",
    label: "Assets",
    icon: "▧",
    description: "Biblioteca local de recursos"
  },
  {
    id: "chat",
    group: "Twitch",
    label: "Chat",
    icon: "☷",
    description: "Mensajes, TTS y comandos"
  },
  {
    id: "twitch-center",
    group: "Twitch",
    label: "Centro Twitch",
    icon: "♢",
    description: "Canal, eventos, puntos y moderación"
  },
  {
    id: "events",
    group: "Twitch",
    label: "Eventos",
    icon: "⚡",
    description: "EventSub y automatizaciones"
  },
  {
    id: "obs-center",
    group: "OBS",
    label: "Centro OBS",
    icon: "◈",
    description: "Escenas, fuentes, outputs y control"
  },
  {
    id: "hotkeys",
    group: "Automatización",
    label: "Hotkeys",
    icon: "⌘",
    description: "Atajos y acciones rápidas"
  },
  {
    id: "settings",
    group: "Sistema",
    label: "Configuración",
    icon: "⚙",
    description: "Runtime, conexiones y privacidad"
  }
];

export const CAPABILITIES = {
  twitch: [
    ["Chat", "channel.chat.message", "connected"],
    ["Follow", "channel.follow", "eventsub"],
    ["Suscripciones", "channel.subscribe / gift / message / end", "eventsub"],
    ["Cheers", "channel.cheer", "eventsub"],
    ["Raids", "channel.raid", "eventsub"],
    ["Channel Points", "custom + automatic rewards/redemptions", "eventsub"],
    ["Polls", "begin / progress / end", "eventsub"],
    ["Predictions", "begin / progress / lock / end", "eventsub"],
    ["Hype Train", "begin / progress / end", "eventsub"],
    ["Ads", "ad break + schedule/commercial controls", "prepared"],
    ["Schedule", "read / manage stream schedule", "prepared"],
    ["Moderation", "ban / delete / chat settings / shield", "prepared"],
    ["VIP / Mods", "manage roles", "prepared"],
    ["Shoutouts", "create / receive", "eventsub"],
    ["Suspicious Users", "message / update", "eventsub"],
    ["Shared Chat", "begin / update / end", "eventsub"],
    ["Guest Star", "session / guest / settings events", "eventsub"],
    ["Power-ups", "custom power-up redemption", "eventsub"],
    ["Stream lifecycle", "online / offline / channel update", "eventsub"]
  ],
  obs: [
    ["Streaming", "StartStream / StopStream / status", "connected"],
    ["Recording", "StartRecord / StopRecord / status", "prepared"],
    ["Scenes", "list / current program / preview", "prepared"],
    ["Sources", "inputs / kinds / settings", "prepared"],
    ["Scene items", "visibility / transform / order", "prepared"],
    ["Filters", "list / settings", "prepared"],
    ["Transitions", "list / current / override", "prepared"],
    ["Profiles", "profiles / switch", "prepared"],
    ["Scene Collections", "list / switch", "prepared"],
    ["Virtual Camera", "start / stop / status", "prepared"],
    ["Studio Mode", "program / preview / transition", "prepared"],
    ["Hotkeys", "trigger by name", "prepared"],
    ["Stats", "CPU / FPS / render / output", "prepared"]
  ],
  vtuber: [
    ["3D Model", "GLB / glTF / Three.js", "connected"],
    ["Expression states", "neutral / happy / angry + custom actions", "connected"],
    ["PNG action frames", "24 frames per action", "connected"],
    ["Face Tracking", "MediaPipe Face Landmarker", "connected"],
    ["Head pose", "yaw / pitch / roll", "connected"],
    ["Eye / gaze", "blink + gaze normalization", "connected"],
    ["Mouth", "local amplitude lip-sync bridge", "connected"],
    ["Camera preview", "local getUserMedia", "connected"],
    ["Presets", "JSON import / export", "connected"],
    ["Overlays", "transparent avatar window", "connected"],
    ["Accessories", "anchors / transforms / seeded randomization", "prepared"],
    ["Physics", "runtime integration", "planned"],
    ["Live2D", "adapter boundary only", "planned"],
    ["VRM native compositor", "GPU/native integration", "planned"],
    ["Voice modifier", "local anime-bright DSP", "connected"]
  ]
};
