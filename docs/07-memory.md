# Memory System — memory.js

> The agency remembers everything via a SQLite database with hybrid search.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   memory.js                       │
│                                                    │
│  SQLite database (WAL mode)                       │
│  ├── memory_chunks  → content, metadata, TTL      │
│  ├── memory_fts     → FTS5 BM25 keyword index     │
│  └── memory_vec     → vec0 384-dim embeddings     │
│                                                    │
│  Storage: .agency/memory/store.db                 │
│  JSON backup: .agency/memory/store.json           │
└─────────────────────────────────────────────────┘
```

## Storage

| Table | Engine | Purpose |
|-------|--------|---------|
| `memory_chunks` | SQLite | Raw content, project, source type, timestamps, access count |
| `memory_fts` | FTS5 (porter unicode61) | BM25 full-text keyword search with trigrams |
| `memory_vec` | vec0 | 384-dim cosine similarity via Transformers.js |

## Commands

### Store — Save Context

```bash
node .agency/scripts/memory.js store \
  --project <id> \
  --task "<id>" \
  --content "what happened and why" \
  --tags "tag1,tag2" \
  --source-type <terminal|summary|default>
```

**TTL by source type:**
| Source Type | TTL |
|-------------|-----|
| `terminal` | 30 days |
| `default` | 90 days |
| `summary` | Permanent |

### Recall — Hybrid Search

```bash
node .agency/scripts/memory.js recall \
  --query "what was the decision on X" \
  --project <id> \
  --limit 5 \
  --min-score 0.5
```

Scoring formula (BM25 + Vector + Recency + Frequency):

```
score = (0.40 × BM25) + (0.30 × Vector) + (0.20 × Recency) + (0.10 × Frequency)
```

| Component | Weight | Source |
|-----------|--------|--------|
| BM25 keyword match | 40% | FTS5 full-text index |
| Vector similarity | 30% | Transformers.js 384-dim embeddings |
| Recency boost | 20% | `(days ago)^-0.5` decay |
| Frequency boost | 10% | Access count / max access |

### Check — Memory Exists?

```bash
node .agency/scripts/memory.js check \
  --task "<id>" \
  --agent <slug> \
  --project <id>
```

Used by `enforcer.js POST` C1 check. Returns exit code 0 if found, 1 if not.

### Stats — Memory Health

```bash
node .agency/scripts/memory.js stats --project <id>
```

Returns: total chunks, by source type, by TTL status, average score.

### Compact — Summarize Old Chunks

```bash
node .agency/scripts/memory.js compact --project <id>
```

When >1000 chunks exist, oldest 200 are summarized via LLM. In live tasks, compaction is deferred via `MEMORY:PENDING` flag and handled asynchronously by `compact-memory.js` in the daily cron.

## Embeddings

Vector search uses `@xenova/transformers` (Transformers.js) pipeline with `Xenova/all-MiniLM-L6-v2`:

- **Dimensions:** 384
- **Local inference:** ~90MB RAM, no API calls
- **Fallback:** TF-IDF keyword scoring if Transformers.js unavailable

## Export/Import

```bash
# Export project memory to JSON (for backup or revival)
node .agency/scripts/memory.js export \
  --project <id> \
  --output .agency/archives/<project>-<date>.json

# Import back on project revival
node .agency/scripts/memory.js import \
  --input .agency/archives/<project>-<date>.json \
  --project <id>
```

## Project Pinger

Inactive projects (>20 days without commits) are automatically archived by `project-pinger.js`:

```bash
node .agency/scripts/project-pinger.js           # run daily
node .agency/scripts/project-pinger.js --dry-run  # preview only
node .agency/scripts/project-pinger.js --force <project-id>  # force archive
```

On revival, the Lead Architect imports the latest archive before running `memory.js recall` to restore context.

## Related

- [Self-improvement loop →](06-self-improvement.md)
- [Enforcement gates →](05-enforcement.md)
