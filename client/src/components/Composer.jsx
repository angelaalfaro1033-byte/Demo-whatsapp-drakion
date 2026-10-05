import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, Send } from "lucide-react";

export default function Composer({ automationActive, isTyping, onSend, onTogglePause }) {
  const [text, setText] = useState("");
  const [audioHint, setAudioHint] = useState(false);
  const hintTimer = useRef(null);

  useEffect(() => () => clearTimeout(hintTimer.current), []);

  const canSend = text.trim() !== "" && !isTyping;

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText("");
  }

  function handleAudio() {
    setAudioHint(true);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setAudioHint(false), 3000);
  }

  return (
    <div className="composer-wrap">
      {audioHint && <p className="composer-hint">Función de audio disponible en la versión completa.</p>}
      <form className="composer" onSubmit={handleSubmit}>
        <input
          className="composer-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={automationActive ? "Escribe un mensaje..." : "Responde como asesor humano..."}
          aria-label="Mensaje"
          maxLength={2000}
        />
        <button type="button" className="icon-btn" onClick={handleAudio} aria-label="Grabar audio (demo)">
          <Mic size={20} />
        </button>
        <button type="submit" className="send-btn" disabled={!canSend} aria-label="Enviar mensaje">
          <Send size={18} />
        </button>
        <button
          type="button"
          className={`pause-btn ${automationActive ? "" : "pause-btn--resume"}`}
          onClick={onTogglePause}
        >
          {automationActive ? <Pause size={18} /> : <Play size={18} />}
          {automationActive ? "Pausar IA" : "Reanudar IA"}
        </button>
      </form>
    </div>
  );
}
