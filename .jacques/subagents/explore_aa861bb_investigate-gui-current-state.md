# Explore: Investigate GUI current state

> Session: `3f2033fe-5394-42b4-b797-d4ffe101c907`
> Date: 2026-02-04
> Tokens: ~65 802

---

Perfect! Now I have a comprehensive understanding of the Jacques GUI. Let me create a detailed summary report.

## Jacques GUI Codebase Investigation Report

Based on a thorough investigation of the GUI source code, here's a complete overview of the current state:

### 1. Main Layout Architecture

**Layout Type: Sidebar + Content Area (Two-Column)**

The main layout (`gui/src/components/Layout.tsx`) uses a **left sidebar (240px fixed width)** with a flexible content area:

- **Sidebar Structure:**
  - Logo section with Jacques mascot and title
  - Project scope selector (dropdown)
  - Main navigation (3 items: Dashboard, Archive, Context)
  - Sidebar session list with tree connectors showing open sessions
  - Sources section with connection status indicators (Obsidian, Google Docs, Notion)
  - Footer with Settings link and Terminal logs toggle button

- **Navigation Items (3 main):**
  1. Dashboard (LayoutDashboard icon) → `/`
  2. Archive (Archive icon) → `/archive`
  3. Context (BookOpen icon) → `/context`
  4. Settings (at footer, Settings icon) → `/settings`

### 2. Notification System

**Two-Tier Implementation:**

The notification system is comprehensive, with both **in-app toasts** and **browser notifications**:

**Location:** 
- Provider: `gui/src/hooks/useNotifications.tsx`
- Types/Config: `gui/src/notifications/types.ts`
- UI Components: `gui/src/components/ui/Toast.tsx` and `ToastContainer.tsx`

**Categories (5 types):**
1. **context** - Context usage thresholds (50%, 70%, 90%)
2. **operation** - Large operations (>50K tokens by default)
3. **plan** - Plan created events
4. **auto-compact** - Auto-compaction triggered
5. **handoff** - Handoff generation/paste events

**Toast UI Features:**
- Terminal aesthetic with chrome bar (priority dot + category label)
- 3 max visible toasts (newer first)
- Priority levels: low, medium, high, critical
- Auto-dismiss based on priority (5-10 seconds)
- Colored accent bars (coral, warning, danger)
- Progress bar countdown animation
- Jacques mascot thumbnail in each toast
- Custom entrance/exit animations

**Browser Notifications:**
- Only fire when document is unfocused (not in view)
- Require explicit permission request
- Respect per-category toggles
- Cooldown gating to prevent spam

### 3. Pages & Routes

**Total Routes (8):**

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | Dashboard | Main overview with active/archived sessions, plans, subagents |
| `/archive` | Archive | Cross-project conversation search |
| `/context` | Context | Load external context (Obsidian, etc.) |
| `/settings` | Settings | Archive filter, auto-archive toggle, notifications |
| `/sources` | Sources | Configure external sources (Obsidian, Google Docs, Notion) |
| `/sources/google` | GoogleDocsConnect | Google Docs OAuth flow |
| `/sources/notion` | NotionConnect | Notion OAuth flow |
| `/oauth/google/callback` | GoogleDocsConnect | OAuth redirect |
| `/oauth/notion/callback` | NotionConnect | OAuth redirect |

### 4. Dashboard Page Layout

**Structure: Full-width vertical stack with sections**

The Dashboard (`gui/src/pages/Dashboard.tsx`) has a sophisticated layout with 6 main sections:

**1. Header Section:**
- Project name (`~/ProjectName` with prefix styling)
- Stat pills (color-coded metrics):
  - Sessions count (coral)
  - Input tokens (teal)
  - Output tokens (blue)
  - Plans count (emerald green)
  - Explores count (orange)
  - Searches count (sky blue)
- Connection badge (Connected/Disconnected)

**2. Active Sessions Grid:**
- Displays live sessions as cards
- SessionCard component with:
  - ChromeBar with title
  - Context usage progress bar
  - Token counts
  - Status indicators
  - Plan/Agent/WebSearch badges
  - Click to view session details
- Empty state: "No active sessions" with Terminal icon

**3. Session History (scrollable list):**
- Two-row layout per session:
  - Row 1: Status dot + Title + Date + Context %
  - Row 2: Token counts + Badges (plan count, agent count)
- Color-coded status dots (working = coral with glow, idle = teal)
- Formatted dates (m/h/d ago)
- Sorted by most recent first
- Max height with internal scroll

**4. Plans Section (if any exist):**
- List of plan documents
- Per-plan badges showing source (embedded/write/agent)
- Session count indicator
- Click to open in ContentModal

**5. Subagents Section (combined):**
- Explorations + Web searches unified
- Toggle to filter agents <20K tokens
- Left column: Icon + Description
- Right column: Token cost or result count
- Max height with scroll

**6. Open Session Viewer (overlaid):**
- If a session is open, shows ActiveSessionViewer instead of dashboard
- Has its own conversation viewer UI

### 5. Sidebar Session List Component

**Location:** `gui/src/components/SidebarSessionList.tsx`

**Features:**
- Appears under Dashboard nav item
- Shows all open/viewing sessions as tabs
- Tree connector UI (vertical lines + horizontal branches)
- Active session highlighted with left accent indicator
- Close button (X) appears on hover
- Plan indicator icon for plan sessions
- Ellipsis text overflow

**Max height:** 240px with scroll

### 6. ContentModal System

**Location:** `gui/src/components/ui/ContentModal.tsx`

**Features:**
- Full-screen overlay (centered, dark backdrop with blur)
- Two size variants: md (640px), lg (820px)
- Chrome bar with:
  - Optional icon
  - Title
  - Optional badge (color-coded: plan/agent/web)
  - Close button (Esc works)
- Subtitle line (optional, e.g., file path)
- Content area (scrollable):
  - Markdown rendering via MarkdownRenderer
  - Or loading state with spinner
- Footer with optional info (token count, results count) + "Esc to close" hint
- Max height: 85vh

**Config Factory Functions:**
1. `planModalConfig()` - Plan documents with source labels
2. `agentModalConfig()` - Subagent results (Explore, Plan, general)
3. `webSearchModalConfig()` - Web search results with URLs

### 7. UI Components Library

**Core Components (`gui/src/components/ui/index.ts`):**
- TerminalPanel
- SearchInput
- LineNumberList
- Badge
- SectionHeader
- EmptyState
- Toast + ToastContainer
- ContentModal + useContentModal hook
- WindowBar

**Additional UI Files:**
- NotificationCenter.tsx
- contentModalConfigs.tsx (factory functions)

### 8. Custom Hooks

**Key Hooks:**
- `useNotifications()` - Notification context
- `useJacquesClient()` - WebSocket connection to server
- `useProjectScope()` - Project filtering
- `useOpenSessions()` - Tab-like session tracking
- `useSessionBadges()` - Cached badge metadata
- `useAssetModal()` - Async modal content loading pattern
- `useContentModal()` - Modal state management

### 9. Supporting Components

**Major Components:**
- SessionCard - Live session display
- ActiveSessionViewer - Detailed session conversation view
- ProjectSelector - Project filtering dropdown
- SidebarSessionList - Open session tabs
- SessionList - Archived sessions list
- MultiLogPanel - Developer console (server/API logs)
- PlanList - Plan document list
- ContextMeter - Token usage visualization
- Icons (custom) - Plan, Agent, StatusDot icons
- Conversation Viewer Components:
  - MarkdownRenderer
  - AssistantMessage
  - AgentProgressBlock
  - BashProgressBlock
  - WebSearchBlock

### 10. Theme & Styling

**Color Palette (`gui/src/styles/theme.ts`):**
- Primary: Dark backgrounds
- Accent (Coral): `#E67E52`
- Success (Teal): `#2DD4BF`
- Warning/Yellow: `#FBBF24`
- Danger (Red): Fallback
- Text: Gray scale with muted variants

**Typography:**
- Font: JetBrains Mono, Fira Code, SF Mono (monospace)
- Base size: 13px

### Summary Table

| Aspect | Details |
|--------|---------|
| **Layout** | Sidebar (240px) + Content Area (flexible) |
| **Navigation** | 3 main items + Settings + Logs toggle |
| **Pages** | 8 routes (Dashboard, Archive, Context, Settings, Sources) |
| **Dashboard Sections** | Header, Active Sessions, History, Plans, Subagents, Open Viewer |
| **Notifications** | Toast container (top-right), Browser API support, 5 categories |
| **Modals** | ContentModal for plans/agents/searches, async content loading |
| **Key UI Pattern** | Chrome bars (terminal aesthetic), status dots, tag badges |
| **Session Tabs** | SidebarSessionList with tree connectors under Dashboard nav |
| **Main Color** | Coral (`#E67E52`) accent throughout |

This GUI presents a professional, terminal-inspired interface with multi-source support, real-time notifications, and a sophisticated session management system.