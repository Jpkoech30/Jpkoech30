
# Custom ZooCode Agency — Decoupling from JengaBooks

> **Goal:** Make this workspace a reusable ZooCode Agency template, where `jengabooks/` is just one consumer project.
> **Status:** Plan — ready to execute

---

## Current Architecture (JengaBooks-coupled)

```
c:/Users/user/jengaprojects/
├── .roomodes                          # Has jengabooks-code agent (JengaBooks-specific)
├── .agency/                           # Agency scripts & rules (generic ✓)
├── ORCHESTRATION.md                   # Tracks JengaBooks tasks (expected)
├── jengabooks/package.json            # ← Agency npm scripts live here (COUPLED)
└── jengabooks/                        # Project code
```

## Target Architecture (Generic Agency)

```
c:/Users/user/jengaprojects/           # ← ZooCode Agency root
├── package.json                       # ← NEW: Root-level agency npm scripts
├── .roomodes                          # ← Generic agent names (code-agent, not jengabooks-code)
├── .agency/                           # Agency rules & scripts (already generic ✓)
├── FLOW-DOC.md                        # Agency docs (already generic ✓)
├── COMPLIANCE-CHECKLISTS.md           # Already generic ✓
├── ORCHESTRATION.md                   # Agency-level orchestration
└── jengabooks/                        # Just one project using this agency
    └── package.json                   # Project-specific scripts only
```

---

## Changes Required

### 1. Create Root `package.json` (HIGH)
Copy agency scripts from `jengabooks/package.json` to a new root `package.json`.

### 2. Rename `jengabooks-code` Agent (HIGH)
`.roomodes` line 12: `jengabooks-code` → `code-agent`
`.roomodes` line 13: `🔧 JengaBooks Code` → `🔧 Code Agent`

### 3. Update `init-project.js` (MEDIUM)
Already generic in path resolution. Add `--name` flag for project name.

### 4. Clean JengaBooks npm scripts (LOW)
Remove agency scripts from `jengabooks/package.json` (they'll be at root now). Keep project-specific scripts.

---

## Execution Plan

| # | Task | Agent | Est. |
|---|------|-------|------|
| 1 | Create root `package.json` with all agency scripts | `🧠 Lead Architect` | 0.25d |
| 2 | Rename `jengabooks-code` → `code-agent` in `.roomodes` | `🧠 Lead Architect` | 0.1d |
| 3 | Clean agency scripts from `jengabooks/package.json` | `🧠 Lead Architect` | 0.1d |
| 4 | Add `--name` flag to `init-project.js` | `🔧 Code Agent` | 0.25d |
| 5 | Update `ORCHESTRATION.md` with new agent name | `🧠 Lead Architect` | 0.1d |

**Total:** ~0.8 days
