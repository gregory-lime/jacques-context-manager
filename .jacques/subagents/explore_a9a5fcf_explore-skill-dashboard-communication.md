# Explore: Explore skill-dashboard communication

> Session: `7d6efafc-a92b-437d-b423-c34f24962694`
> Date: 2026-01-31
> Tokens: ~56 049

---

Perfect! Now I have enough information to provide a comprehensive analysis. Let me create a summary report:

## Exploration Complete: Skills-to-Dashboard Communication Architecture

Based on my analysis of the Jacques codebase, here's a detailed breakdown of how skills in Claude Code could communicate with the Jacques dashboard:

### Current Communication Flow

**1. Hook System (Existing Mechanism)**
- **From Claude Code** → **To Jacques Server** (via `/tmp/jacques.sock`):
  - Hooks send newline-delimited JSON events through a Unix domain socket
  - Path: `/Users/gole/Desktop/jacques-context-manager/hooks/` (Python/Bash scripts)
  - Events: `session_start`, `activity`, `context_update`, `idle`, `session_end`

- **Example Hook Communication** (`/Users/gole/Desktop/jacques-context-manager/hooks/jacques-register-session.py`, lines 131-143):
  ```python
  def send_to_server(payload: dict, socket_path: str = '/tmp/jacques.sock') -> bool:
      sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
      sock.settimeout(1.0)
      sock.connect(socket_path)
      sock.sendall(json.dumps(payload).encode() + b'\n')
      sock.close()
  ```

**2. Server Processing Pipeline** (`/Users/gole/Desktop/jacques-context-manager/server/src/server.ts`):
- Unix socket receives events → validates → passes to registry
- Registry updates session state
- Server broadcasts updates to all connected WebSocket clients (dashboard)
- Process: Hook Event → Registry Update → WebSocket Broadcast

**3. Dashboard Reception** (`/Users/gole/Desktop/jacques-context-manager/core/src/client/websocket-client.ts`):
- Listens on port 4242 (WebSocket)
- Receives `ServerMessage` types and emits React events
- Dashboard components consume via `useJacquesClient` hook

### Message Flow Architecture

```
Skills in Claude Code
    ↓ (write to Unix socket /tmp/jacques.sock)
Hooks (Python/Bash in ~/.claude/hooks/)
    ↓ (newline-delimited JSON)
Jacques Server (Unix socket listener)
    ↓ (validates & processes in server.ts)
Session Registry (session-registry.ts)
    ↓ (broadcasts session updates)
WebSocket Server (port 4242)
    ↓ (ServerMessage events)
Dashboard Client (JacquesClient)
    ↓ (EventEmitter pattern)
React Components (useJacquesClient hook)
```

### How Skills Could Send Progress Updates

**Option 1: Via Existing Activity/Context Event Types**
Skills can reuse the existing hook infrastructure to send updates. The system already handles:
- `activity` events (from `PostToolUse` hook) - line 180-186 in types.ts
- `context_update` events (from `statusLine`) - line 190-210 in types.ts

These automatically trigger dashboard broadcasts at:
- `/Users/gole/Desktop/jacques-context-manager/server/src/server.ts`, lines 186-202
- Each event handler calls `wsServer.broadcastSessionUpdate(session)` and `broadcastFocusChange()`

**Option 2: Create a New Custom Event Type**
Add a new `ServerMessage` subtype in `/Users/gole/Desktop/jacques-context-manager/server/src/types.ts` (lines 276-313) such as:
```typescript
export interface SkillProgressMessage {
  type: 'skill_progress';
  session_id: string;
  skill_name: string;
  progress: number;  // 0-100
  status: string;
  timestamp: number;
}
```

Then add to:
1. `ServerMessage` union type
2. WebSocket `handleMessage()` in client (websocket-client.ts line 96-125)
3. Dashboard event handler via `useJacquesClient` hook

### Implementation Pattern for Skills

Based on the handoff skill (`/Users/gole/.claude/skills/handoff/SKILL.md`), a skill could:

```bash
# Within a Claude Code skill, execute this to send progress:
nc -U /tmp/jacques.sock <<EOF
{"event": "activity", "timestamp": $(date +%s), "session_id": "$SESSION_ID", "session_title": "My Task", "tool_name": "skill_progress", "terminal_pid": $$, "context_metrics": {"used_percentage": 42, "remaining_percentage": 58, "context_window_size": 8000, "total_input_tokens": 3360, "total_output_tokens": 0}}
EOF
```

Or via Python (following the adapter pattern):
```python
import socket, json, time, os
payload = {
    "event": "activity",
    "timestamp": time.time(),
    "session_id": os.getenv("CLAUDE_SESSION_ID"),
    "session_title": "Processing...",
    "tool_name": "skill_progress",
    "terminal_pid": os.getpid(),
    "context_metrics": {
        "used_percentage": 42,
        "remaining_percentage": 58,
        "context_window_size": 8000,
        "total_input_tokens": 3360,
        "total_output_tokens": 0
    }
}
sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
sock.connect('/tmp/jacques.sock')
sock.sendall(json.dumps(payload).encode() + b'\n')
sock.close()
```

### Key Entry Points

| File | Purpose | Line |
|------|---------|------|
| `/Users/gole/Desktop/jacques-context-manager/server/src/types.ts` | Message type definitions | 238-313 |
| `/Users/gole/Desktop/jacques-context-manager/server/src/server.ts` | Event routing & broadcast | 168-240 |
| `/Users/gole/Desktop/jacques-context-manager/server/src/websocket.ts` | WebSocket broadcast methods | 139-186 |
| `/Users/gole/Desktop/jacques-context-manager/core/src/client/websocket-client.ts` | Client event handlers | 92-129 |
| `/Users/gole/Desktop/jacques-context-manager/dashboard/src/hooks/useJacquesClient.ts` | React hook integration | 45-134 |

### Existing Handoff Integration

The system already has a mechanism for skills to signal readiness:
- Handoff file watcher at `/Users/gole/Desktop/jacques-context-manager/server/src/server.ts`, lines 100-143
- Detects `.jacques-handoff.md` file creation in project directory
- Broadcasts `handoff_ready` message to dashboard
- Currently used by the `/handoff` skill to notify when handoff document is ready

### Summary

Skills can communicate with the Jacques dashboard through:

1. **Immediate**: Write JSON events to `/tmp/jacques.sock` (Unix socket)
2. **Hook-like**: Follow the adapter pattern used by existing hooks (base.py)
3. **Custom**: Extend `ServerMessage` type union for specialized progress types
4. **File-based**: Create marker files (like handoff) that the server watches and broadcasts

The architecture is designed for extensibility—all the plumbing is in place, just needs new message types defined and handled in the three layers (server→registry→websocket→client→react).