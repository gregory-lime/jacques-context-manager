# Explore: Explore Claude Code JSONL format

> Session: `02fa9321-cb8c-45e3-afd2-654a76f9985c`
> Date: 2026-02-01
> Tokens: ~81 147

---

Perfect! Now I have a complete picture. Let me create a comprehensive report.

## COMPREHENSIVE ANALYSIS: Claude Code JSONL Transcript Format - MISSING ENTRY TYPES

Based on thorough examination of the codebase parser and real JSONL transcript data, I've discovered **6 completely undocumented progress entry types** that are being skipped or misclassified in the current parser implementation.

### CURRENTLY HANDLED ENTRY TYPES (In `core/src/session/parser.ts`)

The parser currently handles these raw entry types:
1. `user` → parsed as `user_message`
2. `queue-operation` → parsed as `user_message` (if has message) or `skip`
3. `assistant` → parsed as `tool_call` or `assistant_message`
4. `progress` → split into `hook_progress` and generic `system_event`
5. `system` → parsed as `turn_duration` or `system_event`
6. `summary` → parsed as `summary`
7. `file-history-snapshot` → skipped
8. **Unknown types** → all skipped

### MISSING PROGRESS ENTRY TYPES

Analysis of real transcript data shows `progress` entries contain 6 distinct `data.type` values, but only 1 is properly handled:

| data.type | Count | Currently Handled? | Details |
|-----------|-------|-------------------|---------|
| `hook_progress` | 3,434 | ✅ YES | Hook execution logs (SessionStart, Stop, etc.) |
| `agent_progress` | 2,771 | ❌ **NO - BEING LOST** | Explore agent / subagent task execution |
| `bash_progress` | 265 | ❌ **NO - BEING LOST** | Bash tool execution progress/streaming |
| `mcp_progress` | 6 | ❌ **NO - BEING LOST** | MCP (Model Context Protocol) tool calls |
| `query_update` | 24 | ❌ **NO - BEING LOST** | Web search query progress |
| `search_results_received` | 24 | ❌ **NO - BEING LOST** | Web search results received |
| null/other | 7,449 | N/A | Data from non-progress entries |

**Total hidden: ~3,090 entries** are being classified as generic `system_event` when they should be specific, parseable types.

### DETAILED STRUCTURE FOR EACH MISSING TYPE

#### 1. **agent_progress** (2,771 entries) - MOST IMPORTANT

This represents Explore agent / subagent task execution in Claude Code v2.1+.

```json
{
  "type": "progress",
  "data": {
    "type": "agent_progress",
    "message": {
      "type": "user" | "assistant",  // Who sent the message
      "message": { ... },            // Full message content
      "uuid": "string",
      "timestamp": "ISO8601"
    },
    "normalizedMessages": [],
    "prompt": "string",              // Original prompt given to agent
    "agentId": "string"              // 7-char agent identifier
  },
  "timestamp": "ISO8601",
  "uuid": "string",
  "parentUuid": "string",
  "toolUseID": "agent_msg_*",       // Tool IDs for agent calls
  "parentToolUseID": "string"
}
```

**Example agent prompts captured:**
- "Investigate the archived conversation format in this codebase..."
- "Investigate how tokens are estimated in the GUI..."

**Key fields:**
- `message.type`: "user" for initial task, "assistant" for agent response
- `agentId`: 7-character identifier to track which agent executed
- `prompt`: Original task given to agent
- `parentUuid`: Links to parent turn

#### 2. **bash_progress** (265 entries) - EXECUTION STREAMING

Real-time progress from long-running bash commands.

```json
{
  "type": "progress",
  "data": {
    "type": "bash_progress",
    "output": "string",              // Recent output chunk
    "fullOutput": "string",          // Complete output so far
    "elapsedTimeSeconds": number,
    "totalLines": number,
    "timeoutMs": number              // Bash timeout configuration
  },
  "timestamp": "ISO8601"
}
```

**Use case:** Shows real-time progress for long `npm install`, `cargo build`, etc.

#### 3. **mcp_progress** (6 entries) - MODEL CONTEXT PROTOCOL

MCP server tool execution progress.

```json
{
  "type": "progress",
  "data": {
    "type": "mcp_progress",
    "status": "started" | "completed",
    "serverName": "string",         // e.g., "deepwiki"
    "toolName": "string",           // e.g., "ask_question"
    "elapsedTimeMs": number         // Only on completion
  },
  "timestamp": "ISO8601"
}
```

**Example:** MCP server "deepwiki" executing "ask_question" tool

#### 4. **query_update** (24 entries) - WEB SEARCH PROGRESS

Web search query being executed.

```json
{
  "type": "progress",
  "data": {
    "type": "query_update",
    "query": "string"                // Search query being executed
  },
  "timestamp": "ISO8601"
}
```

#### 5. **search_results_received** (24 entries) - WEB SEARCH RESULTS

Web search results completed.

```json
{
  "type": "progress",
  "data": {
    "type": "search_results_received",
    "resultCount": number,
    "query": "string"
  },
  "timestamp": "ISO8601"
}
```

---

### CURRENT PARSER BEHAVIOR

**Lines 347-376 in `core/src/session/parser.ts`:**

```typescript
case "progress": {
  const progressEntry = entry as RawProgressEntry;
  // Only THIS is handled:
  if (progressEntry.data?.type === "hook_progress") {
    return { type: "hook_progress", ... };
  }
  // Everything else → generic system_event!
  return {
    type: "system_event",
    content: {
      eventType: "progress",
      eventData: progressEntry.content || progressEntry.data,
    },
  };
}
```

All 6 missing types fall into the catch-all `system_event` return.

---

### DOCUMENTATION GAPS

**In CLAUDE.md:**
- The "Entry Types" table (lines 542-549) only lists 8 entry types
- `progress` entry is documented as only having `hook_progress` subtype
- No mention of agent_progress, bash_progress, mcp_progress, or search types

**In parser.ts comments:**
- Line 1-12 comment says "progress: Sub-agent activity" but only implements hook_progress
- Line 147 comment says "hook_progress // Hook execution logs (was "subagent_call")"
  - This reveals `progress.data.type !== "hook_progress"` IS agent/subagent activity!

---

### IMPLICATIONS FOR EXTRACTION

**What's currently being lost:**
1. **2,771 Explore agent calls** - No way to see what tasks were delegated to subagents
2. **265 Bash command streaming events** - Real-time execution progress hidden
3. **6 MCP tool executions** - External tool activity not captured
4. **48 Web search operations** - Search queries and results hidden

**Token impact:**
- Agent progress entries contain full message content from subagent responses
- These are INCLUDED in token calculations but not parsed/displayed
- Bash progress shows real-time streaming (could be used for streaming UI)
- MCP and search results are metadata overhead

---

### RECOMMENDATIONS

1. **Extend `ParsedEntryType`** to include:
   ```typescript
   | "agent_progress"
   | "bash_progress"
   | "mcp_progress"
   | "web_search_query"
   | "web_search_results"
   ```

2. **Add handler cases** in `categorizeEntry()` for each type

3. **Create new interfaces** (e.g., `RawAgentProgressEntry`) with proper types

4. **Update CLAUDE.md** with complete entry type table

5. **Consider display in handoff generation** - Agent activity might be valuable context to preserve

---

### FILES NEEDING UPDATES

| File | Changes |
|------|---------|
| `/core/src/session/parser.ts` | Add 5 new ParsedEntryType values, 5 new case handlers |
| `CLAUDE.md` | Expand "Entry Types" table with all 6 progress subtypes |
| `/dashboard/src/session/parser.ts` | Mirror parser.ts changes |
| Tests | Add test fixtures for each type |