-- Agency Memory Store v2.0 (SQLite + FTS5 + vec0)
-- Contract: agency-memory@2.0.0
-- NOTE: vec0 table is created programmatically after sqlite-vec extension loads

-- Core memory chunks table
CREATE TABLE IF NOT EXISTS memory_chunks (
    id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    task_id TEXT,
    agent_slug TEXT,
    source_type TEXT NOT NULL DEFAULT 'summary',
    source_file TEXT,
    created_at INTEGER NOT NULL,
    last_accessed INTEGER NOT NULL,
    access_count INTEGER DEFAULT 1,
    token_count INTEGER DEFAULT 0
);

-- FTS5 full-text search index (auto-synced via triggers)
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
    content,
    content='memory_chunks',
    content_rowid='rowid',
    tokenize='porter unicode61'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS memory_fts_insert AFTER INSERT ON memory_chunks BEGIN
    INSERT INTO memory_fts(rowid, content) VALUES (new.rowid, new.content);
END;

CREATE TRIGGER IF NOT EXISTS memory_fts_delete AFTER DELETE ON memory_chunks BEGIN
    INSERT INTO memory_fts(memory_fts, rowid, content) VALUES('delete', old.rowid, old.content);
END;

CREATE TRIGGER IF NOT EXISTS memory_fts_update AFTER UPDATE ON memory_chunks BEGIN
    INSERT INTO memory_fts(memory_fts, rowid, content) VALUES('delete', old.rowid, old.content);
    INSERT INTO memory_fts(rowid, content) VALUES (new.rowid, new.content);
END;

-- Tags index for fast filtering
CREATE TABLE IF NOT EXISTS tags_index (
    tag TEXT NOT NULL,
    memory_id TEXT NOT NULL REFERENCES memory_chunks(id)
);

CREATE INDEX IF NOT EXISTS idx_chunks_project ON memory_chunks(project_name);
CREATE INDEX IF NOT EXISTS idx_chunks_source_type ON memory_chunks(source_type);
CREATE INDEX IF NOT EXISTS idx_chunks_created ON memory_chunks(created_at);
CREATE INDEX IF NOT EXISTS idx_chunks_last_accessed ON memory_chunks(last_accessed);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags_index(tag);
CREATE INDEX IF NOT EXISTS idx_tags_memory ON tags_index(memory_id);
