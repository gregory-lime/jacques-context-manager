# Explore: Explore GUI codebase

> Session: `140f7e47-bbca-4654-9982-fe180f5ee2bc`
> Date: 2026-02-03
> Tokens: ~64 047

---

Perfect! I have enough information now. Let me create a comprehensive summary document.

## Summary: GUI Codebase Structure and Architecture

Based on my thorough exploration of the Jacques GUI codebase, here's a complete understanding of how to add a "Focus Terminal" button:

### **1. Application Structure**

**Entry Point:**
- `/Users/gole/Desktop/jacques-context-manager/gui/src/main.tsx` - React root with BrowserRouter
- `/Users/gole/Desktop/jacques-context-manager/gui/src/App.tsx` - Route definitions (37 lines)

**Routing:**
- `/` - Dashboard (main page with active sessions)
- `/conversations` - Archive/saved conversations
- `/project` - Project dashboard
- `/archive` - Full archive search
- `/context` - Context management
- `/settings` - Settings view
- `/sources` - External sources (Obsidian, Google Docs, Notion)

**Layout:**
- `/Users/gole/Desktop/jacques-context-manager/gui/src/components/Layout.tsx` - Main layout wrapper

---

### **2. Sessions Display (Dashboard)**

**Main Dashboard Component:**
- **File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Dashboard.tsx` (135 lines)
- **Key Features:**
  - Displays active sessions in a responsive grid (320px min per card)
  - Sessions sorted by `last_activity` (most recent first)
  - Shows filtered sessions (by project scope)
  - Session count header with total count indicator
  - Connected/Disconnected badge

**Session Card Component:**
- **File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/components/SessionCard.tsx` (333 lines)
- **Key Information Displayed:**
  - Status dot (working/idle/active) with pulse animation
  - Session title (with plan detection)
  - Context meter (usage percentage)
  - Model name and time-since-activity
  - Plan count badge and agent count badge
  - Footer hints ("Click to view →")
  - Focused session indicator (highlighted border with accent color)
- **Props:**
  - `session: Session` - Full session data
  - `isFocused: boolean` - Whether this is the focused session
  - `badges?: SessionBadges` - Metadata badges
  - `onClick` - Handler when card is clicked
  - `onPlanClick`, `onAgentClick` - Handlers for indicators

**Session List Component:**
- **File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/components/SessionList.tsx` (227 lines)
- **Used in:** Other views for displaying lists
- Simpler list format with status dots and metadata

**Session Type Definition:**
- **File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/types.ts` (lines 41-58)
```typescript
interface Session {
  session_id: string;
  source: SessionSource; // 'claude_code' | 'cursor'
  cwd: string;
  project: string;
  session_title: string | null;
  terminal?: TerminalIdentity;
  context_metrics: ContextMetrics | null;
  model: ModelInfo | null;
  workspace: WorkspaceInfo | null;
  autocompact: AutoCompactStatus | null;
  status: 'idle' | 'working' | 'active';
  last_activity: number;
  registered_at: number;
  transcript_path?: string;
  git_branch?: string | null;
  git_worktree?: string | null;
}
```

---

### **3. Server Connection (WebSocket)**

**WebSocket Client Hook:**
- **File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/hooks/useJacquesClient.ts` (341 lines)
- **Connection:** `ws://localhost:4242` (dev) or `wss://` (production)
- **Browser Implementation:** BrowserJacquesClient class (simplified, no Node.js EventEmitter)
- **Methods:**
  - `selectSession(sessionId: string)` - Focus a session
  - `triggerAction(sessionId, action)` - Actions: 'smart_compact' | 'new_session' | 'save_snapshot'
  - `toggleAutoCompact()` - Toggle autocompact setting
  - `send(data)` - Low-level WebSocket send

**Message Types Handled:**
- `initial_state` - Initial sessions list and focused ID
- `session_update` - Session data changed
- `session_removed` - Session deleted
- `focus_changed` - Focused session changed
- `autocompact_toggled` - Autocompact setting changed
- `server_log`, `claude_operation`, `api_log` - Logging messages

**Hook Return:**
```typescript
interface UseJacquesClientReturn extends JacquesState {
  sessions: Session[];
  focusedSessionId: string | null;
  connected: boolean;
  lastUpdate: number;
  selectSession: (sessionId: string) => void;
  triggerAction: (sessionId: string, action: string) => void;
  toggleAutoCompact: () => void;
}
```

---

### **4. HTTP API Endpoints**

**Base URL:**
- Dev: `http://localhost:4243/api`
- Production: `/api` (same origin)

**File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/api/config.ts` (817 lines)

**Key Endpoints:**
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/{id}` - Get single session with parsed entries
- `GET /api/sessions/{id}/badges` - Get session badges (plans, agents, etc.)
- `POST /api/sessions/{sessionId}/subagents/{agentId}` - Get subagent data
- `POST /api/sessions/rebuild` - Rebuild session index (SSE stream)

---

### **5. Session Viewer (Conversation Display)**

**Main Viewer Component:**
- **File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/components/Conversation/ConversationViewer.tsx` (300+ lines)
- **Features:**
  - Groups messages (consecutive assistant responses grouped)
  - Inserts markers for `/clear` commands and auto-compact events
  - Content type filters (agents, bash, MCP, web search, tools, thinking)
  - Question navigator (jump between user questions)
  - Subagent navigator (show subagent calls)
  - Plan navigator (show plan references)

**Message Components:**
- `UserMessage.tsx` - Renders user input
- `AssistantMessageGroup.tsx` - Groups assistant responses
- `AssistantMessage.tsx` - Individual assistant message with thinking/tools
- `AgentProgressBlock.tsx` - Subagent calls
- `BashProgressBlock.tsx` - Bash command output
- `MCPProgressBlock.tsx` - MCP tool calls
- `WebSearchBlock.tsx` - Web search results
- `PlanViewer.tsx` - Plan display

**Active Session Viewer:**
- **File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/components/ActiveSessionViewer.tsx` (424 lines)
- Fetches live session data via `getSession(sessionId)` HTTP API
- Transforms JSONL entries to ConversationMessage format
- Shows "Awaiting first response" state for new sessions
- Props:
  - `sessionId: string`
  - `onBack: () => void` - Back button handler

---

### **6. Integration Points for "Focus Terminal" Button**

#### **Where to Add the Button:**

**Option A: SessionCard (Best for UX)**
- **File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/components/SessionCard.tsx`
- **Location:** Footer area (lines 157-201)
- **Current Structure:**
  ```typescript
  <div style={styles.footer}>
    <div style={styles.footerLeft}>
      {/* Plan/Agent indicators */}
    </div>
    <div style={styles.footerCenter}>
      {/* MCP, Web Search, AutoCompact icons */}
    </div>
    <span style={styles.hint}>Click to view →</span>
  </div>
  ```
- **Add button:** Between footerCenter and hint, or add a separate footerRight section
- **Action:** Call `selectSession(session.session_id)` from useJacquesClient hook

**Option B: ActiveSessionViewer (Detail View)**
- **File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/components/ActiveSessionViewer.tsx`
- **Location:** Back button area (lines 296-298, 313-314)
- **Can add button next to Back button with terminal/focus icon**

**Option C: Dashboard Header**
- **File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Dashboard.tsx`
- **Location:** Header action area (lines 56-77)
- **For bulk focus operations**

---

### **7. How to Call Focus Action**

**From Any Component:**
```typescript
import { useJacquesClient } from '../hooks/useJacquesClient';

function MyComponent() {
  const { selectSession } = useJacquesClient();
  
  const handleFocusTerminal = (sessionId: string) => {
    selectSession(sessionId); // Sends WebSocket message
  };
  
  return (
    <button onClick={() => handleFocusTerminal(session.session_id)}>
      Focus Terminal
    </button>
  );
}
```

**WebSocket Message Sent:**
```typescript
{
  type: 'select_session',
  session_id: 'abc123...'
}
```

---

### **8. Key Component/Function Names for Implementation**

| Component | File | Purpose |
|-----------|------|---------|
| `Dashboard` | pages/Dashboard.tsx | Main page, displays session grid |
| `SessionCard` | components/SessionCard.tsx | Individual session card (320px wide) |
| `SessionList` | components/SessionList.tsx | List view of sessions |
| `useJacquesClient` | hooks/useJacquesClient.ts | WebSocket connection and actions |
| `useProjectScope` | hooks/useProjectScope.tsx | Project filtering |
| `useSessionBadges` | hooks/useSessionBadges.ts | Badge data fetching |
| `ActiveSessionViewer` | components/ActiveSessionViewer.tsx | Session detail view |
| `ConversationViewer` | components/Conversation/ConversationViewer.tsx | Message display |
| `Layout` | components/Layout.tsx | App layout wrapper |
| `Session` | types.ts | Session type definition |
| `BrowserJacquesClient` | hooks/useJacquesClient.ts | WebSocket client class |

---

### **9. Session Focus State Tracking**

**Current Focused Session:**
- Available via `useJacquesClient()` hook
- `focusedSessionId` field indicates which session is focused
- Visual indicator on SessionCard: glowing border with accent color (lines 91-96 in SessionCard.tsx)
- Server broadcasts `focus_changed` message to all clients

**Focus Indicator Styling:**
```typescript
const focusedStyles: React.CSSProperties = isFocused ? {
  borderColor: colors.accent, // #E67E52
  borderLeftWidth: '3px',
  paddingLeft: '18px',
  boxShadow: '0 0 16px rgba(230, 126, 82, 0.15)',
} : {};
```

---

### **10. File Organization Summary**

```
gui/src/
├── main.tsx                          # React root
├── App.tsx                           # Route definitions
├── types.ts                          # Type definitions (Session, etc.)
├── api/
│   ├── index.ts                      # API exports
│   └── config.ts                     # HTTP client (817 lines)
├── hooks/
│   ├── useJacquesClient.ts           # WebSocket connection (341 lines)
│   ├── useProjectScope.tsx           # Project filtering
│   └── useSessionBadges.ts           # Badge data
├── pages/
│   ├── Dashboard.tsx                 # Main sessions page
│   ├── ProjectDashboard.tsx          # Project view
│   ├── Conversations.tsx             # Saved conversations
│   ├── Archive.tsx                   # Archive search
│   ├── Context.tsx                   # Context management
│   ├── Settings.tsx                  # Settings
│   └── Sources.tsx                   # External sources
├── components/
│   ├── Layout.tsx                    # Main layout
│   ├── SessionCard.tsx               # Session card (330 lines) ← ADD BUTTON HERE
│   ├── SessionList.tsx               # Session list view
│   ├── ActiveSessionViewer.tsx       # Detail viewer (424 lines)
│   ├── Conversation/
│   │   ├── ConversationViewer.tsx    # Message display (300+ lines)
│   │   ├── UserMessage.tsx
│   │   ├── AssistantMessage.tsx
│   │   ├── AgentProgressBlock.tsx
│   │   └── ...
│   └── ui/                           # UI components
│       ├── Badge.tsx
│       ├── SectionHeader.tsx
│       └── ...
└── styles/
    └── theme/
        └── colors.ts
```

---

## Key Findings for "Focus Terminal" Button Implementation

1. **Best Location:** `SessionCard.tsx` footer (lines 157-201), add button with Terminal icon before or after the "Click to view →" hint

2. **Action to Call:** `selectSession(session.session_id)` from `useJacquesClient()` hook

3. **Visual Design:**
   - Use Lucide React icon: `<Terminal size={14} />`
   - Match existing button styling (see `.indicatorButton` in SessionCard.tsx, lines 300-312)
   - Color: `colors.accent` (#E67E52) or `colors.textMuted`

4. **Keyboard Shortcut:** Can add keyboard shortcut support via useEffect hook listening to keypresses

5. **Confirmation:** Optional toast/notification when focus changes (server broadcasts `focus_changed` message)

6. **Mobile Responsive:** Current grid layout is responsive, button should work on all sizes

7. **Related Sessions:** `terminal.tty` and `terminal.window_id` in Session object can help identify which terminal window

All necessary hooks and WebSocket infrastructure already exist. Implementation is straightforward - just add button component and wire up the click handler!