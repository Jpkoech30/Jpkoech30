-- Agency Memory Store (SQLite + sqlite-vec)

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding FLOAT[] NOT NULL,
  tags TEXT,
  taskId TEXT,
  agentSlug TEXT,
  createdAt TEXT NOT NULL,
  sourceFile TEXT
);

CREATE TABLE IF NOT EXISTS tags_index (
  tag TEXT NOT NULL,
  memoryId TEXT NOT NULL REFERENCES memories(id)
);

CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories(tags);
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(createdAt);
CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags_index(tag);
