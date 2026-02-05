# Explore: Explore GUI codebase structure

> Session: `2b52b5c6-669e-4862-a169-ede18bdc87ce`
> Date: 2026-02-03
> Tokens: ~75 731

---

Perfect! Now I have a thorough understanding of the GUI structure. Let me compile a comprehensive report:

## Jacques GUI - Complete Exploration Report

Based on my thorough analysis of `/Users/gole/Desktop/jacques-context-manager/gui/`, here's a complete overview:

---

### 1. FULL DIRECTORY STRUCTURE - GUI/SRC/

```
gui/src/
├── api/
│   ├── config.ts          # HTTP client configuration (exports API functions)
│   └── index.ts           # API module re-exports
├── components/
│   ├── ActiveSessionViewer.tsx     # Fetches and displays live session transcripts
│   ├── ContextMeter.tsx            # Context usage progress visualization
│   ├── Icons.tsx                   # Icon components (if any)
│   ├── Layout.tsx                  # Main layout with sidebar & navigation
│   ├── LogPanel.tsx                # Single log viewer
│   ├── ModelUsageChart.tsx         # Horizontal bar chart for model distribution
│   ├── MultiLogPanel.tsx           # Multi-tab log panel (server, API, Claude operations)
│   ├── PlanList.tsx                # List of plans from a session
│   ├── ProjectSelector.tsx         # Project scope selector dropdown
│   ├── SessionCard.tsx             # Individual session card with badges
│   ├── SessionList.tsx             # List of sessions
│   ├── StatCard.tsx                # Reusable statistics card component
│   ├── TokenProgressBar.tsx        # Horizontal token usage progress bar
│   └── Conversation/               # Rich conversation viewer components
│       ├── AgentProgressBlock.tsx   # Displays subagent execution info
│       ├── AssistantMessage.tsx     # Single assistant message renderer
│       ├── AssistantMessageGroup.tsx# Groups consecutive assistant messages
│       ├── BashProgressBlock.tsx    # Command execution progress display
│       ├── CodeBlock.tsx            # Syntax-highlighted code blocks
│       ├── CollapsibleBlock.tsx     # Collapsible UI wrapper
│       ├── ConversationMarker.tsx   # Markers for /clear and auto-compact
│       ├── ConversationViewer.tsx   # Main conversation view orchestrator
│       ├── MarkdownRenderer.tsx     # Markdown to React renderer
│       ├── MCPProgressBlock.tsx     # MCP tool execution display
│       ├── PlanNavigator.tsx        # Plan file navigation UI
│       ├── PlanViewer.tsx           # Plan content display
│       ├── QuestionNavigator.tsx    # User question navigation (jump to X)
│       ├── SubagentConversation.tsx # Subagent transcript viewer
│       ├── SubagentNavigator.tsx    # Subagent selection UI
│       ├── UserMessage.tsx          # Single user message renderer
│       ├── WebSearchBlock.tsx       # Web search query/results display
│       └── index.ts                 # Conversation exports
├── hooks/
│   ├── useJacquesClient.ts    # WebSocket client for server communication
│   ├── useProjectScope.tsx    # Project filtering context provider
│   └── useSessionBadges.ts    # Fetches metadata badges for sessions
├── oauth/
│   ├── google.ts              # Google Docs OAuth configuration
│   ├── notion.ts              # Notion OAuth configuration
│   └── index.ts               # OAuth module exports
├── pages/
│   ├── Archive.tsx            # Archived sessions browse & search
│   ├── Context.tsx            # Context file management page
│   ├── Conversations.tsx      # Active/live conversations viewer
│   ├── Dashboard.tsx          # Main dashboard with session grid
│   ├── GoogleDocsConnect.tsx  # Google Docs OAuth flow
│   ├── NotionConnect.tsx      # Notion OAuth flow
│   ├── ProjectDashboard.tsx   # Project-specific view (if different from Dashboard)
│   └── Settings.tsx           # User settings page
├── styles/
│   ├── globals.css                # Global CSS with CSS custom properties
│   └── theme/
│       ├── colors.ts              # Color palette constants
│       └── index.ts               # Typography, spacing, typography, breakpoints
├── utils/
│   └── tokens.ts              # Token counting/formatting utilities
├── App.tsx                    # React Router setup
├── main.tsx                   # Entry point (React 18 StrictMode)
├── types.ts                   # TypeScript types (duplicated from @jacques/core)
└── vite-env.d.ts             # Vite environment type definitions
```

---

### 2. THEME & COLORS SYSTEM

**File: `src/styles/theme/colors.ts`** - Coral/peach accent design

```typescript
Colors Object:
├── BACKGROUNDS (dark terminal aesthetic)
│   ├── bgPrimary: '#0d0d0d'      // Deepest dark (main background)
│   ├── bgSecondary: '#1a1a1a'    // Cards, sidebar
│   ├── bgElevated: '#252525'     // Hover states, modals
│   └── bgInput: '#2a2a2a'        // Input fields, code blocks
├── ACCENT (Coral/Peach - mascot-inspired)
│   ├── accent: '#E67E52'         // Primary CTA, buttons, progress
│   ├── accentLight: '#F09070'    // Hover states
│   ├── accentDark: '#D06840'     // Active states
│   └── accentOrange: '#FF6600'   // Orange variant (project names)
├── TEXT
│   ├── textPrimary: '#ffffff'
│   ├── textSecondary: '#8B9296'  // Descriptions, timestamps
│   └── textMuted: '#6B7075'      // Placeholders, disabled
├── SEMANTIC
│   ├── success: '#4ADE80'        // Connected, saved
│   ├── warning: '#FBBF24'        // Approaching limits
│   └── danger: '#EF4444'         // Disconnected, failed
├── BORDERS
│   ├── border: '#E67E52'         // Default (matches accent)
│   └── borderSubtle: '#3a3a3a'   // Dividers, subtle lines
└── PROGRESS
    ├── progressFill: '#E67E52'
    └── progressEmpty: '#8B9296'
```

**File: `src/styles/theme/index.ts`** - Design tokens

```typescript
Typography:
├── fontFamily.mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace
└── fontFamily.sans: system-ui defaults

Font Sizes: xs(11px), sm(12px), base(14px), lg(16px), xl(20px), 2xl(24px)
Font Weights: normal(400), medium(500), semibold(600), bold(700)
Line Heights: tight(1.2), normal(1.4), relaxed(1.6)

Spacing (4px base): 0, 1(4px), 2(8px), 3(12px), 4(16px), 5(20px), 6(24px), 8(32px), 10(40px), 12(48px), 16(64px)

Border Radius: none, sm(4px), md(8px), lg(12px), xl(16px), full(9999px)

Shadows: sm, md, lg, xl (all with dark backgrounds 0.3-0.6 opacity)

Transitions: fast(150ms), base(250ms), slow(400ms)

Breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px), 2xl(1536px)
```

**File: `src/styles/globals.css`** - Global styling

- CSS custom properties for all theme values (--color-*, --space-*, --font-*, etc.)
- Base reset with box-sizing, margin/padding normalization
- Typography defaults (h1-h6, p, code, pre)
- Focus states with accent color outline
- Custom scrollbar styling (8px width, accent-colored thumb)
- Utility classes (.text-primary, .text-accent, .bg-secondary, etc.)

---

### 3. COMPONENT STRUCTURE

#### **Layout Components (Navigation & Structure)**

**`Layout.tsx`** - Main app shell
- 240px sidebar with project selector, navigation, sources status
- Flex column content area with main content + log panel
- Navigation items: Dashboard, Project, Conversations, Archive, Context, Settings
- Sources section showing Obsidian/Google Docs/Notion connection status
- Uses NavLink with active state styling

**`SessionCard.tsx`** - Reusable session display card
- Shows project name (orange accent), title, model, context meter
- Status indicators (⚡ working, 💤 idle)
- Prominent badges: Plans (📋 purple), Agents (🤖 orange with type breakdown)
- Secondary badges: planning/executing/mcp/web/compacted (inline text)
- Footer with terminal name and "Focused" badge
- Clickable for viewing full session

**`ContextMeter.tsx`** - Progress bar with token display
- 6px height bar with accent fill
- Shows percentage + tokens (current/max)
- Tilde (~) prefix if estimate
- Formatted output (e.g., "42.5% • 85k / 200k")

**`TokenProgressBar.tsx`** - Horizontal bar for any token metric
- Label + current value
- Bar with configurable max and custom color
- Token formatting (K/M suffix)

#### **Conversation Viewer Components**

**`ConversationViewer.tsx`** - Main conversation orchestrator
- Groups consecutive assistant messages together
- Inserts markers for /clear commands and auto-compact events
- Navigation: question navigator (jump to nth question), subagent navigator, plan navigator
- Scrollable with sticky navigators
- Token statistics and totals
- Full message history with proper grouping

**`UserMessage.tsx`** - Single user message
- Text rendering with markdown support
- Timestamp display
- Simple, clean presentation

**`AssistantMessageGroup.tsx`** - Group of assistant messages
- Wraps multiple `AssistantMessage` components
- Shared token totals and model info

**`AssistantMessage.tsx`** - Complex assistant message with content types
- Thinking blocks (collapsible with token count)
- Text content (markdown-rendered)
- Tool calls (structured JSON display)
- Tool results (code or text)
- Agent progress blocks
- Bash execution progress
- MCP tool calls
- Web search queries/results

**Rich Content Blocks:**
- `CodeBlock.tsx` - Syntax highlighting with language detection
- `MarkdownRenderer.tsx` - Markdown to React conversion
- `AgentProgressBlock.tsx` - Subagent metadata and "View Full Conversation" button
- `BashProgressBlock.tsx` - Command output with collapsible full output
- `MCPProgressBlock.tsx` - MCP server/tool execution status
- `WebSearchBlock.tsx` - Search query and results with URLs

**Navigation Components:**
- `QuestionNavigator.tsx` - "Question 5 of 12" with next/prev buttons
- `SubagentNavigator.tsx` - View subagent transcripts inline
- `PlanNavigator.tsx` - Jump to specific plan file
- `PlanViewer.tsx` - Display plan markdown content

#### **Data Display Components**

**`ModelUsageChart.tsx`** - Horizontal bar chart
- Color-codes by model (opus=coral, sonnet=blue, haiku=green)
- Shows count on right
- Automatic width scaling

**`StatCard.tsx`** - Reusable stat display wrapper
- Optional icon
- Title (uppercase, muted)
- Flexible content area

#### **Session Viewer**

**`ActiveSessionViewer.tsx`** - Live session transcript fetcher
- Fetches session data via API
- Detects "awaiting first response" state
- Transforms parsed entries to ConversationMessage format
- Uses ConversationViewer to display
- Loading, error, and awaiting states

---

### 4. PAGES

| Page | Path | Purpose |
|------|------|---------|
| **Dashboard.tsx** | `/` | Main grid of active sessions with status |
| **ProjectDashboard.tsx** | `/project` | Project-specific metrics/overview |
| **Conversations.tsx** | `/conversations` | Live session browser with real-time updates |
| **Archive.tsx** | `/archive` | Archived sessions with search, expandable projects |
| **Context.tsx** | `/context` | Load external context (Obsidian, Google Docs, Notion) |
| **Settings.tsx** | `/settings` | User settings (archive filter, auto-archive toggle) |
| **Sources.tsx** | `/sources` | Configure external sources (OAuth setup) |
| **GoogleDocsConnect.tsx** | `/sources/google` | Google Docs OAuth flow |
| **NotionConnect.tsx** | `/sources/notion` | Notion OAuth flow |

---

### 5. HOOKS (Custom Hooks & Context)

**`useJacquesClient.ts`** - WebSocket client
- Connects to `ws://localhost:4242` (configurable via VITE_JACQUES_SERVER_URL)
- Auto-reconnect with exponential backoff (max 10 attempts)
- Manages session state, focus changes, autocompact toggles
- Streams server logs, Claude operations, API logs
- Callbacks: onConnected, onDisconnected, onSessionUpdate, onSessionRemoved, etc.

**`useProjectScope.tsx`** - Project filtering context
- Provides `selectedProject` and `filterSessions()` function
- Allows scoping dashboard/views to single project
- "All Projects" option to show everything

**`useSessionBadges.ts`** - Session metadata fetcher
- Takes array of session IDs
- Fetches metadata: plan count, agent types, file modifications, MCP calls, web searches, mode, auto-compact
- Returns Map<sessionId, SessionBadges>

---

### 6. PACKAGE.JSON DEPENDENCIES

```json
Dependencies:
  ├── react@^18.3.1
  ├── react-dom@^18.3.1
  ├── react-markdown@^10.1.0      // Markdown rendering
  └── react-router-dom@^6.22.3    // Client-side routing

Dev Dependencies:
  ├── @types/react@^18.3.12
  ├── @types/react-dom@^18.3.1
  ├── @vitejs/plugin-react@^4.3.4
  ├── typescript@^5.7.0
  ├── vite@^5.4.11                // Build tool
  └── vitest@^2.1.8               // Testing framework
```

**Build Configuration:**
- Vite dev server on port 5173
- React Fast Refresh for hot reloading
- Path alias: `@` → `./src`

---

### 7. KEY TYPE DEFINITIONS (types.ts)

**Session Types:**
- `Session` - Active session object (session_id, project, status, context_metrics, model, etc.)
- `ContextMetrics` - Context usage data (percentage, tokens, is_estimate flag)
- `SessionBadges` - Metadata for dashboard cards (planCount, agentCount, mode, etc.)

**Conversation Types:**
- `SavedConversation` - Complete conversation with metadata
- `ConversationMessage` - User or assistant message with content array
- `MessageContent[]` - Union type: text, thinking, tool_use, tool_result, code, agent_progress, bash_progress, mcp_progress, web_search
- `TokenInfo` - Input/output/cache tokens

**Server Messages:**
- `InitialStateMessage` - On connection, sends all sessions + focused ID
- `SessionUpdateMessage` - Real-time session changes
- `SessionRemovedMessage` - When session ends
- `FocusChangedMessage` - Focus shifts to new session
- `ClaudeOperationMessage` - LLM handoff operations logged
- `ApiLogMessage` - HTTP API calls logged

---

### 8. API INTEGRATION (api/config.ts)

**Key API Functions Exported:**
- `getSourcesStatus()` - Check Obsidian/Google Docs/Notion connection
- `getSessionStats()` - Archive statistics
- `listSessionsByProject()` - Grouped archive sessions
- `getSession(id)` - Fetch full session with parsed entries
- `getSessionBadges(ids)` - Metadata for multiple sessions
- `rebuildSessionIndex()` - Scan and index sessions with progress callbacks
- `searchArchivedConversations()` - Full-text search
- Notion & Google Docs OAuth functions

---

### 9. STYLING PATTERNS OBSERVED

**Inline Styles:**
- All components use inline `style` objects (no CSS modules or styled-components)
- Centralized color/theme constants imported from `colors.ts`
- Consistent spacing using theme tokens

**Key Style Patterns:**
- Cards: `bgSecondary` bg + `borderSubtle` border + `md` radius
- Buttons: accent background, white text, `base` transition
- Badges: Semi-transparent background (rgba) + colored text
- Progress bars: `bgElevated` track, `accent` fill
- Focus states: `outline: 2px solid accent` with 2px offset

**Responsive Design:**
- Grid layout: `repeat(auto-fill, minmax(300px, 1fr))` for cards
- Flex layout with gap spacing
- Sidebar 240px fixed, content area flex-1

---

### 10. BUILD & DEVELOPMENT SETUP

**Vite Configuration:**
- React plugin for JSX
- Path alias for `@` imports
- Dev server port 5173 with auto-open

**TypeScript:**
- Strict mode enabled
- React 18 types included
- Vite type definitions

**Development Commands:**
```bash
npm run dev          # Vite dev server
npm run build        # TypeScript + Vite build
npm run preview      # Preview production build
npm test             # Run tests with Vitest
```

---

This GUI is a production-grade React dashboard with real-time WebSocket connectivity, rich conversation visualization, and a clean dark theme centered around the coral/peach accent color from Jacques the mascot. The architecture prioritizes semantic components, centralized styling, and full TypeScript type safety.