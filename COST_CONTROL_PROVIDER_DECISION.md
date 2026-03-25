# COST CONTROL & PROVIDER DECISION RECORD

> Created: 2026-03-25
> Principle: Improve architecture without drifting into uncontrolled recurring spend.

---

## Production Default — Intentionally Unchanged

| Model | Role | Provider | Cost |
|---|---|---|---|
| `minimax/MiniMax-M2.7` | Primary text model | MiniMax | Working production path |
| `minimax/MiniMax-VL-01` | Image understanding | MiniMax | Working production path |

**Decision:** These remain the production default. Do not switch to Google, Claude, or any other paid provider as the system default without explicit approval.

---

## Optional Provider Decisions

### Qwen OAuth (Free Tier)
- **Status:** Available (plugin loaded), not wired as active provider
- **Decision:** Available for future use as a secondary free lane
- **Potential role:** Studio, Sentinel, or sub-agents for low-cost experimentation
- **Why not wired now:** No immediate need — MiniMax is working well
- **Future path:** If a specific task would benefit from Qwen, isolate it to that agent/task only, then wire explicitly

### Ollama Local Vision
- **Status:** Plugin loaded, local Ollama available
- **Decision:** Available as local fallback candidate — not wired as primary
- **Potential role:** Cheap fallback for Studio screenshot review if MiniMax VL-01 is unavailable
- **Why not primary:** Local vision quality on this machine is unknown; MiniMax VL-01 is proven working
- **Future path:** If API costs become a concern, evaluate local vision quality and wire as fallback

### Google Plugin
- **Status:** Available (plugin loaded), NOT enabled as provider
- **Decision:** NOT enabled
- **Reason:** No concrete need that isn't already met by MiniMax or free alternatives
- **Risk:** Grounded search and Gemini features can silently incur costs
- **Decision rule:** Would need a specific, high-value use case before enabling, isolated to one agent, with cost tracked
- **Not approved for:** General-purpose text, research, or image understanding as default

### Any Paid Provider Beyond Above
- **Status:** NOT enabled
- **Decision:** Requires explicit approval before wiring
- **Cost gate:** Must answer — what problem, what free option was considered, what local option, what's the cost driver, can it be isolated to one agent?

---

## Cost Guardrails

### Heartbeat
- Light and intentional. Nero heartbeat at 30m only.
- No agent has heartbeat unless there is a specific automation need.

### Cron
- Three cron jobs active, all with clear purpose.
- No noisy recurring jobs. Every job has a defined value.

### Workflows (Lobster)
- Workflows pause for approval before costly steps.
- Deterministic over agentic where possible.

### Loop Detection
- Enabled globally to prevent runaway model calls.
- Conservative: warn at 10 repeats, critical at 20, hard stop at 30.

### New Provider Gate
Before adding any new provider or model:
1. What specific problem does it solve?
2. What free option was considered first?
3. What local option was considered?
4. What is the likely cost driver?
5. Can it be isolated to one agent or workflow?
6. Is explicit approval given?

---

## Spending Review Cadence

Review spend and provider decisions monthly.
If a provider or feature is generating unexpected costs, disable it immediately and flag.

---

## What Stays Free

| Capability | Provider | Status |
|---|---|---|
| Text understanding | MiniMax M2.7 | Production |
| Image understanding | MiniMax VL-01 | Production |
| Web search | Brave (API key) | Already paid |
| Memory search | Ollama (local) | Local |
| Coding | Forge + ACP | Native |
| Design review | Studio + skills | Native |

---

## Optional Future Paid Upgrades (Not Enabled)

These are worth revisiting if usage grows:

1. **Qwen Coder model** — If Studio/Sentinel need a free secondary lane for coding tasks
2. **Google Gemini Flash** — Only if grounded search is specifically needed and usage is tracked
3. **Deepgram** — Only if voice/media understanding becomes a regular workflow
4. **Perplexity** — Only if research volume justifies the cost

All of the above require explicit approval and isolated testing before becoming defaults.

---

_This is the cost control record. Update when provider decisions change._
