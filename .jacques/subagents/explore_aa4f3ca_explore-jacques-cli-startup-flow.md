# Explore: Explore jacques CLI startup flow

> Session: `fe1d3ee6-9813-4e42-bebf-ac5170fee6fb`
> Date: 2026-01-31
> Tokens: ~45 255

---

Perfect! Now I have a comprehensive understanding of the architecture. Let me create a detailed report of my findings.

## Architecture Analysis Report: Jacques CLI and Server

Based on my thorough exploration of the codebase, here's how the `jacques` command starts and what processes it manages:

### Overview

Jacques uses a **three-process architecture**:

```
Hooks (Python/Bash) → Unix Socket (/tmp/jacques.sock)
                ↓
         Jacques Server (Node.js/TypeScript, port 4242 WebSocket)
                ↓
      Dashboard CLI (Ink/React, TTY required) OR other clients
```

### 1. Command Entry Point: Dashboard CLI (`dashboard/src/cli.ts`)

**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/cli.ts` (lines 1-284)

The `jacques` command is a **standalone CLI tool** with multiple subcommands:

```bash
jacques                      # Main dashboard (default, requires TTY)
jacques dashboard            # Start interactive TUI
jacques status               # One-shot status check
jacques list                 # JSON list of sessions
jacques search <query>       # Search archived conversations
jacques archive-stats        # Show archive statistics
```

**Key observations**:
- **Lines 24**: Server URL is configurable: `process.env.JACQUES_SERVER_URL || 'ws://localhost:4242'`
- **Lines 29-53**: Dashboard requires TTY (interactive terminal). Uses **alternate screen buffer** (`\x1b[?1049h`/`\x1b[?1049l`) to preserve terminal state
- **Lines 58-108**: `status` and `list` commands are **lightweight WebSocket clients** - they connect to the server, get initial state, then disconnect
- **Lines 193-264**: Search functionality is **local** (doesn't go through server) - reads from `~/.jacques/archive/` directly
- **Dashboard is just a client** - it does NOT start or manage the server process

### 2. The Server: Standalone Process (`server/src/server.ts`)

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/server.ts` (lines 1-428)

This is a **separate, independent Node.js process** that:

1. **Listens on Unix socket** (`/tmp/jacques.sock`) for hook events (lines 45-52)
2. **Runs WebSocket server** on port 4242 for dashboard clients (lines 55-58)
3. **Manages session state** through `SessionRegistry` (line 37)
4. **Broadcasts updates** to all connected clients in real-time (lines 139-163 in websocket.ts)

**Key components**:

| Component | Purpose | File |
|-----------|---------|------|
| UnixSocketServer | Receives newline-delimited JSON from hooks | unix-socket.ts |
| JacquesWebSocketServer | Broadcasts to connected clients | websocket.ts |
| SessionRegistry | Manages sessions, context metrics, focus state | session-registry.ts |
| FocusWatcher | Monitors terminal focus changes | focus-watcher.ts |

**Event flow** (lines 70-95):
```typescript
HookEvent → switch(event.event) → handler function
- session_start → registerSession()
- activity → updateActivity()
- context_update → updateContext()
- idle → setSessionIdle()
- session_end → unregisterSession()
```

**Server startup** (lines 328-373):
1. Unix socket server starts (line 337)
2. WebSocket server starts (line 340)
3. Session cleanup starts (line 343)
4. Terminal focus watcher starts (lines 346-357)

### 3. WebSocket Server Architecture

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/websocket.ts` (lines 1-231)

**Structure**:
- Single `WebSocketServer` instance listening on port 4242 (line 64)
- Maintains set of connected clients (line 41)
- Uses `StateProvider` pattern to inject current session state (lines 30-56)
- Handles three message types from clients: `select_session`, `trigger_action`, `toggle_autocompact`

**Broadcast types** (lines 139-187):
```typescript
- initial_state: Sent when client connects
- session_update: When any session changes
- session_removed: When a session ends
- focus_changed: When focused session changes
```

### 4. Client Library (`core/src/client/websocket-client.ts`)

**File**: `/Users/gole/Desktop/jacques-context-manager/core/src/client/websocket-client.ts` (lines 1-239)

**Key features**:
- Pure WebSocket client using `ws` library
- Automatic reconnection with exponential backoff (lines 134-148)
- Event emitter interface for applications to subscribe to updates (lines 16-26)
- Methods: `connect()`, `disconnect()`, `selectSession()`, `toggleAutoCompact()` (lines 49-201)

### 5. Process Management

**Development workflow**:

```bash
# Terminal 1: Start server (separate process)
npm run start:server
# Output: "Jacques server started successfully"

# Terminal 2: Start dashboard (standalone CLI, connects to server)
npm run start:dashboard  # or just 'jacques' if installed globally

# Terminal 3: Can run multiple CLI commands concurrently
npm run status
npm run list
jacques search "query"
```

**Package.json scripts** (root `package.json`, lines 13-36):
```json
"start:server": "cd server && npm start"      // Starts node dist/server.js
"start:dashboard": "cd dashboard && node dist/cli.js"
"start": "npm run start:server"              // Default is server
"dashboard": "cd dashboard && node dist/cli.js"
```

**Server package.json** (lines 10-13):
```json
"start": "node dist/server.js",              // Main server entry point
"start:mcp": "node dist/mcp/server.js",     // MCP server (separate)
```

### 6. Critical Findings for HTTP API Integration

**YES, you CAN add HTTP API functionality to the existing server process:**

1. **Server is already "just waiting"** - It currently listens on:
   - Unix socket: `/tmp/jacques.sock`
   - WebSocket: `ws://localhost:4242`

2. **Easy to add HTTP server** - The existing `server.ts` is the main orchestrator with:
   - SessionRegistry (line 37) - already has `getAllSessions()`, `getSession()`, etc.
   - WebSocket server running on port 4242 - can coexist with HTTP server on port (e.g., 3000)
   - No process management - it's a single, long-running Node process

3. **State is already centralized** - SessionRegistry is the single source of truth

4. **Architecture is clean for expansion** (lines 60-65):
   ```typescript
   wsServer.setStateProvider({
     getAllSessions: () => registry.getAllSessions(),
     getFocusedSessionId: () => registry.getFocusedSessionId(),
     getFocusedSession: () => registry.getFocusedSession(),
   });
   ```
   This pattern could easily be extended to serve HTTP endpoints.

5. **No embedded server in dashboard** - Dashboard is purely a client that connects to the server via WebSocket. It has no process control logic.

### Recommendations for HTTP API

To add HTTP API endpoints to the existing server:

1. **Add Express.js or similar** to `server/src/server.ts` alongside WebSocket
2. **Reuse the same SessionRegistry instance** - no need for separate server
3. **Mirror WebSocket endpoints as REST endpoints**:
   - `GET /api/sessions` → all sessions
   - `GET /api/sessions/:id` → specific session
   - `POST /api/sessions/:id/focus` → select session
   - `GET /api/archive` → search (or delegate to core module)

4. **Port configuration**: WebSocket on 4242, HTTP on configurable port (default 3000)
5. **No impact on dashboard** - it will continue working via WebSocket

### File Structure Summary

```
jacques-context-manager/
├── server/src/
│   ├── server.ts          # Main orchestrator (add HTTP here)
│   ├── websocket.ts       # WebSocket server (can coexist with HTTP)
│   ├── unix-socket.ts     # Hook receiver
│   ├── session-registry.ts # State management (core logic)
│   ├── types.ts           # Shared types
│   └── ...
├── dashboard/src/
│   ├── cli.ts             # CLI entry point (CLIENT ONLY)
│   ├── client/
│   │   └── websocket-client.ts  # WebSocket client
│   └── ...
├── core/src/
│   ├── client/           # Reusable client library
│   └── ... (archive, context, session utilities)
└── hooks/                # Python/Bash scripts (send events to server)
```

**The key insight**: The dashboard and CLI are **clients only**. The server is a completely separate, independently-running process that multiple clients can connect to simultaneously. Adding HTTP API endpoints to this existing server would not require any changes to the dashboard or CLI - they would continue working as-is.