# Demo: automatización de conversaciones con IA (Groq)

Chat tipo mensajería donde una IA (Groq) responde de forma automática y un humano puede pausarla, intervenir y reanudarla en cualquier momento.

- **Frontend:** React + Vite + CSS (iconos con Lucide React)
- **Backend:** Node.js + Express + SDK oficial de Groq (`groq-sdk`)
- **Memoria:** las conversaciones viven en un `Map` en el backend; al reiniciarlo se pierden.

## 1. Requisitos

- Node.js 20 o superior (incluye npm). Verifica con `node -v`.
- Una API key gratuita de Groq: https://console.groq.com/keys

## 2. Instalar el backend

```bash
cd server
npm install
```

## 3. Configurar GROQ_API_KEY

Edita `server/.env` y reemplaza el valor:

```
GROQ_API_KEY=gsk_tu_clave_real
```

Opcional: `GROQ_MODEL` (por defecto `llama-3.3-70b-versatile`) y `PORT` (por defecto `3001`).
La clave solo la lee el backend; el navegador nunca la ve. `server/.env` está en `.gitignore`.

## 4. Iniciar el backend

```bash
cd server
npm start
```

Debe mostrar `Servidor listo en http://localhost:3001`.

## 5. Instalar e iniciar el frontend

En otra terminal:

```bash
cd client
npm install
npm run dev
```

Abre http://localhost:5173. Vite reenvía las llamadas `/api` al backend en el puerto 3001.

## 6. Probar la conversación

1. Selecciona **Cliente Demo** (las demás conversaciones son solo visuales).
2. Escribe `Hola, tengo una pregunta.` y pulsa Enter. Aparece «IA está escribiendo...» y luego la respuesta.
3. Haz más preguntas sobre cualquier tema: la IA conserva el contexto.

## 7. Probar Pausar IA

1. Pulsa **Pausar IA** (abajo a la derecha).
2. El header cambia de «IA activa» a «Atención humana» y aparece el aviso «Automatización pausada».
3. Escribe un mensaje: aparece como mensaje de **Asesor** y **no** se llama a Groq (el backend rechaza `/api/chat` con la IA pausada).

## 8. Probar Reanudar IA

1. Pulsa **Reanudar IA**.
2. El header vuelve a «IA activa».
3. Escribe otra pregunta: la IA responde usando el historial completo, incluidos los mensajes del asesor.

## API del backend

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servidor y si hay API key |
| GET | `/api/conversations/:id` | Historial y estado de automatización |
| POST | `/api/chat` | `{ conversationId, message }`. Llama a Groq solo si la IA está activa |
| POST | `/api/conversations/:id/human` | `{ message }`. Mensaje del asesor (solo con la IA pausada, sin Groq) |
| POST | `/api/conversations/:id/automation` | `{ active: boolean }`. Pausa o reanuda la IA |

## Estructura

```
server/src/server.js        API, estado de automatización y llamada a Groq
client/src/App.jsx          Composición de la interfaz
client/src/hooks/           Lógica de la conversación (useConversation)
client/src/components/      Sidebar, header, mensajes y campo de escritura
client/src/data/contacts.js Contactos ficticios del sidebar
```

## Problemas frecuentes

- **«Falta configurar GROQ_API_KEY»:** revisa `server/.env` y reinicia el backend.
- **«No se pudo conectar con el servidor»:** el backend no está corriendo en el puerto 3001.
- **Modelo no disponible:** cambia `GROQ_MODEL` en `server/.env` por uno vigente de https://console.groq.com/docs/models.

## Despliegue (un solo servicio, por ejemplo Render)

En producción el backend sirve también el frontend compilado, así que solo se despliega un servicio.

- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Variables de entorno:** `GROQ_API_KEY` (obligatoria), `GROQ_MODEL` (opcional), `CHAT_LIMIT` (opcional, mensajes a la IA por IP cada 15 min; por defecto 40)

Cada visitante tiene su propia conversación (el navegador guarda un id). Las conversaciones viven en memoria y se borran tras 2 horas sin actividad o al reiniciar el servidor.

Para probarlo localmente como en producción: `npm run build`, luego `cd server && npm start` y abre http://localhost:3001.
