# Explore: Explore Jacques GUI architecture

> Session: `be3139b4-92c8-4515-8a8a-6a2371b9f165`
> Date: 2026-02-03
> Tokens: ~83 744

---

Perfect! Now I have a comprehensive understanding of the Jacques GUI app. Let me create a detailed report summarizing all the key findings.

## Jacques GUI Architecture Report

Based on my thorough exploration of `/Users/gole/Desktop/jacques-gui-redesign/gui/src/`, here's a complete understanding of the Jacques GUI app:

---

### **1. Overall Architecture**

**Framework**: **Vite + React 18 + TypeScript**
- **Build Tool**: Vite (dev server on port 5173)
- **Routing**: React Router v6 (client-side routing)
- **Styling**: Inline CSS-in-JS (React.CSSProperties) - no external CSS framework
- **Package Manager**: npm/ES modules

**Key Configuration Files**:
- `package.json`: ES modules (`"type": "module"`), minimal dependencies (React, React Router, Lucide React icons, React Markdown)
- `vite.config.ts`: Configured with React plugin, port 5173, path alias `@/`
- `tsconfig.json`: ES2020 target, strict mode, bundler resolution

---

### **2. Server Connection Strategy**

**WebSocket Connection** (Real-time updates):
- **URL**: `ws://localhost:4242` (production) or configurable via `VITE_JACQUES_SERVER_URL` environment variable
- **Client**: Browser-based WebSocket in `useJacquesClient.ts`
- **Class**: `BrowserJacquesClient` - simplified WebSocket wrapper (no Node.js EventEmitter)
- **Auto-reconnect**: Exponential backoff (max 10 attempts, up to 30 seconds)

**HTTP REST API** (Historical data, archive, sessions):
- **Base URL**: `http://localhost:4243/api` (dev) or `/api` (production)
- **Key Endpoints**:
  - `/api/sources/status` - Source configuration status (Obsidian, Google Docs, Notion)
  - `/api/archive/*` - Archived conversations, search, statistics
  - `/api/sessions/*` - Session index, detailed session data, subagents
  - `/api/claude/operations/*/debug` - Debug data for Claude operations

---

### **3. Data Flow from Server to GUI**

**WebSocket Messages (Real-time)**:

| Message Type | Payload | Trigger | Use Case |
|---|---|---|---|
| `initial_state` | Sessions[], focused_session_id | Client connects | Bootstrap UI state |
| `session_update` | Session | Session changes (activity, context) | Update live session cards |
| `session_removed` | session_id | Session ends | Remove from dashboard |
| `focus_changed` | session_id, Session | Focus shifts | Highlight active session |
| `autocompact_toggled` | enabled | User toggles setting | Update autocompact status |
| `server_log` | level, message, source | Server logging | Display in log panel |
| `claude_operation` | ClaudeOperation (token metrics) | LLM operation | Show in operation logs |
| `api_log` | method, path, status, durationMs | API call | HTTP request tracking |

**HTTP API Responses**:
- **Sessions Index**: Lightweight metadata (title, dates, token counts, mode, plans, subagents)
- **Session Details**: Full JSONL parsing (user/assistant messages, tool calls, progress entries)
- **Archive**: Manifests with extracted metadata (files modified, technologies, tool usage)

---

### **4. Component Structure & Pages**

**Pages** (`src/pages/`):
- **Dashboard.tsx** - Active sessions grid with status indicators, context meters
- **ProjectDashboard.tsx** - Advanced session details (conversation viewer, token breakdown)
- **Conversations.tsx** - Saved conversation browser
- **Archive.tsx** - Session index with project grouping, rebuild functionality
- **Context.tsx** - External context management (Obsidian, Google Docs, Notion)
- **Settings.tsx** - Configuration UI
- **Sources.tsx** - External source connections (OAuth callbacks)
- **GoogleDocsConnect.tsx** / **NotionConnect.tsx** - OAuth flow handlers

**Layout System** (`src/components/Layout.tsx`):
```
Sidebar (240px)
├─ Logo/Jacques mascot
├─ Project Scope Selector (filters sessions by project)
├─ Navigation (Dashboard, Project, Conversations, Archive, Context)
├─ Sources Status (Obsidian, Google Docs, Notion connection dots)
└─ Footer (Settings, Logs toggle)

Content Area
├─ Main (Outlet for page routes)
└─ MultiLogPanel (resizable, tab-based logging)
```

**Core Components**:
- **SessionCard.tsx** - Display active session with status dot, context meter, plan/agent indicators
- **ContextMeter.tsx** - Visual token usage percentage bar
- **Conversation/** - Viewer components (message, thinking, tools, agents, bash, MCP, web search)
- **MultiLogPanel.tsx** - Tabbed log viewer (Server, API, Claude operations, All)
- **LogPanel.tsx** - Collapsible server logs with auto-scroll
- **ProjectSelector.tsx** - Dropdown to filter by project

**UI Components** (`src/components/ui/`):
- Badge, EmptyState, SectionHeader, TerminalPanel, SearchInput, LineNumberList

---

### **5. Existing Notification/Alert Mechanisms**

**Log Panel System**:
1. **MultiLogPanel.tsx** (bottom fixed panel, resizable)
   - 4 tabs: All, Server, API, Claude Operations
   - Error/warning badges on tabs
   - Auto-scroll with manual scroll detection
   - Expandable/collapsible with localStorage persistence
   - Height drag-to-resize (60px min, 600px max)

2. **ServerLog Display**:
   - Color-coded by level (error/warning/info)
   - Timestamp, source tag, message
   - Expandable text for long messages

3. **Claude Operations Panel**:
   - Start phase: Shows estimated token usage
   - Complete phase: Shows actual tokens (input, output, cache read), duration, success/failure
   - Token breakdown: user prompt + system prompt + overhead
   - Tools called with visual indicators (Write vs other tools)
   - "View Full Details" button fetches debug data (prompts, events)

4. **Error Banners**:
   - Archive page: Error banner with dismiss button
   - Session loading errors propagate to UI

5. **Status Indicators**:
   - Connection badge (Connected/Disconnected) in dashboard header
   - Session status dots (working/idle/active) with pulse animation
   - Source connection dots (green = connected, muted = disconnected)
   - Mode pills (Planning/Executing) on session cards

---

### **6. Build & Dev Setup**

**Development**:
```bash
npm run dev              # Vite dev server on 5173
npm run build           # TypeScript + Vite build
npm run preview         # Preview production build
```

**Environment Variables**:
- `VITE_JACQUES_SERVER_URL` - WebSocket URL override (default: `ws://localhost:4242`)
- `VITE_JACQUES_API_URL` - HTTP API URL (default: `http://localhost:4243` in dev, `/api` in prod)
- `import.meta.env.DEV` - Vite dev mode flag

**State Management**:
- **No Redux/Zustand** - React Context + hooks
- **useJacquesClient**: WebSocket connection, session state, logs
- **useProjectScope**: Project filtering context
- **useSessionBadges**: Fetches session metadata (plans, agents, tools used)
- **Local state**: Individual component useState for modals, expansion, search

**TypeScript Configuration**:
- ES2020 target, strict mode enabled
- ES modules with bundler resolution
- Path alias: `@/` → `./src/`
- No external type definitions needed

---

### **Key Features Implemented**

1. **Real-time Session Monitoring** - WebSocket streams live updates (context, status)
2. **Project Scoping** - Filter active sessions by project
3. **Session Badges** - Plan count, agent count, web searches, MCP tools, auto-compact indicator
4. **Token Tracking** - Context meter shows usage %, Claude operations log tracks input/output tokens
5. **Conversation Viewer** - Renders JSONL entries with collapsible tools, thinking blocks, agent progress
6. **Session Archive** - Browse/search historical sessions with rebuild index
7. **External Sources** - Connect Obsidian, Google Docs, Notion for context loading
8. **Resizable Log Panel** - Multi-tab logging with expandable debug details
9. **OAuth Integration** - Google Docs & Notion OAuth callbacks

---

### **Network Architecture**

```
Browser (GUI on 5173/served from 4243)
    ↓ WebSocket ws://localhost:4242
Jacques Server (4242 - WebSocket, 4243 - HTTP API)
    ↓ Unix socket /tmp/jacques.sock
Session Registry & Hooks
```

---

### **File Locations Summary**

| Category | Path |
|---|---|
| Entry point | `src/main.tsx` |
| App routing | `src/App.tsx` |
| Types | `src/types.ts` |
| API client | `src/api/config.ts`, `src/api/index.ts` |
| WebSocket hook | `src/hooks/useJacquesClient.ts` |
| Project scope | `src/hooks/useProjectScope.tsx` |
| Theme colors | `src/styles/theme/` |
| Pages | `src/pages/` (9 pages) |
| Components | `src/components/` (30+ components) |
| Config | `vite.config.ts`, `tsconfig.json` |

This is a clean, modern React GUI with direct WebSocket and HTTP communication to the Jacques server, using React Context for state management and inline styling for maximum flexibility.