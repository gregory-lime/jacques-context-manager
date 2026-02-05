# Explore: Explore Claude Code JSONL format

> Session: `02fa9321-cb8c-45e3-afd2-654a76f9985c`
> Date: 2026-02-01
> Tokens: ~66 495

---

Perfect! Now I have a comprehensive understanding. Let me create a detailed report:

## Investigation Report: Claude Code JSONL Transcript Format & Missing Data

Based on my analysis of the Jacques codebase, here's what we're capturing and what we might be missing:

### Current Data Extraction

#### 1. **Parser Layer** (`dashboard/src/session/parser.ts`)
The parser extracts the following from raw JSONL entries:

**What IS being captured:**
- **User messages** - Full text content
- **Assistant messages** - Text + extended thinking (Claude's reasoning)
- **Tool calls** - Tool name, inputs, model, token usage
- **Token usage** - Input tokens, output tokens, cache_creation, cache_read (optional)
- **Cost data** - USD cost per message (when available)
- **Duration** - Turn duration in milliseconds
- **Hook events** - Session lifecycle (SessionStart, Stop, etc.)
- **Summaries** - Auto-generated session titles
- **Model info** - Which model was used
- **Thinking blocks** - Extended thinking content

**Entry types found:**
- `assistant` - Main Claude responses (with full usage data)
- `user` - User messages
- `progress` - Hook activity and subagent calls
- `system` - Turn metrics, stop_hook_summary
- `summary` - Auto-generated titles
- `queue-operation` - User queue management
- `file-history-snapshot` - File state tracking (currently skipped)

#### 2. **Archive Manifest** (`core/src/archive/types.ts`)
What gets stored in lightweight manifests (~1-2KB):
- Session ID, project info, timestamps, duration
- **Title** - Claude's summary or fallback
- **User questions** - Truncated to 200 chars
- **Files modified** - From Write/Edit tool calls
- **Tools used** - Unique set of all tool names
- **Technologies** - Auto-detected from content (40+ patterns)
- **Plans** - From both Write calls and embedded (Phase 11)
- **Message count** - Total user + assistant messages
- **Tool call count** - Total tool invocations
- **Optional context snippets** - First 5 assistant messages (150 chars each)

#### 3. **Stored Conversations** (`SavedContext` - core/src/session/transformer.ts`)
The full conversation saved to JSON contains:
```typescript
{
  contextGuardian: {
    version, savedAt, sourceFile, filterApplied
  },
  session: {
    id, slug, startedAt, endedAt, claudeCodeVersion, model, gitBranch, workingDirectory, summary
  },
  statistics: {
    totalEntries, userMessages, assistantMessages, toolCalls, 
    hookEvents, systemEvents, turnCount,
    tokens: { totalInput, totalOutput, cacheCreation?, cacheRead? },
    totalDurationMs, estimatedCost
  },
  conversation: [DisplayMessage[]]
}
```

Each DisplayMessage has:
- `id`, `type`, `timestamp`
- **content**: text, thinking, toolName, toolInput, toolResult, summary, hookEvent, etc.
- **metadata**: model, tokens (input/output), costUSD, durationMs, parentId

---

### What We're MISSING or Underutilized

#### 1. **Tool Results** (Type: `tool_result`)
- **Currently**: Parsed as a type but NOT extracted into the conversation
- **Missing in archive**: Tool outputs/results are not being captured
- **Why it matters**: Understanding what tools returned is critical for context reconstruction
- **Impact**: Medium - Handoff/search doesn't capture tool execution outcomes

```typescript
// In parser.ts line 46: tool_result is a valid ContentBlock type
// But there's no case handler for it in categorizeEntry()
```

#### 2. **Stop Reason & Model Details**
- **Currently**: `stop_reason` is defined in RawAssistantEntry but NOT extracted
- **Missing in archive**: Whether a response was stopped by max_tokens, end_turn, or other reasons
- **Why it matters**: Helps understand if responses were truncated
- **Impact**: Low-Medium - Useful for quality assessment

#### 3. **Sub-agent Activity** (Real progress events)
- **Currently**: Only hook_progress (Jacques hooks) are extracted
- **Missing in archive**: Actual Claude Code sub-agent executions (when progress.type !== "hook_progress")
- **Line 361**: Other progress types fall through to system_event with generic eventData
- **Why it matters**: Understanding what sub-agents did during session
- **Impact**: Low - Rarely stored, but useful for understanding Claude's internal work

#### 4. **Cache Information** (Partial capture)
- **Currently**: `cache_creation_input_tokens` and `cache_read_input_tokens` ARE being captured
- **BUT**: Not aggregated in SessionStatistics 
- **Missing in archive**: Cache efficiency metrics not exposed in manifest or display
- **Impact**: Low - Data is there but not summarized in statistics

```typescript
// In transformer.ts lines 48-52: tokens object doesn't include cache metrics
tokens?: {
  totalInput: number;
  totalOutput: number;
  cacheCreation?: number;  // NOT present in statistics!
  cacheRead?: number;      // NOT present in statistics!
};
```

#### 5. **MCP Tool Calls**
- **Currently**: Treated as regular tool calls (type: "tool_use")
- **Missing in archive**: No distinction between Claude tools (Read, Write, Bash) vs MCP tools
- **Impact**: Low - Manifest extracts "toolsUsed" as a set, so duplicates are already merged

#### 6. **Turn-by-turn Cost/Duration Breakdown**
- **Currently**: Individual turn costs ARE captured (costUSD, durationMs on each message)
- **Missing in archive**: Turn-level metrics not stored in manifest, only aggregated
- **In manifest**: Only total durationMinutes at session level
- **Impact**: Medium - Good for performance analysis but not in archive search

#### 7. **System Prompts & Context Window Details**
- **Currently**: NOT captured at all
- **From statusLine**: total_cost_usd and total_duration_ms sometimes in system events
- **Missing**: Context window breakdown (messages, skills, system prompts, cache)
- **Why**: Phase 5 (Context Details Breakdown) is still pending
- **Impact**: Medium-High - This was your Phase 5 feature

#### 8. **Extended Thinking Metrics**
- **Currently**: Extended thinking TEXT is captured in content.thinking
- **Missing in archive**: No metrics on thinking token count, reasoning depth, etc.
- **Why**: Assistant usage only reports total input/output, not thinking token breakdown
- **Impact**: Low-Medium - Useful for understanding reasoning complexity

#### 9. **File History Snapshots**
- **Currently**: Type "file-history-snapshot" is SKIPPED (line 420)
- **Why**: Claude Code file tracking, not critical for conversation
- **Impact**: Low - Intentionally excluded

#### 10. **Conversation Metadata**
- **Currently**: User label (userLabel) optional in manifest
- **Missing in archive**: No tags, keywords, or manual annotations
- **Why**: Would require UI for users to add
- **Impact**: Low - Could be nice for organization

---

### Data Flow Summary

```
Claude Code JSONL (raw)
    ↓
parseJSONL() → ParsedEntry[] (with full token/cost data)
    ↓
extractManifestFromEntries() → ConversationManifest
    │   (truncates snippets, detects tech)
    │
    ├─→ Archive storage (~1-2KB manifest)
    │   - NO tool results
    │   - NO turn-by-turn breakdown
    │   - NO stop_reason
    │   - NO extended thinking metrics
    │
    └─→ transformToSavedContext() → SavedContext JSON
        (for local Save Context)
        - Full conversation preserved
        - BUT tool results still missing
        - Cache metrics in data but not in statistics
```

---

### Recommendations for Phase 5+ Features

1. **Add tool_result to conversation archive**
   - Requires handling the `tool_result` ContentBlock type
   - ~5-10 minute implementation

2. **Add cache efficiency metrics to statistics**
   - Already captured, just need to expose in SessionStatistics
   - ~2 minute fix

3. **Add system event breakdown to manifest**
   - Include total_cost_usd and turn_duration from system entries
   - Enables cost analysis in search

4. **Context breakdown (Phase 5)**
   - Parse transcript to count:
     - Total messages tokens
     - System prompt tokens (~3-5k)
     - Skills overhead tokens (~20-34k per tool)
     - Cache impact
   - Phase 5 is already validated and waiting

5. **Stop reason tracking**
   - Add to DisplayMessage metadata
   - Flag truncated responses

6. **Cache metrics dashboard**
   - Show cache hit rate per session
   - Compare cache_creation vs cache_read tokens

---

### Files to Reference

| File | Purpose |
|------|---------|
| `/Users/gole/Desktop/jacques-context-manager/dashboard/src/session/parser.ts` | Defines RawEntry types and parsing logic |
| `/Users/gole/Desktop/jacques-context-manager/core/src/archive/types.ts` | ConversationManifest schema |
| `/Users/gole/Desktop/jacques-context-manager/core/src/archive/manifest-extractor.ts` | Extraction logic (detects tech, plans, files) |
| `/Users/gole/Desktop/jacques-context-manager/core/src/session/transformer.ts` | SavedContext structure |
| `/Users/gole/Desktop/jacques-context-manager/server/src/mcp/search-tool.ts` | What MCP exposes to Claude Code |

The full structure is quite comprehensive, but there are targeted opportunities to capture tool results, expose cache metrics, and prepare for the Phase 5 context breakdown feature.