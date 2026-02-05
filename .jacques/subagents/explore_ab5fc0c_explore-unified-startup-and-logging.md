# Explore: Explore unified startup and logging

> Session: `fe1d3ee6-9813-4e42-bebf-ac5170fee6fb`
> Date: 2026-01-31
> Tokens: ~46 225

---

Excellent. I now have a comprehensive understanding of the codebase. Let me create a detailed report on my findings.

## Exploration Report: Jacques Context Manager - Unified Startup Approach

### Current Architecture Overview

The Jacques project currently has **three independent components** that need to be started separately:

1. **Jacques Server** (Node.js/TypeScript) - Runs on port 4242
   - Listens on Unix socket `/tmp/jacques.sock` for hook events
   - Broadcasts WebSocket messages to connected clients
   - Uses `console.log/error` for all logging (stdout/stderr)

2. **GUI Dev Server** (Vite/React) - Runs on port 5173
   - React frontend connecting to Jacques server via WebSocket
   - Dashboard component displays sessions
   - Connects to server at `ws://localhost:4242` (configurable via `VITE_JACQUES_SERVER_URL`)

3. **Dashboard CLI** (Ink/React) - Optional terminal UI
   - Independent TUI for viewing sessions in terminal

---

### Current Logging Patterns

**Server Logging (server/src/server.ts):**
- All logging uses standard `console.log()`, `console.error()`, and `console.warn()`
- Logs are prefixed with module names: `[Server]`, `[WebSocket]`, `[UnixSocket]`, `[FocusWatcher]`
- Examples:
  ```typescript
  console.log('[Server] Jacques server started successfully');
  console.log(`[Server] Unix socket: ${UNIX_SOCKET_PATH}`);
  console.log(`[WebSocket] Client connected`);
  ```

**Current Issues:**
- Server logs go directly to stdout/stderr (visible only in the terminal where server is running)
- GUI has no visibility into server activity (no logs, errors, or debug info)
- No centralized logging system or log aggregation
- No structured logging (just string prefixes)

---

### Component Startup Flow

**Root package.json Scripts:**
```json
{
  "start:server": "cd server && npm start",      // Node dist/server.js
  "start:gui": "cd gui && npm run dev",          // Vite dev server
  "start:dashboard": "cd dashboard && node dist/cli.js",
  "start": "npm run start:server"                // Only runs server
}
```

**Server Startup (server/package.json):**
```json
{
  "start": "node dist/server.js",
  "dev": "tsc --watch"
}
```

**GUI Startup (gui/package.json):**
```json
{
  "dev": "vite"  // Auto-opens browser on port 5173
}
```

**Vite Config (gui/vite.config.ts):**
```typescript
server: {
  port: 5173,
  open: true  // Auto-opens browser
}
```

---

### How GUI Connects to Server

**useJacquesClient Hook (gui/src/hooks/useJacquesClient.ts):**

```typescript
// WebSocket URL - hardcoded with env override
const SERVER_URL = import.meta.env.VITE_JACQUES_SERVER_URL || 'ws://localhost:4242';

class BrowserJacquesClient {
  connect() {
    this.ws = new WebSocket(SERVER_URL);
    // Auto-reconnect with exponential backoff (up to 10 attempts)
  }
}
```

**Connection States:**
- GUI shows connection status (green dot = connected, red dot = disconnected)
- Auto-reconnects on failure with max 10 attempts
- Reconnect delay: exponential backoff from 1s to 30s max

**Dashboard.tsx displays:**
- Connection status indicator in header
- Error message shows disconnected state

---

### Options for Consolidating Startup

#### **Option 1: npm concurrently (Recommended - Simplest)**

**Pros:**
- Single command: `npm run dev` starts both server and GUI
- Both processes visible in same terminal
- Simple to implement
- Logs from both processes visible together (though interleaved)

**Cons:**
- Logs are interleaved and hard to parse
- Need to scroll up to see server startup output
- Killing both requires Ctrl+C

**Implementation:**
```bash
npm install --save-dev concurrently
```

Then in root package.json:
```json
{
  "dev": "concurrently \"npm run dev:server\" \"npm run dev:gui\"",
  "dev:server": "cd server && npm run dev",
  "dev:gui": "cd gui && npm run dev"
}
```

---

#### **Option 2: Custom Node.js Launcher (Recommended - Best Control)**

**Pros:**
- Full control over startup order and process management
- Can manage process communication
- Can capture and aggregate logs
- Can detect when server is ready before starting GUI
- Clean shutdown of all processes
- Can forward server logs to GUI

**Cons:**
- More code to maintain
- Needs to be a .js/.ts file in root

**Key Features:**
- Start server first, wait for WebSocket ready message
- Then start GUI (and auto-open browser)
- Capture both process outputs
- Aggregate logs with timestamps
- Clean process management on Ctrl+C

---

#### **Option 3: Docker Compose (Over-engineered for local dev)**

**Pros:**
- Reproducible environments
- Proper process isolation

**Cons:**
- Overkill for development
- Slower startup
- Requires Docker

---

#### **Option 4: shell script (Unix/Linux only, fragile)**

**Pros:**
- Simple bash solution

**Cons:**
- Not cross-platform (Windows breaks)
- Hard to manage background processes
- Difficult cleanup

---

### Options for Displaying Server Logs in GUI

#### **Option A: Broadcast Logs via WebSocket (Recommended)**

**Architecture:**
```
Server logs → Captured by launcher → Stored in memory ring buffer
    ↓
WebSocket server adds new message type: 'server_log'
    ↓
GUI receives and displays in sidebar/modal
```

**Benefits:**
- Real-time log viewing in GUI
- GUI shows server status/errors
- No file I/O needed
- Clean separation

**Implementation:**
1. Capture stdout/stderr from server process
2. Send log entries to WebSocket server
3. Add `ServerLogMessage` type to types.ts
4. WebSocket broadcasts to all connected clients
5. GUI displays in scrollable log panel

**GUI Display Options:**
- **Option A1**: Right sidebar with latest 50 logs (expandable)
- **Option A2**: Modal window triggered by button
- **Option A3**: Bottom panel in Dashboard (collapsible)
- **Option A4**: Dedicated "Logs" page in GUI

**Estimated Token Cost for GUI Display:**
- ~200-300 tokens for new React component
- ~100 tokens for WebSocket message handling
- ~50 tokens for type definitions

---

#### **Option B: Write Logs to File + Serve via HTTP**

**Benefits:**
- Persistent log history
- Can read past logs

**Cons:**
- More I/O
- Need file cleanup
- Requires HTTP endpoint

---

#### **Option C: Terminal Output Capture in Dev Launcher**

**Benefits:**
- All logs visible in terminal during development
- No GUI changes needed
- Good for debugging

**Cons:**
- Logs not accessible in GUI after server starts
- Interleaved output

---

### Recommended Implementation Path

**Phase 1: Unified Startup (Quick Win)**
1. Add `concurrently` to root package.json
2. Create `npm run dev` script combining server + GUI
3. Test that both services start and connect automatically
4. Update CLAUDE.md with new startup instructions

**Phase 2: Server Log Display (Enhanced Debugging)**
1. Create custom Node.js launcher (`scripts/dev-launcher.js`) that:
   - Starts server, captures output
   - Waits for "WebSocket: Listening on port 4242"
   - Then starts GUI
   - Manages both processes with clean shutdown
2. Add `ServerLogMessage` type to `server/src/types.ts`
3. Launcher sends logs via WebSocket
4. Create `LogPanel` React component in GUI
5. Add log display to Dashboard or new "Debug" page

**Phase 3: Advanced Features**
- Log filtering (by level: ERROR, WARN, INFO, DEBUG)
- Log persistence to `.jacques/logs/`
- Timestamp formatting
- Color-coded log levels

---

### File Locations to Modify

| File | Purpose | Changes |
|------|---------|---------|
| `/package.json` | Root scripts | Add `dev`, `dev:server`, `dev:gui` |
| `server/src/types.ts` | Type definitions | Add `ServerLogMessage` interface |
| `server/src/websocket.ts` | WS broadcast | Add log message handler |
| `server/src/server.ts` | Server startup | Export log event emitter or function |
| `gui/src/hooks/useJacquesClient.ts` | Client hook | Handle `server_log` message type |
| `gui/src/types.ts` | GUI types | Add `ServerLogMessage` |
| `gui/src/pages/Dashboard.tsx` | Display | Add log panel component |
| `scripts/dev-launcher.js` | **NEW** | Custom launcher (Option 2 only) |
| `CLAUDE.md` | Documentation | Update development section |

---

### Summary: Current State vs. Desired State

| Aspect | Current | After Phase 1 | After Phase 2 |
|--------|---------|--------------|--------------|
| **Startup** | `npm run start:server` + `npm run start:gui` (2 terminals) | `npm run dev` (1 terminal) | `npm run dev` (1 terminal, managed) |
| **Server Logs** | Terminal only | Terminal only | Terminal + GUI panel |
| **Server Visibility** | None in GUI | Connection status only | Full logs + status |
| **Shutdown** | Ctrl+C in each terminal | Single Ctrl+C | Single Ctrl+C |
| **Complexity** | Simple | Simple | Moderate |

---

### Architecture Diagram: After Implementation

```
┌─────────────────────────────────────────────────────────┐
│  Terminal: npm run dev                                   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────┐   ┌──────────────────────┐   │
│  │  Jacques Server      │   │  Vite Dev Server     │   │
│  │  (Node.js)           │   │  (Port 5173)         │   │
│  │  Port 4242           │   │                      │   │
│  │  Unix socket         │   │  Auto-opens browser  │   │
│  │  ├─ stdout captured  │   │                      │   │
│  │  └─ stderr captured  │   │                      │   │
│  │                      │   │                      │   │
│  └────────┬─────────────┘   └──────────┬───────────┘   │
│           │                             │                │
│           │ WebSocket logs              │ WebSocket      │
│           │ (server_log messages)       │ (session data) │
│           │                             │                │
│           └─────────────┬───────────────┘                │
│                         │                                │
│                    ┌────▼───────────┐                   │
│                    │  WS Server     │                   │
│                    │  Port 4242     │                   │
│                    └────┬───────────┘                   │
│                         │                                │
│                         │ Broadcast to all clients      │
│                         │                                │
│                    ┌────▼───────────┐                   │
│                    │  Browser       │                   │
│                    │  React GUI     │                   │
│                    │  ├─ Dashboard  │                   │
│                    │  ├─ Sessions   │                   │
│                    │  └─ Logs panel │                   │
│                    └────────────────┘                   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

### Next Steps

1. **Clarify Priority**: Which option appeals to you most?
   - Simple unified startup only (concurrently)?
   - Or full launcher with server log display in GUI?

2. **Scope Decision**: Should I proceed with implementation, or just provide the plan?

3. **Log Display Location**: If doing Phase 2, where should logs appear?
   - Right sidebar?
   - Separate "Debug" page?
   - Modal overlay?
   - Bottom panel?