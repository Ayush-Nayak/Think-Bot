"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentName } from "@/lib/langgraph";

export const AGENTS: { id: AgentName; label: string; icon: string; desc: string }[] = [
  { id: "clarify_with_user", label: "Clarify",    icon: "◈", desc: "Refines your query" },
  { id: "planner_agent",     label: "Plan",       icon: "◉", desc: "Builds research strategy" },
  { id: "researcher_agent",  label: "Research",   icon: "⬡", desc: "Searches the web via Tavily" },
  { id: "synthesis_agent",   label: "Synthesize", icon: "◎", desc: "Organizes raw findings" },
  { id: "writer_agent",      label: "Write",      icon: "◷", desc: "Drafts the report" },
  { id: "critic_agent",      label: "Critique",   icon: "◬", desc: "Reviews & improves quality" },
  { id: "finalizer",         label: "Finalize",   icon: "◆", desc: "Saves to Notion" },
];

type AgentStatus = "idle" | "active" | "done" | "error";

interface AgentPipelineProps {
  currentAgent: AgentName | null;
  completedAgents: Set<AgentName>;
  errorAgent?: AgentName | null;
  notionSaved?: boolean;
}

function statusOf(
  id: AgentName,
  current: AgentName | null,
  completed: Set<AgentName>,
  error?: AgentName | null
): AgentStatus {
  if (error === id) return "error";
  if (id === current)       return "active";
  if (completed.has(id))    return "done";
  return "idle";
}

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle:   "var(--muted)",
  active: "var(--accent)",
  done:   "var(--emerald)",
  error:  "var(--rose)",
};

export default function AgentPipeline({
  currentAgent,
  completedAgents,
  errorAgent,
  notionSaved,
}: AgentPipelineProps) {
  return (
    <aside className="flex flex-col h-full py-6 px-5 select-none" style={{ minWidth: 210, maxWidth: 210 }}>
      {/* Header */}
      <div className="mb-6">
        <p
          className="font-display text-xs tracking-widest uppercase mb-2"
          style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}
        >
          Agent Pipeline
        </p>
        <div style={{ height: 1, background: "linear-gradient(90deg, var(--accent), transparent)" }} />
      </div>

      {/* Nodes */}
      <div className="flex flex-col gap-0 flex-1">
        {AGENTS.map((agent, i) => {
          const status = statusOf(agent.id, currentAgent, completedAgents, errorAgent);
          const color  = STATUS_COLORS[status];
          const isLast = i === AGENTS.length - 1;
          const nextStatus = !isLast
            ? statusOf(AGENTS[i + 1].id, currentAgent, completedAgents, errorAgent)
            : "idle";

          return (
            <div key={agent.id} className="flex gap-3" style={{ position: "relative" }}>
              {/* Vertical connector line */}
              {!isLast && (
                <div
                  style={{
                    position: "absolute",
                    left: 16,
                    top: 34,
                    width: 2,
                    height: "calc(100% - 8px)",
                    borderRadius: 1,
                    background:
                      nextStatus === "done" || nextStatus === "active"
                        ? undefined
                        : "var(--border-faint)",
                    transition: "background 0.6s ease",
                    zIndex: 0,
                    overflow: "hidden",
                  }}
                  className={nextStatus === "done" || nextStatus === "active" ? "connector-active" : ""}
                />
              )}

              {/* Node circle */}
              <div style={{ position: "relative", zIndex: 1, flexShrink: 0 }}>
                <motion.div
                  animate={
                    status === "active"
                      ? {
                          boxShadow: [
                            "0 0 8px var(--accent), 0 0 20px rgba(124,92,252,0.3)",
                            "0 0 18px var(--accent), 0 0 45px rgba(124,92,252,0.5)",
                            "0 0 8px var(--accent), 0 0 20px rgba(124,92,252,0.3)",
                          ],
                        }
                      : {}
                  }
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    width: 33,
                    height: 33,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1.5px solid ${color}`,
                    background:
                      status === "active"
                        ? "rgba(124, 92, 252, 0.15)"
                        : status === "done"
                        ? "rgba(52, 211, 153, 0.08)"
                        : status === "error"
                        ? "rgba(251, 113, 133, 0.08)"
                        : "rgba(45, 58, 82, 0.2)",
                    transition: "all 0.4s ease",
                  }}
                >
                  <span style={{ fontSize: 12, color, transition: "color 0.4s" }}>
                    {status === "done"
                      ? "✓"
                      : status === "error"
                      ? "✗"
                      : agent.icon}
                  </span>
                </motion.div>
              </div>

              {/* Label & desc */}
              <div className="pb-5 pt-1.5" style={{ minHeight: 42 }}>
                <p
                  className="font-display text-xs leading-tight"
                  style={{
                    color:
                      status === "idle" ? "var(--subtle)" :
                      status === "active" ? "var(--violet)" :
                      status === "done" ? "var(--emerald)" :
                      "var(--rose)",
                    letterSpacing: "0.05em",
                    fontWeight: status === "active" ? 600 : 400,
                    transition: "all 0.4s",
                  }}
                >
                  {agent.label}
                </p>
                <AnimatePresence>
                  {status === "active" && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs mt-0.5"
                      style={{ color: "var(--text-secondary)", fontSize: "0.66rem" }}
                    >
                      {agent.desc}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notion Save Badge */}
      <AnimatePresence>
        {notionSaved && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="glass mt-4 p-3 text-center holo-border"
            style={{ borderColor: "var(--emerald)", borderRadius: 8 }}
          >
            <p className="font-display text-xs" style={{ color: "var(--emerald)", letterSpacing: "0.08em" }}>
              ✦ NOTION SAVED
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer system status */}
      <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border-faint)" }}>
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--emerald)", flexShrink: 0 }}
          />
          <span className="font-mono text-xs" style={{ color: "var(--muted)", fontSize: "0.62rem" }}>
            SYSTEM ONLINE
          </span>
        </div>
      </div>
    </aside>
  );
}
