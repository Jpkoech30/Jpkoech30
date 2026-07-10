# 🧠 JengaBooks Mobile — Orchestration Master Plan

> **Status:** `ACTIVE` | **Lead:** Lead Architect & Orchestrator | **Created:** 2026-07-09 | **Updated:** 2026-07-09 (Design Principles Integration)

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

---

## 🗺️ Sprint Roadmap (v3.0-Aligned)

### Sprint 1 — Foundation + Core P0 Must-Haves ✅ **COMPLETE (15/15)**
**Theme:** Fill critical gaps + deliver P0 launch features + SIM core features

| # | Task | Agent | Status | Files |
|---|------|-------|--------|-------|
| 1.1 | WatermelonDB Integration | `📱 Mobile State` | ✅ Done | schema, models, sync, database, database-provider |
| 1.2 | M-Pesa Transactions Screen | `📱 Mobile Screen` | ✅ Done | [`mpesa.tsx`](jengabooks/apps/mobile/src/app/app/mpesa.tsx) |
| 1.3 | Invoice Creation + Templates + Duplicate | `📱 Mobile Screen` | ✅ Done | [`invoices/create.tsx`](jengabooks/apps/mobile/src/app/app/invoices/create.tsx), [`[id].tsx`](jengabooks/apps/mobile/src/app/app/invoices/[id].tsx) |
| 1.4 | Chart of Accounts | `📱 Mobile Screen` | ✅ Done | [`accounts/index.tsx`](jengabooks/apps/mobile/src/app/app/accounts/index.tsx), [`create.tsx`](jengabooks/apps/mobile/src/app/app/accounts/create.tsx) |
| 1.5 | Missing UI Components | `📱 Mobile UI` | ✅ Done | Modal, Toast, EmptyState, Skeleton, ErrorBoundary, Avatar, SearchBar |
| 1.6 | WhatsApp Invoice Sharing | `📱 Mobile Screen` | ✅ Done | [`share-buttons.tsx`](jengabooks/apps/mobile/src/components/invoices/share-buttons.tsx) |
| 1.7 | M-Pesa Payment Links + Combined Payments | `📱 Mobile Screen` | ✅ Done | Integrated into invoice detail |
| 1.8 | Invoice Aging Report | `📱 Mobile Screen` | ✅ Done | [`invoices/aging.tsx`](jengabooks/apps/mobile/src/app/app/invoices/aging.tsx) |
| 1.9 | Logo/Signature on Invoices | `📱 Mobile UI` | ✅ Done | [`signature-pad.tsx`](jengabooks/apps/mobile/src/components/invoices/signature-pad.tsx) |
| 1.10 | Plain English Toggle | `📱 Mobile State` | ✅ Done | [`i18n/en.plain.ts`](jengabooks/apps/mobile/src/lib/i18n/en.plain.ts), [`use-i18n.ts`](jengabooks/apps/mobile/src/hooks/use-i18n.ts) |
| 1.11 | Biometric Login | `📱 Mobile State` | ✅ Done | [`biometric.ts`](jengabooks/apps/mobile/src/lib/biometric.ts), auth-store |
| 1.12 | Client Management + Contact History | `📱 Mobile Screen` | ✅ Done | [`clients/`](jengabooks/apps/mobile/src/app/app/clients/) |
| 1.13 | Product/Service Portfolio | `📱 Mobile Screen` | ✅ Done | [`products/`](jengabooks/apps/mobile/src/app/app/products/) |
| 1.14 | Credit Notes | `📱 Mobile Screen` | ✅ Done | [`invoices/credit-notes.tsx`](jengabooks/apps/mobile/src/app/app/invoices/credit-notes.tsx) |
| 1.15 | Signed Receipts | `📱 Mobile Screen` | ✅ Done | [`receipts/`](jengabooks/apps/mobile/src/app/app/receipts/) |
| — | Integration: Tab Layout, Login, Settings | `📱 Mobile Screen` | ✅ Done | [`_layout.tsx`](jengabooks/apps/mobile/src/_layout.tsx), [`app/_layout.tsx`](jengabooks/apps/mobile/src/app/_layout.tsx), [`login.tsx`](jengabooks/apps/mobile/src/app/login.tsx), [`settings.tsx`](jengabooks/apps/mobile/src/app/settings.tsx) |

| # | Task | Type | Agent | Est. | Design Principles | Feature Spec Ref | SIM Ref | Depends On |
|---|------|------|-------|------|-------------------|------------------|---------|------------|
| **1.1** | WatermelonDB Integration | `offline-db` | `📱 Mobile State` | 2d | **DP12** Offline Capable | §5.13 Offline Mode | — | — |
| **1.2** | M-Pesa Transactions Screen | `new-screen` | `📱 Mobile Screen` | 1d | **DP1** Mobile-First, **DP8** Clarity | §5.12 M-Pesa Auto-Sync | — | 1.1 |
| **1.3** | Invoice Creation Flow (Template Picker + Duplicate) | `new-screen` | `📱 Mobile Screen` | 2d | **DP2** Single-Screen, **DP4** Simple≠Limited, **DP9** Clean, **DP13** Autosave | §5.1 Quick Invoice Creation | SIM #1, #2, #7 | — |
| **1.4** | Chart of Accounts (Create/Manage) | `new-screen` | `📱 Mobile Screen` | 1d | **DP3** Adaptive UI, **DP14** Progressive Disclosure | §5.9 General Ledger | — | — |
| **1.5** | Missing UI Components | `components` | `📱 Mobile UI` | 2d | **DP7** Focus, **DP9** Clean, **DP15** Visual Data | §6 UI/UX Principles | — | — |
| **1.6** | 📱 **WhatsApp Invoice Sharing** | `feature` | `📱 Mobile Screen` | 0.5d | **DP6** Frictionless Sharing | §5.14 WhatsApp Sharing | SIM #4 | 1.3 |
| **1.7** | 💰 **M-Pesa Payment Links + Combined Payments** | `feature` | `📱 Mobile State` | 1d | **DP11** Compliance-First, **DP8** Clarity | §5.2 M-Pesa Payment Links | SIM #10 | 1.3 |
| **1.8** | 📊 **Invoice Aging Report** | `new-screen` | `📱 Mobile Screen` | 0.5d | **DP15** Visual Data, **DP8** Clarity | §5.2 Outstanding Receivables | — | 1.3 |
| **1.9** | 🎨 **Logo/Signature on Invoices** | `feature` | `📱 Mobile UI` | 0.5d | **DP5** Brand Customization | §5.1 Logo & Signature | SIM #3 | 1.3 |
| **1.10** | 🔤 **Plain English Toggle** | `feature` | `📱 Mobile State` | 0.5d | **DP10** Localized, Not Translated | §5.15 Multi-Language | — | — |
| **1.11** | 🔐 **Biometric Login** | `feature` | `📱 Mobile State` | 0.5d | **DP1** Mobile-First, **DP8** Clarity | §5.13 Biometric Login | — | — |
| **1.12** | 👥 **Client Management + Contact History** | `new-screen` | `📱 Mobile Screen` | 1d | **DP2** Single-Screen, **DP3** Adaptive UI | §5.7 Client & Product Mgmt | SIM #5 | — |
| **1.13** | 📦 **Product/Service Portfolio Catalog** | `new-screen` | `📱 Mobile Screen` | 1d | **DP4** Simple≠Limited, **DP14** Progressive Disclosure | §5.7 Client & Product Mgmt | SIM #6 | — |
| **1.14** | 📝 **Credit Notes (linked to invoice)** | `feature` | `📱 Mobile Screen` | 0.5d | **DP8** Clarity & Confidence, **DP11** Compliance-First | §5.1 Invoicing Core | SIM #8 | 1.3 |
| **1.15** | 🧾 **Signed Receipts (generate + send)** | `feature` | `📱 Mobile Screen` | 0.5d | **DP5** Brand Customization, **DP6** Frictionless Sharing | §5.2 Payments & Receipts | SIM #9 | 1.7 |

**New UI Components needed (1.5):** Modal, Toast, EmptyState, Skeleton, ErrorBoundary, Avatar, SearchBar, TemplatePicker, BarcodeScanner (placeholder)

### Sprint 1 ✅ COMPLETE — see full status above

### Sprint 2 ✅ COMPLETE (10/10) — Full Feature Parity
**Theme:** Feature parity with web app + persona B/C support + SIM P1 features

| # | Task | Agent | Status | Files |
|---|------|-------|--------|-------|
| 2.1 | Company Switcher + Tenant Management | `📱 Mobile State` | ✅ Done | auth-store.ts + settings.tsx |
| 2.2 | Gamification Profile Screen | `📱 Mobile Screen` | ✅ Done | [`gamification.tsx`](jengabooks/apps/mobile/src/app/app/gamification.tsx) |
| 2.3 | Document Upload Screen | `📱 Mobile Screen` | ✅ Done | [`documents.tsx`](jengabooks/apps/mobile/src/app/app/documents.tsx) |
| 2.4 | Swahili Language Toggle | `📱 Mobile State` | ✅ Done | [`sw.ts`](jengabooks/apps/mobile/src/lib/i18n/sw.ts), use-i18n.ts |
| 2.5 | Expense Management | `📱 Mobile Screen` | ✅ Done | [`expenses.tsx`](jengabooks/apps/mobile/src/app/app/expenses.tsx) |
| 2.6 | Client Portal (basic) | `📱 Mobile Screen` | ✅ Done | [`portal/`](jengabooks/apps/mobile/src/app/app/portal/) (3 screens) |
| 2.7 | Auto-Backup Integration | `📱 Mobile State` | ✅ Done | Settings toggles + backup trigger |
| 2.8 | Notification System + Deep Linking | `📱 Mobile State` | ✅ Done | [`notification-store.ts`](jengabooks/apps/mobile/src/stores/notification-store.ts), [`notifications.ts`](jengabooks/apps/mobile/src/lib/notifications.ts) |
| 2.9 | Bulk Client Import | `📱 Mobile Screen` | ✅ Done | [`clients/bulk-import.tsx`](jengabooks/apps/mobile/src/app/app/clients/bulk-import.tsx) |
| 2.10 | Multi-Currency Support | `📱 Mobile State` | ✅ Done | [`currency-store.ts`](jengabooks/apps/mobile/src/stores/currency-store.ts) |

**SIM Features Covered:** SIM #12 (Bulk Import), SIM #13 (Multi-Currency)
**Web Parity:** ✅ Gamification, Documents, Expenses, Client Portal

| # | Task | Type | Agent | Est. | Design Principles | Feature Spec Ref | SIM Ref | Depends On |
|---|------|------|-------|------|-------------------|------------------|---------|------------|
| **2.1** | Company Switcher + Tenant Management | `feature` | `📱 Mobile State` | 1d | **DP3** Adaptive UI, **DP8** Clarity | §5.10 Multi-Entity Switching | — | 1.1 |
| **2.2** | Gamification Profile Screen | `new-screen` | `📱 Mobile Screen` | 1d | **DP15** Visual Data, **DP9** Clean | §5.10 Engagement | — | — |
| **2.3** | Document Upload Screen | `new-screen` | `📱 Mobile Screen` | 1d | **DP1** Mobile-First, **DP12** Offline Capable | §5.8 Auto-Backup | — | — |
| **2.4** | 🗣️ **Swahili Language Toggle** | `feature` | `📱 Mobile State` | 1d | **DP10** Localized, Not Translated | §5.15 Multi-Language | — | 1.10 |
| **2.5** | 💳 **Expense Management** | `new-screen` | `📱 Mobile Screen` | 1.5d | **DP2** Single-Screen, **DP13** Autosave | §5.15 Expense Management | — | — |
| **2.6** | 🏢 **Client Portal (basic)** | `new-screen` | `📱 Mobile Screen` | 1.5d | **DP7** Focus, **DP8** Clarity | §5.7 Client Portal | — | — |
| **2.7** | ☁️ **Auto-Backup Integration** | `feature` | `📱 Mobile State` | 1d | **DP12** Offline Capable, **DP8** Clarity | §5.8 Auto-Backup | — | — |
| **2.8** | Notification System + Deep Linking | `feature` | `📱 Mobile State` | 1d | **DP7** Focus, **DP8** Clarity | §5.13 Push Notifications | — | — |
| **2.9** | 📥 **Bulk Client Import (Excel/Phonebook)** | `feature` | `📱 Mobile Screen` | 1d | **DP1** Mobile-First, **DP14** Progressive Disclosure | §5.7 Client Mgmt | SIM #12 | 1.12 |
| **2.10** | 💱 **Multi-Currency (KES/USD/EUR/GBP)** | `feature` | `📱 Mobile State` | 0.5d | **DP10** Localized, **DP5** Brand Customization | §5.1 Invoicing Core | SIM #13 | 1.3 |

### Sprint 3 — Polish + Real-Time + Sync + CSV Export + Barcode (Est. 8 days)
**Theme:** Production readiness + offline sync engine + SIM P2 features

| # | Task | Type | Agent | Est. | Design Principles | Feature Spec Ref | SIM Ref | Depends On |
|---|------|------|-------|------|-------------------|------------------|---------|------------|
| **3.1** | Socket.io Real-Time Integration | `integration` | `📱 Mobile State` | 1.5d | **DP7** Focus, **DP12** Offline Capable | §5.8 Cloud Sync | — | — |
| **3.2** | Push Notifications (Expo Push) | `feature` | `📱 Mobile State` | 1d | **DP8** Clarity & Confidence | §5.13 Push Notifications | — | 3.1 |
| **3.3** | WatermelonDB Sync Engine | `offline-sync` | `📱 Mobile State` | 2d | **DP12** Offline Capable | §5.8 Cloud Sync | — | 1.1 |
| **3.4** | 📱 **SMS Auto-Import (M-Pesa)** | `feature` | `📱 Mobile Screen` | 1d | **DP1** Mobile-First, **DP11** Compliance-First | §5.12 SMS Auto-Import | — | — |
| **3.5** | Animations & Micro-Interactions | `polish` | `📱 Mobile UI` | 1d | **DP7** Focus, **DP9** Clean, **DP4** Simple≠Limited | §6 UI/UX Principles | — | — |
| **3.6** | 📊 **CSV Export for All Data** | `feature` | `📱 Mobile State` | 1d | **DP8** Clarity, **DP11** Compliance-First | §5.14 Export & Sharing | SIM #11 | 1.3, 1.12, 1.13 |
| **3.7** | 📷 **Barcode/QR Scanner Integration** | `feature` | `📱 Mobile Screen` | 1d | **DP1** Mobile-First, **DP4** Simple≠Limited | §5.13 Mobile & Offline | SIM #14 | 1.13 |
| **3.8** | E2E Tests (Detox/Appium) | `qa` | `🧪 QA Automator` | 2d | **DP8** Clarity & Confidence, **DP11** Compliance | — | — | All above |
| **3.9** | Performance Audit | `audit` | `⚡ Performance Auditor` | 0.5d | **DP1** Mobile-First, **DP9** Clean | — | — | 3.5 |

### Sprint 4 — Brand Refresh + Advanced Features (Est. 10 days) — **IN PROGRESS**
**Theme:** Brand refresh + remaining feature spec v3.0 features + SIM parity items

| # | Task | Type | Agent | Status | Files |
|---|------|------|-------|--------|-------|
| **4.1** | Brand Color Migration (`#0A5C36`→`#1A56DB`) | `polish` | `📱 Mobile UI` | ✅ Done | [`tailwind.config.js`](jengabooks/apps/mobile/tailwind.config.js), all UI components, all screens, `_layout.tsx` |
| **4.2** | Purchase & Inventory Management | `new-screen` | `📱 Mobile Screen` | ✅ Done | [`inventory/index.tsx`](jengabooks/apps/mobile/src/app/app/inventory/index.tsx) — stock list, search, category filter, low stock alerts; [`inventory/[id].tsx`](jengabooks/apps/mobile/src/app/app/inventory/[id].tsx) — product detail, stock history, purchases, adjustments; [`inventory/purchase.tsx`](jengabooks/apps/mobile/src/app/app/inventory/purchase.tsx) — record purchase with supplier, items, costs |
| **4.3** | Order Management (Sales + Purchase Orders) | `new-screen` | `📱 Mobile Screen` | ✅ Done | [`orders/index.tsx`](jengabooks/apps/mobile/src/app/app/orders/index.tsx) — SO + PO list, status/type filters; [`orders/[id].tsx`](jengabooks/apps/mobile/src/app/app/orders/[id].tsx) — order detail, fulfillment tracking, partial delivery; [`orders/create.tsx`](jengabooks/apps/mobile/src/app/app/orders/create.tsx) — create sales/purchase order with line items |
| **4.4** | Custom Report Builder | `new-screen` | `📱 Mobile Screen` | ✅ Done | [`report-builder.tsx`](jengabooks/apps/mobile/src/app/app/report-builder.tsx) — field selector (income/expenses/accounts/dates), report types (P&L, Balance Sheet, Cash Flow, Custom), chart preview, CSV/PDF export, save templates |
| **4.5** | POS Billing | `new-screen` | `📱 Mobile Screen` | ✅ Done | [`pos.tsx`](jengabooks/apps/mobile/src/app/app/pos.tsx) — product grid search, cart with line items, quick customer select, payment split (CASH+MPESA+CARD), receipt printing, offline support |
| **4.6** | Online Store Management | `new-screen` | `📱 Mobile Screen` | ✅ Done | [`store.tsx`](jengabooks/apps/mobile/src/app/app/store.tsx) — product listings with publish toggle, inventory sync, order notifications (Products/Orders/Settings tabs), basic e-commerce integration |
| **4.7** | Client Surveys | `new-screen` | `📱 Mobile Screen` | ✅ Done | [`surveys.tsx`](jengabooks/apps/mobile/src/app/app/surveys.tsx) — create/send satisfaction surveys, multiple question types (RATING/TEXT/YES_NO/MULTIPLE_CHOICE), response rates, analytics dashboard with rating distribution |
| **4.8** | Premium Invoice Templates (animated) | `feature` | `📱 Mobile UI` | ✅ Done | [`invoices/create.tsx`](jengabooks/apps/mobile/src/app/app/invoices/create.tsx) — 4 new premium templates (Traditional, Premium, Corporate, Elegant) with Animated.spring scale+fade |
| **4.9** | Batch Operations (bulk approve, bulk send) | `feature` | `📱 Mobile State` | ✅ Done | [`use-batch.ts`](jengabooks/apps/mobile/src/hooks/use-batch.ts) — reusable batch selection + action hook; [`batch-toolbar.tsx`](jengabooks/apps/mobile/src/lib/batch-toolbar.tsx) — floating batch bar UI; integrated into [`clients/index.tsx`](jengabooks/apps/mobile/src/app/app/clients/index.tsx) (bulk email, export), [`mpesa.tsx`](jengabooks/apps/mobile/src/app/app/mpesa.tsx) (bulk categorize, approve), [`expenses.tsx`](jengabooks/apps/mobile/src/app/app/expenses.tsx) (bulk categorize, export), [`invoices/index.tsx`](jengabooks/apps/mobile/src/app/app/invoices/index.tsx) (bulk WhatsApp, email, PDF) |
| **4.10** | Advanced Multi-Currency Reporting | `feature` | `📱 Mobile State` | ✅ Done | [`currency-store.ts`](jengabooks/apps/mobile/src/stores/currency-store.ts) v2.0 — auto-fetch daily rates, per-company persistence, KES equivalent reporting, stale rate detection; [`exchange-rate-indicator.tsx`](jengabooks/apps/mobile/src/lib/exchange-rate-indicator.tsx) — badge + bar indicator; integrated into [`reports.tsx`](jengabooks/apps/mobile/src/app/reports.tsx) and [`invoices/index.tsx`](jengabooks/apps/mobile/src/app/app/invoices/index.tsx) |

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

### Key Constraints (from [`jengabooks/PROJECT.md`](jengabooks/PROJECT.md))
- **48px minimum touch targets** on all interactive elements
- **fontSize: 16** on all mobile inputs to prevent iOS zoom
- **No in-memory state** for financial data (must use WatermelonDB/local persistence)
- **JWT is the sole session state** (no Redis sessions)
- **Tenant isolation** on all queries

### Design Principles (from Feature Spec §3 + §6)

Our **16 design principles** are embedded into every sprint task via the "Design Principles" column. Each task must satisfy its assigned principles.

| # | Principle | Enforced By | S1 | S2 | S3 |
|---|-----------|-------------|----|----|----|
| **DP1** | **Mobile-First** — Mobile as powerful as desktop | Test on device, not simulator | ✅ | ✅ | ✅ |
| **DP2** | **Single-Screen Completion** — No multi-step wizards | Modal over navigation | ✅ | ✅ | — |
| **DP3** | **Adaptive UI** — Show only relevant fields | Role-based defaults | ✅ | ✅ | — |
| **DP4** | **Simple ≠ Limited** — Simple UX, deep features | Progressive disclosure | ✅ | ✅ | ✅ |
| **DP5** | **Brand Customization** — Logo, signature, templates | Branding on every screen | ✅ | — | — |
| **DP6** | **Frictionless Sharing** — One-tap share | Share button on all entities | ✅ | — | — |
| **DP7** | **Focus Without Interference** — Minimal chrome | Content > navigation ratio | ✅ | ✅ | ✅ |
| **DP8** | **Clarity & Confidence** — Unambiguous states | Status badges everywhere | ✅ | ✅ | ✅ |
| **DP9** | **Clean & Intuitive** — FreshBooks-level polish | Design review | ✅ | ✅ | ✅ |
| **DP10** | **Localized, Not Translated** — Kenya-first | Swahili + Plain English | ✅ | ✅ | — |
| **DP11** | **Compliance-First** — eTIMS/KRA built in | eTIMS badge on invoices | ✅ | ✅ | ✅ |
| **DP12** | **Offline Capable** — Work without internet | WatermelonDB integration | ✅ | ✅ | ✅ |
| **DP13** | **Autosave** — No "Save" button | Auto-persist on change | ✅ | ✅ | — |
| **DP14** | **Progressive Disclosure** — Hide complexity | Collapsible "More" sections | ✅ | ✅ | — |
| **DP15** | **Visual Data Representation** — Charts, not tables | Sparklines, gauges | ✅ | ✅ | — |
| **DP16** | **Clear Status Indicators** — Green/Yellow/Red | Health dots, confidence tiers | ✅ | ✅ | ✅ |

**Every task in every sprint references its governing design principles.** Code review must verify each principle was implemented.

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
│   │   ├── index.tsx             # Dashboard (EXISTS) — enhance with aging widget
│   │   ├── ledger.tsx            # Ledger (EXISTS)
│   │   ├── etims.tsx             # eTIMS invoices (EXISTS) — enhance with payment links
│   │   ├── hitl.tsx              # HITL reviews (EXISTS)
│   │   ├── reports.tsx           # Reports (EXISTS)
│   │   ├── settings.tsx          # Settings (EXISTS) — enhance with language toggles
│   │   ├── mpesa.tsx             # NEW - M-Pesa transactions (§5.12)
│   │   ├── mpesa-import.tsx      # NEW - M-Pesa CSV import (§5.2)
│   │   ├── invoices/
│   │   │   ├── create.tsx        # NEW - Create invoice with template picker (§9.3) [SIM #1, #2]
│   │   │   ├── [id].tsx          # NEW - Invoice detail + payment + share + duplicate [SIM #7]
│   │   │   ├── aging.tsx         # NEW - Aging report (§5.2)
│   │   │   └── credit-notes.tsx  # NEW - Credit notes linked to invoice [SIM #8]
│   │   ├── accounts/
│   │   │   ├── index.tsx         # NEW - Chart of Accounts list
│   │   │   └── create.tsx        # NEW - Create account
│   │   ├── clients/
│   │   │   ├── index.tsx         # NEW - Client list + search [SIM #5]
│   │   │   ├── [id].tsx          # NEW - Client detail + contact history
│   │   │   ├── create.tsx        # NEW - Create client
│   │   │   └── bulk-import.tsx   # NEW - Bulk client import [SIM #12]
│   │   ├── products/
│   │   │   ├── index.tsx         # NEW - Product/Service catalog [SIM #6]
│   │   │   ├── [id].tsx          # NEW - Product detail
│   │   │   └── create.tsx        # NEW - Create product/service
│   │   ├── receipts/
│   │   │   ├── index.tsx         # NEW - Signed receipts list [SIM #9]
│   │   │   └── [id].tsx          # NEW - Receipt detail + send
│   │   ├── barcode.tsx           # NEW - Barcode/QR scanner [SIM #14]
│   │   ├── export.tsx            # NEW - CSV/Excel export center [SIM #11]
│   │   ├── gamification.tsx      # NEW - XP/Levels/Badges
│   │   ├── documents.tsx         # NEW - Document upload/list
│   │   ├── payroll.tsx           # NEW - Payroll runs list
│   │   ├── expenses.tsx          # NEW - Expense management (§5.15)
│   │   ├── practice.tsx          # NEW - Practice Hub (Accountant View) (§9.2)
│   │   ├── portal/               # NEW - Client Portal (§9.5)
│   │   │   ├── invoices.tsx
│   │   │   ├── documents.tsx
│   │   │   └── tasks.tsx
│   │   ├── notifications.tsx     # NEW - Notification center
│   │   └── company-switch.tsx    # NEW - Company switcher
│   └── ...modals/                # Modal screens
│
├── components/
│   ├── ui/
│   │   ├── button.tsx            # EXISTS — enhance with icon-only, sizes
│   │   ├── card.tsx              # EXISTS
│   │   ├── badge.tsx             # EXISTS — enhance with dismissible
│   │   ├── input.tsx             # EXISTS — enhance with currency KSh prefix
│   │   ├── sync-status.tsx       # EXISTS
│   │   ├── xp-bar.tsx            # EXISTS
│   │   ├── modal.tsx             # NEW
│   │   ├── toast.tsx             # NEW
│   │   ├── skeleton.tsx          # NEW
│   │   ├── empty-state.tsx       # NEW
│   │   ├── error-boundary.tsx    # NEW
│   │   ├── avatar.tsx            # NEW
│   │   ├── search-bar.tsx        # NEW
│   │   ├── template-picker.tsx   # NEW - Invoice template selector [SIM #2]
│   │   └── barcode-scanner.tsx   # NEW - Barcode/QR scanner [SIM #14]
│   ├── dashboard/
│   │   ├── summary-card.tsx      # EXISTS
│   │   ├── business-health-score.tsx # EXISTS
│   │   └── aging-widget.tsx      # NEW - aging report widget
│   ├── ledger/
│   │   └── transaction-item.tsx  # EXISTS
│   ├── ai/
│   │   ├── confidence-badge.tsx  # EXISTS
│   │   └── thinking-bubble.tsx   # EXISTS
│   ├── mpesa/
│   │   ├── transaction-row.tsx   # NEW
│   │   └── import-preview.tsx    # NEW
│   ├── invoices/
│   │   ├── invoice-form.tsx      # NEW
│   │   ├── line-item-row.tsx     # NEW
│   │   ├── share-buttons.tsx     # NEW - WhatsApp, Email, Link
│   │   └── credit-note-form.tsx  # NEW - Credit note creation [SIM #8]
│   ├── clients/
│   │   ├── client-card.tsx       # NEW - Client list card
│   │   ├── contact-history-list.tsx # NEW - Contact history timeline [SIM #5]
│   │   └── bulk-import-preview.tsx # NEW - Import preview [SIM #12]
│   ├── products/
│   │   ├── product-card.tsx      # NEW
│   │   └── product-selector.tsx   # NEW - Quick product picker for invoices
│   ├── receipts/
│   │   └── receipt-card.tsx      # NEW
│   └── common/
│       ├── loading-screen.tsx    # NEW
│       └── error-screen.tsx      # NEW
│
├── stores/
│   ├── auth-store.ts             # EXISTS — enhance with biometric
│   ├── ui-store.ts               # EXISTS — enhance with language toggle
│   ├── sync-store.ts             # NEW - sync state + queue
│   ├── notification-store.ts     # NEW - notification state
│   └── currency-store.ts         # NEW - multi-currency preferences [SIM #13]
│
├── hooks/
│   ├── use-auth.ts               # EXISTS
│   ├── use-offline.ts            # EXISTS
│   ├── use-sync.ts               # EXISTS — enhance with WatermelonDB
│   ├── use-notifications.ts      # NEW
│   ├── use-deep-linking.ts       # NEW
│   ├── use-i18n.ts               # NEW - plain english/swahili
│   └── use-barcode.ts            # NEW - barcode scanner hook [SIM #14]
│
├── lib/
│   ├── api-client.ts             # EXISTS
│   ├── database.ts               # EXISTS — replace with WatermelonDB
│   ├── utils.ts                  # EXISTS — enhance with share helpers
│   ├── i18n/                     # NEW - localization engine
│   │   ├── en.plain.ts           # Plain English translations
│   │   └── sw.ts                 # Swahili translations
│   ├── watermelon/
│   │   ├── schema.ts             # NEW - WatermelonDB schema
│   │   ├── models/               # NEW - WatermelonDB models
│   │   └── sync.ts               # NEW - sync protocol
│   ├── socket.ts                 # NEW - Socket.io client
│   ├── export-helper.ts          # NEW - CSV generation helpers [SIM #11]
│   └── barcode-helper.ts         # NEW - Barcode parsing helpers [SIM #14]
│
├── types/
│   └── nativewind.d.ts           # EXISTS
│
└── services/
    ├── sync.service.ts           # NEW
    ├── notification.service.ts   # NEW
    ├── deep-link.service.ts      # NEW
    ├── share.service.ts          # NEW - WhatsApp/email sharing
    └── export.service.ts         # NEW - CSV/Excel export service [SIM #11]
```

---

## 📋 API Contract Registry

| Contract ID | Version | Path | Status | SIM Feature |
|-------------|---------|------|--------|-------------|
| `mobile-auth` | 1.0.0 | [`.agency/contracts/mobile-auth.json`](.agency/contracts/mobile-auth.json) | ✅ Done | — |
| `mobile-ledger` | 1.0.0 | [`.agency/contracts/mobile-ledger.json`](.agency/contracts/mobile-ledger.json) | ✅ Done | — |
| `mobile-mpesa` | 1.0.0 | [`.agency/contracts/mobile-mpesa.json`](.agency/contracts/mobile-mpesa.json) | ✅ Done | — |
| `mobile-etims` | 1.1.0 | [`.agency/contracts/mobile-etims.json`](.agency/contracts/mobile-etims.json) | ✅ Done (v1.1) | SIM #2 (Templates), SIM #7 (Duplicate) |
| `mobile-hitl` | 1.0.0 | [`.agency/contracts/mobile-hitl.json`](.agency/contracts/mobile-hitl.json) | ✅ Done | — |
| `mobile-reports` | 1.0.0 | [`.agency/contracts/mobile-reports.json`](.agency/contracts/mobile-reports.json) | ✅ Done | — |
| `mobile-gamification` | 1.0.0 | [`.agency/contracts/mobile-gamification.json`](.agency/contracts/mobile-gamification.json) | ✅ Done | — |
| `mobile-sync` | 1.0.0 | [`.agency/contracts/mobile-sync.json`](.agency/contracts/mobile-sync.json) | ✅ Done | — |
| `mobile-payroll` | 1.0.0 | [`.agency/contracts/mobile-payroll.json`](.agency/contracts/mobile-payroll.json) | ✅ Done | — |
| `mobile-documents` | 1.0.0 | [`.agency/contracts/mobile-documents.json`](.agency/contracts/mobile-documents.json) | ✅ Done | — |
| `mobile-dashboard` | 1.0.0 | [`.agency/contracts/mobile-dashboard.json`](.agency/contracts/mobile-dashboard.json) | ✅ Done | — |
| `mobile-share` | 1.0.0 | [`.agency/contracts/mobile-share.json`](.agency/contracts/mobile-share.json) | ✅ Done | SIM #4 (WhatsApp/Email) |
| `mobile-payments` | 1.1.0 | [`.agency/contracts/mobile-payments.json`](.agency/contracts/mobile-payments.json) | ✅ Done (v1.1) | SIM #10 (Combined Payments) |
| `mobile-expenses` | 1.0.0 | [`.agency/contracts/mobile-expenses.json`](.agency/contracts/mobile-expenses.json) | ✅ Done | — |
| `mobile-client-portal` | 1.0.0 | [`.agency/contracts/mobile-client-portal.json`](.agency/contracts/mobile-client-portal.json) | ✅ Done | — |
| `mobile-backup` | 1.0.0 | [`.agency/contracts/mobile-backup.json`](.agency/contracts/mobile-backup.json) | ✅ Done | — |
| `mobile-sms-import` | 1.0.0 | [`.agency/contracts/mobile-sms-import.json`](.agency/contracts/mobile-sms-import.json) | ✅ Done | — |
| `mobile-biometric` | 1.0.0 | [`.agency/contracts/mobile-biometric.json`](.agency/contracts/mobile-biometric.json) | ✅ Done | — |
| `mobile-credit-notes` | 1.0.0 | [`.agency/contracts/mobile-credit-notes.json`](.agency/contracts/mobile-credit-notes.json) | ✅ Done | SIM #8 (Credit Notes) |
| `mobile-receipts` | 1.0.0 | [`.agency/contracts/mobile-receipts.json`](.agency/contracts/mobile-receipts.json) | ✅ Done | SIM #9 (Signed Receipts) |
| `mobile-products` | 1.0.0 | [`.agency/contracts/mobile-products.json`](.agency/contracts/mobile-products.json) | ✅ Done | SIM #6 (Product Portfolio) |
| `mobile-clients` | 1.0.0 | [`.agency/contracts/mobile-clients.json`](.agency/contracts/mobile-clients.json) | ✅ Done | SIM #5 (Client Mgmt), SIM #12 (Bulk Import) |
| `mobile-export` | 1.0.0 | [`.agency/contracts/mobile-export.json`](.agency/contracts/mobile-export.json) | ✅ Done | SIM #11 (CSV Export) |
| `mobile-barcode` | 1.0.0 | [`.agency/contracts/mobile-barcode.json`](.agency/contracts/mobile-barcode.json) | ✅ Done | SIM #14 (Barcode/QR Scanner) |

**Total:** **24 contracts** — all created (11 original + 5 new + 2 extended + 6 new SIM-specific)

**Contract Count by Sprint:**
| Sprint | Contracts | IDs |
|--------|-----------|-----|
| Sprint 1 | 16 | auth, ledger, mpesa, etims (v1.1), hitl, reports, dashboard, share, payments (v1.1), biometric, **credit-notes, receipts, products, clients, barcode** |
| Sprint 2 | 5 | gamification, payroll, documents, expenses, client-portal, backup |
| Sprint 3 | 3 | sync, sms-import, **export** |

---

## 🔗 Handoff Protocol

| Handoff | From | To | Artifacts |
|---------|------|----|-----------|
| **H1** | `🧠 Lead Architect` | `📱 Mobile Lead` | ORCHESTRATION.md, all contracts in `.agency/contracts/` |
| **H2** | `📱 Mobile Lead` | `📱 Mobile UI` | Component specs, design tokens, [`button.tsx`](jengabooks/apps/mobile/src/components/ui/button.tsx) enhancements |
| **H3** | `📱 Mobile Lead` | `📱 Mobile Screen` | Screen specs, API contracts, route definitions |
| **H4** | `📱 Mobile Lead` | `📱 Mobile State` | Store schemas, WatermelonDB schema, sync protocol |
| **H5** | All mobile agents | `🧪 QA Automator` | Test specs |
| **H6** | All mobile agents | `🧠 Lead Architect` | PRs, updates to ORCHESTRATION.md |

Each handoff MUST include:
```
HANDOFF: <agent-slug>
ARTIFACTS: <list of files/contracts>
CONTRACT: <contract-id version>
CONTEXT: <summary of what was done>
STATUS: <PENDING | IN_PROGRESS | REVIEW | DONE | BLOCKED>
```

---

## ✅ Quality Gates

| Gate | Trigger | Pass Criteria |
|------|---------|---------------|
| **G1: Compliance** | Before any PR merge | No MISSING_API_DATA, no Date.now() in financial paths, no hardcoded secrets |
| **G2: TypeScript** | `tsc --noEmit` | Zero errors |
| **G3: 48px Rule** | Visual review | All touch targets >= 48x48dp |
| **G4: fontSize 16** | Code review | All `<TextInput>` have `style={{ fontSize: 16 }}` |
| **G5: Offline Safety** | Code review | Every screen handles null/loading/error states |
| **G6: API Contract** | Before API call | Every endpoint matches `.agency/contracts/*.json` |
| **G7: Persona Test** | Each sprint review | Jane (accountant), David (SME), Grace (freelancer) workflows pass |
| **G8: Design Principle Compliance** | Each sprint review | Every task's assigned design principles (DP1-DP16) are verified implemented per ORCHESTRATION.md's Design Principles matrix |
| **G9: Autosave Verification** | Code review | All form screens auto-persist on change; no "Save" button pattern used (DP13) |
| **G10: Sharing Test** | Before Sprint 1 release | Every generated entity (invoice, receipt, credit note, report) has a working share button (DP6) |

---

## 🚨 Known Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| WatermelonDB schema conflicts with Prisma schema | Data loss | Design sync protocol before coding, map fields explicitly |
| Poor offline UX on slow networks | User drop-off | Loading skeletons, optimistic updates, retry queue |
| Push notification setup complexity | Delayed Sprint 3 | Start Expo Push setup early (Sprint 2) |
| iOS keyboard covering inputs | Bad UX | KeyboardAvoidingView + scrollToInput on all form screens |
| Expo SDK 51 compatibility with WatermelonDB latest | Build errors | Pin WatermelonDB version, test on both platforms |
| WhatsApp sharing API restrictions (iOS) | Blocked sharing | Use `expo-sharing` as fallback + `react-native-share` |
| Biometric auth on simulator | Broken dev flow | Feature-flag biometric; allow PIN fallback in dev |
| Swahili translation quality | User distrust | Use native Swahili speakers for review, not machine translation |
| Invoice aging calculation with offline data | Inaccurate reports | Calculate from WatermelonDB local data, reconcile on sync |
| **SIM Feature #2: 10+ invoice templates increase APK size** | App bloat | Lazy-load template previews; serve template thumbnails from CDN |
| **SIM Feature #5: Client contact history storage offline** | Lost comms history | Store contact events in WatermelonDB; sync on reconnect |
| **SIM Feature #8: Credit notes linked to invoices — cascading state** | Financial inconsistency | Server-side validation prevents over-crediting; mobile shows remaining balance |
| **SIM Feature #9: Signed receipt PDF generation on mobile** | Performance hit on slow devices | Generate receipt PDFs server-side; mobile only triggers and downloads |
| **SIM Feature #10: Combined payments (CASH + MPESA + CARD)** | Split payment reconciliation | Each payment leg recorded separately; invoice status computed from all legs |
| **SIM Feature #11: CSV export of large datasets (10k+ rows)** | Mobile memory crash | Stream CSV generation server-side; mobile downloads pre-generated file |
| **SIM Feature #12: Bulk client import from phonebook** | Duplicate contacts, privacy | Server-side dedup on email/phone; user confirms before import |
| **SIM Feature #13: Multi-currency — exchange rate volatility** | Inaccurate reporting | Daily exchange rate cache; show both original and base currency |
| **SIM Feature #14: Barcode scanner camera permission** | App store rejection | Graceful fallback to manual SKU entry; request permission only on scan action |
| **Sprint 1 scope creep (15 tasks, 10d est.)** | Delayed delivery | Split into Sprint 1a (core 11 tasks) + Sprint 1b (SIM #5, #6, #8, #9) if needed |
| **SIM user expectations vs JengaBooks differentiation** | Feature confusion | Brand all SIM-inspired features as "Powered by SIM" or JengaBooks-native |

---

## 👤 Persona Test Matrix

| Screen/Feature | Jane (Accountant) | David (SME) | Grace (Freelancer) |
|----------------|-------------------|-------------|-------------------|
| Dashboard | 📊 Quick overview | 📊 Cash flow + aging | 📊 Income/expense |
| Invoice Create | ⌨️ Keyboard shortcuts | ➡️ 2-click creation | ➡️ 2-click creation |
| Invoice Templates (10+) [SIM #2] | 🎯 **Professional branding** | 🎯 **Looks legit** | ✅ Quick pick |
| Invoice Duplicate [SIM #7] | 🎯 **Bulk operations** | ✅ Time saver | ✅ Time saver |
| Client Management + History [SIM #5] | 🎯 **Critical — full history** | ✅ Helpful | ⚠️ Basic needed |
| Product/Service Catalog [SIM #6] | 🎯 **Standardize billing** | 🎯 **Product inventory** | ⚠️ Service list |
| Credit Notes [SIM #8] | 🎯 **Audit trail** | ✅ Customer returns | ⚠️ Rarely |
| Signed Receipts [SIM #9] | 🎯 **Official records** | 🎯 **Customer trust** | ✅ Professional |
| Combined Payments [SIM #10] | 🎯 **Partial payments** | 🎯 **CASH+MPESA** | ⚠️ Simple only |
| CSV Export [SIM #11] | 🎯 **Audit data** | ✅ Backup | ✅ Tax prep |
| Bulk Client Import [SIM #12] | 🎯 **Migrate clients** | ✅ Import contacts | ❌ Low |
| Multi-Currency [SIM #13] | ⚠️ USD clients | ✅ Tourist business | ❌ Low |
| Barcode/QR Scanner [SIM #14] | ❌ Low | ✅ Quick invoice | ⚠️ Nice |
| M-Pesa | 🔄 Bulk reconcile | 📱 Auto-sync | 👁️ View only |
| eTIMS | ✅ Compliance check | ✅ One-click submit | ❌ Low priority |
| Practice Hub | 🎯 **Critical** | ❌ N/A | ❌ N/A |
| Plain English | ⚠️ Nice-to-have | 🎯 **Critical** | ⚠️ Nice-to-have |
| Swahili | ❌ Low | 🎯 **Critical** | ❌ Low |
| Expense Tracking | ✅ Helpful | ✅ Helpful | 🎯 **Critical** |
| Client Portal | 🎯 **Critical** | ✅ Helpful | ❌ N/A |
| Offline Mode | ✅ Helpful | 🎯 **Critical** | ✅ Helpful |

---

### Sprint 5 — Agency Infrastructure: Roo Code Setup (Est. 3.5 days)
**Theme:** CI/CD, Husky, lint-staged, test DB scripts — HIGH priority delta items from Roo Code Setup Guide

| # | Task | Type | Agent | Status | Depends On | Files |
|---|------|------|-------|--------|------------|-------|
| **5.1** | Create `.github/workflows/ci.yml` — basic CI (lint, test, build) | `ci` | `🚀 DevOps` | ✅ DONE | — | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| **5.2** | Install Husky + lint-staged + pre-commit + commit-msg hooks | `devops` | `🚀 DevOps` | ✅ DONE | — | [`.husky/pre-commit`](jengabooks/.husky/pre-commit), [`.husky/commit-msg`](jengabooks/.husky/commit-msg), [`package.json`](jengabooks/package.json) |
| **5.3** | Add lint-staged config to `jengabooks/package.json` | `config` | `🔧 JengaBooks Code` | ✅ DONE | 5.2 | [`package.json`](jengabooks/package.json) |
| **5.4** | Create `test:setup` + `test:cleanup` npm scripts | `config` | `🔧 JengaBooks Code` | ✅ DONE | — | [`package.json`](jengabooks/package.json) |
| **5.5** | Create `.agency/scripts/cleanup-test-db.js` | `script` | `🔧 JengaBooks Code` | ✅ DONE | — | [`.agency/scripts/cleanup-test-db.js`](.agency/scripts/cleanup-test-db.js) |
| **5.6** | Add remaining missing npm scripts to `jengabooks/package.json` | `config` | `🔧 JengaBooks Code` | ✅ DONE | 5.4 | [`package.json`](jengabooks/package.json) |

### Sprint 6 — Agency Infrastructure: MEDIUM Priority Items (Est. 2 days)
**Theme:** Bootstrap script, temp directory, format documentation

| # | Task | Type | Agent | Status | Files |
|---|------|------|-------|--------|-------|
| **6.1** | Create `.agency/scripts/init-project.js` bootstrap script | `script` | `🔧 JengaBooks Code` | ✅ DONE — |
| **6.2** | Add `agency:init` npm script to `jengabooks/package.json` | `config` | `🔧 JengaBooks Code` | ✅ DONE — |
| **6.3** | Create `.agency/temp/` directory (cleanup temp location) | `config` | `🧠 Lead Architect` | ✅ DONE — |
| **6.4** | Document both `.roomodes` formats (ZooCode + Roo Code) | `docs` | `📝 Documentarian` | ✅ DONE | [`.agency/roomodes-formats.md`](.agency/roomodes-formats.md) |

---

**Delta Plan:** [`plans/roo-code-setup-delta-plan.md`](.agency/plans/roo-code-setup-delta-plan.md)

---

## 📚 Reference Documents

| Document | Location | Description |
|----------|----------|-------------|
| Feature Spec v3.0 | *(provided by product team)* | Complete feature spec (15 sections) |
| Sprint Delta Analysis | [`plans/mobile-feature-spec-delta.md`](plans/mobile-feature-spec-delta.md) | Feature spec → sprint plan mapping |
| Architecture Overview | [`plans/mobile-architecture-overview.md`](plans/mobile-architecture-overview.md) | Technical architecture blueprint |
| API Contracts | [`.agency/contracts/`](.agency/contracts/) | **24 API contracts** — all created (11 original + 5 new + 2 extended + 6 SIM-specific) |
| Design System Master Plan | [`plans/design-system-v2-master-plan.md`](plans/design-system-v2-master-plan.md) | UI component overhaul plan |
| Shared Types | [`jengabooks/packages/shared/src/`](jengabooks/packages/shared/src/) | Zod schemas, enums, permissions, theme |
| Prisma Schema | [`jengabooks/apps/api/prisma/schema.prisma`](jengabooks/apps/api/prisma/schema.prisma) | Database schema |
| PROJECT.md | [`jengabooks/PROJECT.md`](jengabooks/PROJECT.md) | Project constraints & context |

---

## 🧠 N-SPRINT v2.0 — Agency Intelligence Upgrade

> **Status:** `SPRINT 7-8 DONE — SPRINT 9 IN PROGRESS` | **Lead:** Lead Architect & Orchestrator | **Created:** 2026-07-10
> **Blueprint:** [`.agency/plans/n-sprint-blueprint.md`](.agency/plans/n-sprint-blueprint.md)
> **Goal:** Transform agency from Reactive Tool into Proactive, Self-Optimizing Organism

### N-SPRINT Contracts Registry

| Contract ID | Version | Path | Status | Sprint |
|---|---|---|---|---|
| `agency-telemetry` | 1.0.0 | [`.agency/contracts/agency-telemetry.json`](.agency/contracts/agency-telemetry.json) | ✅ Created | 7 |
| `agency-secret-scan` | 1.0.0 | [`.agency/contracts/agency-secret-scan.json`](.agency/contracts/agency-secret-scan.json) | ✅ Created | 7 |
| `agency-hitl-webhook` | 1.0.0 | [`.agency/contracts/agency-hitl-webhook.json`](.agency/contracts/agency-hitl-webhook.json) | ✅ Created | 8 |
| `agency-model-routing` | 1.0.0 | [`.agency/contracts/agency-model-routing.json`](.agency/contracts/agency-model-routing.json) | ✅ Created | 8 |
| `agency-dispatcher` | 1.0.0 | [`.agency/contracts/agency-dispatcher.json`](.agency/contracts/agency-dispatcher.json) | ✅ Created | 9 |
| `agency-auto-docs` | 1.0.0 | [`.agency/contracts/agency-auto-docs.json`](.agency/contracts/agency-auto-docs.json) | ✅ Created | 9 |
| `agency-memory` | 1.0.0 | [`.agency/contracts/agency-memory.json`](.agency/contracts/agency-memory.json) | ✅ Created | 10 |

### Sprint 7 — Security + Observability (Weeks 1-2, Est. 6 days)
**Theme:** N5 (Secret Scanning) + N1 (Observability Dashboard)

| # | Task | Type | Agent | Est. | Status | Depends On | Contract |
|---|---|---|---|---|---|---|---|
| **7.1** | Create secret-scan.js | script | 🔧 JengaBooks Code | 1d | ✅ DONE — | agency-secret-scan@1.0.0 |
| **7.2** | Update .husky/pre-commit — append secret-scan | config | 🚀 DevOps | 0.25d | ✅ DONE | 7.1 | agency-secret-scan@1.0.0 |
| **7.3** | Add secretScan.whitelist to .agency/config.json | config | 🧠 Lead Architect | 0.25d | ✅ DONE | 7.1 | agency-secret-scan@1.0.0 |
| **7.4** | Create telemetry.js | script | 🔧 JengaBooks Code | 2d | ✅ DONE — | agency-telemetry@1.0.0 |
| **7.5** | Hook telemetry into handoff.js | integration | 🔧 JengaBooks Code | 0.5d | ✅ DONE | 7.4 | agency-telemetry@1.0.0 |
| **7.6** | Hook telemetry into cost-track.js | integration | 🔧 JengaBooks Code | 0.5d | ✅ DONE | 7.4 | agency-telemetry@1.0.0 |
| **7.7** | Hook telemetry into status.js | integration | 🔧 JengaBooks Code | 0.25d | ✅ DONE | 7.4 | agency-telemetry@1.0.0 |
| **7.8** | Hook telemetry into escalate-lead.js | integration | 🔧 JengaBooks Code | 0.25d | ✅ DONE | 7.4 | agency-telemetry@1.0.0 |
| **7.9** | Register telemetry + secret-scan in agency.js | config | 🔧 JengaBooks Code | 0.25d | ✅ DONE | 7.4, 7.1 | — |
| **7.10** | Create telemetry storage dir + gitkeep | config | 🧠 Lead Architect | 0.1d | ✅ DONE | 7.4 | — |
| **7.11** | Chaos Monkey: test secret scan blocks commit | qa | 🧪 QA Automator | 0.5d | ✅ DONE | 7.1-7.10 | — |

### Sprint 8 — HITL + Model Routing (Weeks 3-4, Est. 5.5 days)

| # | Task | Type | Agent | Est. | Status | Depends On | Contract |
|---|---|---|---|---|---|---|---|
| **8.1** | Create hitl-server.js — Express /webhook | script | 🔧 JengaBooks Code | 2d | ✅ DONE | — | agency-hitl-webhook@1.0.0 |
| **8.2** | Create notify-hitl.js — Telegram buttons | script | 🔧 JengaBooks Code | 0.5d | ✅ DONE | — | agency-hitl-webhook@1.0.0 |
| **8.3** | Modify escalate-lead.js to call notify-hitl | integration | 🔧 JengaBooks Code | 0.5d | ✅ DONE | 8.1, 8.2 | agency-hitl-webhook@1.0.0 |
| **8.4** | Add hitl config to .agency/config.json | config | 🧠 Lead Architect | 0.25d | ✅ DONE | 8.1 | agency-hitl-webhook@1.0.0 |
| **8.5** | Update .zoo/config.json — model_overrides | config | 🧠 Lead Architect | 0.25d | ✅ DONE | — | agency-model-routing@1.0.0 |
| **8.6** | Create sync-models.js — sync overrides to .roomodes | script | 🔧 JengaBooks Code | 1d | ✅ DONE | 8.5 | agency-model-routing@1.0.0 |
| **8.7** | Add --model pro flag to handoff.js | integration | 🔧 JengaBooks Code | 0.5d | ✅ DONE | 8.6 | agency-model-routing@1.0.0 |
| **8.8** | Register hitl + model in agency.js | config | 🔧 JengaBooks Code | 0.25d | ✅ DONE | 8.1, 8.6 | — |
| **8.9** | Chaos Monkey: gate failure → Telegram approve | qa | 🧪 QA Automator | 0.5d | ✅ DONE | 8.1-8.8 | — |

### Sprint 9 — Parallel Execution + Auto-Docs (Weeks 5-6, Est. 7 days)

| # | Task | Type | Agent | Est. | Status | Depends On | Contract |
|---|---|---|---|---|---|---|---|
| **9.1** | Create dispatcher.js | script | 🔧 JengaBooks Code | 3d | ✅ DONE — | agency-dispatcher@1.0.0 |
| **9.2** | Add Depends On to ORCHESTRATION.md | config | 🧠 Lead Architect | 0.5d | ✅ DONE — | agency-dispatcher@1.0.0 |
| **9.3** | Wire dispatcher to handoff.js | integration | 🔧 JengaBooks Code | 0.5d | ✅ DONE 9.1 | agency-dispatcher@1.0.0 |
| **9.4** | Wire dispatcher to telemetry.js | integration | 🔧 JengaBooks Code | 0.25d | ✅ DONE 9.1, 7.4 | agency-dispatcher@1.0.0 |
| **9.5** | Create auto-docs.js | script | 🔧 JengaBooks Code | 2d | ✅ DONE — | agency-auto-docs@1.0.0 |
| **9.6** | Wire auto-docs to release-manager | integration | 📦 Release Manager | 0.5d | ✅ DONE 9.5 | agency-auto-docs@1.0.0 |
| **9.7** | Register in agency.js | config | 🔧 JengaBooks Code | 0.25d | ✅ DONE 9.1, 9.5 | — |
| **9.8** | Chaos Monkey validation | qa | 🧪 QA Automator | 0.5d | ✅ DONE 9.1-9.7 | — |

### Sprint 10 — Semantic Memory (Weeks 7-8, Est. 5.5 days)

| # | Task | Type | Agent | Est. | Status | Depends On | Contract |
|---|---|---|---|---|---|---|---|
| **10.1** | Create .agency/memory/ + SQLite | config | 🧠 Lead Architect | 0.25d | ✅ DONE — | agency-memory@1.0.0 |
| **10.2** | Create memory.js | script | 🔧 JengaBooks Code | 3d | ✅ DONE 10.1 | agency-memory@1.0.0 |
| **10.3** | Integrate sqlite-vec for cosine similarity | deps | 🔧 JengaBooks Code | 0.5d | ✅ DONE | 10.2 | agency-memory@1.0.0 |
| **10.4** | Inject memory recall into lead-architect .roomodes | config | 🧠 Lead Architect | 0.5d | ✅ DONE | 10.2 | agency-memory@1.0.0 |
| **10.5** | Register memory commands in agency.js | config | 🔧 JengaBooks Code | 0.25d | ✅ DONE | 10.2 | — |
| **10.6** | Update FLOW-DOC.md with memory diagram | docs | 📝 Documentarian | 0.5d | ✅ DONE | 10.2 | — |
| **10.7** | Chaos Monkey: store → clear → recall | qa | 🧪 QA Automator | 0.5d | ✅ DONE | 10.1-10.6 | — |

---

### N-SPRINT Handoff Protocol

| Handoff | From | To | Artifacts |
|---|---|---|---|
| **H7** | 🧠 Lead Architect | 🔧 JengaBooks Code | Sprint 7 contracts + n-sprint-blueprint.md |
| **H8** | 🧠 Lead Architect | 🔧 JengaBooks Code | Sprint 8 contracts (hitl, model-routing) |
| **H9** | 🧠 Lead Architect | 🔧 JengaBooks Code | Sprint 9 contracts (dispatcher, auto-docs) |
| **H10** | 🧠 Lead Architect | 🔧 JengaBooks Code | Sprint 10 contract (memory) |
| **HV** | 🧪 QA Automator | 🧠 Lead Architect | Chaos Monkey validation reports |

### N-SPRINT Quality Gates

| Gate | Trigger | Pass Criteria |
|---|---|---|
| **G11: Secret Scan** | Pre-commit | Blocks API_KEY commit |
| **G12: Telemetry** | Script invocation | Events logged to telemetry.jsonl |
| **G13: HITL Response** | Gate failure >3 | Telegram inline buttons sent |
| **G14: Model Correctness** | Agent start | lead-architect uses deepseek-pro |
| **G15: Parallel Safety** | Dispatch | No CWD collisions |
| **G16: Docs Sync** | agency docs --sync | CHANGELOG.md auto-updates |
| **G17: Memory Recall** | agency memory recall | Top-3 results returned |
| **G18: Chaos Monkey** | Sprint end | All N features pass |

---

### ✅ N-SPRINT Architect Sign-Off Checklist

- [ ] N5 (Secret Scan): Pre-commit blocks test commit containing API_KEY literal
- [ ] N1 (Telemetry): telemetry.jsonl generated for every task and agent action
- [ ] N1 (Monitor): agency monitor displays real-time color-coded event stream
- [ ] N4 (HITL): Express server runs and responds to webhook approval callback
- [ ] N4 (HITL): escalate-lead.js triggers Telegram with inline buttons
- [ ] N6 (Model Routing): lead-architect uses deepseek-pro (verify via logs)
- [ ] N6 (Model Routing): code-agent uses deepseek-flash (cost savings)
- [ ] N3 (Dispatcher): ORCHESTRATION.md has Depends On column for all tasks
- [ ] N3 (Dispatcher): 2-3 tasks run in parallel without CWD collisions
- [ ] N7 (Auto-Docs): agency docs --sync updates AGENCY-RULES.md without manual edits
- [ ] N7 (Auto-Docs): agency docs --sync generates CHANGELOG.md entry from Git log
- [x] N2 (Memory): agency memory recall returns relevant results for stored decision
- [x] N2 (Memory): Memory recall auto-invokes at lead-architect task start
- [x] All 7 N features pass Chaos Monkey validation suite
