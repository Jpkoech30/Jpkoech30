# 🧠 JengaBooks Mobile — Orchestration

> **Status:** `ACTIVE` | **Project:** `jengabooks` | **Created:** 2026-07-10 | **Updated:** 2026-07-11
> **Agency context:** Root [`ORCHESTRATION.md`](../../ORCHESTRATION.md) tracks agency-level infrastructure sprints (S5+).
> **This file** tracks only JengaBooks-specific feature sprints (S1-S4).

---

## 📋 Project Overview

**Goal:** Transform the JengaBooks mobile app from a basic MVP into a feature-complete, offline-first, production-ready mobile companion aligned with the [Feature Spec v3.0](plans/mobile-feature-spec-delta.md). **Now incorporating ALL Simple Invoice Manager (SIM) features** — the #1 invoicing app (5M+ downloads, 4.7★) — plus Kenyan additions (M-Pesa, eTIMS, practice management).

**Core Promise:** *"Compliance Made Effortless. Financial Management Made Clear."*

**Key Differentiators (from Spec §2):**
- Native M-Pesa integration with auto-sync
- Built-in eTIMS/KRA compliance
- Mobile-first with offline capability
- Accountant practice management
- Local language support (English/Swahili)
- **SIM-Powered:** 10+ professional invoice templates, one-click duplicate, signed receipts, credit notes, product portfolio, CSV export, barcode scanning, multi-currency

**Current State:** 6 tab screens, 15 components, basic auth/sync/infrastructure.

**Target Architecture:** See [`plans/mobile-architecture-overview.md`](plans/mobile-architecture-overview.md)

**Delta Analysis:** See [`plans/mobile-feature-spec-delta.md`](plans/mobile-feature-spec-delta.md) — full mapping of Feature Spec v3.0 → sprint plan

**SIM Gap Analysis:** See [§10 in delta analysis](plans/mobile-feature-spec-delta.md#10-simple-invoice-manager-sim-feature-gap-analysis) — SIM's top 14 most-praised features mapped to sprint plan

---

## 🎨 Design Principles — Embedded in Every Sprint

All sprints enforce our 12 core design principles from Feature Spec v3.0 (§3). Each task maps to at least one principle:

| # | Principle | Definition | Enforcement Gate |
|---|-----------|------------|-----------------|
| **DP1** | **Mobile-First** | Mobile experience as powerful as desktop. No "mobile web" compromises. | All screens must be built/tested on mobile first |
| **DP2** | **Single-Screen Completion** | Complete tasks on one screen. Minimize navigation and keyboard input. | No multi-step wizards; modals over new screens |
| **DP3** | **Adaptive UI** | Show only relevant fields. Hide complexity until needed. | Role-based defaults; progressive disclosure |
| **DP4** | **Simple ≠ Limited** | "Simple" describes UX, not feature set. Support complex scenarios simply. | Feature-dense but visually clean |
| **DP5** | **Brand Customization** | Logo, signature, templates, accent colors. User expresses identity. | Every screen supports branding |
| **DP6** | **Frictionless Sharing** | One-tap sharing via WhatsApp, email, and shareable links. | Share button on every generated entity |
| **DP7** | **Focus Without Interference** | Interface is an unobtrusive backdrop. Users focus on work, not software. | Minimal chrome, max content area |
| **DP8** | **Clarity & Confidence** | Every action and state must be unambiguous. Green/Yellow/Red status. | Status badges on all stateful entities |
| **DP9** | **Clean & Intuitive** | "Unbelievably clean" and "easy to navigate." FreshBooks-level polish. | Consistent spacing, typography, iconography |
| **DP10** | **Localized, Not Translated** | Built for Kenya, not "global software with Swahili translation." | Swahili + Plain English toggles; KSh default; DD/MM/YYYY |
| **DP11** | **Compliance-First** | eTIMS, KRA, and statutory requirements are built in, not bolted on. | eTIMS status on every invoice |
| **DP12** | **Offline Capable** | Work without internet; sync when online. Zero data loss. | WatermelonDB for all critical data |
| **DP13** | **Autosave** | No "Save" button. Changes auto-saved as user types. | All forms implement on-change auto-persist |
| **DP14** | **Progressive Disclosure** | Hide complexity until needed. Advanced options behind "More" expander. | Collapsible sections for non-essential fields |
| **DP15** | **Visual Data Representation** | Charts, graphs, sparklines for financial insights. | KPIs rendered as visual widgets, not tables |
| **DP16** | **Clear Status Indicators** | Green/Yellow/Red health dots, confidence badges, compliance shields. | Every entity with a status gets a badge |

**Every task in every sprint references its governing design principles.** Code review must verify each principle was implemented.

---

## 🗺️ Sprint Roadmap (v3.0-Aligned)

### Sprint 1 — Foundation + Core P0 Must-Haves ✅ **COMPLETE (15/15)**
**Theme:** Fill critical gaps + deliver P0 launch features + SIM core features

| # | Task | Agent | Status | Files |
|---|------|-------|--------|-------|
| 1.1 | WatermelonDB Integration | `📱 Mobile State` | ✅ Done | schema, models, sync, database, database-provider |
| 1.2 | M-Pesa Transactions Screen | `📱 Mobile Screen` | ✅ Done | [`mpesa.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/mpesa.tsx) |
| 1.3 | Invoice Creation + Templates + Duplicate | `📱 Mobile Screen` | ✅ Done | [`invoices/create.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/invoices/create.tsx), [`[id].tsx`](../../projects/jengabooks/apps/mobile/src/app/app/invoices/[id].tsx) |
| 1.4 | Chart of Accounts | `📱 Mobile Screen` | ✅ Done | [`accounts/index.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/accounts/index.tsx), [`create.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/accounts/create.tsx) |
| 1.5 | Missing UI Components | `📱 Mobile UI` | ✅ Done | Modal, Toast, EmptyState, Skeleton, ErrorBoundary, Avatar, SearchBar |
| 1.6 | WhatsApp Invoice Sharing | `📱 Mobile Screen` | ✅ Done | [`share-buttons.tsx`](../../projects/jengabooks/apps/mobile/src/components/invoices/share-buttons.tsx) |
| 1.7 | M-Pesa Payment Links + Combined Payments | `📱 Mobile Screen` | ✅ Done | Integrated into invoice detail |
| 1.8 | Invoice Aging Report | `📱 Mobile Screen` | ✅ Done | [`invoices/aging.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/invoices/aging.tsx) |
| 1.9 | Logo/Signature on Invoices | `📱 Mobile UI` | ✅ Done | [`signature-pad.tsx`](../../projects/jengabooks/apps/mobile/src/components/invoices/signature-pad.tsx) |
| 1.10 | Plain English Toggle | `📱 Mobile State` | ✅ Done | [`i18n/en.plain.ts`](../../projects/jengabooks/apps/mobile/src/lib/i18n/en.plain.ts), [`use-i18n.ts`](../../projects/jengabooks/apps/mobile/src/hooks/use-i18n.ts) |
| 1.11 | Biometric Login | `📱 Mobile State` | ✅ Done | [`biometric.ts`](../../projects/jengabooks/apps/mobile/src/lib/biometric.ts), auth-store |
| 1.12 | Client Management + Contact History | `📱 Mobile Screen` | ✅ Done | [`clients/`](../../projects/jengabooks/apps/mobile/src/app/app/clients/) |
| 1.13 | Product/Service Portfolio | `📱 Mobile Screen` | ✅ Done | [`products/`](../../projects/jengabooks/apps/mobile/src/app/app/products/) |
| 1.14 | Credit Notes | `📱 Mobile Screen` | ✅ Done | [`invoices/credit-notes.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/invoices/credit-notes.tsx) |
| 1.15 | Signed Receipts | `📱 Mobile Screen` | ✅ Done | [`receipts/`](../../projects/jengabooks/apps/mobile/src/app/app/receipts/) |

| # | Task | Type | Agent | Est. | Design Principles | Feature Spec Ref | SIM Ref | Depends On |
|---|------|------|-------|------|-------------------|------------------|---------|------------|
| **1.1** | WatermelonDB Integration | `offline-db` | `📱 Mobile State` | 2d | **DP12** Offline Capable | §5.13 Offline Mode | — | — |
| **1.2** | M-Pesa Transactions Screen | `new-screen` | `📱 Mobile Screen` | 1d | **DP1** Mobile-First, **DP8** Clarity | §5.12 M-Pesa Auto-Sync | — | 1.1 |
| **1.3** | Invoice Creation Flow (Template Picker + Duplicate) | `new-screen` | `📱 Mobile Screen` | 2d | **DP2** Single-Screen, **DP4** Simple≠Limited, **DP9** Clean, **DP13** Autosave | §5.1 Quick Invoice Creation | SIM #1, #2, #7 | — |
| **1.4** | Chart of Accounts (Create/Manage) | `new-screen` | `📱 Mobile Screen` | 1d | **DP3** Adaptive UI, **DP14** Progressive Disclosure | §5.9 General Ledger | — | — |
| **1.5** | Missing UI Components | `components` | `📱 Mobile UI` | 2d | **DP7** Focus, **DP9** Clean, **DP15** Visual Data | §6 UI/UX Principles | — | — |
| **1.6** | WhatsApp Invoice Sharing | `feature` | `📱 Mobile Screen` | 0.5d | **DP6** Frictionless Sharing | §5.14 WhatsApp Sharing | SIM #4 | 1.3 |
| **1.7** | M-Pesa Payment Links + Combined Payments | `feature` | `📱 Mobile State` | 1d | **DP11** Compliance-First, **DP8** Clarity | §5.2 M-Pesa Payment Links | SIM #10 | 1.3 |
| **1.8** | Invoice Aging Report | `new-screen` | `📱 Mobile Screen` | 0.5d | **DP15** Visual Data, **DP8** Clarity | §5.2 Outstanding Receivables | — | 1.3 |
| **1.9** | Logo/Signature on Invoices | `feature` | `📱 Mobile UI` | 0.5d | **DP5** Brand Customization | §5.1 Logo & Signature | SIM #3 | 1.3 |
| **1.10** | Plain English Toggle | `feature` | `📱 Mobile State` | 0.5d | **DP10** Localized, Not Translated | §5.15 Multi-Language | — | — |
| **1.11** | Biometric Login | `feature` | `📱 Mobile State` | 0.5d | **DP1** Mobile-First, **DP8** Clarity | §5.13 Biometric Login | — | — |
| **1.12** | Client Management + Contact History | `new-screen` | `📱 Mobile Screen` | 1d | **DP2** Single-Screen, **DP3** Adaptive UI | §5.7 Client & Product Mgmt | SIM #5 | — |
| **1.13** | Product/Service Portfolio Catalog | `new-screen` | `📱 Mobile Screen` | 1d | **DP4** Simple≠Limited, **DP14** Progressive Disclosure | §5.7 Client & Product Mgmt | SIM #6 | — |
| **1.14** | Credit Notes (linked to invoice) | `feature` | `📱 Mobile Screen` | 0.5d | **DP8** Clarity & Confidence, **DP11** Compliance-First | §5.1 Invoicing Core | SIM #8 | 1.3 |
| **1.15** | Signed Receipts (generate + send) | `feature` | `📱 Mobile Screen` | 0.5d | **DP5** Brand Customization, **DP6** Frictionless Sharing | §5.2 Payments & Receipts | SIM #9 | 1.7 |

### Sprint 2 ✅ COMPLETE (10/10) — Full Feature Parity
**Theme:** Feature parity with web app + persona B/C support + SIM P1 features

| # | Task | Agent | Status | Files |
|---|------|-------|--------|-------|
| 2.1 | Company Switcher + Tenant Management | `📱 Mobile State` | ✅ Done | auth-store.ts + settings.tsx |
| 2.2 | Gamification Profile Screen | `📱 Mobile Screen` | ✅ Done | [`gamification.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/gamification.tsx) |
| 2.3 | Document Upload Screen | `📱 Mobile Screen` | ✅ Done | [`documents.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/documents.tsx) |
| 2.4 | Swahili Language Toggle | `📱 Mobile State` | ✅ Done | [`sw.ts`](../../projects/jengabooks/apps/mobile/src/lib/i18n/sw.ts), use-i18n.ts |
| 2.5 | Expense Management | `📱 Mobile Screen` | ✅ Done | [`expenses.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/expenses.tsx) |
| 2.6 | Client Portal (basic) | `📱 Mobile Screen` | ✅ Done | [`portal/`](../../projects/jengabooks/apps/mobile/src/app/app/portal/) (3 screens) |
| 2.7 | Auto-Backup Integration | `📱 Mobile State` | ✅ Done | Settings toggles + backup trigger |
| 2.8 | Notification System + Deep Linking | `📱 Mobile State` | ✅ Done | [`notification-store.ts`](../../projects/jengabooks/apps/mobile/src/stores/notification-store.ts), [`notifications.ts`](../../projects/jengabooks/apps/mobile/src/lib/notifications.ts) |
| 2.9 | Bulk Client Import | `📱 Mobile Screen` | ✅ Done | [`clients/bulk-import.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/clients/bulk-import.tsx) |
| 2.10 | Multi-Currency Support | `📱 Mobile State` | ✅ Done | [`currency-store.ts`](../../projects/jengabooks/apps/mobile/src/stores/currency-store.ts) |

| # | Task | Type | Agent | Est. | Design Principles | Feature Spec Ref | SIM Ref | Depends On |
|---|------|------|-------|------|-------------------|------------------|---------|------------|
| **2.1** | Company Switcher + Tenant Management | `feature` | `📱 Mobile State` | 1d | **DP3** Adaptive UI, **DP8** Clarity | §5.10 Multi-Entity Switching | — | 1.1 |
| **2.2** | Gamification Profile Screen | `new-screen` | `📱 Mobile Screen` | 1d | **DP15** Visual Data, **DP9** Clean | §5.10 Engagement | — | — |
| **2.3** | Document Upload Screen | `new-screen` | `📱 Mobile Screen` | 1d | **DP1** Mobile-First, **DP12** Offline Capable | §5.8 Auto-Backup | — | — |
| **2.4** | Swahili Language Toggle | `feature` | `📱 Mobile State` | 1d | **DP10** Localized, Not Translated | §5.15 Multi-Language | — | 1.10 |
| **2.5** | Expense Management | `new-screen` | `📱 Mobile Screen` | 1.5d | **DP2** Single-Screen, **DP13** Autosave | §5.15 Expense Management | — | — |
| **2.6** | Client Portal (basic) | `new-screen` | `📱 Mobile Screen` | 1.5d | **DP7** Focus, **DP8** Clarity | §5.7 Client Portal | — | — |
| **2.7** | Auto-Backup Integration | `feature` | `📱 Mobile State` | 1d | **DP12** Offline Capable, **DP8** Clarity | §5.8 Auto-Backup | — | — |
| **2.8** | Notification System + Deep Linking | `feature` | `📱 Mobile State` | 1d | **DP7** Focus, **DP8** Clarity | §5.13 Push Notifications | — | — |
| **2.9** | Bulk Client Import (Excel/Phonebook) | `feature` | `📱 Mobile Screen` | 1d | **DP1** Mobile-First, **DP14** Progressive Disclosure | §5.7 Client Mgmt | SIM #12 | 1.12 |
| **2.10** | Multi-Currency (KES/USD/EUR/GBP) | `feature` | `📱 Mobile State` | 0.5d | **DP10** Localized, **DP5** Brand Customization | §5.1 Invoicing Core | SIM #13 | 1.3 |

### Sprint 3 — Polish + Real-Time + Sync + CSV Export + Barcode (Est. 8 days)
**Theme:** Production readiness + offline sync engine + SIM P2 features

| # | Task | Type | Agent | Est. | Design Principles | Feature Spec Ref | SIM Ref | Depends On |
|---|------|------|-------|------|-------------------|------------------|---------|------------|
| **3.1** | Socket.io Real-Time Integration | `integration` | `📱 Mobile State` | 1.5d | **DP7** Focus, **DP12** Offline Capable | §5.8 Cloud Sync | — | — |
| **3.2** | Push Notifications (Expo Push) | `feature` | `📱 Mobile State` | 1d | **DP8** Clarity & Confidence | §5.13 Push Notifications | — | 3.1 |
| **3.3** | WatermelonDB Sync Engine | `offline-sync` | `📱 Mobile State` | 2d | **DP12** Offline Capable | §5.8 Cloud Sync | — | 1.1 |
| **3.4** | SMS Auto-Import (M-Pesa) | `feature` | `📱 Mobile Screen` | 1d | **DP1** Mobile-First, **DP11** Compliance-First | §5.12 SMS Auto-Import | — | — |
| **3.5** | Animations & Micro-Interactions | `polish` | `📱 Mobile UI` | 1d | **DP7** Focus, **DP9** Clean, **DP4** Simple≠Limited | §6 UI/UX Principles | — | — |
| **3.6** | CSV Export for All Data | `feature` | `📱 Mobile State` | 1d | **DP8** Clarity, **DP11** Compliance-First | §5.14 Export & Sharing | SIM #11 | 1.3, 1.12, 1.13 |
| **3.7** | Barcode/QR Scanner Integration | `feature` | `📱 Mobile Screen` | 1d | **DP1** Mobile-First, **DP4** Simple≠Limited | §5.13 Mobile & Offline | SIM #14 | 1.13 |
| **3.8** | E2E Tests (Detox/Appium) | `qa` | `🧪 QA Automator` | 2d | **DP8** Clarity & Confidence, **DP11** Compliance | — | — | All above |
| **3.9** | Performance Audit | `audit` | `⚡ Performance Auditor` | 0.5d | **DP1** Mobile-First, **DP9** Clean | — | — | 3.5 |

### Sprint 4 — Brand Refresh + Advanced Features (Est. 10 days) — ✅ **COMPLETE**
**Theme:** Brand refresh + remaining feature spec v3.0 features + SIM parity items

| # | Task | Type | Agent | Status | Files |
|---|------|------|-------|--------|-------|
| **4.1** | Brand Color Migration (`#0A5C36`→`#1A56DB`) | `polish` | `📱 Mobile UI` | ✅ Done | [`tailwind.config.js`](../../projects/jengabooks/apps/mobile/tailwind.config.js), all UI components, all screens, `_layout.tsx` |
| **4.2** | Purchase & Inventory Management | `new-screen` | `📱 Mobile Screen` | ✅ Done | [`inventory/index.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/inventory/index.tsx), [`inventory/[id].tsx`](../../projects/jengabooks/apps/mobile/src/app/app/inventory/[id].tsx), [`inventory/purchase.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/inventory/purchase.tsx) |
| **4.3** | Order Management (Sales + Purchase Orders) | `new-screen` | `📱 Mobile Screen` | ✅ Done | [`orders/index.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/orders/index.tsx), [`orders/[id].tsx`](../../projects/jengabooks/apps/mobile/src/app/app/orders/[id].tsx), [`orders/create.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/orders/create.tsx) |
| **4.4** | Custom Report Builder | `new-screen` | `📱 Mobile Screen` | ✅ Done | [`report-builder.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/report-builder.tsx) |
| **4.5** | POS Billing | `new-screen` | `📱 Mobile Screen` | ✅ Done | [`pos.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/pos.tsx) |
| **4.6** | Online Store Management | `new-screen` | `📱 Mobile Screen` | ✅ Done | [`store.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/store.tsx) |
| **4.7** | Client Surveys | `new-screen` | `📱 Mobile Screen` | ✅ Done | [`surveys.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/surveys.tsx) |
| **4.8** | Premium Invoice Templates (animated) | `feature` | `📱 Mobile UI` | ✅ Done | [`invoices/create.tsx`](../../projects/jengabooks/apps/mobile/src/app/app/invoices/create.tsx) |
| **4.9** | Batch Operations (bulk approve, bulk send) | `feature` | `📱 Mobile State` | ✅ Done | [`use-batch.ts`](../../projects/jengabooks/apps/mobile/src/hooks/use-batch.ts), [`batch-toolbar.tsx`](../../projects/jengabooks/apps/mobile/src/lib/batch-toolbar.tsx) |
| **4.10** | Advanced Multi-Currency Reporting | `feature` | `📱 Mobile State` | ✅ Done | [`currency-store.ts`](../../projects/jengabooks/apps/mobile/src/stores/currency-store.ts) v2.0 |

---

## 🏗️ Architecture Decisions

### Current Architecture
```
Expo Router (file-based routing)
  └── 6 tab screens (index, ledger, etims, hitl, reports, settings)
  └── Zustand stores (auth, ui)
  └── Axios API client (JWT interceptor, refresh rotation)
  └── In-memory offline cache (placeholder)
  └── Simple polling sync (30s interval)
```

### Target Architecture (Sprint 3 completion)
```
Expo Router (file-based routing)
  ├── 16+ screen routes (see File Structure below)
  ├── Zustand stores (auth, ui, sync, company, notifications, language)
  ├── WatermelonDB (local-first offline database)
  │   ├── Sync protocol with API backend
  │   ├── Optimistic updates + conflict resolution
  │   └── Pull-based sync on foreground + push-based via socket
  ├── Axios API client (JWT interceptor, refresh rotation, retry queue)
  ├── Socket.io (real-time updates, live sync events)
  ├── Expo Push Notifications
  ├── Expo Secure Store (auth tokens + biometric keys)
  ├── expo-sharing / react-native-share (WhatsApp + email sharing)
  └── i18n engine (Plain English + Swahili toggles)
```

### Key Constraints (from [`PROJECT.md`](../../projects/jengabooks/PROJECT.md))
- **48px minimum touch targets** on all interactive elements
- **fontSize: 16** on all mobile inputs to prevent iOS zoom
- **No in-memory state** for financial data (must use WatermelonDB/local persistence)
- **JWT is the sole session state** (no Redis sessions)
- **Tenant isolation** on all queries

---

## 📂 File Structure — Target State (v3.0 + SIM Features Aligned)

```
apps/mobile/src/
├── app/                          # Expo Router pages
│   ├── _layout.tsx               # Root layout (auth guard, providers, i18n)
│   ├── index.tsx                  # Splash/redirect
│   ├── login.tsx                  # Auth screen (enhanced: biometric)
│   ├── app/
│   │   ├── _layout.tsx           # Tab navigator layout (scrollable tabs for 12+)
│   │   ├── index.tsx             # Dashboard — enhance with aging widget
│   │   ├── ledger.tsx            # Ledger
│   │   ├── etims.tsx             # eTIMS invoices — enhance with payment links
│   │   ├── hitl.tsx              # HITL reviews
│   │   ├── reports.tsx           # Reports
│   │   ├── settings.tsx          # Settings — enhance with language toggles
│   │   ├── mpesa.tsx             # M-Pesa transactions
│   │   ├── mpesa-import.tsx      # M-Pesa CSV import
│   │   ├── invoices/             # Invoice creation, detail, aging, credit notes
│   │   ├── accounts/             # Chart of Accounts
│   │   ├── clients/              # Client management + bulk import
│   │   ├── products/             # Product/Service catalog
│   │   ├── receipts/             # Signed receipts
│   │   ├── barcode.tsx           # Barcode/QR scanner
│   │   ├── export.tsx            # CSV/Excel export center
│   │   ├── gamification.tsx      # XP/Levels/Badges
│   │   ├── documents.tsx         # Document upload/list
│   │   ├── payroll.tsx           # Payroll runs list
│   │   ├── expenses.tsx          # Expense management
│   │   ├── practice.tsx          # Practice Hub (Accountant View)
│   │   ├── portal/               # Client Portal
│   │   ├── notifications.tsx     # Notification center
│   │   └── company-switch.tsx    # Company switcher
│   └── ...modals/                # Modal screens
│
├── components/
│   ├── ui/                       # Button, Card, Badge, Input, Modal, Toast, etc.
│   ├── dashboard/                # Summary card, health score, aging widget
│   ├── mpesa/                    # Transaction row, import preview
│   ├── invoices/                 # Invoice form, line items, share buttons
│   ├── clients/                  # Client card, contact history, bulk import
│   ├── products/                 # Product card, product selector
│   ├── receipts/                 # Receipt card
│   └── common/                   # Loading screen, error screen
│
├── stores/                       # auth-store, ui-store, sync-store, notification-store, currency-store
├── hooks/                        # use-auth, use-offline, use-sync, use-notifications, use-i18n
├── lib/                          # api-client, database, utils, i18n, watermelon, socket, export-helper
├── types/                        # nativewind.d.ts
└── services/                     # sync, notification, deep-link, share, export
```

---

## 📋 API Contract Registry

| Contract ID | Version | Path | Status | SIM Feature |
|-------------|---------|------|--------|-------------|
| `mobile-auth` | 1.0.0 | [`contracts/mobile-auth.json`](contracts/mobile-auth.json) | ✅ Done | — |
| `mobile-ledger` | 1.0.0 | [`contracts/mobile-ledger.json`](contracts/mobile-ledger.json) | ✅ Done | — |
| `mobile-mpesa` | 1.0.0 | [`contracts/mobile-mpesa.json`](contracts/mobile-mpesa.json) | ✅ Done | — |
| `mobile-etims` | 1.1.0 | [`contracts/mobile-etims.json`](contracts/mobile-etims.json) | ✅ Done (v1.1) | SIM #2, #7 |
| `mobile-hitl` | 1.0.0 | [`contracts/mobile-hitl.json`](contracts/mobile-hitl.json) | ✅ Done | — |
| `mobile-reports` | 1.0.0 | [`contracts/mobile-reports.json`](contracts/mobile-reports.json) | ✅ Done | — |
| `mobile-gamification` | 1.0.0 | [`contracts/mobile-gamification.json`](contracts/mobile-gamification.json) | ✅ Done | — |
| `mobile-sync` | 1.0.0 | [`contracts/mobile-sync.json`](contracts/mobile-sync.json) | ✅ Done | — |
| `mobile-payroll` | 1.0.0 | [`contracts/mobile-payroll.json`](contracts/mobile-payroll.json) | ✅ Done | — |
| `mobile-documents` | 1.0.0 | [`contracts/mobile-documents.json`](contracts/mobile-documents.json) | ✅ Done | — |
| `mobile-dashboard` | 1.0.0 | [`contracts/mobile-dashboard.json`](contracts/mobile-dashboard.json) | ✅ Done | — |
| `mobile-share` | 1.0.0 | [`contracts/mobile-share.json`](contracts/mobile-share.json) | ✅ Done | SIM #4 |
| `mobile-payments` | 1.1.0 | [`contracts/mobile-payments.json`](contracts/mobile-payments.json) | ✅ Done (v1.1) | SIM #10 |
| `mobile-expenses` | 1.0.0 | [`contracts/mobile-expenses.json`](contracts/mobile-expenses.json) | ✅ Done | — |
| `mobile-client-portal` | 1.0.0 | [`contracts/mobile-client-portal.json`](contracts/mobile-client-portal.json) | ✅ Done | — |
| `mobile-backup` | 1.0.0 | [`contracts/mobile-backup.json`](contracts/mobile-backup.json) | ✅ Done | — |
| `mobile-sms-import` | 1.0.0 | [`contracts/mobile-sms-import.json`](contracts/mobile-sms-import.json) | ✅ Done | — |
| `mobile-biometric` | 1.0.0 | [`contracts/mobile-biometric.json`](contracts/mobile-biometric.json) | ✅ Done | — |
| `mobile-credit-notes` | 1.0.0 | [`contracts/mobile-credit-notes.json`](contracts/mobile-credit-notes.json) | ✅ Done | SIM #8 |
| `mobile-receipts` | 1.0.0 | [`contracts/mobile-receipts.json`](contracts/mobile-receipts.json) | ✅ Done | SIM #9 |
| `mobile-products` | 1.0.0 | [`contracts/mobile-products.json`](contracts/mobile-products.json) | ✅ Done | SIM #6 |
| `mobile-clients` | 1.0.0 | [`contracts/mobile-clients.json`](contracts/mobile-clients.json) | ✅ Done | SIM #5, #12 |
| `mobile-export` | 1.0.0 | [`contracts/mobile-export.json`](contracts/mobile-export.json) | ✅ Done | SIM #11 |
| `mobile-barcode` | 1.0.0 | [`contracts/mobile-barcode.json`](contracts/mobile-barcode.json) | ✅ Done | SIM #14 |

**Total:** **24 contracts** — all created and maintained in this project

---

## 🚨 Known Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| WatermelonDB schema conflicts with Prisma schema | Data loss | Design sync protocol before coding, map fields explicitly |
| Poor offline UX on slow networks | User drop-off | Loading skeletons, optimistic updates, retry queue |
| Push notification setup complexity | Delayed delivery | Start Expo Push setup early |
| iOS keyboard covering inputs | Bad UX | KeyboardAvoidingView + scrollToInput on all form screens |
| Expo SDK 51 compatibility with WatermelonDB latest | Build errors | Pin WatermelonDB version, test on both platforms |
| WhatsApp sharing API restrictions (iOS) | Blocked sharing | Use `expo-sharing` as fallback + `react-native-share` |
| Biometric auth on simulator | Broken dev flow | Feature-flag biometric; allow PIN fallback in dev |
| Swahili translation quality | User distrust | Use native Swahili speakers for review, not machine translation |
| Invoice aging calculation with offline data | Inaccurate reports | Calculate from WatermelonDB local data, reconcile on sync |
| SIM Feature #2: 10+ invoice templates increase APK size | App bloat | Lazy-load template previews; serve template thumbnails from CDN |
| SIM Feature #5: Client contact history storage offline | Lost comms history | Store contact events in WatermelonDB; sync on reconnect |
| SIM Feature #8: Credit notes linked to invoices — cascading state | Financial inconsistency | Server-side validation prevents over-crediting; mobile shows remaining balance |
| SIM Feature #9: Signed receipt PDF generation on mobile | Performance hit on slow devices | Generate receipt PDFs server-side; mobile only triggers and downloads |
| SIM Feature #10: Combined payments (CASH + MPESA + CARD) | Split payment reconciliation | Each payment leg recorded separately; invoice status computed from all legs |
| SIM Feature #11: CSV export of large datasets (10k+ rows) | Mobile memory crash | Stream CSV generation server-side; mobile downloads pre-generated file |
| SIM Feature #12: Bulk client import from phonebook | Duplicate contacts, privacy | Server-side dedup on email/phone; user confirms before import |
| SIM Feature #13: Multi-currency — exchange rate volatility | Inaccurate reporting | Daily exchange rate cache; show both original and base currency |
| SIM Feature #14: Barcode scanner camera permission | App store rejection | Graceful fallback to manual SKU entry; request permission only on scan action |

---

## 👤 Persona Test Matrix

| Screen/Feature | Jane (Accountant) | David (SME) | Grace (Freelancer) |
|----------------|-------------------|-------------|-------------------|
| Dashboard | 📊 Quick overview | 📊 Cash flow + aging | 📊 Income/expense |
| Invoice Create | ⌨️ Keyboard shortcuts | ➡️ 2-click creation | ➡️ 2-click creation |
| Invoice Templates (10+) [SIM #2] | 🎯 Professional branding | 🎯 Looks legit | ✅ Quick pick |
| Invoice Duplicate [SIM #7] | 🎯 Bulk operations | ✅ Time saver | ✅ Time saver |
| Client Management + History [SIM #5] | 🎯 Critical — full history | ✅ Helpful | ⚠️ Basic needed |
| Product/Service Catalog [SIM #6] | 🎯 Standardize billing | 🎯 Product inventory | ⚠️ Service list |
| Credit Notes [SIM #8] | 🎯 Audit trail | ✅ Customer returns | ⚠️ Rarely |
| Signed Receipts [SIM #9] | 🎯 Official records | 🎯 Customer trust | ✅ Professional |
| Combined Payments [SIM #10] | 🎯 Partial payments | 🎯 CASH+MPESA | ⚠️ Simple only |
| CSV Export [SIM #11] | 🎯 Audit data | ✅ Backup | ✅ Tax prep |
| Bulk Client Import [SIM #12] | 🎯 Migrate clients | ✅ Import contacts | ❌ Low |
| Multi-Currency [SIM #13] | ⚠️ USD clients | ✅ Tourist business | ❌ Low |
| Barcode/QR Scanner [SIM #14] | ❌ Low | ✅ Quick invoice | ⚠️ Nice |
| M-Pesa | 🔄 Bulk reconcile | 📱 Auto-sync | 👁️ View only |
| eTIMS | ✅ Compliance check | ✅ One-click submit | ❌ Low priority |
| Practice Hub | 🎯 Critical | ❌ N/A | ❌ N/A |
| Plain English | ⚠️ Nice-to-have | 🎯 Critical | ⚠️ Nice-to-have |
| Swahili | ❌ Low | 🎯 Critical | ❌ Low |
| Expense Tracking | ✅ Helpful | ✅ Helpful | 🎯 Critical |
| Client Portal | 🎯 Critical | ✅ Helpful | ❌ N/A |
| Offline Mode | ✅ Helpful | 🎯 Critical | ✅ Helpful |

---

## 📚 Reference Documents

| Document | Location | Description |
|----------|----------|-------------|
| Feature Spec v3.0 | *(provided by product team)* | Complete feature spec (15 sections) |
| Sprint Delta Analysis | [`plans/mobile-feature-spec-delta.md`](plans/mobile-feature-spec-delta.md) | Feature spec → sprint plan mapping |
| Architecture Overview | [`plans/mobile-architecture-overview.md`](plans/mobile-architecture-overview.md) | Technical architecture blueprint |
| API Contracts | [`contracts/`](contracts/) | **24 API contracts** — all created |
| Design System Master Plan | [`plans/design-system-v2-master-plan.md`](plans/design-system-v2-master-plan.md) | UI component overhaul plan |
| Shared Types | [`../../projects/jengabooks/packages/shared/src/`](../../projects/jengabooks/packages/shared/src/) | Zod schemas, enums, permissions, theme |
| Prisma Schema | [`../../projects/jengabooks/apps/api/prisma/schema.prisma`](../../projects/jengabooks/apps/api/prisma/schema.prisma) | Database schema |
| PROJECT.md | [`../../projects/jengabooks/PROJECT.md`](../../projects/jengabooks/PROJECT.md) | Project constraints & context |
