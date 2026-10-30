from typing import Any
from app.ai.tools.ticket_tools import build_ticket_tools
from app.ai.tools.sql_read_tools import build_sql_tool


def get_scoped_tools(current_ticket_id: str, allowed_college_id: str) -> list[Any]:
    """Assemble all authorized read-only tools for a specific ticket run."""
    tools = build_ticket_tools(current_ticket_id, allowed_college_id)
    sql_tool = build_sql_tool(current_ticket_id, allowed_college_id)
    tools.append(sql_tool)
    return tools
