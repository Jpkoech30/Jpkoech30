
# Backend Strategy — Single Source of Truth

> **Version:** 1.0
> **Last Updated:** 2026-07-10
> **Supersedes:** All previous backend-specific fragments
>
> Companion to: [AGENCY-RULES.md (v3.0)](AGENCY-RULES.md)

---

## HOW TO READ THIS DOCUMENT

This is the definitive guide for all backend agents. It assumes you have already read the core `AGENCY-RULES.md` (8 Principals, Handoff, Quality Gates).
This document expands those rules into specific backend implementation protocols.

| Agent Type | Action |
|------------|--------|
| **Full-Stack / Backend Agents** | Read this entire document |
| **Frontend Agents** | Skip this entirely (unless debugging backend integration) |

---

## 1. RECOMMENDED STACK (2026 — Production Ready)

Your tech stack is fixed. Do not introduce new frameworks without Lead Architect approval.

| Layer | Technology | Version (Min) | Purpose |
|-------|------------|---------------|---------|
| Runtime | Node.js | 20.x LTS | Native fetch, built-in test runner, stable ESM |
| Language | TypeScript | 5.4+ | Strict mode enabled. No `any` |
| Framework | Express | 4.18+ | Middleware ecosystem |
| Async Errors | `express-async-errors` | 3.1+ | Automatically catches async errors — removes try/catch boilerplate |
| Validation | **Zod** | 3.22+ | Runtime schema validation for request body/params/query |
| ORM | **Prisma** | 5.10+ | Type-safe database queries, migrations |
| Queue | **BullMQ** | 4.11+ | Job processing, retries, deduplication |
| Testing | Jest + Supertest | 29.0+ | Integration tests with real DB |
| Logging | Pino or Winston | 8.0+ | Structured JSON logs (required for CloudWatch/DataDog) |
| Config | dotenv + central config file | — | Zero hardcoded values |

**Violation:** Introducing Fastify, Koa, or any alternative framework without explicit approval is a **CRITICAL VIOLATION** and will **BLOCK** the PR.

---

## 2. STRICT LAYERING PATTERN (Non-negotiable)

Every feature MUST be split into these 4 layers to prevent fat controllers:

| Layer | File Location | Responsibility | Allowed to Import? |
|-------|---------------|----------------|--------------------|
| 1. **Router** | `routes/*.routes.ts` | Defines HTTP method, path, middleware chain. Does **NO** logic. | Controllers, Middlewares |
| 2. **Controller** | `controllers/*.controller.ts` | Extracts request data, calls Service, sends response. **Max 15 lines.** | Services, Validation Schemas |
| 3. **Service** | `services/*.service.ts` | Contains **ALL** business logic. Calls Prisma, external APIs, BullMQ. | Prisma, Repositories, Queues |
| 4. **Repository** (optional) | `repositories/*.repository.ts` | Encapsulates complex Prisma queries. | Prisma only |

### ✅ CORRECT Structure (Create Invoice feature)

```
src/
  routes/invoice.routes.ts          # router.post('/invoices', auth, validate, createInvoiceController)
  controllers/invoice.controller.ts # exports createInvoiceController (calls invoiceService.create)
  services/invoice.service.ts       # exports create(data) { prisma.invoice.create(...); }
  schemas/invoice.schema.ts         # export const createInvoiceSchema = z.object({...})
  middlewares/auth.middleware.ts    # verifies JWT
  middlewares/validation.middleware.ts # uses Zod to validate req.body
```

### 🚫 FORBIDDEN (Critical Violation — BLOCKED)

```typescript
// routes/invoice.routes.ts
router.post('/invoices', async (req, res) => {
  const invoice = await prisma.invoice.create({ data: req.body }); // DB call in route!
  res.json(invoice);
});
```

---

## 3. CONFIGURATION MANAGEMENT (12-Factor Rule)

**Zero hardcoded values.** All configuration MUST come from environment variables.

### ✅ Correct (`config/index.ts`)

```typescript
export const config = {
  port: parseInt(process.env.PORT || '3000'),
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  jwtSecret: process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV || 'development',
};
```

### 🚫 Forbidden

Hardcoding `const PORT = 3000` or `const DB = 'postgresql://localhost'` anywhere in routes, services, or controllers.

---

## 4. DATABASE PROTOCOL (Prisma + PostgreSQL)

### 4.1. Prisma Client Singleton (Prevents Connection Exhaustion)

There must be **EXACTLY ONE** `PrismaClient` instance for the entire application lifecycle.

#### ✅ Correct (`lib/prisma.ts`)

```typescript
import { PrismaClient } from '@prisma/client'
const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

#### 🚫 Forbidden

Creating `new PrismaClient()` inside routes, services, or controllers.

### 4.2. Migration Discipline (Stops "Constant Migration" Chaos)

| Environment | Command | Notes |
|-------------|---------|-------|
| **Local Dev** | `prisma migrate dev --name <descriptive_name>` | Use descriptive names |
| **Staging / Production** | `prisma migrate deploy` | **NEVER** `prisma migrate dev` |
| **Forbidden** | `prisma db push` | Except in a throwaway sandbox |
| **Squash rule** | >3 migrations per feature branch | Must squash into 1 before merging |

#### Pre-Migration Checklist (Must be output before schema changes)

1. Have I run `prisma generate` after changing schema?
2. Is my migration reversible? (Can I rollback without data loss?)
3. Does this migration contain default values for existing rows? (If not, handle NULLs in code.)

**Violation:** Adding a required field without a default value when the table has existing rows is a **CRITICAL BLOCKER**.

### 4.3. Transaction Safety (The "Never in Route" Rule)

**Rule:** NEVER call `prisma.$transaction` inside an Express route handler.
- ✅ **ALWAYS** wrap `prisma.$transaction` inside a **Bull worker**.
- **Why:** If a transaction runs in the route, the row stays locked while the external API is called. This kills your connection pool.

#### ✅ Correct (in a Bull worker)

```typescript
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: job.data });
  await tx.inventory.update({ ... });
}, { timeout: 5000 });
```

#### 🚫 Forbidden

`await prisma.$transaction(...)` inside `(req, res) => { ... }`.

---

## 5. EXPRESS OPERATIONAL PROTOCOL

### 5.1. Global Error Handler (Must be the LAST middleware)

Every Express app MUST have this at the bottom, after all routes.

```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

  // Zod Error
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.errors });
  }

  // Prisma Errors
  if (err.code === 'P2002') return res.status(409).json({ error: 'Duplicate entry', field: err.meta?.target });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
  if (err.code === 'P2003') return res.status(400).json({ error: 'Invalid reference' });

  // Generic
  res.status(500).json({ error: 'Internal Server Error' });
});
```

If this handler is missing, or if Prisma error codes are not translated to user-friendly HTTP statuses, the commit is **BLOCKED**.

### 5.2. Middleware Order Standard (Prevents Silent Failures)

The exact order of `app.use()` must be:

1. **CORS** (`app.use(cors())`)
2. **JSON parser** (`app.use(express.json())`)
3. **Logging** (`morgan` or custom logger)
4. **Authentication middleware**
5. **Routes** (`app.use('/api', router)`)
6. **404 handler** (`app.use((req, res) => res.status(404).json(...))`)
7. **Global Error Handler** (from 5.1)

If an agent changes this order without justification, it's a violation.

### 5.3. Validation with Zod (MANDATORY)

Every request body, query parameter, and route param MUST be validated with Zod **BEFORE** reaching the service layer.

#### ✅ Correct

```typescript
// schemas/invoice.schema.ts
export const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  amount: z.number().positive(),
});

// routes/invoice.routes.ts
router.post('/invoices', auth, validate(createInvoiceSchema), createInvoiceController);
```

#### 🚫 Forbidden

Manual `if (!req.body.amount)` checks inside controllers.

### 5.4. Health Check (Mandatory)

Every backend project must have a `/health` endpoint that returns:
1. DB connectivity (`prisma.$queryRaw\`SELECT 1\``)
2. Redis connectivity (`queue.client.ping()`)
3. Current timestamp

If the agent builds a service without a `/health` endpoint, the commit is **BLOCKED**.

### 5.5. Graceful Shutdown (Stops Production Crashes)

The application MUST catch `SIGTERM` and `SIGINT` to close connections gracefully.

```typescript
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  await queue.close();
  await redis.quit();
  server.close(() => process.exit(0));
});
```

If graceful shutdown logic is missing, the commit is **BLOCKED**.

---

## 6. JOB QUEUE PROTOCOL (BullMQ)

**Why this exists:** Express is synchronous. It cannot handle retries, webhook deduplication, or long-running jobs without crashing. BullMQ moves heavy work to isolated workers.

### 6.1. The 6 Edge Cases — Solved by BullMQ

| # | Edge Case | Express (Bad) | BullMQ (Good) |
|---|-----------|---------------|---------------|
| 1 | **Webhook Duplicates** | Processes same webhook 3x, charging user 3x | `jobId: event.id` — Bull auto-drops duplicates |
| 2 | **Long-Running Reports** | Express times out (60s). User gets 504. | Route returns `202 Accepted` + `jobId`. Worker processes in background. |
| 3 | **External API Rate Limits** | 500 requests hit Stripe simultaneously. All fail with 429. | Worker has `limiter: { max: 10, duration: 1000 }`. Only 10 calls/sec. |
| 4 | **Prisma Transaction Hangs** | Row locked for 10 seconds. Connection pool exhausts. | Transaction inside worker. If worker crashes, rollback instantly. |
| 5 | **Partial Completion (Sagas)** | User created. Email fails. User exists without email. Inconsistent. | Single Bull job wraps both operations. If email fails, the entire job retries. |
| 6 | **Server Crash** | Work is lost forever. | Jobs stored in Redis. On restart, Bull resumes from `waiting` state. |

### 6.2. BullMQ Standard Configuration (Non-negotiable)

```typescript
import { Queue, Worker } from 'bullmq';
const connection = new Redis(process.env.REDIS_URL);

export const defaultQueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
};

export const orderQueue = new Queue('order-processing', defaultQueueOptions);

const worker = new Worker('order-processing', async (job) => {
  // Job logic here
}, { connection, concurrency: 5 }); // Must set concurrency explicitly
```

### 6.3. Deduplication Pattern (Kills Webhook Duplicates)

**Rule:** The `jobId` must be the `idempotency-key` from headers, or the external event ID.

```typescript
await webhookQueue.add('stripe-webhook', req.body, { jobId: req.headers['idempotency-key'] });
```

If a duplicate arrives, Bull returns the existing job — it does **NOT** enqueue a new one.

### 6.4. Retry with Backoff (Handles Flaky APIs)

**Rule:** If a job calls an external API, it MUST include `attempts` and `backoff`.

```typescript
// ✅ Good:
await emailQueue.add('send-welcome', payload, { attempts: 5, backoff: { type: 'exponential', delay: 3000 } });

// 🚫 Forbidden: No `attempts` or `backoff` defined (default is 1 attempt — fails immediately).
```

### 6.5. Progress Tracking (For Long-Running Jobs)

**Rule:** If a job takes longer than 10 seconds, the worker MUST update progress.

```typescript
// Inside worker:
await job.updateProgress(25);
// do work
await job.updateProgress(100);

// Express exposes: GET /api/jobs/:jobId/status to poll progress.
```

### 6.6. Routing Pattern (Thin Controllers, Thick Workers)

#### ✅ Correct: Route validates and adds a job — returns 202 immediately.

```typescript
export const createOrderController = async (req: Request, res: Response) => {
  const { items } = createOrderSchema.parse(req.body);
  const job = await orderQueue.add('process-order', { userId: req.user.id, items }, {
    jobId: `order-${req.user.id}-${Date.now()}`,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
  res.status(202).json({ jobId: job.id, status: 'queued' });
};
```

#### 🚫 Forbidden

Direct Prisma create/update inside a route. Must be a Bull job.

---

## 7. AUDIT-FIRST PROTOCOL (Accounting Projects)

For any project handling financial data, logging is a **REGULATORY REQUIREMENT** — not a nice-to-have.

### 7.1. The "No Log, No Code" Mandate

For ANY feature that modifies financial data, the agent MUST:
1. Write the `ActivityLog` schema in Prisma **FIRST**.
2. Build the Admin/Log viewer endpoint **SECOND**.
3. Write the actual business logic (e.g., createInvoice) **THIRD and LAST**.

If a PR adds a financial endpoint without an accompanying log capture, it is **BLOCKED**.

### 7.2. Standard ActivityLog Schema (Copy-Paste This)

```prisma
model ActivityLog {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  action      String   // e.g., "INVOICE_CREATED", "PAYMENT_REFUNDED"
  entityType  String   @map("entity_type") // e.g., "Invoice", "Payment"
  entityId    String   @map("entity_id")
  oldValue    Json?    @map("old_value")
  newValue    Json?    @map("new_value")
  ipAddress   String?  @map("ip_address")
  userAgent   String?  @map("user_agent")
  status      String   @default("SUCCESS") // "SUCCESS" | "FAILED"
  error       String?
  metadata    Json?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user        User?    @relation(fields: [userId], references: [id])
  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@map("activity_logs")
}
```

### 7.3. Admin Panel Prerequisite

Before any user-facing feature, the agent MUST build these **3 admin endpoints**:
1. `GET /api/admin/logs` — paginated logs with filters (`?userId=`, `?entityType=`, `?fromDate=`)
2. `GET /api/admin/logs/:id` — full details of a single log entry
3. `GET /api/admin/health` — DB status, queue size, last 5 errors

If an agent builds a feature without these admin endpoints, the commit is **BLOCKED**.

### 7.4. Audit Middleware (Saves 1000s of Lines of Code)

Instead of manually calling `prisma.activityLog.create()` everywhere, agents MUST use an Express middleware.

#### ✅ Correct (`middlewares/audit.middleware.ts`)

```typescript
export const auditMiddleware = (action: string, entityType: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    let responseBody: any = null;
    res.json = (body) => { responseBody = body; return originalJson(body); };
    res.on('finish', async () => {
      await prisma.activityLog.create({
        data: {
          userId: req.user?.id,
          action,
          entityType,
          entityId: responseBody?.id,
          oldValue: req.body,
          newValue: responseBody,
          status: res.statusCode < 400 ? 'SUCCESS' : 'FAILED',
        },
      });
    });
    next();
  };
};

// In route:
router.post('/invoices', auth, auditMiddleware('INVOICE_CREATED', 'Invoice'), createInvoiceController);
```

#### 🚫 Forbidden

Manually calling `prisma.activityLog.create()` inside every controller. Use the middleware instead.

### 7.5. Sensitive Data Redaction

The agent MUST **never** store passwords, JWT tokens, or credit card numbers in `oldValue` / `newValue`.
If the request contains sensitive fields, the agent MUST redact them (e.g., replace `creditCard` with `***-****-****-1234`).

---

## 8. BACKEND TDD — KILLING SMOKE & MADE-UP TESTS

Smoke tests (`expect(true).toBe(true)`) and heavily mocked tests that never touch the database are **WORSE** than no tests. They pass when the app is broken.

### 8.1. The Golden Rule: Test the Database, Not the Mock

**Rule:** Agents are **FORBIDDEN** from mocking Prisma or the database client in backend tests.
- **Exception:** ONLY allowed for pure utility functions (string formatters, math helpers) with zero DB interaction.

```typescript
// ✅ Correct: Uses real test database, makes real HTTP requests, asserts DB state.
// 🚫 Forbidden: jest.mock('@prisma/client') — if the test passes even when the schema is missing, it's a critical violation.
```

### 8.2. Test Database Setup (Prerequisite)

Every backend project MUST have:
- A separate `DATABASE_URL_TEST` in `.env.test`
- A setup script: `"test:setup": "cross-env DATABASE_URL=$DATABASE_URL_TEST prisma migrate deploy"`
- A cleanup script to truncate tables between tests

**Mandatory `package.json` scripts:**
```json
{
  "test:setup": "cross-env DATABASE_URL=$DATABASE_URL_TEST prisma migrate deploy",
  "test": "npm run test:setup && jest --runInBand",
  "test:cleanup": "psql $DATABASE_URL_TEST -c 'TRUNCATE TABLE ... CASCADE;'"
}
```

### 8.3. The Red-Green-Real TDD Workflow

| Step | Name | Action |
|------|------|--------|
| 1 | **Red** | Write a failing test with **real database expectations** |
| 2 | **Green** | Write minimum code to make THAT exact DB query pass |
| 3 | **Refactor** | Clean up |

#### Example (invoice test):

```typescript
it('should create an invoice and update customer balance in DB', async () => {
  const customer = await prisma.customer.create({ data: { name: 'Acme', balance: 0 } });
  const response = await request(app).post('/api/invoices').send({ customerId: customer.id, amount: 100 });
  expect(response.status).toBe(201);

  const updatedCustomer = await prisma.customer.findUnique({ where: { id: customer.id } });
  expect(updatedCustomer?.balance).toBe(100); // REAL DB check

  const invoice = await prisma.invoice.findUnique({ where: { id: response.body.id } });
  expect(invoice?.amount).toBe(100);
});
```

#### 🚫 Forbidden (Smoke Test — BLOCKED)

```typescript
it('should create an invoice', async () => {
  const res = await request(app).post('/api/invoices').send({ amount: 100 });
  expect(res.status).toBe(201); // No DB verification! Passes even if DB is empty.
});
```

### 8.4. Transaction Isolation (Prevents Test Pollution)

Every test file MUST wrap database operations in a transaction and roll back, OR truncate tables between tests.

```typescript
// ✅ Correct (Using afterEach with truncate):
afterEach(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE invoices, customers, activity_logs RESTART IDENTITY CASCADE;`;
});
```

### 8.5. Fail Fast Rule (Catch Schema Drift)

The very first test in the test suite MUST be:

```typescript
it('should connect to the database and match the Prisma schema', async () => {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
});
```

If this fails, the entire test suite stops. This is the **ONLY** allowed `expect(true).toBe(true)` test.

### 8.6. Testing Edge Cases (From SOCRATIC)

The agent MUST write explicit tests for the **2 edge cases** promised in the SOCRATIC principal.

**Example (Invoice Creation):**
- Edge 1: Customer with negative balance (should it allow invoice? Test it).
- Edge 2: Customer ID missing (should return 400). Test it.

For each edge case, the test MUST:
1. Hit the endpoint
2. Assert HTTP status
3. Query DB to confirm **NO** unintended record was created (for negative cases)
4. Check the `ActivityLog` to confirm the failure was logged

### 8.7. Minimum Coverage Targets (Backend)

| Module Type | Minimum Coverage | What to Test |
|-------------|-----------------|--------------|
| Prisma Queries / Services | 95% | Every query (find, create, update, delete). Test NULL handling, invalid IDs, duplicate keys. |
| Express Controllers | 80% | Path params, body validation, auth failure, successful flow. |
| Middlewares (Auth, Audit) | 90% | Auth tests (valid/invalid token). Audit tests (does it write to the log?). |
| Edge Case Handlers | 100% | Every guard clause (`if (!user) return 404`) must have a test. |

### 8.8. Automated Test Linter (Pre-Commit Hook)

Add this to the pre-commit script to catch "smoke tests" automatically:

```bash
if grep -R "expect(true).toBe(true)" src/; then echo "❌ BLOCKED: Smoke test found."; exit 1; fi
if grep -R "jest.mock('@prisma/client'" src/; then echo "❌ BLOCKED: Prisma mocking forbidden."; exit 1; fi
if grep -R "\.mockResolvedValue" src/; then echo "❌ BLOCKED: mockResolvedValue forbidden. Use real DB."; exit 1; fi
```

---

## 9. BACKEND-FRONTEND ALIGNMENT (CONTRACT-FIRST)

### 9.1. Contract-First Mandate

Before writing any data-fetching code, the agent MUST:
1. Locate the API contract in `.agency/contracts/` (OpenAPI / JSON schema)
2. Identify the exact request/response shapes
3. Create strict TypeScript interfaces (or JSDoc typedefs) for the response

### 9.2. The Abstraction Layer (The Golden Rule)

The UI MUST **never** import the API client directly. Build a **Repository/Adapter** pattern:

- **Interface:** `IUserRepository`
- **Two implementations:**
  - `MockUserRepository` (used when backend is behind)
  - `HttpUserRepository` (used when backend is live)

```typescript
// ✅ Correct:
const userRepo = useInject<UserRepository>('UserRepository');
const { data } = useQuery(['user'], () => userRepo.getProfile());

// 🚫 Forbidden: axios.get('/users/me') inside a UI component.
```

### 9.3. Mock Expiry Date

Every mock repository must include a `__version` string matching the contract version.
When the backend deploys a live endpoint, the Backend Agent MUST update the mock to match the live response **BEFORE** the frontend swaps.

### 9.4. Handoff Protocol for Backend Dependency

When a Frontend Agent finishes a feature using a mock, they add:
`BACKEND-DEPENDENCY: GET /users/me not yet live` to the commit body.

The Backend Agent implements the endpoint, commits with `HANDOFF:frontend-lead` and `NOTE: User API is live`.

The Frontend Agent then swaps the DI binding from `Mock` to `Http` — zero UI changes needed.

---

## 10. ENFORCEMENT (COMPLIANCE GUARDIAN BACKEND CHECKLIST)

For every Backend PR, the `compliance-guardian` MUST verify:

| # | Check | If Missing |
|---|-------|------------|
| 1 | The `/health` endpoint exists and checks DB + Redis connectivity | ❌ BLOCKED |
| 2 | The `app.use(errorHandler)` is the **LAST** middleware in the chain | ❌ BLOCKED |
| 3 | No route file contains a Prisma query (must be in a service) | ❌ BLOCKED |
| 4 | Zod schemas exist for all POST/PUT/PATCH endpoints | ❌ BLOCKED |
| 5 | Graceful shutdown logic is present in the main server file | ❌ BLOCKED |
| 6 | Config file exists and uses `process.env` — no hardcoded values | ❌ BLOCKED |
| 7 | For accounting projects: `ActivityLog` model exists, `auditMiddleware` is applied to all financial routes, admin log viewer endpoints are implemented | ❌ BLOCKED |
| 8 | Test files do **NOT** contain `mock`, `mockImplementation`, or `mockResolvedValue` for Prisma | ❌ BLOCKED |
| 9 | Tests actually query the database (`prisma.findUnique`) to verify state **AFTER** the HTTP call | ❌ BLOCKED |
| 10 | All heavy jobs (>100ms) are delegated to BullMQ workers — no long-running routes | ❌ BLOCKED |

If any of these checks fail, the PR is **BLOCKED** and sent back to the agent for remediation.

---

## END OF BACKEND STRATEGY v1.0
