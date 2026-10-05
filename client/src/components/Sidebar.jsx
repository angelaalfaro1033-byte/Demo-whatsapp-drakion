import { MessageSquare } from "lucide-react";
import { formatTime } from "../utils.js";

function Avatar({ contact }) {
  return (
    <span className="avatar" style={{ background: contact.color }} aria-hidden="true">
      {contact.initials}
    </span>
  );
}

export default function Sidebar({ contacts, activeId, onSelect, open, onClose, previews }) {
  return (
    <>
      <div className={`sidebar-overlay ${open ? "is-visible" : ""}`} onClick={onClose} />
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <header className="sidebar-header">
          <MessageSquare size={20} />
          <h1>Conversaciones</h1>
          <span className="demo-badge">DEMO</span>
        </header>
        <ul className="contact-list">
          {contacts.map((contact) => {
            const preview = previews[contact.id];
            return (
              <li key={contact.id}>
                <button
                  type="button"
                  className={`contact ${contact.id === activeId ? "is-active" : ""}`}
                  onClick={() => onSelect(contact.id)}
                >
                  <Avatar contact={contact} />
                  <span className="contact-body">
                    <span className="contact-row">
                      <span className="contact-name">{contact.name}</span>
                      <span className="contact-time">{preview.time}</span>
                    </span>
                    <span className="contact-row">
                      <span className="contact-preview">{preview.text}</span>
                      {contact.unread > 0 && <span className="unread">{contact.unread}</span>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}

export function lastMessagePreview(messages, fallback) {
  const last = [...messages].reverse().find((m) => m.sender !== "system" && m.sender !== "error");
  if (!last) return { text: fallback, time: "" };
  const prefix = last.sender === "user" ? "" : last.sender === "human" ? "Asesor: " : "IA: ";
  return { text: `${prefix}${last.content}`, time: formatTime(last.timestamp) };
}
