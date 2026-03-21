import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "tb-bg":       "#06080f",
        "tb-surface":  "#0a0e1a",
        "tb-accent":   "#7c5cfc",
        "tb-cyan":     "#38d9f5",
        "tb-violet":   "#a78bfa",
        "tb-indigo":   "#6366f1",
        "tb-amber":    "#fbbf24",
        "tb-emerald":  "#34d399",
        "tb-rose":     "#fb7185",
        "tb-text":     "#e4eaf6",
        "tb-muted":    "#2d3a52",
        "tb-subtle":   "#64748b",
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
        body:    ["Inter", "sans-serif"],
      },
      animation: {
        "scan":       "scan 6s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float":      "float 6s ease-in-out infinite",
        "data-in":    "data-in 0.35s ease-out forwards",
        "blink":      "blink 1.1s ease-in-out infinite",
        "spin-slow":  "spin 8s linear infinite",
        "shimmer":    "shimmer 3s ease infinite",
        "orbit":      "orbit 12s linear infinite",
      },
      keyframes: {
        scan: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%":      { opacity: "1",   transform: "scale(1.05)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-10px)" },
        },
        "data-in": {
          "0%":   { opacity: "0", transform: "translateX(-6px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        orbit: {
          "from": { transform: "rotate(0deg)" },
          "to":   { transform: "rotate(360deg)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
