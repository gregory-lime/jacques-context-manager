# Explore: Explore embedding server in dashboard

> Session: `fe1d3ee6-9813-4e42-bebf-ac5170fee6fb`
> Date: 2026-01-31
> Tokens: ~57 258

---

Perfect! Now I have a comprehensive understanding. Let me create a detailed report with the findings and recommendations.

## Analysis Report: Embedding Server in Dashboard CLI

Based on my exploration of the codebase, here's a detailed analysis of making the Dashboard CLI start the server internally:

---

### **1. Current Architecture**

**Separation of Concerns:**
- **Server** (`server/src/server.ts`): Orchestrator for Unix socket + WebSocket servers
- **Dashboard** (`dashboard/src/cli.ts`): CLI that connects as a WebSocket client
- **GUI** (`gui/`): Web app running on port 5173 (Vite dev server)
- **Hooks**: Python/Bash scripts that send events via Unix socket

**Current Workflow:**
```
User runs: jacques (TUI dashboard)
  ↓
Dashboard CLI connects to server at ws://localhost:4242
  ↓
Server must already be running (separate process)
```

---

### **2. Can Server Be Imported and Started from Dashboard?**

**YES - The server code is fully modular and exportable.**

**Evidence:**
- `server.ts` has clean class-based architecture:
  - `UnixSocketServer` (class with `.start()` and `.stop()`)
  - `JacquesWebSocketServer` (class with `.start()` and `.stop()`)
  - `SessionRegistry` (class managing state)
- All components use TypeScript with proper interfaces
- Both `start()` and `stop()` are Promise-based, allowing graceful lifecycle management
- Server already uses environment variables for configuration (`JACQUES_SOCKET_PATH`, `JACQUES_WS_PORT`)

**Current Exports in server.ts:**
```typescript
// Line 37-58: Components are instantiated, not exported
const registry = new SessionRegistry();
const unixServer = new UnixSocketServer({...});
const wsServer = new JacquesWebSocketServer({...});

// Lines 328-373: Single exported start() function
async function start(): Promise<void> {...}

// Lines 378-408: Single exported shutdown() function
async function shutdown(): Promise<void> {...}

// Line 427: Direct execution
start();
```

**Key Issue:** The server is designed as a standalone CLI tool, not as an importable library module. The components ARE importable, but the orchestration logic is embedded in `server.ts`.

---

### **3. What Changes Are Needed?**

#### **Option A: Export Server Factory (Recommended)**

Create a new file `server/src/start-server.ts` that exports the server orchestration:

```typescript
export async function startEmbeddedServer(): Promise<{
  stop: () => Promise<void>;
}> {
  // Extract orchestration from server.ts
  // Return stop function for dashboard cleanup
}
```

**Changes required:**
1. Extract server startup logic from `server.ts` into `start-server.ts`
2. Export `SessionRegistry`, `UnixSocketServer`, `JacquesWebSocketServer` classes
3. Create factory function that returns stop handler
4. Update `server.ts` to use the factory (no changes to existing behavior)

#### **Option B: Minimal - Start Server Process from Dashboard**

Instead of embedding, spawn the server as a child process:

```typescript
// In dashboard/src/cli.ts
const serverProcess = spawn('node', [
  require.resolve('@jacques/server/dist/server.js')
]);
```

**Pros:** Minimal changes, clean separation
**Cons:** Extra process to manage, harder to debug

---

### **4. Dashboard Integration Points**

**Dashboard Server Connection:**
- Location: `/dashboard/src/hooks/useJacquesClient.ts` (line 12)
- Current: `const SERVER_URL = process.env.JACQUES_SERVER_URL || 'ws://localhost:4242'`
- Flow: React hook connects on component mount, handles reconnection

**Startup Sequence:**
```
jacques (CLI runs)
  ↓
startDashboard() [line 29 in cli.ts]
  ↓ (would need to insert here)
  Embedded server starts: Unix socket + WebSocket ready
  ↓
Enter alternate screen buffer [line 42]
  ↓
Render Ink app with useJacquesClient hook
  ↓
Dashboard connects to localhost:4242
```

**Key:** The `useJacquesClient` hook already has built-in reconnection logic, so it can handle timing where server isn't ready yet.

---

### **5. W Key to Open GUI**

**Current Limitation:** Dashboard cannot run inline in Claude Code (requires TTY). But the GUI (web app) CAN be accessed from any browser.

**Implementation Options:**

#### **Option 1: Open Browser with `open` Command (Recommended)**
```typescript
// In App.tsx handleMenuSelect, add case "W":
case "W": {
  const { spawn } = await import("child_process");
  const platform = process.platform;
  const command = platform === "darwin" ? "open" : 
                   platform === "win32" ? "start" : "xdg-open";
  spawn(command, ["http://localhost:5173"]);
  showNotification("Opening GUI in browser...");
  break;
}
```

#### **Option 2: With Auto-Start GUI**
If dashboard starts server internally, also auto-start GUI on port 5173:
```typescript
// Same place, but also spawn GUI dev server if not running
```

**User Experience:**
```
jacques (start)
  ↓
Dashboard TUI (localhost:4242 via WebSocket)
  ↓
User presses W
  ↓
Browser opens to http://localhost:5173 (GUI)
  ↓
Both connect to same server, share real-time state
```

---

### **6. Architecture After Changes**

**New Flow:**
```
User runs: jacques
  ↓
startDashboard()
  ↓
start embedded server:
  • Unix socket on /tmp/jacques.sock
  • WebSocket on ws://localhost:4242
  • Registry manages sessions
  • Focus watcher active
  ↓
Enter TUI (Ink/React)
  ↓
useJacquesClient connects to ws://localhost:4242
  ↓
User presses W → Open http://localhost:5173 in browser
  ↓
GUI also connects to ws://localhost:4242
  ↓
Both TUI and GUI share real-time session state
  ↓
User presses Q to quit dashboard
  ↓
Clean shutdown:
  • TUI exits
  • WebSocket closes
  • Unix socket cleaned up
  • All watchers stopped
```

---

### **7. Critical Implementation Considerations**

#### **Graceful Shutdown**
The server has excellent cleanup already:
- Line 378-408 in `server.ts`: `shutdown()` function
- Stops all components in correct order
- Clean Unix socket removal

**Required:** Dashboard must call `stop()` when exiting (useApp hook, process signals)

#### **Logging**
Server logs to console currently (line 330 banner, debug messages)

**Options:**
1. Redirect server logs to file in `.jacques/` directory
2. Show server logs in TUI status bar
3. Silent mode with optional verbosity flag

#### **Error Handling**
- If Unix socket already exists → server cleans it up (line 48-54)
- If WebSocket port in use → need error handling and fallback
- If server fails → dashboard must inform user and exit gracefully

#### **Process Signals**
Dashboard must forward SIGINT/SIGTERM to server cleanup:
```typescript
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});
```

---

### **8. File Organization Summary**

**Files to Create/Modify:**

| File | Action | Complexity |
|------|--------|-----------|
| `server/src/start-server.ts` | New export module | Medium |
| `server/src/server.ts` | Import from start-server.ts | Low |
| `dashboard/src/cli.ts` | Import & start server before TUI | Medium |
| `dashboard/src/components/App.tsx` | Add W key handler | Low |
| `dashboard/package.json` | Add server as dependency | Low |

---

### **9. Test Scenarios**

After implementation:

1. **Basic Start**: `jacques` starts server and TUI
2. **No CLI Inline**: Verify server runs independently in background
3. **W Key**: Opens browser to GUI correctly
4. **Graceful Exit**: `Q` key exits cleanly, no orphaned processes
5. **Socket Cleanup**: No stale `/tmp/jacques.sock` on restart
6. **Multiple Dashboards**: Can user run `jacques` twice? (Should fail gracefully)
7. **Port Conflict**: What if 4242 is taken? (Need error handling)

---

### **10. Summary: Can It Be Done?**

**YES - All necessary components exist:**

✅ Server is modular and importable  
✅ Clean start/stop interface  
✅ Dashboard hook handles reconnection  
✅ GUI can connect to same server  
✅ Browser opening is trivial  
✅ Shutdown handling is mature  

**Main Work:** Refactor server orchestration into an exportable module and integrate it into dashboard CLI startup.

**Effort:** ~2-3 hours for a clean implementation with proper error handling and testing.