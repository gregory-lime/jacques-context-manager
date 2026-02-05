# Explore: Explore GUI project grouping

> Session: `77d3dc6b-a84d-4db0-8d39-6031292c9f61`
> Date: 2026-02-04
> Tokens: ~81 434

---

Excellent! Now let me compile a comprehensive report of my findings:

## Analysis: Jacques GUI Architecture & Data Flow

Based on my thorough exploration of the codebase, here's how the Jacques system handles GUI components, projects, and sessions:

### 1. **PROJECT GROUPING & LISTING**

#### Current Implementation:
- **ProjectSelector Component** (`/Users/gole/Desktop/jacques-dashboards-smaller-design/gui/src/components/ProjectSelector.tsx`):
  - Groups sessions by `session.project` field (string)
  - Derives active projects from live sessions with session count per project
  - Accepts `archivedProjects` array for projects with saved conversations but no active sessions
  - Sorts active projects by `last_activity` (most recent first)
  - Sorts archived projects alphabetically
  - Shows activity status: `●` (active/live), `○` (archived/no sessions)

- **useProjectScope Hook** (`/Users/gole/Desktop/jacques-dashboards-smaller-design/gui/src/hooks/useProjectScope.tsx`):
  - Maintains `selectedProject` state (null = "All Projects")
  - Provides `filterSessions()` function to filter sessions by project
  - Broadcasts `archivedProjects` list for projects without active sessions

- **Data structure**:
  ```typescript
  interface ProjectInfo {
    name: string;                    // Project identifier
    sessionCount: number;            // Live + saved sessions
    isActive: boolean;               // Has running sessions
    lastActivity?: number;           // Timestamp of most recent activity
  }
  ```

### 2. **SESSION LISTING & DISPLAY**

#### Live Sessions (from WebSocket):
- **useJacquesClient Hook** (`/Users/gole/Desktop/jacques-dashboards-smaller-design/gui/src/hooks/useJacquesClient.ts`):
  - Connects to WebSocket on `ws://localhost:4242`
  - Receives `initial_state` with all live sessions
  - Listens for `session_update`, `session_removed`, `focus_changed` events
  - Sessions are sorted by `last_activity` (descending)

#### Saved Sessions (from HTTP REST API):
- **Dashboard Component** loads saved sessions via:
  ```typescript
  const data = await listSessionsByProject();
  // Returns: { projects: Record<string, SessionEntry[]> }
  ```
  
- **SessionEntry structure**:
  ```typescript
  interface SessionEntry {
    id: string;
    title: string;
    projectSlug: string;
    startedAt: string;
    endedAt: string;
    tokens?: { input: number; output: number; cacheRead: number };
    planCount?: number;
    exploreAgents?: Array<{ id: string; description: string; tokenCost?: number }>;
    webSearches?: Array<{ query: string; resultCount?: number }>;
    subagentIds?: string[];
    planRefs?: Array<{ title: string; source: 'embedded' | 'write' | 'agent' }>;
    mode?: 'planning' | 'execution';
  }
  ```

#### Session Display Components:
- **SessionCard** (`/Users/gole/Desktop/jacques-dashboards-smaller-design/gui/src/components/SessionCard.tsx`):
  - Shows active sessions in a card grid
  - Displays context meter, model name, status dot (working/active/idle)
  - Shows badges for plans, agents, files modified
  - Truncates titles at 60 chars with "..."

- **Session History List** (in Dashboard):
  - Combines live + saved sessions (deduped by id)
  - Sorted by date (most recent first)
  - Displays status indicator (●/○ for live vs saved)
  - Shows context percentage, token counts, plan/agent badges

### 3. **DATA FLOW: Server → GUI**

#### Three-Layer Architecture:

```
┌─────────────────────────────────────────────────────────┐
│ Real-Time Data (WebSocket, Port 4242)                   │
│                                                         │
│ BrowserJacquesClient connects to ws://localhost:4242    │
│ Receives: initial_state, session_update, session_removed│
│ Auto-reconnects with exponential backoff (max 30s)      │
│                                                         │
│ → Live Sessions only                                    │
│ → For active Claude Code sessions                       │
└─────────────────────────────────────────────────────────┘
         ↑                                ↓
    useJacquesClient()              Session state updates
         ↑                                ↓
    Dashboard Component          Real-time context %
    SessionCard Component        Activity tracking
         
┌─────────────────────────────────────────────────────────┐
│ REST API (HTTP, Port 4243)                              │
│                                                         │
│ GET /api/sessions/by-project                            │
│   → Lists saved sessions grouped by project             │
│   → Reads from ~/.jacques/archive/                      │
│   → Returns SessionEntry[] with metadata                │
│                                                         │
│ GET /api/sessions/:id                                   │
│   → Full JSONL parsing (entries, stats, subagents)      │
│   → Used by conversation viewer                         │
│                                                         │
│ GET /api/sessions/:id/badges                            │
│   → Plan count, agent types, file count, web searches   │
│   → Displayed on SessionCard                            │
│                                                         │
│ → Saved & Archived Sessions                             │
│ → Static/archived conversation data                     │
│ → Session history and plans                             │
└─────────────────────────────────────────────────────────┘
         ↑                                ↓
    API Config (config.ts)          Session history
    fetch(API_URL + route)          Plans/subagents
         ↑                                ↓
    Dashboard.tsx                   Conversation viewer
    Conversations.tsx               Plans display
    Archive.tsx                     Search functionality
```

### 4. **HTTP API ENDPOINTS FOR SESSIONS**

All routes in `/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts` (lines 461-654):

**Listing & Metadata:**
- `GET /api/sessions` - All sessions from lightweight index
- `GET /api/sessions/by-project` - Sessions grouped by project
- `GET /api/sessions/stats` - Index statistics (session count, cache size)
- `POST /api/sessions/rebuild` - Force rebuild index (SSE streaming)

**Single Session:**
- `GET /api/sessions/:id` - Full session data (entries, stats, subagents)
- `GET /api/sessions/:id/badges` - Badge data (plans, agents, files, web searches)
- `GET /api/sessions/:id/subagents/:agentId` - Subagent conversation
- `GET /api/sessions/:id/web-searches` - Web search entries with URLs
- `GET /api/sessions/:id/plans/:messageIndex` - Plan content from message

**Return Types:**
```typescript
// Session metadata (index-based, fast/cached)
interface CacheSessionEntry {
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
  fileSizeBytes: number;
  modifiedAt: string;
  planRefs?: PlanReference[];
  subagentIds?: string[];
  planCount?: number;
  hadAutoCompact?: boolean;
}

// Full session with entries
interface SessionData {
  metadata: CacheSessionEntry;
  entries: ParsedEntry[];
  statistics: EntryStatistics;
  subagents: Array<{ id: string; sessionId: string }>;
  awaitingFirstResponse?: boolean;
}

// Session badges for display
interface SessionBadges {
  planCount: number;
  agentCount: number;
  agentTypes: { explore: number; plan: number; general: number };
  fileCount: number;
  mcpCount: number;
  webSearchCount: number;
  mode: 'planning' | 'execution' | null;
  hadAutoCompact: boolean;
}
```

### 5. **PROJECT FILTERING LOGIC**

**In Dashboard Component**:
1. Fetch all projects via `listSessionsByProject()` → `Record<projectSlug, SessionEntry[]>`
2. Get live sessions from WebSocket (filtered by `useProjectScope`)
3. Get saved sessions: 
   - If `selectedProject` is null: use all projects
   - If `selectedProject` is set: filter to `savedSessionsByProject[selectedProject]`

4. **Session Deduplication**: Live + saved sessions merged by ID, live takes precedence

**In ProjectSelector**:
1. Extract active projects from live sessions: `session.project` field
2. Combine with archived projects (from saved sessions)
3. Display as dropdown with counts and status indicators

### 6. **KEY IMPLEMENTATION DETAILS**

#### Project Field Source:
- Lives on `Session.project` (from real-time WebSocket)
- Used throughout for filtering and grouping
- Example values: "project-name", "my-claude-project", etc.

#### Session Identity:
- **Live**: `session_id` (from Claude Code)
- **Saved**: `id` (from archive index)
- Both can coexist if same session is live AND archived

#### Context Metrics:
- Real-time: From `context_metrics` on live `Session` object
- Static: From `tokens` field in saved `SessionEntry`

#### Components Hierarchy:
```
App
├── ProjectScopeProvider
│   ├── Dashboard (main view)
│   │   ├── ProjectSelector (dropdown)
│   │   ├── SessionCard[] (active grid)
│   │   ├── SessionList (history)
│   │   │   ├── Plan rows
│   │   │   ├── Subagent rows
│   │   │   └── Web search rows
│   │   └── ActiveSessionViewer (detail view)
│   └── Other pages (Archive, Context, etc.)
```

### 7. **IMPORTANT NOTES**

1. **Hybrid Architecture**: Live sessions (WebSocket) + saved sessions (REST) displayed together
2. **Project Grouping**: Simple string-based via `session.project` field - no database
3. **Caching Strategy**: Lightweight index (metadata) cached, full JSONL parsed on-demand
4. **Auto-Compact Bug**: Session tracks `hadAutoCompact` flag + `bug_threshold` of 78% despite settings
5. **Archived Project Discovery**: Comes from saved session archive, not stored separately
6. **Real-Time Updates**: Only live sessions update via WebSocket; saved sessions require page reload or manual API call

This architecture allows the GUI to display both active sessions (real-time) and historical conversations (from archive) seamlessly in a single interface grouped by project.