# Cost Model

> All costs in Kenyan Shillings (KES) at 1 USD = 135 KES

## Per-Token Pricing

| Model | Input/1K tokens | Output/1K tokens | Typical Task Cost |
|-------|----------------|-----------------|-------------------|
| `deepseek-pro` | KES 0.2025 | KES 0.810 | ~KES 1.22 |
| `deepseek-flash` | KES 0.0675 | KES 0.270 | ~KES 0.41 |

## Agent Distribution

| Model | Agents | Typical Tasks/Month | Cost/Month |
|-------|--------|-------------------|------------|
| `deepseek-pro` | 7 | ~200 | ~KES 244 |
| `deepseek-flash` | 22 | ~500 | ~KES 205 |
| **Total** | **29** | **~700** | **~KES 449** |

## Savings from Self-Improvement Pipeline

| Previously (LLM-driven) | Now (Automated) | Savings |
|------------------------|-----------------|---------|
| Lead Architect audits patterns manually | `patterns.js` detects them | ~500 tokens/day |
| Lead Architect fixes config drift | `heal.js` auto-fixes | ~300 tokens/incident |
| Lead Architect tunes thresholds | `auto-tune.js` tunes | ~200 tokens/week |
| Lead Architect writes retros | `adapt-rules.js` drafts | ~500 tokens/sprint |
| Lead Architect checks health | `health.js` runs daily | ~400 tokens/day |
| **Gross savings** | | **~2,200 tokens/day** |
| **Review overhead** | Lead reviews suggestions (5 min/day) | **~70 tokens/day** |
| **Net savings** | | **~1,500 tokens/day** |
| | | **≈ KES 202.50/day** |
| | | **≈ KES 6,075/month** |

## Circuit Breaker Savings

When the circuit breaker (Issue #9) detects ≥5 failures in 24h for an agent, it demotes to `deepseek-flash`:

| Scenario | Before (pro) | After (flash) | Savings/cycle |
|----------|-------------|---------------|---------------|
| Each re-plan by lead-architect | KES 1.22 | KES 0.41 | KES 0.81 |
| 3 re-plans before fix | KES 3.66 | KES 1.23 | **KES 2.43** |
| 10 such incidents/month | KES 36.60 | KES 12.30 | **KES 24.30** |

## Triage Router Savings

Small tasks bypassing Lead Architect via triage (Issue #6):

| Task Type | Before (via lead-architect) | After (direct to squad) | Savings |
|-----------|---------------------------|------------------------|---------|
| Type-A UI fix | lead-architect (pro) → frontend-lead | frontend-lead directly | KES 0.81 |
| Typo/color change | lead-architect (pro) → code-agent | code-agent directly | KES 0.81 |
| Hotfix | lead-architect (pro) → specialist | code-agent directly | KES 0.81 |
| **Monthly (est. 50 bypasses)** | | | **KES 40.50** |

## Total Estimated Monthly Cost

| Category | KES |
|----------|-----|
| Regular task execution | ~449 |
| Self-improvement pipeline (automated) | ~0 (Node.js, no LLM) |
| Less: Circuit breaker savings | -24.30 |
| Less: Triage router savings | -40.50 |
| **Net estimated monthly** | **~KES 384** |
| **≈ USD** | **~$2.84** |

## Related

- [Agent architecture →](01-architecture.md)
- [Self-improvement loop →](06-self-improvement.md)
