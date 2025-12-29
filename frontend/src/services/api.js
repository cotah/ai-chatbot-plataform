const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const CLIENT_KEY = import.meta.env.VITE_CLIENT_KEY || ""; // <-- define aqui (opcional)

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

  // tenta ler o body mesmo em erro pra você ver exatamente o motivo
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(`API ${res.status} ${res.statusText} - ${text}`);
  }

  // se não tem body, evita crash
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Chat API
 * - languageOnly=false -> POST /api/chat
 * - languageOnly=true  -> POST /api/chat/language
 */
export async function chatAPI({
  message = "",
  conversationId = null,
  languageOverride = null,
  languageOnly = false,
} = {}) {
  // troca de idioma (melhor usar o endpoint dedicado)
  if (languageOnly) {
    return request("/api/chat/language", {
      method: "POST",
      body: JSON.stringify({ languageOverride }),
    });
  }

  // chat normal
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, conversationId, languageOverride }),
  });
}
