import { useMemo, useState } from "react";
import Sidebar, { lastMessagePreview } from "./components/Sidebar.jsx";
import ChatHeader from "./components/ChatHeader.jsx";
import MessageList from "./components/MessageList.jsx";
import Composer from "./components/Composer.jsx";
import { useConversation } from "./hooks/useConversation.js";
import { contacts, DEMO_CONVERSATION_ID } from "./data/contacts.js";
import { getSessionId } from "./utils.js";

export default function App() {
  const [activeId, setActiveId] = useState(DEMO_CONVERSATION_ID);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessionId] = useState(getSessionId);
  const demo = useConversation(sessionId);

  const activeContact = contacts.find((c) => c.id === activeId);
  const isDemoActive = activeContact.functional === true;

  const previews = useMemo(() => {
    const result = {};
    for (const contact of contacts) {
      const messages = contact.functional ? demo.messages : contact.messages;
      const fallback = contact.functional ? "Escribe para iniciar" : "";
      result[contact.id] = lastMessagePreview(messages, fallback);
    }
    return result;
  }, [demo.messages]);

  function handleSelect(id) {
    setActiveId(id);
    setSidebarOpen(false);
  }

  return (
    <div className="app">
      <Sidebar
        contacts={contacts}
        activeId={activeId}
        previews={previews}
        open={sidebarOpen}
        onSelect={handleSelect}
        onClose={() => setSidebarOpen(false)}
      />
      <main className={`chat ${isDemoActive && !demo.automationActive ? "chat--human" : ""}`}>
        <ChatHeader
          contact={activeContact}
          automationActive={demo.automationActive}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        {isDemoActive ? (
          <>
            <MessageList
              messages={demo.messages}
              isTyping={demo.isTyping}
              isLoading={demo.isLoading}
              emptyText="Pregunta por los servicios de Maquitrans o solicita orientación para cotizar un equipo. Esta demo no incluye tarifas."
            />
            <Composer
              automationActive={demo.automationActive}
              isTyping={demo.isTyping}
              onSend={demo.sendMessage}
              onTogglePause={demo.toggleAutomation}
            />
          </>
        ) : (
          <>
            <MessageList messages={activeContact.messages} isTyping={false} isLoading={false} emptyText="" />
            <p className="readonly-note">Conversación de ejemplo. Selecciona «Maquitrans S.A.S.» para probar la IA.</p>
          </>
        )}
      </main>
    </div>
  );
}
