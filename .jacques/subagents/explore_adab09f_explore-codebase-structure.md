# Explore: Explore codebase structure

> Session: `ee5a476c-89fd-42cc-b6fe-852c33a34ff0`
> Date: 2026-02-01
> Tokens: ~64 734

---

Perfect! Now I have a comprehensive understanding of the codebase. Let me create a detailed exploration report:

## Codebase Exploration Report: Jacques Context Manager

### 1. Core Structure Overview

The jacques-context-manager is a sophisticated multi-layered system for monitoring AI coding assistant context usage across Claude Code and Cursor. Here's the complete architecture:

```
Jacques System Architecture
├── Hooks Layer (Python/Bash)
│   └── Sends events via Unix socket to server
├── Server Layer (Node.js + TypeScript)
│   ├── Unix Socket → Event ingestion
│   ├── Session Registry → State management
│   ├── WebSocket Server → Real-time broadcasts
│   └── HTTP API → REST endpoints for GUI
└── GUI Layer (React + TypeScript)
    ├── Dashboard view
    ├── Conversations viewer
    └── Archive & context management
```

### 2. Core Module Structure (`core/src/`)

**Key Modules:**
- **`archive/`** - Conversation archiving, manifest extraction, plan detection
  - `archive-store.ts` - Storage management (~23KB)
  - `manifest-extractor.ts` - Extract metadata from sessions
  - `plan-extractor.ts` - Detect and deduplicate embedded plans (433 lines, 37 tests)
  - `search-indexer.ts` - Keyword indexing for search
  - `types.ts` - Archive type definitions

- **`context/`** - Context file management for external sources
- **`handoff/`** - Session handoff generation for context continuity
- **`session/`** - Session parsing and transformation
- **`sources/`** - External source adapters (Obsidian, Google Docs, Notion)
- **`utils/`** - Utilities like token counting
- **`types.ts`** - Core type definitions (shared across ecosystem)

### 3. Server Structure (`server/src/`)

**Core Components:**

#### **3.1 Logger Module** (`logger.ts`)
```typescript
// Pattern: Console interception + event broadcasting
- Intercepts console.log/warn/error
- Parses [Source] prefix from messages
- Broadcasts ServerLogMessage to WebSocket clients
- Maintains last 100 log entries in memory
- Non-blocking listener pattern (Set<LogCallback>)
```

Key features:
- Source extraction from `[Server]`, `[HTTP API]`, `[WebSocket]` prefixes
- Graceful error handling in listeners
- History buffer for new client connections
- Can be toggled on/off without state loss

#### **3.2 WebSocket Server** (`websocket.ts`)
```typescript
// Pattern: Pub-sub broadcast with state provider
class JacquesWebSocketServer {
  - Manages connected clients as Set<WebSocket>
  - Tracks port and onClientMessage handler
  - Uses StateProvider interface for initial state injection
  - Broadcasts ServerMessage types
}

Message Types:
- SessionUpdateMessage: Full session state
- SessionRemovedMessage: Cleanup signals
- FocusChangedMessage: Focus changes
- ServerLogMessage: Real-time logs
- HandoffProgressMessage: Handoff generation updates
- HandoffContextMessage: Compact context for LLM skills
```

Broadcast pattern:
```typescript
broadcast(message: ServerMessage) {
  // Serializes once, sends to all OPEN connections
  // Tracks sentCount for logging
}
```

#### **3.3 Session Registry** (`session-registry.ts`)
```typescript
// Pattern: Central state manager with auto-focus logic
- Sessions indexed by session_id (Map<string, Session>)
- Auto-creates sessions from context_update events
- Focus determined by most recent activity
- Normalizes source field (e.g., "startup" → "claude_code")
- Supports multiple sources seamlessly
- Cleanup interval for stale sessions (default 60s)
```

Key methods:
- `registerSession()` - Create or update session
- `updateActivity()` - Mark as working, update focus
- `updateContext()` - Auto-register if needed, broadcast
- `setSessionIdle()` - Mark as idle (stop = no activity)
- `unregisterSession()` - Remove session
- `findSessionByTerminalKey()` - Focus watcher support

#### **3.4 Start Server** (`start-server.ts`)
```typescript
// Pattern: Dependency injection + orchestration
- EmbeddedServer interface for programmatic use
- Wires together Unix socket, WebSocket, HTTP API
- Starts log interception
- Manages handoff file watchers per project
- Handles client messages (select_session, toggle_autocompact)
- Graceful shutdown with cleanup order

Event Flow:
SessionStart → registerSession → broadcastSessionUpdate → broadcastFocusChange
Activity → updateActivity → broadcastSessionUpdate → broadcastFocusChange
ContextUpdate → updateContext → broadcastSessionUpdate
```

#### **3.5 HTTP API** (`http-api.ts`)
- Serves GUI static files from `/gui/dist`
- REST endpoints for:
  - `/api/sources` - Source configuration
  - `/api/archive/*` - Archive management
  - `/api/handoff/*` - Handoff operations
- CORS headers for development
- Config file management (`~/.jacques/config.json`)

#### **3.6 Types** (`types.ts`)
```typescript
// Two-way WebSocket protocol definition

Server → Client:
- InitialStateMessage
- SessionUpdateMessage
- SessionRemovedMessage
- FocusChangedMessage
- ServerStatusMessage
- AutoCompactToggledMessage
- HandoffProgressMessage
- ServerLogMessage
- HandoffContextMessage

Client → Server:
- SelectSessionRequest
- TriggerActionRequest
- ToggleAutoCompactRequest
- GetHandoffContextRequest
```

### 4. GUI Structure (`gui/src/`)

#### **4.1 Core Types** (`types.ts`)
```typescript
// Browser-compatible type definitions (duplicated from core)
// Reason: Core uses Node.js APIs
- Session, ContextMetrics, ModelInfo
- TerminalIdentity, WorkspaceInfo
- ServerMessage types

Note: Simplified compared to server/src/types.ts
```

#### **4.2 WebSocket Client Hook** (`useJacquesClient.ts`)
```typescript
// Pattern: Browser WebSocket + React state management
class BrowserJacquesClient {
  - Connects to ws://localhost:4242 (or env override)
  - Exponential backoff reconnect (max 10 attempts)
  - Event callbacks: onConnected, onSessionUpdate, onServerLog, etc.
  - Methods: selectSession(), toggleAutoCompact(), triggerAction()
}

useJacquesClient() hook returns:
{
  sessions: Session[]           // Sorted by last_activity (newest first)
  focusedSessionId: string | null
  connected: boolean
  lastUpdate: number
  serverLogs: ServerLog[]       // Last 100
  selectSession, triggerAction, toggleAutoCompact
}

State management:
- Sessions auto-sorted on updates
- serverLogs capped at MAX_LOGS (100)
- Proper cleanup on unmount
```

#### **4.3 Project Scope Provider** (`useProjectScope.tsx`)
```typescript
// Pattern: Context provider for filtering sessions
interface ProjectScopeContextValue {
  selectedProject: string | null
  setSelectedProject: (project: string | null) => void
  filterSessions: (sessions: Session[]) => Session[]
  archivedProjects: string[]
  setArchivedProjects: (projects: string[]) => void
}

// Enables per-project views across the GUI
```

#### **4.4 Components**

**LogPanel** (`components/LogPanel.tsx`)
```typescript
// Pattern: Expandable log viewer with auto-scroll
- Fixed height: 200px max
- Auto-scrolls to bottom when expanded
- Detects user scroll (stops auto-scroll if scrolled up)
- Badge counts for errors/warnings
- Time-formatted entries with color-coded levels
- Positioned: fixed bottom (leaves space with padding-bottom)
```

**SessionCard** (`components/SessionCard.tsx`)
```typescript
// Pattern: Reusable session display card
- Project name (orange accent)
- Session title (ellipsis truncated)
- Model info (secondary text)
- ContextMeter component (sub-component)
- Terminal program name
- Focus indicator badge
- Responsive styling with theme colors
```

**ContextMeter** (`components/ContextMeter.tsx`)
```typescript
// Pattern: Visual context usage indicator
- Progress bar (6px height)
- Shows percentage (with ~ for estimates)
- Token display (current / max)
- Smart formatting: 1.5M, 123k, 456
- Smooth transition animation (300ms)
```

**Layout** (`components/Layout.tsx`)
```typescript
// Pattern: Master layout with sidebar + content + footer
- Sidebar (240px, left)
  - Logo with mascot image
  - Project selector
  - Navigation (dashboard, conversations, archive, context)
  - Sources section with status dots
  - Settings link
- Main content (flex: 1, overflow: auto)
- LogPanel (fixed bottom)

Design: Dark theme, sidebar accent colors, responsive nav
```

### 5. Key Architectural Patterns

#### **5.1 Console Interception for Logging**
```typescript
// In logger.ts:
startLogInterception() {
  const originalConsole = { log, warn, error }
  console.log = (...args) => {
    originalConsole.log(...args)  // Still print to terminal
    const source = parseSource(args[0])  // Extract [Source]
    broadcastLog(createLogMessage('info', args, source))
  }
}
```
**Benefit:** All server logs automatically broadcast to GUI without explicit logging calls

#### **5.2 Event-Driven State Synchronization**
```typescript
// Event flow:
Hook event → Unix socket → SessionRegistry.update*() → WebSocket.broadcast()
                                    ↓
                            React state (useJacquesClient)
                                    ↓
                            Components re-render

Automatic because:
- WebSocket broadcasts trigger React callbacks
- Callbacks update state via setState
- React reconciles and re-renders
```

#### **5.3 Focus Detection Hierarchy**
```typescript
1. Activity event (PostToolUse) → auto-focus
2. Context update (statusLine) → auto-focus
3. Manual selection (UI button) → user-focused
4. Terminal focus watcher → detect terminal switch
```

#### **5.4 Type Safety Across Boundaries**
```typescript
// Single source of truth: server/src/types.ts
export type ServerMessage = ... (union of 8+ message types)

// WebSocket sends: JSON.stringify(ServerMessage)
// Browser receives: message as ServerMessage (typed)
// React hooks handle each type explicitly
```

#### **5.5 Browser/Node.js Compatibility**
```typescript
// Core uses Node.js APIs (fs, path, os)
// GUI duplicates types in gui/src/types.ts
// GUI imports from @jacques/core only for archive/handoff
// No runtime dependency on core in browser

@jacques/core exports:
- getCompactContextForSkill() - Called from server (start-server.ts)
- searchConversations() - Called from HTTP API
- Types - Duplicated for browser safety
```

### 6. Existing Logging Patterns

#### **6.1 Server Logging**
```typescript
// Prefix pattern: [Component]
console.log('[Server] Starting Jacques server...')
console.log('[WebSocket] Broadcast session_update to 3 client(s)')
console.log('[Registry] Session registered: abc123 [claude_code] - "My Project"')
console.log('[FocusWatcher] Terminal focus detected: tty123 -> abc456')

// Automatically intercepted and broadcast to GUI
// LogPanel displays with parsed source
```

#### **6.2 GUI Logging**
```typescript
// Via LogPanel component receiving serverLogs array
// From useJacquesClient hook
// No explicit logging needed for server events

// Local console logs still go to browser dev tools
console.error('Failed to load source status:', error)
```

### 7. WebSocket Message Timing

```
Connection established
↓
Client sends: initial_state (all sessions + focused_id)
↓
Updates arrive in real-time:
- session_update (whenever Session changes)
- session_removed (when session ends)
- focus_changed (when focus shifts)
- server_log (every console call)
↓
React state updates via useJacquesClient callbacks
↓
Components re-render with latest data
```

### 8. Styling Patterns

#### **8.1 Theme System**
```typescript
// colors.ts - Single source of truth
export const colors = {
  bgPrimary: '#0d0d0d',
  accent: '#E67E52',        // Coral (mascot-derived)
  success: '#4ADE80',
  danger: '#EF4444',
}

// Usage in components:
style={{ color: colors.accent }}
style={{ backgroundColor: colors.bgSecondary }}
```

#### **8.2 Inline Styles Pattern**
```typescript
// All components use React.CSSProperties inline
// Extracted into const styles {} at bottom

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', ... },
  button: { padding: '8px', ... },
}

// Applied via:
<div style={styles.container}>
```

#### **8.3 Responsive Design**
```typescript
// LogPanel example:
- Fixed bottom: position: 'fixed', bottom: 0
- Max height: 200px
- Expands/collapses with button toggle
- Auto-scroll management via useRef
```

### 9. State Flow Example: Session Update

```
1. User runs command in Claude Code
   ↓
2. statusLine hook fires (every ~2-5 seconds)
   ↓
3. Unix socket receives: { event: 'context_update', ... }
   ↓
4. SessionRegistry.updateContext()
   - Updates context_metrics
   - Broadcasts SessionUpdateMessage
   ↓
5. WebSocket sends: { type: 'session_update', session: {...} }
   ↓
6. Browser receives message
   ↓
7. useJacquesClient calls onSessionUpdate callback
   ↓
8. setSessions(prev => [...]) - React state update
   ↓
9. Components re-render with new metrics
   ↓
10. ContextMeter shows updated percentage
```

### 10. Key Configuration Files

- `server/src/types.ts` - Protocol definitions (source of truth)
- `gui/src/types.ts` - Browser-safe duplicates
- `gui/src/styles/theme/` - Color palette + typography
- `~/.jacques/config.json` - User config (sources, OAuth tokens)
- `~/.claude/settings.json` - Claude Code settings (autoCompact)

### 11. Unique Features

1. **Real-Time Log Broadcasting** - Console interception automatically visible in GUI
2. **Multi-Source Sessions** - Seamlessly handles Claude Code + Cursor + extensible
3. **Terminal Key Tracking** - Identifies terminal instances across system
4. **Auto-Registration** - Sessions created from context_update if session_start delayed
5. **Focus Intelligence** - Auto-focuses on activity, supports manual override + terminal detection
6. **Graceful Degradation** - Browser client handles reconnection with exponential backoff
7. **Type Safety** - Full TypeScript across server + browser + shared types
8. **Session Handoff** - Compact context extraction for session continuation

### 12. Implementation Considerations for New Features

**Adding new logging:**
- Use `console.log('[Component] message')` format
- Automatically broadcast via logger interception
- Will appear in GUI LogPanel

**Adding new WebSocket messages:**
1. Add interface to `server/src/types.ts`
2. Add union type to `ServerMessage`
3. Add handler in `handleMessage()` of BrowserJacquesClient
4. Add callback property to BrowserJacquesClient
5. Use in useJacquesClient() effect

**Adding new GUI component:**
1. Create in `gui/src/components/`
2. Use theme colors via `import { colors } from '../styles/theme'`
3. Inline styles pattern: `const styles: Record<string, React.CSSProperties> = {...}`
4. Import via sibling index exports or direct

**Adding state to GUI:**
- Use React hooks (useState, useCallback, useEffect)
- Project scope via `useProjectScope()` context
- Server data via `useJacquesClient()` hook

**New REST endpoint:**
1. Add to `server/src/http-api.ts`
2. Parse route path and query params
3. Return JSON response
4. Call from GUI via fetch to `http://localhost:4243`

This architecture enables real-time monitoring, extensibility, and clean separation between server state management and browser UI rendering.