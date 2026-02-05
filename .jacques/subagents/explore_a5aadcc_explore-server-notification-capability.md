# Explore: Explore server notification capability

> Session: `5dba83f5-f624-47b3-99f9-832bb8d03d75`
> Date: 2026-02-03
> Tokens: ~71 809

---

Perfect! Now I have all the information I need. Let me provide a comprehensive report to the user.

## Server-Side Event Detection & Broadcasting Analysis

Based on my thorough exploration of the Jacques codebase, here are my findings:

### 1. **Server-Side Event Detection**

The server currently has **LIMITED event detection** for context thresholds:

- **Context metrics tracking**: The `SessionRegistry` stores context metrics from `ContextUpdateEvent` (lines 213-222 in session-registry.ts), which includes:
  - `used_percentage` 
  - `remaining_percentage`
  - `total_input_tokens`
  - `total_output_tokens`
  - `is_estimate` flag

- **Auto-compact status tracking**: Sessions store `autocompact` object with:
  - `enabled` flag
  - `threshold` percentage (default 95%)
  - `bug_threshold` (78% if autocompact disabled due to bug #18264)

- **NO server-side threshold detection logic**: The server does NOT detect when percentages cross specific thresholds (70%, 78%, 95%, etc.). It only:
  - Stores the metric values in the session object
  - Broadcasts the updated session via WebSocket to clients
  - Logs context updates

### 2. **Broadcast/Event Mechanisms**

The server has a robust broadcasting infrastructure:

**WebSocket Broadcasting** (`websocket.ts`):
- `broadcast(message: ServerMessage)` - broadcasts to all connected clients
- `broadcastSessionUpdate(session)` - sends updated session data
- `broadcastSessionRemoved(sessionId)` - notifies when session ends
- `broadcastFocusChange()` - notifies of focus changes
- `broadcastClaudeOperation()` - broadcasts LLM operations from Claude Code
- `broadcastApiLog()` - logs HTTP API requests

**BroadcastService** (`broadcast-service.ts`):
- Unified service that combines session updates with focus change notifications
- Methods:
  - `broadcastSessionWithFocus()` - broadcasts session + focus
  - `broadcastSessionRemovedWithFocus()` - broadcasts removal + focus
  - `broadcastSessionUpdate()` - broadcasts just the session

**Message Types** (types.ts):
The server supports 13+ message types from server → client:
- `session_update` - Updated session with context metrics
- `handoff_ready` - Handoff file was created
- `handoff_progress` - Handoff generation progress updates
- `server_log` - Real-time server logs
- `claude_operation` - Claude Code LLM operations
- `api_log` - HTTP API request logs
- And 7 others (initial_state, session_removed, focus_changed, autocompact_toggled, handoff_context, etc.)

### 3. **Server-Side Notification Infrastructure**

**There is NO server-side native notification system**. The server only has:

- **Log broadcasting**: `ServerLogMessage` type (type: 'server_log') that broadcasts logs to WebSocket clients
- **Event watchers**:
  - `HandoffWatcher` - watches for `.jacques-handoff.md` file creation and broadcasts `handoff_ready` message
  - `FocusWatcher` - detects terminal focus changes
- **No system notifications** - no `node-notifier` or equivalent in `package.json`

### 4. **Package Dependencies**

**server/package.json** dependencies:
```json
{
  "@jacques/core": "file:../core",
  "@modelcontextprotocol/sdk": "^1.11.0",
  "ws": "^8.18.0",
  "zod": "^3.25.0"
}
```

**NO notification packages installed** - no node-notifier, desktop notifications, or system alerting library.

### 5. **WebSocket Message Flow**

Events flow through the server like this:
```
Hook (statusLine/preCompact)
    ↓
UnixSocketServer receives newline-delimited JSON
    ↓
EventHandler.handleEvent() routes event
    ↓
SessionRegistry updates session state
    ↓
BroadcastService.broadcastSessionWithFocus()
    ↓
WebSocketServer.broadcast() to all connected clients
    ↓
Dashboard receives raw session data with context metrics
```

### 6. **Threshold Detection Location**

**All threshold detection is in the dashboard** (`CompactPanel.tsx`):

```typescript
const WARNING_THRESHOLD = 70;
const DANGER_THRESHOLD = 78;

// Client-side logic:
const contextUsed = session.context_metrics?.used_percentage ?? 0;
if (contextUsed < WARNING_THRESHOLD) return null;
```

The dashboard shows:
- Hidden if < 70%
- Yellow warning at 70-78%
- Red danger at 78%+ (bug threshold)
- Instructions to create handoff before critical point

### 7. **Event Timeline for Context Threshold**

```
1. Claude Code runs statusLine hook → context percentage
2. Hook sends context_update event → Unix socket
3. Server receives → UnixSocketServer.processLine()
4. EventHandler.handleContextUpdate() called
5. SessionRegistry.updateContext() stores metric
6. BroadcastService broadcasts updated session
7. WebSocket sends session_update to dashboard
8. Dashboard CompactPanel checks: if (contextUsed >= 70%) show panel
9. User sees warning and can manually trigger handoff
```

### Summary

The **server is event-agnostic** - it's a data forwarder, not a decision-maker. All business logic (thresholds, warnings, notifications) lives in the dashboard/client. To add server-side notifications, you would need to:

1. Add threshold detection logic to `EventHandler` or create a new `ThresholdDetector` service
2. Emit new server message types like `context_threshold_crossed` 
3. Either integrate `node-notifier` for system notifications OR rely on WebSocket broadcast to notify dashboard
4. Dashboard could optionally respect server-sent notifications vs. its own client-side detection

File locations:
- `/Users/gole/Desktop/jacques-context-manager/server/src/types.ts` - All message type definitions
- `/Users/gole/Desktop/jacques-context-manager/server/src/websocket.ts` - WebSocket broadcast methods
- `/Users/gole/Desktop/jacques-context-manager/server/src/services/broadcast-service.ts` - Unified broadcast service
- `/Users/gole/Desktop/jacques-context-manager/server/src/session-registry.ts` - Session storage (no threshold logic)
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/CompactPanel.tsx` - Client-side threshold detection (WARNING_THRESHOLD = 70)