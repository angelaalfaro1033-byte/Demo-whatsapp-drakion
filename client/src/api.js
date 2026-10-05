export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new ApiError("network", "No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Respuesta sin JSON (por ejemplo, backend caído detrás del proxy)
  }

  if (!response.ok) {
    if (!data?.error) {
      throw new ApiError("server_unavailable", "El servidor no está disponible. Verifica que el backend esté en ejecución.");
    }
    throw new ApiError(data.error.code, data.error.message);
  }
  return data;
}

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body) });

export const api = {
  getConversation: (id) => request(`/conversations/${id}`),
  sendChat: (conversationId, message) => post("/chat", { conversationId, message }),
  sendHuman: (id, message) => post(`/conversations/${id}/human`, { message }),
  setAutomation: (id, active) => post(`/conversations/${id}/automation`, { active }),
};
