# Explore: Explore GUI codebase structure

> Session: `87cb5a8d-1f94-47f8-ae07-f271578d28fc`
> Date: 2026-02-02
> Tokens: ~64 300

---

Perfect! Now I have a comprehensive understanding of the GUI architecture. Let me create a detailed analysis document based on my exploration:

## GUI Architecture Analysis and Design Guide for Project Dashboard

Based on my thorough exploration of the gui/ folder, here's a comprehensive guide for designing the new Project Dashboard view:

---

## 1. Overall Architecture & Structure

The GUI is a **React 18 + TypeScript + Vite** application with the following characteristics:

### Key Stack:
- **Framework**: React 18 with React Router v6 for navigation
- **Bundler**: Vite (dev server on port 5173)
- **Language**: TypeScript (strict mode)
- **Styling**: Inline CSS-in-JS via `React.CSSProperties` (NO CSS framework like Tailwind)
- **State Management**: React hooks (useState, useContext, useCallback, useMemo)
- **WebSocket**: Custom BrowserJacquesClient for real-time updates

### Build Configuration:
- **Output**: `dist/` directory
- **API URLs**: Relative in production (`/api`), absolute in dev (`http://localhost:4243/api`)
- **WebSocket**: Relative in production (`ws://...`), absolute in dev (`ws://localhost:4242`)

---

## 2. How Existing Views/Pages Are Organized

```
gui/src/
├── pages/                    # Top-level route components
│   ├── Dashboard.tsx        # Session grid view (main entry point)
│   ├── Archive.tsx          # Archived conversations (large file)
│   ├── Conversations.tsx    # Mock conversation viewer
│   ├── Context.tsx          # Context file management
│   ├── Settings.tsx         # Simple form-based settings
│   ├── Sources.tsx          # Source configuration
│   ├── GoogleDocsConnect.tsx
│   └── NotionConnect.tsx
├── components/             # Reusable React components
│   ├── Layout.tsx          # Main app shell with sidebar + main area
│   ├── SessionCard.tsx     # Individual session card (grid item)
│   ├── ActiveSessionViewer.tsx  # Session detail view
│   ├── ProjectSelector.tsx  # Dropdown for filtering
│   ├── ContextMeter.tsx     # Progress bar for context usage
│   ├── Conversation/       # Rich conversation viewer subcomponents
│   │   ├── ConversationViewer.tsx
│   │   ├── UserMessage.tsx
│   │   ├── AssistantMessage.tsx
│   │   ├── CodeBlock.tsx
│   │   ├── MarkdownRenderer.tsx
│   │   ├── CollapsibleBlock.tsx
│   │   ├── AgentProgressBlock.tsx
│   │   ├── BashProgressBlock.tsx
│   │   ├── MCPProgressBlock.tsx
│   │   ├── WebSearchBlock.tsx
│   │   ├── PlanViewer.tsx
│   │   ├── SubagentNavigator.tsx
│   │   ├── PlanNavigator.tsx
│   │   ├── QuestionNavigator.tsx
│   │   └── SubagentConversation.tsx
│   ├── LogPanel.tsx        # Single log viewer
│   └── MultiLogPanel.tsx   # Tabbed log panel (server/API/operations logs)
├── hooks/                  # Custom React hooks
│   ├── useJacquesClient.ts # WebSocket connection & session state management
│   ├── useProjectScope.tsx # Project filtering context
│   └── useSessionBadges.ts # Fetch & cache session metadata badges
├── api/                    # HTTP API client
│   ├── index.ts           # Barrel export
│   └── config.ts          # All API endpoints (archive, sessions, sources)
├── types.ts               # All TypeScript interfaces (duplicated from core)
├── styles/                # Theme & design system
│   ├── globals.css
│   └── theme/
│       ├── colors.ts      # Dark theme color palette
│       └── index.ts       # Typography, spacing, transitions, breakpoints
├── utils/
│   └── tokens.ts          # Token formatting utilities
├── vite-env.d.ts
├── main.tsx               # React DOM entry point
└── App.tsx                # Router configuration
```

### Routing Pattern:
```
/                           → Dashboard (home)
/conversations              → Conversations page
/conversations/:id          → Specific conversation
/archive                    → Archive page
/context                    → Context management
/settings                   → Settings
/sources                    → Source configuration
/sources/google             → Google Docs oauth flow
/sources/notion             → Notion oauth flow
/oauth/google/callback
/oauth/notion/callback
```

---

## 3. UI Library & Styling Approach

**Key Point**: NO CSS framework (Tailwind, styled-components, etc.)

### Styling Pattern:
- **Inline CSS-in-JS** using `React.CSSProperties` type
- **Centralized color palette** in `src/styles/theme/colors.ts`
- **Design tokens** (spacing, typography, transitions) in `src/styles/theme/index.ts`

### Example Pattern:
```tsx
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: colors.textPrimary,
  },
};

export function MyComponent() {
  return <div style={styles.container}>...</div>;
}
```

### Color System (Dark Theme):
```
BACKGROUNDS:
- bgPrimary: #0d0d0d (deepest)
- bgSecondary: #1a1a1a (cards, sidebar)
- bgElevated: #252525 (hover, modals)
- bgInput: #2a2a2a (input fields)

ACCENT (Coral/Peach from mascot):
- accent: #E67E52 (primary - buttons, links, progress)
- accentLight: #F09070 (hover)
- accentDark: #D06840 (active)
- accentOrange: #FF6600 (variant)

TEXT:
- textPrimary: #ffffff (headings, body)
- textSecondary: #8B9296 (descriptions)
- textMuted: #6B7075 (placeholders)

SEMANTIC:
- success: #4ADE80
- warning: #FBBF24
- danger: #EF4444

BORDERS:
- border: #E67E52 (default, matches accent)
- borderSubtle: #3a3a3a (dividers)
```

### Typography Scale:
```
Font Sizes:  xs (11px), sm (12px), base (14px), lg (16px), xl (20px), 2xl (24px)
Font Weight: normal (400), medium (500), semibold (600), bold (700)
Line Height: tight (1.2), normal (1.4), relaxed (1.6)
Font Family: mono (JetBrains Mono), sans (system-ui)
```

### Spacing Scale (4px base):
```
0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px)
```

### Responsive Breakpoints:
```
sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
```

---

## 4. Data Flow: Server ↔ WebSocket ↔ React

### Architecture:
```
Jacques Server (Node.js port 4242)
      ↑↓ WebSocket
BrowserJacquesClient (gui/src/hooks/useJacquesClient.ts)
      ↓ events → callbacks
React State (useState)
      ↓
Components render
```

### Key Hook: `useJacquesClient()`

**Location**: `gui/src/hooks/useJacquesClient.ts`

**Returns**:
```ts
{
  sessions: Session[];              // All active sessions
  focusedSessionId: string | null;  // Currently focused session
  connected: boolean;               // WebSocket connection status
  lastUpdate: number;               // Timestamp of last update
  serverLogs: ServerLog[];          // Server event logs (last 100)
  claudeOperations: ClaudeOperation[]; // LLM operations (last 50)
  apiLogs: ApiLog[];                // HTTP API logs (last 100)
  selectSession: (sessionId: string) => void;
  triggerAction: (sessionId, action: 'smart_compact'|'new_session'|'save_snapshot') => void;
  toggleAutoCompact: () => void;
}
```

**WebSocket Message Types**:
```ts
- initial_state → (sessions[], focusedSessionId)
- session_update → (session)
- session_removed → (sessionId)
- focus_changed → (sessionId, session)
- autocompact_toggled → (enabled)
- server_log → (type, level, message, timestamp)
- claude_operation → (operation data)
- api_log → (method, path, status, durationMs, timestamp)
```

### Context API Pattern: `useProjectScope()`

**Location**: `gui/src/hooks/useProjectScope.tsx`

Provides project filtering:
```ts
{
  selectedProject: string | null;     // Currently selected project
  setSelectedProject: (project: string | null) => void;
  filterSessions: (sessions: Session[]) => Session[];  // Filter by project
  archivedProjects: string[];         // All archived projects
  setArchivedProjects: (projects: string[]) => void;
}
```

---

## 5. HTTP API Client Pattern

**Location**: `gui/src/api/config.ts`

All API calls are async functions returning typed data:

```ts
// Example: Get archive statistics
async function getArchiveStats(): Promise<ArchiveStats> {
  const response = await fetch(`${API_URL}/archive/stats`);
  if (!response.ok) throw new Error(...);
  return response.json();
}

// Example: Search archived conversations
async function searchArchivedConversations(query: string, options?: {
  project?: string;
  technologies?: string[];
  limit?: number;
  offset?: number;
}): Promise<{ query, totalMatches, results[] }> { ... }

// Example: Stream-based initialization
function initializeArchive(callbacks: {
  onProgress?: (progress) => void;
  onComplete?: (result) => void;
  onError?: (error: string) => void;
}) { ... }
```

**Key API Endpoints**:
- `/api/sources/status` - Source connection status
- `/api/archive/stats` - Archive statistics
- `/api/archive/conversations` - List conversations
- `/api/archive/conversations/:id` - Get conversation
- `/api/archive/search` - Search conversations
- `/api/archive/initialize` - Bulk archive (SSE streaming)
- `/api/sessions/{sessionId}` - Get session with transcript
- `/api/sessions/{sessionId}/subagents` - List subagents

---

## 6. Existing Dashboard & Statistics Components

### Dashboard Page (`pages/Dashboard.tsx`)
**Purpose**: Shows active sessions in a grid layout

**Features**:
- Real-time session grid (auto-updates via WebSocket)
- Project scope filtering
- Session cards with context meter + badges
- Click to view session details
- Connection status indicator
- Empty state messaging

**Pattern**:
```tsx
export function Dashboard() {
  const { sessions, focusedSessionId, connected } = useJacquesClient();
  const { selectedProject, filterSessions } = useProjectScope();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const filteredSessions = useMemo(() => filterSessions(sessions), [sessions, filterSessions]);
  const { badges } = useSessionBadges(filteredSessions.map(s => s.session_id));

  return (
    <div style={styles.container}>
      {/* Header with connection status */}
      {/* Grid of SessionCard components */}
      {/* Empty state fallback */}
    </div>
  );
}
```

### Session Card Component (`components/SessionCard.tsx`)
**Purpose**: Individual card in the session grid

**Displays**:
- Project name (orange accent)
- Session status icon (⚡ working, 💤 idle, ● active)
- Session title
- Model name (shortened)
- Context meter (progress bar + percentage)
- Prominent badges (plans, agents) - clickable
- Secondary badges (planning, execution, mcp, web, compacted)
- Terminal name + focused indicator

**Badge Types**:
```ts
interface SessionBadges {
  planCount: number;
  agentCount: number;
  agentTypes: { explore, plan, general };
  fileCount: number;
  mcpCount: number;
  webSearchCount: number;
  mode: 'planning' | 'execution' | null;
  hadAutoCompact: boolean;
}
```

### Context Meter Component (`components/ContextMeter.tsx`)
**Purpose**: Reusable progress bar showing context usage

**Displays**:
- Filled progress bar (width = percentage)
- Percentage with "~" prefix if estimated
- Token count "current / max" with K/M formatting

### Active Session Viewer (`components/ActiveSessionViewer.tsx`)
**Purpose**: Full conversation view for a single session

**Features**:
- Fetches session data via HTTP API
- Transforms JSONL entries to ConversationMessage[]
- Passes to ConversationViewer component
- Back button to return to grid

---

## 7. Hook Patterns & State Management

### Pattern: `useJacquesClient()` + Local State
```tsx
export function Dashboard() {
  // Global WebSocket state
  const { sessions, connected } = useJacquesClient();
  
  // Local component state
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  // Memoized derived state
  const filteredSessions = useMemo(
    () => filterSessions(sessions),
    [sessions, filterSessions]
  );
  
  return (...);
}
```

### Pattern: Context + Hook for Global State
```tsx
// Provider setup in App.tsx
<ProjectScopeProvider>
  <Routes>...</Routes>
</ProjectScopeProvider>

// Usage in components
export function SomeComponent() {
  const { selectedProject, setSelectedProject } = useProjectScope();
  // ...
}
```

### Pattern: Data Fetching with useEffect
```tsx
const [data, setData] = useState<DataType | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  async function load() {
    setLoading(true);
    try {
      const result = await fetchData();
      setData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }
  load();
}, [dependencies]);
```

---

## 8. Session & Project Data Types

### Session Type (`types.ts`):
```ts
interface Session {
  session_id: string;
  source: 'claude_code' | 'cursor' | string;
  cwd: string;
  project: string;
  session_title: string | null;
  terminal?: TerminalIdentity;
  context_metrics: ContextMetrics | null;
  model: ModelInfo | null;
  workspace: WorkspaceInfo | null;
  autocompact: AutoCompactStatus | null;
  status: 'idle' | 'working' | 'active';
  last_activity: number;
  registered_at: number;
  transcript_path?: string;
}

interface ContextMetrics {
  used_percentage: number;
  context_window_size: number;
  total_input_tokens: number;
  total_output_tokens: number;
  is_estimate?: boolean;
}
```

### Archive Statistics (`api/config.ts`):
```ts
interface ArchiveStats {
  totalConversations: number;
  totalProjects: number;
  totalSizeBytes: number;
  sizeFormatted: string;
}
```

### Session Index Entry (`api/config.ts`):
```ts
interface SessionEntry {
  id: string;
  jsonlPath: string;
  projectPath: string;
  projectSlug: string;
  title: string;
  startedAt: string;
  endedAt: string;
  messageCount: number;
  toolCallCount: number;
  hasSubagents: boolean;
  subagentIds?: string[];
  hadAutoCompact?: boolean;
  tokens?: { input, output, cacheCreation, cacheRead };
  fileSizeBytes: number;
  modifiedAt: string;
  planCount?: number;
}
```

---

## 9. Layout Structure

### Main App Shell (`components/Layout.tsx`):
```
┌─────────────────────────────────────┐
│ Container (display: flex)           │
├──────────────┬──────────────────────┤
│              │                      │
│  SIDEBAR     │   MAIN CONTENT       │
│  (240px)     │   (flex: 1)          │
│              │                      │
│ - Logo       │ ┌──────────────────┐ │
│ - Project    │ │ <Outlet /> page  │ │
│   selector   │ │                  │ │
│ - Nav items  │ │ (Dashboard, etc) │ │
│ - Sources    │ └──────────────────┘ │
│ - Settings   │                      │
│              │ ┌──────────────────┐ │
│              │ │ MultiLogPanel    │ │
│              │ │ (tabbed logs)    │ │
│              │ └──────────────────┘ │
└──────────────┴──────────────────────┘
```

### Sidebar Components:
- Logo section with mascot image
- ProjectSelector (dropdown)
- Navigation (NavLinks with active state)
- Sources section with connection status dots
- Settings footer

### Main Area:
- `<Outlet />` for page content
- MultiLogPanel below for logs

---

## 10. Design Patterns Used

### 1. **Inline CSS-in-JS**
```tsx
const styles: Record<string, React.CSSProperties> = {
  container: { ... },
  header: { ... },
};
export function Component() {
  return <div style={styles.container}>...</div>;
}
```

### 2. **Memoization for Performance**
```tsx
const filteredSessions = useMemo(
  () => filterSessions(sessions),
  [sessions, filterSessions]
);

const handleClick = useCallback(() => {
  setSelectedSession(session);
}, []);
```

### 3. **Typed Props Interfaces**
```tsx
interface SessionCardProps {
  session: Session;
  isFocused: boolean;
  badges?: SessionBadges;
  onClick?: () => void;
}
```

### 4. **Real-time Updates via WebSocket**
```tsx
const { sessions } = useJacquesClient(); // Auto-updates when server broadcasts

useEffect(() => {
  // Refresh when sessions change
}, [sessions]);
```

### 5. **URL-based Navigation**
```tsx
<NavLink to="/" style={styles.navLink}>Dashboard</NavLink>
<Outlet /> // Child route renders here
```

### 6. **Error Handling**
```tsx
try {
  const data = await fetchData();
} catch (error) {
  setError((error as Error).message);
  // Show error state in UI
}
```

---

## 11. Key Patterns for Project Dashboard

For a **Project Dashboard** view that fits this codebase, follow these patterns:

### Component Structure:
```tsx
export function ProjectDashboard() {
  // 1. Get WebSocket state
  const { sessions, connected } = useJacquesClient();
  
  // 2. Get project context
  const { selectedProject } = useProjectScope();
  
  // 3. Local component state
  const [selectedView, setSelectedView] = useState('overview');
  
  // 4. Fetch async data
  useEffect(() => {
    async function loadProjectData() {
      // Use API client from gui/src/api
    }
    loadProjectData();
  }, [selectedProject]);
  
  // 5. Render with consistent styling
  return (
    <div style={styles.container}>
      <div style={styles.header}>...</div>
      <div style={styles.grid}>
        {/* Cards, charts, etc. */}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1200px' },
  header: { marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' },
};
```

### Color Usage:
- Primary accent for CTAs: `colors.accent` (#E67E52)
- Card backgrounds: `colors.bgSecondary`
- Section dividers: `colors.borderSubtle`
- Text: `colors.textPrimary` (headings), `colors.textSecondary` (labels), `colors.textMuted` (hints)
- Success/warning/error: semantic colors

### Spacing:
- Section margins: `24px`
- Component gaps: `16px`, `8px`, `4px`
- Padding inside cards: `16px` to `24px`

### Typography:
- Page titles: `fontSize: '24px', fontWeight: 600`
- Section titles: `fontSize: '16px', fontWeight: 500`
- Body text: `fontSize: '14px'`
- Labels: `fontSize: '12px' or '13px'`

---

## 12. Testing Approach

- **Framework**: Vitest (configured in `gui/package.json`)
- **Component testing**: React components with inline styles (no CSS selectors to test)
- **Integration testing**: Mock the `useJacquesClient()` hook
- **No E2E yet**: Focus on unit/integration tests

---

## Summary

The Jacques GUI follows a **clean, data-driven architecture** optimized for:
- **Real-time updates** via WebSocket
- **Project-scoped filtering** via context
- **Inline styling** (no CSS framework complexity)
- **Type safety** with full TypeScript
- **Reusable components** with clear prop interfaces
- **Responsive grid layouts** with flexbox

For the **Project Dashboard**, create a new page component that:
1. Uses `useJacquesClient()` for live session data
2. Uses `useProjectScope()` to filter by selected project
3. Fetches project-level statistics via the API client
4. Organizes data into grid/card layouts
5. Uses the centralized color palette and typography
6. Follows the memoization and error-handling patterns

This will ensure seamless integration with the existing codebase!