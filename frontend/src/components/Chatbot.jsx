import { useState, useRef, useEffect } from "react";
import "./Chatbot.css";


// Convierte [texto](url) en links clicables, respetando el resto del texto
const renderMessage = (content) => {
  const parts = content.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\))/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (match) {
      return (
        <a
          key={i}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'inherit',
            textDecoration: 'underline',
            textDecorationColor: 'rgba(0,0,0,0.3)',
            textUnderlineOffset: '2px',
          }}
        >
          {match[1]}
        </a>
      );
    }
    return part;
  });
};

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "¡Hola! Soy Luna, tu asistente de SY Studio ✨ ¿En qué te puedo ayudar hoy?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [appeared, setAppeared] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const BASE = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL}/api`
        : "/api";

      const response = await fetch(`${BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "En este momento no puedo responder 🌸 Intentá en unos segundos.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Hubo un problema de conexión. Por favor, intentá de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Bubble button */}
      <button
        className={`chatbot-bubble ${appeared ? "chatbot-bubble--visible" : ""} ${open ? "chatbot-bubble--open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir chat"
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="chatbot-bubble__icon">
              <path d="M3 5C3 3.89543 3.89543 3 5 3H15C16.1046 3 17 3.89543 17 5V12C17 13.1046 16.1046 14 15 14H11L7 17V14H5C3.89543 14 3 13.1046 3 12V5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              <circle cx="7" cy="8.5" r="1" fill="currentColor"/>
              <circle cx="10" cy="8.5" r="1" fill="currentColor"/>
              <circle cx="13" cy="8.5" r="1" fill="currentColor"/>
            </svg>
            <span className="chatbot-bubble__label">¡Hablemos!</span>
          </>
        )}
      </button>

      {/* Chat window */}
      <div className={`chatbot-window ${open ? "chatbot-window--open" : ""}`}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header__avatar">
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="23" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M24 8 C24 8, 34 18, 34 26 C34 31.5 29.5 36 24 36 C18.5 36 14 31.5 14 26 C14 18 24 8 24 8Z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="24" cy="26" r="3" fill="currentColor" opacity="0.5"/>
            </svg>
          </div>
          <div className="chatbot-header__info">
            <span className="chatbot-header__name">Luna</span>
            <span className="chatbot-header__status">
              <span className="chatbot-header__dot" />
              Asistente de SY Studio
            </span>
          </div>
          <button className="chatbot-header__close" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chatbot-msg chatbot-msg--${msg.role}`}>
              {msg.role === "assistant" && (
                <div className="chatbot-msg__icon">✦</div>
              )}
              <div className="chatbot-msg__bubble">{msg.role === 'assistant' ? renderMessage(msg.content) : msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="chatbot-msg chatbot-msg--assistant">
              <div className="chatbot-msg__icon">✦</div>
              <div className="chatbot-msg__bubble chatbot-msg__bubble--loading">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chatbot-input-area">
          <input
            ref={inputRef}
            className="chatbot-input"
            placeholder="Escribí tu consulta..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button
            className={`chatbot-send ${input.trim() && !loading ? "chatbot-send--active" : ""}`}
            onClick={sendMessage}
            disabled={!input.trim() || loading}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </>
  );
};

export default Chatbot;