# ZooCode Architecture Research — Phase 0 Complete

**Date:** 2026-07-11 | **Extension:** Zoo Code v3.69.100241 | **Publisher:** ZooCodeOrganization

---

## Extension Structure

```
zoocodeorganization.zoo-code-3.69.100241/
├── dist/
│   ├── extension.js          ← Main extension (compiled, ~4 JS files total)
│   ├── workers/              ← Web workers (background processes)
│   ├── assets/               ← Static assets
│   ├── i18n/                 ← Internationalization
│   ├── bin/                  ← Platform-specific binaries
│   ├── tiktoken_bg.wasm      ← Token counter (same as OpenAI)
│   └── tree-sitter-*.wasm    ← Code parsing for 30+ languages
├── integrations/
│   └── theme/                ← UI theme assets
├── webview-ui/               ← Chat interface UI
└── package.json              ← Extension manifest
```

## Key Architecture Insights

### 1. Extension Entry Point
**`dist/extension.js`** — Single compiled file. All functionality (agent loop, tools, UI, MCP) is bundled into one file using esbuild. This is standard for VS Code extensions.

### 2. Agent Loop
The agent runtime is inside `extension.js`. It handles:
- Reading `.roomodes` → loading agent definitions
- Managing conversations (think → act → observe → repeat)
- Routing LLM API calls (OpenAI-compatible)
- File editing tools (read, write, apply_diff)
- Terminal commands

### 3. Token Counting
Uses `tiktoken_bg.wasm` — the same tokenizer as OpenAI. Supports all models.

### 4. Code Parsing
Uses **tree-sitter** wasm files for 30+ languages. This is how the extension understands code structure for context-aware editing.

### 5. Activation
- Triggers: `onLanguage`, `onStartupFinished`
- This means ZooCode starts when VS Code opens or when a language file is detected

### 6. Contribution Points
- `viewsContainers`, `views` — Custom sidebar panels (chat UI)
- `commands` — User-invokable commands
- `menus`, `keybindings`, `submenus` — UI integration points
- `configuration` — Settings

## How Forking Would Work

The extension is packaged as a **VSIX file** — essentially a zip with compiled code. To fork:

| Approach | Difficulty | What You Get |
|----------|------------|--------------|
| **Decompile** `extension.js` | 🔴 Hard | Minified, hard to modify, no source maps in VSIX |
| **Build from source** (if public) | 🟡 Medium | Clean source, easy to modify |
| **Build fresh** using ZooCode as reference | 🔴 Hardest | Full control but 3-6 months work |

## Recommendation: MCP Server (Not a Fork)

Instead of forking the entire VS Code extension (which is compiled/minified), build an **MCP server** that ZooCode connects to. ZooCode has MCP integration built in.

An MCP server can:
- Intercept every tool call → run PFG check before allowing it
- Intercept task completion → run PTG checks
- Provide memory tools (store/recall) as native MCP resources
- Be built in Node.js in a few days, not weeks
- Work with ANY ZooCode version (no fork maintenance)

**MCP is the extension point ZooCode provides for exactly this use case.**
