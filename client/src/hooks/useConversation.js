import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { localMessage } from "../utils.js";

export function useConversation(conversationId) {
  const [messages, setMessages] = useState([]);
  const [automationActive, setAutomationActive] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const append = useCallback((message) => setMessages((prev) => [...prev, message]), []);
  const appendError = useCallback((text) => append(localMessage("error", text)), [append]);

  // Restaura el historial desde el backend (por ejemplo, al recargar la página).
  useEffect(() => {
    let cancelled = false;
    api
      .getConversation(conversationId)
      .then((conversation) => {
        if (cancelled) return;
        setMessages(conversation.messages);
        setAutomationActive(conversation.automationActive);
      })
      .catch((err) => !cancelled && appendError(err.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [conversationId, appendError]);

  const sendMessage = useCallback(
    async (text) => {
      if (automationActive) {
        // Modo IA: el mensaje del usuario se envía a Groq a través del backend.
        append(localMessage("user", text));
        setIsTyping(true);
        try {
          const { aiMessage } = await api.sendChat(conversationId, text);
          append(aiMessage);
        } catch (err) {
          if (err.code !== "automation_paused") appendError(err.message);
        } finally {
          setIsTyping(false);
        }
        return;
      }
      // Modo humano: el mensaje se registra como respuesta del asesor, sin llamar a Groq.
      try {
        const { message } = await api.sendHuman(conversationId, text);
        append(message);
      } catch (err) {
        appendError(err.message);
      }
    },
    [automationActive, conversationId, append, appendError]
  );

  const toggleAutomation = useCallback(async () => {
    const next = !automationActive;
    try {
      const result = await api.setAutomation(conversationId, next);
      setAutomationActive(result.automationActive);
      if (!result.automationActive) setIsTyping(false);
      append(result.event);
    } catch (err) {
      appendError(err.message);
    }
  }, [automationActive, conversationId, append, appendError]);

  return { messages, automationActive, isTyping, isLoading, sendMessage, toggleAutomation };
}
