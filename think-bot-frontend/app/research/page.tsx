"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { loadSession, clearSession } from "@/lib/session";
import { initClient } from "@/lib/langgraph";

const ChatInterface = dynamic(() => import("@/components/ChatInterface"), { ssr: false });

export default function ResearchPage() {
  const router  = useRouter();
  const [ready, setReady] = useState(false);
  const [err,   setErr]   = useState<string | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.replace("/setup");
      return;
    }
    try {
      initClient(session);
      setReady(true);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to initialize client.");
    }
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  if (err) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="glass-elevated p-8 max-w-md text-center space-y-4" style={{ borderColor: "var(--rose)", borderRadius: 12 }}>
          <p className="font-display text-sm" style={{ color: "var(--rose)" }}>INIT ERROR</p>
          <p className="font-mono text-xs" style={{ color: "var(--subtle)" }}>{err}</p>
          <button onClick={() => router.push("/setup")} className="btn-primary">
            RECONFIGURE
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{
              width: 22, height: 22,
              border: "1.5px solid var(--accent)",
              borderTopColor: "transparent",
              borderRadius: "50%",
            }}
          />
          <span className="font-mono text-sm" style={{ color: "var(--muted)" }}>
            LOADING TERMINAL…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden" style={{ background: "var(--bg)" }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="h-full"
      >
        <ChatInterface onLogout={handleLogout} />
      </motion.div>
    </div>
  );
}
