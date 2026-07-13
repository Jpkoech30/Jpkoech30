# ZooCode Agency — How We Work

> **31 agents · 9 squads · Autonomous learning · KES ~384/month**  
> Full documentation: [`docs/`](docs/README.md)

---

## One-Minute Overview

A user request enters → [`lead-architect`](docs/03-agents.md) classifies it → routes through a [`pipeline`](docs/02-workflow.md) of specialists → each passes [`enforcer gates`](docs/05-enforcement.md) → [`memory`](docs/07-memory.md) stores context → daily [`self-improvement`](docs/06-self-improvement.md) loop tunes itself.

## Documentation Site

| Section | Description |
|---------|-------------|
| [`docs/README.md`](docs/README.md) | Entry point with architecture diagram |
| [`docs/01-architecture.md`](docs/01-architecture.md) | 29 agents across 9 squads, model routing, domain boundaries |
| [`docs/02-workflow.md`](docs/02-workflow.md) | Task lifecycle, 8 pipeline types (A-H), triage routing, session recovery |
| [`docs/03-agents.md`](docs/03-agents.md) | All 29 agent personas with style, level, vibe |
| [`docs/04-handoff.md`](docs/04-handoff.md) | HANDOFF protocol, commit body requirements, task-closer fallback, blocking git |
| [`docs/05-enforcement.md`](docs/05-enforcement.md) | enforcer.js 4-phase state machine, pre-commit hook, telemetry, session state |
| [`docs/06-self-improvement.md`](docs/06-self-improvement.md) | 6-script LLM-free learning loop, lockfile safety |
| [`docs/07-memory.md`](docs/07-memory.md) | memory.js — SQLite, FTS5 BM25, vec0 384-dim embeddings |
| [`docs/08-costs.md`](docs/08-costs.md) | KES pricing, self-improvement savings, circuit breaker savings |

## Quick Reference

```bash
# Start a task
node .agency/scripts/enforcer.js pre --agent <slug> --task "<desc>"

# Recover context after VSCode restart
npm run recap

# Store what you learned
node .agency/scripts/memory.js store --project <id> --task "<id>" --content "..."

# Handoff to next agent (blocks on commit + push failure)
node .agency/scripts/handoff.js --from <me> --to <next> --task "<desc>"

# Task-closer fallback (when agent returns text instead of handoff.js)
node .agency/scripts/task-closer.js --agent <slug> --task "<id>" --artifacts "<files>"

# Complete the cycle
node .agency/scripts/enforcer.js post --agent <slug> --task "<id>" --project <id>
node .agency/scripts/enforcer.js middle --agent <slug> --task "<id>" --project <id>
node .agency/scripts/enforcer.js commit --agent <slug> --task "<id>" --msg "..."
```

### New Commands (Sprint 20)

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run recap` | [`recap.js`](.agency/scripts/recap.js) | Session context recovery after VSCode restart |
| `task-closer.js` | [`task-closer.js`](.agency/scripts/task-closer.js) | Lead Architect fallback for text-only agent responses |
| `handoff.js` | [`handoff.js`](.agency/scripts/handoff.js) | Now blocks on commit + push failure (Sprint 20) |
| `.husky/pre-commit` | [`pre-commit`](.husky/pre-commit) | Pre-commit oath enforcement via `enforcer.js check` |
| `.agency/session-state.json` | Written by handoff.js | Read by recap.js for "last session" context |

## Key Files

| File | Purpose |
|------|---------|
| [`.agency/AGENCY-RULES.md`](.agency/AGENCY-RULES.md) | 14 Foundational Principals, 17 sections |
| [`.agency/config.json`](.agency/config.json) | Agent registry, hierarchy, workflows, thresholds |
| [`.roomodes`](.roomodes) | Agent definitions, fileRegex boundaries, models, personas |
| [`.agency/contracts/`](.agency/contracts/) | API contracts in JSON schema |
| [`.agency/projects/jengabooks/ORCHESTRATION.md`](.agency/projects/jengabooks/ORCHESTRATION.md) | Sprint tracking |
| [`.agency/.agent-slug`](.agency/.agent-slug) | Current agent slug, written by `enforcer.js pre` |
| [`.agency/session-state.json`](.agency/session-state.json) | Last handoff snapshot, written by `handoff.js` |

## Stats

| Metric | Value |
|--------|-------|
| Agents | 31 |
| Squads | 9 |
| Scripts | 30+ |
| Enforcement phases | 5 (PRE, POST, MIDDLE, COMMIT, HANDOFF) |
| Pre-commit hook | Active — blocks commits without oath |
| Model cost/month | ~KES 384 (~$2.84) |
| Self-improvement savings | ~KES 6,075/month |
| Self-improvement scripts | 6 (all LLM-free) |
