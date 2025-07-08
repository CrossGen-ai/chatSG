-- Migration: Create chat session tables for PostgreSQL storage
-- This replaces the JSONL file-based storage with a proper relational structure

-- 1. Chat Sessions Table
-- Stores session metadata and state
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER NOT NULL DEFAULT 0,
    unread_count INTEGER NOT NULL DEFAULT 0,
    last_read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    
    -- Ensure valid status values
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'archived', 'deleted'))
);

-- Indexes for chat_sessions
CREATE INDEX idx_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_sessions_status ON chat_sessions(status);
CREATE INDEX idx_sessions_last_activity ON chat_sessions(last_activity_at DESC);
CREATE INDEX idx_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX idx_sessions_metadata ON chat_sessions USING GIN(metadata);
-- Composite index for common queries
CREATE INDEX idx_sessions_user_status_activity ON chat_sessions(user_id, status, last_activity_at DESC);

-- 2. Chat Messages Table
-- Stores all messages in conversations
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    -- embedding vector(1536), -- Uncomment when pgvector is available
    
    -- Ensure valid message types
    CONSTRAINT valid_type CHECK (type IN ('user', 'assistant', 'system'))
);

-- Indexes for chat_messages
CREATE INDEX idx_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_messages_timestamp ON chat_messages(session_id, created_at DESC);
CREATE INDEX idx_messages_type ON chat_messages(type);
CREATE INDEX idx_messages_metadata ON chat_messages USING GIN(metadata);
-- Composite index for fetching recent messages
CREATE INDEX idx_messages_session_timestamp_id ON chat_messages(session_id, created_at DESC, id DESC);

-- 3. Chat Tool Executions Table
-- Tracks tool usage within conversations
CREATE TABLE IF NOT EXISTS chat_tool_executions (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_id BIGINT REFERENCES chat_messages(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    tool_input JSONB NOT NULL,
    tool_output JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER, -- Calculated duration in milliseconds
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Ensure valid status values
    CONSTRAINT valid_tool_status CHECK (status IN ('pending', 'running', 'success', 'error'))
);

-- Indexes for chat_tool_executions
CREATE INDEX idx_tools_session_id ON chat_tool_executions(session_id);
CREATE INDEX idx_tools_message_id ON chat_tool_executions(message_id);
CREATE INDEX idx_tools_status ON chat_tool_executions(status);
CREATE INDEX idx_tools_tool_name ON chat_tool_executions(tool_name);
CREATE INDEX idx_tools_started_at ON chat_tool_executions(started_at DESC);

-- 4. Helper Functions

-- Function to update last_activity_at and message_count
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update session activity timestamp and increment message count
    UPDATE chat_sessions 
    SET 
        last_activity_at = CURRENT_TIMESTAMP,
        message_count = message_count + 1
    WHERE id = NEW.session_id;
    
    -- If it's an assistant message, increment unread count
    IF NEW.type = 'assistant' THEN
        UPDATE chat_sessions 
        SET unread_count = unread_count + 1
        WHERE id = NEW.session_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update session on new message
CREATE TRIGGER update_session_on_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_session_activity();

-- Function to calculate tool execution duration
CREATE OR REPLACE FUNCTION update_tool_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.duration_ms = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) * 1000;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to calculate duration on tool completion
CREATE TRIGGER calculate_tool_duration
BEFORE UPDATE ON chat_tool_executions
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION update_tool_duration();

-- 5. Views for common queries

-- View for sessions with last message preview
CREATE VIEW chat_sessions_with_last_message AS
SELECT 
    s.*,
    lm.last_message_id,
    lm.last_message_type,
    lm.last_message_content,
    lm.last_message_timestamp
FROM chat_sessions s
LEFT JOIN LATERAL (
    SELECT 
        id as last_message_id,
        type as last_message_type,
        content as last_message_content,
        created_at as last_message_timestamp
    FROM chat_messages
    WHERE session_id = s.id
    ORDER BY created_at DESC
    LIMIT 1
) lm ON true;

-- 6. Utility functions

-- Function to get session context (last N messages)
CREATE OR REPLACE FUNCTION get_session_context(
    p_session_id VARCHAR(255),
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id BIGINT,
    type VARCHAR(20),
    content TEXT,
    created_at TIMESTAMPTZ,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT m.id, m.type, m.content, m.created_at, m.metadata
    FROM chat_messages m
    WHERE m.session_id = p_session_id
    ORDER BY m.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to mark session as read
CREATE OR REPLACE FUNCTION mark_session_read(p_session_id VARCHAR(255))
RETURNS void AS $$
BEGIN
    UPDATE chat_sessions
    SET 
        unread_count = 0,
        last_read_at = CURRENT_TIMESTAMP
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE chat_sessions IS 'Stores chat session metadata and state';
COMMENT ON TABLE chat_messages IS 'Stores all messages within chat sessions';
COMMENT ON TABLE chat_tool_executions IS 'Tracks tool usage and execution details';
COMMENT ON COLUMN chat_sessions.metadata IS 'Flexible JSONB storage for session-specific data like lastAgent, preferences, etc';
COMMENT ON COLUMN chat_messages.metadata IS 'Message metadata including agent, confidence, toolsUsed, etc';