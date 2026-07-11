# Sprint 12 — ORCHESTRATION.md Per-Project Split

> **Status:** `PLANNED` | **Lead:** 🧠 Lead Architect
> **Problem:** Root [`ORCHESTRATION.md`](../../ORCHESTRATION.md) contains BOTH agency-level and jengabooks-specific content. This violates Principal 14 (Project Isolation).

---

## 1. Current State

The monolithic root ORCHESTRATION.md contains:

| Section | Lines | Owner |
|---------|-------|-------|
| Header + Project Overview | 1-28 | Mixed (jengabooks focus) |
| Design Principles (DP1-DP16) | 31-53 | JengaBooks |
| Sprint Roadmap S1-S4 | 56-163 | JengaBooks |
| Architecture Decisions | 167-200 | JengaBooks |
| File Structure — Target State | 230-370 | JengaBooks |
| API Contract Registry | 374-411 | JengaBooks |
| Handoff Protocol | 414-432 | **Agency** (global) |
| Quality Gates (G1-G10) | 436-449 | **Agency** (global) |
| Known Risks | 453-476 | JengaBooks |
| Persona Test Matrix | 480-505 | JengaBooks |
| Sprint 5 — Roo Code Setup | 508-518 | **Agency** (global) |
| Sprint 6 — MEDIUM Priority | 520-533 | **Agency** (global) |
| Reference Documents | 536-548 | Mixed |
| Sprint 7-10 — N-SPRINT | 551-668 | **Agency** (global) |
| Sprint MP — Critical Patches | 671-702 | **Agency** (global) |
| Sprint 11 — PFG Enforcement | 703-751 | **Agency** (global) |

## 2. Target State

### Root `ORCHESTRATION.md` — Agency-level only
- Header (Agency-focused)
- Architecture Decisions (agency infra)
- Sprint 5: Roo Code Setup
- Sprint 6: MEDIUM Priority
- Sprint 7-10: N-SPRINT
- Sprint 11: PFG Enforcement
- Sprint MP: Critical Patches
- **NEW**: Sprint 12 — THIS split
- N-SPRINT Handoff Protocol
- N-SPRINT Quality Gates
- Reference Documents (agency-focused)

### `.agency/projects/jengabooks/ORCHESTRATION.md` — JengaBooks-specific
- Header (JengaBooks-focused)
- Project Overview
- Design Principles (DP1-DP16)
- Sprint 1: Foundation + Core P0
- Sprint 2: Full Feature Parity
- Sprint 3: Polish + Real-Time
- Sprint 4: Brand Refresh
- Architecture Decisions (jengabooks)
- File Structure
- API Contract Registry (jengabooks-* contracts)
- Known Risks
- Persona Test Matrix

## 3. Implementation Steps

### Step 1 — Create `.agency/projects/jengabooks/ORCHESTRATION.md`
Extract from root ORCHESTRATION.md:
- Lines 1-28 (Header + Overview) — adapt for jengabooks
- Lines 31-53 (Design Principles)
- Lines 56-163 (Sprints 1-4)
- Lines 167-200 (Architecture Decisions — jengabooks portion)
- Lines 230-370 (File Structure)
- Lines 374-411 (API Contract Registry)
- Lines 453-476 (Known Risks)
- Lines 480-505 (Persona Test Matrix)
- Lines 536-548 (Reference Documents — jengabooks portion)

### Step 2 — Update root `ORCHESTRATION.md`
Remove all jengabooks-specific sections, replace with:
```
## JengaBooks Project
Sprint plans for the JengaBooks mobile app have moved to:
👉 [`.agency/projects/jengabooks/ORCHESTRATION.md`](.agency/projects/jengabooks/ORCHESTRATION.md)
```

Keep only:
- Agency header (adapted)
- Sprint 5, 6, 7-10, 11, MP, 12
- N-SPRINT protocols
- Agency reference docs

### Step 3 — Update cross-references
- Fix any absolute path references in both files
- Ensure handoff chains reference the correct ORCHESTRATION.md

## 4. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Broken links in existing handoffs | Add redirect notice in root ORCHESTRATION.md |
| New sprints added mid-split | Complete split before adding new content |
| Duplicate content between files | Single source of truth — no duplication |
| Git history preservation | Git tracks file content at time of split — no history loss |

## 5. Success Criteria

1. Root ORCHESTRATION.md contains ONLY agency-level sprints (S5-S12, MP)
2. `.agency/projects/jengabooks/ORCHESTRATION.md` contains ONLY jengabooks sprints (S1-S4)
3. Both files have cross-reference links to each other
4. All handoff chains reference the correct file
5. No content duplication between the two files

## 6. File Ownership

| File | Editable By | Action |
|------|-------------|--------|
| [`ORCHESTRATION.md`](../../ORCHESTRATION.md) | 🧠 Lead Architect (`.md$`) | UPDATE — strip jengabooks content |
| [`.agency/projects/jengabooks/ORCHESTRATION.md`](.agency/projects/jengabooks/ORCHESTRATION.md) | 🧠 Lead Architect (`.md$`) | UPDATE — populate with extracted content |
