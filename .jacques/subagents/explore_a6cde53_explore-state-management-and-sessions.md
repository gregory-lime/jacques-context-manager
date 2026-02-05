# Explore: Explore state management and sessions

> Session: `15366d37-7909-44ce-bd9b-08ce1475d768`
> Date: 2026-02-03
> Tokens: ~66 851

---

Excellent! I now have a comprehensive understanding of the GUI codebase. Let me create a detailed report.

## Comprehensive Exploration Report: Jacques GUI State Management & Session Architecture

### 1. **State Management Architecture**

**No dedicated state management library** (Redux, Zustand, Jotai). Instead, the GUI uses a **hybrid approach** combining:

- **React Context API** for global state (ProjectScope, Notifications)
- **React Hooks** for WebSocket client state
- **React Router** for navigation state
- **localStorage** for persistent settings

### 2. **Session Data Management**

#### **Primary Session State Source: `useJacquesClient` Hook**

Location: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/hooks/useJacquesClient.ts` (359 lines)

**What it manages:**
```typescript
interface JacquesState {
  sessions: Session[];              // Current active sessions
  focusedSessionId: string | null;  // Currently focused session
  connected: boolean;               // WebSocket connection status
  lastUpdate: number;               // Timestamp of last update
  serverLogs: ServerLog[];          // Server logs (max 100)
  claudeOperations: ClaudeOperation[]; // Claude operations (max 50)
  apiLogs: ApiLog[];                // API logs (max 100)
}
```

**How it works:**
- Instantiates a `BrowserJacquesClient` WebSocket client on mount
- Listens to WebSocket messages from the Jacques server
- Handles 8 message types: `initial_state`, `session_update`, `session_removed`, `focus_changed`, `autocompact_toggled`, `server_log`, `claude_operation`, `api_log`, `handoff_ready`
- Updates React state via `useState` when messages arrive
- Sessions are automatically sorted by `last_activity` (most recent first)
- Provides action methods: `selectSession()`, `triggerAction()`, `toggleAutoCompact()`

**State updates strategy:**
- Uses immutable updates (spread operators, array methods)
- Sessions are replaced/updated in-place by `session_id`
- Focus automatically updates when sessions are removed
- Auto-compact toggle updates all sessions' `autocompact` field

#### **Secondary: `useProjectScope` Hook**

Location: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/hooks/useProjectScope.tsx` (57 lines)

**What it manages:**
```typescript
interface ProjectScopeContextValue {
  selectedProject: string | null;
  setSelectedProject: (project: string | null) => void;
  filterSessions: (sessions: Session[]) => Session[];
  archivedProjects: string[];
  setArchivedProjects: (projects: string[]) => void;
}
```

**Purpose:**
- Project filtering at Dashboard level
- Users can select a specific project to view only that project's sessions
- Provides a reusable filter function that returns all sessions if no project selected

#### **Tertiary: `useNotifications` Hook**

Location: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/hooks/useNotifications.tsx` (303 lines)

**What it manages:**
```typescript
interface NotificationContextValue {
  settings: NotificationSettings;
  updateSettings: (patch: Partial<NotificationSettings>) => void;
  toggleCategory: (cat: NotificationCategory) => void;
  browserPermission: NotificationPermission | 'unsupported';
  requestBrowserPermission: () => Promise<void>;
}
```

**Purpose:**
- Notification settings (persisted to localStorage)
- Context threshold alerts (50%, 70%, 90%)
- Large operation notifications
- Plan creation alerts
- Auto-compact alerts
- Cooldown management to prevent notification spam
- Uses previous state diffing to detect changes

### 3. **Session Display Architecture**

#### **Dashboard Page** (`pages/Dashboard.tsx`)
```
useJacquesClient() 
  ↓ gets sessions
useProjectScope() 
  ↓ filters by selected project
useSessionBadges() 
  ↓ fetches badges (plans, agents, etc.) with 30-sec TTL cache
  ↓
SessionCard[] (grid layout, 3-column responsive)
  ↓ onClick → ActiveSessionViewer
```

**Session Card Display** (`SessionCard.tsx`):
- Status dot + indicator (working/idle/active with pulse animation)
- Session title (auto-formatted for embedded plans)
- Model name (claude-opus, claude-haiku, etc.)
- Time since last activity
- Context meter (visual progress bar)
- Plan count + Plan icon button
- Agent count + Agent icon button
- Footer icons (MCP count, web search count, auto-compact indicator)
- Focused state styling (orange border, glow effect)

#### **Active Sessions Viewer** (`ActiveSessionViewer.tsx`)
- Fetches session transcript from API via `getSession()`
- Transforms JSONL entries to ConversationMessage format
- Filters internal messages (command-related)
- Aggregates tokens across tool calls
- Renders full conversation with all message types

### 4. **Session Detail/Conversation View**

#### **ConversationViewer Component** (`components/Conversation/ConversationViewer.tsx`)

**Features:**
- Full-screen conversation display with navigation
- Question navigator (jump between user messages)
- Plan navigator (jump between embedded plans)
- Subagent navigator (view subagent conversations)
- Message types supported:
  - Text messages
  - Thinking blocks (collapsible)
  - Tool calls (Read, Write, Bash, etc. with collapsible details)
  - Code blocks with syntax highlighting
  - Agent progress (Explore, Plan agents)
  - Bash progress (command output streaming)
  - MCP tool calls
  - Web search queries and results
- Token tracking per message
- Auto-compact indicators

#### **Session Data Transform Pipeline**
```
ParsedEntry[] (from API)
  ↓
transformEntriesToMessages()
  ↓
ConversationMessage[]
  ↓
ConversationViewer component renders
```

**ParsedEntry Types Handled:**
- `user_message` → filters internal commands
- `assistant_message` → groups with tool calls
- `tool_call` → accumulates tokens
- `tool_result` → attaches to previous tool call
- `agent_progress` → renders agent blocks
- `bash_progress` → renders command output
- `mcp_progress` → renders MCP tool calls
- `web_search` → renders search queries and results

### 5. **Custom Hooks Summary**

| Hook | Location | Purpose | State Type |
|------|----------|---------|-----------|
| `useJacquesClient` | `hooks/useJacquesClient.ts` | Main WebSocket connection + session state | Hook + WebSocket client |
| `useProjectScope` | `hooks/useProjectScope.tsx` | Project filtering context | Context Provider |
| `useNotifications` | `hooks/useNotifications.tsx` | Notification settings + event detection | Context Provider |
| `useSessionBadges` | `hooks/useSessionBadges.ts` | Fetch + cache session badges (30sec TTL) | Hook with useRef caching |

### 6. **Package Dependencies**

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.22.3",
  "react-markdown": "^10.1.0",
  "lucide-react": "^0.469.0"
}
```

**No state management library dependencies** - relies purely on React's built-in mechanisms.

### 7. **Layout & Navigation Structure**

**Layout.tsx** - Main wrapper:
```
┌─────────────────────────────────┐
│  Sidebar (240px)     Content Area │
├──────────┬──────────────────────┤
│ Logo     │   <Outlet />         │
│ ─────    │  (Dashboard, etc.)   │
│ Projects │                      │
│ Nav      │  MultiLogPanel       │
│ Sources  │  (optional, toggle)  │
│ Settings │                      │
└──────────┴──────────────────────┘
```

**Routes:**
- `/` → Dashboard (active sessions grid)
- `/conversations` → Saved conversations list
- `/archive` → Archived conversations with search
- `/project` → Project-scoped dashboard
- `/context` → Context file management
- `/settings` → Notification & source settings
- `/sources` → OAuth integrations (Google Docs, Notion)

### 8. **Session Lifecycle in GUI**

```
1. WebSocket receives session_update
2. useJacquesClient updates sessions state
3. Dashboard filters via useProjectScope
4. SessionCard renders with badges (via useSessionBadges)
5. Click session → ActiveSessionViewer
6. Fetches full transcript via API
7. Transforms and displays in ConversationViewer
8. User can navigate questions, plans, subagents
```

### 9. **Key Architectural Patterns**

**Pattern 1: Unidirectional WebSocket Data Flow**
```
Jacques Server (WebSocket)
    ↓
BrowserJacquesClient.onMessage()
    ↓
React state update (setSessions, etc.)
    ↓
Component re-render
```

**Pattern 2: Lazy Badge Fetching**
- Only fetch badges for visible sessions
- 30-second cache TTL per badge
- Parallel fetching with `Promise.allSettled()`
- Silent failure (individual badge failures don't break UI)

**Pattern 3: Memoized Filtering**
```typescript
const filteredSessions = useMemo(
  () => filterSessions(sessions),
  [sessions, filterSessions]
);
```

**Pattern 4: Notification Event Detection via Refs**
- Previous state tracked in useRef (no re-renders)
- Diff detection on each render
- Cooldown gates prevent spam
- Both in-app toasts and browser notifications

**Pattern 5: Session Transform Pipeline**
- API returns raw ParsedEntry array
- Transform to ConversationMessage for display
- Filters internal command messages
- Aggregates tokens across chunks

### 10. **Storage Mechanisms**

| Data | Storage | Purpose |
|------|---------|---------|
| Notification settings | localStorage | Persist user preferences |
| Show logs toggle | localStorage | Remember sidebar state |
| Session state | Memory (React state) | Active sessions only |
| Badges | Memory (useRef Map) | 30-sec TTL cache |

**No persistent session storage** - sessions only live during active connection.

---

This is a well-architected, modern React GUI that prioritizes simplicity and directness: **Context API for shared state, hooks for encapsulation, WebSocket for real-time updates, and localStorage for user preferences**.