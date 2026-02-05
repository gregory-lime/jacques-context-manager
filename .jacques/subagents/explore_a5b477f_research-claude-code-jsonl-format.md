# Explore: Research Claude Code JSONL format

> Session: `52bab7d8-66ac-4c26-8cb2-1cf48822de27`
> Date: 2026-02-02
> Tokens: ~56 591

---

Excellent! Now I have comprehensive information. Let me compile my findings into a clear research report.

## Research Findings: Claude Code JSONL Transcript Format and Output Token Recording

Based on my thorough research of official documentation, GitHub repositories, community tools, and issue tracking, here are the key findings regarding Claude Code's JSONL transcript format and output token recording:

### 1. **JSONL Format Structure - Official Findings**

Claude Code stores conversation transcripts as JSONL files in `~/.claude/projects/` where each line contains a JSON object representing an event (user messages, assistant responses, tool calls, progress updates, etc.).

**Token Usage Field Structure**:
According to the parser implementation in Jacques and the status line documentation from [Code Claude Docs](https://code.claude.com/docs/en/statusline), `output_tokens` appear in assistant message entries under:
```json
{
  "type": "assistant",
  "message": {
    "usage": {
      "input_tokens": number,
      "output_tokens": number,
      "cache_creation_input_tokens": number,
      "cache_read_input_tokens": number
    }
  }
}
```

### 2. **The `output_tokens: 1` Phenomenon - Root Cause Identified**

This is **NOT** a simple placeholder or streaming delta issue. Research reveals multiple distinct causes:

#### A) **Streaming Initial Value**
From the [Streaming Messages - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/streaming), when Claude Code streams responses, the `message_start` event contains an initial value of `output_tokens: 1` as a placeholder. However, this should be updated when the final usage metrics are recorded.

#### B) **Sidechain Agent Bug (GitHub Issue #13326)**
There's a documented bug where Claude Code spawns background "sidechain" agents that:
- Consume significant input tokens (~3,700-3,800 per agent)
- Produce virtually NO output (`output_tokens: 1`)
- Have `stop_reason: null` (never completed properly)
- Never feed results back to the main conversation
- Create separate agent JSONL files in subagents directory

From the Jacques codebase CLAUDE.md (Phase 2), you already filter these: "Filtering: Jacques filters out internal agents from counts and display"

#### C) **Background Agents (Prompt Suggestion, Auto-Compact)**
The codebase documents that Claude Code creates internal agents:
- `acompact-{6chars}`: Auto-compaction agent
- `aprompt_suggestion-{6chars}`: Background suggestion agent
- These exist only as separate JSONL files with NO entries in the main conversation

These internal agents may show `output_tokens: 1` or low values because they're not meant for user-visible output.

### 3. **Missing Final Usage Data - Known Issue #11535 & #16087**

From [GitHub Issue #11535](https://github.com/anthropics/claude-code/issues/11535) and [GitHub Issue #16087](https://github.com/anthropics/claude-code/issues/16087):

**The Problem**: 
- Granular token usage is NOT properly exposed through statusline JSON
- The `context_window.current_usage` field documented in statusline schema is sometimes missing or broken
- JSONL per-message tokens don't reliably give cumulative context usage
- Cache read tokens complicate calculations

**What Works**:
- The statusline provides `context_window` object with pre-calculated totals
- Individual JSONL entries have accurate usage for that specific turn
- You can extract final turn tokens from the last assistant message entry

### 4. **How Other Tools Handle This**

Community tools like **ccusage**, **toktrack**, and **claude-code-log** solve this by:
1. Reading all JSONL lines
2. Filtering to only main conversation entries (skipping sidechains)
3. Extracting usage from the final assistant message entry
4. Summing cache creation + cache read + input tokens for context usage
5. Using the last turn's `output_tokens` as the actual output (not 1)

From the DuckDB analysis blog post, the approach is to "find the most recent valid entry (by timestamp) and sum all input token types."

### 5. **What's Actually in JSONL vs What's Accurate**

| Data | Source | Accuracy | Notes |
|------|--------|----------|-------|
| `output_tokens` in assistant entry | JSONL usage field | **Mostly accurate** | May be 1 if incomplete/sidechain |
| Cumulative output tokens | Sum of all entries | **Not recommended** | Counts sidechain waste |
| Final turn output tokens | Last assistant entry | **Accurate** | Use this for actual context |
| Total context percentage | statusLine data | **Accurate** | Pre-calculated by Claude Code |
| Per-message breakdown | JSONL entries | **Accurate** | Individual turn data is reliable |

### 6. **Why Low Values Appear - Summary**

- **`output_tokens: 1`** typically indicates:
  1. Background/internal agent result (sidechain)
  2. Initial placeholder from streaming start (gets updated)
  3. Very brief response from Claude
  4. Incomplete agent execution (`stop_reason: null`)

- **Legitimate low values** (2-10 tokens) can occur for:
  - Brief acknowledgments
  - Status updates
  - Tool-only responses (no text content)

### 7. **Recommendations for Jacques Implementation**

Based on all findings, your current approach in `core/src/session/parser.ts` is **correct**:

1. ✅ Parse `message.usage.output_tokens` from assistant entries
2. ✅ Track both cumulative totals AND last turn tokens (already doing this!)
3. ✅ Filter sidechain agents (already implemented)
4. ✅ Use statusLine data for accurate context percentages (already doing this!)
5. ✅ Don't sum internal agent files into main conversation metrics

**Potential Enhancements**:
- Add detection for sidechain markers if available in newer Claude Code versions
- Cross-reference JSONL with statusLine data to validate token accuracy
- Flag entries with `output_tokens: 1` AND large input tokens as likely waste from sidechain agents

### Sources

- [Claude Code Documentation - Status Line Configuration](https://code.claude.com/docs/en/statusline)
- [GitHub Issue #13326 - Background sidechain agents consuming tokens](https://github.com/anthropics/claude-code/issues/13326)
- [GitHub Issue #11535 - Expose token usage data to statusline scripts](https://github.com/anthropics/claude-code/issues/11535)
- [GitHub Issue #16087 - Statusline payload missing context_window data](https://github.com/anthropics/claude-code/issues/16087)
- [Streaming Messages - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/streaming)
- [Analyzing Claude Code Interaction Logs with DuckDB](https://liambx.com/blog/claude-code-log-analysis-with-duckdb)
- [GitHub - daaain/claude-code-log](https://github.com/daaain/claude-code-log)
- [GitHub - ryoppippi/ccusage](https://github.com/ryoppippi/ccusage)
- [GitHub - mag123c/toktrack](https://github.com/mag123c/toktrack)