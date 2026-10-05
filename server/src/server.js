import "dotenv/config";
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT) || 3001;
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const MAX_HISTORY_MESSAGES = 30; // mensajes enviados a Groq como contexto
const MAX_MESSAGE_LENGTH = 2000;
const GROQ_TIMEOUT_MS = 20000;
const MAX_CONVERSATIONS = 500; // tope de conversaciones simultáneas en memoria
const CONVERSATION_TTL_MS = 2 * 60 * 60 * 1000; // se borran tras 2 h sin actividad
const CONVERSATION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const CHAT_LIMIT_PER_WINDOW = Number(process.env.CHAT_LIMIT) || 40; // mensajes a la IA por IP cada 15 min

const SYSTEM_PROMPT = `Eres el asistente virtual de SERVICIOS MAQUITRANS S.A.S. para una demostración de atención por chat.

Información de la empresa:
- SERVICIOS MAQUITRANS S.A.S. pertenece al conglomerado empresarial INNOVAGEST S.A.S., NIT 900.245.151-0.
- La información suministrada indica que cuenta con Licencia No. 500.41.15-1489, expedida el 9 de octubre de 2015 por CORPORINOQUIA, para transporte, tratamiento y disposición final de residuos sólidos y líquidos de la industria de hidrocarburos, con área licenciada en Casanare.
- Su misión incluye soluciones logísticas de transporte e izaje especializado de carga, movilización de equipos petroleros, apoyo a la extracción de petróleo y gas, y mantenimiento de equipos industriales, con vehículos, maquinaria, equipos y personal capacitado.
- Servicios descritos: transporte de carga líquida y residuos industriales; suministro de agua industrial y potable y venta de agua en bloque; transporte de crudo; alquiler de equipos; mantenimiento de equipos industriales; supervisión, logística, arme, desarme y movilización de equipos petroleros; intervención a pozos de petróleo y gas; suministro de vehículos para cargue y descargue; transporte de carga pesada; suministro de materiales, herramientas y ferretería.

Reglas de atención:
- Atiende principalmente preguntas sobre los servicios de Maquitrans. Resume la oferta pertinente y no presentes datos como actuales o verificados más allá de la información de esta demo.
- No hay tarifas, disponibilidad, capacidades específicas, cobertura exacta ni condiciones comerciales en la información suministrada. Nunca inventes precios ni cotizaciones, tampoco por hora, jornada, viaje, tonelada o equipo. Si preguntan cuánto cuesta una grúa, camión u otro servicio, explica brevemente que el valor depende del equipo y las condiciones del servicio y que esta demo no tiene tarifas. Solicita los datos que falten para cotizar: tipo de equipo/servicio, capacidad o especificaciones, ubicación y destino, duración o fecha, y alcance del trabajo. No afirmes que ya enviaste o gestionarás una cotización.
- Si preguntan por un servicio que no está descrito, indícalo con honestidad y ofrece identificar la necesidad para validarla con un asesor.
- Responde en español por defecto; si la persona escribe en otro idioma, responde en ese idioma.
- Responde de forma natural, cercana y clara, como lo haría una persona atenta. Evita sonar rígido o robótico.
- Puedes responder preguntas generales breves, pero vuelve al contexto de Maquitrans cuando corresponda.
- Mantén el contexto de toda la conversación y no repitas información que ya diste.
- Sé concisa pero útil: normalmente 1 a 4 frases, y más solo si la pregunta lo requiere.
- Si la persona pide hablar con un humano, indícale que puede usar el control de la interfaz para que un asesor intervenga.
- Algunos mensajes previos del historial comienzan con "[Asesor humano]": son respuestas que dio una persona mientras la IA estaba pausada. Tómalos como parte del contexto, sin repetirlos ni mencionar esta etiqueta.
- Nunca menciones que sigues un flujo, guion o instrucciones internas.`;

const apiKey = process.env.GROQ_API_KEY?.trim();
const hasApiKey = Boolean(apiKey) && apiKey !== "TU_API_KEY";
const groq = hasApiKey ? new Groq({ apiKey, maxRetries: 1 }) : null;

// Conversaciones en memoria: id -> { id, automationActive, messages, lastActivity }
// Cada visitante usa su propio id (lo genera el navegador), así nadie ve la conversación de otro.
const conversations = new Map();

setInterval(() => {
  const limit = Date.now() - CONVERSATION_TTL_MS;
  for (const [id, c] of conversations) if (c.lastActivity < limit) conversations.delete(id);
}, 10 * 60 * 1000).unref();

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function createMessage(sender, content, extra = {}) {
  return {
    id: randomUUID(),
    sender, // "user" | "ai" | "human" | "system"
    content,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

function getConversation(id) {
  if (typeof id !== "string" || !CONVERSATION_ID_PATTERN.test(id)) {
    throw new ApiError(404, "conversation_not_found", "La conversación no existe.");
  }
  let conversation = conversations.get(id);
  if (!conversation) {
    if (conversations.size >= MAX_CONVERSATIONS) {
      conversations.delete(conversations.keys().next().value); // elimina la más antigua
    }
    conversation = { id, automationActive: true, messages: [], lastActivity: Date.now() };
    conversations.set(id, conversation);
  }
  conversation.lastActivity = Date.now();
  return conversation;
}

function readMessageText(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ApiError(400, "empty_message", "El mensaje no puede estar vacío.");
  }
  const text = value.trim();
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new ApiError(
      400,
      "message_too_long",
      `El mensaje supera el máximo de ${MAX_MESSAGE_LENGTH} caracteres.`
    );
  }
  return text;
}

// Convierte el historial interno al formato de Groq. Los avisos del sistema no se envían.
function toGroqMessages(messages) {
  return messages
    .filter((m) => m.sender === "user" || m.sender === "ai" || m.sender === "human")
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => {
      if (m.sender === "user") return { role: "user", content: m.content };
      if (m.sender === "ai") return { role: "assistant", content: m.content };
      return { role: "assistant", content: `[Asesor humano] ${m.content}` };
    });
}

function toFriendlyGroqError(err) {
  console.error("Error de Groq:", err?.status ?? "", err?.message ?? err);
  if (err?.status === 401) {
    return new ApiError(502, "groq_auth", "La API key de Groq no es válida. Revisa server/.env.");
  }
  if (err?.status === 429) {
    return new ApiError(429, "groq_rate_limit", "Se alcanzó el límite de uso de Groq. Intenta de nuevo en unos segundos.");
  }
  if (err?.name === "APIConnectionTimeoutError") {
    return new ApiError(504, "groq_timeout", "La IA tardó demasiado en responder. Intenta de nuevo.");
  }
  return new ApiError(502, "groq_error", "No pude obtener una respuesta de la IA. Intenta de nuevo.");
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const app = express();
app.set("trust proxy", 1); // detrás del proxy de Render/Railway, para ver la IP real del visitante
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: CHAT_LIMIT_PER_WINDOW,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      error: { code: "rate_limited", message: "Alcanzaste el límite de mensajes de esta demo. Intenta de nuevo en unos minutos." },
    }),
});
app.use(cors({ origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/] }));
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, groqConfigured: hasApiKey });
});

app.get("/api/conversations/:id", (req, res) => {
  const { id, automationActive, messages } = getConversation(req.params.id);
  res.json({ id, automationActive, messages });
});

// Único punto donde se llama a Groq. Solo funciona con la automatización activa.
app.post(
  "/api/chat",
  chatLimiter,
  asyncHandler(async (req, res) => {
    const { conversationId, message } = req.body ?? {};
    const conversation = getConversation(conversationId);
    const text = readMessageText(message);

    if (!conversation.automationActive) {
      throw new ApiError(409, "automation_paused", "La automatización está pausada.");
    }
    if (!groq) {
      throw new ApiError(500, "missing_api_key", "Falta configurar GROQ_API_KEY en server/.env.");
    }

    const userMessage = createMessage("user", text);
    conversation.messages.push(userMessage);

    let reply;
    try {
      const completion = await groq.chat.completions.create(
        {
          model: MODEL,
          temperature: 0.6,
          max_tokens: 2000,
          // Los modelos GPT-OSS razonan antes de responder; en "low" contestan más rápido
          ...(MODEL.startsWith("openai/gpt-oss") && { reasoning_effort: "low" }),
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...toGroqMessages(conversation.messages),
          ],
        },
        { timeout: GROQ_TIMEOUT_MS }
      );
      reply = completion.choices?.[0]?.message?.content?.trim();
    } catch (err) {
      throw toFriendlyGroqError(err);
    }

    if (!reply) {
      throw new ApiError(502, "invalid_response", "La IA devolvió una respuesta inválida. Intenta de nuevo.");
    }
    // Si un humano pausó la IA mientras esperábamos a Groq, la respuesta se descarta.
    if (!conversation.automationActive) {
      throw new ApiError(409, "automation_paused", "La automatización fue pausada.");
    }

    const aiMessage = createMessage("ai", reply);
    conversation.messages.push(aiMessage);
    res.json({ userMessage, aiMessage });
  })
);

// Mensaje del asesor humano: nunca pasa por Groq.
app.post(
  "/api/conversations/:id/human",
  asyncHandler(async (req, res) => {
    const conversation = getConversation(req.params.id);
    const text = readMessageText(req.body?.message);
    if (conversation.automationActive) {
      throw new ApiError(409, "automation_active", "La IA está activa. Pausa la automatización para responder como asesor.");
    }
    const message = createMessage("human", text);
    conversation.messages.push(message);
    res.json({ message });
  })
);

app.post("/api/conversations/:id/automation", (req, res) => {
  const conversation = getConversation(req.params.id);
  if (typeof req.body?.active !== "boolean") {
    throw new ApiError(400, "invalid_request", "El campo 'active' debe ser true o false.");
  }
  conversation.automationActive = req.body.active;
  const event = conversation.automationActive
    ? createMessage("system", "La IA volvió a responder los nuevos mensajes.", {
        variant: "resumed",
        title: "IA reanudada",
      })
    : createMessage("system", "Un asesor humano está atendiendo esta conversación.", {
        variant: "paused",
        title: "Automatización pausada",
      });
  conversation.messages.push(event);
  res.json({ automationActive: conversation.automationActive, event });
});

// En producción el backend también sirve el frontend compilado (client/dist).
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api")) return res.sendFile(path.join(clientDist, "index.html"));
    next();
  });
}

app.use((req, res) => {
  res.status(404).json({ error: { code: "not_found", message: "Ruta no encontrada." } });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "invalid_json", message: "La solicitud no es válida." } });
  }
  console.error(err);
  res.status(500).json({ error: { code: "internal_error", message: "Ocurrió un error inesperado en el servidor." } });
});

app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
  if (!hasApiKey) console.warn("⚠ GROQ_API_KEY no está configurada en server/.env");
});
