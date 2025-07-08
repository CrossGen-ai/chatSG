-- Drop chat tables for clean re-run of migration

DROP VIEW IF EXISTS chat_sessions_with_last_message CASCADE;
DROP FUNCTION IF EXISTS get_session_context(VARCHAR, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS mark_session_read(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS update_tool_duration() CASCADE;
DROP FUNCTION IF EXISTS update_session_activity() CASCADE;

DROP TABLE IF EXISTS chat_tool_executions CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;