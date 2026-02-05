# Explore: Find GUI catalog code

> Session: `28a70977-a8f4-4e37-9059-2ccef9a41daf`
> Date: 2026-02-02
> Tokens: ~65 383

---

Perfect! I now have a comprehensive understanding of the GUI catalog. Let me provide a complete summary.

## GUI Catalog - Complete Overview

I found the **GUI catalog** in `/Users/gole/Desktop/jacques-context-manager/gui/` - a **React/Vite-based web application** that's completely separate from the terminal dashboard. Here's the detailed breakdown:

### Technology Stack
- **Framework**: React 18.3.1 with React Router DOM for navigation
- **Build Tool**: Vite 5.4.11 (dev on port 5173, production served at `/api`)
- **Language**: TypeScript
- **Styling**: CSS custom properties with a dark theme (correlated with terminal palette)
- **Package**: `@jacques/gui` (v0.1.0)

### Architecture

**Three-Layer Communication**:
```
Web Browser (React GUI on port 5173)
    ↓ (HTTP REST API on port 4243)
Jacques Server (Node.js backend)
    ↓ (WebSocket on port 4242)
Claude Code/Cursor sessions
```

### Directory Structure
```
gui/src/
├── pages/                    # 8 main pages/views
│   ├── Dashboard.tsx         # Active sessions grid display
│   ├── Conversations.tsx     # Mock conversation viewer (demo)
│   ├── Archive.tsx          # Archived sessions browser (30.6 KB)
│   ├── Context.tsx          # Context management (placeholder)
│   ├── Settings.tsx         # Application settings
│   ├── Sources.tsx          # External source configuration
│   ├── GoogleDocsConnect.tsx # OAuth integration
│   └── NotionConnect.tsx     # OAuth integration
├── components/              # 24 React components
│   ├── Layout.tsx          # Main sidebar + routing
│   ├── SessionCard.tsx      # Individual session display
│   ├── ProjectSelector.tsx  # Project filtering
│   ├── ContextMeter.tsx     # Token usage visualization
│   ├── LogPanel.tsx         # Activity logs
│   ├── MultiLogPanel.tsx    # Integrated log viewer (33.3 KB)
│   └── Conversation/        # 19 conversation display components
│       ├── ConversationViewer.tsx      # Main viewer (26.6 KB)
│       ├── AssistantMessageGroup.tsx   # Message grouping (17.7 KB)
│       ├── UserMessage.tsx             # User message rendering
│       ├── AssistantMessage.tsx        # Assistant message rendering
│       ├── AgentProgressBlock.tsx      # Subagent execution display
│       ├── SubagentNavigator.tsx       # Subagent selection
│       ├── SubagentConversation.tsx    # Full subagent viewer
│       ├── PlanViewer.tsx              # Plan display
│       ├── PlanNavigator.tsx           # Plan selection
│       ├── QuestionNavigator.tsx       # User question navigation
│       ├── BashProgressBlock.tsx       # Command execution display
│       ├── WebSearchBlock.tsx          # Search results display
│       ├── MCPProgressBlock.tsx        # MCP tool execution
│       ├── CodeBlock.tsx               # Code display
│       ├── CollapsibleBlock.tsx        # Expandable sections
│       └── MarkdownRenderer.tsx        # Markdown parsing
├── hooks/                   # React hooks
│   ├── useJacquesClient.ts  # WebSocket browser client
│   └── useProjectScope.tsx  # Project filtering context
├── api/                     # REST API client
│   ├── config.ts           # API configuration (762 lines)
│   └── index.ts            # API endpoint definitions
├── styles/                  # Theme & styling
│   ├── globals.css         # Dark theme CSS variables
│   └── theme/
│       ├── colors.ts       # Color palette
│       └── index.ts        # Theme exports
├── utils/                   # Utilities
│   └── tokens.ts           # Token calculation helpers
├── types.ts                # TypeScript type definitions
├── App.tsx                 # React Router configuration
└── main.tsx                # Entry point
```

### Key Features

**1. Dashboard (Real-Time Session Monitoring)**
- Live session grid with connection status
- Project scope filtering
- Session card display with token usage percentages
- Connected/disconnected status indicator

**2. Archive Browser (30.6 KB)**
- Sessions grouped by project with expand/collapse
- Rebuild index functionality with SSE progress streaming
- Client-side search filtering
- Session metadata display (messages, tools, tokens, plans)
- Badges for planning mode, execution mode, auto-compact, plans
- Click to view full conversation details

**3. Conversation Viewer (26.6 KB)**
- Displays Claude Code JSONL sessions
- Supports all progress types:
  - User messages (filtered for internal CLI commands)
  - Assistant messages with thinking blocks
  - Tool calls and results
  - Agent progress (subagents)
  - Bash command execution
  - MCP tool calls
  - Web search operations
- Token counting display
- Subagent browser
- Plan viewer with code syntax highlighting
- Question and subagent navigation

**4. External Source Integration**
- Obsidian vault browser
- Google Docs OAuth integration
- Notion OAuth integration
- Source status indicators in sidebar

**5. Real-Time Session Synchronization**
- WebSocket client (`useJacquesClient` hook)
- Auto-reconnection with exponential backoff (max 10 attempts)
- Handles: initial state, updates, removals, focus changes, logs

### API Integration

The GUI communicates with the server via REST API at `/api/`:

**Sessions API** (Hybrid - reads JSONL directly):
- `/sessions` - List all sessions
- `/sessions/stats` - Statistics
- `/sessions/:id` - Full session with parsed entries
- `/sessions/by-project` - Sessions grouped by project
- `/sessions/:id/subagents/:agentId` - Subagent data
- `/sessions/rebuild` - Rebuild index (SSE streaming)

**Archive API** (Dual storage system):
- `/archive/stats` - Archive statistics
- `/archive/conversations` - List archived conversations
- `/archive/conversations/by-project` - Group by project
- `/archive/conversations/:id` - Full conversation
- `/archive/subagents/:agentId` - Archived subagent
- `/archive/search` - Keyword search with filters
- `/archive/initialize` - Bulk archive all sessions (SSE streaming)

**Sources API**:
- `/sources/status` - Connection status for all sources
- `/sources/google` - Google Docs configuration
- `/sources/notion` - Notion configuration

### Design Theme

**Dark Terminal-Inspired Aesthetic**:
- Primary background: `#0d0d0d` (near black)
- Secondary: `#1a1a1a` (panels)
- Elevated: `#252525` (interactive elements)
- Accent: `#E67E52` (soft coral - Jacques mascot color)
- Orange accent: `#FF6600` (project names)
- Text: `#ffffff` (primary), `#8B9296` (secondary), `#6B7075` (muted)
- Semantic: Green (#4ADE80), Yellow (#FBBF24), Red (#EF4444)

### Distinctive Differences from Terminal Dashboard

| Aspect | Terminal Dashboard (Ink) | Web GUI (React) |
|--------|-------------------------|-----------------|
| **UI Framework** | Ink/React for CLI | React DOM for web |
| **Rendering** | Terminal ANSI codes | Browser HTML/CSS |
| **Data Display** | Fixed 10-row viewport | Responsive scrollable layout |
| **Interactions** | Keyboard bindings (arrow keys) | Mouse + keyboard |
| **Session Viewing** | Summary cards only | Full conversation viewer |
| **Archive Access** | CLI commands only | Interactive browser |
| **Plan Viewing** | Basic text display | Syntax-highlighted code blocks |
| **Subagent Access** | Via CLI search | Interactive navigator |
| **WebSocket** | Direct for updates | Via browser client |
| **OAuth Sources** | File-based config | Interactive OAuth flow |
| **Context Details** | Simple percentage | Multi-section breakdown |

### File Statistics
- **Total files**: 47 TypeScript/TSX files
- **Total size**: ~300+ KB (raw source)
- **Largest files**: Archive viewer (30.6 KB), MultiLogPanel (33.3 KB), ConversationViewer (26.6 KB)
- **API client**: 762 lines (comprehensive REST interface)

### Entry Point
The GUI starts at `/gui/src/main.tsx`:
1. Mounts React at `#root` DOM element
2. Sets up React Router for client-side navigation
3. Wraps with `ProjectScopeProvider` for project filtering context
4. Routes all requests through `Layout` component with sidebar navigation

This is a **full-featured web application** distinctly separate from the terminal dashboard, providing a richer interactive experience for monitoring sessions, browsing conversations, and managing external sources through a browser interface.