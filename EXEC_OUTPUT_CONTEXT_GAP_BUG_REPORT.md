# EXEC_OUTPUT_CONTEXT_GAP_BUG_REPORT

**Date:** 2026-03-26  
**Focus:** exec output → transcript/context → final synthesis gap  
**Status:** Root cause identified

---

## Baseline State

✅ Runtime healthy before testing:
- Config validates cleanly
- Gateway running (pid 20207, state active)
- All 6 agents intact: main, forge, scout, mercury, studio, sentinel
- Model routing: MiniMax M2.7 sole provider, auth probe OK
- Security posture: unchanged (0 critical, 1 warn, 1 info)

---

## Repro Matrix

| Test | Agent | Pattern | Result |
|------|-------|---------|--------|
| A | main anonymous | `printf 'EXEC_OK'` → echo verbatim | ✅ Pass |
| B | main anonymous | `printf '42'` → "The number is 42" | ✅ Pass |
| C | main anonymous | 3-line output → 1-sentence summary | ✅ Pass |
| D | Sentinel | `printf 'SENTINEL_EXEC_TEST'` → "Sentinel received: X" | ❌ FAIL — empty output |
| E | Forge | `printf 'FORGE_EXEC_TEST'` → "Forge received: X" | ✅ Pass |
| F | Sentinel | `printf 'SEN2_OK'` → answer with SEN2_OK | pending |

---

## Transcript Evidence

### Working case (Forge, Test E)

Session JSONL (`forge/sessions/eea6367c.jsonl`), 8 lines:

```
LINE 4: [user] — task message
LINE 5: [assistant] type=thinking + type=toolCall
         toolCall block: name="exec", id="...", arguments={"command":"printf 'FORGE_EXEC_TEST'"}
LINE 6: [toolResult] type=text — "FORGE_EXEC_TEST"
LINE 7: [assistant] type=thinking + type=text
         TEXT: "<final>...Forge received: FORGE_EXEC_TEST..."
```

**Tool result WAS captured in session JSONL. Synthesis worked.**

### Broken case (Sentinel, Test D)

Session JSONL (`sentinel/sessions/14f71d6a.jsonl`), 6 lines:

```
LINE 4: [user] — task message
LINE 5: [assistant] type=thinking + type=text
         THINKING: "I need to run the command via the exec tool"
         TEXT: "\n<minimax:tool_call>\n<invoke name="exec">\n<parameter name="command">printf 'SENTINEL_EXEC_TEST'</parameter>\n</invoke>\n</minimax:tool_call>"
LINE 6+: NOTHING — session ends
```

**`type=toolCall` block is ABSENT. Tool call rendered as PLAIN TEXT. Exec never fired. No toolResult. Session terminated.**

### Key structural difference

| Element | Forge (working) | Sentinel (broken) |
|---------|-----------------|-------------------|
| Tool call format | `type=toolCall` structured block | Tool call as `type=text` string |
| Tool result in JSONL | ✅ YES (LINE 6) | ❌ NO |
| Second assistant turn | ✅ YES (LINE 7) | ❌ NO |
| Final answer | ✅ Delivered | ❌ Empty |

The thinking content in Sentinel confirms the model **intended** to use the exec tool ("I need to run the command via the exec tool") but then rendered the invocation as plain text instead of a proper `toolCall` block.

---

## Scope

**Sentinel-specific.** Not general to:
- main agent anonymous subagents ✅
- Forge subagents ✅
- exec tool itself ✅
- session JSONL writing ✅

**Triggered when:** MiniMax M2.7, acting as Sentinel identity (with Sentinel SOUL.md/identity workspace), renders a tool invocation as plain text instead of a `toolCall` structured block in minimal-task conditions.

---

## Best Hypothesis

**Primary:** Model-level tool call rendering failure. MiniMax M2.7 sometimes generates tool calls as `type=text` (plain text containing the XML-like syntax) instead of `type=toolCall` structured blocks when operating as Sentinel. This is not an OpenClaw bug — it's a model behavior quirk under specific identity/task conditions.

**Why Sentinel specifically:** The Sentinel identity (QA reviewer persona, Sentinel SOUL.md, `tools.profile: minimal`) may prime the model differently than Forge (coding persona) or anonymous main subagents. The model's tool-use behavior appears to vary by agent identity context.

**Mechanism:**
1. Model generates tool invocation as TEXT → no exec tool call registered → exec never runs
2. No tool result generated → nothing to append to transcript
3. Model has no exec output to synthesize from → generates empty or minimal response
4. Session ends → announce delivers empty result

**Why not an OpenClaw bug:** The transcript assembly, session pruning, and context routing all work correctly. The gap is upstream — the tool result was never generated because the model didn't issue a proper tool call.

---

## Micro-Fix Applied

**None.** No safe, narrow fix exists at the OpenClaw config level. The issue is model behavior, not configuration.

---

## Files Inspected

- `/home/likwid/.openclaw/agents/sentinel/sessions/14f71d6a-5d40-4f74-868b-f9f41dc6f09c.jsonl` — Sentinel Test D (broken)
- `/home/likwid/.openclaw/agents/forge/sessions/eea6367c-d922-4a1e-8306-34a19eb21054.jsonl` — Forge Test E (working)
- `/home/likwid/.openclaw/agents/main/sessions/b9ee07b9-2e24-40bf-af97-2de1cbb918a2.jsonl` — Test A (working)
- `/home/likwid/.openclaw/workspace/sentinel/SOUL.md` — Sentinel identity prompt
- `/home/likwid/openclaw/docs/tools/index.md` — Tool profile documentation

---

## Validation After Bug Hunt

✅ Gateway still running  
✅ All agents still registered  
✅ Model routing intact  
✅ Config still validates  

---

## Recommendation

**Short-term workaround:** When needing exec+synthesis from Sentinel, use a two-step approach: (1) spawn Sentinel for analysis/report tasks that don't require exec, (2) use Forge for exec+synthesis tasks. This is already the natural division of labor.

**Next debugging step — confirm with Test F:** Run the same minimal Sentinel test again to determine whether this is a consistent Sentinel-specific model behavior issue or a one-time glitch. If consistent, the fix belongs in the Sentinel SOUL.md or agent prompt to explicitly instruct the model to use structured `toolCall` blocks, not text, when invoking tools.

**If Test F passes:** The bug was a one-time model glitch, not a systemic issue. Document and close.

**If Test F fails:** Confirms Sentinel-specific model behavior issue. Consider adding explicit tool-use instruction to Sentinel's SOUL.md: e.g., "When you need to run a command, use the exec tool by generating a proper toolCall block in your response structure, not by outputting the tool syntax as plain text."

---

## Session Stats

| Test | Agent | Runtime | Tokens in | Tokens out | Cache |
|------|-------|---------|----------|-----------|-------|
| A | main | 9s | 268 | 125 | 12.6k |
| B | main | 7s | 0 | 0 | — |
| C | main | 11s | 0 | 0 | — |
| D | Sentinel | 4s | 0 | 59 | 6.3k |
| E | Forge | 8s | 272 | 131 | 8.7k |

Note: Sentinel's 4s runtime and 59 tokens (all output, no input) is consistent with the model generating a short response without a proper tool call being registered. Other agents show input tokens, indicating they received the tool result as input for the next turn.
