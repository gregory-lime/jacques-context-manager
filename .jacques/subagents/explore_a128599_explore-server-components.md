# Explore: Explore server components

> Session: `6bd87c3f-59ef-4213-897e-2300af5f215e`
> Date: 2026-02-02
> Tokens: ~60 930

---

Perfect! Now I have a comprehensive understanding of the code. Let me create a detailed analysis report.

## Server Architecture Analysis - Jacques Context Manager

I've completed a thorough analysis of the Jacques server codebase. Here's what I found:

### OVERALL ARCHITECTURE

**Current Structure (4,604 total lines across 13 TypeScript files):**

```
┌─────────────────────────────────────────────┐
│  Claude Code/Cursor (via hooks)             │
└────────────┬────────────────────────────────┘
             │ newline-delimited JSON
             ▼
    ┌────────────────────┐
    │  Unix Socket       │ (unix-socket.ts: 185 lines)
    │  /tmp/jacques.sock │ Listens, parses, validates events
    └─────────┬──────────┘
              │ HookEvent
              ▼
    ┌────────────────────────────┐
    │  start-server.ts (562 lines)│ ORCHESTRATOR
    │  Event dispatcher & routing │ Wires all components
    └─────────┬──────────────────┘
              │
      ┌───────┼───────┬──────────┐
      ▼       ▼       ▼          ▼
   REGISTRY  WEBSOCKET LOGGER HTTP-API
   (475)     (280)     (135)    (1,131)
   State     Dashboard  Logs    Handlers
```

---

### KEY FINDINGS: SPECIFIC ISSUES

#### 1. **TIGHT COUPLING - Event Handling Duplication** ⚠️
**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/start-server.ts`
**Lines**: 216-247, 279-283, 292

**Problem**: Every event handler follows the same pattern, **repeating the broadcast logic**:
```typescript
// Line 216-219: Session start handler
function handleSessionStart(event: SessionStartEvent): void {
  const session = registry.registerSession(event);
  wsServer.broadcastSessionUpdate(session);
  broadcastFocusChange();        // ← Pattern repeats
}

// Line 230-235: Activity handler (SAME PATTERN)
function handleActivity(event: ActivityEvent): void {
  const session = registry.updateActivity(event);
  if (session) {
    wsServer.broadcastSessionUpdate(session);
    broadcastFocusChange();      // ← Same broadcast pattern
  }
}

// Line 241-247: Context update handler (SAME PATTERN)
function handleContextUpdate(event: ContextUpdateEvent): void {
  const session = registry.updateContext(event);
  if (session) {
    wsServer.broadcastSessionUpdate(session);
    broadcastFocusChange();      // ← Same broadcast pattern
  }
}
```

**Impact**: 
- Changes to broadcast strategy require modifications in 3 places (and more in client message handling)
- Easy to miss a broadcast when adding new event types
- Violates DRY principle

**Refactoring Opportunity**: Extract a `broadcastSessionChange(session)` helper that combines both broadcasts.

---

#### 2. **MIXING CONCERNS - Event Dispatch Bloated** ⚠️
**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/start-server.ts`
**Lines**: 115-310 (entire `handleHookEvent` + `handleClientMessage` flow)

**Problem**: The main orchestrator combines:
- Event validation
- Registry mutations
- WebSocket broadcasting
- Handoff file watching lifecycle
- Auto-compact settings management
- Handoff context extraction

All in **one 562-line file** with nested functions.

**Lines breakdown**:
- Lines 115-143: `handleHookEvent` - Event type dispatching (switch statement)
- Lines 148-211: Handoff watcher management (3 functions)
- Lines 216-283: 5 separate event handlers, each calling registry + broadcast
- Lines 288-310: Client message handling
- Lines 317-390: Handoff context extraction (complex async logic)
- Lines 395-442: Auto-compact toggle (file I/O + settings mutation)

**Impact**: 
- Cognitive load: 6+ responsibilities in one module
- Hard to test: Private nested functions
- Hard to extend: Adding new event types requires modifying main orchestrator

**Refactoring Opportunity**: 
1. Extract event handlers into a separate `EventHandler` class
2. Move handoff watching to its own module (`HandoffWatcher`)
3. Move settings management to `SettingsManager`

---

#### 3. **ERROR HANDLING - Silent Failures** ⚠️
**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/logger.ts`
**Lines**: 70-76

```typescript
function broadcastLog(logMessage: ServerLogMessage): void {
  // ...
  for (const listener of listeners) {
    try {
      listener(logMessage);
    } catch {
      // Ignore listener errors    ← Silent swallowing
    }
  }
}
```

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/websocket.ts`
**Lines**: 256-262

```typescript
for (const client of this.clients) {
  try {
    client.close(1000, 'Server shutting down');
  } catch (err) {
    // Ignore errors during shutdown  ← Silent catch-all
  }
}
```

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/unix-socket.ts`
**Lines**: 111-116

```typescript
socket.on('error', (err) => {
  // Ignore connection reset errors during shutdown
  if (this.isShuttingDown) return;  // Context-dependent silent errors
  this.error(`[UnixSocket] Connection error: ${err.message}`);
});
```

**Impact**: 
- Difficult to debug: Errors in listener callbacks vanish silently
- Cascading failures: One bad listener crashes the whole notification chain
- Hard to monitor: No logging of listener exceptions

**Refactoring Opportunity**: 
1. Add error tracking: `logListenerErrors` flag
2. Create `SafeListener` wrapper with try-catch + logging
3. Use observer pattern with error boundaries

---

#### 4. **CONFIGURATION SCATTERED** ⚠️
**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/start-server.ts`
**Lines**: 37-41, 69-74

**Problem**: Constants and config defaults are:
- Scattered across multiple files
- Duplicated (e.g., `HANDOFF_FILENAME` only in start-server)
- Environment variable parsing mixed into function signatures

```typescript
// Line 37-41
const DEFAULT_UNIX_SOCKET_PATH = '/tmp/jacques.sock';
const DEFAULT_WS_PORT = 4242;
const DEFAULT_HTTP_PORT = 4243;
const CLAUDE_SETTINGS_PATH = join(homedir(), '.claude', 'settings.json');
const HANDOFF_FILENAME = '.jacques-handoff.md';

// Line 69-74
const {
  silent = false,
  unixSocketPath = process.env.JACQUES_SOCKET_PATH || DEFAULT_UNIX_SOCKET_PATH,
  wsPort = parseInt(process.env.JACQUES_WS_PORT || String(DEFAULT_WS_PORT), 10),
  httpPort = parseInt(process.env.JACQUES_HTTP_PORT || String(DEFAULT_HTTP_PORT), 10),
} = options;
```

**Also Line**: 433
```typescript
threshold: parseInt(process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE || '95', 10),
```

**Impact**: 
- Config scattered: Defaults in 5 places, env vars in 2 places
- No single source of truth for configuration
- Hard to change defaults or add new config options

**Refactoring Opportunity**: 
1. Create `config.ts` module with all defaults
2. Create `ConfigBuilder` class to handle env var parsing
3. Export single validated `Config` object

---

#### 5. **LOGGING ABSTRACTION LEAKY** ⚠️
**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/session-registry.ts`
**Lines**: 40-45

```typescript
private log: (...args: unknown[]) => void;
private warn: (...args: unknown[]) => void;

constructor(options: SessionRegistryOptions = {}) {
  this.log = options.silent ? () => {} : console.log.bind(console);
  this.warn = options.silent ? () => {} : console.warn.bind(console);
}
```

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/unix-socket.ts`
**Lines**: 37-47

```typescript
private log: (...args: unknown[]) => void;
private error: (...args: unknown[]) => void;
private warn: (...args: unknown[]) => void;

constructor(config: UnixSocketConfig) {
  // ...
  this.log = config.silent ? () => {} : console.log.bind(console);
  this.error = config.silent ? () => {} : console.error.bind(console);
  this.warn = config.silent ? () => {} : console.warn.bind(console);
}
```

**Also**: `websocket.ts` (lines 50-57), `focus-watcher.ts` (lines 130-131) have identical pattern.

**Pattern repeated**: 4 files, ~40 lines of identical boilerplate

**Impact**: 
- Code duplication: Same logging setup in 4 classes
- Tight coupling: Classes depend on `silent` config option
- Hard to change logging: Requires updates in 4 places

**Refactoring Opportunity**: 
1. Create `Logger` class with factory method
2. Use dependency injection: Pass logger instance instead of `silent` flag
3. Single source of logging behavior

---

#### 6. **WEBSOCKET CLIENTS SET - Memory Leak Risk** ⚠️
**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/websocket.ts`
**Lines**: 44-46, 125-132, 256-264

```typescript
export class JacquesWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();  // ← Manual tracking
  // ...

  private handleConnection(ws: WebSocket): void {
    this.log('[WebSocket] Client connected');
    this.clients.add(ws);    // ← Add

    // ...
    ws.on('close', () => {
      this.log('[WebSocket] Client disconnected');
      this.clients.delete(ws);  // ← Delete
    });

    ws.on('error', (err) => {
      this.error(`[WebSocket] Client error: ${err.message}`);
      this.clients.delete(ws);  // ← Delete in error handler
    });
  }

  stop(): Promise<void> {
    // ...
    for (const client of this.clients) {
      try {
        client.close(1000, 'Server shutting down');
      } catch (err) {
        // Ignore errors during shutdown
      }
    }
    this.clients.clear();
  }
}
```

**Problems**:
- Manual tracking: If `close` event doesn't fire, client stays in Set
- Race condition: Client could be added after `close()` begins
- No cleanup on exception paths
- `ws.readyState` checks scattered throughout (lines 140, 152, 329, 341, 376, 386, 425) - repeated state checking

**Refactoring Opportunity**: 
1. Use WeakSet to auto-clean dead references
2. Centralize readyState checking in `sendToClient()` helper
3. Add weak reference cleanup in close handler

---

#### 7. **SESSION REGISTRY - Complex Auto-Registration Logic** ⚠️
**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/session-registry.ts`
**Lines**: 144-271 (entire `updateContext` method)

**Problem**: The `updateContext` method is **128 lines** with multiple concerns:
- Auto-registration on first context_update
- Project name extraction (split logic appears 3 times: lines 158, 233, 241)
- Terminal key validation & updates
- Transcript path updates
- Multiple fallback strategies

**Repeated pattern - Project extraction**:
```typescript
// Line 158
const projectName = projectDir.split('/').filter(Boolean).pop() || 'Unknown Project';

// Line 233 (very similar)
const projectName = event.project_dir.split('/').filter(Boolean).pop();

// Line 241 (same pattern)
session.project = event.cwd.split('/').filter(Boolean).pop() || event.cwd;
```

**Terminal key matching** (lines 392-420):
```typescript
findSessionByTerminalKey(terminalKey: string): Session | null {
  const extractITermUUID = (key: string): string | null => {
    if (!key.startsWith('ITERM:')) return null;
    const parts = key.substring(6);
    if (parts.includes(':')) {
      return parts.split(':').pop() || null;
    }
    return parts;
  };
  // ... complex matching logic
}
```

**Impact**: 
- High cyclomatic complexity
- Hard to test: Method has 6+ paths
- Difficult to extract: Concerns are interleaved

**Refactoring Opportunity**: 
1. Extract `ProjectNameExtractor` utility
2. Extract `TerminalKeyMatcher` class
3. Separate auto-registration into dedicated method
4. Break `updateContext` into smaller, focused methods

---

#### 8. **INCONSISTENT ERROR RESPONSES** ⚠️
**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/start-server.ts`
**Lines**: 317-390 (handleGetHandoffContext)

**Problem**: Error responses duplicated with slightly different patterns:

```typescript
// Lines 323-332 (first error response)
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

// Lines 335-345 (second error response - identical pattern)
if (!session.transcript_path) {
  const errorResponse: HandoffContextErrorMessage = {
    type: 'handoff_context_error',
    session_id: request.session_id,
    error: 'Session has no transcript path',
  };
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(errorResponse));
  }
  return;
}

// Lines 380-388 (third error response - same pattern again)
error(`[Server] Failed to extract handoff context: ${err}`);
const errorResponse: HandoffContextErrorMessage = {
  type: 'handoff_context_error',
  session_id: request.session_id,
  error: `Failed to extract context: ${err instanceof Error ? err.message : String(err)}`,
};
if (ws.readyState === WebSocket.OPEN) {
  ws.send(JSON.stringify(errorResponse));
}
```

**Also Line 405**: 
```typescript
// Identical readyState check in handleToggleAutoCompact
if (ws.readyState === WebSocket.OPEN) {
  ws.send(JSON.stringify(response));
}
```

**Impact**: 
- Code duplication: Error pattern repeated 3+ times
- Inconsistency: Different error message formats
- Hard to maintain: Changes to error format require 3 updates

**Refactoring Opportunity**: 
1. Create `sendErrorResponse()` helper
2. Create `sendResponse()` helper that checks readyState
3. Centralize error message formatting

---

#### 9. **HANDOFF WATCHER LIFECYCLE MANAGEMENT** ⚠️
**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/start-server.ts`
**Lines**: 148-211

**Problem**: Watchers are stored in a Map but:
- Started and stopped manually at session lifecycle
- Project directory used as key, but not unique per session
- If two sessions share a project, second one overwrites watcher
- Watcher cleanup on error (line 170-171) doesn't verify watchers are truly stopped

```typescript
function startHandoffWatcher(projectDir: string, sessionId: string): void {
  if (!projectDir || handoffWatchers.has(projectDir)) {
    return;  // ← Won't start watcher if already watching
  }
  // ...
  handoffWatchers.set(projectDir, watcher);  // ← Uses projectDir as key
}

function stopHandoffWatcher(projectDir: string): void {
  const watcher = handoffWatchers.get(projectDir);  // ← Same key lookup
  if (watcher) {
    watcher.close();
    handoffWatchers.delete(projectDir);
  }
}
```

**Called in**: 
- Line 223: `startHandoffWatcher(projectDir, session.session_id);` (sessionStart)
- Line 266-267: `stopHandoffWatcher(projectDir);` (sessionEnd)

**Impact**: 
- Multiple sessions in same project can't have independent watchers
- Last session wins: Second session's start overwrites first session's watcher key
- Memory leak: If sessions reuse project dirs, only latest watcher is tracked

**Refactoring Opportunity**: 
1. Use `Map<sessionId, FSWatcher>` instead of `Map<projectDir, FSWatcher>`
2. Create `HandoffWatcherManager` class with proper lifecycle
3. Support multiple watchers per project directory

---

#### 10. **ENVIRONMENT VARIABLE PARSING SCATTERED** ⚠️
**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/start-server.ts`
**Lines**: 71-73, 433

```typescript
// Line 71-73
unixSocketPath = process.env.JACQUES_SOCKET_PATH || DEFAULT_UNIX_SOCKET_PATH,
wsPort = parseInt(process.env.JACQUES_WS_PORT || String(DEFAULT_WS_PORT), 10),
httpPort = parseInt(process.env.JACQUES_HTTP_PORT || String(DEFAULT_HTTP_PORT), 10),

// Line 433 - DIFFERENT LOCATION, SAME PATTERN
threshold: parseInt(process.env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE || '95', 10),
```

**Impact**: 
- No centralized env var schema
- Parsing logic duplicated
- No validation (parseInt could return NaN)
- Hard to document all supported env vars

**Refactoring Opportunity**: 
1. Create `.env.example` with all supported vars
2. Create `EnvConfig` class with validation
3. Parse all env vars at startup, validate, throw early if invalid

---

### SUMMARY TABLE

| Issue | File | Lines | Severity | Duplication |
|-------|------|-------|----------|------------|
| Event broadcast pattern | start-server.ts | 216-247, 279-283 | High | 3+ places |
| Mixed concerns (orchestrator) | start-server.ts | 115-310 | High | N/A |
| Silent error catching | logger.ts, websocket.ts | 70-76, 256-262 | Medium | 4+ places |
| Logging boilerplate | registry, socket, ws, focus | 40-57 lines each | Medium | 4 files |
| Config scattered | start-server.ts | 37-41, 69-74, 433 | Medium | 2+ places |
| Project name extraction | session-registry.ts | 158, 233, 241 | Low | 3 places |
| Error response duplication | start-server.ts | 323-388 | Low | 3 places |
| readyState checks | websocket.ts, start-server.ts | 140, 152, 329+ | Low | 6+ places |
| Handoff watcher key collision | start-server.ts | 148-211 | Medium | 1 place |
| Env var parsing scattered | start-server.ts | 71-73, 433 | Low | 2 places |

---

### RECOMMENDED REFACTORING PRIORITY

1. **Phase 1 (High Impact)**: 
   - Extract event handler pattern into `EventBroadcaster` class
   - Extract orchestrator concerns into focused modules

2. **Phase 2 (Medium Impact)**:
   - Create centralized `Logger` class with DI
   - Create `ConfigManager` with env var validation
   - Fix handoff watcher key collision bug

3. **Phase 3 (Quality)**:
   - Centralize error response helpers
   - Extract utility functions (project extraction, terminal matching)
   - Add error tracking to listener/observer pattern

All findings include specific file paths and line numbers for easy reference when implementing refactoring.