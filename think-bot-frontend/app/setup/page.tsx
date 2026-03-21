"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { saveSession, type ThinkBotSession } from "@/lib/session";
import { initClient } from "@/lib/langgraph";

const NeuralCanvas = dynamic(() => import("@/components/NeuralCanvas"), { ssr: false });

interface Field {
  key:         keyof ThinkBotSession;
  label:       string;
  placeholder: string;
  hint:        string;
  link:        string;
  linkLabel:   string;
  required:    boolean;
  fixed?:      boolean;
}

const FIELDS: Field[] = [
  {
    key:         "deploymentUrl",
    label:       "LangGraph Deployment URL",
    placeholder: "https://think-bot.onrender.com",
    hint:        "Hardcoded central AI server configuration",
    link:        "https://think-bot.onrender.com",
    linkLabel:   "Server",
    required:    true,
    fixed:       true,
  },
  {
    key:         "assistantId",
    label:       "Assistant / Graph ID",
    placeholder: "deep_researcher",
    hint:        "The locked AI research agent graph",
    link:        "https://github.com/Ayush-Nayak/Think-Bot/blob/main/langgraph.json",
    linkLabel:   "langgraph.json",
    required:    true,
    fixed:       true,
  },
  {
    key:         "groqApiKey",
    label:       "Groq API Key",
    placeholder: "gsk_...",
    hint:        "Powers all AI agents (Llama 3.3 70B) — free at console.groq.com",
    link:        "https://console.groq.com/keys",
    linkLabel:   "Groq Console",
    required:    true,
  },
  {
    key:         "tavilyApiKey",
    label:       "Tavily Search API Key",
    placeholder: "tvly-...",
    hint:        "Real-time web search for the Researcher agent",
    link:        "https://tavily.com/",
    linkLabel:   "Tavily Dashboard",
    required:    true,
  },
  {
    key:         "notionToken",
    label:       "Notion Integration Token",
    placeholder: "secret_...",
    hint:        "Allows the Finalizer agent to save reports to Notion",
    link:        "https://www.notion.so/my-integrations",
    linkLabel:   "Notion Integrations",
    required:    true,
  },
  {
    key:         "notionDatabaseId",
    label:       "Notion Database ID",
    placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    hint:        "The target Notion database for saved reports",
    link:        "https://developers.notion.com/docs/working-with-databases",
    linkLabel:   "How to find it",
    required:    true,
  },
  {
    key:         "langsmithApiKey",
    label:       "LangSmith API Key",
    placeholder: "lsv2_...",
    hint:        "Enables full agent observability & tracing",
    link:        "https://smith.langchain.com/",
    linkLabel:   "LangSmith",
    required:    false,
  },
];

export default function SetupPage() {
  const router = useRouter();

  const [values, setValues] = useState<Record<string, string>>({
    deploymentUrl:    "https://think-bot.onrender.com",
    assistantId:      "deep_researcher",
    groqApiKey:       "",
    tavilyApiKey:     "",
    notionToken:      "",
    notionDatabaseId: "",
    langsmithApiKey:  "",
  });

  const [showKeys,   setShowKeys]   = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [err,        setErr]        = useState<string | null>(null);

  const setValue = (key: string, val: string) =>
    setValues((v) => ({ ...v, [key]: val }));

  const isFieldValid = (f: Field) =>
    !f.required || values[f.key]?.trim().length > 0;

  const allValid = FIELDS.every(isFieldValid);

  const filledCount = FIELDS.filter((f) => f.required && values[f.key]?.trim().length > 0).length;
  const totalRequired = FIELDS.filter((f) => f.required).length;

  const handleSubmit = async () => {
    if (!allValid) return;
    setErr(null);
    setSubmitting(true);

    const session: ThinkBotSession = {
      deploymentUrl:    values.deploymentUrl.trim(),
      assistantId:      values.assistantId.trim(),
      groqApiKey:       values.groqApiKey.trim(),
      tavilyApiKey:     values.tavilyApiKey.trim(),
      notionToken:      values.notionToken.trim(),
      notionDatabaseId: values.notionDatabaseId.trim(),
      langsmithApiKey:  values.langsmithApiKey.trim() || undefined,
    };

    try {
      initClient(session);
      saveSession(session);
      router.push("/research");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to initialize. Check your Deployment URL.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden flex items-center justify-center"
      style={{ background: "var(--bg)" }}
    >
      <NeuralCanvas opacity={0.2} />
      <div className="absolute inset-0 grid-overlay" style={{ opacity: 0.4 }} />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 glass-elevated w-full mx-4 overflow-y-auto scrollable"
        style={{ maxWidth: 560, maxHeight: "92vh", borderRadius: 14, padding: "2.5rem" }}
      >
        <button onClick={() => router.push("/")} className="btn-ghost mb-6" style={{ fontSize: "0.73rem" }}>
          ← Back
        </button>

        <div className="mb-8">
          <p className="font-mono text-xs mb-1.5" style={{ color: "var(--subtle)", letterSpacing: "0.15em" }}>
            CONFIGURATION
          </p>
          <h2 className="font-display font-bold text-gradient" style={{ fontSize: "1.5rem", letterSpacing: "0.08em" }}>
            CONFIGURE TERMINAL
          </h2>
          <p className="text-sm mt-2.5" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Enter your API keys to activate the research agents. Keys are stored{" "}
            <strong style={{ color: "var(--amber)" }}>only in this browser session</strong>{" "}
            and are never sent to our servers.
          </p>

          {/* Progress bar */}
          <div className="mt-4" style={{ height: 3, background: "var(--border-faint)", borderRadius: 2 }}>
            <motion.div
              animate={{ width: `${(filledCount / totalRequired) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{
                height: "100%",
                borderRadius: 2,
                background: filledCount === totalRequired
                  ? "var(--emerald)"
                  : "linear-gradient(90deg, var(--accent), var(--cyan))",
              }}
            />
          </div>
          <p className="font-mono text-xs mt-1.5" style={{ color: "var(--muted)", fontSize: "0.6rem" }}>
            {filledCount}/{totalRequired} required fields completed
          </p>
        </div>

        <div className="space-y-5">
          {FIELDS.map((field, i) => {
            const val   = values[field.key] || "";
            const valid = field.required ? val.trim().length > 0 : true;
            const show  = showKeys[field.key];
            const isText = field.key === "deploymentUrl" || field.key === "assistantId";

            return (
              <motion.div
                key={field.key}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.35 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    className="font-display text-xs"
                    style={{
                      color: valid && val ? "var(--violet)" : "var(--text-secondary)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      fontSize: "0.7rem",
                      transition: "color 0.3s",
                      fontWeight: valid && val ? 600 : 400,
                    }}
                  >
                    {field.label}
                    {!field.required && (
                      <span style={{ color: "var(--muted)", marginLeft: 6, fontWeight: 400, textTransform: "none", fontSize: "0.62rem" }}>
                        optional
                      </span>
                    )}
                  </label>
                  <a
                    href={field.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono"
                    style={{ color: "var(--muted)", fontSize: "0.6rem", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--violet)")}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--muted)")}
                  >
                    {field.linkLabel} ↗
                  </a>
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    type={show || isText ? "text" : "password"}
                    value={val}
                    onChange={(e) => {
                      if (!field.fixed) setValue(field.key, e.target.value);
                    }}
                    placeholder={field.placeholder}
                    className={`input-field ${valid && val ? "valid" : ""}`}
                    style={{ 
                      paddingRight: isText ? "1rem" : "2.8rem",
                      opacity: field.fixed ? 0.7 : 1,
                      cursor: field.fixed ? "not-allowed" : "text",
                      backgroundColor: field.fixed ? "rgba(0,0,0,0.2)" : undefined
                    }}
                    readOnly={field.fixed}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {!isText && (
                    <button
                      type="button"
                      onClick={() => setShowKeys((s) => ({ ...s, [field.key]: !s[field.key] }))}
                      style={{
                        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--muted)", fontSize: 14, transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "var(--violet)")}
                      onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "var(--muted)")}
                    >
                      {show ? "◌" : "●"}
                    </button>
                  )}
                </div>

                <p className="mt-1 font-mono" style={{ color: "var(--muted)", fontSize: "0.62rem" }}>
                  {field.hint}
                </p>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {err && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 font-mono text-xs"
              style={{ color: "var(--rose)" }}
            >
              ✗ {err}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleSubmit}
          disabled={!allValid || submitting}
          className="btn-primary w-full mt-8 holo-border"
          style={{
            opacity: allValid && !submitting ? 1 : 0.4,
            cursor: allValid && !submitting ? "pointer" : "not-allowed",
            borderRadius: 10,
          }}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                style={{ display: "inline-block", width: 14, height: 14, border: "1.5px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%" }}
              />
              CONNECTING…
            </span>
          ) : "DEPLOY RESEARCH SYSTEM →"}
        </motion.button>

        <p className="mt-4 text-center font-mono" style={{ color: "var(--muted)", fontSize: "0.58rem", lineHeight: 1.8 }}>
          🔒 Keys stored only in{" "}
          <code style={{ color: "var(--text-secondary)", background: "rgba(124,92,252,0.08)", padding: "0.1em 0.3em", borderRadius: 3, fontSize: "0.56rem" }}>sessionStorage</code>.
          Wiped automatically when you close this tab.
        </p>
      </motion.div>
    </div>
  );
}
