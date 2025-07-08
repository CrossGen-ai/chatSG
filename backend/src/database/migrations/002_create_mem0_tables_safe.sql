-- Create mem0_memories table for storing memory embeddings
-- This version works without pgvector extension for initial setup

-- First, try to enable pgvector if available (won't fail if not installed)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pgvector extension not available - will use regular columns';
END
$$;

-- Create mem0_memories table with conditional vector column
CREATE TABLE IF NOT EXISTS mem0_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  memory TEXT NOT NULL,
  -- Store embedding as JSONB if vector type not available
  embedding JSONB, -- Will store array of floats
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_mem0_memories_user_id ON mem0_memories(user_id);
CREATE INDEX idx_mem0_memories_session_id ON mem0_memories(session_id);
CREATE INDEX idx_mem0_memories_user_session ON mem0_memories(user_id, session_id);
CREATE INDEX idx_mem0_memories_created_at ON mem0_memories(created_at);

-- Create mem0_history table for tracking memory changes
CREATE TABLE IF NOT EXISTS mem0_history (
  id SERIAL PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES mem0_memories(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted'
  previous_content TEXT,
  new_content TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for history table
CREATE INDEX idx_mem0_history_memory_id ON mem0_history(memory_id);
CREATE INDEX idx_mem0_history_user_id ON mem0_history(user_id);
CREATE INDEX idx_mem0_history_created_at ON mem0_history(created_at);

-- Create mem0_metadata table for collection-level metadata
CREATE TABLE IF NOT EXISTS mem0_metadata (
  id SERIAL PRIMARY KEY,
  collection_name VARCHAR(255) NOT NULL DEFAULT 'chatsg_memories',
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_memories INTEGER DEFAULT 0,
  last_memory_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(collection_name, user_id)
);

-- Create index for metadata lookups
CREATE INDEX idx_mem0_metadata_user_id ON mem0_metadata(user_id);

-- Create function to update memory count
CREATE OR REPLACE FUNCTION update_mem0_metadata_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO mem0_metadata (collection_name, user_id, total_memories, last_memory_at)
    VALUES ('chatsg_memories', NEW.user_id, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (collection_name, user_id) 
    DO UPDATE SET 
      total_memories = mem0_metadata.total_memories + 1,
      last_memory_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE mem0_metadata 
    SET total_memories = GREATEST(0, total_memories - 1),
        updated_at = CURRENT_TIMESTAMP
    WHERE collection_name = 'chatsg_memories' AND user_id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update metadata counts
CREATE TRIGGER update_mem0_metadata_on_memory_change
AFTER INSERT OR DELETE ON mem0_memories
FOR EACH ROW EXECUTE FUNCTION update_mem0_metadata_count();

-- Create or replace the update_updated_at_column function (in case it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to update updated_at on mem0_memories table
CREATE TRIGGER update_mem0_memories_updated_at BEFORE UPDATE
  ON mem0_memories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to update updated_at on mem0_metadata table
CREATE TRIGGER update_mem0_metadata_updated_at BEFORE UPDATE
  ON mem0_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();