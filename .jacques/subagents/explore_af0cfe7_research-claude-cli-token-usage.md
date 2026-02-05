# Explore: Research Claude CLI token usage

> Session: `b9614f50-82aa-4001-b746-efcc74941c60`
> Date: 2026-02-01
> Tokens: ~59 358

---

Perfect! Now let me compile the comprehensive research report. I have all the information I need about token usage tracking in Claude Code and the handoff system.

## Research Report: Claude Code CLI Token Usage and Handoff Operations

### 1. What Information is Currently Captured About Token Breakdown

**Token Metrics Logged** (stored in `~/.jacques/logs/claude-operations.jsonl`):

The system captures detailed token information through the `ClaudeOperation` interface:

| Field | Purpose | Notes |
|-------|---------|-------|
| `inputTokens` | Total input tokens used | Includes cache_read_input_tokens |
| `outputTokens` | Total output tokens generated | From message_delta events |
| `totalTokens` | Sum of input + output | Calculated |
| `cacheReadTokens` | Tokens from prompt cache hits | Optional, indicates reuse |
| `userPromptChars` | Character count of user prompt | For estimation accuracy |
| `systemPromptChars` | Character count of system prompt | For estimation accuracy |
| `userPromptTokensEst` | Estimated tokens (~4 chars/token) | Baseline estimate |
| `systemPromptTokensEst` | Estimated tokens (~4 chars/token) | Baseline estimate |
| `outputLength` | Characters in generated response | Content size metric |
| `userPromptPreview` | First 200 chars of user prompt | For inspection |
| `systemPromptPreview` | First 200 chars of system prompt | For inspection |
| `phase` | "start" or "complete" | Tracks operation lifecycle |
| `durationMs` | Execution time in milliseconds | Performance metric |
| `success` | Boolean success indicator | Tracks failures |
| `errorMessage` | Error details if failed | Debugging information |

**Token Overhead Analysis** (calculated but not persisted):
```typescript
// From llm-generator.ts line 559-560
const promptTokensEst = userPromptTokensEst + systemPromptTokensEst;
const overheadTokens = result.inputTokens - promptTokensEst;
```

This calculates the difference between actual input tokens and estimated prompt tokens, revealing:
- System overhead (Claude Code CLI scaffolding)
- Tool definitions and instructions
- Context setup and formatting

**Stream Event Breakdown** (captured in debug data):
The system records all streaming events from Claude Code CLI with token updates at three stages:
1. `message_start` - Initial input token count
2. `message_delta` - Output token updates
3. `result` - Final token counts (fallback)

Each event contains:
- Cache-related tokens (`cache_read_input_tokens`)
- Regular input tokens
- Output tokens

---

### 2. Handoff Prompt Content and What Triggers Excessive Searches

**Handoff Skill Prompt** (`~/.claude/skills/jacques-handoff/SKILL.md`):

**Size**: ~3,700 characters (~925 tokens estimated)

**Content Structure**:
- Instructions for generating ~1000 token handoff documents
- Extraction priority guidelines
- 8 Required sections with detailed formatting examples
- Quality requirements specifying format, detail, and specificity
- Mentions of: CLAUDE.md, plans, user decisions, architecture, absolute file paths, function names

**User Prompt (Pre-Extracted Context)** - ~3,600 characters (~900 tokens estimated):

The user prompt sent to Claude for LLM handoff generation is **pre-extracted** to avoid sending the full transcript (~60k tokens):

**What's Included**:
- Project directory path
- Session title
- Technologies detected (e.g., "typescript")
- Files modified (absolute paths, up to 15 shown)
- Tools used (e.g., "AskUserQuestion, Bash, Edit, Glob, Read, Write")
- Total message and tool call counts
- Plan context (if plans exist in `.jacques/plans/`)
- Last 10 user messages (chronologically)
- Assistant highlights (key responses, no thinking/tools)
- Detected user decisions (pattern-matched, e.g., "yes do that")
- Detected blockers/errors (pattern-matched)
- Instructions to follow skill format

**What Triggers High Token Counts**:

1. **Long Conversations**: More recent messages captured = larger context
   - The last 10 user messages are included (instead of 5 in basic handoffs)
   - Each message can be up to 300 characters untruncated
   - Multiplier: 10 messages × ~300 chars = ~750 chars base

2. **Many File Modifications**: Listed up to 15 files (with "... and N more" notation)
   - Example: 15 files × ~80 chars per path = ~1,200 chars

3. **Tool-Heavy Sessions**: All tools used are listed
   - Example: "AskUserQuestion, Bash, Edit, ExitPlanMode, Glob, Read, Task, Write, Skill" = large string

4. **Plans**: Each referenced plan adds content
   - Plan title + path notation

5. **Detected Patterns**: Decision and blocker detection can be verbose
   - Pattern matches extracted as full text (up to 150 chars each)
   - Multiple matches accumulate

**Actual Example from Logs**:
```json
{
  "userPromptChars": 3604,
  "systemPromptChars": 3688,
  "userPromptTokensEst": 901,
  "systemPromptTokensEst": 922,
  "inputTokens": 84235,
  "outputTokens": 1659,
  "totalTokens": 85894
}
```

**Token Breakdown**:
- Estimated prompts: ~1,823 tokens
- **Actual input: 84,235 tokens**
- **Overhead: 82,412 tokens (4,520% of prompt size!)**

This massive overhead comes from:
- Claude Code CLI initialization (hooks, tools, system setup)
- Skill overhead (~20-34k tokens detected in Cursor sessions)
- Tool definitions transmitted for all available tools
- Session metadata and environment state
- Model-specific instruction overhead

---

### 3. Gaps in Visibility (What's NOT Being Logged)

**Missing Information**:

| Gap | Impact | Why It Matters |
|-----|--------|-------------------|
| **No per-tool token costs** | Can't identify expensive tool definitions | If "Write" tool costs 5k tokens, we don't know |
| **No cache hit rates** | Can't measure cache effectiveness | Cache should reduce tokens, but we only see total |
| **No system prompt breakdown** | Don't know skill overhead vs tool overhead | Is it 20k for skills, 15k for tools, 47k for setup? |
| **No stream event sequence timing** | Can't identify when tokens were consumed | Are tokens frontend-loaded or spread throughout? |
| **No tool invocation analysis** | Don't track which tools consumed tokens | Did the handoff need 0 tools? Only Write? |
| **No model switching detection** | Can't see if Claude switches models internally | Handoff uses Opus but might spawn Haiku subagents? |
| **No prompt optimization feedback** | No signals about compress/summarize impact | Compacting context doesn't show token savings |
| **No cache warmup metrics** | Don't measure first-run vs cached runs | Is cache being reused across handoff operations? |
| **No streaming efficiency metrics** | Don't know if stream-json format is efficient | Same tokens as JSON format or less? |
| **No token allocation by section** | Don't know which skill section consumes most | Header vs Progress vs Decisions - which is biggest? |

**Architectural Gaps**:

1. **No Integration with statusLine Token Data**
   - statusLine from Claude Code provides real-time context percentages
   - Not correlated with handoff operation token counts
   - Could show: "handoff used 4% of context window"

2. **No Skill Subagent Token Tracking**
   - CLAUDE.md mentions 8 parallel extractors (jacques-project-context, jacques-task-focus, etc.)
   - These run in subagents but their token usage isn't captured
   - Only orchestrator final numbers are logged

3. **No Comparison Baseline**
   - Rule-based handoff generator (generator.ts) doesn't track tokens
   - Can't compare: "LLM approach: 85k tokens vs rule-based: 0 tokens"
   - No visibility into token ROI

4. **No Debug Event Filtering**
   - All CLI events saved to debug JSON (system hooks, init, tool definitions)
   - No way to extract just the token-relevant events
   - ~77MB+ debug files for token analysis would be noisy

5. **No Real-Time Token Rate**
   - Operations logged as single entry (start → complete)
   - Can't see: "tokens generated per second" or "how many tokens before first delta"
   - Streaming events exist but aren't timestamped relative to operation start

---

### Summary: Key Findings

**What's Being Captured Well**:
- Total token usage (input, output, cache reads)
- Prompt size estimates and previews
- Operation lifecycle (start/complete)
- Success/failure tracking
- Complete debug events (for detailed inspection)

**What's Missing**:
- **Token breakdown by component** (tools, skills, system overhead)
- **Cache effectiveness metrics** (hit rate, token savings)
- **Streaming timeline** (when tokens consumed, rate analysis)
- **Skill subagent costs** (8 parallel extractors' individual costs)
- **Optimization feedback** (what compacting/summarizing saves)
- **Token allocation by output section** (which section costs most)

**The ~82k Token Overhead Mystery**:
The handoff operation shows 4.5x overhead (estimated 1.8k prompts → actual 84k input). This is normal for Claude Code CLI but completely opaque:
- Could be 34k skill overhead + 20k tools + 28k system setup
- Could be different - we have no visibility
- No way to optimize without understanding breakdown

**Recommended Next Steps for Visibility**:
1. Parse streaming events with timestamps to show token consumption rate
2. Extract and track individual event types: `content_block_delta` vs `message_delta` vs `message_start`
3. Correlate with tool definitions transmitted (get count from init event)
4. Add optional "detailed breakdown" logging showing per-tool costs
5. Track cache effectiveness with separate metrics for cache_read vs new tokens