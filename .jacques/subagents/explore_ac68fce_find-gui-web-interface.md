# Explore: Find GUI web interface

> Session: `c113e71d-f804-4875-b8a5-956015ed3948`
> Date: 2026-01-31
> Tokens: ~45 841

---

Perfect! I now have a comprehensive understanding of the web GUI. Let me compile my findings:

## Web GUI Interface Discovery

I found a fully-fledged **web GUI** built with React, TypeScript, and Vite. Here's what I discovered:

### Location & Configuration
- **Directory**: `/Users/gole/Desktop/jacques-context-manager/gui/`
- **Framework**: React 18 + TypeScript 5.7
- **Build Tool**: Vite 5.4
- **Development Server Port**: `5173`
- **Build Command**: `npm run build` or from root: `npm run build:gui`
- **Dev Command**: `npm run dev:gui` or `npm run start:gui`

### Architecture Overview

**Entry Point**: `gui/src/main.tsx`
- Uses React Router v6 for navigation
- Connects to Jacques server via WebSocket on `ws://localhost:4242` (configurable via `VITE_JACQUES_SERVER_URL`)

**WebSocket Client** (`gui/src/hooks/useJacquesClient.ts`):
- Custom `BrowserJacquesClient` class (browser-safe alternative to Node.js EventEmitter)
- Auto-reconnection with exponential backoff (up to 10 attempts)
- Message types: `initial_state`, `session_update`, `session_removed`, `focus_changed`, `autocompact_toggled`

### Core Pages & Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | Dashboard | Main view showing active sessions in grid layout |
| `/conversations` | Conversations | Browse and view saved conversations with details |
| `/conversations/:id` | Conversation Viewer | Detailed view of individual conversations |
| `/archive` | Archive | Search across archived conversations (placeholder: coming soon) |
| `/context` | Context | Manage context files (placeholder: coming soon) |
| `/settings` | Settings | Configure archive filter and auto-archive options |

### Key Components

**Layout** (`gui/src/components/Layout.tsx`):
- Sidebar with navigation, project selector, sources section
- Jacques mascot logo
- Sources status indicators (Obsidian connected, Google Docs/Notion pending)
- 240px fixed-width sidebar with scrollable main content area

**Dashboard** (`gui/src/pages/Dashboard.tsx`):
- Connection status indicator (green/red dot)
- Project filtering support
- Grid layout for session cards (auto-fill, min 300px)
- Shows count of active sessions, total sessions when filtered

**SessionCard** (`gui/src/components/SessionCard.tsx`):
- Displays project name, session title, model
- Shows status icon (⚡ working, 💤 idle, ● active)
- Context meter with percentage and token counts
- Terminal program info
- "Focused" badge for focused session
- Colored border accent for focused sessions

**ContextMeter** (`gui/src/components/ContextMeter.tsx`):
- Progress bar visualization
- Shows percentage with estimate indicator (~)
- Token count display (formats as M/k for readability)
- Current tokens / max tokens (e.g., "250k / 200k")

**Conversation Viewer** (`gui/src/components/Conversation/`):
- Displays conversations with message threads
- Supports collapsible blocks (thinking, tool calls)
- Code block rendering with syntax highlighting
- Question navigator for jumping between user messages
- User and assistant message differentiation

### Type System

**Session Interface** (`gui/src/types.ts`):
```
- session_id, source (claude_code | cursor)
- cwd, project, session_title
- terminal identity (term_program, tty, window_id, terminal_pid)
- context_metrics (used_percentage, context_window_size, tokens, is_estimate flag)
- model (id, display_name, provider)
- autocompact status (enabled, threshold, bug_threshold)
- status (idle | working | active)
- last_activity, registered_at, transcript_path
```

### Styling & Theme
- **Theme File**: `gui/src/styles/theme/colors.ts` (dark theme)
- **CSS**: `gui/src/styles/globals.css`
- Color palette with semantic names (accent, textPrimary, bgSecondary, etc.)
- Typography: System fonts + JetBrains Mono for code
- Spacing scale (4px base), border radius, shadows, transitions
- Breakpoints for responsive design

### Features Implemented

✅ **Implemented**:
- Real-time session monitoring with WebSocket
- Project scope filtering
- Session card grid display
- Context meter visualization
- Conversation viewer with collapsible sections
- Settings page with archive options
- Theme system with dark mode
- Auto-reconnection to server
- Focus state management

⏳ **Planned** (Placeholder Pages):
- Archive search functionality
- Context file management
- Source configuration (Obsidian, Google Docs, Notion)

### File Structure
```
gui/
├── src/
│   ├── App.tsx (routing root)
│   ├── main.tsx (React entry)
│   ├── types.ts (session/message types)
│   ├── components/
│   │   ├── Layout.tsx (sidebar + main)
│   │   ├── SessionCard.tsx
│   │   ├── ContextMeter.tsx
│   │   ├── ProjectSelector.tsx
│   │   └── Conversation/ (7 components)
│   ├── hooks/
│   │   ├── useJacquesClient.ts (WebSocket)
│   │   └── useProjectScope.tsx (project filtering)
│   ├── pages/ (5 pages)
│   │   ├── Dashboard.tsx
│   │   ├── Conversations.tsx
│   │   ├── Archive.tsx
│   │   ├── Context.tsx
│   │   └── Settings.tsx
│   └── styles/
│       ├── globals.css
│       └── theme/
├── vite.config.ts (port 5173)
├── index.html (root element: #root)
├── package.json
└── tsconfig.json
```

### How to Run

```bash
# Start the web GUI in dev mode
npm run dev:gui          # Runs Vite dev server on port 5173

# Build for production
npm run build:gui        # TypeScript compilation + Vite build
npm run preview:gui      # Preview production build locally
```

**Prerequisites**: Jacques server must be running on `ws://localhost:4242`

---

The web GUI is a modern, fully-functional React application that provides a graphical interface to Jacques' session monitoring and conversation archive system. It connects to the same WebSocket server as the terminal dashboard, but offers a browser-based experience instead of TUI.