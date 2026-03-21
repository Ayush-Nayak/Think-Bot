# ⬡ Think-Bot — Multi-Agent AI Research Terminal

> **God-tier frontend** for the Think-Bot deep research system.
> A cinematic, Three.js-powered, session-isolated research interface built on Next.js 15.

---

## ✦ What This Is

The complete frontend replacement for `agent-chat-ui`. It provides:

- **3D neural network background** — live Three.js nodes + edges with mouse parallax
- **Cinematic landing page** — animated letter-by-letter title, floating hex, stats
- **Secure key setup screen** — sessionStorage-only, zero server contact
- **7-agent pipeline sidebar** — live node state (idle → active → done) with glow animations
- **Streaming chat** — markdown-rendered reports with inline cursor
- **Notion save confirmation** — animated toast when report is persisted
- **Full logout** — wipes sessionStorage on exit, keys gone instantly

---

## 🗂 Project Structure

```
think-bot-frontend/
├── app/
│   ├── layout.tsx          # Root layout (scanning line, fonts)
│   ├── globals.css         # Full design system — tokens, glass, animations
│   ├── page.tsx            # Landing page (3D hero)
│   ├── setup/page.tsx      # API key configuration
│   └── research/page.tsx   # Chat terminal (session-guarded)
├── components/
│   ├── NeuralCanvas.tsx    # Three.js 65-node neural network
│   ├── AgentPipeline.tsx   # Animated 7-agent progress sidebar
│   ├── ChatInterface.tsx   # Streaming chat with thread management
│   └── MessageRenderer.tsx # ReactMarkdown with custom styling
├── lib/
│   ├── session.ts          # sessionStorage key manager
│   └── langgraph.ts        # LangGraph SDK wrapper + stream parser
├── vercel.json             # Frontend deployment config
└── render.yaml             # Backend deployment config (Render)
```

---

## 🚀 Local Development

```bash
npm install --legacy-peer-deps
npm run dev
# → http://localhost:3000
```

---

## 🔧 Backend: Pass Keys Per-Run (REQUIRED)

Your `deep_researcher_api.py` must read keys from `config["configurable"]` instead of `os.environ` so each user's keys are used for their own run.

Replace your env reads at the top of each agent/tool function:

```python
# BEFORE
import os
api_key = os.environ["GROQ_API_KEY"]

# AFTER
def my_agent(state, config):
    cfg = config.get("configurable", {})
    api_key = cfg.get("groq_api_key") or os.environ.get("GROQ_API_KEY", "")
    ...
```

Do the same for all keys:

| Old env var           | New configurable key    |
|-----------------------|-------------------------|
| `GROQ_API_KEY`        | `groq_api_key`          |
| `TAVILY_API_KEY`      | `tavily_api_key`        |
| `NOTION_TOKEN`        | `notion_token`          |
| `NOTION_DATABASE_ID`  | `notion_database_id`    |
| `LANGSMITH_API_KEY`   | `langsmith_api_key`     |

This makes the backend stateless — no .env needed on the server.

---

## ☁️ Free Deployment

### Frontend → Vercel (free)

```bash
# 1. Push this folder to a GitHub repo
# 2. Go to vercel.com → New Project → import repo
# 3. Framework: Next.js, Root directory: think-bot-frontend
# 4. Deploy — done.
```

### Backend → Railway (free tier, 500hr/month)

```bash
# 1. Push your Think-Bot root to GitHub
# 2. railway.app → New Project → Deploy from GitHub
# 3. Set start command: langgraph up --host 0.0.0.0 --port $PORT
# 4. Copy the Railway public URL
# 5. Users enter it as "LangGraph Deployment URL" in setup
```

OR use **Render** (see render.yaml — free 750hr/month).

---

## 🔐 Security Model

| Concern                       | How it's handled                                      |
|-------------------------------|-------------------------------------------------------|
| Keys stored on server         | ❌ Never — backend is stateless                       |
| Keys in localStorage          | ❌ Never — uses `sessionStorage` only                 |
| Keys visible in URL/headers   | ❌ No — passed as LangGraph run config body           |
| Keys leak between users        | ❌ No — each session is isolated                      |
| Keys survive tab close         | ❌ No — sessionStorage auto-wipes on tab close        |
| HTTPS in transit               | ✅ Yes — Vercel and Railway enforce HTTPS             |

---

## 📦 Stack

| Layer         | Tech                          |
|---------------|-------------------------------|
| Framework     | Next.js 15 / React 19         |
| 3D            | Three.js r170                 |
| Animation     | Framer Motion 11              |
| Styling       | Tailwind CSS 3                |
| Markdown      | react-markdown + remark-gfm   |
| LangGraph SDK | @langchain/langgraph-sdk      |
| Fonts         | Oxanium · JetBrains Mono · DM Sans |
| Deploy        | Vercel (free)                 |
