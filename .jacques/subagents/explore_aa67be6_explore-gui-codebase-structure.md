# Explore: Explore GUI codebase structure

> Session: `85ffdbfe-4034-4a10-a8c4-dc4c5607040f`
> Date: 2026-02-03
> Tokens: ~62 917

---

Perfect! Now I have a comprehensive understanding of the GUI codebase. Let me provide you with a thorough analysis.

## Complete GUI Codebase Analysis

### Architecture Overview

The Jacques GUI is a **React-based single-page application** built with **React Router** and **TypeScript**. It connects to the Jacques server via WebSocket and provides real-time monitoring of Claude Code sessions.

---

## Core Files

### 1. **App.tsx** (37 lines)
The root component that sets up routing and project scope context.

**Key Features:**
- Uses React Router with nested routes
- Wraps entire app in `ProjectScopeProvider` for cross-component project filtering
- Routes:
  - `/` - Dashboard (active sessions)
  - `/project` - Project dashboard
  - `/conversations` - Conversations list and detail view
  - `/archive` - Archived sessions
  - `/context` - Context management
  - `/settings` - Settings
  - `/sources` - External sources (Obsidian, Google Docs, Notion)
  - OAuth callback routes for Google/Notion

---

### 2. **Layout.tsx** (320 lines)
Main application shell with sidebar navigation and content area.

**Structure:**
```
┌─────────────────────────────────────────┐
│ Sidebar (240px)                          │
│ - Logo + Mascot                         │
│ - Project Selector                      │
│ - Navigation (Dashboard, Archive, etc.) │
│ - Sources Section (connection status)   │
│ - Settings + Log Toggle                 │
└─────────────────────────────────────────┘
                │
                └──> Content Area
                     ├── Main (scrollable)
                     └── MultiLogPanel (collapsible)
```

**Key Features:**
- Real-time connection status via `useJacquesClient`
- Project scope filtering with `useProjectScope`
- Session badges for notifications (plan count, auto-compact)
- Toggleable log panel (persisted to localStorage)
- Sources connection indicators (Obsidian, Google Docs, Notion)
- Wrapped in `NotificationProvider` for toast alerts

**Styling:**
- Soft coral accent color (#E67E52)
- Dark theme with subtle borders
- Active route indicator (2px accent bar on left)

---

### 3. **Dashboard.tsx** (135 lines)
Main view showing active Claude Code sessions.

**Features:**
- Grid of `SessionCard` components (responsive: 320px min width)
- Project filtering via scope selector
- Session click opens `ActiveSessionViewer`
- Badge integration (plan count, auto-compact status)
- Empty state when no sessions

**Layout:**
- Header with session count and connection badge
- Scope indicator when filtered
- 3-column responsive grid

---

### 4. **Archive.tsx** (842 lines)
Archived session browser with search and rebuild functionality.

**Features:**
- **Session indexing:** Scans `~/.claude/projects/` for completed sessions
- **Rebuild index:** Manual refresh with progress bar
- **Search:** Filter by title or project slug
- **Expandable project groups:** Click to expand/collapse session lists
- **Session cards:** Show metadata, badges, token counts
- **Transform to ConversationViewer:** Loads full session data on click

**Data Flow:**
1. Load stats and sessions via `getSessionStats()` / `listSessionsByProject()`
2. Group by project slug
3. Click session → fetch via `getSession(id)` → transform to `SavedConversation`
4. Render in `ConversationViewer`

**Badges:**
- Planning/Execution mode
- Plan count
- Auto-compacted indicator
- Message/tool counts
- Token counts (input/output)

---

### 5. **ActiveSessionViewer.tsx** (424 lines)
Wrapper that fetches live session data and displays in `ConversationViewer`.

**Features:**
- Fetches transcript from active session ID
- Handles "awaiting first response" state (session just started)
- Loading/error states with retry
- Transforms `SessionData` → `SavedConversation` format
- Reuses existing `ConversationViewer` component

**Transform Logic:**
- Groups entries by type (user/assistant/tool)
- Filters out internal command messages (`<local-command-*>`)
- Accumulates token counts from usage data
- Handles subagent metadata

---

### 6. **ConversationViewer.tsx** (860 lines)
The **most complex component** - renders full conversation transcripts with rich features.

**Major Features:**

#### Message Grouping
- Consecutive assistant messages grouped together
- User messages standalone
- Markers inserted for `/clear` commands and auto-compact events

#### Content Type Filters (Dropdown)
- Agents (subagent calls)
- Bash (streaming output)
- MCP (tool calls)
- Web Search
- Tool Calls
- Thinking (extended reasoning)

#### Navigation
- **QuestionNavigator:** Jump between user questions (`[` / `]` keys)
- **PlanNavigator:** Jump to embedded plans, view plan files
- **SubagentNavigator:** Jump to subagent calls
- Keyboard shortcuts: `e` (expand all), `c` (collapse all), `End` (scroll to bottom)

#### Smart Plan Detection
- Detects patterns like "Implement the following plan:" in user messages
- Extracts first heading or line as plan title
- Shows green file icon + "Plan: [title]" in header

#### Token Display
- Prefers **actual tokens** from Claude API when available
- Falls back to estimated tokens (tiktoken-based)
- Shows cache breakdown (cache creation, cache read)
- Subagent token aggregation

#### Scroll Behavior
- Tracks current message index during scroll
- Shows "Scroll to End" button when >200px from bottom
- Smooth scrolling to messages/content

#### Markers
- `/clear` command marker (shows timestamp)
- Auto-compact marker (shows when compaction occurred)

#### Target Navigation
- Can navigate to specific content within a message (e.g., a specific subagent call)
- Used by navigators to highlight exact content

---

## Hooks

### 1. **useJacquesClient.ts** (359 lines)
WebSocket client for connecting to Jacques server.

**Connection:**
- Server URL: `ws://localhost:4242` (or from `VITE_JACQUES_SERVER_URL`)
- Auto-reconnect with exponential backoff (max 10 attempts)
- Maintains connection state

**Events Received:**
- `initial_state` - Full session list on connect
- `session_update` - Real-time session updates
- `session_removed` - Session ended
- `focus_changed` - User switched terminal focus
- `autocompact_toggled` - Settings changed
- `server_log` - Server logging
- `claude_operation` - Claude operation tracking (for large ops notifications)
- `api_log` - HTTP API call logging
- `handoff_ready` - Handoff document generated

**Actions Sent:**
- `select_session` - Focus a session
- `trigger_action` - smart_compact / new_session / save_snapshot
- `toggle_autocompact` - Toggle auto-compact setting

**State Management:**
- Maintains arrays of sessions, logs, operations
- Circular buffers (max 100/50/100 entries)
- Sorts sessions by last_activity descending

---

### 2. **useProjectScope.tsx** (57 lines)
Context provider for project filtering across the app.

**Features:**
- Selected project state (null = "All Projects")
- Filter function (returns all sessions or filtered by project)
- Archived projects list (for dropdown)
- Persisted across navigation

---

### 3. **useSessionBadges.ts** (107 lines)
Fetches metadata badges for sessions (plan count, auto-compact status).

**Features:**
- On-demand fetching for array of session IDs
- 30-second TTL cache (badges change as session progresses)
- Parallel fetching with `Promise.allSettled`
- Silently ignores failures for individual sessions
- Returns `Map<sessionId, SessionBadges>`

**Used By:**
- Layout (for notification detection)
- Dashboard (for SessionCard badges)

---

### 4. **useNotifications.tsx** (303 lines)
Notification system with in-app toasts and browser notifications.

**Features:**

#### Categories
- Context thresholds (50%, 70%, 90%)
- Large operations (>20k tokens)
- Plan creation
- Auto-compact events
- Handoff generation

#### Detection Strategy
- **Diff-based:** Compares previous state with current
- **Cooldowns:** Prevents spam (per category, 30s - 2min)
- **Threshold tracking:** Fires once per threshold per session

#### Delivery
- **In-app toast:** Always shown
- **Browser notification:** Only when tab unfocused

#### Settings
- Stored in localStorage
- Toggle categories independently
- Adjust thresholds (context %, large operation tokens)
- Global enable/disable

#### Browser Permission
- Tracks permission state (granted/denied/unsupported)
- Request permission function

---

## Component Files

### UI Components (/components/ui/)
- **TerminalPanel.tsx** - Container with Mac-style dots and title
- **SearchInput.tsx** - Input with result count
- **Badge.tsx** - Status indicators (variants: live, plan, agent, compacted, etc.)
- **EmptyState.tsx** - Icon + message for empty views
- **SectionHeader.tsx** - Styled section titles
- **Toast.tsx / ToastContainer.tsx** - Notification system
- **LineNumberList.tsx** - Terminal-style numbered lists

### Conversation Components (/components/Conversation/)
- **ConversationViewer.tsx** - Main viewer (860 lines)
- **AssistantMessageGroup.tsx** - Groups consecutive assistant messages
- **AssistantMessage.tsx** - Individual assistant message
- **UserMessage.tsx** - User message
- **CollapsibleBlock.tsx** - Expandable content blocks
- **ConversationMarker.tsx** - Visual separators (clear/compact)
- **AgentProgressBlock.tsx** - Subagent call display
- **BashProgressBlock.tsx** - Bash streaming output
- **MCPProgressBlock.tsx** - MCP tool call display
- **WebSearchBlock.tsx** - Web search query/results
- **PlanNavigator.tsx** - Right panel for plan navigation
- **PlanViewer.tsx** - Modal for viewing plan files
- **QuestionNavigator.tsx** - Right panel for question navigation
- **SubagentNavigator.tsx** - Right panel for subagent navigation
- **SubagentConversation.tsx** - Renders subagent JSONL
- **CodeBlock.tsx** - Syntax-highlighted code blocks
- **MarkdownRenderer.tsx** - Markdown to JSX

### Other Components
- **SessionCard.tsx** - Card for active sessions
- **ProjectSelector.tsx** - Dropdown for project filtering
- **ContextMeter.tsx** - Progress bar for context usage
- **LogPanel.tsx** - Single log panel
- **MultiLogPanel.tsx** - Tabbed log panel (server/API/Claude ops)
- **TokenProgressBar.tsx** - Token usage visualization
- **PlanList.tsx** - List of plans in a session

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Jacques Server (Node.js)                                     │
│   - Unix socket listener (/tmp/jacques.sock)               │
│   - WebSocket server (port 4242)                            │
│   - HTTP API (port 4243)                                    │
└─────────────────────────────────────────────────────────────┘
                    │
                    │ WebSocket
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ useJacquesClient Hook                                        │
│   - Connects to ws://localhost:4242                         │
│   - Maintains session state                                 │
│   - Broadcasts updates to React                             │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ React Components                                             │
│   - Dashboard (active sessions)                             │
│   - Archive (completed sessions)                            │
│   - ConversationViewer (transcript rendering)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Patterns

### 1. **Transform Functions**
Archive and ActiveSessionViewer use identical transform logic:
- `transformEntriesToMessages()` - ParsedEntry[] → ConversationMessage[]
- `transformToSavedConversation()` - SessionData → SavedConversation

### 2. **Navigation Targets**
ConversationViewer supports precise navigation:
```typescript
interface NavigationTarget {
  messageIndex: number;
  contentIndex?: number;
  contentId?: string;  // e.g., agentId for subagents
}
```

### 3. **Content Filtering**
All content blocks respect `ContentTypeFilters`:
- Agent progress
- Bash output
- MCP calls
- Web search
- Tool use/results
- Thinking blocks

### 4. **Ref Management**
ConversationViewer uses `messageRefs` Map for scroll positioning:
```typescript
const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
```

### 5. **Cache Strategy**
useSessionBadges implements TTL-based caching:
- 30-second cache per session
- Parallel fetching
- Graceful degradation on failure

---

## File Counts

**Hooks:** 4 files
**Components:** 41 files total
- Main: 8
- UI: 9
- Conversation: 24

---

## Technology Stack

- **React 18** (with Router v6)
- **TypeScript** (strict mode)
- **Vite** (dev server)
- **WebSocket** (real-time communication)
- **React Markdown** (conversation rendering)
- **Lucide React** (icons)
- **LocalStorage** (settings persistence)
- **Browser Notification API** (alerts)

---

## Summary

The GUI is a **professional-grade monitoring dashboard** with:
- Real-time session tracking
- Rich conversation viewing with syntax highlighting
- Intelligent navigation (questions, plans, subagents)
- Notification system (in-app + browser)
- Project scope filtering
- Archive management with search
- External source integration (Obsidian, Google Docs, Notion)

The codebase demonstrates excellent separation of concerns, with hooks handling data/state and components focusing on presentation. The `ConversationViewer` is particularly sophisticated, handling complex message grouping, filtering, navigation, and keyboard shortcuts.