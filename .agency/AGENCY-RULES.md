
===============================================================================
JENGABOOKS AGENCY — COMPLETE RULES PACKAGE
===============================================================================
Version: 5.0 (Final)
Last Updated: 2026-07-11
Status: Active — Single Source of Truth
Target: ZooCode + DeepSeek Flash
Currency: All costs are in Kenyan Shillings (KES) at 1 USD = 135 KES
===============================================================================


HOW TO READ THIS FILE (TIERED SYSTEM)
===============================================================================

Agent Type                    | Sections to Read
-----------------------------|--------------------------------------------------
All Agents (Mandatory)       | File Priority, Pre-Task Oath, Principals 1-12,
                              | + Section 14 (File Clutter Prevention),
                              | Handoff, Quality Gates
Frontend / UI / Mobile       | + Section 9 (Error Handling), Section 13 (Frontend),
                              | Tailwind Rules
Backend / API                | + Section 12 (Backend), Backend Checklist
DevOps / Infrastructure      | + Section 8 (Cross-Platform), skip frontend/backend
Compliance-Guardian          | Read the entire file — you are the enforcer
Documentarian                | + Section 6 (Dynamic Context)


FILE PRIORITY ORDER
===============================================================================

Priority | File                                    | Purpose
---------|-----------------------------------------|---------------------------------------------
1        | .roomodes → groups.fileRegex            | Domain boundaries — never override
2        | .roomodes → customInstructions          | Mode-specific overrides
3        | .agency/AGENCY-RULES.md (this file)     | Universal agency rules
4        | PROJECT.md                              | Project context (dynamic)
5        | .project-context.json                   | Structural metadata
6        | ORCHESTRATION.md                        | Task tracking, not rules


PRE-TASK OATH (MANDATORY)
===============================================================================

Before writing ANY code, output this single-line oath:

"🧠 Bound by AGENCY-RULES v5.0. Pre-flight passed. Cost estimate: ~X,XXX tokens (~KES Y.YY). Sections: [list applicable sections]."

Note: Token cost is estimated in KES using the formula: (input_tokens × 19 + output_tokens × 38) / 1,000,000, using DeepSeek Flash pricing. If using DeepSeek Pro, use 270 and 1080 respectively.


===============================================================================
SECTION 1: THE 11 FOUNDATIONAL PRINCIPALS
===============================================================================

PRINCIPAL 1: VERIFICATION — Anti-Hallucination + Security
---------------------------------------------------------

Check before marking complete: Scan ALL modified files for:

Hallucinations:
- MISSING_API_DATA, TODO, FIXME placeholders
- Invented endpoints not in .agency/contracts/
- Hardcoded secrets (API keys, JWT secrets, passwords)

Security anti-patterns (OWASP Top 10):
- SQL injection (concatenated user input)
- XSS (unsanitised user input in HTML/JSX)
- Mass assignment (accepting all fields)
- Missing auth/authorisation checks
- Insecure deserialisation

Action: BLOCK. Report each occurrence. Escalate to Lead Architect.

Exception: Test fixtures in *.spec.ts / *.test.ts are exempt from hallucination
checks, but NOT security checks.


PRINCIPAL 2: TIME-TRAVEL — Temporal Integrity
---------------------------------------------

NO new Date() or Date.now() in:
- Financial calculations
- Audit logs
- Transaction timestamps
- Fiscal/billing logic
- Any persisted timestamp with business meaning

Allowed: Client-side Date() ONLY for display formatting (toLocaleDateString,
toLocaleTimeString).

Required: Use DB-provided timestamps (SELECT NOW(), Prisma @default(now()),
@updatedAt).


PRINCIPAL 3: SOCRATIC — Plan Before Code
----------------------------------------

Before writing ANY code:
1. List exactly which files will change and why.
2. Describe the approach in max 3 sentences.
3. State at least 2 edge cases you have considered.

If following an approved master plan (in ORCHESTRATION.md or /plans/), proceed
immediately.

If deviating, wait for user approval.


PRINCIPAL 4: GROUNDING — Read Context + Tool-First Retrieval
------------------------------------------------------------

Before starting:
1. Read PROJECT.md and ORCHESTRATION.md (they are small, ~300 tokens total).
2. Use Bash tools (rg, find, head, sed, git diff) to locate exact files — do
   NOT use the Read tool without first searching.
3. Only then read exactly one full file per unit of work (unless Lead Architect
   explicitly approves more).
4. Tab Discipline: Keep <=3 editor tabs open; close inspection-only files
   immediately.
5. Verify your role: Ensure your agent slug is listed in .roomodes and matches
   the HANDOFF you received.

Forbidden: Reading files from node_modules/, dist/, build/, .git/.


PRINCIPAL 5: SWARM — Domain Boundary Enforcement
------------------------------------------------

- Strictly obey your mode's groups.fileRegex in .roomodes.
- If a task requires touching a file outside your regex, STOP.
- Request reassignment to the correct agent via the Lead Architect.


PRINCIPAL 6: FEATURE-CREEP — Zero Scope Additions
-------------------------------------------------

- Modify ONLY files explicitly listed in the task or approved plan.
- NO "while-you're-here" improvements.
- NO new components, packages, endpoints, or database objects beyond the spec.
- If you spot a genuine bug outside scope, file it — don't fix it.


PRINCIPAL 7: UNIT TEST — Quality Gate (with Exemptions)
-------------------------------------------------------

- Every implementation must have corresponding tests.
- Unified coverage targets:
  - Services / Repositories (business logic): 95%
  - Controllers / UI Components: 80%
  - Utility functions: 100%
- Tests must pass before marking task complete.
- New modules must have *.spec.ts / *.test.ts files.

Exemptions: Does not apply to devops, documentation, or compliance-guardian
modes.


PRINCIPAL 8: GIT HANDSHAKE — Commit + Document Each Stage
---------------------------------------------------------

After completing your task:

1. Stage and commit using conventional commit format:

   <type>(<scope>): <human-readable summary of what and why> (>=10 words)

   HANDOFF:<next-agent-slug>
   ARTIFACTS:<comma-separated-file-list>
   CONTRACT:<contract-id@version>
   STATUS:<PENDING|IN_PROGRESS|REVIEW|DONE|BLOCKED|HOTFIX>
   BACKEND-DEPENDENCY:<optional>
   COST-ESTIMATE:<optional>   # e.g., "~2.5k tokens (~KES 0.07)"

2. Update ORCHESTRATION.md — set your own status to DONE, set the next agent(s)
   to IN_PROGRESS.

3. Architect commits: Commit after every contract creation/update and after any
   major ORCHESTRATION.md revision.

4. Sub-sprint commits: For features estimated >2 days, break into logical
   sub-sprints; commit after each.

5. Commit quality: The subject line MUST be descriptive and explain intent.
   Avoid robotic messages like "Update" or "Fix". Example:
   "feat(api): add invoice creation endpoint with Zod validation — supports
   offline-first mobile sync"


PRINCIPAL 9: TOKEN-OPTIMIZED RETRIEVAL
--------------------------------------

Rule: The Read tool is a LAST RESORT, not a first instinct.

Mandatory toolkit (use before any Read):

Tool                      | Purpose                          | Token Cost
--------------------------|----------------------------------|------------
rg "pattern" --type ts    | Search file contents             | 0
find . -name "*.service.ts" | Locate files by name           | 0
head -n 50 file.ts        | Preview top of file              | 0
sed -n '10,30p' file.ts   | Read specific line range         | 0
git diff --name-only      | See changed files                | 0
tree -L 2                 | Visualize folder structure       | 0

Violation: Reading >1 full file without using at least one of these tools is
flagged as WASTEFUL TOKEN USAGE and BLOCKED by Compliance Guardian.


PRINCIPAL 10: HOTFIX EXCEPTION
------------------------------

For critical production fixes that require immediate action:

1. Lead Architect approves verbally.
2. Agent may skip the full pipeline, but MUST:
   - Run Security scan locally.
   - Run smoke tests (minimum).
   - Commit with STATUS:HOTFIX and HANDOFF:release-manager.
3. Within 24 hours, create a follow-up PR that:
   - Adds missing tests.
   - Refactors temporary code.
   - Updates compliance audit.

Exempt: Hotfixes are exempt from Feature-Creep (Principal 6) only for the
minimal fix.


PRINCIPAL 11: COST AWARENESS & TOKEN DISCIPLINE
-----------------------------------------------

Every agent MUST be conscious of token usage and actively minimise it.

11.1 Pre-Task Cost Estimation
Before starting any task, the agent must output a cost estimate in the oath:
"COST-ESTIMATE: ~X,XXX tokens (~KES Y.YY)"

The estimate is based on:
- Number of files to Read × average file size (lines × 3 tokens).
- Number of Edit operations (each edit sends the entire file content).
- Expected number of Bash commands (0 tokens).

Convert tokens to KES using:
- DeepSeek Flash: (input_tokens × 19 + output_tokens × 38) / 1,000,000
- DeepSeek Pro: (input_tokens × 270 + output_tokens × 1080) / 1,000,000

If the estimate exceeds 5,000 tokens, the agent must justify why it cannot be
done cheaper (e.g., "Refactoring a 2000-line module requires reading all files
in the module").

11.2 Strict File Reading Limits
- Never read a file longer than 200 lines without using head, sed, or rg to
  extract only the needed section.
- If a file exceeds 200 lines and you need to understand its structure, read
  ONLY the imports, exports, and class/function signatures (first 30-50 lines).
- To see a function body, use sed -n 'start,endp' to extract exactly that block.
- Always use rg to find the line numbers of the code you need before reading.

11.3 Conversation Length Control
- A single task should not exceed 20 conversation turns (agent + user messages).
  If it does, the agent must:
  - Summarise what has been done and what remains.
  - Ask the user if they want to continue or break the task into smaller pieces.
- The Lead Architect must break large features into sub-sprints to keep each
  task manageable.

11.4 Summarisation Over Quoting
- Instead of quoting a 50-line error log, summarise the error: "Prisma error:
  Unique constraint failed on email." (10 tokens instead of 150).
- Instead of pasting the full schema, summarise the changes: "Added invoice
  table with columns id, amount, customerId."

11.5 Automatic Cost Reporting
- At the end of each sprint, the Compliance Guardian produces a cost report
  (.agency/reports/cost-<sprint>.md).
- The report includes:
  - Tokens per agent.
  - Tokens per feature.
  - Top 5 most expensive tasks (with breakdown).
  - Recommendations for improvement.
- All costs reported in KES.
- The Lead Architect reviews the report and adjusts rules/training accordingly.

11.6 Warning Thresholds
- If a single turn uses more than 5,000 tokens (roughly 15 full-file reads), the
  agent must log a warning in the handoff.
- If a task exceeds 20,000 tokens total, it is automatically flagged for review.

11.7 DeepSeek Flash-Specific Guidance
Since you use DeepSeek Flash (priced at KSh 19/1M input, KSh 38/1M output):
- Cost is not the primary concern — focus on efficiency and agent focus.
- Use DeepSeek Pro (KSh 270/1M input, KSh 1,080/1M output) only when Flash
  fails 2+ times.
- Set max_context_tokens: 16384 in ZooCode config to prevent context drowning.

11.8 Cost Benchmark (all figures in KES)

Model             | Input/1M | Output/1M | 1M Input (KES) | 1M Output (KES)
------------------|----------|-----------|----------------|----------------
DeepSeek Flash    | $0.14    | $0.28     | KSh 19         | KSh 38
DeepSeek Pro      | $2.00    | $8.00     | KSh 270        | KSh 1,080
(Reference) Claude Opus | $30.00 | $150.00 | KSh 4,050 | KSh 20,250

Your target: Reduce average task tokens from ~2,800 to <500, saving 83% and
keeping costs under KSh 200 per project.


===============================================================================
SECTION 2: HANDOFF PROTOCOL — DETAILED
===============================================================================

Status Values
--------------

Status        | Meaning
--------------|------------------------------------------
PENDING       | Not yet started
IN_PROGRESS   | Actively working
REVIEW        | Implementation done, awaiting review
DONE          | Completed and committed
BLOCKED       | Cannot proceed (include reason)
HOTFIX        | Emergency production fix

Commit Body Requirements
------------------------

Field                  | Required | Example
-----------------------|----------|---------------------------------------
HANDOFF                | Yes      | HANDOFF:backend-service
ARTIFACTS              | Yes      | ARTIFACTS:apps/api/src/.../service.ts
CONTRACT               | Yes      | CONTRACT:mobile-billing@1.0.0
STATUS                 | Yes      | STATUS:DONE
BACKEND-DEPENDENCY     | If using Mock | BACKEND-DEPENDENCY:GET /users/me not yet live
COST-ESTIMATE          | Recommended | COST-ESTIMATE:~2.5k tokens (~KES 0.07)


===============================================================================
SECTION 3: QUALITY GATES
===============================================================================

Order | Gate                  | Triggered By              | Blocking? | Pass Criteria
------|-----------------------|---------------------------|-----------|----------------------------------------------
1     | Security & Verification | Implementation complete  | Yes       | No hallucinations, no security anti-patterns
2     | Accessibility         | Frontend implementation  | HIGH      | WCAG 2.1 AA baseline, 44px touch targets
3     | Performance           | Frontend implementation  | Regression| Lighthouse >=90, LCP <2.5s, bundle <5kb
4     | Unit Tests            | Implementation complete  | Test fail | All tests pass, coverage targets met
5     | Error Handling        | All code                 | Any       | All errors caught and user-friendly
6     | Compliance            | All gates passed         | Any       | All 11 principals satisfied; ORCHESTRATION.md updated


===============================================================================
SECTION 4: COMMON ANTI-PATTERNS TO AVOID
===============================================================================

Anti-Pattern                      | Example                              | Correct Approach
----------------------------------|--------------------------------------|-------------------------------------------
Reading wrong config              | Reading jengabooks/.roomodes         | Always use root .roomodes
Skipping GROUNDING                | Starting code without reading context| Read PROJECT.md + use rg first
Using new Date() in business logic| cancelledAt: new Date()              | Use SELECT NOW() or @default(now())
Adding scope mid-task             | "While I'm here, let me fix this"    | File a separate task
Mocking in production code        | Fake data instead of real API calls  | Mock only in tests
Forgetting HANDOFF                | Committing without handoff metadata  | Always include HANDOFF
Installing duplicate libs         | npm install lodash when it exists    | Check package.json first
Arbitrary Tailwind values         | w-[137px]                            | Use design tokens: w-32
Leaving files open                | 20+ tabs open                        | Close unused tabs; max 3 open
Reading entire file before search | Read file.ts                         | Use rg first to find needed lines


===============================================================================
SECTION 5: MODE-SPECIFIC EXEMPTIONS
===============================================================================

Principal           | Exempt Modes                        | Reason
--------------------|-------------------------------------|-------------------------------------------
UNIT TEST           | devops, documentation, compliance   | No production code
GIT HANDSHAKE       | None                                | All must commit
VERIFICATION (Security) | None                           | All must scan
All others          | None                                | All are bound


===============================================================================
SECTION 6: DYNAMIC PROJECT CONTEXT (HIGH-FREQUENCY)
===============================================================================

Owner: Documentarian

6.1 Update Frequency
- After EVERY completed task that introduces new files, folders, patterns, or
  dependencies.
- For minor changes (single function), implementing agent may self-update but
  must notify Documentarian.

6.2 Automation
- Post-commit hook automatically detects new files/folders and updates
  .project-context.json (draft).
- Documentarian reviews and polishes PROJECT.md within 24 hours.

6.3 Agent Pre-flight
- git pull before starting.
- If PROJECT.md is older than 24 hours and there have been commits in that
  window, must request an immediate update from Documentarian.

6.4 Compliance
- PRs with structural changes will be BLOCKED if PROJECT.md is older than
  48 hours.


===============================================================================
SECTION 7: PLANNER PROTOCOL — AGENT SELECTION
===============================================================================

Rule: The Lead Architect MUST read .roomodes before assigning any task.

Mandatory Planner Steps:
1. Read .roomodes — parse the groups section.
2. Never use Roo default agents — they are NOT configured for this project.
3. Assign tasks ONLY to agents listed in .roomodes.
4. In ORCHESTRATION.md, use the exact agent slugs from .roomodes.
5. When creating a new agent, update .roomodes and notify all agents via a
   commit with HANDOFF:all-agents.

Violation: Assigning a Roo default agent is CRITICAL and will BLOCK the PR.


===============================================================================
SECTION 8: CROSS-PLATFORM EXECUTION RULES
===============================================================================

Golden Rule: All automation scripts, hooks, and test commands MUST run on
Node.js (.js) or use cross-env + npm scripts. Shell scripts (.sh, .bash) are
FORBIDDEN.

8.1 Environment Variables in npm Scripts
- ALWAYS use cross-env:
  "test:setup": "cross-env DATABASE_URL=\"${DATABASE_URL_TEST}\" prisma migrate deploy"
- FORBIDDEN: DATABASE_URL=$DATABASE_URL_TEST prisma ...

8.2 Pre-commit Hooks
- MUST be implemented via Husky + lint-staged.
- Custom shell hooks are FORBIDDEN.
- Use Node.js validation scripts (e.g., .agency/scripts/validate-commit.js).

8.3 Database Cleanup
- MUST be a Node.js script using Prisma:
  await prisma.$executeRaw`TRUNCATE TABLE ... CASCADE;`;
- FORBIDDEN: Direct psql calls.

8.4 PowerShell Policy
- If .ps1 scripts are used, developers must run:
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
- Prefer Node.js scripts over PowerShell.

8.5 Windows Command Reference for AI Agents

The default shell on this system is PowerShell. Use the table below to avoid
common cmd/PowerShell confusion:

| Task | Correct (PowerShell) | Wrong (cmd syntax) |
|------|---------------------|-------------------|
| Check file exists | `Test-Path file` | `if exist file` |
| Search file contents | `Select-String -Path file -Pattern 'regex'` | `findstr "regex" file` |
| List directory | `Get-ChildItem` or `dir` | `ls` (works in PS but not cmd) |
| Chain commands | `command1 ; command2` | `command1 && command2` |
| For loop | `foreach ($i in 1..10) { ... }` | `for %i in (1,2,3) do ...` |
| Variable access | `$env:VAR` | `%VAR%` |
| Pipeline variable | `$_` (automatic) | `%%i` (batch) |
| Delete file | `Remove-Item file -Force` | `del /f /q file` |
| Delete directory | `Remove-Item dir -Recurse -Force` | `rd /s /q dir` |
| Move file | `Move-Item from to` | `move from to` |
| Command output to variable | `$output = command` | `for /f ...` (complex) |
| Read file content | `Get-Content file` | `type file` |

Key rules:
1. ALWAYS assume PowerShell syntax unless explicitly using `cmd /c`.
2. When running PowerShell from `cmd.exe`, escape `$_` as `\$_` and `$` as `\$`.
3. For complex operations, write a Node.js script instead of a one-liner.
4. If a command fails, check: (a) Are you using cmd syntax in PowerShell? (b)
   Are special characters escaped? (c) Is the path using correct separators?
5. Prefer `Get-Content` and `Select-String` over `type` and `findstr`.
6. Use `path.join` in Node.js scripts — never hardcode path separators.
7. The `&&` operator works in cmd subshells but NOT in standalone PowerShell;
   use `;` for sequential execution or `-and` for conditional.
8. PowerShell accepts BOTH `/` and `\` as path separators — use whichever is
   more readable for the context.


===============================================================================
SECTION 9: FRONTEND ERROR HANDLING PROTOCOL
===============================================================================

Problem: Frontend errors often result in blank screens, cryptic console
messages, or no user feedback.

9.1 Error Boundary Mandate
- Every page-level component and every data-fetching component MUST be wrapped
  in an ErrorBoundary (React) or equivalent.
- The fallback UI must display a user-friendly message and a Retry button.

9.2 User-Friendly Error Messages
- Never show raw JSON or stack traces to the user.
- Use human-readable summaries:
  - "Unable to load invoices. Please try again."
  - "Network error. Check your connection."
- Provide a Retry action (calls the failed operation again).

9.3 Logging & Monitoring
- All frontend errors must be logged to a monitoring service (Sentry, DataDog,
  or custom POST /api/log-error endpoint).
- Include userId, url, error message, and stack trace (sanitised).

9.4 Graceful Degradation
- If a non-critical UI feature fails, the page should continue working (e.g.,
  comments fail but the post loads).
- Use fallback values or skeleton placeholders.

9.5 Backend Error Propagation
- Backend errors must be transformed to a consistent format:
  { error: string, code?: string, details?: object }
- Frontend must parse this and display the error field to the user.

9.6 Testing
- Write tests that simulate network failures and verify the error UI appears.
- Coverage: Error handling code must have >=90% coverage.


===============================================================================
SECTION 10: CONTRACT & MOCK LIFECYCLE
===============================================================================

10.1 Contract Version Bump
- Any backward-incompatible change to an API MUST increment the contract version
  (semver) in .agency/contracts/<feature>.api.json.
- The Lead Architect must notify all affected agents via a commit with
  CONTRACT-UPDATE in the message.

10.2 Mock-to-Live Swap (Feature Type G)
- After backend delivers a live endpoint, the Frontend agent must create a
  dedicated PR just to swap the DI binding from MockRepository to HttpRepository.
- The swap must include __version validation (mock version must match the
  deployed contract version).

10.3 Mock Expiry
- Every mock repository must include __version that matches the contract.
- If the backend is live and the version mismatches, the swap is BLOCKED.
- The Compliance Guardian checks for stale mocks older than 30 days.


===============================================================================
SECTION 11: ZOOCODE & DEEPSEEK FLASH OPTIMIZATIONS
===============================================================================

11.1 ZooCode Configuration
Add to your .zoo/config.json (or equivalent):

{
  "model": "deepseek-flash",
  "max_context_tokens": 16384,
  "max_iterations": 6,
  "max_tokens_per_task": 2500,
  "temperature": 0.1,
  "tool_call_parallelism": true,
  "on_fail": {
    "retry": 2,
    "escalate_to": "deepseek-pro"
  }
}

11.2 Model Routing

Task Type                                | Model           | Reasoning
-----------------------------------------|-----------------|--------------------------------------------
Simple refactoring, code gen, tests, docs | DeepSeek Flash | Cheap and fast
Complex architecture, multi-step debugging | DeepSeek Pro  | Stronger reasoning

Rule: Start with Flash; if it fails 2x, escalate to Pro.

11.3 Session Management
- Session length: Max 10 turns per session.
- After 10 turns, the agent must:
  1. Summarize what was done.
  2. Update ORCHESTRATION.md.
  3. Save progress to a checkpoint.
  4. Start a fresh session.

11.4 Token Budget
- Target: <500 tokens per task (down from ~2,800).
- Use rg + sed heavily (0 tokens).
- Use test-first approach (finds bugs without reading files).
- Use incremental code generation (replace only the changed function).


===============================================================================
SECTION 12: BACKEND STRATEGY (CONDENSED)
===============================================================================

12.1 Layering
Router -> Controller -> Service -> Repository (optional). No DB calls in routes.

12.2 Validation
Zod for all request bodies/params/query.

12.3 Queues
BullMQ for heavy jobs, retries, deduplication.

12.4 Transactions
Never in routes; always inside Bull workers.

12.5 Audit
ActivityLog model + auditMiddleware for financial/regulatory actions.

12.6 Testing
Use real test database; mocking Prisma is FORBIDDEN.

12.7 Backend Compliance Checklist (10 checks)

# | Check
--|--------------------------------------------------------------------------------
1 | /health endpoint exists and checks DB + Redis
2 | Global error handler is the LAST middleware
3 | No route file contains a Prisma query
4 | Zod schemas exist for all POST/PUT/PATCH
5 | Graceful shutdown logic present
6 | Config uses process.env — no hardcoded values
7 | For accounting: ActivityLog model, auditMiddleware applied, admin log endpoints
8 | Test files do NOT contain mock, mockImplementation, or mockResolvedValue for Prisma
9 | Tests query the database AFTER the HTTP call to verify state
10| All heavy jobs (>100ms) are delegated to BullMQ workers


===============================================================================
SECTION 13: FRONTEND STRATEGY (CONDENSED)
===============================================================================

13.1 State Management
React Query for server data, Zustand for UI, useState for local.

13.2 Repository Pattern
UI uses IUserRepository; two implementations (Mock/Http).

13.3 Accessibility
WCAG 2.1 AA baseline.

13.4 Performance
useCallback, useMemo, code splitting.

13.5 Frontend Compliance Checklist (10 checks)

# | Check
--|--------------------------------------------------------------------------------
1 | Every component handles Loading, Empty, Error, Success states
2 | No UI component imports from stores/, hooks/, or api/ directly
3 | Tailwind uses config values only — no arbitrary w-[...]
4 | Dark mode equivalents exist for every visual class
5 | All interactive elements have hover, focus, active states
6 | Every img has alt, every input has label, every button has text
7 | Touch targets >=44px (mobile) or >=48px (web)
8 | Mobile inputs have fontSize: 16
9 | No any types in production code
10| Tests exist and test behavior (not implementation)


===============================================================================
SECTION 14: PRINCIPAL 13 — FILE CLUTTER PREVENTION — NO ORPHAN FILES
===============================================================================

Problem: Roo and other agents often create temporary files (scripts, plans,
notes, diagrams) during a task and leave them behind. These files accumulate,
clutter the repository, waste disk space, and confuse other agents.

13.1 The "One Location" Rule
- ALL plans, scripts, notes, and temporary files created during a task MUST be
  stored in ONE of these approved locations:
  - .agency/plans/          → For planning documents
  - .agency/scripts/        → For utility scripts
  - .agency/notes/          → For temporary notes and observations
  - ORCHESTRATION.md        → For task tracking (single file)

- FORBIDDEN: Creating files in the root directory (/) or any other location
  without explicit Lead Architect approval.

13.2 The "Clean Up" Rule
- At the end of EVERY task, the agent MUST:
  1. Delete ALL temporary files created during the task.
  2. Keep ONLY files that are:
     - Permanent (source code, configuration, documentation)
     - In the approved .agency/ directories (if they are needed for future tasks)
  3. Run the cleanup script: npm run clean:temp (see Section 13.7)

13.3 The "Single Plan" Rule
- NEVER create multiple plan files for the same task.
- If you need to iterate on a plan, overwrite the existing file.
- Use git to track history (git log shows all versions).
- Example: .agency/plans/invoice-feature.md (one file, updated as needed)

13.4 The "Script Retention" Rule
- Temporary scripts (one-off migrations, data fixes, test helpers):
  - MUST be deleted after use.
  - If they are useful for future tasks, move them to .agency/scripts/ and
    document their purpose.
- NEVER leave scripts in the root directory.

13.5 The "No Diagrams as Files" Rule
- Diagrams should be created as code (Mermaid, PlantUML) and stored in .agency/diagrams/
- NEVER create image files (.png, .jpg, .svg) for temporary diagrams.
- If a diagram is needed for documentation, create it once and commit it.

13.6 The "Archive or Delete" Policy
- Before marking a task DONE, the agent MUST:
  1. Review all files created during the task.
  2. For each file, decide: Keep (permanent) | Archive (.agency/archive/) | Delete
  3. Run the cleanup script to remove all deleted files.
  4. Update ORCHESTRATION.md to reflect the final state.

13.7 Cleanup Script
Add to package.json:
{
  "scripts": {
    "clean:temp": "node .agency/scripts/clean-temp.js"
  }
}

13.8 Compliance Check
- The Compliance Guardian will scan for orphan files (plans, scripts, notes)
  in the root directory and other unauthorised locations.
- If >3 orphan files are found, the PR is BLOCKED and the agent must clean them up.
- The Guardian will also check that all files in .agency/plans/ and .agency/scripts/
  have a purpose documented in ORCHESTRATION.md.

13.9 Agent Onboarding
- New agents MUST be told about this rule during onboarding.
- The rule MUST be reinforced in the pre-task oath.

13.10 Examples of What to Delete

| File Type | Example | Action |
|-----------|---------|--------|
| Temporary plan | plan.md, plan-v2.md, final-plan.md | Delete after implementation |
| One-off script | migrate-data.js, fix-invoices.js | Delete after use |
| Debug file | debug-output.txt, test.json | Delete after debugging |
| Temporary note | notes.txt, observations.md | Delete or move to .agency/notes/ |
| Backup file | service.ts.bak, config.json.bak | Delete (git handles history) |
| Diagram | architecture.png, flow.svg | Delete (code diagrams only) |
| Roo auto-generated | ROO-PLAN.md, ROO-NOTES.md | Delete (not needed) |

===============================================================================
PRINCIPAL 14: PROJECT ISOLATION — Multi-Project Support
===============================================================================

Problem: The agency supports multiple projects (zoocode-agency, jengabooks) but
agents currently have no mechanism to scope their work to a single project.
Without isolation, agents may accidentally modify files across projects, memory
becomes polluted, and contracts may clash.

14.1 The "Project Registry" Rule
---------------------------------
- ALL projects MUST be registered in `.agency/projects.json`.
- Each project has a unique `id`, `rootPath`, and `contractPrefix`.
- The `activeProject` field in `projects.json` indicates the current context.

14.2 The "PROJECT Field" Rule
------------------------------
- EVERY handoff commit MUST include a `PROJECT:<project-id>` field.
- The project-id MUST exist in `projects.json` and be `enabled: true`.
- Missing PROJECT → `validate-commit.js` blocks the commit.
- Global-only commits may use `PROJECT:global` with explicit Lead Architect approval.

14.3 The "File Boundary" Rule
------------------------------
- Agents MUST only modify files within their assigned project's `rootPath`.
- Exceptions: Global files (`.roomodes`, `.agency/AGENCY-RULES.md`,
  `.agency/scripts/`, `.agency/contracts/agency-*.json`) are exempt.
- The Compliance Guardian BLOCKs any PR that touches files from multiple projects
  without explicit Lead Architect approval (documented in the handoff context).

14.4 The "Memory Scope" Rule
-----------------------------
- `memory.js` accepts `--project <id>` to scope reads/writes.
- When `--project` is given, data is stored in
  `.agency/projects/<id>/memory/store.json`.
- Without `--project`, memory operates on the global store (`.agency/memory/`).
- Recall queries optionally filter by project tag.

14.5 The "Contract Prefix" Rule
--------------------------------
- All project-specific contracts MUST use the project's `contractPrefix`.
- Example: `jengabooks-ledger@1.0.0` (prefix `jengabooks-`).
- Global agency contracts keep the `agency-` prefix (`.agency/contracts/`).
- Project contracts live in `.agency/projects/<id>/contracts/`.

14.6 Enforcement Summary
-------------------------

| Check | Enforced By | Blocking? |
|-------|-------------|-----------|
| PROJECT field in handoff | validate-commit.js | YES |
| Project exists and enabled | validate-commit.js | YES |
| File within project rootPath | Compliance Guardian | YES |
| Single project per PR | Compliance Guardian | YES (unless PROJECT:global) |
| Memory --project flag | memory.js | Recommendation |
| Contract prefix match | Lead Architect review | YES |

14.7 Directory Structure
-------------------------

```
.agency/
├── projects.json                    # Central registry
├── projects/
│   ├── zoocode-agency/              # Agency project
│   │   ├── contracts/               # Agency-specific contracts
│   │   ├── memory/                  # Agency memory store
│   │   ├── plans/                   # Agency plans
│   │   ├── notes/                   # Agency notes
│   │   └── ORCHESTRATION.md         # Agency task tracking
│   └── jengabooks/                  # JengaBooks project
│       ├── contracts/               # JengaBooks contracts (mobile-*)
│       ├── memory/                  # JengaBooks memory store
│       ├── plans/                   # JengaBooks plans
│       ├── notes/                   # JengaBooks notes
│       └── ORCHESTRATION.md         # JengaBooks task tracking
├── contracts/                       # Global contracts (agency-*)
├── memory/                          # Global memory (cross-project)
├── scripts/                         # All scripts (global)
├── plans/                           # Global plans
└── notes/                           # Global notes
```


===============================================================================
SECTION 15: TAILWIND CSS STRICT PROTOCOL
===============================================================================

1. Config First: Use design tokens only; w-[...] is FORBIDDEN.
2. Mobile First: base -> sm: -> md: -> lg: -> xl: -> 2xl:
3. Class Ordering: Layout -> Position/Spacing -> Sizing -> Typography ->
   Visuals -> Interactivity -> Transitions
4. @apply Trap: Forbidden in React components; allowed only in globals.css
   (max 5).
5. Dark Mode: Provide dark: equivalents for every visual class.
6. Content Paths: Verify new component directories are in tailwind.config.js ->
   content array.


===============================================================================
SECTION 16: FILE CLEANUP ACTION PLAN
===============================================================================

File                          | Action    | Reason
------------------------------|-----------|---------------------------------------------
jengabooks/.roomodes          | DELETED   | Obsolete, replaced by root .roomodes
AGENCY-PLAYBOOK.md            | DELETED   | Merged into this file
.agency/principals.md         | DELETED   | Replaced
CLAUDE.md                     | RENAMED   | Renamed to PROJECT.md (neutral name)
All inline customInstructions in root .roomodes | REPLACED | Point to this file
Root PowerShell artifacts     | DELETED   | 10 artifact files/dirs cleaned
Orphaned root apps/           | DELETED   | Empty NestJS shell
Legacy .roo/                  | DELETED   | Old Roo extension modes
Root plans/                   | MOVED     | 20 plan docs → jengabooks/plans/
Root scripts/                 | MOVED     | update-etims-retry.ps1 → jengabooks/scripts/


===============================================================================
SECTION 17: SUMMARY OF CHANGES FROM V3.0
===============================================================================

Change                                      | Section        | Reason
--------------------------------------------|----------------|-----------------------------------------------
Renamed CLAUDE.md -> PROJECT.md             | File Priority  | Neutral name for all tools
Added Principal 9: Token-Optimized Retrieval| Section 1.9    | Reduce token waste
Added Principal 10: Hotfix Exception        | Section 1.10   | Fast production fixes
Added Principal 11: Cost Awareness          | Section 1.11   | Track and optimise token usage
Added Planner Protocol                      | Section 7      | Ban Roo default agents
Added Dynamic Context (High-Frequency)      | Section 6      | Keep project info fresh
Added Cross-Platform Execution Rules        | Section 8      | Windows/PowerShell compatibility
Added Frontend Error Handling               | Section 9      | Prevent blank screens
Added Contract & Mock Lifecycle             | Section 10     | Formalise mock-to-live swap
Added ZooCode + DeepSeek Flash optimisations| Section 11     | Specific to your stack
Unified coverage targets                    | Section 1.7    | Resolve 80% vs 95% conflict
All costs converted to KES                  | Throughout     | Kenya Shilling denomination
Added Principal 13: File Clutter Prevention  | Section 14     | No orphan files; one location rule
Added Principal 14: Project Isolation        | Section 14 (new)| Multi-project support via projects.json
===============================================================================
END OF AGENCY-RULES v5.0
===============================================================================

Companion documents (created):
- [FLOW-DOC.md](FLOW-DOC.md) — pipeline, feature types, handoff graph ✓
- [COMPLIANCE-CHECKLISTS.md](COMPLIANCE-CHECKLISTS.md) — full platform-specific checklists ✓
- [`.agency/scripts/`](.agency/scripts/) — cross-platform validation and cleanup scripts (Node.js) ✓
- [`.zoo/config.json`](.zoo/config.json) — ZooCode configuration with DeepSeek Flash settings ✓
- [`.vscode/settings.json`](.vscode/settings.json) — VS Code settings for tab discipline ✓
- [`.vscode/extensions.json`](.vscode/extensions.json) — Recommended VS Code extensions ✓
- [`.agency/plans/`](.agency/plans/) — Planning documents directory ✓
- [`.agency/notes/`](.agency/notes/) — Temporary notes directory ✓
- [`.agency/templates/`](.agency/templates/) — Templates (TASK-INTAKE-TEMPLATE.md) ✓
- [`.agency/reports/`](.agency/reports/) — Reports (violations-report.md) ✓

===============================================================================
