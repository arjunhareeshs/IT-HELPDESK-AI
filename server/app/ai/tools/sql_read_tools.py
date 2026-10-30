import logging
from typing import Any
import sqlglot
from sqlglot import exp
from langchain_core.tools import tool
from app.config import settings

logger = logging.getLogger(__name__)

ALLOWLISTED_TABLES = {
    "ai_ticket_search_v",
    "ai_resolution_search_v",
    "category_policies",
    "priority_policies",
    "technician_skills",
}

# Tables carrying a college_id column; reads are constrained to the ticket's college server-side.
COLLEGE_SCOPED_TABLES = {"ai_ticket_search_v"}

DISALLOWED_EXPRESSIONS = (
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Drop,
    exp.Create,
    exp.Alter,
    exp.Command,
)


def validate_sql_query(sql: str, table_scope: str | None = None) -> tuple[bool, str | None, list[str]]:
    """Parse and validate SQL query using sqlglot per Section 6."""
    if table_scope and table_scope not in ALLOWLISTED_TABLES:
        return False, f"Table scope '{table_scope}' is not in allowlist {sorted(ALLOWLISTED_TABLES)}.", []

    try:
        parsed_statements = sqlglot.parse(sql, read="postgres")
    except Exception as e:
        return False, f"SQL syntax parsing error: {str(e)}", []

    if not parsed_statements:
        return False, "Empty query provided.", []

    if len(parsed_statements) > 1:
        return False, "Multiple SQL statements are rejected. Exactly one statement allowed.", []

    statement = parsed_statements[0]
    if statement is None:
        return False, "Invalid SQL statement.", []

    for disallowed in DISALLOWED_EXPRESSIONS:
        if statement.find(disallowed):
            return False, f"Disallowed statement type: {disallowed.__name__}", []

    if not isinstance(statement, exp.Select):
        return False, f"Disallowed statement type: {type(statement).__name__}. Only SELECT queries are permitted.", []

    if statement.find(exp.Into):
        return False, "SELECT INTO is prohibited.", []

    # Unknown functions (pg_sleep, pg_read_file, ...) stay as exp.Anonymous in sqlglot.
    if statement.find(exp.Anonymous):
        return False, "Calls to unreviewed functions are not permitted.", []

    if statement.args.get("locks"):
        return False, "Locking clauses are prohibited.", []

    tables = list(statement.find_all(exp.Table))
    if not tables:
        return False, "Query must read from an allowlisted table.", []
    for table in tables:
        if table.args.get("db") or table.args.get("catalog"):
            return False, "Schema-qualified table names are not permitted.", []

    referenced_tables = [table.name.lower() for table in tables if table.name]
    for tbl in referenced_tables:
        if tbl not in ALLOWLISTED_TABLES:
            return False, f"Table '{tbl}' is not in allowlisted views {sorted(ALLOWLISTED_TABLES)}.", []

    return True, None, referenced_tables


def scope_to_college(sql: str, college_id: str) -> str:
    """Enforce tenant scoping server-side for tables that carry a college_id column."""
    statement = sqlglot.parse_one(sql, read="postgres")
    if any(t.name.lower() in COLLEGE_SCOPED_TABLES for t in statement.find_all(exp.Table)):
        statement = statement.where(
            exp.EQ(this=exp.column("college_id"), expression=exp.Literal.string(college_id)),
            copy=False,
        )
    return statement.sql(dialect="postgres")


def _jsonable(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if hasattr(value, "as_tuple"):
        return float(value)
    return str(value)


def _execute_readonly(sql: str, max_rows: int, timeout_ms: int) -> list[dict[str, Any]]:
    """Run a validated SELECT in a read-only transaction with a statement timeout and row cap."""
    from sqlalchemy import text
    from app.db.session import get_db_session

    session = get_db_session()
    try:
        session.execute(text("SET TRANSACTION READ ONLY"))
        session.execute(text(f"SET LOCAL statement_timeout = {int(timeout_ms)}"))
        result = session.execute(text(sql))
        rows = result.mappings().fetchmany(max_rows)
        return [{k: _jsonable(v) for k, v in row.items()} for row in rows]
    finally:
        session.rollback()
        session.close()


def build_sql_tool(current_ticket_id: str, allowed_college_id: str):
    """Build bounded read-only SQL research tool per Section 6."""
    repair_counter = {"attempts": 0}

    @tool
    async def run_readonly_ticket_query(sql: str, table_scope: str, purpose: str) -> dict:
        """Run a tightly restricted read-only SQL query against allowlisted search views."""
        is_valid, error_msg, tables = validate_sql_query(sql, table_scope)

        if not is_valid:
            repair_counter["attempts"] += 1
            if repair_counter["attempts"] > settings.LLM_QUERY_MAX_REPAIR_ATTEMPTS:
                return {
                    "success": False,
                    "error": f"Maximum repair attempts exceeded. Last error: {error_msg}",
                    "row_count": 0,
                    "rows": [],
                }
            return {
                "success": False,
                "error": f"Validation failed: {error_msg}. You may repair your query ({repair_counter['attempts']}/{settings.LLM_QUERY_MAX_REPAIR_ATTEMPTS}).",
                "row_count": 0,
                "rows": [],
            }

        try:
            rows = _execute_readonly(
                scope_to_college(sql, allowed_college_id),
                settings.LLM_MAX_TOOL_ROWS,
                settings.LLM_QUERY_TIMEOUT_MS,
            )
        except Exception as exc:
            # Never return fabricated rows; give the model a sanitized, bounded error instead.
            logger.warning("Read-only ticket query failed for ticket %s: %s", current_ticket_id, exc)
            return {
                "success": False,
                "table_scope": table_scope,
                "error": "Query could not be executed. Check column names and syntax.",
                "row_count": 0,
                "rows": [],
            }

        return {
            "success": True,
            "table_scope": table_scope,
            "row_count": len(rows),
            "rows": rows,
            "error": None,
        }

    return run_readonly_ticket_query
