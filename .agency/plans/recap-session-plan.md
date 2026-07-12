# Session Recap System — `recap.js`

> **Goal**: When the user asks "where are we" after closing/reopening VSCode, `recap.js` provides a meaningful summary of current context — project, git state, last task, and any in-flight work.

---

## Current Infrastructure

| Artifact | Purpose | Path |
|---|---|---|
| `projects.json` | Registry of all projects (id, name, rootPath, techStack) | [`.agency/projects.json`](.agency/projects.json) |
| `.active-project` | Currently active project ID (e.g. `jengabooks`) | [`.agency/.active-project`](.agency/.active-project) |
| `handoff.js` | CWD guard + project-scoped commits | [`.agency/scripts/handoff.js`](.agency/scripts/handoff.js) |
| `enforcer.js` | Phase state machine with project scope | [`.agency/scripts/enforcer.js`](.agency/scripts/enforcer.js) |
| `telemetry/events.jsonl` | Event log for recent activity | [`.agency/telemetry/events.jsonl`](.agency/telemetry/events.jsonl) |

## Design

### `recap.js` — Single script, no new dependencies

```bash
node .agency/scripts/recap.js
# or an alias: npm run recap
```

### What It Shows (in order)

```
📌 Current Context — 2026-07-12 23:30 (UTC+3)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏢 Agency: zoocode-agency
   Branch: master
   Last commit: f6bc2e0 — fix: eliminate ALL non-blocking error swallows
   Status: ✅ Clean (0 uncommitted)

📁 Active Project: jengabooks
   Root: projects/jengabooks/
   Stack: NestJS + Prisma + PostgreSQL / React + TailwindCSS / Expo
   Branch: main
   Last commit: a1b2c3d — feat: add audit trail module
   Status: ⚠️ 3 uncommitted files
   ─ src/modules/audit/audit.service.ts (modified)
   ─ prisma/schema.prisma (modified)
   ─ src/modules/audit/dto/ (untracked)

🔄 Last Session
   Last handoff: 2026-07-12 — from code-agent to lead-architect
   Last task: task-closure-fix
   Status: PASSED
   Scope: project

🕐 Recent Commits (agency)
   f6bc2e0  fix: eliminate ALL non-blocking error swallows (10 min ago)
   c197236  fix(handoff): make git push blocking too (30 min ago)
   79583e4  feat(task-closure): blocking git commits... (1 hour ago)
   d9ebb80  chore: final 3 fixes (2 days ago)

➡️ Next: run `code` to enter jengabooks project, or ask "where are we" again
```

### Data Sources

| Section | Source | Live? |
|---|---|---|
| Agency info | `git` in root + `projects.json` | ✅ Live |
| Project info | `git` in `projects/<id>/` + `projects.json` | ✅ Live |
| Last session | `.agency/session-state.json` | ⚠ Written by handoff.js |
| Recent commits | `git log -5` | ✅ Live |
| Uncommitted files | `git status --porcelain` | ✅ Live |

### `session-state.json` Format

Auto-written by `handoff.js` on each successful handoff:

```json
{
  "lastHandoff": "2026-07-12T23:15:00.000Z",
  "fromAgent": "code-agent",
  "toAgent": "lead-architect",
  "task": "task-closure-fix",
  "status": "PASSED",
  "scope": "project",
  "project": "jengabooks",
  "commitHash": "f6bc2e0"
}
```

### Files to Create/Modify

| File | Action | Description |
|---|---|---|
| [`.agency/scripts/recap.js`](.agency/scripts/recap.js) | **Create** | The recap script — reads live state, shows summary |
| [`.agency/session-state.json`](.agency/session-state.json) | **Create** (auto) | Written by handoff.js on each handoff |
| [`.agency/scripts/handoff.js`](.agency/scripts/handoff.js) | **Modify** | Add 5 lines after git push success to write `session-state.json` |
| [`package.json`](package.json) | **Modify** | Add `"recap": "node .agency/scripts/recap.js"` script |

### Edge Cases

| Scenario | Behavior |
|---|---|
| No `.active-project` | Show only agency context, warn "no active project set" |
| Project dir missing or not a git repo | Show project metadata from `projects.json` but skip git info |
| No git in root either | Show what's available, skip git sections gracefully |
| No `session-state.json` | Show "No previous session recorded" instead of last session block |
| Dirty working tree | List modified/untracked files (max 10, with "and N more" if more) |
| Multiple projects in `projects.json` | Only show **active** project details; list others briefly |
| VSCode crash mid-task | Shows uncommitted files — user can see exactly what was in-flight |
| No network | All data from local git — works fully offline |

---

## Implementation Steps

1. **Create [`recap.js`](.agency/scripts/recap.js)** — the main script (120-150 lines)
2. **Modify [`handoff.js`](.agency/scripts/handoff.js)** — add `writeSessionState()` after successful push
3. **Update [`package.json`](package.json)** — add `npm run recap` script
4. **Validate** — test dry-run, test with no project, test with dirty repo
5. **Commit & push**
