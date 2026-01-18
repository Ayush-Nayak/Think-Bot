from notion_client import Client
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

notion = Client(auth=os.getenv("NOTION_TOKEN"))
DATABASE_ID = os.getenv("NOTION_DATABASE_ID")


def clean_tag(tag):
    """Clean tag to be valid for Notion multi-select (no commas allowed)"""
    if not tag:
        return "General"
    cleaned = tag.replace(',', ' -')
    cleaned = cleaned.strip()
    if len(cleaned) > 100:
        cleaned = cleaned[:97] + "..."
    return cleaned if cleaned else "General"


def create_research_page(title, research_brief, report_content, sources_count, key_topics):
    try:
        properties = {
            "Name": {"title": [{"text": {"content": title}}]},
            "Topic": {"rich_text": [{"text": {"content": title[:100]}}]},
            "Date": {"date": {"start": datetime.now().isoformat()}},
            "Status": {"select": {"name": "Complete"}},
            "Quality": {"select": {"name": "⭐⭐⭐⭐⭐"}},
            "Sources": {"number": sources_count},
            "Tags": {"multi_select": [{"name": clean_tag(topic)} for topic in key_topics[:3]]},
            "Brief": {"rich_text": [{"text": {"content": research_brief[:2000]}}]}
        }

        sections = parse_report_sections(report_content)

        children = [
            {
                "object": "block",
                "type": "heading_1",
                "heading_1": {
                    "rich_text": [{"type": "text", "text": {"content": "📊 Research Report"}}]
                }
            },
            {
                "object": "block",
                "type": "divider",
                "divider": {}
            }
        ]

        if sections.get("executive_summary"):
            children.extend([
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [{"type": "text", "text": {"content": "🎯 Executive Summary"}}]
                    }
                },
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": sections["executive_summary"]}}]
                    }
                }
            ])

        if sections.get("key_findings"):
            children.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "🔑 Key Findings"}}]
                }
            })
            for finding in sections["key_findings"][:10]:
                children.append({
                    "object": "block",
                    "type": "bulleted_list_item",
                    "bulleted_list_item": {
                        "rich_text": [{"type": "text", "text": {"content": finding}}]
                    }
                })

        if sections.get("detailed_analysis"):
            children.extend([
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [{"type": "text", "text": {"content": "📈 Detailed Analysis"}}]
                    }
                },
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": sections["detailed_analysis"][:2000]}}]
                    }
                }
            ])

        if sections.get("recommendations"):
            children.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "💡 Recommendations"}}]
                }
            })
            for rec in sections["recommendations"][:10]:
                children.append({
                    "object": "block",
                    "type": "numbered_list_item",
                    "numbered_list_item": {
                        "rich_text": [{"type": "text", "text": {"content": rec}}]
                    }
                })

        if sections.get("sources"):
            children.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {
                    "rich_text": [{"type": "text", "text": {"content": "🔗 Sources"}}]
                }
            })
            children.append({
                "object": "block",
                "type": "toggle",
                "toggle": {
                    "rich_text": [{"type": "text", "text": {"content": f"View all {sources_count} sources"}}],
                    "children": [
                        {
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [{"type": "text", "text": {"content": source}}]
                            }
                        }
                        for source in sections["sources"][:25]
                    ]
                }
            })

        children.append({
            "object": "block",
            "type": "divider",
            "divider": {}
        })
        children.append({
            "object": "block",
            "type": "callout",
            "callout": {
                "rich_text": [{"type": "text", "text": {"content": f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Sources: {sources_count} | System: AI Deep Researcher"}}],
                "icon": {"emoji": "🤖"}
            }
        })

        page = notion.pages.create(
            parent={"database_id": DATABASE_ID},
            properties=properties,
            children=children
        )

        return {
            "success": True,
            "page_id": page["id"],
            "url": page["url"],
            "title": title
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def parse_report_sections(report_content):
    sections = {}
    lines = report_content.split('\n')

    current_section = None
    current_content = []

    for line in lines:
        line_lower = line.lower().strip()

        if 'executive summary' in line_lower:
            if current_section:
                sections[current_section] = '\n'.join(current_content).strip()
            current_section = 'executive_summary'
            current_content = []
        elif 'key finding' in line_lower:
            if current_section:
                sections[current_section] = '\n'.join(current_content).strip()
            current_section = 'key_findings_text'
            current_content = []
        elif 'detailed analysis' in line_lower:
            if current_section:
                sections[current_section] = '\n'.join(current_content).strip()
            current_section = 'detailed_analysis'
            current_content = []
        elif 'recommendation' in line_lower or 'practical recommendation' in line_lower:
            if current_section:
                sections[current_section] = '\n'.join(current_content).strip()
            current_section = 'recommendations_text'
            current_content = []
        elif 'sources consulted' in line_lower:
            if current_section:
                sections[current_section] = '\n'.join(current_content).strip()
            current_section = 'sources_text'
            current_content = []
        elif line.strip() and not line.startswith('='):
            current_content.append(line)

    if current_section:
        sections[current_section] = '\n'.join(current_content).strip()

    if 'key_findings_text' in sections:
        findings = []
        for line in sections['key_findings_text'].split('\n'):
            line = line.strip()
            if line and (line.startswith('-') or line.startswith('•') or line.startswith('*') or line[0].isdigit()):
                clean_line = line.lstrip('-•*0123456789. ').strip()
                if clean_line:
                    findings.append(clean_line)
        sections['key_findings'] = findings

    if 'recommendations_text' in sections:
        recs = []
        for line in sections['recommendations_text'].split('\n'):
            line = line.strip()
            if line and (line.startswith('-') or line.startswith('•') or line.startswith('*') or line[0].isdigit()):
                clean_line = line.lstrip('-•*0123456789. ').strip()
                if clean_line:
                    recs.append(clean_line)
        sections['recommendations'] = recs

    if 'sources_text' in sections:
        sources = []
        for line in sections['sources_text'].split('\n'):
            line = line.strip()
            if line and (line.startswith('http') or line[0].isdigit()):
                clean_line = line.lstrip('0123456789. ').strip()
                if clean_line and len(clean_line) > 10:
                    sources.append(clean_line)
        sections['sources'] = sources

    return sections


def search_research_pages(keyword):
    try:
        response = notion.databases.query(
            database_id=DATABASE_ID,
            filter={
                "or": [
                    {"property": "Name", "title": {"contains": keyword}},
                    {"property": "Topic", "rich_text": {"contains": keyword}},
                    {"property": "Brief", "rich_text": {"contains": keyword}}
                ]
            }
        )

        results = []
        for page in response["results"]:
            title = page["properties"]["Name"]["title"][0]["text"]["content"] if page["properties"]["Name"]["title"] else "Untitled"
            date = page["properties"]["Date"]["date"]["start"] if page["properties"].get("Date", {}).get("date") else "N/A"
            url = page["url"]

            results.append({
                "title": title,
                "date": date,
                "url": url,
                "page_id": page["id"]
            })

        return results
    except Exception as e:
        return {"error": str(e)}


def list_all_research():
    try:
        response = notion.databases.query(
            database_id=DATABASE_ID,
            sorts=[{"property": "Date", "direction": "descending"}]
        )

        results = []
        for page in response["results"]:
            props = page["properties"]
            title = props["Name"]["title"][0]["text"]["content"] if props["Name"]["title"] else "Untitled"
            date = props["Date"]["date"]["start"] if props.get("Date", {}).get("date") else "N/A"
            status = props["Status"]["select"]["name"] if props.get("Status", {}).get("select") else "N/A"
            quality = props["Quality"]["select"]["name"] if props.get("Quality", {}).get("select") else "N/A"
            sources = props["Sources"]["number"] if props.get("Sources", {}).get("number") is not None else 0

            results.append({
                "title": title,
                "date": date,
                "status": status,
                "quality": quality,
                "sources": sources,
                "url": page["url"]
            })

        return results
    except Exception as e:
        return {"error": str(e)}


def get_research_stats():
    try:
        response = notion.databases.query(database_id=DATABASE_ID)

        total = len(response["results"])

        this_month = 0
        total_sources = 0
        topics = {}

        for page in response["results"]:
            props = page["properties"]

            date_prop = props.get("Date", {}).get("date")
            if date_prop:
                date_str = date_prop["start"]
                if datetime.fromisoformat(date_str).month == datetime.now().month:
                    this_month += 1

            sources = props.get("Sources", {}).get("number")
            if sources:
                total_sources += sources

            tags = props.get("Tags", {}).get("multi_select", [])
            for tag in tags:
                tag_name = tag["name"]
                topics[tag_name] = topics.get(tag_name, 0) + 1

        return {
            "total_reports": total,
            "this_month": this_month,
            "total_sources": total_sources,
            "avg_sources": round(total_sources / total, 1) if total > 0 else 0,
            "top_topics": sorted(topics.items(), key=lambda x: x[1], reverse=True)[:5]
        }
    except Exception as e:
        return {"error": str(e)}
