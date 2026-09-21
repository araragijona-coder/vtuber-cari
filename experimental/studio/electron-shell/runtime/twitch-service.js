const { app, BrowserWindow, safeStorage } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { EventEmitter } = require("node:events");
const WebSocket = require("ws");

const TWITCH_AUTH = "https://id.twitch.tv/oauth2/authorize";
const TWITCH_API = "https://api.twitch.tv/helix";
const TWITCH_TOKEN_VALIDATE = "https://id.twitch.tv/oauth2/validate";
const DEFAULT_REDIRECT_URI = "http://127.0.0.1:37845/oauth/callback";
const SCOPES = ["user:read:chat", "user:write:chat"];
const MAX_CHAT_LENGTH = 500;

function jsonFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  }).then(async response => {
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }
    if (!response.ok) {
      const detail = body?.message || body?.error || body?.raw || response.statusText;
      const error = new Error(`Twitch HTTP ${response.status}: ${detail}`);
      error.status = response.status;
      error.body = body;
      throw error;
    }
    return body;
  });
}

class TwitchService extends EventEmitter {
  constructor() {
    super();
    this.clientId = "";
    this.redirectUri = DEFAULT_REDIRECT_URI;
    this.channel = "";
    this.token = "";
    this.user = null;
    this.broadcaster = null;
    this.ws = null;
    this.wsGeneration = 0;
    this.manualDisconnect = false;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.dedup = new Set();
    this.server = null;
    this.authWindow = null;
  }

  status() {
    return {
      connected: Boolean(this.ws && this.ws.readyState === WebSocket.OPEN),
      authorized: Boolean(this.token && this.user),
      user: this.user
        ? { id: this.user.id, login: this.user.login, display_name: this.user.display_name }
        : null,
      channel: this.broadcaster
        ? { id: this.broadcaster.id, login: this.broadcaster.login, display_name: this.broadcaster.display_name }
        : (this.channel ? { login: this.channel } : null),
      websocketGeneration: this.wsGeneration,
      reconnectAttempt: this.reconnectAttempt
    };
  }

  async connect({ clientId, channel, redirectUri = DEFAULT_REDIRECT_URI } = {}) {
    this.clientId = String(clientId || "").trim();
    this.channel = String(channel || "").trim().replace(/^#/, "").toLowerCase();
    this.redirectUri = String(redirectUri || DEFAULT_REDIRECT_URI).trim();

    if (!this.clientId) throw new Error("Twitch Client ID is required.");
    if (!/^[a-z0-9_]{1,30}$/i.test(this.channel)) {
      throw new Error("Twitch channel/login is required.");
    }

    this.manualDisconnect = false;
    this.#saveConfig();

    await this.#ensureToken();
    await this.#loadIdentityAndChannel();
    await this.#connectEventSub();

    this.emit("status", this.status());
    return this.status();
  }

  async disconnect() {
    this.manualDisconnect = true;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;

    if (this.ws) {
      try {
        this.ws.close(1000, "client disconnect");
      } catch {}
      this.ws = null;
    }

    this.authWindow?.close();
    this.authWindow = null;

    await this.#closeAuthServer();
    this.emit("status", this.status());
    return this.status();
  }

  async sendChat(message) {
    if (!this.token || !this.user || !this.broadcaster) {
      throw new Error("Connect to Twitch before sending chat.");
    }

    const text = String(message || "").trim();
    if (!text) throw new Error("Chat message is empty.");
    if (text.length > MAX_CHAT_LENGTH) {
      throw new Error(`Twitch chat messages are limited to ${MAX_CHAT_LENGTH} characters.`);
    }

    const body = await jsonFetch(`${TWITCH_API}/chat/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Client-Id": this.clientId
      },
      body: JSON.stringify({
        broadcaster_id: this.broadcaster.id,
        sender_id: this.user.id,
        message: text
      })
    });

    this.emit("chat:sent", {
      text,
      message_id: body?.data?.[0]?.message_id || null
    });

    return body;
  }

  async #ensureToken() {
    const saved = this.#loadToken();
    if (saved) {
      this.token = saved;
      try {
        await this.#validateToken();
        return;
      } catch {
        this.token = "";
        this.#clearToken();
      }
    }

    await this.#authorizeImplicit();
    await this.#validateToken();
    this.#saveToken(this.token);
  }

  async #validateToken() {
    const body = await jsonFetch(TWITCH_TOKEN_VALIDATE, {
      headers: { Authorization: `OAuth ${this.token}` }
    });

    if (body?.client_id !== this.clientId) {
      throw new Error("Stored Twitch token belongs to a different Client ID.");
    }

    this.user = {
      id: body.user_id,
      login: body.login,
      display_name: body.login
    };
  }

  async #loadIdentityAndChannel() {
    const users = await jsonFetch(`${TWITCH_API}/users?login=${encodeURIComponent(this.channel)}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Client-Id": this.clientId
      }
    });

    this.broadcaster = users?.data?.[0] || null;
    if (!this.broadcaster) {
      throw new Error(`Twitch channel not found: ${this.channel}`);
    }

    const me = await jsonFetch(`${TWITCH_API}/users?id=${encodeURIComponent(this.user.id)}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Client-Id": this.clientId
      }
    });
    this.user = me?.data?.[0] || this.user;
  }

  async #authorizeImplicit() {
    await this.#startAuthServer();

    const state = crypto.randomBytes(24).toString("hex");
    const url = new URL(TWITCH_AUTH);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("response_type", "token");
    url.searchParams.set("scope", SCOPES.join(" "));
    url.searchParams.set("state", state);

    this.authWindow?.close();
    this.authWindow = new BrowserWindow({
      width: 900,
      height: 800,
      minWidth: 700,
      minHeight: 650,
      title: "Connect Cari Studio to Twitch",
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    this.authWindow.webContents.setWindowOpenHandler(({ url: target }) => {
      if (target.startsWith("https://id.twitch.tv/") || target.startsWith("https://www.twitch.tv/")) {
        return { action: "allow" };
      }
      return { action: "deny" };
    });

    const complete = token => new Promise((resolve, reject) => {
      this._finishAuth = { resolve, reject };
      this.token = token;
    });

    const consumeUrl = urlString => {
      let url;
      try {
        url = new URL(urlString);
      } catch {
        return;
      }

      if (url.origin !== new URL(this.redirectUri).origin ||
          url.pathname !== new URL(this.redirectUri).pathname) {
        return;
      }

      const params = new URLSearchParams(url.hash.replace(/^#/, ""));
      const error = params.get("error");
      if (error) {
        const description = params.get("error_description") || error;
        this._finishAuth?.reject(new Error(`Twitch authorization failed: ${description}`));
        return;
      }

      const returnedState = params.get("state");
      if (returnedState !== state) {
        this._finishAuth?.reject(new Error("Twitch OAuth state mismatch."));
        return;
      }

      const accessToken = params.get("access_token");
      if (!accessToken) {
        this._finishAuth?.reject(new Error("Twitch did not return an access token."));
        return;
      }

      this._finishAuth?.resolve(accessToken);
      this._finishAuth = null;
      this.authWindow?.close();
      this.authWindow = null;
    };

    this.authWindow.webContents.on("did-navigate", (_event, url) => consumeUrl(url));
    this.authWindow.webContents.on("did-navigate-in-page", (_event, url) => consumeUrl(url));
    this.authWindow.on("closed", () => {
      if (this._finishAuth) {
        this._finishAuth.reject(new Error("Twitch authorization window was closed."));
        this._finishAuth = null;
      }
      this.authWindow = null;
    });

    await this.authWindow.loadURL(url.toString());
    const token = await new Promise((resolve, reject) => {
      this._finishAuth = { resolve, reject };
    });
    this.token = token;
    await this.#closeAuthServer();
  }

  async #startAuthServer() {
    if (this.server) return;

    this.server = http.createServer((request, response) => {
      if (request.url?.split("?")[0] !== "/oauth/callback") {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(`<!doctype html>
<html><head><meta charset="utf-8"><title>Cari Studio Twitch</title></head>
<body style="font-family:system-ui;background:#111;color:#fff;padding:32px">
<h1>Autorización recibida</h1>
<p>Volvé a Cari Studio. Esta ventana puede cerrarse.</p>
</body>
<script>
  // The implicit grant token remains in the URL fragment. Electron reads it directly.
</script>
</html>`);
    });

    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(37845, "127.0.0.1", resolve);
    });
  }

  async #closeAuthServer() {
    if (!this.server) return;
    const server = this.server;
    this.server = null;
    await new Promise(resolve => server.close(() => resolve()));
  }

  async #connectEventSub(url = "wss://eventsub.wss.twitch.tv/ws") {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.wsGeneration += 1;
    const generation = this.wsGeneration;

    await new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      let settled = false;

      const fail = error => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };

      ws.once("open", () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      });

      ws.once("error", fail);

      ws.on("message", async raw => {
        try {
          await this.#handleEventSubMessage(generation, JSON.parse(raw.toString()));
        } catch (error) {
          this.emit("error", error);
        }
      });

      ws.on("close", () => {
        if (this.ws !== ws || this.manualDisconnect) return;
        this.emit("status", this.status());
        this.#scheduleReconnect();
      });
    });

    this.emit("status", this.status());
  }

  async #handleEventSubMessage(generation, payload) {
    const type = payload?.metadata?.message_type;

    if (type === "session_welcome") {
      const sessionId = payload.payload?.session?.id;
      if (!sessionId) throw new Error("Twitch EventSub welcome did not include session id.");

      this.reconnectAttempt = 0;
      await this.#subscribe(sessionId, "channel.chat.message", {
        broadcaster_user_id: this.broadcaster.id,
        user_id: this.user.id
      });

      this.emit("eventsub:welcome", {
        generation,
        sessionId,
        keepaliveTimeout: payload.payload?.session?.keepalive_timeout_seconds
      });
      this.emit("status", this.status());
      return;
    }

    if (type === "session_keepalive") {
      this.emit("eventsub:keepalive", { generation });
      return;
    }

    if (type === "session_reconnect") {
      const reconnectUrl = payload.payload?.session?.reconnect_url;
      if (reconnectUrl) {
        await this.#connectEventSub(reconnectUrl);
      }
      return;
    }

    if (type !== "notification") return;

    const subscriptionType = payload.payload?.subscription?.type;
    const event = payload.payload?.event || {};

    if (subscriptionType === "channel.chat.message") {
      const messageId = event.message_id;
      if (messageId && this.dedup.has(messageId)) return;
      if (messageId) {
        this.dedup.add(messageId);
        if (this.dedup.size > 1000) {
          const oldest = this.dedup.values().next().value;
          this.dedup.delete(oldest);
        }
      }

      this.emit("chat", {
        message_id: messageId || null,
        user_id: event.chatter_user_id,
        user_name: event.chatter_user_name,
        user_login: event.chatter_user_login,
        text: event.message?.text || "",
        color: event.color || null,
        badges: event.badges || []
      });
      return;
    }

    this.emit("event", {
      type: subscriptionType || "unknown",
      payload: event
    });
  }

  async #subscribe(sessionId, type, condition) {
    return jsonFetch(`${TWITCH_API}/eventsub/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Client-Id": this.clientId
      },
      body: JSON.stringify({
        type,
        version: "1",
        condition,
        transport: {
          method: "websocket",
          session_id: sessionId
        }
      })
    });
  }

  #scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.manualDisconnect) return;

    this.reconnectAttempt += 1;
    if (this.reconnectAttempt > 5) {
      this.emit("error", new Error("Twitch reconnect limit reached; press Connect to retry."));
      return;
    }

    const seconds = Math.min(30, 2 ** (this.reconnectAttempt - 1));
    this.reconnectTimer = setTimeout(() => {
      this.#connectEventSub().catch(error => {
        this.emit("error", error);
        this.#scheduleReconnect();
      });
    }, seconds * 1000);

    this.emit("status", this.status());
  }

  #storageFile() {
    return path.join(app.getPath("userData"), "twitch.json");
  }

  #loadSaved() {
    try {
      return JSON.parse(fs.readFileSync(this.#storageFile(), "utf8"));
    } catch {
      return {};
    }
  }

  #saveConfig() {
    const data = this.#loadSaved();
    data.clientId = this.clientId;
    data.channel = this.channel;
    data.redirectUri = this.redirectUri;
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(this.#storageFile(), JSON.stringify(data, null, 2), "utf8");
  }

  #loadToken() {
    const data = this.#loadSaved();
    if (!data.token) return "";
    if (data.tokenEncrypted && safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(Buffer.from(data.token, "base64"));
      } catch {
        return "";
      }
    }
    return "";
  }

  #saveToken(token) {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    const data = this.#loadSaved();

    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Windows secure storage is unavailable; refusing to store a Twitch token.");
    }

    data.tokenEncrypted = true;
    data.token = safeStorage.encryptString(token).toString("base64");
    fs.writeFileSync(this.#storageFile(), JSON.stringify(data, null, 2), "utf8");
  }

  #clearToken() {
    try {
      const data = this.#loadSaved();
      delete data.token;
      delete data.tokenEncrypted;
      fs.writeFileSync(this.#storageFile(), JSON.stringify(data, null, 2), "utf8");
    } catch {}
  }
}

module.exports = { TwitchService, DEFAULT_REDIRECT_URI };
