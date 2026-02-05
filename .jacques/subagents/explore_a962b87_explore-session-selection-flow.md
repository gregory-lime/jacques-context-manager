# Explore: Explore session selection flow

> Session: `2c59e7eb-e8c0-4886-b1fa-fc5336bdb3b7`
> Date: 2026-02-02
> Tokens: ~71 958

---

Perfect! Now I have a comprehensive understanding. Let me write the investigation report:

## Jacques Dashboard Session Selection Flow Investigation

I've thoroughly analyzed the Jacques codebase to understand the session selection and data availability flow. Here's what I discovered:

### 1. Session Selection and Viewing Flow

When a user clicks on a session in the GUI dashboard:

**File**: `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Archive.tsx:413-427`

```typescript
const handleSessionClick = async (session: SessionEntry) => {
  try {
    setError(null);
    const data = await getSession(session.id);
    const saved = transformToSavedConversation(
      data.metadata,
      data.entries,
      data.statistics,
      data.subagents
    );
    setSelectedConversation(saved);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load session');
  }
};
```

The flow:
1. Click a session from the list (SessionEntry)
2. Call `getSession(sessionId)` API endpoint
3. Parse the response and transform to UI format
4. Display in ConversationViewer or show error

### 2. "Session Not Found" Origins

The "Session not found" error originates from **four HTTP API endpoints**:

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts`

| Location | Endpoint | Purpose |
|----------|----------|---------|
| Line 535 | `GET /api/sessions/:id` | Get full session with entries |
| Line 589 | `GET /api/sessions/:id/badges` | Get session metadata badges |
| Line 668 | `GET /api/sessions/:id/subagents/:agentId` | Get subagent conversation |
| Line 748 | `GET /api/sessions/:id/plans/:messageIndex` | Get plan content |

**Also in WebSocket**:

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/start-server.ts:327`

```typescript
if (!session) {
  const errorResponse: HandoffContextErrorMessage = {
    type: 'handoff_context_error',
    session_id: request.session_id,
    error: `Session not found: ${request.session_id}`,
  };
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(errorResponse));
  }
  return;
}
```

### 3. How Session Data is Fetched

**Hybrid Architecture**: The server uses a lightweight index that reads JSONL directly:

**File**: `/Users/gole/Desktop/jacques-context-manager/core/src/cache/session-index.ts:668-672`

```typescript
export async function getSessionEntry(
  sessionId: string
): Promise<SessionEntry | null> {
  const index = await getSessionIndex();
  return index.sessions.find((s) => s.id === sessionId) || null;
}
```

**Data flow**:
1. `getSessionIndex()` reads from `~/.jacques/cache/sessions-index.json` (5KB metadata)
2. If index is stale (>5 minutes old), rebuilds by scanning `~/.claude/projects/*/`
3. Returns `SessionEntry` with path to JSONL file
4. HTTP API uses the `jsonlPath` to parse session content directly

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts:532-541`

```typescript
try {
  // Get session metadata from index
  const sessionEntry = await getSessionEntry(id);
  if (!sessionEntry) {
    sendJson(res, 404, { error: 'Session not found' });
    return;
  }

  // Parse JSONL directly from source
  const entries = await parseJSONL(sessionEntry.jsonlPath);
  const statistics = getEntryStatistics(entries);
```

### 4. Race Conditions Between Registration and Availability

There are **two critical timing windows** where "session not found" can occur:

#### **Window 1: Session Registered in Memory but Not Yet Indexed**

The Jacques server has an in-memory `SessionRegistry` (used for live TUI dashboard) separate from the file-based cache index (used for GUI):

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/session-registry.ts:36-46`

```typescript
export class SessionRegistry {
  private sessions = new Map<string, Session>();
  private focusedSessionId: string | null = null;
  // ... (live session tracking for real-time dashboard)
}
```

But the HTTP API for the GUI reads from the indexed cache:

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts:437-443`

```typescript
// Route: GET /api/sessions
if (method === 'GET' && url === '/api/sessions') {
  try {
    const index = await getSessionIndex();  // Reads from disk cache
    sendJson(res, 200, {
      sessions: index.sessions,
      lastScanned: index.lastScanned,
    });
  }
}
```

**Problem**: A session can be active in `SessionRegistry` but not yet appear in the GUI because:
- The JSONL file exists in `~/.claude/projects/`
- But the session index cache is older than 5 minutes
- Or was last rebuilt before the JSONL was created

#### **Window 2: Auto-Registration from Context Updates**

The registry has a sophisticated auto-registration mechanism to handle timing issues:

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/session-registry.ts:144-189`

```typescript
updateContext(event: ContextUpdateEvent): Session {
  let session = this.sessions.get(event.session_id);
  let isNewSession = false;
  
  // Auto-register session if it doesn't exist
  // This handles the timing issue where statusLine/preCompact fires before SessionStart
  if (!session) {
    // ... creates session from context_update event
    this.sessions.set(event.session_id, session);
    isNewSession = true;
  }
}
```

**Registration sequence**:
1. **statusLine hook** fires → `context_update` event → auto-registers session in registry
2. **SessionStart hook** fires → `session_start` event → updates auto-registered session with terminal info
3. **JSONL file** exists on disk in `~/.claude/projects/{project}/(sessionid).jsonl`
4. **Cache index** eventually picks it up (within 5 minutes or on rebuild)

### 5. GUI Session Loading Process

**File**: `/Users/gole/Desktop/jacques-context-manager/gui/src/components/ActiveSessionViewer.tsx:258-270`

```typescript
const loadSession = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const data = await getSession(sessionId);
    const saved = transformToSavedConversation(data);
    setConversation(saved);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load session');
  } finally {
    setLoading(false);
  }
}, [sessionId]);
```

Error handling shows the error message directly to the user:

**File**: `/Users/gole/Desktop/jacques-context-manager/gui/src/components/ActiveSessionViewer.tsx:285-300`

```typescript
if (error) {
  return (
    <div style={styles.errorContainer}>
      <button style={styles.backButton} onClick={onBack} type="button">
        ← Back
      </button>
      <div style={styles.errorContent}>
        <span style={styles.errorIcon}>⚠️</span>
        <p style={styles.errorText}>{error}</p>
        <button style={styles.retryButton} onClick={loadSession} type="button">
          Retry
        </button>
      </div>
    </div>
  );
}
```

### 6. Session Index Cache Management

**Cache file**: `~/.jacques/cache/sessions-index.json`

**Index refresh logic** (`getSessionIndex`):

**File**: `/Users/gole/Desktop/jacques-context-manager/core/src/cache/session-index.ts:646-663`

```typescript
export async function getSessionIndex(
  options?: { maxAge?: number }
): Promise<SessionIndex> {
  const { maxAge = 5 * 60 * 1000 } = options || {};  // 5 minutes default

  const existing = await readSessionIndex();

  // Check if index is fresh enough
  const lastScanned = new Date(existing.lastScanned).getTime();
  const age = Date.now() - lastScanned;

  if (age < maxAge && existing.sessions.length > 0) {
    return existing;  // Use cached version
  }

  // Rebuild index
  return buildSessionIndex();  // Scans ~/.claude/projects/
}
```

**Rebuild process**:

**File**: `/Users/gole/Desktop/jacques-context-manager/core/src/cache/session-index.ts:545-640`

Scans `~/.claude/projects/` for all `.jsonl` files, then:
1. Extracts metadata from each JSONL file
2. Parses entries to get title, timestamp, statistics
3. Detects plans, auto-compact, subagents
4. Writes new cache file with sorted sessions (newest first)

### Key Findings Summary

| Aspect | Details |
|--------|---------|
| **Session Registration** | Dual-layer: In-memory registry (live) + file-based index (cached) |
| **Auto-Registration** | Sessions auto-created from `context_update` events if arrive before `session_start` |
| **"Not Found" Sources** | 4 HTTP endpoints + 1 WebSocket handler check if session exists in index |
| **Cache Invalidation** | Default 5-minute TTL; can be forced via `POST /api/sessions/rebuild` |
| **Race Condition Risk** | Session exists in registry but not in cache index → GUI shows "Session not found" |
| **Retry Mechanism** | GUI shows "Retry" button - clicking retries with refreshed index |
| **JSONL Parsing** | Direct read from source files, not copied; enables real-time updates |

### Practical Implications

1. **New sessions appear in TUI immediately** but may take up to 5 minutes to appear in GUI
2. **Users can trigger manual rebuild** via `POST /api/sessions/rebuild` endpoint
3. **"Session not found" is usually transient** - retry after cache refresh
4. **Active sessions in CLI show even if GUI hasn't indexed them yet** - they're in the in-memory registry