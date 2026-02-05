# Explore: Explore GUI multi-log panel

> Session: `429c7229-38fb-4bad-8670-076405330d24`
> Date: 2026-02-03
> Tokens: ~75 145

---

Perfect! Now I have a comprehensive understanding. Let me create the final report:

## GUI Multi-Log Panel Architecture & Data Flow Report

I've analyzed the GUI codebase and traced the complete data flow from the Jacques server to the multi-log panel display. Here's the comprehensive breakdown:

---

### **1. Multi-Log Panel Component Overview**

**Location**: `/Users/gole/Desktop/jacques-context-manager/gui/src/components/MultiLogPanel.tsx` (lines 1-1034)

**Key Features**:
- **Four tabbed views**: All, Server, API, and Claude operations logs
- **Resizable panel**: Height persisted to localStorage (key: `jacques-log-panel-height`)
- **Auto-scroll**: Intelligently scrolls to bottom when new logs arrive (unless user scrolled up)
- **Error/Warning badges**: Visual indicators for log severity across tabs
- **Expandable text**: Long log messages can be clicked to expand/collapse
- **Debug panel**: Fetches detailed debug data for completed Claude operations via HTTP API
- **Token formatting**: Formats large numbers (28500 → "28.5k")

**Panel Height Constants** (lines 9-13):
- Default: 250px
- Min: 60px (header only)
- Max: 600px
- Header: 40px

---

### **2. How Server Logs Are Collected**

#### **Server-Side Log Interception** 
**Location**: `/Users/gole/Desktop/jacques-context-manager/server/src/logger.ts` (lines 1-136)

**Process Flow**:
1. `startLogInterception()` (line 83) patches `console.log`, `console.warn`, `console.error`
2. Each console call is intercepted and converted to a `ServerLogMessage`:
   ```typescript
   {
     type: 'server_log',
     level: 'info' | 'warn' | 'error',
     message: string,
     timestamp: number (Date.now()),
     source: string (parsed from message prefix like "[WebSocket]")
   }
   ```
3. **Log History Management** (lines 24-25):
   - Maintains `logHistory` array (max 100 entries)
   - Old entries shifted out when exceeding limit (line 67)

4. **Log Broadcasting** (lines 62-78):
   - Each log is added to history
   - All registered listeners are notified via callback (lines 71-77)

---

#### **Server-Side Log Listener Setup**
**Location**: `/Users/gole/Desktop/jacques-context-manager/server/src/start-server.ts` (lines 282-288)

```typescript
// Start log interception for broadcasting to GUI
startLogInterception();

// Add log listener to broadcast to WebSocket clients
const removeLogListener = addLogListener((logMessage: ServerLogMessage) => {
  wsServer.broadcast(logMessage);
});
```

This ensures every console log is immediately sent to all connected WebSocket clients.

---

### **3. WebSocket Broadcast Mechanism**

**Location**: `/Users/gole/Desktop/jacques-context-manager/server/src/websocket.ts` (lines 1-287)

**Key Methods**:

1. **`broadcast(message: ServerMessage)`** (lines 155-169):
   - Serializes message to JSON
   - Sends to all connected clients with `readyState === WebSocket.OPEN`
   - Logs sent count: `"[WebSocket] Broadcast server_log to X client(s)"`

2. **Dedicated broadcast methods** for different log types:
   - `broadcastClaudeOperation(operation)` (lines 208-233)
   - `broadcastApiLog(log)` (lines 238-244)
   - Generic `broadcast(message)` for server logs

3. **Client connection handling** (lines 105-141):
   - Sends initial state to new clients (sessions, focused session ID)
   - Registers listeners for disconnect/errors
   - Logs: `"[WebSocket] Client connected"` / `"[WebSocket] Client disconnected"`

---

### **4. GUI Client-Side Reception**

**Location**: `/Users/gole/Desktop/jacques-context-manager/gui/src/hooks/useJacquesClient.ts` (lines 1-340)

**Class**: `BrowserJacquesClient` (lines 20-152)

**WebSocket Connection**:
- **URL**: `ws://localhost:4242` (line 7, configurable via `VITE_JACQUES_SERVER_URL`)
- **Reconnection**: Exponential backoff up to 30 seconds (line 82)
- **Max attempts**: 10 (line 23)

**Message Handling** (lines 90-129):
Dispatches to `onServerLog`, `onClaudeOperation`, or `onApiLog` callbacks based on message type.

**React Hook Integration** (lines 177-340):
- `useJacquesClient()` hook manages state for:
  - `serverLogs: ServerLog[]` (line 182)
  - `claudeOperations: ClaudeOperation[]` (line 183)
  - `apiLogs: ApiLog[]` (line 184)

- **Handler Example for server logs** (lines 268-277):
  ```typescript
  jacquesClient.onServerLog = (log: ServerLog) => {
    setServerLogs(prev => {
      const newLogs = [...prev, log];
      if (newLogs.length > MAX_LOGS) {
        return newLogs.slice(-MAX_LOGS);
      }
      return newLogs;
    });
  };
  ```

**Log Retention**:
- `MAX_LOGS = 100` (server logs)
- `MAX_CLAUDE_OPS = 50` (Claude operations)
- `MAX_API_LOGS = 100` (API requests)

---

### **5. Integration in Main Layout**

**Location**: `/Users/gole/Desktop/jacques-context-manager/gui/src/components/Layout.tsx` (lines 1-306)

**Setup** (lines 31, 187-193):
```typescript
// Get logs from hook
const { sessions, serverLogs, claudeOperations, apiLogs } = useJacquesClient();

// Render multi-log panel conditionally
{showLogs && (
  <MultiLogPanel
    serverLogs={serverLogs}
    apiLogs={apiLogs}
    claudeOperations={claudeOperations}
  />
)}
```

**Toggle Button** (lines 164-176):
- Located in sidebar footer
- Saves preference to localStorage (`jacques-show-logs`)
- Visual feedback: Icon color changes when enabled

**Positioning** (in App.tsx routes):
- MultiLogPanel is always in the layout
- Positioned absolutely at bottom (MultiLogPanel.tsx line 738)
- z-index: 100 (above main content but below modals)

---

### **6. API Log Collection**

**Location**: `/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts` (lines 255-295)

**Capture Mechanism**:
```typescript
const server = createServer(async (req, res) => {
  const startTime = Date.now();
  
  // Wrap writeHead to capture response status
  const originalWriteHead = res.writeHead.bind(res);
  let responseStatus = 200;
  res.writeHead = (statusCode, ...args) => {
    responseStatus = statusCode;
    return originalWriteHead(statusCode, ...args);
  };
  
  // Log when response finishes
  res.on('finish', () => {
    if (onApiLog && url.startsWith('/api/')) {
      onApiLog({
        method,
        path: url.split('?')[0],
        status: responseStatus,
        durationMs: Date.now() - startTime,
        timestamp: Date.now(),
      });
    }
  });
});
```

**Key Points**:
- Only logs `/api/` routes (line 272)
- Measures duration from request start to response finish
- Removes query strings from path (line 275)
- Callback provided to start-server.ts line 307-309

---

### **7. Claude Operation Logging**

**Location**: `/Users/gole/Desktop/jacques-context-manager/server/src/start-server.ts` (lines 120-124)

```typescript
ClaudeOperationLogger.onOperation = (op) => {
  logger.log(`Claude operation: ${op.operation} (${op.inputTokens} in, ${op.outputTokens} out, ${op.durationMs}ms)`);
  wsServer.broadcastClaudeOperation(op);
};
```

**Source**: `@jacques/core` package - external operation tracking

**Operation Structure** (gui/src/types.ts lines 92-131):
- `id`, `timestamp`, `operation`, `phase`, `inputTokens`, `outputTokens`
- `success`, `errorMessage`
- Token estimates, tool calls, duration metrics
- Sent in two phases: 'start' and 'complete'

---

### **8. Multi-Log Panel UI Rendering**

**Tabs Rendered** (MultiLogPanel.tsx lines 614-621):
1. **All tab** (lines 527-612):
   - Merges and sorts all three log types by timestamp
   - Color-coded by source (server=gray, api=green, claude=accent)

2. **Server tab** (lines 277-296):
   - Shows console logs with level icons (●, ⚠, ✕)
   - Color-coded by level (info=muted, warn=yellow, error=red)
   - Source prefix extracted from message

3. **API tab** (lines 298-316):
   - HTTP method, path, status code, duration
   - Status code coloring: green (2xx), yellow (4xx), red (5xx)

4. **Claude tab** (lines 318-438):
   - Two-phase operation display
   - Start: shows estimated token counts
   - Complete: shows actual input/output tokens, tools called, errors
   - Debug button fetches detailed data from `/api/claude/operations/{id}/debug`

---

### **9. Data Types**

**Server-Side Types** (`server/src/types.ts`):
```typescript
interface ServerLogMessage {
  type: 'server_log';
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  source: string;
}

interface ApiLogMessage {
  type: 'api_log';
  method: string;
  path: string;
  status: number;
  durationMs: number;
  timestamp: number;
}

interface ClaudeOperationMessage {
  type: 'claude_operation';
  operation: ClaudeOperation;
}
```

**GUI Types** (`gui/src/types.ts`):
- `ServerLog` (lines 10-16, same as ServerLogMessage minus type field)
- `ApiLog` (lines 154-165)
- `ClaudeOperation` (lines 92-131)

---

### **10. Key Code Locations Summary**

| Component | Location | Lines | Purpose |
|-----------|----------|-------|---------|
| MultiLogPanel UI | `gui/src/components/MultiLogPanel.tsx` | 1-1034 | Main panel rendering |
| Log Panel (legacy) | `gui/src/components/LogPanel.tsx` | 1-235 | Simpler single-log component |
| WebSocket Hook | `gui/src/hooks/useJacquesClient.ts` | 1-340 | Browser WebSocket client |
| Layout Integration | `gui/src/components/Layout.tsx` | 18, 31, 187-193 | Panel mounting |
| Server Logger | `server/src/logger.ts` | 1-136 | Console interception |
| WebSocket Server | `server/src/websocket.ts` | 155-169 | Broadcast mechanism |
| Startup Init | `server/src/start-server.ts` | 282-288 | Log listener setup |
| API Log Capture | `server/src/http-api.ts` | 256-295 | Request logging |

---

### **11. Data Flow Diagram**

```
Console Output (server)
    ↓
startLogInterception() [logger.ts:83]
    ↓
createLogMessage() [logger.ts:30]
    ↓
broadcastLog() [logger.ts:62]
    ↓
addLogListener() callbacks [logger.ts:118-121]
    ↓
start-server.ts: onServerLog handler [line 286]
    ↓
wsServer.broadcast(logMessage) [websocket.ts:155]
    ↓
JSON.stringify → WebSocket client.send() [websocket.ts:157-163]
    ↓
BrowserJacquesClient.onmessage [useJacquesClient.ts:55]
    ↓
handleMessage() → dispatch callback [useJacquesClient.ts:90-129]
    ↓
setServerLogs() state update [useJacquesClient.ts:268-277]
    ↓
useJacquesClient hook returns serverLogs [useJacquesClient.ts:328]
    ↓
Layout.tsx: pass to MultiLogPanel [line 189]
    ↓
MultiLogPanel.renderServerLogs() [MultiLogPanel.tsx:277]
    ↓
UI Display
```

---

### **12. Recent Changes to Be Aware Of**

The codebase shows:
1. **MultiLogPanel** is the primary log display component (replaced older LogPanel)
2. **Log types are unified**: All three log categories (server, API, Claude) flow through the same broadcast mechanism
3. **WebSocket server** on port 4242 is the backbone (not HTTP polling)
4. **GUI integration** in Layout.tsx shows logs are always part of main interface with toggle
5. **TypeScript types** are duplicated in GUI for browser compatibility (no Node.js APIs)

---

### **Potential Issues to Investigate**

Based on the code structure, if logs aren't appearing:

1. **Check WebSocket connection** (useJacquesClient.ts:39-66):
   - Is `ws://localhost:4242` reachable?
   - Check browser console for WebSocket errors

2. **Verify log interception started** (start-server.ts:283):
   - Is `startLogInterception()` being called?
   - Check for errors in console interception setup

3. **Check listener registration** (start-server.ts:286-288):
   - Is `addLogListener` callback firing?
   - Are broadcasts reaching WebSocket clients?

4. **Verify GUI is receiving messages** (useJacquesClient.ts:268-277):
   - Add logging in `onServerLog` handler
   - Check state update in `setServerLogs`

5. **Check MultiLogPanel mounting** (Layout.tsx:187-193):
   - Is `showLogs` state true?
   - Is MultiLogPanel being rendered?