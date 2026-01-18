import json
import os
from typing import Optional, Literal, Annotated
from typing_extensions import TypedDict
from pydantic import BaseModel
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.types import Command
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_tavily import TavilySearch
from datetime import datetime
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()


class AgentInputState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    research_brief: Optional[str]
    search_queries: list[str]
    key_topics: list[str]
    raw_notes: list[str]
    notes: list[str]
    draft_report: str
    critique_feedback: str
    final_report: str
    iteration_count: int
    notion_page_url: str


class ClarifyWithUser(BaseModel):
    need_clarification: bool
    question: str
    verification: str


class ResearchQuestion(BaseModel):
    research_brief: str
    reasoning: str


class ResearchPlan(BaseModel):
    search_queries: list[str]
    key_topics: list[str]
    planning_reasoning: str


class Critique(BaseModel):
    needs_revision: bool
    critique_reasoning: str
    specific_issues: list[str]
    improvements: list[str]


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

if not GEMINI_API_KEY or not TAVILY_API_KEY:
    raise ValueError("API keys not found! Make sure .env file exists with GEMINI_API_KEY and TAVILY_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.0-flash')
search_tool = TavilySearch(tavily_api_key=TAVILY_API_KEY, max_results=5)


def get_structured_response(prompt, schema_class):
    schema_str = "\n".join([f"- {k}: {v.annotation if hasattr(v, 'annotation') else 'string'}" for k, v in schema_class.model_fields.items()])
    full_prompt = f"{prompt}\n\nRespond in JSON format with these fields:\n{schema_str}"
    response = model.generate_content(full_prompt)
    try:
        json_text = response.text
        if "```json" in json_text:
            json_text = json_text.split("```json")[1].split("```")[0]
        elif "```" in json_text:
            json_text = json_text.split("```")[1].split("```")[0]
        data = json.loads(json_text.strip())
        return schema_class(**data)
    except:
        if schema_class == ClarifyWithUser:
            return ClarifyWithUser(need_clarification=True, question="Could you provide more details?", verification="")
        elif schema_class == ResearchQuestion:
            return ResearchQuestion(research_brief=prompt, reasoning="")
        elif schema_class == ResearchPlan:
            return ResearchPlan(search_queries=["general search"], key_topics=["main topic"], planning_reasoning="")
        elif schema_class == Critique:
            return Critique(needs_revision=False, critique_reasoning="", specific_issues=[], improvements=[])


def clarify_with_user(state: AgentState) -> Command[Literal["planner_agent", END]]:
    messages = state.get("messages", [])
    conversation = "\n".join([f"{msg.type}: {msg.content}" for msg in messages])
    prompt = f"""Analyze this conversation: {conversation}

Think step by step:
1. Is the research request clear and specific?
2. What key information might be missing?
3. Can research begin or do we need clarification?

Determine if there is sufficient information to begin research.
If information is missing, ask ONE specific clarifying question.
If sufficient information exists, provide a verification message."""
    response = get_structured_response(prompt, ClarifyWithUser)
    if response.need_clarification:
        return Command(goto=END, update={"messages": [AIMessage(content=response.question)]})
    else:
        return Command(goto="planner_agent", update={"messages": [AIMessage(content=response.verification)]})


def planner_agent(state: AgentState) -> Command[Literal["researcher_agent"]]:
    messages = state.get("messages", [])
    conversation = "\n".join([f"{msg.type}: {msg.content}" for msg in messages])

    brief_prompt = f"""Transform this conversation into a clear research brief: {conversation}

Think step by step:
1. What is the core research question?
2. What are the key focus areas?
3. What is the scope and boundaries?

The research brief should clearly state the research question, specify key focus areas, and define scope."""
    response = get_structured_response(brief_prompt, ResearchQuestion)

    plan_prompt = f"""Create a research plan for: {response.research_brief}

Think step by step:
1. What topics need to be covered comprehensively?
2. What specific search queries will find the best information?
3. How should queries be structured for maximum relevance?

Generate 5-7 specific search queries and identify key topics."""
    plan = get_structured_response(plan_prompt, ResearchPlan)

    print("\n" + "="*70)
    print("RESEARCH BRIEF")
    print("="*70)
    print(f"{response.research_brief}\n")
    print("="*70)

    return Command(goto="researcher_agent", update={
        "research_brief": response.research_brief,
        "search_queries": plan.search_queries,
        "key_topics": plan.key_topics
    })


def researcher_agent(state: AgentState) -> Command[Literal["synthesis_agent"]]:
    search_queries = state.get("search_queries", [])

    raw_notes = []
    print("\n" + "="*70)
    print("RESEARCH IN PROGRESS")
    print("="*70)
    for i, query in enumerate(search_queries, 1):
        print(f"\nQuery {i}: {query}")
        try:
            results = search_tool.invoke(query)
            if isinstance(results, list):
                for result in results:
                    content = result.get('content', '') if isinstance(result, dict) else str(result)
                    url = result.get('url', '') if isinstance(result, dict) else ''
                    if content:
                        raw_notes.append(f"Source: {url}\n{content}")
                        print(f"  Found: {url if url else 'content'}")
            else:
                raw_notes.append(f"Query result:\n{results}")
                print(f"  Found results")
        except Exception as e:
            print(f"  Error: {e}")

    return Command(goto="synthesis_agent", update={"raw_notes": raw_notes})


def synthesis_agent(state: AgentState) -> Command[Literal["writer_agent"]]:
    research_brief = state.get("research_brief", "")
    key_topics = state.get("key_topics", [])
    raw_notes = state.get("raw_notes", [])

    synthesis_prompt = f"""Research Brief: {research_brief}
Key Topics: {', '.join(key_topics)}
Raw Research Data:
{chr(10).join(raw_notes)}

Think step by step:
1. What are the main themes and patterns in this data?
2. What specific facts, numbers, names, and examples are most valuable?
3. How should this information be organized for clarity?
4. What actionable details must be preserved?

Synthesize this information into comprehensive, well-structured notes.
Extract ALL specific, actionable details including:
- Names of companies, products, people, places, organizations
- Exact numbers, statistics, dates, prices, measurements
- Addresses, locations, contact information
- URLs, website links, booking platforms
- Step-by-step processes or instructions
- Pros and cons, comparisons, rankings
- Expert recommendations and best practices
- Time-sensitive information (hours, schedules, deadlines)

Organize the notes by topic and preserve all specific details that would be useful to someone acting on this research."""
    synthesized = model.generate_content(synthesis_prompt)
    notes = [synthesized.text]

    return Command(goto="writer_agent", update={"notes": notes})


def writer_agent(state: AgentState) -> Command[Literal["critic_agent"]]:
    research_brief = state.get("research_brief", "")
    notes = state.get("notes", [])
    critique_feedback = state.get("critique_feedback", "")

    feedback_section = ""
    if critique_feedback:
        feedback_section = f"""\n\nPREVIOUS CRITIQUE TO ADDRESS:
{critique_feedback}

Please revise the report addressing all critique points."""

    report_prompt = f"""You are an expert research analyst creating a comprehensive report.

Research Brief: {research_brief}

Synthesized Research Notes:
{chr(10).join(notes)}
{feedback_section}

Think step by step:
1. What is the best structure to present this information clearly?
2. What are the most important findings to highlight?
3. How can I make this maximally actionable and detailed?
4. Have I included all specific data points and examples?

Create a detailed, actionable research report with the following structure:

1. TITLE: Create a clear, descriptive title

2. EXECUTIVE SUMMARY: Provide a concise 3-4 sentence overview of the research findings

3. KEY FINDINGS: List 7-10 most important discoveries with specific details (names, numbers, links)

4. DETAILED ANALYSIS: Write 5-7 comprehensive paragraphs organized by themes/topics. Include:
   - All specific names, brands, products, services mentioned
   - Exact numbers, prices, statistics, percentages
   - Step-by-step processes or how-to information
   - Comparisons and rankings
   - Expert opinions and recommendations
   - Time-sensitive details (dates, schedules, hours)
   - Contact information and locations where relevant

5. PRACTICAL RECOMMENDATIONS: Provide 5-7 actionable next steps or recommendations based on the research

6. IMPORTANT RESOURCES: List specific websites, tools, platforms, or contacts discovered

7. CONCLUSION: Summarize key takeaways and final thoughts

Make the report comprehensive and include every useful specific detail from the research. Format it clearly with proper sections."""

    try:
        response = model.generate_content(report_prompt)
        report_text = response.text
    except Exception as e:
        report_text = f"Error generating report: {e}\n\nRaw Notes:\n{chr(10).join(notes)}"

    return Command(goto="critic_agent", update={"draft_report": report_text})


def critic_agent(state: AgentState) -> Command[Literal["writer_agent", "finalizer"]]:
    research_brief = state.get("research_brief", "")
    draft_report = state.get("draft_report", "")
    iteration = state.get("iteration_count", 0)
    MAX_ITERATIONS = 2

    critique_prompt = f"""You are a critical reviewer evaluating a research report for quality, completeness, and actionability.

Research Brief: {research_brief}

Draft Report:
{draft_report}

Think step by step (reflection):
1. Does this report fully answer the research question with sufficient depth?
2. Are there any missing details, information gaps, or unclear sections?
3. Is the structure logical, well-organized, and easy to follow?
4. Are specific examples, data points, numbers, and sources provided throughout?
5. Is this report actionable with concrete recommendations?
6. Does it meet professional research report standards?

Evaluate the report and determine if revision is needed. Be thorough but fair."""

    critique = get_structured_response(critique_prompt, Critique)

    if critique.needs_revision and iteration < MAX_ITERATIONS:
        feedback = f"""Issues identified:
{chr(10).join(f"- {issue}" for issue in critique.specific_issues)}

Improvements needed:
{chr(10).join(f"- {imp}" for imp in critique.improvements)}

Reasoning: {critique.critique_reasoning}"""

        print(f"\nREFLECTION: Revision needed (iteration {iteration + 1}/{MAX_ITERATIONS})")

        return Command(goto="writer_agent", update={
            "critique_feedback": feedback,
            "iteration_count": iteration + 1
        })
    else:
        return Command(goto="finalizer")


def finalizer(state: AgentState) -> Command[Literal[END]]:
    draft_report = state.get("draft_report", "")
    raw_notes = state.get("raw_notes", [])
    research_brief = state.get("research_brief", "")
    key_topics = state.get("key_topics", [])
    sources = list(set([note.split('\n')[0].replace('Source: ', '') for note in raw_notes if note.startswith('Source:')]))

    formatted_report = f"""
{'='*70}
AI DEEP RESEARCHER - COMPREHENSIVE REPORT
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
System: Multi-Agent with Reflection & Chain of Thought
{'='*70}"""

    title_lines = draft_report.split('\n')
    title = "Research Report"
    for line in title_lines[:10]:
        line = line.strip()
        if line and not line.startswith('=') and not line.startswith('#') and len(line) > 10:
            title = line[:100]
            break

    print("\n" + "="*70)
    print("NOTION: Creating research page")
    print("="*70)

    try:
        import sys
        sys.path.insert(0, os.path.dirname(__file__))
        from notion_manager import create_research_page

        result = create_research_page(
            title=title,
            research_brief=research_brief,
            report_content=formatted_report,
            sources_count=len(sources),
            key_topics=key_topics
        )

        if result["success"]:
            print(f"Success! Notion page created")
            print(f"Title: {result['title']}")
            print(f"URL: {result['url']}")
            print(f"\nOpen in Notion to view your beautiful formatted report!")
            notion_url = result['url']
        else:
            print(f"Failed to create Notion page: {result['error']}")
            notion_url = ""

    except Exception as e:
        print(f"Notion integration error: {e}")
        print("Report data is still available in terminal output")
        notion_url = ""

    print("="*70)

    return Command(goto=END, update={
        "final_report": formatted_report,
        "notion_page_url": notion_url
    })


def build_full_workflow():
    builder = StateGraph(AgentState, input_schema=AgentInputState)
    builder.add_node("clarify_with_user", clarify_with_user)
    builder.add_node("planner_agent", planner_agent)
    builder.add_node("researcher_agent", researcher_agent)
    builder.add_node("synthesis_agent", synthesis_agent)
    builder.add_node("writer_agent", writer_agent)
    builder.add_node("critic_agent", critic_agent)
    builder.add_node("finalizer", finalizer)
    builder.add_edge(START, "clarify_with_user")
    workflow = builder.compile()
    return workflow


def run_complete_research():
    workflow = build_full_workflow()
    print("="*70)
    print("AI DEEP RESEARCHER - MULTI-AGENT SYSTEM WITH NOTION")
    print("Features: Reflection | Chain of Thought | Notion Integration")
    print("="*70)
    print("\nWhat would you like to research?")
    initial_query = input("You: ").strip()

    if not initial_query:
        print("Please provide a valid research query.")
        return

    result = workflow.invoke({"messages": [HumanMessage(content=initial_query)], "iteration_count": 0}, {"configurable": {"thread_id": "1"}})

    max_iterations = 7
    iteration = 0

    while "research_brief" not in result or not result["research_brief"]:
        if iteration >= max_iterations:
            print(f"\nMaximum iterations reached. Starting research with available information.")
            break

        last_message = result["messages"][-1]
        if isinstance(last_message, AIMessage):
            print(f"\nAI: {last_message.content}")
            if "research_brief" in result and result["research_brief"]:
                break

            user_response = input("You: ").strip()
            if not user_response:
                print("No response provided. Ending clarification.")
                break

            result = workflow.invoke({"messages": result["messages"] + [HumanMessage(content=user_response)], "iteration_count": 0}, {"configurable": {"thread_id": "1"}})
        iteration += 1

    if "final_report" in result and result["final_report"]:
        print("\n" + result["final_report"])

        if result.get("notion_page_url"):
            print(f"\n\nNotion Page: {result['notion_page_url']}")

        return result
    else:
        print("\nCould not complete research. Please try again.")
        return None


def search_past_research(keyword):
    try:
        import sys
        sys.path.insert(0, os.path.dirname(__file__))
        from notion_manager import search_research_pages

        print(f"\nSearching Notion for: {keyword}")
        results = search_research_pages(keyword)

        if isinstance(results, dict) and "error" in results:
            print(f"Search error: {results['error']}")
        elif not results:
            print("No results found.")
        else:
            print(f"\nFound {len(results)} results:")
            for i, result in enumerate(results, 1):
                print(f"\n{i}. {result['title']}")
                print(f"   Date: {result['date']}")
                print(f"   URL: {result['url']}")
    except Exception as e:
        print(f"Search failed: {e}")


def list_all_reports():
    try:
        import sys
        sys.path.insert(0, os.path.dirname(__file__))
        from notion_manager import list_all_research

        print("\nAll Research Reports from Notion:")
        results = list_all_research()

        if isinstance(results, dict) and "error" in results:
            print(f"List error: {results['error']}")
        elif not results:
            print("No reports found.")
        else:
            print(f"\nTotal: {len(results)} reports\n")
            for i, report in enumerate(results, 1):
                print(f"{i}. {report['title']}")
                print(f"   Date: {report['date']} | Status: {report['status']} | Quality: {report['quality']}")
                print(f"   Sources: {report['sources']} | URL: {report['url']}")
                print()
    except Exception as e:
        print(f"List failed: {e}")


def show_research_stats():
    try:
        import sys
        sys.path.insert(0, os.path.dirname(__file__))
        from notion_manager import get_research_stats

        print("\n" + "="*70)
        print("RESEARCH ANALYTICS DASHBOARD")
        print("="*70)

        stats = get_research_stats()

        if isinstance(stats, dict) and "error" in stats:
            print(f"Stats error: {stats['error']}")
        else:
            print(f"\nTotal Reports: {stats['total_reports']}")
            print(f"This Month: {stats['this_month']}")
            print(f"Total Sources Analyzed: {stats['total_sources']}")
            print(f"Average Sources per Report: {stats['avg_sources']}")

            if stats['top_topics']:
                print(f"\nTop Topics:")
                for topic, count in stats['top_topics']:
                    print(f"  - {topic}: {count} reports")

        print("="*70)
    except Exception as e:
        print(f"Stats failed: {e}")


def main_menu():
    while True:
        print("\n" + "="*70)
        print("AI DEEP RESEARCHER - MAIN MENU")
        print("="*70)
        print("1. Start new research")
        print("2. Search past research (Notion)")
        print("3. List all reports (Notion)")
        print("4. View analytics dashboard")
        print("5. Exit")
        print("="*70)

        choice = input("Select option (1-5): ").strip()

        if choice == "1":
            run_complete_research()
        elif choice == "2":
            keyword = input("Enter search keyword: ").strip()
            if keyword:
                search_past_research(keyword)
        elif choice == "3":
            list_all_reports()
        elif choice == "4":
            show_research_stats()
        elif choice == "5":
            print("Goodbye!")
            break
        else:
            print("Invalid option. Try again.")


if __name__ == "__main__":
    main_menu()
