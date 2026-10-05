import { Menu } from "lucide-react";

export default function ChatHeader({ contact, automationActive, onOpenSidebar }) {
  let status = null;
  if (contact.functional) {
    status = automationActive
      ? { label: "IA activa", className: "status--ai" }
      : { label: "Atención humana", className: "status--human" };
  } else {
    status = { label: "Solo lectura", className: "status--idle" };
  }

  return (
    <header className="chat-header">
      <button type="button" className="icon-btn menu-btn" onClick={onOpenSidebar} aria-label="Abrir conversaciones">
        <Menu size={20} />
      </button>
      <span className="avatar" style={{ background: contact.color }} aria-hidden="true">
        {contact.initials}
      </span>
      <div className="chat-header-info">
        <strong>{contact.name}</strong>
        <span className="chat-header-sub">Demo de automatización con IA</span>
      </div>
      <span className={`status ${status.className}`}>
        <span className="status-dot" />
        {status.label}
      </span>
    </header>
  );
}
