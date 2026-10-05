import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble.jsx";

export default function MessageList({ messages, isTyping, isLoading, emptyText }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  return (
    <div className="messages">
      {!isLoading && messages.length === 0 && <p className="empty-state">{emptyText}</p>}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isTyping && (
        <div className="bubble-row bubble-row--ai">
          <div className="bubble bubble--ai typing" aria-live="polite">
            <span className="bubble-label bubble-label--ai">IA</span>
            <span className="typing-text">IA está escribiendo</span>
            <span className="dots" aria-hidden="true">
              <i /><i /><i />
            </span>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
