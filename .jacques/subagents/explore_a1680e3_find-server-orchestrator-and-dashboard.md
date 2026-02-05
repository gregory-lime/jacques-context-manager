# Explore: Find server orchestrator and dashboard

> Session: `140f7e47-bbca-4654-9982-fe180f5ee2bc`
> Date: 2026-02-03
> Tokens: ~88 409

---

Perfect! Now I have all the information I need. Let me create a comprehensive summary document for the user.

## Summary

I've thoroughly analyzed how client messages are handled in the Jacques context manager project. Here's the complete picture:

---

## Server-Side Message Handling

### Main Orchestrator: `/Users/gole/Desktop/jacques-context-manager/server/src/start-server.ts`

This is the core server file that wires together all components. The key entry point for client message handling is the `handleClientMessage` function (lines 129-152):

```typescript
function handleClientMessage(ws: WebSocket, message: ClientMessage): void {
  switch (message.type) {
    case 'select_session':
      if (registry.setFocusedSession(message.session_id)) {
        broadcastService.forceBroadcastFocusChange();
      }
      break;

    case 'trigger_action':
      logger.log(`Action requested: ${message.action} for session ${message.session_id}`);
      break;

    case 'toggle_autocompact':
      handleToggleAutoCompact(ws);
      break;

    case 'get_handoff_context':
      handleGetHandoffContext(ws, message as GetHandoffContextRequest);
      break;

    default:
      logger.error(`Unknown client message type: ${(message as ClientMessage).type}`);
  }
}
```

**The server handles 4 message types:**

1. **`select_session`** - Changes which session has focus
   - Calls `registry.setFocusedSession()`
   - Broadcasts focus change to all clients
   
2. **`trigger_action`** - Triggers actions like smart_compact, new_session, save_snapshot
   - Currently just logs the request (placeholder for future implementation)
   
3. **`toggle_autocompact`** - Toggles auto-compact setting in ~/.claude/settings.json
   - Modifies the Claude Code settings file
   - Updates all sessions with new autocompact status
   - Warns about known bug #18264 (78% threshold despite false setting)
   
4. **`get_handoff_context`** - Gets compact pre-extracted context for LLM skill
   - Extracts ~2k tokens of compact context using `getCompactContextForSkill()`
   - Returns structured context with files, tools, decisions, blockers, etc.

---

## Message Types Definition: `/Users/gole/Desktop/jacques-context-manager/server/src/types.ts`

```typescript
// Client → Server messages
export interface SelectSessionRequest {
  type: 'select_session';
  session_id: string;
}

export interface TriggerActionRequest {
  type: 'trigger_action';
  session_id: string;
  action: 'smart_compact' | 'new_session' | 'save_snapshot';
  options?: Record<string, unknown>;
}

export interface ToggleAutoCompactRequest {
  type: 'toggle_autocompact';
  session_id?: string;
}

export interface GetHandoffContextRequest {
  type: 'get_handoff_context';
  session_id: string;
}

export type ClientMessage =
  | SelectSessionRequest
  | TriggerActionRequest
  | ToggleAutoCompactRequest
  | GetHandoffContextRequest;
```

---

## WebSocket Server: `/Users/gole/Desktop/jacques-context-manager/server/src/websocket.ts`

The `JacquesWebSocketServer` class (lines 48-287) handles WebSocket connections:

1. **Connection handling** (line 105): New clients receive `initial_state` message with all sessions
2. **Message reception** (line 119-126): Parses JSON messages and calls the `onClientMessage` callback
3. **Broadcasting** (line 155-169): Sends messages to all connected clients

The server wires up the callback in `start-server.ts` (line 77):
```typescript
const wsServer = new JacquesWebSocketServer({
  port: wsPort,
  onClientMessage: handleClientMessage,
  silent,
});
```

---

## Dashboard Client: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/websocket-client.ts`

The `JacquesClient` class (lines 33-234) is the dashboard's WebSocket client:

```typescript
// Sending messages
selectSession(sessionId: string): boolean {
  return this.send({
    type: 'select_session',
    session_id: sessionId,
  });
}

triggerAction(
  sessionId: string, 
  action: 'smart_compact' | 'new_session' | 'save_snapshot',
  options?: Record<string, unknown>
): boolean {
  return this.send({
    type: 'trigger_action',
    session_id: sessionId,
    action,
    options,
  });
}

toggleAutoCompact(): boolean {
  return this.send({
    type: 'toggle_autocompact',
  });
}
```

It also handles incoming messages (line 93-128):
- `initial_state`: Emits sessions and focused session ID
- `session_update`: Updates session state
- `session_removed`: Removes session from list
- `focus_changed`: Updates focused session
- `autocompact_toggled`: Updates autocompact status for all sessions

---

## React Hook: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/hooks/useJacquesClient.ts`

This hook (lines 32-173) wraps the client and provides React state:

```typescript
export function useJacquesClient(): UseJacquesClientReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  // ...

  const selectSession = useCallback((sessionId: string) => {
    client?.selectSession(sessionId);
  }, [client]);

  const toggleAutoCompact = useCallback(() => {
    client?.toggleAutoCompact();
  }, [client]);
  // ...
}
```

---

## Active Sessions View

The sessions view is shown when the **A** key is pressed. It's implemented as the `ActiveSessionsView` component (lines 1110-1235 of Dashboard.tsx):

```typescript
function ActiveSessionsView({
  sessions,
  focusedSessionId,
  terminalWidth,
  scrollOffset = 0,
}: ActiveSessionsViewProps): React.ReactElement {
  // Renders sessions with:
  // - ● for focused session, ○ for others
  // - Project name / Terminal type
  // - Context usage percentage and token count
  // - Scrollable if more than 10 sessions
}
```

**Display Features:**
- Sorted: focused session first, then by last activity
- Shows context metrics (%, current/max tokens, session total)
- Scrollable list with "▲ more above" / "▼ more below" indicators
- Fixed 10-row height with adaptive content

---

## Message Flow Diagram

```
Dashboard (useJacquesClient hook)
    ↓ (calls client.selectSession())
WebSocket Client (websocket-client.ts)
    ↓ (sends JSON via WebSocket)
ws://localhost:4242
    ↓
Jacques Server WebSocket (websocket.ts)
    ↓ (parses message, calls onClientMessage)
start-server.ts: handleClientMessage()
    ↓
Session Registry / Broadcast Service
    ↓ (broadcasts session_update/focus_changed)
ws://localhost:4242
    ↓
All connected Dashboard clients
    ↓
useJacquesClient hook
    ↓
setState (React re-render)
    ↓
Dashboard view updated
```

---

## Key Implementation Files

| File | Lines | Purpose |
|------|-------|---------|
| `server/src/start-server.ts` | 129-152 | Client message handler |
| `server/src/websocket.ts` | 48-287 | WebSocket server |
| `server/src/types.ts` | 463-503 | ClientMessage types |
| `dashboard/src/websocket-client.ts` | 33-234 | WebSocket client |
| `dashboard/src/hooks/useJacquesClient.ts` | 32-173 | React hook wrapper |
| `dashboard/src/components/Dashboard.tsx` | 1110-1235 | ActiveSessionsView component |
| `dashboard/src/components/App.tsx` | 1055-1100 | Keyboard input handling for "A" key |

---

All message handling is fully type-safe with TypeScript, using discriminated unions for message types. The system supports multiple clients connecting simultaneously, with the server broadcasting updates to all connected clients in real-time.