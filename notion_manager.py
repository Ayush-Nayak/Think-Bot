import os
from datetime import datetime
from dotenv import load_dotenv
from notion_client import Client

load_dotenv()


def _client(notion_token: str | None = None) -> Client:
    """Return a Notion client using the provided token or .env fallback."""
    token = notion_token or os.getenv("NOTION_TOKEN", "")
    if not token:
        raise ValueError(
            "Notion token is missing. "
            "Pass it via the setup form or set NOTION_TOKEN in your .env."
        )
    return Client(auth=token)


def _db_id(database_id: str | None = None) -> str:
    """Return the database ID using the provided value or .env fallback."""
    db = database_id or os.getenv("NOTION_DATABASE_ID", "")
    if not db:
        raise ValueError(
            "Notion Database ID is missing. "
            "Pass it via the setup form or set NOTION_DATABASE_ID in your .env."
        )
    return db


def clean_tag(tag: str) -> str:
    """Clean a tag string to be valid for Notion multi-select (no commas)."""
    if not tag:
        return "General"
    cleaned = tag.replace(",", " -").strip()
    if len(cleaned) > 100:
        cleaned = cleaned[:97] + "..."
    return cleaned or "General"


def create_research_page(
    title:          str,
    research_brief: str,
    report_content: str,
    sources_count:  int,
    key_topics:     list[str],
    notion_token:   str | None = None,
    database_id:    str | None = None,
) -> dict:
    """
    Create a formatted Notion page for a completed research report.

    Args:
        title:           Page title.
        research_brief:  The research question / brief.
        report_content:  Full formatted report text.
        sources_count:   Number of sources consulted.
        key_topics:      List of topic tags.
        notion_token:    User's Notion integration token (falls back to .env).
        database_id:     Target Notion database ID (falls back to .env).

    Returns:
        dict with keys: success (bool), url (str), title (str), error (str).
    """
    try:
        notion = _client(notion_token)
        db_id  = _db_id(database_id)

        properties = {
            "Name":   {"title":     [{"text": {"content": title}}]},
            "Topic":  {"rich_text": [{"text": {"content": title[:100]}}]},
            "Date":   {"date":      {"start": datetime.now().isoformat()}},
            "Status": {"select":    {"name": "Complete"}},
            "Quality":{"select":    {"name": "⭐⭐⭐⭐⭐"}},
            "Sources":{"number":    sources_count},
            "Tags":   {"multi_select": [{"name": clean_tag(t)} for t in key_topics[:3]]},
            "Brief":  {"rich_text": [{"text": {"content": research_brief[:2000]}}]},
        }

        sections = parse_report_sections(report_content)
        children = _build_page_blocks(sections, sources_count)

        page = notion.pages.create(
            parent={"database_id": db_id},
            properties=properties,
            children=children[:100],
        )

        remaining_blocks = children[100:]
        while remaining_blocks:
            notion.blocks.children.append(
                block_id=page["id"],
                children=remaining_blocks[:100]
            )
            remaining_blocks = remaining_blocks[100:]

        return {
            "success":  True,
            "page_id":  page["id"],
            "url":      page["url"],
            "title":    title,
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


def _chunk_rich_text(text: str) -> list[dict]:
    """Break a string into Notion's 2000 character rich_text limit."""
    return [{"type": "text", "text": {"content": text[i:i+2000]}} for i in range(0, len(text), 2000)]

def _build_text_blocks(text: str) -> list[dict]:
    """Break text into separate paragraph blocks by newline."""
    blocks = []
    for para in text.split("\n"):
        para = para.strip()
        if not para: continue
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {"rich_text": _chunk_rich_text(para)}
        })
    return blocks

def _build_page_blocks(sections: dict, sources_count: int) -> list:
    """Build the Notion block list from parsed report sections."""
    children = [
        {"object": "block", "type": "heading_1",
         "heading_1": {"rich_text": [{"type": "text", "text": {"content": "📊 Research Report"}}]}},
        {"object": "block", "type": "divider", "divider": {}},
    ]

    if sections.get("executive_summary"):
        children.append(
            {"object": "block", "type": "heading_2",
             "heading_2": {"rich_text": [{"type": "text", "text": {"content": "🎯 Executive Summary"}}]}}
        )
        children.extend(_build_text_blocks(sections["executive_summary"]))

    if sections.get("key_findings"):
        children.append(
            {"object": "block", "type": "heading_2",
             "heading_2": {"rich_text": [{"type": "text", "text": {"content": "🔑 Key Findings"}}]}}
        )
        for finding in sections["key_findings"]:
            children.append({
                "object": "block", "type": "bulleted_list_item",
                "bulleted_list_item": {"rich_text": _chunk_rich_text(finding)},
            })

    if sections.get("detailed_analysis"):
        children.append(
            {"object": "block", "type": "heading_2",
             "heading_2": {"rich_text": [{"type": "text", "text": {"content": "📈 Detailed Analysis"}}]}}
        )
        children.extend(_build_text_blocks(sections["detailed_analysis"]))

    if sections.get("conclusion"):
        children.append(
            {"object": "block", "type": "heading_2",
             "heading_2": {"rich_text": [{"type": "text", "text": {"content": "📝 Conclusion"}}]}}
        )
        children.extend(_build_text_blocks(sections["conclusion"]))

    if sections.get("recommendations"):
        children.append(
            {"object": "block", "type": "heading_2",
             "heading_2": {"rich_text": [{"type": "text", "text": {"content": "💡 Recommendations"}}]}}
        )
        for rec in sections["recommendations"]:
            children.append({
                "object": "block", "type": "numbered_list_item",
                "numbered_list_item": {"rich_text": _chunk_rich_text(rec)},
            })

    if sections.get("sources"):
        children.append(
            {"object": "block", "type": "heading_2",
             "heading_2": {"rich_text": [{"type": "text", "text": {"content": "🔗 Sources"}}]}}
        )
        children.append({
            "object": "block", "type": "toggle",
            "toggle": {
                "rich_text": [{"type": "text", "text": {"content": f"View all {sources_count} sources"}}],
                "children": [
                    {"object": "block", "type": "paragraph",
                     "paragraph": {"rich_text": _chunk_rich_text(s)}}
                    for s in sections["sources"]
                ],
            },
        })

    children += [
        {"object": "block", "type": "divider", "divider": {}},
        {
            "object": "block", "type": "callout",
            "callout": {
                "rich_text": [{"type": "text", "text": {"content":
                    f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} "
                    f"| Sources: {sources_count} | System: AI Deep Researcher"
                }}],
                "icon": {"emoji": "🤖"},
            },
        },
    ]

    return children


def parse_report_sections(report_content: str) -> dict:
    sections: dict = {}
    lines = report_content.split("\n")

    current_section  = None
    current_content: list[str] = []

    def _flush(new_section: str):
        nonlocal current_section, current_content
        if current_section:
            sections[current_section] = "\n".join(current_content).strip()
        current_section = new_section
        current_content = []

    import re
    for line in lines:
        line_lower = line.lower().strip()
        clean_line = line_lower.lstrip("0123456789.#*=-[ ]").strip()

        matched_section = None
        if clean_line.startswith("executive summary"): matched_section = "executive_summary"
        elif clean_line.startswith("key finding"): matched_section = "key_findings_text"
        elif clean_line.startswith("detailed analysis"): matched_section = "detailed_analysis"
        elif clean_line.startswith("practical recommendation") or clean_line.startswith("recommendation"): matched_section = "recommendations_text"
        elif clean_line.startswith("important resource") or clean_line.startswith("resource") or clean_line.startswith("sources"): matched_section = "sources_text"
        elif clean_line.startswith("conclusion"): matched_section = "conclusion"

        if matched_section:
            _flush(matched_section)
            parts = re.split(r'(?i)(executive summary|key findings|key finding|detailed analysis|practical recommendations|recommendations|important resources|resources|sources consulted|sources|conclusion)', line)
            if len(parts) > 2:
                after_header = parts[-1].strip().lstrip(":- ")
                if after_header:
                    current_content.append(after_header)
        else:
            if line.strip() and not set(line.strip()) <= set("=-_"):
                current_content.append(line)

    if current_section:
        sections[current_section] = "\n".join(current_content).strip()

    for raw_key, out_key in [
        ("key_findings_text",   "key_findings"),
        ("recommendations_text","recommendations"),
    ]:
        if raw_key in sections:
            items = []
            for line in sections[raw_key].split("\n"):
                line = line.strip()
                if line:
                    clean = line.lstrip("-•*0123456789. ").strip()
                    if clean:
                        items.append(clean)
            sections[out_key] = items

    if "sources_text" in sections:
        srcs = []
        for line in sections["sources_text"].split("\n"):
            line = line.strip()
            if "Report Generated:" in line or "Research Quality:" in line: break
            if line and not line.startswith("="):
                clean = line.lstrip("-•*0123456789.[] ").strip()
                if len(clean) > 5 and not clean.lower().startswith("sources consulted") and not clean.lower().startswith("important resources"):
                    srcs.append(clean)
        sections["sources"] = srcs

    return sections


def search_research_pages(keyword: str, notion_token: str | None = None, database_id: str | None = None) -> list | dict:
    try:
        notion = _client(notion_token)
        db_id  = _db_id(database_id)

        response = notion.databases.query(
            database_id=db_id,
            filter={
                "or": [
                    {"property": "Name",  "title":     {"contains": keyword}},
                    {"property": "Topic", "rich_text": {"contains": keyword}},
                    {"property": "Brief", "rich_text": {"contains": keyword}},
                ]
            },
        )

        return [
            {
                "title":   page["properties"]["Name"]["title"][0]["text"]["content"]
                           if page["properties"]["Name"]["title"] else "Untitled",
                "date":    page["properties"]["Date"]["date"]["start"]
                           if page["properties"].get("Date", {}).get("date") else "N/A",
                "url":     page["url"],
                "page_id": page["id"],
            }
            for page in response["results"]
        ]

    except Exception as e:
        return {"error": str(e)}


def list_all_research(notion_token: str | None = None, database_id: str | None = None) -> list | dict:
    try:
        notion = _client(notion_token)
        db_id  = _db_id(database_id)

        response = notion.databases.query(
            database_id=db_id,
            sorts=[{"property": "Date", "direction": "descending"}],
        )

        results = []
        for page in response["results"]:
            props = page["properties"]
            results.append({
                "title":   props["Name"]["title"][0]["text"]["content"]
                           if props["Name"]["title"] else "Untitled",
                "date":    props["Date"]["date"]["start"]
                           if props.get("Date", {}).get("date") else "N/A",
                "status":  props["Status"]["select"]["name"]
                           if props.get("Status", {}).get("select") else "N/A",
                "quality": props["Quality"]["select"]["name"]
                           if props.get("Quality", {}).get("select") else "N/A",
                "sources": props["Sources"]["number"]
                           if props.get("Sources", {}).get("number") is not None else 0,
                "url":     page["url"],
            })
        return results

    except Exception as e:
        return {"error": str(e)}


def get_research_stats(notion_token: str | None = None, database_id: str | None = None) -> dict:
    try:
        notion = _client(notion_token)
        db_id  = _db_id(database_id)

        response     = notion.databases.query(database_id=db_id)
        total        = len(response["results"])
        this_month   = 0
        total_sources= 0
        topics: dict = {}

        for page in response["results"]:
            props = page["properties"]

            date_prop = props.get("Date", {}).get("date")
            if date_prop:
                if datetime.fromisoformat(date_prop["start"]).month == datetime.now().month:
                    this_month += 1

            sources = props.get("Sources", {}).get("number")
            if sources:
                total_sources += sources

            for tag in props.get("Tags", {}).get("multi_select", []):
                name = tag["name"]
                topics[name] = topics.get(name, 0) + 1

        return {
            "total_reports": total,
            "this_month":    this_month,
            "total_sources": total_sources,
            "avg_sources":   round(total_sources / total, 1) if total > 0 else 0,
            "top_topics":    sorted(topics.items(), key=lambda x: x[1], reverse=True)[:5],
        }

    except Exception as e:
        return {"error": str(e)}
