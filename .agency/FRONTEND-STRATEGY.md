
# Frontend Strategy — Single Source of Truth

> **Version:** 1.0
> **Last Updated:** 2026-07-10
> **Supersedes:** All previous frontend-specific fragments
>
> Companion to: [AGENCY-RULES.md (v3.0)](AGENCY-RULES.md)

---

## HOW TO READ THIS DOCUMENT

This is the definitive guide for all frontend agents (Web + Mobile). It assumes you have already read the core `AGENCY-RULES.md` (8 Principals, Handoff, Quality Gates).
This document expands those rules into specific frontend implementation protocols.

| Agent Type | Action |
|------------|--------|
| **Frontend / UI / Mobile Agents** | Read this entire document |
| **Backend Agents** | Skip this (unless debugging frontend integration) |

---

## 1. RECOMMENDED STACK (2026 — Production Ready)

Your frontend stack is fixed. Do not introduce new frameworks without Lead Architect approval.

### 1.1 Web Stack

| Layer | Technology | Version (Min) | Purpose |
|-------|------------|---------------|---------|
| Framework | React | 18.x | Functional components + hooks |
| Bundler | Vite | 5.x | Fast HMR, optimized builds |
| Styling | TailwindCSS | 3.4+ | Utility-first, design tokens |
| State (Client) | Zustand | 4.5+ | Global UI state (theme, sidebar) |
| State (Server) | TanStack React Query | 5.x | Server-state cache, refetch, mutations |
| Routing | React Router | 6.x | SPA routing with loaders |
| Real-time | Socket.io-client | 4.x | Live updates |
| Forms | React Hook Form + Zod | 7.x / 3.22+ | Performant forms with schema validation |
| Testing | Vitest + React Testing Library | 1.x / 14.x | Component + hook tests |

### 1.2 Mobile Stack

| Layer | Technology | Version (Min) | Purpose |
|-------|------------|---------------|---------|
| Framework | Expo | 51.x | React Native + OTA updates |
| Styling | NativeWind | 4.x | Tailwind for React Native |
| Offline DB | WatermelonDB | 0.27+ | Local-first data with sync |
| State (Client) | Zustand | 4.5+ | Global UI state |
| Navigation | Expo Router | 3.x | File-based routing |
| Real-time | Socket.io-client | 4.x | Live sync events |
| Biometric | Expo Local Authentication | 14.x | Fingerprint / Face ID |
| Sharing | expo-sharing / react-native-share | — | WhatsApp, email, system share |

### 1.3 Shared (Web + Mobile)

| Layer | Technology | Purpose |
|-------|------------|---------|
| Types | `packages/shared/src/` | Enums, Zod schemas, permissions, theme tokens |
| API Contracts | `.agency/contracts/` | Source of truth for all request/response shapes |
| i18n | Plain English + Swahili | Kenyan-first localization |

**Violation:** Introducing Next.js, Gatsby, Remix, or any alternative meta-framework without explicit approval is a **CRITICAL VIOLATION** and will **BLOCK** the PR.

---

## 2. COMPONENT ARCHITECTURE

### 2.1. The Component Hierarchy

Every UI must follow this hierarchy:

```
Page (route-level)
  └── Feature components (composed from UI components)
        └── UI components (reusable, no business logic)
              └── Base components (button, input, card)
```

| Layer | Location | Responsibility | Knows About API? |
|-------|----------|---------------|------------------|
| **Page** | `apps/web/src/pages/` or `apps/mobile/src/app/` | Route definition, page-level state, layout | No — delegates to hooks/stores |
| **Feature** | `apps/web/src/components/<feature>/` or `apps/mobile/src/components/<feature>/` | Feature-specific composition | No — delegates to hooks |
| **UI** | `.../components/ui/` | Reusable, business-logic-free components | Never |
| **Base** | Existing design system | Button, Input, Card, Badge, Modal, etc. | Never |

**Rule:** A UI component in `components/ui/` must NEVER import from `stores/`, `hooks/`, or call `api.xxx()`. If it needs data, accept it as props.

### 2.2. The 200-Line Rule

- Keep components **< 200 lines**. If a component exceeds this, split it.
- Extract: Header, Footer, ItemList, EmptyState, LoadingSkeleton, ErrorBanner
- A file should do ONE thing and do it well.

### 2.3. Named Exports for Shared, Default for Pages

```typescript
// ✅ Correct
export { Button, Input, Card } from './ui/button'; // named exports for shared
export default function DashboardPage() { ... }    // default for pages
```

---

## 3. STATE MANAGEMENT PROTOCOL

### 3.1. The State Decision Tree

```
Is this data from the server?
  ├── YES → Use React Query (useQuery, useMutation, useInfiniteQuery)
  └── NO → Is it used by multiple unrelated components?
              ├── YES → Zustand store
              └── NO → useState or useReducer
```

| Tool | When to Use | Example |
|------|-------------|---------|
| `useState` | Local UI state, single component | `const [isOpen, setIsOpen] = useState(false)` |
| `useReducer` | Complex local state, multi-step forms | `const [state, dispatch] = useReducer(formReducer, initialState)` |
| `useContext` | Theme, language, auth (low-frequency) | `const { theme } = useTheme()` |
| **Zustand** | Global UI state, cross-component toggles | Sidebar open, view mode, notification prefs |
| **React Query** | ALL server data, cache, mutations | Ledger entries, invoices, transactions |
| **WatermelonDB** | Mobile offline-first data | M-Pesa transactions, invoices (mobile only) |

### 3.2. Never Store Derived Data in State

```typescript
// 🚫 FORBIDDEN
const [total, setTotal] = useState(0);
useEffect(() => { setTotal(items.reduce(...)); }, [items]);

// ✅ CORRECT
const total = useMemo(() => items.reduce(...), [items]);
```

### 3.3. React Query Cache Configuration

```typescript
// Default config for all queries
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30s before refetch
      gcTime: 5 * 60_000,       // 5min in cache after unmount
      retry: 2,                 // Retry twice on failure
      refetchOnWindowFocus: true,
    },
  },
});
```

---

## 4. THE STATE COMPLETENESS MANDATE (No Empty Screens)

**No UI component is considered DONE** unless it explicitly handles ALL of these visual states:

| State | Required Treatment | Code Pattern |
|-------|-------------------|--------------|
| **Loading** | Skeleton screen, shimmer, or branded spinner | `if (isLoading) return <Skeleton width={200} />` |
| **Empty** | Friendly illustration + "No data yet" + CTA | `if (isEmpty) return <EmptyState message="..." action={...} />` |
| **Error** | Human-readable message + Retry button | `if (isError) return <ErrorBanner error={error} onRetry={refetch} />` |
| **Success** | Render the actual data | `return <DataView data={data} />` |

### 🚫 Forbidden Pattern (BLOCKED)

```typescript
// BLOCKED — no loading, no error, no empty handling
return (
  <div>
    {data.map(item => <div>{item.name}</div>)}
  </div>
);
```

---

## 5. MICRO-INTERACTIONS & POLISH

### 5.1. Button States

Every interactive element must provide:

| State | Web | Mobile |
|-------|-----|--------|
| Default | Normal appearance | Normal appearance |
| Hover | `hover:bg-*`, cursor pointer | — (no hover on mobile) |
| Active/Pressed | `active:scale-95` or `active:bg-*` | `Pressable` with `pressOpacity={0.7}` |
| Disabled | `opacity-50 cursor-not-allowed` | `opacity-50` |
| Focus | `focus:ring-2 focus:ring-primary` | — (handled by platform) |
| Loading | Spinner inside button + disabled | Spinner + disabled |

### 5.2. Input Validation Feedback

Every form input must show inline validation while typing:

```typescript
// ✅ Correct
<input
  className={errors.email ? 'border-red-500' : 'border-gray-300'}
  onChange={(e) => {
    setValue('email', e.target.value);
    trigger('email'); // real-time validation
  }}
/>
{errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
```

### 5.3. Navigation Transitions

- Page transitions must use smooth animations (fade or slide), not abrupt jumps
- Mobile: use `react-native-reanimated` or Expo Router's built-in animation
- Web: use CSS transitions or `framer-motion` (if already in deps)

---

## 6. ACCESSIBILITY BASELINE (WCAG 2.1 AA)

### 6.1. Mandatory Checks

Every UI component must pass these:

| Check | Rule | Code |
|-------|------|------|
| **Images** | Every `<img>` must have `alt` text | `<img alt="User avatar" src={...} />` |
| **Labels** | Every form input must have associated `<label>` | `<label htmlFor="email">Email</label><input id="email" />` |
| **Buttons** | Buttons must have visible text or `aria-label` | `<button aria-label="Close"><XIcon /></button>` |
| **Interactive divs** | Must have `role` + keyboard support. Use real `<button>` instead. | 🚫 `<div onClick={...}>` → ✅ `<button onClick={...}>` |
| **Colour contrast** | 4.5:1 minimum for normal text, 3:1 for large text | Rely on theme tokens (pre-validated) |
| **Touch targets** | 44x44dp minimum on mobile, 48x48px on web | `min-h-[44px] min-w-[44px]` |
| **Focus indicators** | All interactive elements must have visible focus ring | `focus:ring-2 focus:ring-offset-2` |

### 6.2. Screen Reader Support

```typescript
// ✅ Provide screen reader only text when needed
<span className="sr-only">Total amount: {formatCurrency(total)}</span>

// 🚫 Don't rely on visual-only indicators
// Bad: <span className="text-red-500">*</span>
// Good: <span className="text-red-500" aria-label="Required">*</span>
```

---

## 7. PERFORMANCE PROTOCOL

### 7.1. The Big Three Rules

```typescript
// 1. Wrap function props with useCallback
const handleClick = useCallback(() => { ... }, [deps]);

// 2. Wrap derived values with useMemo
const total = useMemo(() => items.reduce(...), [items]);

// 3. Use React.memo SPARINGLY — only for components that re-render often
const InvoiceRow = React.memo(({ item }: { item: Invoice }) => { ... });
```

### 7.2. Code Splitting

```typescript
// ✅ Route-level code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Invoices = lazy(() => import('./pages/Invoices'));

// Wrap in Suspense
<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

### 7.3. Bundle Size Discipline

| Asset | Max Size | Tool |
|-------|----------|------|
| Initial JS bundle | `< 200 KB` (gzipped) | Vite bundle analyzer |
| Images | `< 100 KB` each | Use WebP, lazy load below-fold |
| Fonts | Self-host, subset | `font-display: swap` |
| Icons | Tree-shakeable (lucide-react) | Import by name, not barrel |

---

## 8. THE VISUAL DIFF PLAN

**Before writing any frontend code**, the agent MUST output a Visual Diff Plan covering these 5 points:

| # | Question | Example Answer |
|---|----------|---------------|
| 1 | **Layout shift** — How does spacing/alignment change? | "Adds 16px padding-top, moves button from left to right" |
| 2 | **State changes** — What do Loading, Empty, Error look like? | "Loading: 3-row skeleton. Empty: 'No invoices' with Create button. Error: red banner with Retry." |
| 3 | **Responsiveness** — How does it change at 320px, 768px, 1440px? | "Mobile: single column. Tablet: 2 columns. Desktop: 3 columns." |
| 4 | **Animation** — What moves, fades, or transitions? | "Modal slides up from bottom on mobile, fades in on desktop." |
| 5 | **Asset check** — Correct resolution and existing import patterns? | "Icons from lucide-react (already installed). Images at @2x." |

**If the agent cannot answer all 5, they are NOT allowed to code.** They must ask the user for clarification.

---

## 9. TAILWIND CSS STRICT PROTOCOL (Zero Arbitrary Values)

### 9.1. Config First

```typescript
// 🚫 FORBIDDEN
w-[137px] h-[42px] text-[#123456] mt-[13px]

// ✅ MANDATORY — use design tokens
w-32 h-10 text-blue-500 mt-4

// Exception: dynamic calculations only
h-[calc(100vh-4rem)]   // ✅ with approval
```

### 9.2. Mobile First Responsive Order

```typescript
// ✅ Correct: base → sm → md → lg → xl → 2xl
text-sm md:text-base lg:text-lg

// 🚫 Wrong: starts big, gets smaller
text-lg lg:text-base
```

### 9.3. Class Ordering Standard

Write classes in this exact sequence:

**Layout → Position/Spacing → Sizing → Typography → Visuals → Interactivity → Transitions**

```typescript
// ✅ Correct
flex items-center justify-between p-4 w-full bg-white border rounded-lg hover:shadow-md

// 🚫 Incorrect (random order — BLOCKED)
hover:shadow-md border p-4 flex w-full bg-white rounded-lg
```

### 9.4. Dark Mode

If `darkMode: 'class'` exists in config, provide `dark:` equivalents for EVERY visual class:

```typescript
// ✅ Correct
bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100

// 🚫 BLOCKED — dark mode users go blind
bg-white text-gray-900
```

### 9.5. Content/Purge Paths

If a component is created in a **new directory**, verify that directory is in `tailwind.config.js` → `content` array. If missing, add it. **This is a blocking check.**

### 9.6. The `@apply` Trap

- **Forbidden** in React component files
- **Allowed ONLY** in `globals.css` for heavily reused component variants (max 5 `@apply` directives)

---

## 10. REPOSITORY / ADAPTER PATTERN (Backend Alignment)

### 10.1. Contract-First

Before writing any data-fetching code:
1. Locate the API contract in `.agency/contracts/`
2. Create strict TypeScript interfaces matching the contract EXACTLY
3. Never guess field names or shapes

### 10.2. The Golden Rule

The UI MUST **never** import the API client directly.

```typescript
// 🚫 FORBIDDEN
import { api } from '@/lib/api-client';
const { data } = useQuery(['user'], () => api.get('/users/me'));

// ✅ CORRECT — Repository/Adapter pattern
interface IUserRepository {
  getProfile(): Promise<IUserProfile>;
}

class HttpUserRepository implements IUserRepository {
  async getProfile() {
    const { data } = await api.get('/users/me');
    return data;
  }
}

// In component:
const { data } = useQuery(['user'], () => userRepo.getProfile());
```

### 10.3. Mock Implementation (When Backend Is Behind)

```typescript
class MockUserRepository implements IUserRepository {
  readonly __version = '1.0.0'; // must match contract version

  async getProfile(): Promise<IUserProfile> {
    await sleep(500); // simulate network delay
    return { id: '1', fullName: 'Jane Doe', avatarUrl: null };
  }
}
```

### 10.4. Mock-to-Live Handoff

- Frontend commits with: `BACKEND-DEPENDENCY: GET /users/me not yet live`
- Backend implements, commits with: `HANDOFF:frontend-lead` and `NOTE: User API is live`
- Frontend swaps DI binding from Mock to Http — zero UI changes

---

## 11. TESTING PROTOCOL (FRONTEND)

### 11.1. What to Test

| Type | Tool | Coverage | What to Assert |
|------|------|----------|---------------|
| **UI Components** | React Testing Library | 60% | Renders states (loading, empty, error, success). User interactions (click, type). |
| **Hooks** | renderHook from RTL | 90% | Initial state, state transitions, cleanup. Edge cases (null, undefined). |
| **Repository/Adapters** | Vitest | 95% | API contract mapping. Error handling. Response parsing. |
| **Utility Functions** | Vitest | 100% | Pure functions — every branch tested. |

### 11.2. Testing Patterns

```typescript
// ✅ Test by user behavior, not implementation
it('shows loading skeleton then invoice list', async () => {
  render(<InvoiceList />);

  // Loading state
  expect(screen.getByTestId('skeleton')).toBeInTheDocument();

  // Wait for data
  const invoice = await screen.findByText('INV-001');
  expect(invoice).toBeInTheDocument();
});

// 🚫 Forbidden: testing implementation details
it('calls api.get', async () => {
  render(<InvoiceList />);
  expect(api.get).toHaveBeenCalledWith('/invoices'); // BAD
});
```

### 11.3. The User Event Rule

Use `@testing-library/user-event` instead of `fireEvent`:

```typescript
// ✅ Correct
import userEvent from '@testing-library/user-event';
await userEvent.click(screen.getByRole('button', { name: /submit/i }));

// 🚫 Forbidden
fireEvent.click(screen.getByText('Submit')); // doesn't simulate real behavior
```

### 11.4. Error Boundary Testing

Every data-fetching component must be wrapped in an ErrorBoundary:

```typescript
it('shows error fallback when API fails', async () => {
  // Mock repository to throw
  mockRepo.getProfile.mockRejectedValue(new Error('Network error'));

  render(
    <ErrorBoundary fallback={<ErrorFallback />}>
      <UserProfile />
    </ErrorBoundary>
  );

  expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
});
```

---

## 12. ERROR HANDLING

### 12.1. The ErrorBoundary Rule

Every page-level component and every data-fetching component MUST be wrapped in an `ErrorBoundary`:

```typescript
// ✅ Correct
<ErrorBoundary FallbackComponent={PageErrorFallback}>
  <InvoiceList />
</ErrorBoundary>
```

### 12.2. User-Friendly Errors

- Never throw plain strings: 🚫 `throw 'error'` → ✅ `throw new Error('descriptive message')`
- Network errors: Show a toast or banner with a human-readable message
- Never use `alert()` in production code
- Always provide a "Retry" action

---

## 13. MOBILE-SPECIFIC RULES

| Rule | Why | Implementation |
|------|-----|---------------|
| **48px touch targets** | Thumbs are wider than mouse cursors | `min-h-[48px] min-w-[48px]` on all interactive elements |
| **fontSize: 16 on inputs** | iOS zooms into inputs with font-size < 16px | `style={{ fontSize: 16 }}` on every `<TextInput>` |
| **KeyboardAvoidingView** | Keyboards cover inputs on mobile | Wrap forms in `<KeyboardAvoidingView behavior="padding">` |
| **Offline-first** | Kenyan internet is unreliable | WatermelonDB for all critical data; optimistic updates |
| **Expo Router file-based** | Standard navigation pattern | Use `app/` directory, not manual `NavigationContainer` |
| **NativeWind over StyleSheet** | Consistent with design tokens | Never mix NativeWind and inline StyleSheet in same file |

---

## 14. ENFORCEMENT (COMPLIANCE GUARDIAN FRONTEND CHECKLIST)

For every Frontend PR, the `compliance-guardian` MUST verify:

| # | Check | If Missing |
|---|-------|------------|
| 1 | Every component handles Loading, Empty, Error, Success states | ❌ BLOCKED |
| 2 | No UI component imports from `stores/`, `hooks/`, or `api/` directly | ❌ BLOCKED |
| 3 | Tailwind uses config values only — no arbitrary `w-[...]` or `text-[...]` | ❌ BLOCKED |
| 4 | Dark mode equivalents exist for every visual class | ❌ BLOCKED |
| 5 | All interactive elements have hover, focus, active (or press) states | ❌ BLOCKED |
| 6 | Every `<img>` has `alt`, every input has `<label>`, every button has text | ❌ BLOCKED |
| 7 | Touch targets are ≥ 44px (mobile) or ≥ 48px (web) | ❌ BLOCKED |
| 8 | Mobile inputs have `fontSize: 16` | ❌ BLOCKED |
| 9 | No `any` types in production code | ❌ BLOCKED |
| 10 | Tests exist and test behavior (not implementation) | ❌ BLOCKED |

If any of these checks fail, the PR is **BLOCKED** and sent back to the agent for remediation.

---

## END OF FRONTEND STRATEGY v1.0
