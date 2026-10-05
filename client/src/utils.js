export function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
}

let localCounter = 0;
// Mensajes que solo existen en el navegador (optimistas o de error).
export function localMessage(sender, content) {
  localCounter += 1;
  return { id: `local-${Date.now()}-${localCounter}`, sender, content, timestamp: new Date().toISOString() };
}

// Cada visitante tiene su propia conversación: el id se guarda en el navegador.
export function getSessionId() {
  const key = "demo-session-id";
  try {
    const saved = localStorage.getItem(key);
    if (saved) return saved;
  } catch { /* almacenamiento no disponible */ }
  const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, "");
  try { localStorage.setItem(key, id); } catch { /* ignorar */ }
  return id;
}
