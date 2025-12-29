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

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} - ${text}`);
  }

  return res.json();
}

export async function chatAPI({
  message,
  conversationId,
  languageOverride,
  languageOnly = false, // (fica aqui só pra compatibilidade com o widget)
}) {
  const body = { message };

  // NÃO envie null
  if (conversationId) body.conversationId = conversationId;
  if (languageOverride) body.languageOverride = languageOverride;

  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });
}


