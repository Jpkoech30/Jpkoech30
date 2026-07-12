# ZooCode Agency — Improvement & Edge Case Analysis v2.1

> **Generated:** 2026-07-13  
> **Source:** User-provided analysis  
> **Target:** Resolve systemic risks & optimize throughput

---

## 🔴 SECTION A: CRITICAL EDGE CASES (System Failures / Data Loss)

### ISSUE #1: The "Memory Compaction" Runtime Hang

- **Problem:** `memory.js` compaction triggers an LLM summarization API call during live `enforcer.js POST` phase, causing 5-15s handoff blocks → timeouts → session corruption  
- **Fix:**
  a) Remove compaction logic from live `memory.js store` command  
  b) Add `scripts/compact-memory.js` as 7th cron script  
  c) During live tasks, if memory exceeds 1000 chunks, store `MEMORY:<uuid-PENDING>` flag; cron compacts async

### ISSUE #2: The "STATUS:BLOCKED" Black Hole (Silent Failure)

- **Problem:** When an agent sets `STATUS:blocked`, no alert fires. Task sits in enforcement DB indefinitely  
- **Fix:** Modify `handoff.js`:
  a) If `--status BLOCKED`, create GitHub Issue with label "blocked-handoff" + ping Slack/Discord  
  b) Log critical-level event in `telemetry.js` for monitoring dashboards

### ISSUE #3: Contract-Code Schema Drift

- **Problem:** Backend refactors DTO but forgets `.agency/contracts/` — frontend reads stale schema, passes gates, crashes at runtime  
- **Fix:** Introduce **MIDDLE Gate** in `enforcer.js` (after POST, before COMMIT):
  a) Read `contracts/<id>.json` schema  
  b) Use AJV to validate produced DTO files  
  c) If validation fails: `"Schema mismatch: Field X expected type Y, got Z"`

### ISSUE #4: Midnight Cron vs. Long-Running Builds (Type F)

- **Problem:** Type-F pipeline starts at 23:45, takes 45min. Cron at 00:00 sees "stale sentinels" and kills active deployment  
- **Fix:** Lockfile check in cron:
  a) Check `.agency/.active-sessions.lock` before any script  
  b) If lock exists and < 2h old → SKIP cron, log warning, exit 0  
  c) `enforcer.js` touches lock on PRE, removes on HANDOFF

---

## 🟡 SECTION B: PROCESS INEFFICIENCIES

### ISSUE #5: The "Superficial Oath" (String Matching Bypass)

- **Problem:** Agents copy-paste oath string to trivially pass enforcer regex  
- **Fix:** Use Transformers.js embedding from `memory.js`:
  a) On `enforcer.js PRE`, generate embedding of agent's task summary  
  b) Compare via cosine similarity to canonical oath embedding  
  c) Require similarity > 0.85 — forces actual task understanding

### ISSUE #6: Lead Architect Single Point of Control (SPOC) Overload

- **Problem:** Even tiny Type-A fixes route through Lead Architect, burning deepseek-pro tokens  
- **Fix:** **Triage Router** in `config.json`:
  a) If task word count < 100 OR contains "hotfix/patch" → bypass Lead Architect  
  b) Route directly to Squad Lead with `SCOPE:project`  
  c) Reserve Lead Architect for Type-D, F, G only

### ISSUE #7: Hotfix Bypass Lacks Impact Analysis

- **Problem:** Type-H hotfix bypasses Lead Architect — may break things globally  
- **Fix:** Pre-commit dependency mapping:
  a) Run static dependency graph on changed file  
  b) Map all dependent consumers  
  c) Print graph to code-agent console before coding

---

## 🟢 SECTION C: STRATEGIC ENHANCEMENTS

### ISSUE #8: Adaptive Rollback (Sliding Window)

- **Problem:** One-off latency spike can trigger unnecessary rollback, creating death spiral  
- **Fix:** 3-day sliding window in `verify-loop.js`:
  a) Compare vs average of last 3 days  
  b) Only rollback if degradation persists 3 consecutive cycles (72h)

### ISSUE #9: Cost-Aware Circuit Breaker for Pro Models

- **Problem:** If specialist fails quality gates 3 times, lead-architect re-plans each time at ~KES 3.66  
- **Fix:** Circuit breaker in `config.json`:
  a) Track task failures per agent in telemetry  
  b) If same contract fails >2 times → demote to flash for simplified reimplementation  
  c) Reset breaker after 1 successful flash run

### ISSUE #10: TTL Resurrection (Project Pause / Cold Start)

- **Problem:** Project paused 45 days → all Default memory purged → Lead Architect loses context  
- **Fix:** **Project Pinger** in daily cron:
  a) Check last commit date per `.agency/projects/`  
  b) If no commit >20d → `memory.js export --project <id> > .agency/archives/<id>-<date>.json`  
  c) On revival, Lead Architect auto-imports latest archive before `memory.js recall`

---

## 📋 SECTION D: PRIORITY ORDER

| Priority | Issue | Effort | Risk if Deferred |
|----------|-------|--------|------------------|
| 🚨 **URGENT** | #4: Cron vs active sessions | 2h | Active deployment killed |
| 🚨 **URGENT** | #2: BLOCKED black hole | 3h | Tasks lost in limbo |
| ⚡ **SHORT** | #1: Memory compaction hang | 3h | Session corruption |
| ⚡ **SHORT** | #7: Hotfix impact analysis | 4h | Silent regressions |
| ⚡ **SHORT** | #3: Contract-schema validator | 6h | Runtime crashes |
| 📅 **MEDIUM** | #5: Semantic oath verification | 4h | Oath bypassable |
| 📅 **MEDIUM** | #6: Triage router | 3h | Token waste |
| 📅 **MEDIUM** | #9: Circuit breaker | 3h | Cost spikes |
| 📈 **LONG** | #8: Sliding window rollback | 2h | Occasional false rollbacks |
| 📈 **LONG** | #10: Project pinger | 3h | Cold start context loss |
