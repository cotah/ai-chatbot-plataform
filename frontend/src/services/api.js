const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const CLIENT_KEY = import.meta.env.VITE_CLIENT_KEY || "";

function getSessionId() {
  const key = "chat_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(CLIENT_KEY ? { "x-client-key": CLIENT_KEY } : {}),
      "x-session-id": getSessionId(),
      ...(options.headers || {}),
    },
  });

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText} - ${text}`);
  }

  return text ? JSON.parse(text) : {};
}

export async function chatAPI({
  message,
  conversationId,
  languageOverride = null,
  languageOnly = false,
}) {
  // ✅ só inclui conversationId se for string válida
  const body = {
    message,
    ...(conversationId ? { conversationId } : {}),
    ...(languageOverride ? { languageOverride } : {}),
  };

  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

