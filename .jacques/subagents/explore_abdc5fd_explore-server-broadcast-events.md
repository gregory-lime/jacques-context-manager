# Explore: Explore server broadcast events

> Session: `be3139b4-92c8-4515-8a8a-6a2371b9f165`
> Date: 2026-02-03
> Tokens: ~69 064

---

Perfect! Now I have enough information. Let me compile a comprehensive report on all the available data and broadcasting mechanisms for notifications.

## Comprehensive Report: Jacques Server Event Broadcasting & Available Data for Notifications

Based on my thorough analysis of the Jacques server codebase, here's what I found:

### **1. WebSocket Messages Broadcasted (Server → Dashboard)**

The server broadcasts the following message types via WebSocket:

#### **Session-Related Messages:**
- **`session_update`** - When a session is created, modified, or context changes
  - Contains full `Session` object with all metadata
- **`session_removed`** - When a session ends
  - Contains session_id
- **`focus_changed`** - When the focused session changes
  - Contains session_id and full Session object

#### **Operation Tracking Messages:**
- **`claude_operation`** - When Claude Code CLI operations complete (e.g., LLM handoff, smart compact)
  - Contains: operation type, input/output tokens, duration, success status, prompt sizes
  - Fields available:
    - `totalTokens`, `inputTokens`, `outputTokens`, `cacheReadTokens`
    - `durationMs`, `userPromptChars`, `systemPromptChars`
    - `phase` ("start" or "complete")
    - `errorMessage` for failures

- **`api_log`** - HTTP API request logging
  - Contains: method, path, status, durationMs, timestamp

#### **File Monitoring Messages:**
- **`handoff_ready`** - When a handoff file is created
  - Contains: session_id, path
- **`handoff_progress`** - Real-time progress during handoff generation
  - Contains: stage, extractors_done, extractors_total, current_extractor, output_file

#### **Context Messages:**
- **`handoff_context`** - Compact context for LLM skills
  - Contains extracted data with plans array
- **`server_log`** - Real-time server logs
  - Contains: level, message, source, timestamp

---

### **2. Session Data Available (Source of Truth)**

The `Session` object in `types.ts` contains:

```typescript
interface Session {
  session_id: string;
  source: 'claude_code' | 'cursor' | string;
  session_title: string | null;
  transcript_path: string | null;
  cwd: string;
  project: string;
  model: ModelInfo | null;
  workspace: WorkspaceInfo | null;
  terminal: TerminalIdentity | null;
  terminal_key: string;
  status: 'active' | 'working' | 'idle';
  last_activity: number;
  registered_at: number;
  context_metrics: ContextMetrics | null;  // <-- KEY FOR TOKEN TRACKING
  autocompact: AutoCompactStatus | null;
  git_branch?: string | null;
  git_worktree?: string | null;
}
```

**ContextMetrics** (real-time context window data):
```typescript
interface ContextMetrics {
  used_percentage: number;           // 0-100
  remaining_percentage: number;      // 0-100
  total_input_tokens: number;
  total_output_tokens: number;
  context_window_size: number;
  total_cost_usd?: number;
  total_duration_ms?: number;
  is_estimate?: boolean;             // True from hooks, false from preCompact
}
```

---

### **3. Events That Trigger Broadcasting**

Broadcasting happens automatically in these scenarios:

#### **Context Changes** (`handleContextUpdate`):
- statusLine hook sends context_update (every ~2 seconds during active use)
- preCompact sends actual metrics when compaction occurs
- **Broadcasts**: session_update + focus_changed

#### **Activity** (`handleActivity`):
- PostToolUse hook fires after tool execution
- **Broadcasts**: session_update + focus_changed

#### **Session Start** (`handleSessionStart`):
- New session registered
- **Broadcasts**: session_update + focus_changed + starts handoff watcher

#### **Session End** (`handleSessionEnd`):
- Session closes
- **Broadcasts**: session_removed + focus_changed

#### **Idle** (`handleIdle`):
- Stop hook fires
- **Broadcasts**: session_update (no focus change)

---

### **4. ClaudeOperation Type Details**

From `core/src/logging/claude-operations.ts`:

```typescript
interface ClaudeOperation {
  id: string;
  timestamp: string;          // ISO timestamp
  operation: string;          // e.g., "llm-handoff", "smart-compact"
  phase: 'start' | 'complete';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens?: number;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  userPromptChars: number;
  systemPromptChars: number;
  userPromptTokensEst?: number;
  systemPromptTokensEst?: number;
  outputLength?: number;
  userPromptPreview?: string;  // First 200 chars
  systemPromptPreview?: string; // First 200 chars
  toolsCalled?: string[];      // For "complete" phase
}
```

**Key points:**
- Logged to `~/.jacques/logs/claude-operations.jsonl`
- Also broadcast via WebSocket in real-time (via `ClaudeOperationLogger.onOperation` callback)
- Wired in start-server.ts line 121-124
- Operations contain token metrics for detecting expensive LLM calls

---

### **5. HTTP API Endpoints for Session Detail Data**

Available endpoints in http-api.ts:

| Endpoint | Data Available |
|----------|---|
| `GET /api/sessions` | All sessions with metadata |
| `GET /api/sessions/:id` | Full session with parsed JSONL entries |
| `GET /api/sessions/:id/badges` | Plan count, agent types, file count, web search count, MCP count, auto-compact flag |
| `GET /api/sessions/:id/subagents/:agentId` | Subagent conversation with token breakdown |
| `GET /api/sessions/:id/plans/:messageIndex` | Plan content from specific message |
| `GET /api/archive/stats` | Archive statistics |
| `GET /api/claude/operations` | Recent Claude operations (50 most recent) |

---

### **6. Web Search & Plan Event Tracking**

**Web Search Tracking:**
- Available in JSONL entries: `query_update` and `search_results_received` progress entries
- Accessible via:
  - HTTP API: `/api/sessions/:id` (parsed JSONL contains search entries)
  - Badge endpoint: `/api/sessions/:id/badges` returns `webSearchCount`
  - Entry statistics: `getEntryStatistics()` counts web searches in parsed entries

**Plan Tracking:**
- Embedded plans detected during session (via @jacques/core plan-extractor)
- Available via:
  - HTTP API: `/api/sessions/:id/badges` returns `planCount`
  - Detailed data: `/api/sessions/:id` includes entry list with tool_call details
  - Full plan content: `/api/sessions/:id/plans/:messageIndex`

---

### **7. Existing "Significant Event" Detection Mechanisms**

**Currently tracked but not explicitly broadcast:**

1. **Token Usage Thresholds**
   - Auto-compact tracking in AutoCompactStatus
   - Bug workaround for 78% threshold (even with autoCompact: false)
   - Available in session.autocompact and context_metrics.used_percentage

2. **Large Tool Calls**
   - Write/Edit operations tracked in parsed JSONL
   - Accessible via: `/api/sessions/:id/badges` (fileCount)

3. **Web Searches**
   - Counted and available via badges endpoint
   - queryUpdate/search_results_received progress entries in JSONL

4. **MCP Calls**
   - mcp_progress entries in JSONL
   - Available via: `/api/sessions/:id/badges` (mcpCount)
   - Detail in statistics.mcpCalls

5. **Auto-Compact Events**
   - hadAutoCompact flag in session entry
   - Available via: `/api/sessions/:id/badges` (hadAutoCompact)

6. **Handoff Generation**
   - handoff_progress messages broadcast in real-time
   - Shows stage, extractor completion

---

### **8. Real-Time Broadcasting Architecture**

```
Hook Events (Unix Socket)
  ↓
EventHandler routes by event type
  ↓
SessionRegistry updates session state
  ↓
BroadcastService coordinates:
  - broadcastSessionWithFocus() - session + focus
  - broadcastSessionUpdate() - session only
  - broadcastSessionRemoved() - removal + focus shift
  ↓
JacquesWebSocketServer
  - Broadcasts to all connected clients
  - Maintains client connection pool
```

**Callback-based broadcast:**
```
ClaudeOperationLogger.onOperation → WebSocket broadcast
File system watcher → handoff_ready/handoff_progress
Console interception → server_log broadcast
HTTP API logging → api_log broadcast
```

---

### **9. Available Data for Building a Notification System**

To build notifications, you can listen to these sources:

**WebSocket Messages (Real-time):**
1. `context_update` when percentage jumps (>5% change)
2. `claude_operation` when expensive operations complete (>10k tokens)
3. `handoff_ready` when handoff files are created
4. Session data changes (status, title, git branch)

**HTTP API (On-demand inspection):**
1. `/api/sessions/:id/badges` for quick event counts (plans, searches, MCP calls)
2. `/api/claude/operations` for operation history
3. `/api/sessions/:id` for detailed JSONL analysis

**Thresholds Already Tracked:**
- Context percentage (used_percentage field)
- Token usage per operation (ClaudeOperation.totalTokens)
- Auto-compact status and thresholds
- Session status changes (active → working → idle)

---

### **Key Insights for Notification Implementation**

1. **Most efficient source**: WebSocket messages provide real-time events
2. **For batch analysis**: HTTP API endpoints give detailed session data
3. **For token tracking**: ClaudeOperation messages have all metrics you need
4. **For context warnings**: Listen to `session_update` messages and check `context_metrics.used_percentage`
5. **For operations**: Both ClaudeOperation broadcast and `/api/claude/operations` endpoint available
6. **For event counts**: Session badges endpoint gives quick counts of plans, searches, MCP calls, files modified

The system is well-instrumented - you'll have all the data needed to build sophisticated notifications!