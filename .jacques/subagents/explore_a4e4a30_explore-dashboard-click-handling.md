# Explore: Explore dashboard click handling

> Session: `6fd059b5-b21d-406b-8867-285c2ad0cf98`
> Date: 2026-02-03
> Tokens: ~89 596

---

Perfect! Now I have a comprehensive understanding of the Jacques dashboard architecture. Let me create a detailed summary document.

## Dashboard Session Rendering & Interaction Flow

Based on my analysis of the Jacques codebase, here's how the dashboard displays active sessions and handles user interactions:

---

### **1. Session Display Architecture**

#### **Entry Point: `dashboard/src/cli.ts`**
- Starts the embedded Jacques server (if not already running)
- Enters alternate screen buffer (`\x1b[?1049h`) to prevent scrolling
- Renders the React-based Ink dashboard (lines 109-115)

#### **Root Component: `App.tsx`**
- **Hook**: `useJacquesClient()` connects to WebSocket server on port 4242
- **State Management**: Maintains all UI state including:
  - `sessions`: Array of active `Session` objects
  - `focusedSessionId`: Currently focused session
  - `currentView`: Which dashboard view to render ("main", "save", "settings", etc.)
  - 60+ view-specific state variables for complex flows

#### **Display Component: `Dashboard.tsx`**
- Renders the focused session info via two helper components:
  1. **`ProgressLine`** (lines 190-248): Shows progress bar + context percentage + token counts
  2. **`ProjectLine`** (lines 253-284): Shows project name / session title

**Example Display for Focused Session**:
```
┌─ Jacques v0.1.0 ╮
│  mascot  │ ████████░░ ~65.2% (65k/100k) • 32k session   │
│          │ claude-code / auth-flow                        │
│          │                                                 │
│          │   1. Save Context                              │
│          │   2. Load Context                              │
│          │   3. Create Handoff                            │
│          │ > 4. Settings                                  │
│          │                                                 │
│          │                                                 │
└─ [Q]uit [A]ctive (3) [P]roject ─────────────────────────┘
```

**Layout Modes**:
- **Horizontal** (≥62 chars): Side-by-side mascot + content with borders
- **Vertical** (<62 chars): Stacked layout without borders

---

### **2. WebSocket Communication Flow**

#### **Server → Dashboard Messages** (`server/src/types.ts` lines 253-460)

| Message Type | When Sent | Payload |
|---|---|---|
| `initial_state` | Client connects | All sessions + focused session ID |
| `session_update` | Session data changes | Updated `Session` object |
| `session_removed` | Session ends | `session_id` only |
| `focus_changed` | Focus shifts to new session | `session_id` + full `Session` object |
| `autocompact_toggled` | User toggles auto-compact | `enabled` boolean |
| `handoff_ready` | Handoff file generated | `session_id` + file path |
| `handoff_progress` | During handoff generation | `stage`, `extractors_done`, `current_extractor` |
| `server_log` | Server internal events | Level, message, timestamp |

#### **Dashboard → Server Messages** (`server/src/types.ts` lines 462-503)

| Request Type | Triggered By | Payload |
|---|---|---|
| `select_session` | Not yet implemented | `session_id` |
| `trigger_action` | Future feature | `session_id`, `action` (smart_compact, new_session, save_snapshot) |
| `toggle_autocompact` | Settings menu [S] | `session_id` (optional) |
| `get_handoff_context` | Skill integration | `session_id` |

**Currently**: The dashboard is mostly read-only; only skill integration uses server messages.

---

### **3. Keyboard Input Handling** 

**Hook**: `useInput()` from Ink (lines 1057-1978 in App.tsx)

#### **Main Menu (`currentView === "main")`**:
```
↑/↓           Navigate menu (1-4)
Return        Select highlighted menu item
1-4           Direct number input to menu items
Q             Quit
A             Show Active Sessions view
H             Browse handoffs (help shortcut)
h             Copy handoff prompt to clipboard
c             Create handoff from transcript (fast, non-LLM)
C             Create handoff with LLM (interactive mode)
S             Go to Settings
W             Open web GUI (http://localhost:4243)
P             Open Project Dashboard
```

#### **Active Sessions (`currentView === "sessions")`**:
```
↑/↓           Scroll session list
Esc           Return to main menu
```

#### **Save Flow (`currentView === "save")`**:
```
↑/↓           Scroll preview content
Return        Confirm save
Esc           Cancel, return to main
[a-z0-9_-]   Type optional label
Backspace     Delete label character
```

#### **Settings (`currentView === "settings")`**:
```
↑/↓           Navigate settings items (8 total)
Return/Space  Select item (toggle filter, connect Claude, etc.)
Esc           Return to main menu
```

**Example Settings Items**:
- Index 0: Claude token connection
- Indices 1-3: Archive filter options (Everything, Without Tools, Messages Only)
- Index 4: Auto-archive toggle
- Index 5: Initialize Archive
- Index 6: Force Re-archive All
- Index 7: Browse Archive

---

### **4. Session State Flow**

#### **Session Lifecycle** (from `server/src/session-registry.ts`):

```
Hook fires "session_start" event
         ↓
Server creates Session object with:
- session_id (unique)
- source ("claude_code" or "cursor")
- project, cwd, workspace info
- terminal identity
- initial context_metrics (0%)
         ↓
Dashboard receives "session_update" message
         ↓
`useJacquesClient` updates sessions state
         ↓
Session renders in main menu or Active Sessions view
         ↓
"context_update" events arrive periodically
         ↓
ProgressLine updates with new percentage/tokens
         ↓
When focused session activity updates:
- Auto-focus triggers (via `updateActivity()`)
- `focus_changed` message sent
- Dashboard re-renders with new focused session
         ↓
Hook fires "session_end"
         ↓
Server sends "session_removed" message
         ↓
Dashboard removes from sessions array
```

---

### **5. WebSocket Server Implementation** (`server/src/websocket.ts`)

```typescript
// Server setup (port 4242)
const wss = new WebSocketServer({ port: 4242 });

// When client connects:
1. Send initial_state with all sessions + focused ID
2. Listen for incoming client messages
3. On client message, call onClientMessage() callback
4. Broadcast changes to ALL connected clients

// Key broadcast methods:
- broadcastSessionUpdate(session)
- broadcastFocusChange(sessionId, session)
- broadcastSessionRemoved(sessionId)
- broadcast(message) // Generic
```

---

### **6. Real-Time Data Flow Example**

**User presses `A` key → View Active Sessions**:
```
App.useInput() detects input "a"
         ↓
setCurrentView("sessions")
         ↓
Dashboard renders ActiveSessionsView
         ↓
Shows all sessions sorted by:
1. Focused session first (● filled dot)
2. Others by last_activity (○ empty dot)
         ↓
Each session shows:
- Project name and terminal type
- Context percentage (color-coded)
- Token usage (current/max)
         ↓
User presses Esc
         ↓
returnToMain() resets 40+ state variables
         ↓
Back to main menu
```

**User focuses session with 65% context, scrolls down**:
```
Server sends "context_update" from statusLine
         ↓
JacquesClient.on('session_update') fires
         ↓
setSessions() updates session.context_metrics
         ↓
Dashboard.ProgressLine recalculates:
  - percentage: 65.2%
  - currentTokens: 100k * 0.652 = ~65.2k
  - displays: "████████░░ ~65.2% (65k/100k)"
         ↓
React re-renders, user sees updated bar
```

---

### **7. Key Components Summary**

| Component | Purpose | Lines |
|---|---|---|
| `App.tsx` | Root, state management, keyboard handling | 134-2087 |
| `Dashboard.tsx` | Main renderer, layout logic | 518-1440 |
| `SessionsList.tsx` | (Minimal) Lists sessions with icons | 1-110 |
| `useJacquesClient.ts` | WebSocket client hook | 1-174 |
| `server/websocket.ts` | Broadcasts to all clients | 1-288 |
| `server/types.ts` | Message type definitions | Source of truth for all data structures |

---

### **8. Message Type Definitions** (Complete list in `server/src/types.ts`)

**Session Object** (lines 109-146):
```typescript
interface Session {
  session_id: string;              // Unique ID
  source: 'claude_code' | 'cursor'; // AI tool
  session_title: string | null;     // From transcript
  transcript_path: string | null;   // Path to JSONL
  project: string;                  // Project name
  cwd: string;                      // Working directory
  model: { id, display_name } | null;
  context_metrics: {
    used_percentage: number;        // 0-100
    remaining_percentage: number;
    total_input_tokens: number;
    total_output_tokens: number;
    context_window_size: number;
    is_estimate?: boolean;          // True if from hooks, false if from preCompact
  } | null;
  status: 'active' | 'working' | 'idle';
  last_activity: number;            // Unix timestamp
  terminal_key: string;             // Unique terminal ID
  autocompact: {
    enabled: boolean;
    threshold: number;              // Percent (default 95)
    bug_threshold: number | null;   // 78 if bug #18264 detected
  } | null;
}
```

---

### **9. Critical Implementation Details**

1. **Terminal Identity**: Sessions identified by `terminal_key` combining TTY, terminal program, session ID, etc. Allows tracking across terminal windows.

2. **Focus Management**: Auto-focuses session with most recent activity via `updateActivity()` and `updateContext()` calls.

3. **Context Estimation**: For Cursor sessions without `preCompact` data, uses tiktoken (`cl100k_base`) + skill overhead detection.

4. **Auto-Compact Handling**: Session tracks both `enabled` flag and known bug threshold (78%) separately per [Issue #18264](CLAUDE.md).

5. **Responsive Layout**: Terminal resize detected via `stdout.on('resize')` → hard terminal reset (`\x1Bc`) prevents ghosting.

6. **Alternate Screen Buffer**: Dashboard uses ANSI codes to preserve previous terminal state on exit (lines 111-121 in cli.ts).

---

This architecture enables the Jacques dashboard to display real-time session data with responsive keyboard controls and two-way WebSocket communication between the CLI frontend and Node.js backend server.