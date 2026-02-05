# Explore: Explore existing codebase structure

> Session: `143bfc69-dc8b-4433-a835-8149f92f5b84`
> Date: 2026-02-03
> Tokens: ~89 422

---

Perfect! Now I have a comprehensive understanding of the existing notification system. Let me create a detailed report.

## Comprehensive Notification System Analysis

I've thoroughly explored the Jacques codebase and documented the existing notification architecture. Here's what I found:

---

### **1. SERVER-SIDE ARCHITECTURE**

#### **Core Type Definitions** (`server/src/types.ts`)
The server has well-defined WebSocket message types for notifications:

- **`HandoffReadyMessage`** (lines 309-315): Notifies when handoff file is ready
- **`HandoffProgressMessage`** (lines 318-329): Progress updates during handoff generation with stages (starting, extracting, synthesizing, writing, complete)
- **`ServerLogMessage`** (lines 332-341): Broadcasts server logs to clients in real-time
- **`ClaudeOperationMessage`** (lines 384-424): Broadcasts Claude CLI operations (e.g., LLM handoff) with token usage and timing
- **`ApiLogMessage`** (lines 442-454): Broadcasts HTTP API requests for debugging
- **`FocusTerminalResultMessage`** (lines 428-436): Result of terminal focus attempts

All messages are part of the `ServerMessage` union type (lines 459-473).

#### **Event Handler** (`server/src/handlers/event-handler.ts`)
- Clean separation of concerns: routes hook events to appropriate handlers
- Uses **BroadcastService** for unified session + focus broadcasting
- Coordinates between SessionRegistry, BroadcastService, and HandoffWatcher

#### **Broadcast Service** (`server/src/services/broadcast-service.ts`)
- **Pattern**: Unified broadcasting service that combines session updates with focus change notifications
- **Key methods**:
  - `broadcastSessionWithFocus()`: Broadcasts session update + focus change
  - `broadcastSessionRemovedWithFocus()`: Handles session removal
  - `broadcastFocusChange()`: Broadcasts focus changes (with deduplication to avoid spam)
  - `forceBroadcastFocusChange()`: Forces focus broadcast (used when focus must be re-sent)

#### **HTTP API** (`server/src/http-api.ts`)
- **Port**: 4243 (default)
- **API Log Broadcasting** (lines 62-68, 273-283): Captures all API requests and broadcasts them via WebSocket
- **Callback Pattern**: `onApiLog` callback passed to server (line 73) for broadcasting
- **Uses CORS** for browser access (lines 195-203)

#### **Start Server** (`server/src/start-server.ts`)
- **Embedded Server Pattern**: Can be imported and started programmatically
- **Log Interception** (lines 350-356): Intercepts console.log/error and broadcasts to WebSocket clients via `addLogListener()`
- **Claude Operation Logging** (lines 124-127): Wires up ClaudeOperationLogger to broadcast operations
- **Handoff Watcher** (lines 98-103): Watches for handoff file creation and broadcasts notifications

---

### **2. GUI-SIDE ARCHITECTURE**

#### **Toast System** (`gui/src/components/ui/`)

**ToastContainer.tsx** (Framework-agnostic singleton):
- **Pattern**: Uses `useSyncExternalStore` for framework-agnostic state management
- **toastStore** (lines 64-70): Globally accessible store for pushing toasts from anywhere
  ```typescript
  toastStore.push({ title, body, priority, category })
  ```
- **Exposed globally** (line 75): `window.__toastStore` for console testing
- **Max visible**: 3 toasts at once (line 10)
- **Duration by priority** (lines 82-87): 5s (low), 6s (medium), 8s (high), 10s (critical)

**Toast.tsx** (Visual component):
- **Priority levels** (line 5): `'low' | 'medium' | 'high' | 'critical'`
- **Visual design**: Terminal chrome bar with category label, priority dot, Jacques mascot
- **Animations**: Entry (slide + bounce), exit (fade + slide), progress bar countdown
- **Priority glow** (lines 33-38): Different shadow colors based on priority
- **Critical flashing** (line 141): Pulsing animation for critical toasts
- **Auto-dismiss** with hover pause (lines 92-130)

#### **Notification Hook** (`gui/src/hooks/useNotifications.tsx`)

**NotificationProvider** (lines 96-293):
- **Props**: `sessions`, `claudeOperations`, `badges` (from parent Layout)
- **Settings persistence**: LocalStorage (`jacques-notification-settings`)
- **Browser Notification API**: Requests permission, fires OS notifications when tab is unfocused (lines 68-83)
- **Cooldowns** (lines 36-43): Prevents spam (context: 60s, operation: 10s, plan: 30s, auto-compact: 60s, handoff: 10s)

**Event Detection**:
1. **Context Thresholds** (lines 166-214):
   - Monitors `session.context_metrics.used_percentage`
   - Tracks which thresholds already fired per session (lines 175-179)
   - Fires at 50%, 70%, 90% by default
   - Priority: ≥90% = critical, ≥70% = high, else medium

2. **Large Operations** (lines 217-240):
   - Monitors new `claudeOperations` entries
   - Filters by `settings.largeOperationThreshold` (default: 50k tokens)
   - Shows token count and operation preview

3. **Plan & Auto-Compact** (lines 243-278):
   - Monitors `badges` for changes
   - Detects new plans via `badge.planCount` increase
   - Detects auto-compact via `badge.hadAutoCompact` flag flip

**Notification Settings** (`gui/src/notifications/types.ts`):
```typescript
interface NotificationSettings {
  enabled: boolean;
  categories: Record<NotificationCategory, boolean>;
  largeOperationThreshold: number; // Default: 50,000
  contextThresholds: number[]; // Default: [50, 70, 90]
}
```

**Categories**:
- `context`: Context threshold alerts
- `operation`: Large Claude operations
- `plan`: Plan creation detected
- `auto-compact`: Session compacted
- `handoff`: Handoff file ready

#### **Layout Integration** (`gui/src/components/Layout.tsx`)
- **NotificationProvider** wraps entire app (lines 68-72, 208)
- **ToastContainer** rendered at top-level (line 74)
- **Badge fetching** (lines 42-43): Uses `useSessionBadges()` hook for all active sessions
- **Real-time updates**: Sessions, operations, and badges passed as props

#### **Settings Page** (`gui/src/pages/Settings.tsx`)
- **UI for notification settings** (lines 54-123):
  - Master toggle for all notifications
  - Browser permission request button
  - Per-category toggles with descriptions
  - Large operation threshold input (number field)
- **Visual feedback**: Grayed out when master toggle is off

---

### **3. EXISTING PATTERNS & CONVENTIONS**

#### **Message Broadcasting Pattern**:
```typescript
// Server side
wsServer.broadcast(message);
wsServer.broadcastSessionUpdate(session);
wsServer.broadcastApiLog(log);
wsServer.broadcastClaudeOperation(op);

// GUI side
toastStore.push({ title, body, priority, category });
```

#### **Service Pattern** (`server/src/services/`):
- **BroadcastService**: Centralized broadcasting logic
- **Config**: Takes dependencies via constructor (wsServer, registry, logger)
- **Stateful**: Tracks last broadcasted focus to avoid spam

#### **Hook Pattern** (`gui/src/hooks/`):
- **Context + Hook**: Provider wraps app, hook accesses context
- **External store integration**: Uses `useSyncExternalStore` for framework-agnostic state
- **Event detection**: useEffect with prev state refs for diffing

#### **Type Duplication**:
- **Server types**: `server/src/types.ts` (Node.js compatible)
- **GUI types**: `gui/src/types.ts` (Browser compatible)
- **API types**: `gui/src/api/config.ts` (HTTP API responses)

---

### **4. KEY FILES FOR NOTIFICATION SYSTEM**

**Server-side**:
- ✅ `server/src/types.ts` - Message type definitions
- ✅ `server/src/handlers/event-handler.ts` - Event routing
- ✅ `server/src/services/broadcast-service.ts` - Broadcasting service
- ✅ `server/src/http-api.ts` - REST API with log broadcasting
- ✅ `server/src/start-server.ts` - Server orchestration with log interception
- ✅ `server/src/websocket.ts` - WebSocket server (broadcasts to all clients)
- ✅ `server/package.json` - Dependencies (ws@^8.18.0)

**GUI-side**:
- ✅ `gui/src/components/ui/Toast.tsx` - Toast visual component
- ✅ `gui/src/components/ui/ToastContainer.tsx` - Toast store + container
- ✅ `gui/src/hooks/useNotifications.tsx` - Notification logic + event detection
- ✅ `gui/src/notifications/types.ts` - Notification settings types
- ✅ `gui/src/components/Layout.tsx` - Provider integration
- ✅ `gui/src/pages/Settings.tsx` - Settings UI
- ✅ `gui/src/api/config.ts` - HTTP API client
- ✅ `gui/src/types.ts` - GUI type definitions
- ✅ `gui/package.json` - Dependencies (React, lucide-react icons)

---

### **5. NOTIFICATION FLOW DIAGRAM**

```
┌─────────────────────────────────────────────────────────────┐
│ SERVER SIDE (Node.js)                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  UnixSocket → EventHandler → BroadcastService → WebSocket  │
│               (routes)        (combines)          (ws:4242)│
│                                                             │
│  HTTP API (4243) ────────────┐                             │
│                              ├──→ onApiLog callback ────→  │
│                              │                              │
│  ClaudeOperationLogger ──────┤                              │
│                              │                              │
│  Logger Interception ────────┘                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           │ WebSocket Messages
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ GUI SIDE (React)                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  useJacquesClient ──→ receives messages ──→                │
│  (WebSocket hook)                                          │
│                                                             │
│  NotificationProvider ──→ monitors sessions/operations ──→ │
│  (event detection)                                         │
│                                                             │
│  toastStore.push() ──→ ToastContainer ──→ Toast ──→        │
│  (singleton)           (React)            (visual)         │
│                                                             │
│  Browser Notification API (OS notifications when unfocused)│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### **6. CURRENT NOTIFICATION TYPES**

| Category | Trigger | Source | Priority | Display |
|----------|---------|--------|----------|---------|
| **Context** | 50%, 70%, 90% usage | Session context metrics | medium/high/critical | Toast + OS |
| **Operation** | ≥50k tokens | Claude operations | medium/high | Toast + OS |
| **Plan** | Plan count increase | Session badges | medium | Toast + OS |
| **Auto-compact** | hadAutoCompact flag | Session badges | high | Toast + OS |
| **Handoff** | (Not yet wired) | HandoffReadyMessage | medium | - |

---

### **7. OBSERVATIONS & RECOMMENDATIONS**

**Strengths**:
✅ Clean separation between server (Node.js) and GUI (browser)  
✅ Framework-agnostic toast store (can push from anywhere)  
✅ Good TypeScript coverage with explicit message types  
✅ Visual polish (terminal chrome, animations, priority colors)  
✅ Cooldowns prevent notification spam  
✅ Browser Notification API integration for unfocused tabs  

**Gaps**:
⚠️ **Handoff notifications not wired**: `HandoffReadyMessage` exists in types but not connected to `NotificationProvider`  
⚠️ **No server-to-GUI notification bridge**: Server messages (ServerLogMessage, ApiLogMessage) aren't triggering GUI toasts  
⚠️ **No settings persistence for archive/filter**: Archive settings in Settings.tsx are just placeholders  

**For Implementation**:
- **Pattern to follow**: See `gui/src/hooks/useNotifications.tsx` lines 217-240 for operation detection
- **Broadcasting**: Use `BroadcastService` in `server/src/services/broadcast-service.ts`
- **Message types**: Add to `server/src/types.ts` ServerMessage union
- **Toast integration**: Call `toastStore.push()` from anywhere (even outside React)

---

This analysis provides a complete picture of the notification system architecture, patterns, and existing implementations. You now have all the context needed to implement new notification types following the established patterns.