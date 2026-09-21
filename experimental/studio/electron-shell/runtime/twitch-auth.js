const { BrowserWindow, app, safeStorage } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DEFAULT_REDIRECT_URI = "http://127.0.0.1:37845/oauth/callback";
const SCOPES = [
  "user:read:chat",
  "user:write:chat",
  "moderator:read:followers",
  "channel:read:subscriptions",
  "bits:read",
  "channel:read:redemptions"
];

class TwitchAuth {
  constructor() {
    this.window = null;
    this.server = null;
    this.storagePath = path.join(app.getPath("userData"), "twitch.json");
  }

  load() {
    try {
      return JSON.parse(fs.readFileSync(this.storagePath, "utf8"));
    } catch {
      return {};
    }
  }

  saveConfig(config) {
    const data = { ...this.load(), clientId: config.clientId, channel: config.channel, redirectUri: config.redirectUri };
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), "utf8");
  }

  loadToken(clientId) {
    const data = this.load();
    if (!data.token || !data.tokenEncrypted || !safeStorage.isEncryptionAvailable()) return "";
    try {
      const token = safeStorage.decryptString(Buffer.from(data.token, "base64"));
      return data.clientId === clientId ? token : "";
    } catch {
      return "";
    }
  }

  saveToken(clientId, token) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Windows secure token storage is unavailable.");
    }
    const data = this.load();
    data.clientId = clientId;
    data.tokenEncrypted = true;
    data.token = safeStorage.encryptString(token).toString("base64");
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), "utf8");
  }

  clearToken() {
    const data = this.load();
    delete data.token;
    delete data.tokenEncrypted;
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
    fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2), "utf8");
  }

  async authorize({ clientId, redirectUri = DEFAULT_REDIRECT_URI }) {
    await this.#startCallbackServer(redirectUri);
    const state = crypto.randomBytes(24).toString("hex");

    const authUrl = new URL("https://id.twitch.tv/oauth2/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "token");
    authUrl.searchParams.set("scope", SCOPES.join(" "));
    authUrl.searchParams.set("state", state);

    this.window?.close();
    this.window = new BrowserWindow({
      width: 900,
      height: 800,
      title: "Connect Cari Studio to Twitch",
      autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
    });

    const tokenPromise = new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        this.#closeCallbackServer();
        this.window?.close();
        this.window = null;
        callback(value);
      };

      const consume = rawUrl => {
        let url;
        try { url = new URL(rawUrl); } catch { return; }
        const target = new URL(redirectUri);
        if (url.origin !== target.origin || url.pathname !== target.pathname) return;

        const params = new URLSearchParams(url.hash.replace(/^#/, ""));
        if (params.get("state") !== state) {
          finish(reject, new Error("Twitch OAuth state mismatch."));
          return;
        }
        const error = params.get("error");
        if (error) {
          finish(reject, new Error(params.get("error_description") || error));
          return;
        }
        const token = params.get("access_token");
        if (!token) {
          finish(reject, new Error("Twitch did not return an access token."));
          return;
        }
        finish(resolve, token);
      };

      this.window.webContents.on("did-navigate", (_event, url) => consume(url));
      this.window.webContents.on("did-navigate-in-page", (_event, url) => consume(url));
      this.window.on("closed", () => {
        if (!settled) finish(reject, new Error("Twitch authorization cancelled."));
      });

      this.window.loadURL(authUrl.toString()).catch(error => finish(reject, error));
    });

    return tokenPromise;
  }

  async #startCallbackServer(redirectUri) {
    if (this.server) return;
    const target = new URL(redirectUri);
    this.server = http.createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<!doctype html><meta charset=utf-8><title>Cari Studio</title><h1>Autorización recibida</h1><p>Volvé a Cari Studio.</p>");
    });
    await new Promise((resolve, reject) => {
      this.server.once("error", reject);
      this.server.listen(Number(target.port), target.hostname, resolve);
    });
  }

  async #closeCallbackServer() {
    if (!this.server) return;
    const server = this.server;
    this.server = null;
    await new Promise(resolve => server.close(() => resolve()));
  }
}

module.exports = { TwitchAuth, DEFAULT_REDIRECT_URI, TWITCH_CHAT_SCOPES: SCOPES };
