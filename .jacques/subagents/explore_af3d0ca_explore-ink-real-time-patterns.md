# Explore: Explore Ink real-time patterns

> Session: `ac1a5cd2-2e62-40c1-a692-206a423bc8c5`
> Date: 2026-02-01
> Tokens: ~78 344

---

Excellent! Now I have comprehensive information. Let me create a detailed research report:

## Ink Real-Time Updates & Streaming Text Research

Based on my analysis of the Jacques codebase, here's a comprehensive guide to how Ink handles real-time updates and what the server could broadcast during LLM operations:

### 1. HOW INK HANDLES REAL-TIME UPDATES

**WebSocket + React Rendering Loop:**
The system uses a **pull-based update model** through WebSocket events that trigger React state updates:

```
Event Flow: Unix Socket → Server → WebSocket → Dashboard React Component → Re-render
```

**File: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/websocket-client.ts`**
- WebSocket client emits events on message receipt
- Client listens for: `session_update`, `context_update`, `focus_changed`, etc.
- Handles exponential backoff reconnection (2-30 seconds)

**File: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/hooks/useJacquesClient.ts`**
- React hook wraps WebSocket client
- Updates local state `[sessions, focusedSessionId]` on each WebSocket event
- Components re-render automatically on state change
- Each `session_update` triggers Ink to re-render the terminal UI

**Example: Context Update Flow**
```typescript
// Server broadcasts this WebSocket message:
{
  type: 'session_update',
  session: {
    session_id: 'abc123',
    context_metrics: {
      used_percentage: 45.3,
      total_input_tokens: 90600,
      context_window_size: 200000,
      is_estimate: true
    },
    last_activity: 1706234567890
  }
}

// Dashboard hook receives it:
jacquesClient.on('session_update', (session: Session) => {
  setSessions(prev => {
    // Find and replace updated session
    const updated = [...prev];
    updated[sessionIndex] = session;
    return updated.sort((a, b) => b.last_activity - a.last_activity);
  });
  setLastUpdate(Date.now());
});

// Component re-renders with new context metrics
// ProgressBar updates automatically
```

### 2. EXISTING REAL-TIME COMPONENTS

**Animated Spinner (LLMWorkingView.tsx)**
```typescript
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

useEffect(() => {
  const interval = setInterval(() => {
    setSpinnerIndex((prev) => (prev + 1) % SPINNER_FRAMES.length);
  }, 80);  // Frame every 80ms
  return () => clearInterval(interval);
}, []);
```

**File: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/LLMWorkingView.tsx`**
- Shows title with animated spinner
- Optional progress percentage (0-100)
- Optional description/status message
- Elapsed time display
- Cancel button (Esc)

**Progress Bars**
- **File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ProgressBar.tsx`
- Visual bar using `█` (filled) and `░` (empty) characters
- Dynamic coloring: green <60%, yellow 60-80%, red ≥80%
- Shows estimate marker `~` when data is estimated
- Automatically updates on metric changes

**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ContextProgress.tsx`
- Component reads `session.context_metrics`
- Re-renders on `session_update` WebSocket event
- Displays token counts and percentage

### 3. EXISTING BROADCAST INFRASTRUCTURE

**WebSocket Server Methods (websocket.ts)**
```typescript
broadcast(message: ServerMessage): void      // Send to all clients
broadcastSessionUpdate(session: Session)     // Session changed
broadcastSessionRemoved(sessionId: string)   // Session ended
broadcastFocusChange(...)                    // Focus shifted
```

**Server Message Types (types.ts, lines 334-343)**
Already defined for broadcasting:
- `session_update` - Session state changed
- `session_removed` - Session deleted
- `focus_changed` - Focus shifted
- `autocompact_toggled` - Auto-compact setting changed
- `handoff_ready` - Handoff file generated
- **`handoff_progress`** - Multi-extractor progress tracking (PREDEFINED!)
- **`server_log`** - Real-time server logs (PREDEFINED!)

### 4. HANDOFF PROGRESS MESSAGE (Already Defined!)

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/types.ts` (lines 309-317)
```typescript
export interface HandoffProgressMessage {
  type: 'handoff_progress';
  session_id: string;
  stage: 'starting' | 'extracting' | 'synthesizing' | 'writing' | 'complete';
  extractors_done: number;
  extractors_total: number;
  current_extractor?: string;
  output_file?: string;
}
```

This message is already designed for:
- **Stage tracking**: starting → extracting → synthesizing → writing → complete
- **Progress**: `extractors_done / extractors_total` (e.g., 3/8)
- **Current step**: which extractor is running
- **Completion**: output file path

### 5. SERVER LOG MESSAGE (Already Defined!)

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/logger.ts`
```typescript
export interface ServerLogMessage {
  type: 'server_log';
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  source: string;  // '[Server]', '[HTTP API]', '[Registry]', etc.
}
```

**Broadcasting mechanism (start-server.ts line 354-356)**:
```typescript
const removeLogListener = addLogListener((logMessage: ServerLogMessage) => {
  wsServer.broadcast(logMessage);  // Auto-broadcasts to all WebSocket clients
});
```

Console output is automatically intercepted and broadcast! Any `console.log()`, `console.warn()`, or `console.error()` in the server becomes a real-time message to dashboard clients.

### 6. WHAT JACQUES SERVER COULD BROADCAST DURING LLM OPERATIONS

**Currently Broadcasting:**
- Session context metrics (updated every ~1 second from statusLine hook)
- Session registration/removal
- Focus changes
- Auto-compact toggle status

**Ready to Implement:**

1. **Handoff Progress** (Message type already exists):
   ```
   Stage: extracting | Extractor 3/8: jacques-progress
   Stage: synthesizing | Output: .jacques/handoffs/2024-01-15-120304-handoff.md
   ```

2. **Real-time Logs** (Message type already exists):
   ```
   [Registry] Session registered: abc123 [claude_code]
   [Server] Broadcasting handoff progress: 5/8 extractors done
   [HTTP API] POST /api/action - smart_compact
   ```

3. **LLM Operation Status** (Could add):
   ```
   {
     type: 'llm_operation_status',
     operation: 'handoff_generation' | 'context_analysis' | 'suggestion_generation',
     status: 'started' | 'in_progress' | 'complete' | 'failed',
     progress_percent?: number,
     current_step?: string,
     estimated_seconds_remaining?: number,
     error?: string
   }
   ```

4. **Streaming Tokens** (For LLM response streaming):
   ```
   {
     type: 'llm_stream_update',
     operation_id: string,
     delta: string,  // New text chunk
     token_count: number,  // Tokens so far
     done: boolean
   }
   ```

5. **Tool Usage Events**:
   ```
   {
     type: 'tool_execution',
     session_id: string,
     tool_name: string,
     status: 'started' | 'completed' | 'failed',
     duration_ms?: number,
     tokens_used?: number
   }
   ```

### 7. DISPLAYING STREAMING TEXT IN TERMINAL UI

**Key Patterns in Jacques:**

1. **Append-only buffer** (for logs):
   ```typescript
   const [logs, setLogs] = useState<string[]>([]);
   
   client.on('server_log', (log: ServerLogMessage) => {
     setLogs(prev => [...prev, log.message]);
   });
   ```

2. **Fixed viewport with scroll** (like in Dashboard):
   - Keep only last N lines in viewport
   - `scrollOffset` state controls visible range
   - Arrow keys adjust offset

3. **Animated progress indicator** (for long operations):
   ```typescript
   const PROGRESS_FRAMES = ['⠇', '⠏', '⠋', '⠙', '⠚', '⠒'];
   // Update every 100ms
   ```

4. **Real-time metric updates**:
   - Component receives new data via WebSocket event
   - React re-renders automatically
   - Ink renders to terminal
   - No manual DOM manipulation needed

### 8. PACKAGE DEPENDENCIES

**Key Libraries:**
- **`ink`** (v6.6.0) - React for terminals (handles rendering)
- **`ws`** (v8.18.0) - WebSocket client/server
- **`react`** (v19.2.4) - State management

**Architecture Pattern:**
```
App (React Component)
  ├─ useJacquesClient hook (WebSocket + state)
  │  └─ Manages: sessions[], focusedSessionId, connected
  ├─ Dashboard (renders current view)
  │  ├─ ProgressBar (reads session.context_metrics)
  │  ├─ LLMWorkingView (reads llmWorking state + elapsed time)
  │  └─ SessionsList (reads sessions[])
  └─ Re-renders on any state change
```

### 9. ANIMATION FRAME TIMING

Jacques uses standard `setInterval`:
- **Spinner**: 80ms per frame
- **Timer**: 1000ms (1 second) for elapsed time
- **Progress updates**: Whenever WebSocket message arrives

Ink auto-renders on React state change—no manual refresh needed.

### Summary

Jacques demonstrates a **real-time, event-driven architecture** perfectly suited for streaming LLM operations:

1. **Server → Client**: WebSocket broadcasts structured JSON messages
2. **Client → UI**: React hooks update state, triggering Ink re-render
3. **Animations**: Simple `setInterval` with frame indices
4. **Streaming**: Add buffer state, append chunks on each event
5. **Progress**: Use existing `handoff_progress` message type
6. **Logs**: Use existing `server_log` message type (auto-broadcast)

Everything needed is already in place—just extend the message types and connect them to new components!