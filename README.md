<p align="center">
  <h1 align="center">🔬 Deep Researcher</h1>
  <p align="center">
    <strong>AI-Powered Multi-Agent Research System</strong>
  </p>
  <p align="center">
    Transform any topic into comprehensive, well-structured research reports using autonomous AI agents.
  </p>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#usage">Usage</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

---

## 🎯 What is Deep Researcher?

Deep Researcher is an intelligent research assistant that leverages **multi-agent AI architecture** to conduct thorough research on any topic. Instead of simple Q&A, it deploys a team of specialized AI agents that work together—planning research strategies, gathering information from the web, synthesizing findings, writing comprehensive reports, and self-critiquing for quality assurance.

The result? **Publication-ready research reports** automatically saved to your Notion workspace.

---

## ✨ Features

- **🤖 Multi-Agent Workflow** — Specialized agents collaborate: Planner, Researcher, Synthesizer, Writer, and Critic
- **🔍 Intelligent Web Research** — Powered by Tavily Search for real-time, high-quality information gathering
- **✍️ Automated Report Generation** — Produces well-structured, comprehensive research documents
- **🔄 Self-Improvement Loop** — Built-in critic agent reviews and refines reports before finalization
- **📝 Notion Integration** — Automatically saves completed research to your Notion database
- **💬 Interactive Chat UI** — Beautiful, modern interface for seamless interaction
- **📊 Research Analytics** — Track your research history and statistics
- **🔗 LangSmith Tracing** — Full observability into agent workflows for debugging and optimization

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER QUERY                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    🎯 CLARIFICATION AGENT                        │
│              Ensures research question is well-defined           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     📋 PLANNER AGENT                             │
│         Creates research strategy & search queries               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    🔍 RESEARCHER AGENT                           │
│            Gathers information via Tavily Search                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    🧬 SYNTHESIS AGENT                            │
│              Processes and organizes raw findings                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ✍️ WRITER AGENT                             │
│             Crafts comprehensive research report                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      🔎 CRITIC AGENT                             │
│           Reviews, critiques, requests improvements              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     📄 FINALIZER AGENT                           │
│          Polishes report & saves to Notion                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+ & pnpm
- API Keys (see below)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/deep-researcher.git
cd deep-researcher
```

### 2. Set Up Backend

```bash
# Create virtual environment
python -m venv venv

# Activate it
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your API keys
```

### 4. Set Up Frontend

```bash
cd agent-chat-ui
pnpm install
```

### 5. Run the Application

**Terminal 1 - Start LangGraph Server:**
```bash
langgraph dev
```

**Terminal 2 - Start Chat UI:**
```bash
cd agent-chat-ui
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and start researching!

---

## 🔑 Required API Keys

| Key | Purpose | Get it from |
|-----|---------|-------------|
| `GEMINI_API_KEY` | AI model (Gemini 2.0 Flash) | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `TAVILY_API_KEY` | Web search | [Tavily](https://tavily.com/) |
| `NOTION_TOKEN` | Save reports | [Notion Integrations](https://www.notion.so/my-integrations) |
| `NOTION_DATABASE_ID` | Target database | Your Notion database URL |
| `LANGSMITH_API_KEY` | Tracing (optional) | [LangSmith](https://smith.langchain.com/) |

---

## 💡 Usage

### Via Chat UI
Simply type your research topic in the chat interface. The AI agents will:
1. Clarify your research question if needed
2. Plan the research approach
3. Search and gather relevant information
4. Synthesize findings into coherent notes
5. Write a comprehensive report
6. Self-critique and improve the report
7. Save the final report to Notion

### Via Command Line
```bash
python deep_researcher.py
```

This provides a menu-driven interface with options to:
- Start new research
- Search past research
- View all reports
- See research statistics

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **AI Framework** | [LangGraph](https://github.com/langchain-ai/langgraph) |
| **LLM** | Google Gemini 2.0 Flash |
| **Web Search** | Tavily Search API |
| **Frontend** | Next.js 15, React 19, TailwindCSS |
| **Storage** | Notion API |
| **Observability** | LangSmith |

---

## 📁 Project Structure

```
deep-researcher/
├── deep_researcher.py      # Main agent logic (CLI version)
├── deep_researcher_api.py  # LangGraph API integration
├── notion_manager.py       # Notion database integration
├── langgraph.json          # LangGraph configuration
├── requirements.txt        # Python dependencies
├── .env.example            # Environment template
└── agent-chat-ui/          # Next.js chat interface
    └── src/
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ using LangGraph and Gemini
</p>
