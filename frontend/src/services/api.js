const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText} - ${text}`);
  }

  return res.json();
}

export async function chatAPI({ message, conversationId = null, languageOverride = null, languageOnly = false }) {
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ message, conversationId, languageOverride, languageOnly }),
  });
}

