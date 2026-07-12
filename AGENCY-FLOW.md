# ZooCode Agency — How We Work

> **29 agents · 9 squads · Autonomous learning · KES ~384/month**  
> Full documentation: [`docs/`](docs/README.md)

---

## One-Minute Overview

A user request enters → [`lead-architect`](docs/03-agents.md) classifies it → routes through a [`pipeline`](docs/02-workflow.md) of specialists → each passes [`enforcer gates`](docs/05-enforcement.md) → [`memory`](docs/07-memory.md) stores context → daily [`self-improvement`](docs/06-self-improvement.md) loop tunes itself.

## Documentation Site

| Section | Description |
|---------|-------------|
| [`docs/README.md`](docs/README.md) | Entry point with architecture diagram |
| [`docs/01-architecture.md`](docs/01-architecture.md) | 29 agents across 9 squads, model routing, domain boundaries |
| [`docs/02-workflow.md`](docs/02-workflow.md) | Task lifecycle, 8 pipeline types (A–H), triage routing |
| [`docs/03-agents.md`](docs/03-agents.md) | All 29 agent personas with style, level, vibe |
| [`docs/04-handoff.md`](docs/04-handoff.md) | HANDOFF protocol, commit body requirements, BLOCKED escalation |
| [`docs/05-enforcement.md`](docs/05-enforcement.md) | enforcer.js 4-phase state machine, MIDDLE gate, circuit breaker |
| [`docs/06-self-improvement.md`](docs/06-self-improvement.md) | 6-script LLM-free learning loop, lockfile safety |
| [`docs/07-memory.md`](docs/07-memory.md) | memory.js — SQLite, FTS5 BM25, vec0 384-dim embeddings |
| [`docs/08-costs.md`](docs/08-costs.md) | KES pricing, self-improvement savings, circuit breaker savings |

## Quick Reference

```bash
# Start a task
node .agency/scripts/enforcer.js pre --agent <slug> --task "<desc>"

# Store what you learned
node .agency/scripts/memory.js store --project <id> --task "<id>" --content "..."

# Handoff to next agent
node .agency/scripts/handoff.js --from <me> --to <next> --task "<desc>"

# Complete the cycle
node .agency/scripts/enforcer.js post --agent <slug> --task "<id>" --project <id>
node .agency/scripts/enforcer.js middle --agent <slug> --task "<id>" --project <id>
node .agency/scripts/enforcer.js commit --agent <slug> --task "<id>" --msg "..."
```

## Key Files

| File | Purpose |
|------|---------|
| [`.agency/AGENCY-RULES.md`](.agency/AGENCY-RULES.md) | 14 Foundational Principals, 17 sections |
| [`.agency/config.json`](.agency/config.json) | Agent registry, hierarchy, workflows, thresholds |
| [`.roomodes`](.roomodes) | Agent definitions, fileRegex boundaries, models, personas |
| [`.agency/contracts/`](.agency/contracts/) | API contracts in JSON schema |
| [`.agency/projects/jengabooks/ORCHESTRATION.md`](.agency/projects/jengabooks/ORCHESTRATION.md) | Sprint tracking |

## Stats

| Metric | Value |
|--------|-------|
| Agents | 29 |
| Squads | 9 |
| Scripts | 30+ |
| Model cost/month | ~KES 384 (~$2.84) |
| Self-improvement savings | ~KES 6,075/month |
| Self-improvement scripts | 6 (all LLM-free) |
