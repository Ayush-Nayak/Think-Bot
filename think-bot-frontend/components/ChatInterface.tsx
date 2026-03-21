"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MessageRenderer from "./MessageRenderer";
import AgentPipeline, { AGENTS } from "./AgentPipeline";
import { streamResearch, createThread, type AgentName, type ChatMessage } from "@/lib/langgraph";

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="typing-dot"
          style={{
            width: 5, height: 5,
            borderRadius: "50%",
            background: "var(--accent)",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

interface ChatInterfaceProps {
  onLogout: () => void;
}

export default function ChatInterface({ onLogout }: ChatInterfaceProps) {
  const [messages,         setMessages]         = useState<ChatMessage[]>([]);
  const [input,            setInput]            = useState("");
  const [threadId,         setThreadId]         = useState<string | null>(null);
  const [isStreaming,      setIsStreaming]       = useState(false);
  const [currentAgent,     setCurrentAgent]     = useState<AgentName | null>(null);
  const [completedAgents,  setCompletedAgents]  = useState<Set<AgentName>>(new Set());
  const [notionSaved,      setNotionSaved]      = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [threadInit,       setThreadInit]       = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Create thread on mount
  useEffect(() => {
    createThread()
      .then((id) => { setThreadId(id); setThreadInit(true); })
      .catch(() => { setError("Failed to connect to the LangGraph server. Check your Deployment URL."); setThreadInit(true); });
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const sendMessage = useCallback(async () => {
    const msg = input.trim();
    if (!msg || isStreaming || !threadId) return;

    setInput("");
    setError(null);
    setNotionSaved(false);
    setCurrentAgent(null);
    setCompletedAgents(new Set());
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "human",
      content: msg,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const aiMsgId = `ai_${Date.now()}`;
    let aiMsgAdded = false;

    try {
      for await (const event of streamResearch(threadId, msg)) {
        switch (event.type) {
          case "agent_update": {
            const agent = event.agentName!;
            setCurrentAgent(agent);
            setCompletedAgents((prev) => {
              const idx = AGENTS.findIndex((a) => a.id === agent);
              const newSet = new Set(prev);
              for (let i = 0; i < idx; i++) newSet.add(AGENTS[i].id);
              return newSet;
            });
            break;
          }
          case "message_chunk": {
            const chunk = event.chunk ?? "";
            if (!aiMsgAdded) {
              aiMsgAdded = true;
              setMessages((prev) => [
                ...prev,
                { id: aiMsgId, role: "ai", content: chunk, isStreaming: true },
              ]);
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, content: chunk, isStreaming: true } : m
                )
              );
            }
            break;
          }
          case "notion_saved": {
            setNotionSaved(true);
            break;
          }
          case "error": {
            setError(event.error ?? "An error occurred.");
            break;
          }
          case "done": {
            setCompletedAgents((prev) => {
              const newSet = new Set(prev);
              AGENTS.forEach((a) => newSet.add(a.id));
              return newSet;
            });
            setCurrentAgent(null);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, isStreaming: false } : m
              )
            );
            break;
          }
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "Stream error.");
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, threadId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetThread = async () => {
    setMessages([]);
    setCurrentAgent(null);
    setCompletedAgents(new Set());
    setNotionSaved(false);
    setError(null);
    try {
      const id = await createThread();
      setThreadId(id);
    } catch {
      setError("Failed to create new thread.");
    }
  };

  return (
    <div className="flex h-full" style={{ background: "var(--bg)" }}>
      {/* ── Sidebar: Agent Pipeline ── */}
      <div
        className="glass-subtle flex-shrink-0 h-full"
        style={{ borderRight: "1px solid var(--border-faint)" }}
      >
        <AgentPipeline
          currentAgent={currentAgent}
          completedAgents={completedAgents}
          notionSaved={notionSaved}
        />
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Header */}
        <header
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border-faint)" }}
        >
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-display text-base font-bold text-gradient" style={{ letterSpacing: "0.12em" }}>
                THINK-BOT
              </h1>
              <p className="font-mono text-xs" style={{ color: "var(--muted)", fontSize: "0.62rem" }}>
                MULTI-AGENT RESEARCH TERMINAL
              </p>
            </div>
            {threadId && (
              <div
                className="glass-subtle px-2.5 py-1 font-mono text-xs hidden md:block"
                style={{ color: "var(--subtle)", fontSize: "0.62rem", borderRadius: 6 }}
              >
                THREAD: {threadId.slice(0, 8)}…
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetThread}
              disabled={isStreaming}
              className="btn-ghost"
              title="New research session"
            >
              ↺ New Thread
            </button>
            <button onClick={onLogout} className="btn-ghost" style={{ color: "var(--rose)", borderColor: "rgba(251,113,133,0.2)" }}>
              ⏻ Logout
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollable px-6 py-6 space-y-5">
          {/* Empty state */}
          {messages.length === 0 && threadInit && !error && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center h-full text-center gap-6"
            >
              <div className="animate-float">
                <div
                  style={{
                    width: 72, height: 72, borderRadius: "50%",
                    border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(124, 92, 252, 0.05)",
                    boxShadow: "var(--glow-s)",
                    fontSize: 28,
                  }}
                >
                  ⬡
                </div>
              </div>
              <div>
                <p className="font-display text-lg font-semibold" style={{ color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
                  READY TO RESEARCH
                </p>
                <p className="text-sm mt-2" style={{ color: "var(--subtle)" }}>
                  Type a topic or question below to deploy the agent pipeline.
                </p>
              </div>
              <div
                className="glass-elevated p-5 max-w-sm text-left space-y-2"
                style={{ borderRadius: 10 }}
              >
                <p className="font-mono text-xs" style={{ color: "var(--subtle)", fontSize: "0.68rem" }}>
                  Try asking:
                </p>
                {[
                  "Latest advances in quantum computing 2024",
                  "How is AI being used in drug discovery?",
                  "Explain the geopolitics of rare earth minerals",
                ].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => { setInput(ex); textareaRef.current?.focus(); }}
                    className="block w-full text-left text-xs px-3 py-2.5"
                    style={{
                      background: "rgba(124, 92, 252, 0.04)",
                      border: "1px solid var(--border-faint)",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.25s",
                      fontFamily: "'Inter', sans-serif",
                      borderRadius: 6,
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = "var(--border)"; (e.target as HTMLElement).style.color = "var(--violet)"; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = "var(--border-faint)"; (e.target as HTMLElement).style.color = "var(--text-secondary)"; }}
                  >
                    &ldquo;{ex}&rdquo;
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading thread init */}
          {!threadInit && (
            <div className="flex items-center justify-center h-full gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ width: 20, height: 20, border: "1.5px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%" }}
              />
              <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>
                INITIALIZING THREAD…
              </span>
            </div>
          )}

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass p-4 text-sm font-mono"
                style={{ borderColor: "var(--rose)", color: "var(--rose)", fontSize: "0.8rem", borderRadius: 8 }}
              >
                ✗ {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message list */}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`flex ${msg.role === "human" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "human" ? (
                  <div
                    className="max-w-lg px-5 py-3.5 text-sm font-medium"
                    style={{
                      background: "var(--gradient-cool)",
                      border: "none",
                      borderRadius: "18px 18px 4px 18px",
                      color: "#fff",
                      lineHeight: 1.6,
                      boxShadow: "0 8px 24px rgba(56,217,245,0.25)",
                      textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className="max-w-3xl w-full glass-elevated p-6 gradient-border-card"
                    style={{ borderRadius: "4px 18px 18px 18px" }}
                  >
                    <div
                      className="flex items-center gap-2.5 mb-3 pb-3"
                      style={{ borderBottom: "1px solid var(--border-faint)" }}
                    >
                      <div
                        style={{
                          width: 20, height: 20, borderRadius: "50%",
                          border: "1.5px solid var(--accent)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, color: "var(--accent)",
                          background: "rgba(124, 92, 252, 0.08)",
                        }}
                      >
                        ⬡
                      </div>
                      <span
                        className="font-display"
                        style={{ color: "var(--violet)", letterSpacing: "0.15em", fontSize: "0.75rem", fontWeight: 700 }}
                      >
                        THINK-BOT SYSTEM
                      </span>
                    </div>
                    <MessageRenderer content={msg.content} isStreaming={msg.isStreaming} />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {isStreaming && messages[messages.length - 1]?.role !== "ai" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass inline-block"
                style={{ borderRadius: "2px 8px 8px 8px" }}
              >
                <TypingDots />
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{ borderTop: "1px solid var(--border-faint)" }}
        >
          <div
            className="flex gap-3 items-end glass-elevated"
            style={{ borderRadius: 10, padding: "0.6rem 0.85rem" }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Research any topic… (Enter to send, Shift+Enter for new line)"
              disabled={isStreaming || !threadId}
              rows={1}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "0.88rem",
                lineHeight: 1.6,
                resize: "none",
                maxHeight: 160,
                paddingTop: "0.4rem",
                paddingBottom: "0.4rem",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isStreaming || !input.trim() || !threadId}
              className="flex-shrink-0 font-display text-xs flex items-center justify-center"
              style={{
                width: 38, height: 38,
                borderRadius: 8,
                border: `1.5px solid ${isStreaming ? "var(--border-faint)" : "var(--accent)"}`,
                background: isStreaming ? "transparent" : "rgba(124, 92, 252, 0.12)",
                color: isStreaming ? "var(--muted)" : "var(--accent)",
                cursor: isStreaming ? "not-allowed" : "pointer",
                transition: "all 0.25s",
                flexShrink: 0,
              }}
              title="Send (Enter)"
            >
              {isStreaming ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  style={{ width: 14, height: 14, border: "1.5px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%" }}
                />
              ) : "→"}
            </button>
          </div>
          <p
            className="text-xs mt-2 text-center font-mono"
            style={{ color: "var(--muted)", fontSize: "0.58rem" }}
          >
            ENTER TO SEND · SHIFT+ENTER FOR NEW LINE · RESULTS SAVED TO YOUR NOTION
          </p>
        </div>
      </div>
    </div>
  );
}
