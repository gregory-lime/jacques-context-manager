# Explore: Explore GUI menu structure

> Session: `15366d37-7909-44ce-bd9b-08ce1475d768`
> Date: 2026-02-03
> Tokens: ~75 905

---

Perfect! Now I have a comprehensive understanding of the codebase. Let me create a detailed report.

## GUI Codebase Exploration Report

Based on my thorough analysis of the Jacques GUI redesign codebase at `/Users/gole/Desktop/jacques-gui-redesign/gui/src/`, here's a complete overview:

---

### 1. LEFT SIDEBAR/MENU STRUCTURE

**File**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/Layout.tsx`

**Sidebar Components** (lines 76-191):

1. **Logo Section** (lines 78-85)
   - Displays Jacques mascot image (`jacsub.png`)
   - "Jacques" text in accent coral color

2. **Navigation Items** (lines 23-29, 104-124)
   ```typescript
   const navItems = [
     { path: '/', label: 'Dashboard', Icon: LayoutDashboard },
     { path: '/project', label: 'Project', Icon: FolderOpen },
     { path: '/conversations', label: 'Conversations', Icon: MessageSquare },
     { path: '/archive', label: 'Archive', Icon: Archive },
     { path: '/context', label: 'Context', Icon: BookOpen },
   ];
   ```
   - Uses React Router `NavLink` components
   - Active state styling with accent indicator (coral left border, 2px)
   - Icons from Lucide React library
   - Responsive hover states

3. **Project Scope Selector** (lines 96-101)
   - Component: `ProjectSelector` 
   - Shows active/archived projects grouped by category
   - Displays session counts for each project
   - Allows filtering to "All Projects"

4. **Sources Section** (lines 127-158)
   - Header: "Sources" (styled with accent color)
   - Three source connectors:
     - Obsidian (connected status indicator)
     - Google Docs (connected status indicator)
     - Notion (connected status indicator)
   - Connection status shown with colored dot (green = connected, muted = disconnected)

5. **Sidebar Footer** (lines 161-190)
   - Settings button with icon
   - Terminal/Logs toggle button (hidden on small screens)
   - Icons from Lucide React

**Styling Details** (lines 226-319):
- Width: 240px
- Background: `colors.bgSecondary` (#1a1a1a)
- Border: 1px solid `colors.borderSubtle` (#3a3a3a)
- Padding: 16px top/bottom
- Active nav link: coral background with left border indicator
- Separators: gradient dividers between sections

---

### 2. NAVIGATION & ROUTING

**File**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/App.tsx`

**React Router Setup**:
```typescript
<Routes>
  <Route path="/" element={<Layout />}>
    <Route index element={<Dashboard />} />
    <Route path="conversations" element={<Conversations />} />
    <Route path="conversations/:id" element={<Conversations />} />
    <Route path="archive" element={<Archive />} />
    <Route path="project" element={<ProjectDashboard />} />
    <Route path="context" element={<Context />} />
    <Route path="settings" element={<Settings />} />
    <Route path="sources" element={<Sources />} />
    <Route path="sources/google" element={<GoogleDocsConnect />} />
    <Route path="sources/notion" element={<NotionConnect />} />
    <Route path="oauth/google/callback" element={<GoogleDocsConnect />} />
    <Route path="oauth/notion/callback" element={<NotionConnect />} />
  </Route>
</Routes>
```

**Navigation Type**: Nested routing with `Layout` as parent component
- `<Outlet />` in Layout renders current page
- All pages share the same sidebar/header
- Context provider: `ProjectScopeProvider` wraps entire app

---

### 3. PAGES

**Total Pages**: 9 pages + 2 OAuth callback handlers

| Page | Path | File | Purpose |
|------|------|------|---------|
| Dashboard | `/` | `Dashboard.tsx` | Active sessions grid view with filtering |
| Project | `/project` | `ProjectDashboard.tsx` | Full project overview with session history and assets |
| Conversations | `/conversations` | `Conversations.tsx` | Browse saved conversation transcripts |
| Archive | `/archive` | `Archive.tsx` | Search & browse saved sessions by project |
| Context | `/context` | `Context.tsx` | Manage context files (.jacques/context/) |
| Settings | `/settings` | `Settings.tsx` | Notification settings, archive filter, sources config |
| Sources | `/sources` | `Sources.tsx` | Connect external sources (Obsidian, Google Docs, Notion) |
| Google OAuth | `/sources/google` | `GoogleDocsConnect.tsx` | Google Docs OAuth flow |
| Notion OAuth | `/sources/notion` | `NotionConnect.tsx` | Notion OAuth flow |

**Key Page Features**:

- **Dashboard** (lines 54-107):
  - Lists active sessions in a responsive grid
  - Filters by selected project
  - Shows connection status badge
  - Displays plan/agent counts in SessionCard
  - Shows "No active sessions" empty state

- **ProjectDashboard** (380+ lines):
  - Horizontal scroll for active sessions
  - Session history with detailed metadata
  - Assets section (Plans, Explorations, Web Searches)
  - Token usage display with K/M formatting
  - Skeleton loading states
  - Uses custom color palette

- **Archive** (600+ lines):
  - Expands/collapses projects
  - Searchable session list
  - Rebuild index functionality
  - Progress bar during rebuild
  - Conversation viewer integration

- **Settings** (170+ lines):
  - Notification toggles by category
  - Browser permission request
  - Archive filter options (radio buttons)
  - Token threshold input

- **Sources** (80 lines):
  - Grid layout of source cards
  - Connection status badges
  - OAuth integration placeholders

---

### 4. COMPONENT HIERARCHY & LAYOUT

**Total Components**: 66 TypeScript files (.ts/.tsx)

**Main Structure**:
```
<App> (Router setup)
  ├─ <ProjectScopeProvider>
  │  └─ <Routes>
  │     └─ <Layout> (Sidebar + Content wrapper)
  │        ├─ Sidebar Elements:
  │        │  ├─ Logo section
  │        │  ├─ Navigation (NavLinks)
  │        │  ├─ <ProjectSelector> (dropdown)
  │        │  ├─ Sources section
  │        │  └─ Settings + Logs toggle
  │        │
  │        ├─ Content Area:
  │        │  ├─ <main> (Outlet for page content)
  │        │  └─ [Optional] <MultiLogPanel>
  │        │
  │        └─ <ToastContainer>
  │
  └─ <NotificationProvider> (wraps Layout)
```

**UI Components** (`/components/ui/`):
- `Badge.tsx` - Status/category badges
- `TerminalPanel.tsx` - Terminal-styled container with title bar
- `SearchInput.tsx` - Search field with result counter
- `SectionHeader.tsx` - Section titles with accent line
- `EmptyState.tsx` - Icon + title + description for empty states
- `Toast.tsx` & `ToastContainer.tsx` - Notification system

**Major Components** (`/components/`):
- `Layout.tsx` - Main wrapper (240px sidebar + content)
- `ProjectSelector.tsx` - Dropdown project filter (absolute positioned)
- `SessionCard.tsx` - Session display card with metrics
- `SessionList.tsx` - Session list component
- `ContextMeter.tsx` - Context usage progress visualization
- `TokenProgressBar.tsx` - Token count display
- `StatCard.tsx` - Statistics card
- `ActiveSessionViewer.tsx` - Session detail view
- `MultiLogPanel.tsx` - Server/API/Claude logs panel
- `LogPanel.tsx` - Individual log display

**Conversation Components** (`/components/Conversation/`):
- `ConversationViewer.tsx` - Main conversation display
- `UserMessage.tsx` - User message rendering
- `AssistantMessage.tsx` - Assistant message with thinking/tools
- `AgentProgressBlock.tsx` - Subagent execution display
- `BashProgressBlock.tsx` - Bash command output
- `WebSearchBlock.tsx` - Web search results
- `MCPProgressBlock.tsx` - MCP tool execution
- `CodeBlock.tsx` - Code with syntax highlighting + copy button
- `MarkdownRenderer.tsx` - Markdown to React conversion
- `CollapsibleBlock.tsx` - Expandable/collapsible content
- `QuestionNavigator.tsx` - Jump to user messages
- `SubagentNavigator.tsx` - Navigate subagent conversations
- `PlanNavigator.tsx` - Jump to plan references
- `PlanViewer.tsx` - Plan content display

---

### 5. DESIGN TOKENS & THEME

**File**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/styles/theme/colors.ts`

**Color Palette**:
```typescript
// Backgrounds
bgPrimary: '#0d0d0d'        // Deepest dark
bgSecondary: '#1a1a1a'      // Cards, sidebar
bgElevated: '#252525'       // Hover, modals
bgInput: '#2a2a2a'          // Input fields, code blocks

// Accent (Coral/Peach from mascot)
accent: '#E67E52'           // Primary buttons, links, progress
accentLight: '#F09070'      // Hover states
accentDark: '#D06840'       // Active states
accentOrange: '#FF6600'     // Alternative accent

// Text
textPrimary: '#ffffff'      // Headings, body
textSecondary: '#8B9296'    // Descriptions, timestamps
textMuted: '#6B7075'        // Placeholders, disabled

// Semantic
success: '#4ADE80'          // Connected, saved
warning: '#FBBF24'          // Approaching limits
danger: '#EF4444'           // Disconnected, failed

// Borders
border: '#E67E52'           // Default (matches accent)
borderSubtle: '#3a3a3a'     // Dividers

// macOS window chrome
dotRed: '#FF5F56'
dotYellow: '#FFBD2E'
dotGreen: '#27C93F'
```

**Additional Colors** (in ProjectDashboard):
- Plan icon: #34D399 (green)
- Agent icon: #FF6600 (orange)
- Web search: #60A5FA (blue)
- Teal accent: #2DD4BF
- Purple: #A78BFA
- Pink: #F472B6
- Yellow: #FBBF24

**Typography**:
- Primary font: System sans-serif (JetBrains Mono for monospace)
- Body font size: 13px
- Heading font weight: 600-700

---

### 6. TYPES & DATA STRUCTURES

**File**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/types.ts`

**Core Types**:
```typescript
interface Session {
  session_id: string
  source: 'claude_code' | 'cursor'
  cwd: string
  project: string
  session_title: string | null
  terminal?: TerminalIdentity
  context_metrics: ContextMetrics | null
  model: ModelInfo | null
  workspace: WorkspaceInfo | null
  autocompact: AutoCompactStatus | null
  status: 'idle' | 'working' | 'active'
  last_activity: number
  registered_at: number
  transcript_path?: string
}

interface SessionBadges {
  planCount: number
  agentCount: number
  agentTypes: { explore: number; plan: number; general: number }
  fileCount: number
  mcpCount: number
  webSearchCount: number
  mode: 'planning' | 'execution' | null
  hadAutoCompact: boolean
}

interface SavedConversation {
  id: string
  title: string
  project: string
  date: string
  messages: ConversationMessage[]
  metadata: { messageCount: number; toolCallCount: number; ... }
}
```

**Message Types**:
- `TextContent`, `ThinkingContent`, `ToolUseContent`, `ToolResultContent`
- `CodeContent`, `AgentProgressContent`, `BashProgressContent`
- `MCPProgressContent`, `WebSearchContent`

**Server Message Types**:
- `InitialStateMessage`
- `SessionUpdateMessage`
- `SessionRemovedMessage`
- `FocusChangedMessage`
- `AutoCompactToggledMessage`
- `ClaudeOperationMessage`
- `ApiLogMessage`

---

### 7. KEY FEATURES & PATTERNS

**Responsive Layout**:
- Sidebar: Fixed 240px width
- Content: Flex 1, fills remaining space
- Main content: max-width constraints (800px-1200px depending on page)
- Mobile-unfriendly (designed for desktop)

**Real-Time Updates**:
- WebSocket connection to server (port 4242)
- `useJacquesClient()` hook for session data
- Auto-refresh on navigation
- Live session badges

**Project Filtering**:
- `useProjectScope()` hook manages selected project
- Sessions filtered by project
- "All Projects" option resets filter
- Archived projects shown separately in selector

**Status Indicators**:
- Status dots: pulsing for "working", solid for "idle"/"active"
- Connection badges: "Connected" / "Disconnected"
- Mode pills: "planning" (green) / "executing" (blue)
- Progress bars: filled to percentage

**Modal/Dropdown Patterns**:
- ProjectSelector uses absolute positioning
- Dropdowns zIndex: 100+
- onClick handlers prevent bubbling
- Escape key support (implied)

**Accessibility**:
- `aria-expanded`, `aria-haspopup` on dropdowns
- Semantic HTML buttons
- Color-coded status (not color-only)
- Title attributes on hover elements

---

### 8. STYLING APPROACH

**Inline Styles Object Pattern**:
```typescript
const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', ... },
  sidebar: { width: '240px', ... },
  // ... all styles as objects
}
```

**Animation Classes** (via className):
- `jacques-skeleton` - Shimmer loading animation
- `jacques-animate-in` - Fade in with staggered delay
- `jacques-session-card` - Custom card styling
- `jacques-scroll-fade` - Scroll gradient overlay
- `jacques-horizontal-scroll` - Horizontal scrolling container

**Consistent Patterns**:
- Dark theme throughout (bgPrimary/bgSecondary)
- Coral accent for interactive elements
- 150ms ease transitions on hover
- Subtle borders (borderSubtle for dividers)
- Monospace font for token counts/models

---

## Summary

The GUI codebase uses a **modern React + TypeScript** architecture with:

1. **Clean Sidebar Navigation**: 5 main pages + Settings, with project filtering and source status
2. **Flexible Routing**: React Router with nested routes and shared layout
3. **Rich Component Library**: 50+ specialized components for sessions, conversations, and UI elements
4. **Dark Terminal Aesthetic**: Coral accent color from mascot, high contrast text
5. **Real-Time Features**: WebSocket integration for live session updates
6. **Responsive Data Display**: Grids, scrollable lists, collapsible sections, and tabbed interfaces
7. **Type Safety**: Full TypeScript with comprehensive type definitions
8. **Inline Styling**: All styles as TypeScript objects (no CSS files)

The codebase is well-organized with clear separation of concerns: pages, components, hooks, types, and theme configuration.