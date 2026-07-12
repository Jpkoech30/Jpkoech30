# Memory v2.0 — Architecture Plan

**Status:** `APPROVED` | **Lead:** 🧠 Lead Architect | **Created:** 2026-07-11
**Contract:** `agency-memory@2.0.0` | **Sprint:** 19

---

## 1. Problem Summary

Current memory system (`agency-memory@1.0.0`) has 4 critical limitations:

| Limitation | Impact |
|-----------|--------|
| TF-IDF keyword embedding (hash-based) — no semantic understanding | Recall scores are low for conceptual queries; synonyms miss entirely |
| No FTS (Full-Text Search) — only vector similarity | Queries for exact matches (e.g., "preflight-gate.js") have poor recall |
| No access metadata tracking | Cannot surface frequently accessed or recently accessed memories |
| JSON fallback is a parallel storage path | Inconsistency risk; JSON can drift from SQLite |
| No compaction/TTL | Store grows unbounded; old irrelevant memories degrade search quality |

## 2. Solution Architecture

### 2.1 New Schema (SQLite-only)

Replace the current `memories` + `tags_index` tables with three tables:

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   memory_chunks     │      │    memory_fts        │      │    memory_vec       │
├─────────────────────┤      │  (FTS5 virtual)      │      │  (vec0 virtual)     │
│ id TEXT PK          │      ├─────────────────────┤      ├─────────────────────┤
│ project_name TEXT   │◄────►│ content             │◄────►│ id TEXT PK          │
│ content TEXT        │      │ (auto-synced via    │      │ embedding FLOAT[384]│
│ source_type TEXT    │      │  triggers)          │      │ (auto-synced via    │
│ created_at INTEGER  │      └─────────────────────┘      │  application code)  │
│ last_accessed INT   │                                    └─────────────────────┘
│ access_count INT    │
│ token_count INT     │
└─────────────────────┘
```

**Key changes from v1:**
- `project_name` replaces implicit directory-based scoping → enables per-project queries
- `source_type` enum: `summary` (default), `decision`, `code-pattern`, `error`, `observation`
- `created_at` / `last_accessed` / `access_count` as INTEGER (Unix epoch) for time-based math
- `token_count` for TTL/compaction budgeting
- `id` remains TEXT (UUID v4)
- FTS5 with `porter unicode61` tokenizer for English stemming
- vec0 with 384-dim (reduced from 768-dim — all-MiniLM-L6-v2 outputs 384)

### 2.2 Hybrid Search Formula

```
final_score = (0.40 × bm25_normalized) 
            + (0.30 × cosine_similarity) 
            + (0.20 × recency_boost) 
            + (0.10 × frequency_boost)
```

Where:
- **BM25 score** → FTS5 `bm25()` function, normalized to [0,1]
- **Cosine similarity** → vec0 `vec_distance_cosine()`, mapped to [0,1]
- **Recency boost** → `1.0 - (days_since_last_access / 90)`, clamped to [0,1]
- **Frequency boost** → `min(access_count / 10, 1.0)`
- **Filter** → results with `final_score < 0.05` are discarded
- **Return** → top-K (configurable, default 5)

### 2.3 Embedding Engine

Replace TF-IDF hash-based embedding with **Transformers.js** (`@xenova/transformers`):

| Property | v1 (Current) | v2 (Target) |
|----------|-------------|-------------|
| Model | Custom hash-based | `Xenova/all-MiniLM-L6-v2` |
| Dimension | 768 | 384 |
| Semantic? | No (keyword frequency) | Yes (transformer embeddings) |
| Duration | ~0ms (instant) | ~50-200ms per embed |
| Dependencies | None | `@xenova/transformers` (npm) |

**Fallback chain:**
1. Transformers.js → returns 384-dim embedding
2. If Transformers.js unavailable → use v1 TF-IDF (768-dim, truncated/avg-pooled to 384-dim)
3. If both fail → zero vector (relevance score will be 0, filtered out)

### 2.4 Metadata Tracking

Every `recall` hit must update:

```sql
UPDATE memory_chunks 
SET last_accessed = unixepoch(), access_count = access_count + 1 
WHERE id = ?
```

This is a fire-and-forget write — no need to wait for it before returning results.

### 2.5 Compaction & TTL

| Source Type | TTL | Compaction Trigger | Action |
|------------|-----|-------------------|--------|
| `terminal` | 30 days | N/A (purge at TTL) | Hard delete |
| `summary` | Permanent | When chunks > 1000 | LLM-summarize oldest 200 into 1 chunk |
| `code-pattern` | 90 days | When chunks > 1000 | Summarize oldest 200 |
| `decision` | Permanent | Never | Preserve forever |
| `error` | 90 days | When chunks > 500 | Purge oldest 100 |
| `observation` | 90 days | When chunks > 500 | Purge oldest 100 |

**Compaction process:**
1. Count chunks per `source_type`
2. If any exceeds threshold → select oldest N (sorted by `last_accessed ASC`)
3. Concatenate content → call LLM to produce summary
4. Delete old chunks → insert new summary chunk
5. Commit as single transaction

### 2.6 JSON Demotion

JSON is now **backup-only**:

| Operation | SQLite | JSON |
|-----------|--------|------|
| Store | ✅ Always | ❌ Never during runtime |
| Recall | ✅ Always | ❌ Never during runtime |
| Export | Source | Destination |
| Import | Destination | Source |

**New commands:**
- `export --project <id>` → dumps SQLite to `.agency/memory/store.json`
- `import --project <id>` → loads JSON into SQLite (only if DB is empty or `--force`)

### 2.7 Dependency Changes

| Package | v1 | v2 | Reason |
|---------|----|----|--------|
| `better-sqlite3` | ✅ Optional | ✅ Required | No more JSON fallback |
| `sqlite-vec` | ✅ Optional | ✅ Optional | vec0 virtual table for cosine distance |
| `@xenova/transformers` | ❌ Not used | ✅ Optional | Embedding engine (npm ~5MB) |

## 3. Migration Path

### 3.1 Schema Migration

```sql
-- Step 1: Create new tables
CREATE TABLE IF NOT EXISTS memory_chunks ( ... );
CREATE VIRTUAL TABLE memory_fts USING fts5( ... );
CREATE VIRTUAL TABLE memory_vec USING vec0( ... );

-- Step 2: Migrate data from old tables
INSERT INTO memory_chunks (id, project_name, content, source_type, created_at, last_accessed, access_count, token_count)
SELECT id, 'global', content, 'summary', strftime('%s', created_at), strftime('%s', created_at), 1, 0
FROM memories;

-- Step 3: Drop old tables (opt-in via --force)
DROP TABLE IF EXISTS memories;
DROP TABLE IF EXISTS tags_index;
```

### 3.2 Rollback Plan

If v2 migration fails:
1. Keep old `memories` and `tags_index` tables until v2 is validated
2. `memory.js --fallback-v1` flag falls back to v1 schema
3. Export v2 data → import to v1 format

## 4. File Changes

| File | Action | Description |
|------|--------|-------------|
| `.agency/scripts/memory.js` | **REWRITE** | Full v2 implementation |
| `.agency/memory/schema.sql` | **REWRITE** | New v2 schema |
| `.agency/contracts/agency-memory.json` | **UPDATE** | Bump to v2.0.0 |
| `package.json` | **UPDATE** | Add `@xenova/transformers` (optional dep) |
| `.agency/plans/memory-v2-plan.md` | **CREATE** | This file |

## 5. Edge Cases

| # | Edge Case | Handling |
|---|-----------|----------|
| EC1 | Transformers.js fails to load (OOM on small devices) | Fallback to TF-IDF 384-dim via avg-pooling from 768 |
| EC2 | FTS5 MATCH syntax error from user query | Sanitize query: strip special FTS5 operators (`, *, "), wrap terms in double quotes |
| EC3 | vec0 table not available (sqlite-vec not loaded) | Fallback to in-memory cosine similarity over row-by-row |
| EC4 | Concurrent writes to metadata (last_accessed) | Use `BEGIN IMMEDIATE` transaction; accept minor accuracy loss (fire-and-forget pattern) |
| EC5 | Migration from v1 where JSON has no embedding field | Treat missing embedding as zero vector; score will be 0, filtered out |
| EC6 | Compaction creates infinite loop (summarize → new chunk → triggers compaction again) | Exempt newly created summary chunks from compaction for 24h via `created_at` check |
| EC7 | `--project` flag with non-existent project | Create project memory dir on-the-fly (same behavior as v1) |
| EC8 | Empty database after `import` with `--force` | Validate SQLite DB before import: count rows, warn if non-empty |
