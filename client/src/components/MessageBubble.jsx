import { CirclePause, CirclePlay, CircleAlert } from "lucide-react";
import { formatTime } from "../utils.js";

function Notice({ message }) {
  const isPaused = message.variant === "paused";
  const Icon = isPaused ? CirclePause : CirclePlay;
  return (
    <div className={`notice ${isPaused ? "notice--paused" : "notice--resumed"}`}>
      <Icon size={18} />
      <div>
        <strong>{message.title}</strong>
        <p>{message.content}</p>
      </div>
    </div>
  );
}

export default function MessageBubble({ message }) {
  if (message.sender === "system") return <Notice message={message} />;

  if (message.sender === "error") {
    return (
      <div className="notice notice--error" role="alert">
        <CircleAlert size={18} />
        <p>{message.content}</p>
      </div>
    );
  }

  const label = message.sender === "ai" ? "IA" : message.sender === "human" ? "Asesor" : null;
  return (
    <div className={`bubble-row bubble-row--${message.sender}`}>
      <div className={`bubble bubble--${message.sender}`}>
        {label && <span className={`bubble-label bubble-label--${message.sender}`}>{label}</span>}
        <p className="bubble-text">{message.content}</p>
        <time className="bubble-time">{formatTime(message.timestamp)}</time>
      </div>
    </div>
  );
}
