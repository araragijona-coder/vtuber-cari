const { EventEmitter } = require("node:events");
const WebSocket = require("ws");
const {
  validateToken,
  getUser,
  sendChatMessage,
  subscribeChat,
  subscribeEventSub
} = require("./twitch-api");

class TwitchChatService extends EventEmitter {
  constructor({ auth, WebSocketImpl = WebSocket } = {}) {
    super();
    this.auth = auth;
    this.WebSocketImpl = WebSocketImpl;
    this.clientId = "";
    this.token = "";
    this.user = null;
    this.broadcaster = null;
    this.channel = "";
    this.socket = null;
    this.generation = 0;
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.keepaliveTimer = null;
    this.manualDisconnect = false;
    this.messageIds = new Set();
    this.streamOnline = false;
    this.lastEventAt = null;
    this.lastKeepaliveAt = null;
  }

  get status() {
    return {
      connected: this.socket?.readyState === WebSocket.OPEN,
      authorized: Boolean(this.token && this.user),
      channel: this.broadcaster
        ? { id: this.broadcaster.id, login: this.broadcaster.login, display_name: this.broadcaster.display_name }
        : null,
      user: this.user
        ? { id: this.user.id, login: this.user.login, display_name: this.user.display_name }
        : null,
      reconnectAttempt: this.reconnectAttempt,
      generation: this.generation,
      streamOnline: this.streamOnline,
      lastEventAt: this.lastEventAt,
      lastKeepaliveAt: this.lastKeepaliveAt,
      controlOnly: true
    };
  }

  async connect({ clientId, channel, redirectUri } = {}) {
    this.manualDisconnect = false;
    this.clientId = String(clientId || this.auth.load().clientId || "").trim();
    this.channel = String(channel || this.auth.load().channel || "").trim().replace(/^#/, "").toLowerCase();

    if (!this.clientId) throw new Error("Twitch Client ID is required.");
    if (!/^[a-z0-9_]{1,30}$/i.test(this.channel)) {
      throw new Error("Twitch channel/login is required.");
    }

    this.auth.saveConfig({
      clientId: this.clientId,
      channel: this.channel,
      redirectUri: redirectUri || this.auth.load().redirectUri
    });

    this.token = this.auth.loadToken(this.clientId);
    if (this.token) {
      try {
        await validateToken(this.clientId, this.token);
      } catch {
        this.token = "";
        this.auth.clearToken();
      }
    }

    if (!this.token) {
      this.token = await this.auth.authorize({
        clientId: this.clientId,
        redirectUri: redirectUri || undefined
      });
      await validateToken(this.clientId, this.token);
      this.auth.saveToken(this.clientId, this.token);
    }

    const validated = await validateToken(this.clientId, this.token);
    this.user = {
      id: validated.user_id,
      login: validated.login,
      display_name: validated.login
    };

    this.broadcaster = await getUser(this.clientId, this.token, { login: this.channel });
    if (!this.broadcaster) throw new Error(`Twitch channel not found: ${this.channel}`);

    await this.#openWebSocket();
    this.emit("status", this.status);
    return this.status;
  }

  #setStreamState(online) {
    this.streamOnline = online === true;
    this.lastEventAt = new Date().toISOString();
    this.emit("status", this.status);
  }

  async disconnect() {
    this.manualDisconnect = true;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.streamOnline = false;
    if (this.socket) {
      try { this.socket.close(1000, "client disconnect"); } catch {}
      this.socket = null;
    }
    this.emit("status", this.status);
    return this.status;
  }

  async sendChat(message) {
    if (!this.token || !this.user || !this.broadcaster) {
      throw new Error("Connect to Twitch first.");
    }
    const result = await sendChatMessage(
      this.clientId,
      this.token,
      this.broadcaster.id,
      this.user.id,
      message
    );
    this.emit("chat:sent", { text: String(message).trim() });
    return result;
  }

  async #openWebSocket(
    url = "wss://eventsub.wss.twitch.tv/ws",
    { transfer = false } = {}
  ) {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;

    const previous = this.socket;
    if (previous && !transfer) {
      try { previous.close(1000, "replacing EventSub connection"); } catch {}
      this.socket = null;
    }

    const socket = new this.WebSocketImpl(url);
    socket.__cariFreshSession = !transfer;
    const generation = ++this.generation;

    await new Promise((resolve, reject) => {
      let opened = false;
      let welcomed = false;
      let settled = false;

      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        callback(value);
      };

      socket.once("open", () => {
        opened = true;
        if (welcomed) {
          finish(resolve);
        }
      });

      socket.once("error", error => {
        if (!opened || !welcomed) {
          finish(reject, error);
        } else {
          this.emit("error", error);
        }
      });

      socket.on("message", raw => {
        let payload;
        try {
          payload = JSON.parse(raw.toString());
        } catch (error) {
          this.emit("error", error);
          return;
        }

        const messageType = payload?.metadata?.message_type;
        if (messageType === "session_welcome") {
          welcomed = true;
          if (transfer) {
            this.socket = socket;
            if (previous && previous !== socket) {
              try { previous.close(1000, "EventSub session transferred"); } catch {}
            }
          } else {
            this.socket = socket;
          }
          this.emit("status", this.status);
          if (opened) finish(resolve);
        }

        this.#handleMessage(generation, raw).catch(error => this.emit("error", error));
      });

      socket.on("close", () => {
        if (settled && this.socket !== socket) return;
        if (!settled) {
          finish(reject, new Error("Twitch EventSub socket closed before welcome."));
          return;
        }
        if (this.socket !== socket || this.manualDisconnect) return;
        this.socket = null;
        this.emit("status", this.status);
        this.#scheduleReconnect();
      });
    });

    this.emit("status", this.status);
  }

  async #handleMessage(generation, raw) {
    const message = JSON.parse(raw.toString());
    const type = message?.metadata?.message_type;

    if (type === "session_welcome") {
      this.reconnectAttempt = 0;
      const sessionId = message.payload?.session?.id;
      if (!sessionId) throw new Error("Twitch welcome message did not contain a session id.");

      const shouldResubscribe = generation === this.generation && this.socket?.__cariFreshSession === true;
      if (shouldResubscribe) {
        await subscribeChat(
          this.clientId,
          this.token,
          sessionId,
          this.broadcaster.id,
          this.user.id
        );

        // These subscriptions require no additional user scopes and give Cari
        // enough lifecycle context to drive VTuber/scene automations.
        const subscriptions = [
          {
            type: "channel.update",
            version: "2",
            condition: { broadcaster_user_id: this.broadcaster.id }
          },
          {
            type: "channel.raid",
            version: "1",
            condition: { to_broadcaster_user_id: this.broadcaster.id }
          },
          {
            type: "stream.online",
            version: "1",
            condition: { broadcaster_user_id: this.broadcaster.id }
          },
          {
            type: "stream.offline",
            version: "1",
            condition: { broadcaster_user_id: this.broadcaster.id }
          },
          {
            type: "channel.shared_chat.begin",
            version: "1",
            condition: { broadcaster_user_id: this.broadcaster.id }
          },
          {
            type: "channel.shared_chat.update",
            version: "1",
            condition: { broadcaster_user_id: this.broadcaster.id }
          },
          {
            type: "channel.shared_chat.end",
            version: "1",
            condition: { broadcaster_user_id: this.broadcaster.id }
          }
        ];

        for (const subscription of subscriptions) {
          try {
            await subscribeEventSub(
              this.clientId,
              this.token,
              sessionId,
              subscription
            );
          } catch (error) {
            // Chat remains the required baseline. Optional event subscriptions
            // must not tear down a healthy chat connection.
            this.emit("error", new Error(
              `EventSub ${subscription.type} unavailable: ${error.message}`
            ));
          }
        }

        delete this.socket.__cariFreshSession;
      }

      const keepaliveTimeout =
        Number(message.payload?.session?.keepalive_timeout_seconds) || 10;
      clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = setTimeout(() => {
        if (this.manualDisconnect) return;
        try { this.socket?.close(4005, "keepalive timeout"); } catch {}
      }, Math.max(10, keepaliveTimeout) * 1000 + 1000);

      this.emit("eventsub:welcome", {
        generation,
        sessionId,
        keepaliveTimeout
      });
      this.emit("status", this.status);
      return;
    }

    if (type === "session_keepalive") {
      this.#refreshKeepaliveTimer();
      this.lastKeepaliveAt = new Date().toISOString();
      this.emit("eventsub:keepalive", { generation });
      this.emit("status", this.status());
      return;
    }

    if (type === "session_reconnect") {
      const reconnectUrl = message.payload?.session?.reconnect_url;
      this.emit("eventsub:reconnect", {
        generation,
        reconnectUrl: reconnectUrl || null
      });
      if (reconnectUrl) await this.#openWebSocket(reconnectUrl, { transfer: true });
      return;
    }

    this.#refreshKeepaliveTimer();

    if (type !== "notification") return;

    const notificationId = message?.metadata?.message_id;
    if (notificationId && this.messageIds.has(notificationId)) return;
    if (notificationId) {
      this.messageIds.add(notificationId);
      if (this.messageIds.size > 2000) {
        this.messageIds.delete(this.messageIds.values().next().value);
      }
    }

    const eventType = message?.payload?.subscription?.type;
    const event = message.payload.event || {};

    if (eventType === "stream.online") {
      this.#setStreamState(true);
    } else if (eventType === "stream.offline") {
      this.#setStreamState(false);
    }

    if (eventType !== "channel.chat.message") {
      this.emit("event", {
        eventType,
        payload: event,
        subscription: message.payload.subscription || null
      });
      return;
    }
    const id = event.message_id;

    this.emit("chat", {
      message_id: id || null,
      user_id: event.chatter_user_id,
      user_name: event.chatter_user_name,
      user_login: event.chatter_user_login,
      text: event.message?.text || "",
      color: event.color || null,
      badges: event.badges || []
    });
  }

  #refreshKeepaliveTimer() {
    clearTimeout(this.keepaliveTimer);
    const timeoutSeconds = 10;
    this.keepaliveTimer = setTimeout(() => {
      if (this.manualDisconnect) return;
      try { this.socket?.close(4005, "keepalive timeout"); } catch {}
    }, timeoutSeconds * 1000 + 1000);
  }

  #scheduleReconnect() {
    if (this.manualDisconnect) return;

    this.reconnectAttempt += 1;
    if (this.reconnectAttempt > 5) {
      this.emit("error", new Error("Twitch reconnect limit reached."));
      return;
    }

    const delay = Math.min(30000, 1000 * (2 ** (this.reconnectAttempt - 1)));
    this.reconnectTimer = setTimeout(() => {
      this.#openWebSocket().catch(error => {
        this.emit("error", error);
        this.#scheduleReconnect();
      });
    }, delay);

    this.emit("status", this.status);
  }
}

module.exports = { TwitchChatService };
