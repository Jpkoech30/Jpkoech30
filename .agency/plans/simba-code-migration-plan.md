# Simba Code Migration Plan

> **Problem:** Patching ZooCode's compiled/minified `extension.js` is fragile. Every patch breaks something new. We need a proper fork from source.

---

## Phase 1: Find ZooCode Source (Week 1)

ZooCode is a fork of Roo Code (open source: `github.com/RooVetGit/Roo-Code`). ZooCode's source may be:
- A private GitHub repo
- A fork of Roo Code with modifications
- Or we may need to diff ZooCode's compiled JS against Roo Code's source

**Action:**
1. Clone `github.com/RooVetGit/Roo-Code`
2. Compare its structure with ZooCode's VSIX
3. Identify which files ZooCode modified
4. This tells us what "ZooCode" actually changed

## Phase 2: Fork Roo Code (Week 2)

Instead of patching ZooCode's compiled JS, fork Roo Code directly:

```
Roo Code (open source, TypeScript source)
  → Fork → Our repo (github.com/Jpkoech30/simba-code-source)
  → Add our customizations:
      - PFG check before tool dispatch
      - PTG after attempt_completion
      - QG on demand
      - Memory + telemetry modules
      - Lion branding
      - Custom agents (31 hardcoded)
  → Build with esbuild → dist/extension.js
  → Package as VSIX
```

**Advantages:**
- Source code, not compiled — easy to modify
- Roo Code is MIT licensed — legally safe to fork
- Build pipeline already exists (esbuild)
- No fragile regex patching

**Disadvantages:**
- Need to re-implement ZooCode's specific modifications on top of Roo Code
- May lose some ZooCode-specific features

## Phase 3: Port Agency Features (Week 2-3)

| Feature | Source File | How to Port |
|---------|-------------|-------------|
| 31 agents | `src/agents.ts` | Copy as-is (already done) |
| PFG | `src/pfg.ts` | Hook into tool dispatch in agent loop |
| PTG | `src/ptg.ts` | Hook into attempt_completion handler |
| QG | `src/qg.ts` | Add as callable function |
| Memory | `src/memory.ts` | Add as extension module |
| Telemetry | `src/telemetry.ts` | Add as extension module |
| Lion UI | `assets/icon.svg`, `src/pfg-ui.ts` | Copy branding |
| Chat branding | `package.json` nls strings | Update display names |

## Phase 4: Test & Release (Week 3-4)

1. Build VSIX: `npm run package`
2. Install in VS Code: `code --install-extension simba-code.vsix`
3. Test PFG blocking
4. Test PTG after task
5. Fix any issues
6. Publish to VS Code Marketplace

## Architecture (Target)

```
simba-code-source/
├── src/
│   ├── extension.ts        ← Main (our code)
│   ├── agents.ts           ← 31 agents (already done)
│   ├── pfg.ts              ← PFG module (already done)
│   ├── pfg-ui.ts           ← PFG status bar (already done)
│   ├── ptg.ts              ← PTG module (already done)
│   ├── qg.ts               ← QG module (already done)
│   ├── memory.ts           ← Memory module (already done)
│   ├── telemetry.ts        ← Telemetry module (already done)
│   ├── chat-ui.ts          ← Chat webview (already done)
│   ├── agent-loop.ts       ← Agent loop (from Roo Code)
│   ├── tools.ts            ← Tool system (from Roo Code)
│   └── llm.ts              ← LLM client (from Roo Code)
├── package.json            ← Simba Code branded
├── assets/icon.svg         ← Lion icon
└── esbuild.config.js       ← Build config
```

The key difference: Instead of patching compiled JS, we fork the SOURCE and BUILD from source. This is how ZooCode itself was created (they forked Roo Code source, modified it, built their VSIX).
