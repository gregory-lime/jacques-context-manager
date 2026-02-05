# Explore: Explore notification system

> Session: `5dba83f5-f624-47b3-99f9-832bb8d03d75`
> Date: 2026-02-03
> Tokens: ~67 086

---

Perfect! Now I have a comprehensive understanding of the notification system. Let me create a summary document for you:

## Comprehensive Notification System Exploration Report

Based on my thorough exploration of the Jacques codebase, here's everything related to notifications, toasts, and the Notifications section in the GUI:

---

### 1. **Notifications Section/Settings in the GUI**

**Location**: `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Settings.tsx`

The Notifications settings are integrated into a comprehensive Settings page with the following features:

- **Master Toggle**: `Enable notifications` - controls all notifications globally
- **Browser Notifications**: Permission request button to enable OS-level desktop notifications
- **Per-Category Toggles**: Fine-grained control over 5 notification categories:
  - `context` - Context threshold alerts (50%, 70%, 90% usage)
  - `operation` - Large operations exceeding token threshold
  - `plan` - New plan creation detection
  - `auto-compact` - Session auto-compact triggers
  - `handoff` - Handoff file generation completion
- **Large Operation Threshold**: Configurable token count (default: 50,000 tokens) for operation notifications
- **Archive Settings**: Separate settings panel for archive filtering and auto-archive toggle
- **Sources Section**: Placeholder for external source configuration

---

### 2. **Toast Notification Implementation**

**Core Files**:
- `/Users/gole/Desktop/jacques-context-manager/gui/src/components/ui/Toast.tsx` - Individual toast component
- `/Users/gole/Desktop/jacques-context-manager/gui/src/components/ui/ToastContainer.tsx` - Toast container & store

**Architecture**:
- **Toast Store**: Framework-agnostic singleton pattern that can be used anywhere in the codebase
- **Max Visible**: 3 toasts at a time (newest first, older ones get pushed out)
- **Auto-dismiss Durations** by priority:
  - `low`: 5 seconds
  - `medium`: 6 seconds
  - `high`: 8 seconds
  - `critical`: 10 seconds

**Visual Features**:
- Terminal chrome bar with colored priority dot (icon bar)
- Jacques mascot image on the left side
- Title and body text with proper text overflow handling
- Animated entrance (slide from right with bounce)
- Exit animation (slide right and fade)
- Progress bar showing auto-dismiss countdown
- Glow effects (box-shadow) for medium/high/critical priorities
- Color-coded accents: accent (medium), warning (high), danger (critical)
- Hover behavior: pause auto-dismiss on mouse enter, resume after 2s on mouse leave

**Toast Priority Levels**:
```typescript
type ToastPriority = 'low' | 'medium' | 'high' | 'critical'
```

**Public API** (exposed via `toastStore`):
```typescript
toastStore.push({ title, body, priority?, category?, duration? })
toastStore.remove(id)
toastStore.clear()
```

Also exposed as `__toastStore` on `globalThis` for manual console testing.

---

### 3. **Browser/OS-Level Notifications (Web Notifications API)**

**Implementation**: Uses standard **Web Notifications API** (not node-notifier or Electron)

**Location**: `/Users/gole/Desktop/jacques-context-manager/gui/src/hooks/useNotifications.tsx`

**Key Features**:
- **Permission Management**:
  - Check current permission: `Notification.permission` (granted | denied | default)
  - Request permission: `Notification.requestPermission()`
  - Status display in Settings page

- **Smart Triggering**: Only sends browser notification when:
  - `Notification.permission === 'granted'`
  - `document.hasFocus() === false` (app tab is not in focus)
  - This prevents notification spam when user is actively viewing the app

- **Notification Details**:
  ```javascript
  new Notification(title, {
    body: string,
    tag: string,  // replaces previous notification with same tag
    icon: '/jacsub.png'  // Jacques mascot
  })
  ```

- **Use Case**: User gets browser notifications (macOS, Windows, Linux) when important events occur while they're working in another tab/app

---

### 4. **Notification Libraries & Dependencies**

**No external notification libraries used**:
- ✅ Built-in Web Notifications API (browser native)
- ❌ No `node-notifier` installed
- ❌ No Electron notifications library
- ❌ No `react-hot-toast`, `sonner`, `toastr`, or similar libraries

**Dependencies** (`gui/package.json`):
```json
{
  "lucide-react": "^0.469.0",        // Icon library
  "react": "^18.3.1",                 // Core React
  "react-dom": "^18.3.1",             // React DOM
  "react-markdown": "^10.1.0",         // Markdown rendering
  "react-router-dom": "^6.22.3"        // Routing
}
```

No notification-specific libraries. Everything is custom-built.

---

### 5. **Notification Types & Event Detection**

**Configuration Types** (`notifications/types.ts`):

```typescript
interface NotificationSettings {
  enabled: boolean                           // Master switch
  categories: Record<NotificationCategory, boolean>  // Per-category toggles
  largeOperationThreshold: number            // Token count threshold (default: 50k)
  contextThresholds: number[]                // Percentages to alert on (default: [50, 70, 90])
}
```

**Cooldown System**:
- Prevents notification spam with per-category cooldowns:
  - `context`: 60 seconds
  - `operation`: 10 seconds
  - `plan`: 30 seconds
  - `auto-compact`: 60 seconds
  - `handoff`: 10 seconds

**Event Detection** (`useNotifications.tsx`):

1. **Context Threshold Events** (main hook):
   - Detects when session context usage crosses 50%, 70%, 90% thresholds
   - Tracks which thresholds have fired to prevent duplicates
   - Priority: medium (70%), high (70%+), critical (90%+)

2. **Large Operation Events**:
   - Monitors completed Claude operations
   - Triggers when `totalTokens >= largeOperationThreshold`
   - Includes user prompt preview in notification body

3. **Plan Creation Events** (via badges):
   - Detects increase in `planCount` badge
   - Shows which session created the plan

4. **Auto-Compact Events** (via badges):
   - Detects `hadAutoCompact` flag transition from false → true
   - Indicates automatic context compaction occurred

5. **Handoff Ready Events** (via WebSocket):
   - Server broadcasts `handoff_ready` message
   - Shows filename of generated handoff

6. **Terminal Focus Result Events**:
   - Success/failure feedback when focusing terminal window
   - Method: `osascript`, `wmctrl`, etc.

---

### 6. **Data Flow & Integration**

**Toast Store Usage**:

1. **From `useNotifications` hook** → Triggered by session/operation changes
   - Context thresholds, operations, plans, auto-compact, handoffs
   - Calls: `toastStore.push({ title, body, priority, category })`

2. **From `useJacquesClient` hook** → WebSocket events
   - Terminal focus results: `onFocusTerminalResult`
   - Handoff ready: `onHandoffReady`
   - Calls: `toastStore.push({...})`

3. **From any component** → Direct access via exported `toastStore`
   - Framework-agnostic API

**Persistence**:
- Settings saved to `localStorage` with key: `jacques-notification-settings`
- Loaded on page load, persisted on changes

**Provider Pattern**:
```typescript
<NotificationProvider
  sessions={sessions}
  claudeOperations={claudeOperations}
  badges={badges}
>
  {children}
</NotificationProvider>
```

Located in `Layout.tsx`, wraps entire application.

---

### 7. **Server-Side Notification Support**

**Handoff Ready Broadcasting** (`server/src/watchers/handoff-watcher.ts`):
- File watcher monitors `.jacques/handoffs/` directory
- Broadcasts `handoff_ready` message via WebSocket when handoff file created
- Message type: `HandoffReadyMessage`

**Broadcast Service** (`server/src/services/broadcast-service.ts`):
- Unified service for broadcasting session updates + focus changes
- Integrates with WebSocket server

---

### 8. **Settings Persistence & Storage**

**localStorage Key**: `jacques-notification-settings`

**Stored Config**:
```json
{
  "enabled": true,
  "categories": {
    "context": true,
    "operation": true,
    "plan": true,
    "auto-compact": true,
    "handoff": true
  },
  "largeOperationThreshold": 50000,
  "contextThresholds": [50, 70, 90]
}
```

**Browser Permission**: Managed by browser (Notification API)

---

### Summary Table

| Aspect | Implementation |
|--------|-----------------|
| **Toast Library** | Custom (no external lib) |
| **Toast UI** | React components (Toast.tsx, ToastContainer.tsx) |
| **Browser Notifications** | Web Notifications API (native) |
| **OS Notifications** | None (Web Notifications only) |
| **Notification Storage** | Framework-agnostic singleton store |
| **Settings UI** | Settings.tsx page |
| **Settings Persistence** | localStorage |
| **Max Visible Toasts** | 3 |
| **Notification Categories** | 5 (context, operation, plan, auto-compact, handoff) |
| **Cooldown System** | Yes, per-category |
| **Permission Management** | Browser permission system |
| **Server Broadcasting** | WebSocket messages |

---

This is a **complete, custom notification system** with no external notification libraries. It combines:
- ✅ Custom toast notifications (React-based)
- ✅ Native Web Notifications API (browser desktop notifications)
- ✅ Server-side broadcast support
- ✅ Configurable per-category notifications
- ✅ Smart cooldown and deduplication logic
- ✅ Persistent settings in localStorage