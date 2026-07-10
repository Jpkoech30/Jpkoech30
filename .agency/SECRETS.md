# 🔐 Jenga Agency — Secrets & 3rd-Party Token Management

> **Version:** 1.0  
> **Updated:** 2026-07-10  
> **Storage:** Root `.env` file (auto-loaded by scripts, gitignored)

---

## Quick Start

Create a file at **`c:\Users\user\jengaprojects\.env`** with the tokens you need:

```env
# ── GitHub API ──────────────────────────────────────────────────────────────
GITHUB_TOKEN=ghp_your_token_here

# ── Notifications ───────────────────────────────────────────────────────────
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
HITL_TELEGRAM_BOT_TOKEN=your_hitl_bot_token
HITL_TELEGRAM_CHAT_ID=your_hitl_chat_id

# ── HITL Server ─────────────────────────────────────────────────────────────
HITL_PORT=3177
HITL_CALLBACK_TOKEN=your_callback_token

# ── Database ────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@localhost:5432/db
DATABASE_URL_TEST=postgresql://user:pass@localhost:5432/db_test
```

---

## Complete Token Reference

### GitHub API

| Variable | Used By | Purpose | Required? |
|----------|---------|---------|-----------|
| `GITHUB_TOKEN` | [`github.js`](scripts/github.js) | Create repos, push, issues, PRs | ✅ For GitHub |
| `GH_TOKEN` | [`github.js`](scripts/github.js) | Fallback if GITHUB_TOKEN not set | ❌ |

**How to get:** https://github.com/settings/tokens → Generate classic token → scopes: `repo`, `admin:repo_hook`

---

### Telegram Notifications

| Variable | Used By | Purpose | Required? |
|----------|---------|---------|-----------|
| `TELEGRAM_BOT_TOKEN` | [`notify-telegram.js`](scripts/notify-telegram.js) | Send standup/alert messages | ✅ For Telegram |
| `TELEGRAM_CHAT_ID` | [`notify-telegram.js`](scripts/notify-telegram.js) | Target chat/group ID | ✅ For Telegram |
| `HITL_TELEGRAM_BOT_TOKEN` | [`notify-hitl.js`](scripts/notify-hitl.js) | HITL approval buttons | ✅ For HITL |
| `HITL_TELEGRAM_CHAT_ID` | [`notify-hitl.js`](scripts/notify-hitl.js) | HITL target chat | ✅ For HITL |

**How to get:**
1. Create bot via [@BotFather](https://t.me/BotFather) on Telegram
2. Get chat ID by messaging [@userinfobot](https://t.me/userinfobot)

---

### HITL Server

| Variable | Used By | Purpose | Required? |
|----------|---------|---------|-----------|
| `HITL_PORT` | [`hitl-server.js`](scripts/hitl-server.js) | Webhook server port (default: 3177) | ❌ |
| `HITL_CALLBACK_TOKEN` | [`hitl-server.js`](scripts/hitl-server.js) | Webhook auth token | ❌ |

---

### Database

| Variable | Used By | Purpose | Required? |
|----------|---------|---------|-----------|
| `DATABASE_URL` | [`cleanup-test-db.js`](scripts/cleanup-test-db.js) | Main DB connection | ✅ For DB ops |
| `DATABASE_URL_TEST` | [`cleanup-test-db.js`](scripts/cleanup-test-db.js) | Test DB connection (falls back to DATABASE_URL) | ❌ |

---

### Commit Hooks

| Variable | Used By | Purpose | Required? |
|----------|---------|---------|-----------|
| `COMMIT_MESSAGE` | [`validate-commit.js`](scripts/validate-commit.js) | Read commit message for validation | ❌ |
| `COMMIT_MESSAGE` | [`validate-handoff.js`](scripts/validate-handoff.js) | Read commit message for HANDOFF validation | ❌ |

---

## How It Works

1. **Storage:** All tokens live in **one file** — `.env` at the project root
2. **Auto-loading:** [`github.js`](scripts/github.js) already auto-loads `.env` at startup. Other scripts can be updated similarly.
3. **Git safety:** `.env` is in `.gitignore` — never committed
4. **Precedence:** System env vars (`setx`) override `.env` values

## Security Rules

- ❌ **Never** hardcode tokens in source code
- ❌ **Never** commit `.env` to git
- ❌ **Never** paste tokens in logs or console output
- ✅ Use least-privilege tokens (only scopes you need)
- ✅ Rotate tokens every 90 days

---

## Related Files

| File | Purpose |
|------|---------|
| [`.env`](/.env) | Your actual secrets (create this) |
| [`.env.example`](/.env.example) | Template with placeholder values (create from this doc) |
| [`.gitignore`](/.gitignore) | Ensures `.env` is never committed |
| [`.agency/SECRETS.md`](SECRETS.md) | This file — documentation |
