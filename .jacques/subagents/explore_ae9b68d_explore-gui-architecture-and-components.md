# Explore: Explore GUI architecture and components

> Session: `4836df4f-6499-4afa-8229-515cfcc3b17b`
> Date: 2026-02-04
> Tokens: ~74 625

---

Perfect! Now I have a comprehensive understanding. Let me compile and deliver my findings:

## GUI Codebase Exploration Report

I've completed a thorough exploration of the Jacques GUI codebase. Here's a comprehensive breakdown:

---

## 1. **Component Architecture**

### Hierarchical Structure
- **Entry Point**: `main.tsx` → `App.tsx` with React Router
- **Layout Root**: `Layout.tsx` - 240px sidebar + main content area (flex layout)
- **Pages** (in `/gui/src/pages/`):
  - `Dashboard.tsx` - Active sessions grid view
  - `ProjectDashboard.tsx` - Full-width project overview with session history & assets
  - `Conversations.tsx` - Conversation viewer
  - `Archive.tsx` - Archived conversations search
  - `Context.tsx` - Context file management
  - `Settings.tsx` - App settings & notification configuration
  - `Sources.tsx` - External source adapters (Obsidian, Google Docs, Notion)
  - `GoogleDocsConnect.tsx`, `NotionConnect.tsx` - OAuth flows

### Component Organization
**Core UI Components** (`/components/ui/`):
- `TerminalPanel` - Mac-style window chrome (red/yellow/green dots, title bar)
- `Badge` - Flexible badge system (12 variants: plan, agent, mcp, web, compacted, planning, execution, focused, live, idle, working)
- `Toast` - Notification system with animated entrance/exit, priority levels, progress bar
- `ToastContainer` - Toast queue manager (staggered animation)
- `SearchInput` - Search field with icon and result counter
- `EmptyState` - Centered empty state with icon, title, description, action
- `SectionHeader` - Section labels with accent color and optional actions
- `NotificationCenter` - Desktop notification aggregation
- `LineNumberList` - Code line numbering
- `NotificationStore` - State management for notifications

**Session Components** (`/components/`):
- `SessionCard` - Card displaying session status, title, context meter, badges (plans, agents, MCP, web search, auto-compact)
- `SessionList` - Scrollable session list
- `ActiveSessionViewer` - Full session viewer with transcript
- `ProjectSelector` - Project scope filter dropdown
- `ContextMeter` - Visual progress bar for context usage %
- `TokenProgressBar` - Simple token progress visualization
- `PlanList` - List of plans in a session
- `StatCard` - Small stat display card
- `MultiLogPanel` - Server/API/operation log viewer
- `ModelUsageChart` - Token usage visualization
- `Icons` - Custom SVG icons (SessionsIcon, TokensIcon, ActivityIcon, ModelIcon, StatusDot, etc.)

**Conversation Components** (`/components/Conversation/`):
- `ConversationViewer` - Main conversation display (scrollable message list with navigation)
- `UserMessage` - User message display with embedded plan detection
- `AssistantMessage` - Claude response with collapsible content blocks, token estimates
- `AssistantMessageGroup` - Groups multiple assistant messages
- `CollapsibleBlock` - Expandable/collapsible content wrapper with expand/collapse refs
- `AgentProgressBlock` - Subagent task visualization
- `BashProgressBlock` - Shell command execution output
- `MCPProgressBlock` - MCP tool call progress
- `WebSearchBlock` - Web search query/results display
- `MarkdownRenderer` - Full markdown support with custom styling
- `CodeBlock` - Syntax-highlighted code blocks
- `QuestionNavigator` - Question/message index navigation
- `SubagentNavigator` - Subagent list with clickable navigation
- `SubagentConversation` - Full subagent conversation viewer
- `PlanNavigator` - Plan list/index with plan badges
- `PlanViewer` - Modal overlay for viewing plan content (markdown, source type badges)
- `ConversationMarker` - Section dividers/markers

---

## 2. **Styling Approach**

### Not Using CSS Modules or Tailwind
**Instead: Inline CSS Objects** with centralized design tokens

**Design Token System** (`/styles/theme/`):
```typescript
// colors.ts - Full color palette
colors: {
  bgPrimary: '#0d0d0d',      // Deepest dark
  bgSecondary: '#1a1a1a',    // Cards, sidebar
  bgElevated: '#252525',     // Hover, modals
  bgInput: '#2a2a2a',        // Input fields
  accent: '#E67E52',         // Coral (mascot-derived)
  accentLight: '#F09070',
  accentDark: '#D06840',
  accentOrange: '#FF6600',
  textPrimary: '#ffffff',
  textSecondary: '#8B9296',
  textMuted: '#6B7075',
  success: '#4ADE80',        // Green
  warning: '#FBBF24',        // Yellow
  danger: '#EF4444',         // Red
  dotRed: '#FF5F56',         // macOS chrome
  dotYellow: '#FFBD2E',
  dotGreen: '#27C93F',
}

typography: {
  fontFamily: { mono: 'JetBrains Mono, SF Mono', sans: 'system-ui' },
  fontSize: { xs: '11px', sm: '12px', base: '14px', lg: '16px', xl: '20px', '2xl': '24px' },
  fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  lineHeight: { tight: 1.2, normal: 1.4, relaxed: 1.6 },
}

spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', ... } (4px base)
borderRadius: { sm: '4px', md: '8px', lg: '12px', ... }
shadows: { sm/md/lg/xl }
transitions: { fast: '150ms ease', base: '250ms ease', slow: '400ms ease' }
```

**Global Styles** (`globals.css`):
- CSS custom properties (`:root`) matching theme tokens
- Reset rules (*, *::before, *::after)
- Base typography scales
- Utility classes (.text-primary, .bg-secondary, etc.)
- Shared animations (@keyframes: spin, pulse-glow, slide-in, expand-in, fade-in, status-pulse, shimmer)
- Component-specific styles (.jacques-session-card, .jacques-horizontal-scroll, .jacques-skeleton, etc.)

**Component Pattern**:
Each component defines `const styles: Record<string, React.CSSProperties> = { ... }` inline, referencing `colors` from theme. Example from SessionCard:

```tsx
const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: '10px',
    border: `1px solid ${colors.borderSubtle}`,
    padding: '20px',
  },
  // ... more styles
};
```

---

## 3. **Modal & Overlay Components**

### Fixed Position Overlays
**PlanViewer Modal** (Conversation/PlanViewer.tsx):
- Full-screen semi-transparent overlay (`position: fixed`, `rgba(0,0,0,0.7)` backdrop)
- Centered modal (80% width, max-width 900px, max-height 80vh)
- Header with source type badge (Embedded/Written/Agent-Generated), close button
- Scrollable content area with MarkdownRenderer
- Footer with keyboard hint + close button
- Click-outside-to-dismiss + Escape key handler

**Toast Notification** (ui/Toast.tsx):
- Fixed bottom-right stack (via ToastContainer)
- Position: fixed, z-index: 1000+
- Animated entrance (slide-in from right)
- Priority-based accent colors (low/medium/high/critical)
- Auto-dismiss countdown with progress bar
- Mouse-hover extends lifetime

**NotificationCenter** (ui/NotificationCenter.tsx):
- Icon button in sidebar footer
- Dropdown menu (likely absolute positioned)
- Aggregates desktop OS notifications

### No Heavy Modal Library
No use of headless UI libraries (Radix, Headless UI, Chakra). All modals are custom-built with CSS positioning.

---

## 4. **Mac Window Style Components**

### TerminalPanel Chrome
Located in `ui/TerminalPanel.tsx` - replicates macOS window styling:

```tsx
<div style={styles.chrome}>
  <div style={styles.dots}>
    <span style={{ backgroundColor: colors.dotRed }} />     {/* #FF5F56 */}
    <span style={{ backgroundColor: colors.dotYellow }} />  {/* #FFBD2E */}
    <span style={{ backgroundColor: colors.dotGreen }} />   {/* #27C93F */}
  </div>
  <span style={styles.title}>window title</span>
</div>
```

Features:
- 6px diameter dots with 6px gap
- Monospace title text in muted color
- Transparent background, border-bottom separator
- Content area below with padding
- Used throughout: LogPanel, MultiLogPanel, Archive, Conversations

### Toast Chrome Bar
Mini terminal header (Toast.tsx):
- Smaller dots (6px), status indicator dot, category label
- Dismiss button
- Used for all notifications

---

## 5. **Color Palette & Design Tokens**

### Canonical Jacques Colors
- **Accent (Coral)**: `#E67E52` - Derived from mascot's peach/coral skin tone
  - Light: `#F09070` (hover)
  - Dark: `#D06840` (active)
  - Orange variant: `#FF6600` (agents, projects)
- **Backgrounds**: 4-level dark hierarchy (#0d0d0d → #252525)
- **Text**: White primary, muted secondary (#8B9296), dimmed (#6B7075)
- **Semantic**: Green (#4ADE80) for success, Yellow (#FBBF24) for warning, Red (#EF4444) for danger
- **Feature Colors**:
  - Plans: Green (#34D399)
  - Agents/Bot: Orange (#FF6600)
  - Web Search: Blue (#60A5FA)
  - MCP: Gray (#8B9296)

### Component-Specific Color Usage
**Badge Variants** (Badge.tsx):
```typescript
plan: { color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.15)' },  // Purple
agent: { color: '#FF6600', bg: 'rgba(255, 102, 0, 0.15)' },   // Orange
mcp: { color: textSecondary, bg: 'rgba(139, 146, 150, 0.15)' },
web: { color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' },    // Blue
compacted: { color: textMuted, bg: 'rgba(107, 112, 117, 0.15)' },
planning: { color: '#34D399', ... },  // Green (Planning mode)
execution: { color: '#60A5FA', ... }, // Blue (Execution mode)
```

---

## 6. **Markdown Rendering**

### react-markdown Integration (MarkdownRenderer.tsx)
**Library**: `react-markdown` (v10.1.0)

**Features**:
- Full markdown support via custom `components` prop
- All HTML elements mapped to styled React components

**Element Mappings**:
```tsx
h1: blue border-bottom, 24px bold, 0 0 16px margin
h2: 20px bold, 24px 0 12px margin
h3: 16px bold, 20px 0 8px margin
h4: 14px secondary color
p: 12px bottom margin
ul/ol: 24px left padding, 12px bottom margin
li: 4px vertical margin
code (inline): dark bg, rounded, accent color, monospace
code (block): bgPrimary, 12px padding, dark gray text
blockquote: left border (3px accent), italic secondary text
table: full width, header with bgElevated, bordered cells
a: accent color, opens in new tab
strong: bold, primary color
em: italic
hr: subtle border-top, 16px margins
```

Used in:
- `PlanViewer` - Plan content display
- `UserMessage` - Embedded plan previews
- `ConversationViewer` - Assistant message text blocks
- Archive conversation display

**No Language-Specific Highlighting**: CodeBlock.tsx handles syntax highlighting separately (not shown in detail).

---

## 7. **Routing Structure & Pages**

### React Router v6 (DOM Routes)
**App.tsx Routes**:
```
/                          Dashboard (active sessions grid)
  /conversations           Conversations viewer
  /conversations/:id       Specific conversation
  /project                 ProjectDashboard (full project view)
  /archive                 Archive search UI
  /context                 Context file browser
  /settings                Settings & preferences
  /sources                 Source adapters page
  /sources/google          Google Docs OAuth
  /sources/notion          Notion OAuth
  /oauth/google/callback   OAuth redirect handler
  /oauth/notion/callback   OAuth redirect handler
```

**Navigation Via**:
- `NavLink` in Layout sidebar (auto-highlights active route)
- `Link` components for cross-page navigation
- Programmatic navigation via `useNavigate()` in some views

**Layout Hierarchy**:
```
<BrowserRouter>
  <App>
    <ProjectScopeProvider>  {/* Project filter context */}
      <NotificationProvider>
        <Layout>             {/* Sidebar + main area */}
          <Outlet />         {/* Page content */}
        </Layout>
      </NotificationProvider>
    </ProjectScopeProvider>
  </App>
</BrowserRouter>
```

---

## 8. **Shared/Common Components**

### Reusable Component Library
**UI Module** (`/components/ui/index.ts` - barrel export):
- TerminalPanel, SearchInput, LineNumberList, Badge, SectionHeader, EmptyState
- Toast/ToastContainer, NotificationCenter
- All have consistent theming and sizing

**Conversation Module** (`/components/Conversation/index.ts`):
- Centralized exports for conversation-related components
- Used by ConversationViewer and ProjectDashboard

**Custom Hooks** (`/hooks/`):
- `useJacquesClient()` - WebSocket connection to server, session streaming
- `useProjectScope()` - Project filter context hook
- `useSessionBadges()` - Fetch plan/agent counts for sessions
- `useNotifications()` - Toast/notification state management

**Icon Library** (Icons.tsx):
- Custom SVG icons (SessionsIcon, TokensIcon, ActivityIcon, ModelIcon, StatusDot, PlanIcon, AgentIcon)
- All exported as React components with size/color/style props
- Plus lucide-react icons (100+ available via npm)

**API Client** (`/api/config.ts`):
- Centralized HTTP client (fetch-based)
- Endpoints for: sessions, archive, subagents, sources, notifications, plans
- Type-safe response/request shapes

---

## 9. **Key Technical Patterns**

### State Management
- **React Context**: ProjectScope, NotificationProvider
- **Custom Hooks**: useJacquesClient (WebSocket streaming), useSessionBadges (async fetching)
- **Local Storage**: Sidebar log panel toggle state

### Data Flow
1. **Server Integration**: WebSocket for real-time sessions (via `useJacquesClient`)
2. **HTTP API**: REST calls for archive, plans, subagents (via `/api/config.ts`)
3. **Component Props**: Session data flows via props, callbacks for interactions

### Responsive Design
- **Grid Layout**: SessionCard grid uses `gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'`
- **Flex Sidebar**: Fixed width (240px), flex content area
- **Max-width Containers**: Pages often capped at 1200px
- **No Media Queries Observed**: Relies on flex/grid intrinsic responsiveness

### Animation & Transitions
- **Entrance**: `slide-in 0.3s ease-out` (messages, cards)
- **Expansion**: `expand-in 0.25s ease-out` (collapsible blocks)
- **Status Pulse**: `status-pulse 1.8s ease-in-out infinite` (working indicator)
- **Toast Animations**: 350ms entrance, 200ms exit with cubic-bezier easing
- **Transitions**: 150ms fast, 250ms base for all interactions

### Accessibility
- Semantic HTML (buttons, headings, form inputs)
- Focus styles (2px accent outline, 2px offset)
- ARIA labels on buttons (dismiss, focus, etc.)
- Keyboard shortcuts (Escape to close modals)

---

## 10. **File Organization Summary**

```
gui/src/
├── App.tsx                    # Main router setup
├── main.tsx                   # React entry point
├── types.ts                   # Global TypeScript types
├── api/
│   ├── index.ts              # API barrel export
│   └── config.ts             # HTTP client (24.5KB)
├── components/
│   ├── Layout.tsx            # Sidebar + main layout
│   ├── SessionCard.tsx       # Session card component
│   ├── ProjectSelector.tsx
│   ├── SessionList.tsx
│   ├── ActiveSessionViewer.tsx
│   ├── Icons.tsx             # Custom SVG icons
│   ├── Conversation/         # Conversation-specific
│   │   ├── ConversationViewer.tsx
│   │   ├── UserMessage.tsx
│   │   ├── AssistantMessage.tsx
│   │   ├── MarkdownRenderer.tsx
│   │   ├── PlanViewer.tsx   # Plan modal overlay
│   │   ├── PlanNavigator.tsx
│   │   ├── SubagentNavigator.tsx
│   │   ├── AgentProgressBlock.tsx
│   │   ├── BashProgressBlock.tsx
│   │   ├── MCPProgressBlock.tsx
│   │   ├── WebSearchBlock.tsx
│   │   ├── CollapsibleBlock.tsx
│   │   ├── CodeBlock.tsx
│   │   └── ... (more components)
│   └── ui/                   # Reusable UI components
│       ├── TerminalPanel.tsx
│       ├── Badge.tsx
│       ├── Toast.tsx
│       ├── ToastContainer.tsx
│       ├── NotificationCenter.tsx
│       ├── SearchInput.tsx
│       ├── EmptyState.tsx
│       ├── SectionHeader.tsx
│       ├── index.ts          # Barrel export
│       └── ... (more UI)
├── hooks/
│   ├── useJacquesClient.ts   # WebSocket connection
│   ├── useProjectScope.tsx   # Project filter context
│   ├── useSessionBadges.ts   # Plan/agent counts
│   └── useNotifications.tsx  # Toast management
├── pages/
│   ├── Dashboard.tsx         # Active sessions grid
│   ├── ProjectDashboard.tsx  # Full project view (32.5KB)
│   ├── Conversations.tsx
│   ├── Archive.tsx
│   ├── Context.tsx
│   ├── Settings.tsx
│   ├── Sources.tsx
│   ├── GoogleDocsConnect.tsx
│   └── NotionConnect.tsx
├── styles/
│   ├── globals.css           # CSS reset, animations, utilities
│   └── theme/
│       ├── colors.ts         # Color palette
│       └── index.ts          # Theme exports (typography, spacing, etc.)
├── utils/
│   └── tokens.ts             # Token estimation helpers
└── notifications/            # Notification system
    └── ... (notification types)
```

---

## Summary Table

| Aspect | Details |
|--------|---------|
| **Framework** | React 18.3 + TypeScript 5.7 |
| **Build Tool** | Vite 5.4 + React plugin |
| **Styling** | Inline CSS objects + global CSS utilities |
| **Color System** | Custom theme tokens (coral accent, 4-level dark backgrounds) |
| **Markdown** | react-markdown with custom component mappings |
| **Icons** | Lucide React (100+) + custom SVG |
| **Routing** | React Router DOM v6 |
| **State** | React Context + custom hooks |
| **Modals** | Custom position:fixed overlays (no library) |
| **Animations** | CSS keyframes (@keyframes in globals.css) |
| **Mac Styling** | Native macOS window chrome (red/yellow/green dots) |
| **Terminal Aesthetic** | Monospace fonts, dark theme, grid layout, minimal spacing |
| **Components** | 40+ components across UI, Conversation, and Pages |

This is a **mature, well-organized design system** with strong theming, no external styling dependencies (Tailwind/CSS Modules), and a consistent pattern of inline styled-components with centralized theme tokens.