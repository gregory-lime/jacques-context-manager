# Explore: Explore Dashboard GUI components

> Session: `21cc1780-1bec-43e4-8242-5c5837a5eec6`
> Date: 2026-02-04
> Tokens: ~109 017

---

I now have a comprehensive understanding of the entire Dashboard page and its ecosystem. Here is my thorough analysis:

---

## Complete Dashboard Exploration Report

### 1. Dashboard Page Component

**File**: `/Users/gole/Desktop/jacques-dashboards-smaller-design/gui/src/pages/Dashboard.tsx` (1073 lines)

The Dashboard is the main/index route (`/`) of the application. It is a large single-file component with the following visual layout (top-to-bottom):

#### Visual Layout Structure:
```
+----------------------------------------------------------+
| HEADER: ~/ProjectName          [Connected] badge         |
|   StatPills: Sessions | Input | Output | Plans | ...     |
+----------------------------------------------------------+
| ACTIVE SESSIONS (N)                                      |
|   [SessionCard] [SessionCard] [SessionCard]              |
|   (responsive grid: 1-4 columns based on width)          |
+----------------------------------------------------------+
| SESSION HISTORY                                          |
|   [StatusDot] Title                    date    [ctx%]    |
|     arrow-down 15K  arrow-up 3K  [PlanIcon 2] [AgentIcon 1]|
|   ... (scrollable)                                       |
+----------------------------------------------------------+
| PLANS (N)                       (shown only if plans > 0)|
|   [PlanIcon] Plan title          [embedded]  date        |
|   ... (scrollable, max ~6 rows = 252px)                  |
+----------------------------------------------------------+
| SUBAGENTS (N)                   [>=20K tokens toggle]    |
|   [AgentIcon/GlobeIcon] Description   cost  date         |
|   ... (scrollable, max ~6 rows = 252px)                  |
+----------------------------------------------------------+
| [ContentModal overlay when clicking plans/agents/searches]|
+----------------------------------------------------------+
```

#### Key Sections:
1. **Project Header** - Shows `~/projectName`, stat pills (Sessions, Input tokens, Output tokens, Plans, Explores, Searches), and a connected/disconnected Badge
2. **Active Sessions Grid** - Responsive CSS grid of `SessionCard` components (3 columns default, 4 at 1280px+, 2 at <800px, 1 at <520px)
3. **Session History** - Scrollable list of all sessions (live + saved), sorted by date. Each row shows: StatusDot, title, date, context %, token counts (input/output with colored arrows), plan/agent badges
4. **Plans** - Deduplicated list of plans across all sessions, each clickable to open in ContentModal. Shows source badge (embedded/agent) and session count
5. **Subagents** - Combined list of explorations + web searches, sorted by timestamp. Has a toggle to filter items under 20K tokens. Clickable to open in ContentModal

#### Data Flow:
- `useJacquesClient()` provides live sessions via WebSocket
- `listSessionsByProject()` API call loads saved/archived sessions
- `useProjectScope()` filters sessions by selected project
- `useSessionBadges(sessionIds)` fetches plan/agent/file counts for active session cards
- `useAssetModal()` manages the ContentModal overlay for plans, agents, web searches
- `useOpenSessions()` manages a tab-like system for viewing individual sessions

#### When a session is "opened" (clicked):
The Dashboard conditionally renders `ActiveSessionViewer` instead of the normal dashboard view when `state.activeViewId` is set. The `ActiveSessionViewer` fetches the full session transcript and transforms it into a `SavedConversation` format, then delegates to `ConversationViewer`.

---

### 2. Related Components Used by Dashboard

**Component Files (all in `/Users/gole/Desktop/jacques-dashboards-smaller-design/gui/src/components/`):**

| Component | File | Purpose |
|-----------|------|---------|
| `SessionCard` | `SessionCard.tsx` (353 lines) | Card for active sessions with WindowBar chrome, status dot, model name, context meter, plan/agent indicators, git branch. Uses macOS-style window chrome (red/yellow/green dots). |
| `ActiveSessionViewer` | `ActiveSessionViewer.tsx` (427 lines) | Fetches and displays an active session's full transcript. Transforms ParsedEntry[] to ConversationMessage[] then renders via ConversationViewer. |
| `ContextMeter` | `ContextMeter.tsx` (104 lines) | Progress bar showing context window usage (percentage + token count). Coral fill color. |
| `SidebarSessionList` | `SidebarSessionList.tsx` (194 lines) | Tree-view of open sessions in the sidebar, with vertical/horizontal connector lines. |
| `ProjectSelector` | `ProjectSelector.tsx` (337 lines) | Dropdown for filtering by project. Groups active vs archived projects. |
| `StatCard` | `StatCard.tsx` (59 lines) | Generic stat card with icon + title + content. |
| `TokenProgressBar` | `TokenProgressBar.tsx` (87 lines) | Horizontal bar for token usage with label/value. |
| `PlanList` | `PlanList.tsx` (not fully read, available) | Plan listing component. |
| `SessionList` | `SessionList.tsx` (available) | Session listing component. |
| `ModelUsageChart` | `ModelUsageChart.tsx` (available) | Chart for model usage. |
| `LogPanel` | `LogPanel.tsx` (available) | Server log display. |
| `MultiLogPanel` | `MultiLogPanel.tsx` (available) | Multi-tab log panel (server, API, claude operations). |
| `Layout` | `Layout.tsx` (329 lines) | App shell: 240px sidebar + content area. Sidebar has logo, project selector, nav links, sources section, settings. Content area has `<Outlet />` + optional log panel. |

**Conversation sub-components (in `/Users/gole/Desktop/jacques-dashboards-smaller-design/gui/src/components/Conversation/`):**

| File | Purpose |
|------|---------|
| `ConversationViewer.tsx` | Main conversation viewer (28,451 bytes - largest component) |
| `AssistantMessage.tsx` | Individual assistant message rendering |
| `AssistantMessageGroup.tsx` | Groups of assistant messages |
| `UserMessage.tsx` | User message rendering |
| `AgentProgressBlock.tsx` | Subagent progress display |
| `BashProgressBlock.tsx` | Bash command output blocks |
| `MCPProgressBlock.tsx` | MCP tool call display |
| `WebSearchBlock.tsx` | Web search results display |
| `PlanNavigator.tsx` | Plan navigation within conversation |
| `PlanViewer.tsx` | Plan content viewer |
| `QuestionNavigator.tsx` | Navigate between user questions |
| `SubagentNavigator.tsx` | Navigate subagents |
| `SubagentConversation.tsx` | Subagent conversation view |
| `MarkdownRenderer.tsx` | Markdown to React rendering |
| `CodeBlock.tsx` | Syntax-highlighted code blocks |
| `CollapsibleBlock.tsx` | Expandable/collapsible sections |
| `ConversationMarker.tsx` | Visual markers in conversation |

---

### 3. Design System / UI Components

**UI Primitives (in `/Users/gole/Desktop/jacques-dashboards-smaller-design/gui/src/components/ui/`):**

| Component | File | Description |
|-----------|------|-------------|
| `Badge` | `Badge.tsx` (101 lines) | Multi-variant badge with icons and optional dot+pulse. Variants: `plan`, `agent`, `mcp`, `web`, `compacted`, `planning`, `execution`, `focused`, `live`, `idle`, `working`, `default`. |
| `ContentModal` | `ContentModal.tsx` (288 lines) | Full-screen overlay modal for viewing markdown content. Chrome bar + badge + subtitle + scrollable content + footer. Has `useContentModal()` hook. |
| `contentModalConfigs` | `contentModalConfigs.tsx` (94 lines) | Factory functions for modal configs: `planModalConfig()`, `agentModalConfig()`, `webSearchModalConfig()`. |
| `SectionHeader` | `SectionHeader.tsx` (50 lines) | Uppercase section label with accent-colored chevron `>` character. |
| `WindowBar` | `WindowBar.tsx` (80 lines) | macOS-style chrome bar with red/yellow/green dots, title area, and right-side slot. |
| `TerminalPanel` | `TerminalPanel.tsx` (112 lines) | Container with chrome bar (dots + title) and content area. |
| `EmptyState` | `EmptyState.tsx` (49 lines) | Centered empty state with Lucide icon, title, description, and optional action. |
| `SearchInput` | `SearchInput.tsx` | Search input field. |
| `LineNumberList` | `LineNumberList.tsx` | Numbered list display. |
| `Toast` | `Toast.tsx` | Toast notification component. |
| `ToastContainer` | `ToastContainer.tsx` | Toast container with store. |
| `NotificationCenter` | `NotificationCenter.tsx` | Notification management. |
| `NotificationStore` | `NotificationStore.ts` | Notification state management. |

**Theme System** (in `/Users/gole/Desktop/jacques-dashboards-smaller-design/gui/src/styles/`):

- **`theme/colors.ts`** - All color constants
- **`theme/index.ts`** - Exports colors + typography, spacing, borderRadius, shadows, transitions, breakpoints
- **`globals.css`** - CSS custom properties mirroring the theme, global resets, animations (`spin`, `pulse-glow`, `slide-in`, `expand-in`, `fade-in`, `status-pulse`, `shimmer`), and interaction CSS classes

**Color Palette:**
```
Backgrounds:  #0d0d0d (primary), #1a1a1a (secondary), #252525 (elevated), #2a2a2a (input)
Accent:       #E67E52 (coral), #F09070 (light), #D06840 (dark), #FF6600 (orange)
Text:         #ffffff (primary), #8B9296 (secondary), #6B7075 (muted)
Semantic:     #4ADE80 (success), #FBBF24 (warning), #EF4444 (danger)
Borders:      #E67E52 (accent), #3a3a3a (subtle)
Window dots:  #FF5F56 (red), #FFBD2E (yellow), #27C93F (green)
```

---

### 4. Icon Systems

The project uses **two icon systems** simultaneously:

#### A. Custom SVG Icons (`/Users/gole/Desktop/jacques-dashboards-smaller-design/gui/src/components/Icons.tsx`)

All 16x16 viewBox, monochrome, with `size`, `color`, and `style` props:

| Icon | Visual | Used For |
|------|--------|----------|
| `SessionsIcon` | 3x3 dot grid | Terminal/sessions |
| `TokensIcon` | 3 stacked horizontal bars (increasing width) | Token counts |
| `ActivityIcon` | Pulse/heartbeat line | Activity indicator |
| `ModelIcon` | Chip with pins | Model/CPU |
| `PlanIcon` | Document with folded corner + 2 lines | Plans (used extensively in Dashboard, SessionCard, SidebarSessionList) |
| `HandoffIcon` | Two rectangles with arrow between | Session handoffs |
| `AgentIcon` | Robot head with antenna | Agents/subagents (used in Dashboard, SessionCard) |
| `ClockIcon` | Clock face with hands | Time |
| `StatusDot` | Circle (filled or outline) | Session status (used heavily in session history rows) |
| `ChevronRight` | Right-pointing chevron | Expandable items |
| `ExternalLinkIcon` | Arrow pointing out of box | External links |

#### B. Lucide React Icons (external library)

Used throughout:
| Import | Used In | For |
|--------|---------|-----|
| `Globe` | Dashboard.tsx, SessionCard.tsx, Badge.tsx | Web searches |
| `Terminal` | Dashboard.tsx, Layout.tsx | Empty active sessions, log panel toggle |
| `Plug` | SessionCard.tsx, Badge.tsx | MCP connections |
| `Zap` | SessionCard.tsx, Badge.tsx | Auto-compact |
| `GitBranch` | SessionCard.tsx, Badge.tsx | Git branch info, planning mode |
| `Play` | SessionCard.tsx, Badge.tsx | Execution mode |
| `X` | ContentModal.tsx, SidebarSessionList.tsx | Close buttons |
| `Loader` | ContentModal.tsx | Loading spinner |
| `FileText` | contentModalConfigs.tsx, Badge.tsx | Plans, documents |
| `Search` | contentModalConfigs.tsx | Explore agents, web search |
| `Bot` | contentModalConfigs.tsx, Badge.tsx | Agent type |
| `LayoutDashboard` | Layout.tsx | Dashboard nav icon |
| `Archive` | Layout.tsx | Archive nav icon |
| `BookOpen` | Layout.tsx | Context nav icon |
| `Settings` | Layout.tsx | Settings nav icon |

---

### 5. Icon Standards for Input/Output/Plans/Explores/Searches

Here are the current established color and icon conventions:

| Concept | Icon | Color | Background |
|---------|------|-------|------------|
| **Plans** | `PlanIcon` (custom SVG) or `FileText` (Lucide) | `#34D399` (emerald green) | `rgba(52, 211, 153, 0.10)` |
| **Agents/Explores** | `AgentIcon` (custom SVG) or `Bot` (Lucide) | `#FF6600` (orange) | `rgba(255, 102, 0, 0.10)` |
| **Web Searches** | `Globe` (Lucide) | `#60A5FA` (blue) | `rgba(96, 165, 250, 0.10)` |
| **Input Tokens** | Down arrow character `↓` | `#2DD4BF` (teal) | N/A (inline text) |
| **Output Tokens** | Up arrow character `↑` | `#60A5FA` (blue) | N/A (inline text) |
| **Sessions** | `SessionsIcon` (custom dot grid) | `#E67E52` (coral accent) | N/A |
| **Status: working** | `StatusDot` (filled) | `#E67E52` (coral) | Pulsing animation |
| **Status: active** | `StatusDot` (filled) | `#4ADE80` (green) | Static |
| **Status: idle** | `StatusDot` (outline) | `#6B7075` (muted) | Static |
| **MCP** | `Plug` (Lucide) | `#8B9296` (textSecondary) | N/A |
| **Auto-compact** | `Zap` (Lucide) | `#6B7075` (textMuted) | N/A |
| **Planning mode** | `GitBranch` (Lucide) | `#34D399` (green) | `rgba(52, 211, 153, 0.12)` |
| **Execution mode** | `Play` (Lucide) | `#60A5FA` (blue) | `rgba(96, 165, 250, 0.12)` |

**Note on Badge.tsx variant colors** -- the Badge component has a slight discrepancy for "plan" variant: it uses `#A78BFA` (purple) instead of the `#34D399` (green) used everywhere else for plans. This appears to be an inconsistency in the Badge component vs the rest of the codebase.

---

### 6. Overall GUI Source Structure

```
/Users/gole/Desktop/jacques-dashboards-smaller-design/gui/src/
|-- App.tsx                          # Router setup, Layout with nested routes
|-- main.tsx                         # Entry point (ReactDOM)
|-- types.ts                         # All TypeScript types (Session, ConversationMessage, etc.)
|-- vite-env.d.ts                    # Vite type declarations
|
|-- api/
|   |-- config.ts                    # API client implementation
|   |-- index.ts                     # Re-exports
|
|-- components/
|   |-- ActiveSessionViewer.tsx      # Live session transcript viewer
|   |-- ContextMeter.tsx             # Context window progress bar
|   |-- Icons.tsx                    # Custom SVG icons (11 icons)
|   |-- Layout.tsx                   # App shell: sidebar + content
|   |-- LogPanel.tsx                 # Server log display
|   |-- ModelUsageChart.tsx          # Model usage chart
|   |-- MultiLogPanel.tsx            # Multi-tab log panel
|   |-- PlanList.tsx                 # Plan listing
|   |-- ProjectSelector.tsx          # Project dropdown filter
|   |-- SessionCard.tsx              # Active session card (with WindowBar)
|   |-- SessionList.tsx              # Session list component
|   |-- SidebarSessionList.tsx       # Open sessions tree in sidebar
|   |-- StatCard.tsx                 # Generic stat card
|   |-- TokenProgressBar.tsx         # Token progress bar
|   |-- Conversation/               # Conversation viewer sub-components (18 files)
|   |-- ui/                          # Design system primitives (14 files)
|
|-- hooks/
|   |-- useAssetModal.ts             # ContentModal async loading pattern
|   |-- useJacquesClient.ts          # WebSocket connection to Jacques server
|   |-- useNotifications.tsx         # Notification system
|   |-- useOpenSessions.tsx          # Tab management for open sessions
|   |-- useProjectScope.tsx          # Project filtering context
|   |-- useSessionBadges.ts          # Badge data fetching with cache
|
|-- notifications/                   # (not explored in detail)
|-- oauth/                           # (Google/Notion OAuth)
|
|-- pages/
|   |-- Archive.tsx                  # Archive search page
|   |-- Context.tsx                  # Context/sources page
|   |-- Conversations.tsx            # Conversation listing
|   |-- Dashboard.tsx                # Main dashboard (THIS FILE)
|   |-- GoogleDocsConnect.tsx        # Google Docs OAuth setup
|   |-- NotionConnect.tsx            # Notion OAuth setup
|   |-- Settings.tsx                 # Settings page
|   |-- Sources.tsx                  # Sources management
|
|-- styles/
|   |-- globals.css                  # Global styles, animations, CSS custom properties
|   |-- theme/
|       |-- colors.ts                # Color constants
|       |-- index.ts                 # Theme exports (colors, typography, spacing, etc.)
|
|-- utils/
|   |-- git.ts                       # Git-aware project grouping
|   |-- tokens.ts                    # Token formatting utilities
```

### Key Architectural Patterns

1. **Inline styles** -- The codebase uses React inline styles exclusively (`const styles: Record<string, React.CSSProperties>`), with CSS only for animations, pseudo-selectors, and responsive media queries in `globals.css`.

2. **CSS class names for interactive states** -- Hover effects and transitions use CSS classes like `jacques-session-card`, `jacques-history-row`, `jacques-list-row` because inline styles cannot handle `:hover`.

3. **Skeleton loading** -- Custom skeleton components (`SkeletonSessionCard`, `SkeletonHistoryRow`, `SkeletonListRow`) use the `jacques-skeleton` CSS class with a shimmer animation.

4. **Slide-in animations** -- The `jacques-animate-in` class applies a `slide-in` animation with staggered delays via `animationDelay`.

5. **Modal pattern** -- `useAssetModal()` wraps `useContentModal()` to support async content loading: the modal opens immediately with title/badge in loading state, then updates when the async fetch resolves.

6. **Session open/close tabs** -- `useOpenSessions()` provides a reducer-based tab system persisted to localStorage. When a session is "opened," the Dashboard replaces its content with `ActiveSessionViewer`. The sidebar shows open sessions in a tree view.