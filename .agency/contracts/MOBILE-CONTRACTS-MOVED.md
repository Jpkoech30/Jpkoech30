# Mobile Contracts Moved

> **Date:** 2026-07-10  
> **Reason:** Multi-Project Isolation ([`agency-multi-project@1.0.0`](.agency/contracts/agency-multi-project.json))

All 24 `mobile-*.json` feature contracts have been moved to the JengaBooks project-scoped directory:

📁 **[`../projects/jengabooks/contracts/`](../projects/jengabooks/contracts/)**

### Global Contracts (still here)
- `agency-*.json` — Agency infrastructure contracts
- `cost-ledger.schema.json` — Global cost ledger schema
- `TEMPLATE.api.json` — Contract template

### Per-Project Contracts (moved)
| Project | Location | Count |
|---------|----------|-------|
| [`jengabooks`](../projects/jengabooks/contracts/) | `.agency/projects/jengabooks/contracts/` | 24 mobile contracts |

See [`agency-multi-project@1.0.0`](.agency/contracts/agency-multi-project.json) § `directoryStructure` for the canonical layout.
