async function twitchFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!response.ok) {
    throw new Error(`Twitch HTTP ${response.status}: ${data?.message || data?.error || data?.raw || response.statusText}`);
  }
  return data;
}

async function validateToken(clientId, token) {
  const data = await twitchFetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${token}` }
  });
  if (data?.client_id !== clientId) throw new Error("Twitch token belongs to another Client ID.");
  return data;
}

async function getUser(clientId, token, query) {
  const url = new URL("https://api.twitch.tv/helix/users");
  if (query.id) url.searchParams.set("id", query.id);
  if (query.login) url.searchParams.set("login", query.login);
  const data = await twitchFetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Id": clientId
    }
  });
  return data?.data?.[0] || null;
}

async function sendChatMessage(clientId, token, broadcasterId, senderId, message) {
  const text = String(message || "").trim();
  if (!text) throw new Error("Chat message is empty.");
  if (text.length > 500) throw new Error("Chat messages are limited to 500 characters.");
  return twitchFetch("https://api.twitch.tv/helix/chat/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Id": clientId
    },
    body: JSON.stringify({
      broadcaster_id: broadcasterId,
      sender_id: senderId,
      message: text
    })
  });
}

async function subscribeChat(clientId, token, sessionId, broadcasterId, userId) {
  return twitchFetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Client-Id": clientId
    },
    body: JSON.stringify({
      type: "channel.chat.message",
      version: "1",
      condition: {
        broadcaster_user_id: broadcasterId,
        user_id: userId
      },
      transport: {
        method: "websocket",
        session_id: sessionId
      }
    })
  });
}

module.exports = {
  twitchFetch,
  validateToken,
  getUser,
  sendChatMessage,
  subscribeChat
};
