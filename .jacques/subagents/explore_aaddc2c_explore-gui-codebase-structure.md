# Explore: Explore GUI codebase structure

> Session: `04de25a7-47d2-4f5e-a72d-a06a72ddfa05`
> Date: 2026-02-02
> Tokens: ~71 361

---

Excellent! Now I have a comprehensive understanding. Let me create a detailed report document:

## GUI Codebase Exploration Report

I've completed a thorough exploration of the Jacques GUI codebase. Here's a comprehensive breakdown of the structure, patterns, and key architectural insights:

---

### 1. DIRECTORY STRUCTURE

```
gui/src/
├── api/                      # HTTP API client
│   ├── config.ts            # REST API endpoints and types
│   └── index.ts             # Public API exports
├── components/              # Reusable React components
│   ├── Conversation/        # Conversation viewer components
│   │   ├── ConversationViewer.tsx      # Main conversation display
│   │   ├── AssistantMessageGroup.tsx   # Assistant messages with tokens
│   │   ├── UserMessage.tsx             # User messages
│   │   ├── AgentProgressBlock.tsx      # Subagent execution display
│   │   ├── SubagentNavigator.tsx       # Jump between subagents
│   │   ├── PlanNavigator.tsx           # Browse plans in session
│   │   ├── PlanViewer.tsx              # Display plan markdown
│   │   ├── QuestionNavigator.tsx       # Jump between user messages
│   │   ├── MarkdownRenderer.tsx        # Render markdown content
│   │   ├── CollapsibleBlock.tsx        # Collapsible content wrapper
│   │   ├── BashProgressBlock.tsx       # Command execution output
│   │   ├── MCPProgressBlock.tsx        # MCP tool calls
│   │   ├── WebSearchBlock.tsx          # Web search results
│   │   └── ConversationMarker.tsx      # /clear and auto-compact markers
│   ├── Layout.tsx           # Main sidebar + content layout
│   ├── SessionCard.tsx      # Session display with badges
│   ├── ContextMeter.tsx     # Progress bar showing context usage
│   ├── ProjectSelector.tsx  # Project filtering dropdown
│   ├── MultiLogPanel.tsx    # Debug logs display
│   ├── LogPanel.tsx         # Individual log panel
│   └── ActiveSessionViewer.tsx  # Real-time session viewer
├── hooks/                   # Custom React hooks
│   ├── useJacquesClient.ts  # WebSocket connection to server
│   ├── useSessionBadges.ts  # Fetch session metadata badges
│   └── useProjectScope.tsx  # Project filtering context
├── pages/                   # Page components (routing targets)
│   ├── Dashboard.tsx        # Main session grid view
│   ├── Archive.tsx          # Session history with rebuild
│   ├── Conversations.tsx    # Saved conversation list (mock)
│   ├── Context.tsx          # Context file management
│   ├── Settings.tsx         # Configuration
│   ├── Sources.tsx          # External source management
│   ├── GoogleDocsConnect.tsx # Google OAuth integration
│   └── NotionConnect.tsx    # Notion OAuth integration
├── styles/                  # Theme and styling
│   ├── theme/
│   │   ├── colors.ts        # Color palette definition
│   │   └── index.ts         # Typography, spacing, shadows, transitions
│   └── globals.css          # CSS custom properties and resets
├── utils/                   # Utility functions
│   └── tokens.ts            # Token estimation and formatting
├── oauth/                   # OAuth implementations
│   ├── google.ts
│   ├── notion.ts
│   └── index.ts
├── types.ts                 # TypeScript interfaces (duplicated from @jacques/core for browser)
├── App.tsx                  # Route definitions
└── main.tsx                 # React entry point
```

---

### 2. KEY ARCHITECTURAL PATTERNS

#### **A. Page Structure Pattern**

All pages follow this consistent structure:

1. **Import dependencies** (hooks, components, types, theme)
2. **Define local state** (useState for data, loading, errors)
3. **Define effects** (useEffect for data loading)
4. **Render conditional views** (loading state → error → empty state → content)
5. **Define inline styles** (at module bottom as `Record<string, React.CSSProperties>`)

**Example** (from `Dashboard.tsx`):
```typescript
// State management
const { sessions, focusedSessionId, connected } = useJacquesClient();
const { selectedProject, filterSessions } = useProjectScope();
const [selectedSession, setSelectedSession] = useState<Session | null>(null);

// Conditional rendering
if (selectedSession) return <ActiveSessionViewer ... />;
return <div style={styles.container}> ... </div>;
```

#### **B. Component Composition Patterns**

Components are composable and follow these patterns:

1. **Props-based configuration**: Components accept props for data and callbacks
2. **Inline styles**: All styling is inline React.CSSProperties (no CSS-in-JS library)
3. **Type safety**: Props are fully typed with interfaces
4. **Callback handlers**: Event handlers passed as optional props (`onClick?`, `onBack?`)
5. **Memoization**: Uses `useMemo` for expensive calculations

**Example** (from `SessionCard.tsx`):
```typescript
interface SessionCardProps {
  session: Session;
  isFocused: boolean;
  badges?: SessionBadges;
  onClick?: () => void;
  onPlanClick?: () => void;
}

export function SessionCard({ session, isFocused, badges, onClick }: SessionCardProps) {
  // Component logic
  const handleCardClick = (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onClick?.();
  };
  
  return <div style={styles.card} onClick={handleCardClick}> ... </div>;
}
```

#### **C. API Client Pattern**

HTTP API calls are isolated in `api/config.ts`:

1. **Single file**: All API endpoints in one file
2. **Async/await**: Uses standard fetch API
3. **Error handling**: Throws errors that components catch
4. **Typing**: Returns typed interfaces
5. **URL configuration**: Uses `import.meta.env` for dev/prod URLs

```typescript
const API_URL = import.meta.env.DEV ? 'http://localhost:4243/api' : '/api';

export async function getSourcesStatus(): Promise<SourcesStatus> {
  const response = await fetch(`${API_URL}/sources/status`);
  if (!response.ok) throw new Error(...);
  return response.json();
}
```

#### **D. Hook Pattern (useJacquesClient)**

WebSocket client wrapped in React hook:

```typescript
const SERVER_URL = import.meta.env.VITE_JACQUES_SERVER_URL || 'ws://localhost:4242';

class BrowserJacquesClient {
  connect() { /* WebSocket logic */ }
  disconnect() { /* Cleanup */ }
  private handleMessage(message) { /* Route by type */ }
  private scheduleReconnect() { /* Exponential backoff */ }
}

export function useJacquesClient() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [connected, setConnected] = useState(false);
  
  useEffect(() => {
    client.onInitialState = (sessions, focusedId) => setSessions(sessions);
    client.onSessionUpdate = (session) => updateSession(session);
    client.connect();
    return () => client.disconnect();
  }, []);
  
  return { sessions, focusedSessionId, connected, ... };
}
```

---

### 3. THEME & STYLING SYSTEM

#### **Color Palette** (`theme/colors.ts`)
- **Backgrounds**: 4 shades from `#0d0d0d` (primary) to `#2a2a2a` (input)
- **Accent**: Coral/peach `#E67E52` (inspired by mascot's skin tone)
- **Text**: Primary, secondary, muted (white to gray)
- **Semantic**: Success (`#4ADE80`), warning (`#FBBF24`), danger (`#EF4444`)
- **Borders**: Subtle dividers `#3a3a3a`

#### **Typography** (`theme/index.ts`)
```typescript
fontFamily: {
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
  sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
},
fontSize: { xs: '11px', sm: '12px', base: '14px', lg: '16px', xl: '20px', '2xl': '24px' },
fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
```

#### **Spacing Scale** (4px base unit)
```
0: '0', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px'
```

#### **Global Styles** (`globals.css`)
- CSS custom properties for all theme values
- Button resets (no default styling)
- Scrollbar customization (8px width, subtle colors)
- Selection styling (accent background, primary text)
- Focus styles (accent outline)
- Typography hierarchy (h1-h6 with appropriate sizes)

---

### 4. LAYOUT COMPONENT ANALYSIS

The `Layout.tsx` component is the main container that wraps all pages:

**Structure**:
1. **Sidebar** (240px fixed width)
   - Logo + mascot image
   - Project selector dropdown
   - Main navigation (Dashboard, Conversations, Archive, Context)
   - Sources section (Obsidian, Google Docs, Notion with connection status)
   - Settings link in footer

2. **Content Area** (flex 1)
   - Main area (flex 1, scrollable)
   - Multi-log panel (debug/server logs)

**Navigation Items** (hardcoded in `navItems`):
```typescript
const navItems = [
  { path: '/', label: 'Dashboard', icon: '◉' },
  { path: '/conversations', label: 'Conversations', icon: '▸' },
  { path: '/archive', label: 'Archive', icon: '▸' },
  { path: '/context', label: 'Context', icon: '▸' },
];
```

**Active State Detection**:
```typescript
const isActive = location.pathname === item.path ||
  (item.path !== '/' && location.pathname.startsWith(item.path));
```

---

### 5. EXISTING PAGES & PATTERNS

#### **Dashboard.tsx** (Session Grid)
- Fetches sessions with `useJacquesClient()`
- Filters by project with `useProjectScope()`
- Fetches badges with `useSessionBadges(sessionIds)`
- Displays sessions in auto-fill grid: `gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'`
- Shows connection status in header
- Handles session selection → opens `ActiveSessionViewer`

#### **Archive.tsx** (Session History)
- Fetches stats and sessions with `getSessionStats()` + `listSessionsByProject()`
- Supports rebuild index with progress tracking
- Client-side search filtering
- Collapsible projects → sessions list
- Shows badges: planning/execution mode, plan count, auto-compact, token usage
- Can select session to open `ConversationViewer`

#### **Settings.tsx** (Configuration)
- Archive filter radio buttons (Without Tools, Everything, Messages Only)
- Auto-archive toggle checkbox
- Placeholder for sources section
- Uses section containers with subtle borders

#### **Conversations.tsx** (Mock/Placeholder)
- Uses mock data for demonstration
- Shows conversation list with metadata (messages, tools, tech stack)
- Clickable cards that open `ConversationViewer`

#### **Sources.tsx**, **GoogleDocsConnect.tsx**, **NotionConnect.tsx**
- OAuth integration pages
- Handle OAuth callbacks
- Configure external source connections

---

### 6. KEY COMPONENTS

#### **SessionCard.tsx**
- Displays single session with rich information
- Shows: project, status, title, model, context meter
- Badges: plans, agents (clickable), secondary badges (planning, compacted, etc.)
- Focused indicator
- Responsive badge wrapping

#### **ContextMeter.tsx**
- Progress bar showing context usage
- Displays percentage + token counts
- Shows estimate indicator (~)
- Inline within cards

#### **ConversationViewer.tsx** (Conversation Display)
- Main component for viewing message threads
- Groups messages (user, assistant, markers)
- Inserts markers for /clear commands and auto-compact events
- Navigators: QuestionNavigator (jump between user messages), SubagentNavigator, PlanNavigator
- Accumulates token usage across assistant messages
- Handles subagent token lookup via `subagentTokenMap`

#### **Message Components**
- `UserMessage.tsx`: Display user prompts with formatting
- `AssistantMessageGroup.tsx`: Group assistant messages with accumulated tokens
- `AgentProgressBlock.tsx`: Show subagent execution with link to full conversation
- `BashProgressBlock.tsx`: Command output
- `MCPProgressBlock.tsx`: MCP tool calls
- `WebSearchBlock.tsx`: Web search queries/results
- `CollapsibleBlock.tsx`: Generic collapsible wrapper

---

### 7. API CLIENT PATTERNS

**Export Pattern** (`api/index.ts`):
```typescript
export { getSourcesStatus, configureGoogleDocs, ... } from './config';
export type { SourceStatus, SourcesStatus, ... } from './config';
```

**Session/Conversation API Endpoints**:
- `getSessionStats()` → Stats object
- `listSessionsByProject()` → Projects with sessions
- `getSession(id)` → Full session with entries and statistics
- `getSessionBadges(id)` → Plans, agents, tools used
- `rebuildSessionIndex()` → Scan and index sessions

**Archive API Endpoints**:
- `getArchiveStats()` → Global archive statistics
- `searchArchivedConversations()` → Keyword search
- Various conversation/subagent retrieval methods

---

### 8. TYPE SYSTEM

**Browser-Duplicated Types** (`types.ts`):
```typescript
export interface Session {
  session_id: string;
  source: SessionSource;
  project: string;
  session_title: string | null;
  context_metrics: ContextMetrics | null;
  model: ModelInfo | null;
  status: 'idle' | 'working' | 'active';
  last_activity: number;
  // ... more fields
}

export interface SavedConversation {
  id: string;
  title: string;
  project: string;
  messages: ConversationMessage[];
  metadata: { messageCount, toolCallCount, actualTokens?, subagents? };
}
```

**Why duplicated**: Core package uses Node.js APIs; GUI runs in browser, so types are re-defined for browser compatibility.

---

### 9. HOOKS & STATE MANAGEMENT

#### **useJacquesClient()**
- Manages WebSocket connection to Jacques server
- Auto-reconnect with exponential backoff
- Returns: `{ sessions, focusedSessionId, connected, serverLogs, claudeOperations, apiLogs }`
- Callbacks: `onSessionUpdate`, `onSessionRemoved`, `onFocusChanged`, `onAutocompactToggled`

#### **useProjectScope()**
- Provides project filtering context
- Returns: `{ selectedProject, setSelectedProject, filterSessions(), archivedProjects }`
- Used by Dashboard to show filtered sessions

#### **useSessionBadges(sessionIds)**
- Caches badges with 30-second TTL
- Returns: `{ badges: Map<sessionId, SessionBadges>, loading, error, refetch }`
- Parallel fetching of all badges for visible sessions

---

### 10. PATTERNS FOR CREATING NEW PAGES

Based on existing pages, here's the pattern for creating a new page:

1. **Create page file** in `gui/src/pages/NewPage.tsx`

2. **Import dependencies**:
```typescript
import { useState, useEffect } from 'react';
import { colors } from '../styles/theme';
import { useJacquesClient } from '../hooks/useJacquesClient'; // If needing sessions
import { useProjectScope } from '../hooks/useProjectScope';   // If filtering by project
import type { Session } from '../types';
```

3. **Define state**:
```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

4. **Define effects** for data loading:
```typescript
useEffect(() => {
  async function load() {
    try {
      setLoading(true);
      const result = await fetchData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }
  load();
}, [dependencies]);
```

5. **Render conditional views**:
```typescript
if (loading) return <div style={styles.loading}>Loading...</div>;
if (error) return <div style={styles.errorBanner}>{error}</div>;
if (!data) return <div style={styles.empty}>No data</div>;
return <div style={styles.container}>{/* content */}</div>;
```

6. **Define styles at module bottom**:
```typescript
const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1200px' },
  title: { fontSize: '24px', fontWeight: 600, color: colors.textPrimary },
  // ... more styles
};
```

7. **Add route** in `App.tsx`:
```typescript
<Route path="new-page" element={<NewPage />} />
```

8. **Add nav item** in `Layout.tsx`:
```typescript
const navItems = [
  // ... existing
  { path: '/new-page', label: 'New Page', icon: '▸' },
];
```

---

### 11. REUSABLE COMPONENTS FOR NEW PAGES

When creating new pages, reuse:

1. **ContextMeter** - Show token usage progress
2. **SessionCard** - Display session summaries
3. **CollapsibleBlock** - Collapsible sections
4. **ConversationViewer** - Show saved conversations
5. **ProjectSelector** - Filter by project (in hooks)
6. **MultiLogPanel** - Debug logs (in Layout)

Example usage:
```typescript
<SessionCard 
  session={session}
  isFocused={session.session_id === focusedSessionId}
  badges={badges.get(session.session_id)}
  onClick={() => setSelectedSession(session)}
/>
```

---

### 12. STYLING BEST PRACTICES

Based on existing code:

1. **Use color constants**:
```typescript
backgroundColor: colors.bgSecondary,
color: colors.textPrimary,
border: `1px solid ${colors.borderSubtle}`,
```

2. **Use consistent spacing**:
```typescript
padding: '16px',      // matches theme spacing.4
gap: '12px',          // matches theme spacing.3
marginBottom: '24px', // matches theme spacing.6
```

3. **Use theme transitions**:
```typescript
transition: 'all 150ms ease', // Use colors.transitions.fast
transition: 'color var(--transition-fast)', // CSS var
```

4. **Empty states** (consistent pattern):
```typescript
emptyState: {
  padding: '48px',
  textAlign: 'center' as const,
  backgroundColor: colors.bgSecondary,
  borderRadius: '8px',
  border: `1px dashed ${colors.borderSubtle}`,
}
```

5. **Cards** (consistent border/background):
```typescript
backgroundColor: colors.bgSecondary,
border: `1px solid ${colors.borderSubtle}`,
borderRadius: '8px',
padding: '16px',
```

---

### 13. BUILD & DEVELOPMENT

- **Dev server**: `npm run dev` → Vite on port 5173
- **Build**: `npm run build` → TypeScript + Vite bundling
- **Preview**: `npm run preview` → Test production build locally
- **Testing**: `npm run test` → Vitest

**Environment variables**:
- `import.meta.env.DEV` - True in dev mode
- `import.meta.env.VITE_JACQUES_SERVER_URL` - WebSocket URL (default: `ws://localhost:4242`)

**Module system**: ES modules (`"type": "module"`)
- All imports use `.js` extensions for TypeScript files (resolved by bundler)

---

### 14. KEY INSIGHTS

1. **No external UI library**: Uses inline React styles, not Material-UI or Tailwind
2. **Minimal dependencies**: React, React DOM, React Router, React Markdown only
3. **Terminal aesthetic**: Colors and layout inspired by CLI/TUI design
4. **Real-time updates**: WebSocket-driven, not polling
5. **Browser-native**: No Node.js APIs, types duplicated for compatibility
6. **Consistent patterns**: All pages follow same structure for predictability
7. **Progressive enhancement**: Graceful degradation for missing data (null checks)
8. **Type-safe**: Full TypeScript coverage, no `any` types in patterns

---

This completes the exploration. The codebase is well-structured with clear patterns for adding new pages and components. The theme system is centralized and the API client is isolated, making it easy to extend functionality.