# Memory System Demo

> **How agency memory works and what's stored.**

---

## How to Use Memory

```bash
# Store a decision
node .agency/scripts/memory.js store --content "What was decided and why" --tags "key-topic" --task "task-id" --agent "agent-slug"

# Recall relevant decisions
node .agency/scripts/memory.js recall --query "what you're working on" --limit 5

# Filter by minimum relevance
node .agency/scripts/memory.js recall --query "handoff protocol" --min-score 0.5

# See stats
node .agency/scripts/memory.js stats
```

---

## Current Memory Stats

| Metric | Value |
|--------|-------|
| Total entries | **35** |
| Earliest | Multi-Project Orchestration (Principal 14) |
| Latest | Simba Code rebrand fix |
| Topics covered | 18 sprints of agency work |

---

## Live Recall Demo

### Query: "how does the post-task gate work"

```
node .agency/scripts/memory.js recall --query "how does the post-task gate work" --limit 2
```

Returns Sprint 14 entry explaining PTG with 6 checkpoints (C1-C6) and how handoff.js blocks on failure.

### Query: "what did we learn about text enforcement"

```
node .agency/scripts/memory.js recall --query "why text enforcement fails" --limit 2
```

Returns the critical finding: "Text-based enforcement doesn't work with LLM agents. All gates are text instructions — agents can and do ignore them. Only tool-level enforcement (fileRegex) is real."

---

## Why Memory Matters

1. **Prevents repeating mistakes** — The fork failure is stored. Next time we consider forking, recall surfaces what went wrong.
2. **Saves tokens** — Instead of reading 18 sprint plans (~50K tokens), recall returns 3 relevant entries (~500 tokens) — **99% savings**.
3. **Cross-session awareness** — Each new session starts with `memory.js recall`, so even a fresh agent knows what was decided in previous sessions.
4. **PTG enforces storage** — PTG-C1 blocks handoff if memory wasn't stored, ensuring nothing is lost.
