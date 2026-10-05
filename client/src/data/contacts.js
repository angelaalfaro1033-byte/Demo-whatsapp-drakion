// Conversaciones ficticias para poblar el sidebar. Solo Maquitrans es funcional.
export const DEMO_CONVERSATION_ID = "cliente-demo";

const at = (hhmm) => `2026-01-01T${hhmm}:00`;

export const contacts = [
  { id: DEMO_CONVERSATION_ID, name: "Maquitrans S.A.S.", initials: "MT", color: "#2563EB", functional: true, unread: 0 },
  {
    id: "maria-rodriguez", name: "María Rodríguez", initials: "MR", color: "#7C3AED", unread: 2,
    messages: [
      { id: "1", sender: "user", content: "Buenas tardes, ¿podrían enviarme la cotización?", timestamp: at("09:12") },
      { id: "2", sender: "ai", content: "¡Claro, María! Con gusto. ¿Para qué fecha la necesitas?", timestamp: at("09:12") },
      { id: "3", sender: "user", content: "Para el viernes, por favor.", timestamp: at("09:14") },
      { id: "4", sender: "ai", content: "Perfecto, la tendrás lista antes del viernes.", timestamp: at("09:14") },
    ],
  },
  {
    id: "empresa-xyz", name: "Empresa XYZ", initials: "XY", color: "#0891B2", unread: 0,
    messages: [
      { id: "1", sender: "user", content: "Necesitamos coordinar una reunión con su equipo.", timestamp: at("08:40") },
      { id: "2", sender: "human", content: "Hola, soy Camila. ¿Te va bien el miércoles a las 10:00?", timestamp: at("08:55") },
      { id: "3", sender: "user", content: "Sí, nos funciona. Gracias.", timestamp: at("08:58") },
    ],
  },
  {
    id: "juan-perez", name: "Juan Pérez", initials: "JP", color: "#DB2777", unread: 0,
    messages: [
      { id: "1", sender: "user", content: "¿Cuál es la diferencia entre una app web y una móvil?", timestamp: at("18:20") },
      { id: "2", sender: "ai", content: "Una app web se usa desde el navegador; una móvil se instala desde la tienda de aplicaciones.", timestamp: at("18:20") },
    ],
  },
  {
    id: "nuevo-contacto", name: "Nuevo contacto", initials: "NC", color: "#64748B", unread: 1,
    messages: [{ id: "1", sender: "user", content: "Hola", timestamp: at("07:55") }],
  },
];
