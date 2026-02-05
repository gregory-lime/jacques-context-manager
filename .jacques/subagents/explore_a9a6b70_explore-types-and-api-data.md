# Explore: Explore types and API data

> Session: `f8b4534e-0e5f-47ce-a628-13ec9ab99113`
> Date: 2026-02-04
> Tokens: ~59 279

---

Now I have a comprehensive understanding of all the data structures and APIs. Let me create a detailed report.

## Summary Report: Jacques GUI Data Structures, APIs, and Hooks

I've comprehensively explored the GUI types, API layer, hooks, and server HTTP API. Here's what's available for display:

### 1. GUI Types (`/Users/gole/Desktop/jacques-context-manager/gui/src/types.ts`)

**Core Data Structures:**

- **Session**: Contains `context_metrics` (used_percentage, context_window_size, total_input_tokens, total_output_tokens, is_estimate flag), status, model, autocompact settings
- **ConversationMessage**: Has `tokens` field with input/output/cacheCreation/cacheRead breakdown
- **MessageContent Types**:
  - **AgentProgressContent**: Has `tokenCount`, `messageCount`, `model`, `agentType`, `agentDescription`
  - **BashProgressContent**: output, fullOutput, elapsedSeconds, totalLines
  - **MCPProgressContent**: status, serverName, toolName
  - **WebSearchContent**: searchType, query, resultCount, urls array

- **SavedConversation**: Metadata includes `subagents` (count, totalTokens, ids), `hadAutoCompact` flag, `autoCompactAt` timestamp, `technologies`, `filesModified`

- **SessionBadges**: planCount, agentCount (with breakdown by type: explore/plan/general), fileCount, mcpCount, webSearchCount, mode (planning/execution), hadAutoCompact

### 2. API Layer (`/Users/gole/Desktop/jacques-context-manager/gui/src/api/config.ts`)

**Key Types Available:**

**Subagent Data:**
```typescript
SubagentData {
  id, sessionId, prompt, model,
  statistics: {
    messageCount, toolCallCount,
    tokens: {
      totalInput,        // fresh + cache_read (cumulative)
      totalOutput,       // estimated via tiktoken
      freshInput,        // non-cached input
      cacheCreation,     // tokens written to cache
      cacheRead          // tokens read from cache
    },
    durationMs
  }
}

SubagentTokenStats {
  totalInput, totalOutput, cacheCreation?, cacheRead?
}
```

**Session Entry (from cache index):**
```typescript
SessionEntry {
  tokens: {
    input: number,              // fresh input tokens
    output: number,             // output tokens
    cacheCreation: number,      // tokens written to cache
    cacheRead: number           // tokens read from cache
  },
  exploreAgents: Array<{
    id, description, timestamp, tokenCost?
  }>,
  webSearches: Array<{
    query, resultCount, timestamp
  }>,
  planRefs: Array<{
    title, source (embedded|write|agent), messageIndex, filePath?, agentId?, catalogId?
  }>
}
```

**Endpoints serving subagent data:**
- `GET /api/sessions/:id/subagents/:agentId` - Returns full subagent conversation with token stats
- `GET /api/archive/subagents/:agentId` - Returns archived subagent
- `GET /api/archive/sessions/:sessionId/subagents` - Lists all subagents for a session
- `GET /api/sessions/:id/badges` - Returns badge data (plans, agents, files, mcp, web searches, mode, auto-compact)

**Plans:**
- `GET /api/sessions/:id/plans/:messageIndex` - Gets plan content from session
- `GET /api/projects/:encodedPath/plans` - Lists deduplicated plans from catalog
- `GET /api/projects/:encodedPath/plans/:planId/content` - Gets plan content

**Explorations & Web Searches:**
- Available in `SessionEntry.exploreAgents` (with timestamps and estimated tokenCost)
- Available in `SessionEntry.webSearches` (with query, resultCount, timestamp)

### 3. Hooks

**useJacquesClient.ts:**
- Provides `sessions` array with full Session data including context_metrics
- Streams `claudeOperations` with token counts and durations
- Streams `apiLogs` with request/response timing
- Provides `serverLogs` for debugging

**useOpenSessions.tsx:**
- Manages open session tabs in the GUI
- Tracks which session is currently being viewed

**useNotifications.tsx:**
- Detects session events: context thresholds crossed, large operations, plan creation, auto-compact
- Fires both in-app toasts and browser notifications
- Manages notification settings and cooldowns

### 4. Server HTTP API (`/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts`)

**Critical Token Data Points:**

When fetching subagents (line 808-835), the server:
```javascript
// LAST turn's input tokens for context window size
const totalInput = statistics.lastInputTokens + statistics.lastCacheRead;

// Tiktoken-estimated output tokens (NOT from JSONL, which are inaccurate)
const totalOutput = statistics.totalOutputTokensEstimated;
```

**Full token breakdown available:**
- `freshInput`: Non-cached input tokens from last turn
- `cacheCreation`: Tokens written to cache (last turn)
- `cacheRead`: Tokens read from cache (last turn)
- `totalOutput`: Estimated total output tokens (cumulative, estimated via tiktoken)

**Session badges endpoint** (`/api/sessions/:id/badges`) returns:
- planCount, agentCount with agentTypes breakdown
- fileCount (from Write/Edit tool calls)
- mcpCount, webSearchCount
- mode (planning/execution)
- hadAutoCompact flag

**Available statistics from parsed JSONL:**
- `totalInputTokens`, `totalOutputTokens`, `totalCacheCreation`, `totalCacheRead`
- `agentCalls`, `mcpCalls`, `webSearches`
- Breakdown by message type, tool calls, system events

### 5. Key Data Availability Summary

**Token Data:**
- Subagent token in/out: YES - both estimated and actual available via `/api/sessions/:id/subagents/:agentId`
- Plans: YES - full content, source tracking (embedded/write/agent), links to sessions
- Explorations: YES - agent ID, description, timestamp, estimated token cost
- Web Searches: YES - query, result count, timestamp
- Auto-Compact: YES - tracked with timestamp via SessionBadges and SessionEntry

**Data Structures:**
- All plans have sources (embedded plans in messages, written to disk, or generated by Plan agent)
- All explorations tracked with agent type (Explore, Plan, or general-purpose)
- Web searches include full result URLs
- Subagent conversations include full parsed JSONL entries with token usage per turn
- Mode detection: planning vs execution based on tool calls

### Critical Notes:

1. **Token accuracy**: Output tokens in JSONL are inaccurate (1-9 tokens regardless of content). The server uses tiktoken for estimation instead.

2. **Subagent filtering**: Internal agents (aprompt_suggestion-*, acompact-*) are filtered out from user-visible counts

3. **Cache token accounting**: 
   - `cacheCreation` is a SUBSET of `freshInput` (not additional)
   - Total input = `freshInput + cacheRead`
   - Each turn reports FULL context window, so don't sum across turns for context size

4. **Plan sources**:
   - `embedded`: From user message with trigger pattern ("Implement the following plan:")
   - `write`: From Write tool call
   - `agent`: From Plan subagent

5. **Available in SessionEntry from index**:
   - Plans with full references and sources
   - Explore agent tracking with token costs
   - Web search tracking with queries and result counts
   - Auto-compact detection and timestamp

All endpoints return properly structured TypeScript types matching the interfaces defined in the API config file.