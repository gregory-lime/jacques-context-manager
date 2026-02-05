# Explore: Explore transcript handling

> Session: `cd506061-fc7c-4e92-a166-1ef4456fc31c`
> Date: 2026-02-01
> Tokens: ~61 554

---

Excellent! Now I have all the information needed. Let me compile a comprehensive report on how transcripts are obtained in the Jacques system.

## Comprehensive Analysis: Transcript Tracking in Jacques System

Based on my thorough exploration of the codebase, here's how transcripts are obtained and tracked through the Jacques system:

---

### 1. **How Sessions Track Their `transcript_path`**

#### Source: `/Users/gole/Desktop/jacques-context-manager/server/src/types.ts` (lines 109-142)

The `Session` interface defines `transcript_path` as a core field:
```typescript
export interface Session {
  // ...
  transcript_path: string | null;  // Path to the session transcript file
  // ...
}
```

#### Initialization Flows:

**Flow A: SessionStart Hook** (`jacques-register-session.py`)
- The hook receives `transcript_path` directly from Claude Code's input JSON (line 185 in the Python hook)
- Extracts the path: `transcript_path = input_data.get('transcript_path')`
- Includes it in the registration payload sent to the server (line 216):
  ```python
  "transcript_path": transcript_path,
  ```

**Flow B: Context Update (statusLine)** (`statusline.sh`)
- The statusLine script also receives `transcript_path` from Claude Code (line 35):
  ```bash
  transcript_path=$(echo "$input" | jq -r '.transcript_path // ""')
  ```
- The statusLine hook does NOT directly update `transcript_path` in the payload (the session-registry handles this separately)
- statusLine IS used to extract session titles from the transcript (lines 41-75)

#### Session Registration in Registry:

**From `session-registry.ts` (lines 53-106):**

When a SessionStart event arrives, the registry stores the path:
```typescript
registerSession(event: SessionStartEvent): Session {
  // ...
  const session: Session = {
    // ...
    transcript_path: event.transcript_path,  // Line 79
    // ...
  };
  this.sessions.set(event.session_id, session);
  // ...
}
```

#### Auto-Registration Path:

If a `context_update` event arrives before `session_start` (line 144-266), the registry auto-creates a session BUT does NOT have the `transcript_path`:
```typescript
updateContext(event: ContextUpdateEvent): Session {
  // Auto-register if missing
  if (!session) {
    session = {
      // ...
      transcript_path: null,  // Line 167 - no path available yet
      // ...
    };
  }
  // Later updated when session_start arrives
  if (existing) {
    existing.transcript_path = event.transcript_path || existing.transcript_path;  // Line 67
  }
}
```

---

### 2. **How the Server Stores Transcript Information**

#### Data Flow: Unix Socket → Registry → Memory

**Stage 1: Reception (unix-socket.ts, lines 122-139)**
- Unix socket server receives newline-delimited JSON from hooks
- Validates required fields: `event` and `session_id` (line 127)
- Parses as `HookEvent` type and calls `onEvent` handler

**Stage 2: Processing (start-server.ts, lines 107-132)**
```typescript
function handleHookEvent(event: HookEvent): void {
  switch (event.event) {
    case 'session_start':
      handleSessionStart(event as SessionStartEvent);  // Line 110
      break;
    // ...
  }
}
```

**Stage 3: Registry Storage (session-registry.ts)**

The `SessionRegistry` class maintains all session state in memory:
```typescript
export class SessionRegistry {
  private sessions = new Map<string, Session>();  // Line 37
  // Sessions indexed by session_id
}
```

Each session object in the map includes:
- `session_id`: Unique identifier
- `transcript_path`: Path to JSONL file
- All other context data

**No database** - all data is in-memory only. When the server restarts, all session data is lost.

---

### 3. **How the Dashboard Receives Session Data Including Transcript Paths**

#### Architecture: WebSocket Broadcast

**Step 1: WebSocket Connection (websocket.ts, lines 95-107)**

When a dashboard client connects:
```typescript
private handleConnection(ws: WebSocket): void {
  this.log('[WebSocket] Client connected');
  
  // Send initial state with ALL current sessions
  if (this.stateProvider) {
    const initialState: InitialStateMessage = {
      type: 'initial_state',
      sessions: this.stateProvider.getAllSessions(),  // Line 103
      focused_session_id: this.stateProvider.getFocusedSessionId(),
    };
    this.sendToClient(ws, initialState);
  }
}
```

**Step 2: Session Updates (websocket.ts, lines 164-170)**

Whenever a session changes, the server broadcasts:
```typescript
broadcastSessionUpdate(session: Session): void {
  const message: SessionUpdateMessage = {
    type: 'session_update',
    session,  // Line 167 - includes transcript_path
  };
  this.broadcast(message);
}
```

**Step 3: Dashboard Type Definitions (dashboard/src/types.ts, lines 65-81)**

The dashboard receives sessions with the full `Session` interface:
```typescript
export interface Session {
  session_id: string;
  session_title: string | null;
  transcript_path: string | null;  // Line 68 - included in all messages
  cwd: string;
  project: string;
  // ... other fields
}
```

#### Client-Side Reception (websocket-client.ts, lines 93-128)

```typescript
private handleMessage(data: Buffer): void {
  const message = JSON.parse(data.toString()) as ServerMessage;
  
  switch (message.type) {
    case 'initial_state':
      this.emit('initial_state', message.sessions, message.focused_session_id);
      // Sessions include transcript_path
      break;
    
    case 'session_update':
      this.emit('session_update', message.session);
      // Updated session includes transcript_path
      break;
  }
}
```

#### React Hook Integration (useJacquesClient.ts, lines 55-75)

```typescript
jacquesClient.on('initial_state', (initialSessions: Session[], initialFocusedId) => {
  setSessions(initialSessions);  // Store sessions with all fields
  setFocusedSessionId(initialFocusedId);
});

jacquesClient.on('session_update', (session: Session) => {
  setSessions(prev => {
    const index = prev.findIndex(s => s.session_id === session.session_id);
    let newSessions: Session[];
    if (index >= 0) {
      newSessions = [...prev];
      newSessions[index] = session;  // Update with new transcript_path if changed
    }
    // ...
  });
});
```

---

### 4. **Session Registry and Related Types**

#### Core Type Hierarchy

**1. Hook Events (server/src/types.ts, lines 159-236)**

| Event Type | Contains transcript_path? | Source |
|------------|---------------------------|--------|
| `SessionStartEvent` | ✓ Yes (line 165) | SessionStart hook |
| `ContextUpdateEvent` | ✗ No (line 191) | statusLine or Cursor preCompact |
| `ActivityEvent` | ✗ No (line 180) | PostToolUse hook |
| `IdleEvent` | ✗ No (line 215) | Stop hook |
| `SessionEndEvent` | ✗ No (line 223) | SessionEnd hook |

**2. SessionStartEvent Structure (lines 162-175)**
```typescript
export interface SessionStartEvent extends BaseEvent {
  event: 'session_start';
  session_title: string | null;
  transcript_path: string | null;  // ← Provided by hook
  cwd: string;
  project: string;
  model?: string;
  hook_source?: 'startup' | 'resume' | 'clear' | 'compact';
  terminal: TerminalIdentity | null;
  terminal_key: string;
  autocompact?: AutoCompactStatus;
}
```

**3. Session Object (lines 109-142)**
```typescript
export interface Session {
  session_id: string;
  source: SessionSource;
  session_title: string | null;
  transcript_path: string | null;  // ← Stored from SessionStartEvent
  cwd: string;
  project: string;
  model: ModelInfo | null;
  workspace: WorkspaceInfo | null;
  terminal: TerminalIdentity | null;
  terminal_key: string;
  status: SessionStatus;
  last_activity: number;
  registered_at: number;
  context_metrics: ContextMetrics | null;
  autocompact: AutoCompactStatus | null;
}
```

#### SessionRegistry Key Methods

| Method | Purpose | Updates transcript_path |
|--------|---------|------------------------|
| `registerSession()` | Initial registration from SessionStart | Sets from event |
| `updateActivity()` | Tool usage tracking | No change |
| `updateContext()` | Context metrics from statusLine | No direct change; auto-creates if missing |
| `updateContext()` | Auto-registration flow | Sets to null initially |
| `getSession()` | Retrieves by ID | No change |
| `findSessionByTerminalKey()` | Focus detection | No change |

---

### 5. **Event Flow Diagram**

```
Claude Code/Cursor Session
    │
    ├─→ SessionStart Hook (jacques-register-session.py)
    │   └─→ Extracts transcript_path from input JSON
    │   └─→ Reads transcript file to extract session_title
    │   └─→ Creates SessionStartEvent payload with transcript_path
    │   └─→ Sends via Unix socket to /tmp/jacques.sock
    │
    └─→ statusLine Hook (statusline.sh)
        └─→ Receives transcript_path (but doesn't update it)
        └─→ Uses transcript_path to extract session_title
        └─→ Creates ContextUpdateEvent (NO transcript_path in payload)
        └─→ Sends via Unix socket
        │
        ↓
Jacques Server (Unix Socket Receiver)
    │
    ├─→ SessionStartEvent Handler (start-server.ts:205-214)
    │   └─→ Calls registry.registerSession(event)
    │   └─→ Stores session WITH transcript_path
    │   └─→ Broadcasts session_update via WebSocket
    │
    └─→ ContextUpdateEvent Handler (start-server.ts:230-236)
        └─→ Calls registry.updateContext(event)
        └─→ Auto-registers if needed (with transcript_path = null)
        └─→ Later updated when session_start arrives
        │
        ↓
WebSocket Broadcast
    │
    └─→ Dashboard (Ink/React)
        └─→ Receives initial_state message with all sessions
        └─→ Receives session_update messages
        └─→ Stores sessions in React state
        └─→ transcript_path available for each session
```

---

### 6. **Key Design Patterns**

#### Pattern 1: Two-Phase Registration
- **Phase 1**: `context_update` arrives → auto-register with minimal info (transcript_path=null)
- **Phase 2**: `session_start` arrives → enrich with full details including transcript_path

#### Pattern 2: Title Extraction Priority (Python hook)
1. Explicit 'title' field in transcript (if Claude Code adds one)
2. 'summary' type entries (auto-generated summaries)
3. First real user message (fallback)

#### Pattern 3: Title Re-extraction (statusLine bash script)
1. Try `sessions-index.json` (has Claude's resume list title)
2. Try transcript summary entries (written during conversation)
3. Fallback to first user message

#### Pattern 4: Stateless Communication
- No database persistence
- All state in memory (SessionRegistry)
- WebSocket broadcasts propagate all changes to dashboard

---

### 7. **Important Details**

#### Transcript Path Format
- Full absolute path to the JSONL file
- Example: `/Users/gole/.claude/projects/-Users-gole-Desktop-myproject/session-uuid.jsonl`
- Note: Path encoding uses dashes instead of forward slashes

#### When transcript_path is null
1. Auto-registered sessions from `context_update` before `session_start`
2. Cursor sessions that send `preCompact` before hook system is fully integrated
3. Sessions where the transcript file doesn't exist yet

#### Transcript File Content
JSONL format with entries like:
```json
{"type":"user","message":{"content":"..."},"timestamp":...}
{"type":"assistant","message":{"content":"..."},"timestamp":...}
{"type":"summary","summary":"Session title here","timestamp":...}
```

---

### Summary

The Jacques system tracks transcripts through a clean separation of concerns:
1. **Hooks** extract and report `transcript_path` from Claude Code
2. **Server Registry** stores the path in memory as part of each Session object
3. **WebSocket** broadcasts the complete Session (with transcript_path) to dashboard clients
4. **Dashboard** receives and can use the path to access the actual transcript file for features like title extraction and conversation history

All files involved are in `/Users/gole/Desktop/jacques-context-manager/` with key locations:
- **Type definitions**: `server/src/types.ts`, `dashboard/src/types.ts`
- **Hook extraction**: `hooks/jacques-register-session.py`, `hooks/statusline.sh`
- **Registry storage**: `server/src/session-registry.ts`
- **Communication**: `server/src/unix-socket.ts`, `server/src/websocket.ts`
- **Dashboard reception**: `dashboard/src/websocket-client.ts`, `dashboard/src/hooks/useJacquesClient.ts`
- **Server orchestration**: `server/src/start-server.ts`