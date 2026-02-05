# Explore: Explore GUI codebase structure

> Session: `7eddbf0b-5e1c-4ac6-be36-93651d5e23ee`
> Date: 2026-02-03
> Tokens: ~69 943

---

Perfect! Now I have a comprehensive understanding of the GUI codebase. Let me create a detailed report:

## GUI Codebase Exploration Report

### Overview
The GUI is a React + TypeScript web application built with Vite, designed as a dashboard for monitoring active Claude Code sessions and viewing archived conversations. It uses a monospace terminal aesthetic with a dark theme and coral accent color.

---

## 1. PAGES (9 total)

### `/src/pages/Dashboard.tsx` (190 lines)
- **Purpose**: Main landing page showing all active sessions
- **Features**:
  - Session grid with auto-fill layout (300px min cards)
  - Project scope filtering
  - Connection status indicator (green/red dot)
  - Empty state with helpful messaging
  - Session badges showing plans, agents, file counts
  - Clickable sessions to view details in ActiveSessionViewer

### `/src/pages/ProjectDashboard.tsx` (766 lines)
- **Purpose**: Terminal-style project overview with ASCII art aesthetics
- **Features**:
  - Terminal-inspired block patterns and corner decorations
  - Live & saved session list with status indicators
  - Statistics pills (sessions, tokens, plans, explorations, web searches)
  - Document columns (Plans, Explorations, Web Searches)
  - Custom scrollbars with hover glow effects
  - Smooth animations and slide-in effects
  - Extensive color palette (coral, teal, purple, blue, pink, yellow)

### `/src/pages/Conversations.tsx` (253 lines)
- **Purpose**: View and search archived conversations
- **Features**:
  - Transforms ParsedEntry arrays to ConversationMessage format
  - Session selection with live/saved indicators
  - Filters out internal CLI messages (<command-name>, <local-command>, etc.)
  - Handles auto-compact tracking and model info
  - Integrates with ConversationViewer component

### `/src/pages/Archive.tsx` (995 lines)
- **Purpose**: Search across all archived conversations globally
- **Features**:
  - Keyword search with live results filtering
  - Project and technology filtering
  - Manifest display with metadata (title, files modified, tech stack)
  - Plan references and badges
  - Loading states and error handling
  - Date sorting and organization

### `/src/pages/Sources.tsx` (299 lines)
- **Purpose**: Manage external context sources (Obsidian, Google Docs, Notion)
- **Features**:
  - Source cards with connection status
  - OAuth configuration flows
  - Auto-detection of Obsidian vaults
  - Manual path entry fallbacks

### `/src/pages/GoogleDocsConnect.tsx` (312 lines)
- **Purpose**: OAuth callback handler for Google Docs
- **Features**:
  - Handles OAuth redirect
  - Exchanges auth code for tokens
  - Stores credentials
  - Redirects back to sources page

### `/src/pages/NotionConnect.tsx` (308 lines)
- **Purpose**: OAuth callback handler for Notion
- **Features**:
  - Handles OAuth redirect
  - Token exchange and workspace detection
  - Persistent configuration

### `/src/pages/Settings.tsx` (128 lines)
- **Purpose**: User preferences configuration
- **Features**:
  - Archive filter radio options (Without Tools / Everything / Messages Only)
  - Auto-archive toggle
  - Placeholder for future source configuration

### `/src/pages/Context.tsx` (58 lines)
- **Purpose**: Context file management (stub)
- **Features**:
  - Placeholder for future context management UI
  - Icon and helpful messaging

---

## 2. SHARED COMPONENTS (13 main + 16 conversation-specific)

### Core Components
| Component | Size | Purpose |
|-----------|------|---------|
| **Layout.tsx** | 7.8K | Main app shell with sidebar nav, logo, project selector, sources section, settings link |
| **ActiveSessionViewer.tsx** | 13K | Full session viewer with conversation, plan navigator, subagent navigator |
| **SessionCard.tsx** | 7.1K | Clickable card showing session status, context meter, badges (plans/agents) |
| **ProjectSelector.tsx** | 9.1K | Dropdown to filter sessions by project or show all |
| **ContextMeter.tsx** | 2.3K | Visual progress bar + percentage display for context usage |
| **TokenProgressBar.tsx** | 1.8K | Horizontal progress bar for token visualization |
| **ContextMeter.tsx** | 2.3K | Token usage display with color-coded status |
| **ModelUsageChart.tsx** | 2.5K | Token breakdown visualization |
| **StatCard.tsx** | 1.2K | Small stat display cards |
| **MultiLogPanel.tsx** | 33K | Tabbed log viewer (server, API, Claude operations) |
| **LogPanel.tsx** | 6.1K | Individual log tab implementation |
| **SessionList.tsx** | 5.2K | List of sessions with filtering |
| **PlanList.tsx** | 2.4K | Collapsible plan list |

### Conversation Components (in `/components/Conversation/`)
| Component | Size | Purpose |
|-----------|------|---------|
| **ConversationViewer.tsx** | 27K | Main viewer orchestrating all message types |
| **ConversationMarker.tsx** | 1.6K | Marker for /clear commands and session boundaries |
| **UserMessage.tsx** | 8.7K | User message rendering with markdown |
| **AssistantMessage.tsx** | 12K | Single assistant message with thinking/tools/text |
| **AssistantMessageGroup.tsx** | 21K | Groups consecutive assistant messages |
| **MarkdownRenderer.tsx** | 4.5K | React-markdown integration with syntax highlighting |
| **CodeBlock.tsx** | 2.0K | Syntax-highlighted code with copy button |
| **CollapsibleBlock.tsx** | 2.7K | Reusable collapse/expand wrapper |
| **AgentProgressBlock.tsx** | 14K | Subagent execution display with token counts |
| **BashProgressBlock.tsx** | 2.3K | Command output streaming display |
| **MCPProgressBlock.tsx** | 1.4K | MCP tool call status |
| **WebSearchBlock.tsx** | 3.5K | Web search queries and results |
| **QuestionNavigator.tsx** | 3.4K | Jump between user messages |
| **SubagentNavigator.tsx** | 6.0K | List and navigate subagents |
| **SubagentConversation.tsx** | 11K | Render individual subagent conversation |
| **PlanNavigator.tsx** | 11K | Browse plans with navigation |
| **PlanViewer.tsx** | 6.2K | Markdown plan display |

---

## 3. ROUTING SETUP (`App.tsx`)

```typescript
Routes:
  / → Dashboard (default)
  /conversations → Conversations page
  /conversations/:id → Specific conversation
  /archive → Archive search
  /project → Project dashboard
  /context → Context management
  /settings → Settings
  /sources → Sources manager
  /sources/google → Google Docs OAuth flow
  /sources/notion → Notion OAuth flow
  /oauth/google/callback → Google Docs OAuth callback
  /oauth/notion/callback → Notion OAuth callback

Wrapper: ProjectScopeProvider (context for project filtering)
```

---

## 4. DESIGN SYSTEM

### Color Palette (`/src/styles/theme/colors.ts`)
```typescript
Backgrounds:
  - bgPrimary: #0d0d0d (deepest dark)
  - bgSecondary: #1a1a1a (cards, sidebar)
  - bgElevated: #252525 (hover, modals)
  - bgInput: #2a2a2a (inputs, code blocks)

Accent (Coral/Peach - from mascot):
  - accent: #E67E52 (primary - buttons, links, progress)
  - accentLight: #F09070 (hover)
  - accentDark: #D06840 (active)
  - accentOrange: #FF6600 (project names, mascot)

Text:
  - textPrimary: #ffffff (headings, body)
  - textSecondary: #8B9296 (descriptions, secondary)
  - textMuted: #6B7075 (placeholders, disabled)

Semantic:
  - success: #4ADE80 (connected, saved)
  - warning: #FBBF24 (approaching limits)
  - danger: #EF4444 (disconnected, failed)

Borders:
  - border: #E67E52 (matches accent)
  - borderSubtle: #3a3a3a (dividers)
```

### Typography
```typescript
Font Families:
  - mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace
  - sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

Font Sizes: xs(11px) → sm(12px) → base(14px) → lg(16px) → xl(20px) → 2xl(24px)
Font Weights: 400 normal, 500 medium, 600 semibold, 700 bold
Line Heights: 1.2 tight, 1.4 normal, 1.6 relaxed
```

### Spacing (4px base unit)
```typescript
0, 1(4px), 2(8px), 3(12px), 4(16px), 5(20px), 6(24px), 8(32px), 10(40px), 12(48px), 16(64px)
```

### Border Radius
```typescript
none, sm(4px), md(8px), lg(12px), xl(16px), full(9999px)
```

### Transitions & Breakpoints
```typescript
Transitions: fast(150ms), base(250ms), slow(400ms)
Breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px), 2xl(1536px)
```

### Global Styles (`/src/styles/globals.css`)
- Dark monospace-first aesthetic
- Terminal-inspired scrollbars
- Focus styles with coral outline
- Selection highlighting with accent color
- Utility classes for text/bg colors

---

## 5. API LAYER (`/src/api/config.ts`)

### Endpoints (20+ functions)

**Sources APIs:**
- `getSourcesStatus()` - Check Obsidian, Google Docs, Notion connection status
- `configureGoogleDocs(config)` - Store Google Docs OAuth tokens
- `disconnectGoogleDocs()` - Revoke Google Docs access
- `configureNotion(config)` - Store Notion OAuth tokens
- `disconnectNotion()` - Revoke Notion access

**Archive APIs:**
- `getArchiveStats()` - Global archive statistics
- `listArchivedConversations()` - All archived conversations
- `listConversationsByProject()` - Group archived conversations by project
- `getArchivedConversation(id)` - Fetch single archived conversation
- `searchArchivedConversations(query, filters)` - Keyword search
- `initializeArchive()` - One-time archive setup

**Sessions/Subagent APIs:**
- `getSessionStats()` - Aggregate session metrics
- `listSessions()` - All live sessions
- `listSessionsByProject()` - Sessions grouped by project
- `getSession(id)` - Single session details
- `getSubagentFromSession(sessionId, agentId)` - Fetch subagent conversation
- `getSessionBadges(sessionIds)` - Badges for multiple sessions
- `rebuildSessionIndex()` - Re-index archived sessions
- `getSubagent(id)` - Subagent details
- `listSessionSubagents(sessionId)` - All subagents in a session

**Config:**
```typescript
API_URL = DEV ? 'http://localhost:4243/api' : '/api'
```

---

## 6. ICON LIBRARY (`/src/components/Icons.tsx`)

Custom SVG icons (all 16x16, monochrome, use currentColor):
- **SessionsIcon** - Grid of 9 dots
- **TokensIcon** - Stacked bars
- **ActivityIcon** - Pulse/activity line
- **ModelIcon** - CPU chip
- **PlanIcon** - Document/file
- **HandoffIcon** - Arrows between boxes
- **AgentIcon** - Robot head
- **ClockIcon** - Clock face
- **StatusDot** - Filled or outline circle
- **ChevronRight** - Arrow for expandable items
- **ExternalLinkIcon** - Link with arrow

All icons are size/color customizable via props.

---

## 7. HOOKS

### `useJacquesClient.ts` (9.7K)
- **Purpose**: WebSocket connection to Jacques server
- **Exports**:
  - `sessions` - Active sessions array
  - `focusedSessionId` - Currently focused session
  - `connected` - Connection status boolean
  - `serverLogs`, `apiLogs` - Log entries
  - `claudeOperations` - LLM operation history
  - Auto-reconnect on disconnect
  - Message type dispatching (session updates, focus changes, logs)

### `useProjectScope.tsx` (1.6K)
- **Purpose**: Project filtering context
- **Exports**:
  - `selectedProject` - Current filter
  - `setSelectedProject` - Update filter
  - `filterSessions()` - Filter array by project
  - `archivedProjects` - List of archived project names

### `useSessionBadges.ts` (2.9K)
- **Purpose**: Fetch session metadata badges
- **Exports**:
  - `badges` - Map<sessionId, SessionBadges>
  - Parallel fetching of multiple sessions
  - Caching to avoid re-fetches

---

## 8. CURRENT VISUAL STYLE

**Design Language:**
- **Terminal Aesthetic**: Monospace fonts, minimal spacing, grid-based layouts
- **Dark Theme**: Black backgrounds (#0d0d0d) with subtle card elevation
- **Coral Accent**: #E67E52 primary color (from Jacques mascot)
- **Geometric Elements**: ASCII art blocks (█▓▒░), decorative corner patterns in ProjectDashboard
- **Minimalist Icons**: SVG-based, stroke-heavy, 16x16 grid
- **Smooth Interactions**: 150-250ms transitions on hover, focus states

**Component Patterns:**
- Card-based layouts with subtle borders
- Inline badges for metadata (plans, agents, tech stack)
- Collapsible sections for dense information
- Horizontal scroll on long lists
- Status indicators (dots, icons) for at-a-glance info

---

## 9. DEPENDENCIES

### Production
```json
"react": "^18.3.1"
"react-dom": "^18.3.1"
"react-markdown": "^10.1.0" (for rendering conversations)
"react-router-dom": "^6.22.3" (page navigation)
```

### Development
```json
"@types/react": "^18.3.12"
"@types/react-dom": "^18.3.1"
"@vitejs/plugin-react": "^4.3.4"
"typescript": "^5.7.0"
"vite": "^5.4.11"
"vitest": "^2.1.8"
```

**No UI component library** - All components are custom-built using inline styles and CSS.

---

## 10. KEY OBSERVATIONS

### Strengths
1. **Cohesive Design**: Unified terminal aesthetic across all pages
2. **Type Safety**: Full TypeScript with well-defined types
3. **Component Modularity**: Small, focused components with clear responsibilities
4. **Conversation Rendering**: Sophisticated handling of mixed content types (text, thinking, tools, code, agents)
5. **Real-time Updates**: WebSocket integration for live session monitoring
6. **Responsive**: Adapts to different viewport sizes with breakpoints

### Areas Without UI Yet
1. **Context Management** - Placeholder page (Context.tsx)
2. **Settings** - Partial implementation (Settings.tsx)
3. **Sources Configuration** - OAuth flows exist but limited UI

### Design Patterns Used
- **Provider Pattern**: ProjectScopeProvider for context
- **Hook-based State**: useJacquesClient, useSessionBadges
- **Inline Styles**: All styling in JavaScript (no CSS modules/Tailwind)
- **Component Composition**: Reusable blocks like CollapsibleBlock, MarkdownRenderer
- **Message Type Dispatching**: ConversationViewer handles 12+ content types

---

This comprehensive exploration shows a mature, well-organized React GUI with consistent design language, extensive conversation rendering capabilities, and multi-source integration support. The codebase prioritizes clarity and type safety while maintaining terminal-inspired aesthetics throughout.