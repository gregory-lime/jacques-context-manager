# Explore: Explore archive browser agent handling

> Session: `2d1940d2-5932-435c-8c18-e214979e35ae`
> Date: 2026-02-02
> Tokens: ~88 453

---

Perfect! Now I have all the information I need. Let me create a comprehensive report.

## Comprehensive Analysis: Archive Browser Implementation and Agent/Web Search Parsing

Based on my thorough exploration of the codebase, here's a complete understanding of how agents and web search are handled in the archive browser:

### 1. **JSONL Entry Types from Claude Code Transcripts**

The parser recognizes several progress entry types within `RawProgressEntry` (defined in `core/src/session/parser.ts`):

```typescript
interface RawProgressEntry {
  type: "progress";
  uuid: string;
  timestamp: string;
  sessionId: string;
  data?: {
    type?: string; // Key field: determines which progress type
    // ... type-specific fields
  };
}
```

**Progress data types:**
- `hook_progress` - Hook execution logs (SessionStart, Stop, etc.)
- `agent_progress` - Subagent/explore agent calls
- `bash_progress` - Bash command streaming output
- `mcp_progress` - MCP tool executions
- `query_update` - Web search query initiated
- `search_results_received` - Web search results returned

### 2. **Agent Progress Structure**

**Raw JSONL Format:**
```typescript
{
  type: "progress",
  data: {
    type: "agent_progress",
    message?: {
      type: "user" | "assistant";
      message: { role: string; content: unknown[] };
      uuid: string;
      timestamp: string;
    };
    prompt: string;          // The task given to the agent
    agentId: string;         // Agent ID (e.g., "a0323e0")
  }
}
```

**Parsed Format (ParsedEntry):**
```typescript
{
  type: "agent_progress",
  content: {
    agentPrompt: string;              // Task prompt
    agentId: string;                  // Agent ID
    agentMessageType: "user" | "assistant";
    agentMessageContent: unknown[];   // Message content blocks
  }
}
```

**Display Format (DisplayMessage in SavedContext):**
```typescript
{
  type: "agent_progress",
  content: {
    agentPrompt: string;
    agentId: string;
    agentMessageType: "user" | "assistant";
    agentMessageContent: unknown[];
  }
}
```

### 3. **Web Search Structure**

**Raw JSONL Format - Query Update:**
```typescript
{
  type: "progress",
  data: {
    type: "query_update",
    query: string;  // The search query text
  }
}
```

**Raw JSONL Format - Results Received:**
```typescript
{
  type: "progress",
  data: {
    type: "search_results_received",
    query: string;        // The search query text
    resultCount: number;  // Number of results returned
  }
}
```

**Parsed Format (Both map to web_search type):**
```typescript
{
  type: "web_search",
  content: {
    searchType: "query" | "results";
    searchQuery: string;
    searchResultCount?: number;  // Only for results type
  }
}
```

**Display Format (DisplayMessage in SavedContext):**
```typescript
{
  type: "web_search",
  content: {
    searchType: "query" | "results";
    searchQuery: string;
    searchResultCount?: number;
  }
}
```

### 4. **Bash and MCP Progress Structures**

**Bash Progress (streaming output):**
```typescript
ParsedEntry {
  type: "bash_progress",
  content: {
    bashOutput: string;          // Recent output chunk
    bashFullOutput: string;      // Complete accumulated output
    bashElapsedSeconds: number;  // How long it's been running
    bashTotalLines: number;      // Total lines of output
  }
}
```

**MCP Progress (tool executions):**
```typescript
ParsedEntry {
  type: "mcp_progress",
  content: {
    mcpStatus: string;       // "started" | "completed" | etc
    mcpServerName: string;   // Server name (e.g., "deepwiki")
    mcpToolName: string;     // Tool name (e.g., "ask_question")
  }
}
```

### 5. **Parsing Pipeline**

**File: `core/src/session/parser.ts` - `categorizeEntry()` function**

The parser routes progress entries based on `data.type`:

```
RawProgressEntry → switch(data.type)
  ├─ "agent_progress" → ParsedEntry { type: "agent_progress", ... }
  ├─ "bash_progress" → ParsedEntry { type: "bash_progress", ... }
  ├─ "mcp_progress" → ParsedEntry { type: "mcp_progress", ... }
  ├─ "query_update" → ParsedEntry { type: "web_search", searchType: "query", ... }
  ├─ "search_results_received" → ParsedEntry { type: "web_search", searchType: "results", ... }
  └─ other → ParsedEntry { type: "system_event", ... }
```

### 6. **Filtering and Display**

**File: `core/src/session/filters.ts`**

The `FilterType` enum controls what gets saved to archive:

```typescript
enum FilterType {
  EVERYTHING = "everything",           // All entries
  WITHOUT_TOOLS = "without_tools",     // Exclude tool_call, tool_result, bash_progress, mcp_progress
  MESSAGES_ONLY = "messages_only",     // Only user_message and assistant_message
}
```

**Filter Behavior:**
- `agent_progress` - Included in EVERYTHING and WITHOUT_TOOLS; excluded from MESSAGES_ONLY
- `web_search` - Included in EVERYTHING and WITHOUT_TOOLS; excluded from MESSAGES_ONLY
- `bash_progress` - Excluded from WITHOUT_TOOLS and MESSAGES_ONLY
- `mcp_progress` - Excluded from WITHOUT_TOOLS and MESSAGES_ONLY

### 7. **Archive Browser Display**

**File: `dashboard/src/components/ArchiveBrowserView.tsx`**

The archive browser is **list-based only** - it displays:
- Projects (collapsible groups)
  - Conversation titles with metadata
    - Date formatted as "Jan 31"
    - Duration formatted as "5m" or "1h 30m"
    - Message count

**Current Limitations:**
- No detail panel showing conversation content
- Selecting a conversation just shows a notification
- No display of agent_progress, web_search, or other progress entries
- No right-side panel for viewing full content

**Key Code (lines 185-202):**
```typescript
if (item.manifest) {
  // Conversation entry (indented under project)
  const manifest = item.manifest;
  const date = formatDate(manifest.endedAt);
  const duration = formatDuration(manifest.durationMinutes);
  const title = truncate(manifest.title, 25);
  
  // Displays: "Title - Jan 31 (5m, 10 msgs)"
}
```

### 8. **SavedContext Structure**

**File: `core/src/session/transformer.ts`**

The `SavedContext` format contains a `conversation` array of `DisplayMessage` entries:

```typescript
interface SavedContext {
  contextGuardian: { version, savedAt, sourceFile, filterApplied };
  session: SessionInfo;
  statistics: SessionStatistics {
    agentCalls: number;      // Count of agent_progress entries
    bashProgress: number;    // Count of bash_progress entries
    mcpCalls: number;        // Count of mcp_progress entries
    webSearches: number;     // Count of web_search entries
  };
  conversation: DisplayMessage[];  // Full conversation including all progress types
}
```

### 9. **Subagent Archive System**

**File: `core/src/archive/subagent-store.ts`**

Subagent conversations are stored separately:

```typescript
interface ArchivedSubagent {
  id: string;           // Agent ID
  sessionId: string;    // Parent session ID
  prompt: string;       // Task prompt
  conversation: DisplayMessage[];  // Full subagent conversation
  statistics: {
    messageCount: number;
    toolCallCount: number;
    tokens: SubagentTokenStats;
  };
}
```

Manifests track subagents with:
```typescript
interface ConversationManifest {
  subagents?: SubagentSummary {
    count: number;
    totalTokens: number;
    ids: string[];  // Links to archived subagent files
  };
}
```

### 10. **Statistics Tracking**

**File: `core/src/session/parser.ts` - `getEntryStatistics()`**

The parser aggregates counts of all entry types:

```typescript
{
  agentCalls: 0,      // Count of agent_progress
  bashProgress: 0,    // Count of bash_progress
  mcpCalls: 0,        // Count of mcp_progress
  webSearches: 0,     // Count of web_search (both query_update and search_results_received)
  // ... other stats
}
```

### 11. **Flow from Parsing to Archive**

```
JSONL Transcript
    ↓
parseJSONL() [parser.ts]
    ↓
categorizeEntry() switches on data.type
    ├─ agent_progress → agentPrompt, agentId, message content
    ├─ web_search → searchType, searchQuery, searchResultCount
    └─ bash/mcp → status info
    ↓
getEntryStatistics() aggregates counts
    ↓
transformToSavedContext() creates DisplayMessage array
    ↓
applyFilter() filters based on FilterType
    ↓
archiveConversation() saves to ~/.jacques/archive/
    ├─ manifests/{id}.json
    ├─ conversations/{project}/{id}.json
    └─ subagents/{agentId}.json (if applicable)
    ↓
ArchiveBrowserView displays manifest data only
    (no display of agent/web_search content yet)
```

### 12. **URLs and Web Search Results**

**Important Discovery:** URLs from web search results are **NOT explicitly stored** in the current archive format. The system captures:
- `searchQuery` - The query text
- `searchResultCount` - Number of results returned
- Timestamp

**BUT NOT:**
- Individual result URLs
- Result titles or snippets
- Result metadata

The actual result content would be in the DisplayMessage for the search_results_received entry, but the standard parsing only extracts the count and query.

### 13. **Current State - What's Implemented vs Missing**

**Currently Working:**
- Parsing of agent_progress, web_search, bash_progress, mcp_progress entries
- Statistics counting of these entry types
- Filtering to exclude progress entries based on FilterType
- Subagent archive storage and tracking
- Manifest generation with basic metadata

**NOT Currently Displayed in Archive Browser:**
- Agent execution details (prompt, ID, conversation)
- Web search queries and results
- Bash command output
- MCP tool calls
- Subagent details
- Any right-side panel for conversation content

The archive browser is **read-only list view only** - selecting items just shows a notification. There's no viewer for the full conversation content yet.

---

**File Locations Summary:**

| Purpose | File |
|---------|------|
| Parser (JSONL → ParsedEntry) | `core/src/session/parser.ts` |
| Transform (ParsedEntry → DisplayMessage) | `core/src/session/transformer.ts` |
| Filters | `core/src/session/filters.ts` |
| Archive Storage | `dashboard/src/archive/archive-store.ts` |
| Manifest Generation | `dashboard/src/archive/manifest-extractor.ts` |
| Subagent Archive | `core/src/archive/subagent-store.ts` |
| Archive Browser UI | `dashboard/src/components/ArchiveBrowserView.tsx` |
| Main App Logic | `dashboard/src/components/App.tsx` |