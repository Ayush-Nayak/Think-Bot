"use client";
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useSpring, useMotionValue, useInView, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { hasSession } from "@/lib/session";

const NeuralCanvas = dynamic(() => import("@/components/NeuralCanvas"), { ssr: false });

const TITLE   = "THINK-BOT";
const TAGLINE = "Autonomous AI Research Matrix";

const STATS = [
  { label: "Neural Nodes",          value: "7",     icon: "◆" },
  { label: "Knowledge Depth",       value: "∞",     icon: "◎" },
  { label: "Synthesis Rate",        value: "<12s",  icon: "◷" },
  { label: "Persistent Memory",     value: "Active",icon: "⬡" },
];

const AGENTS = [
  { id: "01", name: "Clarifier",      desc: "Interrogates initial prompts to resolve ambiguity before execution.", grad: "from-violet-500 to-indigo-500" },
  { id: "02", name: "Planner",        desc: "Deconstructs complex research goals into highly parallelized execution trees.", grad: "from-indigo-500 to-cyan-500" },
  { id: "03", name: "Researcher",     desc: "Fires massive parallel queries via Tavily to crawl deep web sources.", grad: "from-cyan-500 to-teal-400" },
  { id: "04", name: "Synthesizer",    desc: "Aggregates raw HTML/Markdown data, extracting only high-signal intelligence.", grad: "from-teal-400 to-emerald-400" },
  { id: "05", name: "Drafter",        desc: "Compiles intelligence into structured, highly-readable markdown formats.", grad: "from-emerald-400 to-amber-500" },
  { id: "06", name: "Critic",         desc: "Relentlessly evaluates drafts against the original plan. Forces recursive revisions.", grad: "from-amber-500 to-rose-500" },
  { id: "07", name: "Finalizer",      desc: "Commits the approved, flawless analysis directly into Notion databases.", grad: "from-rose-500 to-pink-500" },
];

const BENTO_CARDS = [
  {
    title: "Zero Latency Inference",
    desc: "Powered exclusively by Groq's LPU architecture running Llama 3.3 70B. Experience multi-agent recursive loops executing in milliseconds.",
    colSpan: "col-span-1 md:col-span-2",
    rowSpan: "row-span-1",
    img: "⚡",
    grad: "from-violet-600/20 to-cyan-600/20"
  },
  {
    title: "StateGraph Architecture",
    desc: "LangGraph provides bulletproof state management and cyclic execution paths.",
    colSpan: "col-span-1",
    rowSpan: "row-span-2",
    img: "🕸️",
    grad: "from-cyan-600/20 to-emerald-600/20"
  },
  {
    title: "Deep Context Window",
    desc: "Maintains full context awareness across massive web scrapes without losing the core thread.",
    colSpan: "col-span-1",
    rowSpan: "row-span-1",
    img: "🧠",
    grad: "from-rose-600/20 to-orange-600/20"
  },
  {
    title: "Persistent Matrix",
    desc: "Native Notion integration ensures every extracted insight is immediately archived and indexable for eternity.",
    colSpan: "col-span-1 md:col-span-2",
    rowSpan: "row-span-1",
    img: "💾",
    grad: "from-blue-600/20 to-violet-600/20"
  }
];

// --- 3D Hover Card Component ---
const TiltCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 40 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 40 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);
  const glareX  = useTransform(mouseXSpring, [-0.5, 0.5], ["100%", "0%"]);
  const glareY  = useTransform(mouseYSpring, [-0.5, 0.5], ["100%", "0%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`relative w-full h-full rounded-2xl ${className}`}
    >
      <div 
        className="absolute inset-0 pointer-events-none rounded-2xl z-20"
        style={{
          background: "radial-gradient(circle at center, rgba(124, 92, 252, 0.15) 0%, transparent 80%)",
          maskImage: "linear-gradient(white, white)",
          WebkitMaskImage: "-webkit-linear-gradient(white, white)",
          mixBlendMode: "screen",
        }}
      >
        <motion.div
          style={{
            position: "absolute",
            width: "200%", height: "200%",
            left: "-50%", top: "-50%",
            background: "radial-gradient(circle at center, rgba(255,255,255,0.08) 0%, transparent 40%)",
            x: useTransform(glareX, (val) => `calc(${val} - 50%)`),
            y: useTransform(glareY, (val) => `calc(${val} - 50%)`),
            pointerEvents: "none",
          }}
        />
      </div>
      {children}
    </motion.div>
  );
};


// --- Vertical Sticky Stack Section ---
const VerticalAgentStack = () => {
  return (
    <section className="relative bg-black pt-32 pb-40 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 relative">
        
        {/* Sticky Left Sidebar */}
        <div className="w-full md:w-1/3 relative">
          <div className="sticky top-40">
            <span className="font-mono text-[10px] tracking-[0.2em] text-cyan-400 uppercase mb-4 block">StateGraph Sequence</span>
            <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-white leading-[1.1] mb-6">
              The 7-Agent <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-500">Pipeline.</span>
            </h2>
            <p className="text-white/50 font-body text-sm lg:text-base leading-relaxed max-w-sm">
              Watch the data materialize. Tasks are perfectly routed through a deterministic state machine, ensuring absolute rigour at every step from web crawling to final Notion export.
            </p>
          </div>
        </div>

        {/* Right Scrolling Stack */}
        <div className="w-full md:w-2/3 flex flex-col gap-10 lg:gap-16 pt-10 md:pt-0">
          {AGENTS.map((agent, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7 }}
              key={agent.id} 
              className="relative group w-full p-8 md:p-12 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${agent.grad} opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none`} />
              <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.85\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')" }} />
              
              <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center relative z-10">
                <div className="text-6xl md:text-8xl font-display font-black text-white/5 group-hover:text-white/10 transition-colors duration-500 shrink-0">
                  {agent.id}
                </div>
                
                <div>
                  <div className={`w-12 h-1 mb-4 rounded-full bg-gradient-to-r ${agent.grad}`} />
                  <h3 className="font-display text-3xl md:text-4xl font-light text-white mb-3">{agent.name}</h3>
                  <p className="text-white/50 text-sm md:text-base leading-relaxed">{agent.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};


export default function LandingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const heroY        = useTransform(smoothProgress, [0, 0.2], ["0%", "40%"]);
  const heroOpacity  = useTransform(smoothProgress, [0, 0.1], [1, 0]);
  const statsScale   = useTransform(smoothProgress, [0.05, 0.2], [0.8, 1]);
  const statsOpacity = useTransform(smoothProgress, [0.1, 0.2], [0, 1]);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    if (hasSession()) router.push("/research");
    else router.push("/setup");
  };

  return (
    <div className="relative w-full overflow-hidden bg-black text-white selection:bg-violet-500/30">
      
      {/* --- Fixed 3D Canvas --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <NeuralCanvas opacity={0.7} />
        {/* Minimalist fine grain overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
          style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.85\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')" }}
        />
      </div>

      {/* --- Scroll Progress Bar --- */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] z-50 origin-left"
        style={{ scaleX: smoothProgress, background: "linear-gradient(90deg, #7c5cfc, #38d9f5)" }}
      />

      <div className="relative z-10 w-full">

        {/* ─── HERO SECTION ─── */}
        <motion.section 
          className="min-h-screen flex flex-col items-center justify-center p-6 relative"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          {/* Subtle breathing ambient orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full blur-[100px] opacity-20 bg-gradient-to-tr from-violet-600 to-cyan-400 mix-blend-screen pointer-events-none animate-pulse-glow" />

          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8"
          >
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 border border-white/10 rounded-full animate-[spin_10s_linear_infinite]" />
              <div className="absolute inset-[-10px] border border-violet-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
              <div className="absolute inset-[-20px] border-t border-cyan-400/40 rounded-full animate-[spin_8s_linear_infinite]" />
              <span className="text-4xl text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-300">⬡</span>
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="font-display font-black text-[clamp(2.5rem,8vw,8rem)] leading-[0.9] tracking-tighter text-center"
          >
            {TITLE.split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, filter: "blur(20px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.05 }}
                className="inline-block"
              >
                {char}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 1 }}
            className="mt-6 font-mono text-[clamp(0.6rem,1.5vw,1rem)] uppercase tracking-[0.3em] text-white/50 text-center"
          >
            {TAGLINE}
          </motion.p>

          <AnimatePresence>
            {ready && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 1.2 }}
                className="mt-16"
              >
                <div onClick={handleEnter} className="group relative cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-full blur-md opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative px-8 py-4 bg-black/50 backdrop-blur-xl border border-white/10 rounded-full flex items-center gap-4 transition-transform duration-300 group-hover:scale-[1.02]">
                    <span className="font-display tracking-[0.2em] text-sm font-semibold uppercase text-white">
                      Initialize Terminal
                    </span>
                    <span className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs group-hover:translate-x-1 transition-transform duration-300">
                      →
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5, duration: 1 }}
            className="absolute bottom-12 flex flex-col items-center gap-4"
          >
            <span className="font-mono text-[10px] text-white/30 tracking-widest uppercase [writing-mode:vertical-lr] animate-pulse">Scroll</span>
            <div className="w-[1px] h-12 bg-gradient-to-b from-white/20 to-transparent" />
          </motion.div>
        </motion.section>

        {/* ─── STATS SECTION ─── */}
        <motion.section 
          className="relative py-32 border-y border-white/5 bg-black/40 backdrop-blur-3xl"
          style={{ opacity: statsOpacity, scale: statsScale }}
        >
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
            {STATS.map((s, i) => (
              <div key={i} className="bg-[#050505] p-10 flex flex-col items-center justify-center text-center group">
                <span className="text-xl mb-6 text-white/20 group-hover:text-cyan-400 transition-colors duration-500">{s.icon}</span>
                <span className="font-display font-light text-5xl tracking-tighter text-white/90 mb-2">{s.value}</span>
                <span className="font-mono text-[10px] tracking-[0.2em] text-white/40 uppercase">{s.label}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ─── VERTICAL AGENTS STACK ─── */}
        <VerticalAgentStack />

        {/* ─── BENTO GRID SECTION ─── */}
        <section className="py-40 relative px-6 bg-black">
          <div className="max-w-6xl mx-auto">
            
            <div className="mb-24 flex flex-col items-center">
              <span className="font-mono text-[10px] tracking-[0.2em] text-violet-400 uppercase mb-4">Core Technology</span>
              <h2 className="font-display text-4xl md:text-6xl font-medium tracking-tight text-center max-w-2xl">
                Unprecedented <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-rose-400">Capabilities.</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
              {BENTO_CARDS.map((card, i) => (
                <div 
                  key={i} 
                  className={`relative group rounded-3xl overflow-hidden p-8 lg:p-12 flex flex-col justify-between transition-transform duration-500 hover:-translate-y-2
                             bg-white/[0.05] backdrop-blur-[40px] border border-white/20 
                             shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]
                             hover:border-white/40 hover:bg-white/[0.08] hover:shadow-[0_16px_48px_rgba(255,255,255,0.05),inset_0_1px_0_rgba(255,255,255,0.2)]
                             ${card.colSpan} ${card.rowSpan}`}
                >
                  {/* Intense gradient glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.grad} opacity-10 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none mix-blend-screen`} />
                  <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.85\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')" }} />
                  
                  <span className="text-4xl md:text-5xl opacity-80 mb-6">{card.img}</span>
                  
                  <div className="relative z-10">
                    <h3 className="font-display font-medium text-2xl lg:text-3xl tracking-tight mb-4 text-white/90">{card.title}</h3>
                    <p className="font-body text-white/50 text-sm leading-relaxed max-w-sm">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ─── TERMINAL SIMULATOR CTA ─── */}
        <section className="relative py-40 flex items-center justify-center overflow-hidden bg-black border-t border-white/5">
          <div className="absolute inset-0 bg-gradient-to-t from-violet-900/10 to-transparent" />
          
          <div className="relative z-10 max-w-3xl w-full px-6 flex flex-col items-center">
            
            <TiltCard className="w-full mb-16 max-w-2xl">
              <div className="w-full h-48 bg-[#0a0a0a] rounded-2xl border border-white/10 p-6 flex flex-col shadow-2xl overflow-hidden relative">
                 <div className="flex gap-2 mb-4">
                   <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                   <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                   <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                 </div>
                 <div className="font-mono text-xs text-white/60 space-y-2 flex-col justify-end">
                    <p className="text-cyan-400">❯ init groq_engine</p>
                    <p>Loading Llama 3.3 70B [...] SUCCESS</p>
                    <p className="text-cyan-400">❯ mount graph_state --agents=7</p>
                    <p>Connecting Clarifier, Planner, Researcher...</p>
                    <p className="animate-pulse text-violet-400 mt-2">SYSTEM STANDBY. AWAITING INPUT_</p>
                 </div>
              </div>
            </TiltCard>

            <h2 className="font-display font-black text-[clamp(2.5rem,6vw,6rem)] tracking-tighter text-center leading-[0.9] text-white mb-10">
              COMMENCE <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">SYNTHESIS.</span>
            </h2>
            
            <button 
              onClick={handleEnter}
              className="px-12 py-5 bg-white text-black rounded-full font-display tracking-[0.15em] text-sm uppercase font-bold hover:scale-105 transition-transform duration-500 shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.6)]"
            >
              Enter The Matrix
            </button>
            
          </div>
        </section>

      </div>
    </div>
  );
}
