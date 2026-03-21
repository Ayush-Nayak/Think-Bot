import json
import os
from typing import Optional, Literal, Annotated
from typing_extensions import TypedDict
from pydantic import BaseModel
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.types import Command
from langchain_core.runnables import RunnableConfig
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_tavily import TavilySearch
from datetime import datetime
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

def _get_keys(config: RunnableConfig) -> dict:
    c = (config or {}).get("configurable", {})
    return {
        "groq":      c.get("groq_api_key")      or os.getenv("GROQ_API_KEY", ""),
        "tavily":    c.get("tavily_api_key")     or os.getenv("TAVILY_API_KEY", ""),
        "notion":    c.get("notion_token")       or os.getenv("NOTION_TOKEN", ""),
        "notion_db": c.get("notion_database_id") or os.getenv("NOTION_DATABASE_ID", ""),
    }


def _make_model(groq_key: str) -> Groq:
    if not groq_key:
        raise ValueError(
            "Groq API key is missing. "
            "Pass it via the setup form or set GROQ_API_KEY in your .env."
        )
    return Groq(api_key=groq_key)


def _make_search(tavily_key: str) -> TavilySearch:
    if not tavily_key:
        raise ValueError(
            "Tavily API key is missing. "
            "Pass it via the setup form or set TAVILY_API_KEY in your .env."
        )
    return TavilySearch(tavily_api_key=tavily_key, max_results=5)


class AgentInputState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


class AgentState(TypedDict):
    messages:          Annotated[list[BaseMessage], add_messages]
    research_brief:    Optional[str]
    search_queries:    list[str]
    key_topics:        list[str]
    raw_notes:         list[str]
    notes:             list[str]
    draft_report:      str
    critique_feedback: str
    final_report:      str
    iteration_count:   int
    notion_page_url:   str


class ClarifyWithUser(BaseModel):
    need_clarification: bool
    question:           str
    verification:       str


class ResearchQuestion(BaseModel):
    research_brief: str
    reasoning:      str


class ResearchPlan(BaseModel):
    search_queries:     list[str]
    key_topics:         list[str]
    planning_reasoning: str


class Critique(BaseModel):
    needs_revision:     bool
    critique_reasoning: str
    specific_issues:    list[str]
    improvements:       list[str]


GROQ_MODEL = "llama-3.3-70b-versatile"


def generate(client: Groq, prompt: str) -> str:
    """Simple text generation via Groq."""
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=4096,
    )
    return response.choices[0].message.content or ""


def get_structured_response(prompt: str, schema_class, client: Groq):
    schema_str = "\n".join([
        f"- {k}: {v.annotation if hasattr(v, 'annotation') else 'string'}"
        for k, v in schema_class.model_fields.items()
    ])
    full_prompt = (
        f"{prompt}\n\n"
        f"Respond ONLY with a valid JSON object with these exact fields:\n{schema_str}\n"
        f"No explanation, no markdown, no code fences — pure JSON only."
    )
    raw = generate(client, full_prompt)
    try:

        text = raw.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        data = json.loads(text.strip())
        return schema_class(**data)
    except Exception:
        if schema_class == ClarifyWithUser:
            return ClarifyWithUser(need_clarification=False, question="", verification="Research request understood. Starting now.")
        elif schema_class == ResearchQuestion:
            return ResearchQuestion(research_brief=prompt, reasoning="")
        elif schema_class == ResearchPlan:
            return ResearchPlan(search_queries=["general research"], key_topics=["main topic"], planning_reasoning="")
        elif schema_class == Critique:
            return Critique(needs_revision=False, critique_reasoning="", specific_issues=[], improvements=[])


def clarify_with_user(
    state: AgentState, config: RunnableConfig
) -> Command[Literal["planner_agent", END]]:

    keys   = _get_keys(config)
    client = _make_model(keys["groq"])

    messages     = state.get("messages", [])
    conversation = "\n".join([f"{msg.type}: {msg.content}" for msg in messages])

    prompt = f"""Analyze this conversation: {conversation}

Think step by step:
1. Is the research request clear and specific?
2. What key information might be missing?
3. Can research begin or do we need clarification?

Determine if there is sufficient information to begin research.
If information is missing, ask ONE specific clarifying question.
If sufficient information exists, provide a short verification message."""

    response = get_structured_response(prompt, ClarifyWithUser, client)

    if response.need_clarification:
        return Command(
            goto=END,
            update={"messages": [AIMessage(content=response.question)]}
        )
    else:
        return Command(
            goto="planner_agent",
            update={"messages": [AIMessage(content=f"✅ {response.verification}\n\n🔍 Starting research...")]}
        )


def planner_agent(
    state: AgentState, config: RunnableConfig
) -> Command[Literal["researcher_agent"]]:

    keys   = _get_keys(config)
    client = _make_model(keys["groq"])

    messages     = state.get("messages", [])
    conversation = "\n".join([f"{msg.type}: {msg.content}" for msg in messages])

    brief_prompt = f"""Transform this conversation into a clear research brief: {conversation}

Think step by step:
1. What is the core research question?
2. What are the key focus areas?
3. What is the scope and boundaries?"""

    response = get_structured_response(brief_prompt, ResearchQuestion, client)

    plan_prompt = f"""Create a research plan for: {response.research_brief}

Think step by step:
1. What topics need to be covered comprehensively?
2. What specific search queries will find the best information?
3. How should queries be structured for maximum relevance?

Generate 5-7 specific search queries and identify key topics."""

    plan = get_structured_response(plan_prompt, ResearchPlan, client)

    progress_msg = f"""📋 **Research Brief Created**

{response.research_brief}

**Research Plan:**
- {len(plan.search_queries)} search queries prepared
- {len(plan.key_topics)} key topics identified

Moving to research phase..."""

    return Command(
        goto="researcher_agent",
        update={
            "research_brief": response.research_brief,
            "search_queries":  plan.search_queries,
            "key_topics":      plan.key_topics,
            "messages":        [AIMessage(content=progress_msg)],
        },
    )


def researcher_agent(
    state: AgentState, config: RunnableConfig
) -> Command[Literal["synthesis_agent"]]:

    keys        = _get_keys(config)
    search_tool = _make_search(keys["tavily"])

    search_queries = state.get("search_queries", [])
    raw_notes      = []
    progress_msg   = f"🔎 **Researching...** Executing {len(search_queries)} search queries\n\n"

    for i, query in enumerate(search_queries, 1):
        progress_msg += f"• Query {i}: {query}\n"
        try:
            results = search_tool.invoke(query)
            if isinstance(results, list):
                for result in results:
                    content = result.get("content", "") if isinstance(result, dict) else str(result)
                    url     = result.get("url", "")     if isinstance(result, dict) else ""
                    if content:
                        raw_notes.append(f"Source: {url}\n{content}")
            else:
                raw_notes.append(f"Source: Web Search for '{query}'\n{results}")
        except Exception as e:
            progress_msg += f"  ⚠️ Error: {e}\n"

    progress_msg += f"\n✅ Research complete! Collected data from {len(raw_notes)} sources"

    return Command(
        goto="synthesis_agent",
        update={
            "raw_notes": raw_notes,
            "messages":  [AIMessage(content=progress_msg)],
        },
    )


def synthesis_agent(
    state: AgentState, config: RunnableConfig
) -> Command[Literal["writer_agent"]]:

    keys   = _get_keys(config)
    client = _make_model(keys["groq"])

    research_brief = state.get("research_brief", "")
    key_topics     = state.get("key_topics", [])
    raw_notes      = state.get("raw_notes", [])

    synthesis_prompt = f"""Research Brief: {research_brief}
Key Topics: {', '.join(key_topics)}
Raw Research Data:
{chr(10).join(raw_notes[:20])}

Synthesize this information into comprehensive, well-structured notes.
Extract ALL specific, actionable details including names, numbers, dates, URLs,
prices, statistics, recommendations, and step-by-step processes.
Organize the notes by topic."""

    notes = [generate(client, synthesis_prompt)]

    return Command(
        goto="writer_agent",
        update={
            "notes":    notes,
            "messages": [AIMessage(content="📝 **Synthesizing findings...** Analyzing and organizing research data")],
        },
    )


def writer_agent(
    state: AgentState, config: RunnableConfig
) -> Command[Literal["critic_agent"]]:

    keys   = _get_keys(config)
    client = _make_model(keys["groq"])

    research_brief    = state.get("research_brief", "")
    notes             = state.get("notes", [])
    critique_feedback = state.get("critique_feedback", "")

    feedback_section = ""
    if critique_feedback:
        feedback_section = f"\n\nPREVIOUS CRITIQUE TO ADDRESS:\n{critique_feedback}\n\nPlease revise the report addressing all critique points."

    report_prompt = f"""You are an expert research analyst creating a comprehensive report.

Research Brief: {research_brief}

Synthesized Research Notes:
{chr(10).join(notes)}
{feedback_section}

Create a detailed, actionable research report with this structure:

1. TITLE
2. EXECUTIVE SUMMARY (3-4 sentences)
3. KEY FINDINGS (7-10 bullet points with specific details)
4. DETAILED ANALYSIS (5-7 paragraphs with names, numbers, statistics)
5. PRACTICAL RECOMMENDATIONS (5-7 actionable steps)
6. IMPORTANT RESOURCES (websites, tools, contacts)
7. CONCLUSION

Include every useful specific detail. Format clearly with proper sections."""

    try:
        report_text = generate(client, report_prompt)
    except Exception as e:
        report_text = f"Error generating report: {e}\n\nRaw Notes:\n{chr(10).join(notes)}"

    return Command(
        goto="critic_agent",
        update={
            "draft_report": report_text,
            "messages":     [AIMessage(content="✍️ **Writing report...** Creating comprehensive analysis")],
        },
    )


def critic_agent(
    state: AgentState, config: RunnableConfig
) -> Command[Literal["writer_agent", "finalizer"]]:

    keys   = _get_keys(config)
    client = _make_model(keys["groq"])

    research_brief = state.get("research_brief", "")
    draft_report   = state.get("draft_report", "")
    iteration      = state.get("iteration_count", 0)
    MAX_ITERATIONS = 2

    critique_prompt = f"""You are a critical reviewer evaluating a research report.

Research Brief: {research_brief}

Draft Report:
{draft_report}

Evaluate the report:
1. Does it fully answer the research question?
2. Are there missing details or gaps?
3. Is it well-structured and actionable?
4. Are specific examples and data provided?
5. Does it meet professional standards?"""

    critique = get_structured_response(critique_prompt, Critique, client)

    if critique.needs_revision and iteration < MAX_ITERATIONS:
        feedback = f"""Issues identified:
{chr(10).join(f"- {issue}" for issue in critique.specific_issues)}

Improvements needed:
{chr(10).join(f"- {imp}" for imp in critique.improvements)}

Reasoning: {critique.critique_reasoning}"""

        return Command(
            goto="writer_agent",
            update={
                "critique_feedback": feedback,
                "iteration_count":   iteration + 1,
                "messages":          [AIMessage(content=f"🔄 **Refining report...** (Revision {iteration + 1}/{MAX_ITERATIONS})")],
            },
        )
    else:
        return Command(
            goto="finalizer",
            update={
                "messages": [AIMessage(content="✅ **Report approved!** Finalizing and saving to Notion...")]
            },
        )


def finalizer(
    state: AgentState, config: RunnableConfig
) -> Command[Literal[END]]:

    keys = _get_keys(config)

    draft_report   = state.get("draft_report", "")
    raw_notes      = state.get("raw_notes", [])
    research_brief = state.get("research_brief", "")
    key_topics     = state.get("key_topics", [])
    sources        = list(set([
        note.split("\n")[0].replace("Source: ", "")
        for note in raw_notes
        if note.startswith("Source:")
    ]))

    formatted_report = f"""
{'='*70}
THINK-BOT — COMPREHENSIVE RESEARCH REPORT
{'='*70}

{draft_report}

{'='*70}
SOURCES CONSULTED
{'='*70}
"""
    for i, source in enumerate(sources[:25], 1):
        formatted_report += f"{i}. {source}\n"

    formatted_report += f"""
{'='*70}
Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Research Quality: {len(raw_notes)} sources analyzed
Reflection Iterations: {state.get('iteration_count', 0)}
System: Think-Bot Multi-Agent Research System
{'='*70}"""

    title = "Research Report"
    for line in draft_report.split("\n")[:10]:
        line = line.strip()
        if line and not line.startswith("=") and not line.startswith("#") and len(line) > 10:
            title = line[:100]
            break

    notion_url    = ""
    notion_status = ""

    try:
        from notion_manager import create_research_page

        result = create_research_page(
            title=title,
            research_brief=research_brief,
            report_content=formatted_report,
            sources_count=len(raw_notes),
            key_topics=key_topics,
            notion_token=keys["notion"],
            database_id=keys["notion_db"],
        )

        if result["success"]:
            notion_status = f"✅ **Saved to Notion!**\n\n📄 [Open Report in Notion]({result['url']})"
            notion_url    = result["url"]
        else:
            notion_status = f"⚠️ Failed to save to Notion: {result['error']}"

    except Exception as e:
        notion_status = f"⚠️ Notion integration error: {e}"

    final_message = f"""{notion_status}

---

{formatted_report}"""

    return Command(
        goto=END,
        update={
            "final_report":    formatted_report,
            "notion_page_url": notion_url,
            "messages":        [AIMessage(content=final_message)],
        },
    )


def build_full_workflow():
    builder = StateGraph(AgentState, input=AgentInputState)
    builder.add_node("clarify_with_user", clarify_with_user)
    builder.add_node("planner_agent",     planner_agent)
    builder.add_node("researcher_agent",  researcher_agent)
    builder.add_node("synthesis_agent",   synthesis_agent)
    builder.add_node("writer_agent",      writer_agent)
    builder.add_node("critic_agent",      critic_agent)
    builder.add_node("finalizer",         finalizer)
    builder.add_edge(START, "clarify_with_user")
    return builder.compile()
