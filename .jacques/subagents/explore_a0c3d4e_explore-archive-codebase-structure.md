# Explore: Explore archive codebase structure

> Session: `1cb8c55b-432d-4870-8a0a-7c9147f9b8ba`
> Date: 2026-02-01
> Tokens: ~73 228

---

Perfect! I now have enough information to provide a comprehensive exploration report. Let me compile the findings:

## Comprehensive Jacques Codebase Architecture Exploration

Based on my thorough exploration of the jacques-context-manager codebase, here's a detailed breakdown of the structure and patterns you need to understand before implementing the Archive Browser feature:

---

## 1. Core Archive System (`core/src/archive/`)

### **archive-store.ts** (786 lines)
This is the central persistence layer with comprehensive file I/O operations:

**Key Functions:**
- **Path Helpers**: `getGlobalArchivePath()`, `getManifestPath()`, `getConversationPath()`, `getPlanPath()`, `getLocalIndexPath()`
- **Directory Setup**: `ensureGlobalArchive()`, `ensureLocalArchive()`
- **Index Operations**: `readGlobalIndex()`, `writeGlobalIndex()`, `readLocalIndex()`, `writeLocalIndex()`
- **Manifest Operations**: `saveManifest()`, `readManifest()`, `listManifests()`
- **Conversation Operations**: `saveConversation()`, `readConversation()`
- **Plan Operations**: `archivePlan()`, `isPlanArchived()`
- **Search**: `searchConversations()` - main search interface
- **Statistics**: `getArchiveStats()` - returns conversations/projects/size
- **Full Flow**: `archiveConversation()` - orchestrates all saving

**Directory Structure:**
```
~/.jacques/archive/
├── index.json              # Inverted keyword index
├── manifests/[id].json     # Session metadata (~1-2KB each)
├── conversations/[project]/[id].json  # Full conversation JSONL
├── plans/[project]/[name].md  # Archived plan files
└── context/                # External context files
```

**Notable Patterns:**
- Readable filenames: `YYYY-MM-DD_HH-MM_title-slug_id.json`
- Auto-registration: Sessions created if context_update arrives before session_start
- Plan deduplication: SHA-256 hash + Jaccard similarity (90% threshold)
- Bidirectional session-plan linking

---

### **types.ts** (206 lines)
Complete type definitions for the archive system:

**Key Types:**
```typescript
interface ConversationManifest {
  id: string;
  projectSlug: string;
  projectPath: string;
  title: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  userQuestions: string[];        // All user messages (truncated)
  filesModified: string[];
  toolsUsed: string[];
  technologies: string[];
  plans: PlanReference[];
  messageCount: number;
  toolCallCount: number;
  userLabel?: string;
}

interface PlanReference {
  path: string;
  name: string;
  archivedPath: string;
  source: "embedded" | "write";   // Where plan came from
}

interface SearchInput {
  query: string;
  project?: string;
  dateFrom?: string;
  dateTo?: string;
  technologies?: string[];
  limit?: number;
  offset?: number;
}

interface SearchResult {
  rank: number;
  id: string;
  score: number;
  title: string;
  project: string;
  date: string;
  preview: string;              // First user question
  filesModified: string[];      // Top 5
  technologies: string[];
  messageCount: number;
  durationMinutes: number;
}

interface ArchiveSettings {
  filter: "everything" | "without_tools" | "messages_only";
  autoArchive: boolean;
}
```

---

### **search-indexer.ts** (344 lines)
Inverted index for keyword-based search:

**Key Functions:**
- `tokenize(text)` - Remove stop words, filter by length (2-50 chars)
- `extractPathKeywords(filePath)` - Split on `/\-_.` delimiters
- `extractKeywordsWithFields(manifest)` - Return keywords with source attribution
- `addToIndex(index, manifest)` - Update inverted index
- `searchIndex(index, query)` - Return sorted results by relevance score
- `getIndexStats(index)` - Get index metadata

**Scoring Weights:**
- title: 2.0
- question: 1.5
- file: 1.0
- tech: 1.0
- snippet: 0.5

**Stop Words:** 100+ common words excluded to improve signal-to-noise ratio

---

### **manifest-extractor.ts** (200+ lines)
Extracts manifests from JSONL session files:

**Key Functions:**
- `extractManifest(jsonlPath, projectPath)` - Full extraction pipeline
- `extractManifestFromEntries(entries, projectPath)` - From parsed entries
- `detectPlans(entries)` - Find plans from Write tool calls
- `getPlansDirectory()` - Read from Claude Code settings.json

**Technology Detection:**
74 regex patterns detect tech stack from filenames and content:
- Languages: typescript, javascript, python, rust, go, java, cpp, csharp, ruby, php, swift, kotlin
- Frameworks: react, vue, angular, svelte, nextjs, nuxt, express, fastapi, django, flask, rails, spring
- Databases: postgres, mysql, mongodb, redis, sqlite, prisma
- Tools: docker, kubernetes, aws, gcp, azure, graphql, rest, websocket, jest, pytest, ink, tailwind
- Build: webpack, vite, esbuild, rollup

---

### **plan-extractor.ts** (433 lines)
Detects and deduplicates embedded plans from user messages:

**Key Functions:**
- `detectEmbeddedPlans(entries)` - Find trigger patterns ("Implement the following plan:")
- `extractEmbeddedPlans(entries, projectPath, sessionId)` - Full extraction with deduplication
- `findDuplicatePlan(content, projectPath)` - Content-based duplicate detection
- `extractPlanTitle(content)` - Extract first # heading
- `generatePlanFingerprint(content)` - SHA-256 hash for deduplication
- `calculateSimilarity(fingerprint1, fingerprint2)` - Jaccard similarity score
- `indexEmbeddedPlan(projectPath, plan)` - Update unified index
- `splitMultiplePlans(content)` - Split multiple plans by markdown headings

**Deduplication Logic:**
- Content must be ≥100 chars AFTER trigger phrase removal
- Jaccard similarity threshold: 90% (for very similar plans)
- Stored in `.jacques/plans/` with readable filenames

---

## 2. Context Management (`core/src/context/`)

### **types.ts** (119 lines)
Unified project knowledge index:

```typescript
interface ProjectIndex {
  version: string;
  updatedAt: string;
  context: ContextFile[];        // External files (Obsidian, Google Docs, etc.)
  sessions: SessionEntry[];      // Saved conversations
  plans: PlanEntry[];            // Implementation plans
}

interface SessionEntry {
  id: string;
  title: string;
  filename: string;
  path: string;                  // Relative path like "sessions/YYYY-MM-DD_HH-MM_..."
  savedAt: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  messageCount: number;
  toolCallCount: number;
  technologies: string[];
  userLabel?: string;
}

interface PlanEntry {
  id: string;
  title: string;
  filename: string;
  path: string;                  // Relative path like "plans/YYYY-MM-DD_..."
  createdAt: string;
  updatedAt: string;
  sessions: string[];            // Session IDs that used this plan
}

interface ContextFile {
  id: string;
  name: string;
  path: string;                  // .jacques/context/...
  source: "obsidian" | "google_docs" | "notion" | "local";
  sourceFile: string;
  addedAt: string;
  description?: string;
  sizeBytes: number;
  tags?: string[];
}
```

**File Location:** `.jacques/index.json` (per-project unified index)

---

### **indexer.ts** (150+ lines)
Read/write unified project index:

**Key Functions:**
- `readProjectIndex(cwd)` - Load with automatic legacy format migration
- `writeProjectIndex(cwd, index)` - Save with timestamp update
- `addSessionToIndex(cwd, session)` - Add/update session entry (auto-sorted by date)
- `addPlanToIndex(cwd, plan)` - Add/update plan entry
- `addContextToIndex(cwd, file)` - Add context file
- `removeContextFromIndex(cwd, fileId)` - Remove context file

**Legacy Compatibility:**
- Auto-migrates files-only format (legacy) to new ProjectIndex format
- Ensures backward compatibility with existing projects

---

## 3. Dashboard Components (`dashboard/src/components/`)

### **App.tsx** (61KB - 7263 lines)
Root component with comprehensive state management:

**Key Patterns:**
- **Menu Navigation**: Keyboard-driven state machine with multiple views
- **View Types**: `"main" | "save" | "load" | "settings" | "sessions" | "handoff-browser" | "llm-working"`
- **Responsive Layout**: Detects terminal width, switches between horizontal/vertical layouts
- **State Management**: Props-based approach with parent controlling everything
- **Keyboard Handlers**: `useInput` hook for arrow keys, Enter, Esc, Space
- **WebSocket Client**: Real-time session updates via `useJacquesClient`

**Color Scheme (Soft Coral):**
```
BORDER_COLOR = "#E67E52"       // Jacques mascot color
ACCENT_COLOR = "#E67E52"
MUTED_TEXT = "#8B9296"
MASCOT_WIDTH = 14              // Actual pixel width
MIN_CONTENT_WIDTH = 42
FIXED_CONTENT_HEIGHT = 10      // Consistent box height
HORIZONTAL_LAYOUT_MIN_WIDTH = 62
```

---

### **SettingsView.tsx** (442 lines)
Settings UI with archive configuration:

**Key Features:**
- Archive filter selection (Everything, Without Tools, Messages Only)
- Auto-archive toggle
- Archive statistics display
- Claude Code connection status and token management
- Two layouts: Horizontal (≥62 chars) and Vertical (<62 chars)
- Fixed content height with scroll indicators (▲/▼)

**Settings Items (Navigation Index):**
- Index 0: Claude Connection
- Indices 1-3: Filter options
- Index 4: Auto-archive toggle

**Props Structure:**
```typescript
interface SettingsViewProps {
  terminalWidth: number;
  selectedIndex: number;
  filterType: ArchiveFilterType;
  autoArchive: boolean;
  stats: ArchiveStatsData | null;
  loading?: boolean;
  scrollOffset?: number;
  // Claude Connection props...
  claudeConnected?: boolean;
  claudeTokenMasked?: string | null;
  claudeTokenInput?: string;
  claudeTokenError?: string | null;
  isTokenInputMode?: boolean;
  isTokenVerifying?: boolean;
  showConnectionSuccess?: boolean;
}
```

---

### **Dashboard.tsx** (39KB - massive component)
Main display with session list and progress tracking:

**Layout Pattern:**
- **Horizontal Layout (≥62 chars):**
  - Left: Mascot (14 chars + 3 padding = 17 chars)
  - Right: Content (dynamic width)
  - Border: Soft coral (#E67E52)
  - Top/Bottom: Title bars with ─ dividers

- **Vertical Layout (<62 chars):**
  - Full width
  - Mascot centered
  - Title + content stacked

**Key Components:**
- Session progress bar with percentage
- Token count display
- Current activity indicator
- Scrollable session list with fixed height (10 rows)
- Bottom controls: `[Esc] Back`

---

### **Browser View Components** (ObsidianBrowserView, GoogleDocsBrowserView, NotionBrowserView)

**Common Pattern** (~200-250 lines each):
```typescript
interface BrowserViewProps {
  vaultName: string;
  items: FlatTreeItem[];
  selectedIndex: number;
  scrollOffset: number;
  terminalWidth: number;
  loading?: boolean;
  error?: string | null;
}

const VISIBLE_ITEMS = 6;  // Fixed visible items (reserve lines for header/footer)
```

**Rendering:**
- Title with "▲ more" indicator if can scroll up
- Separator line with "─" characters
- Loading/Error/Empty states
- Indented file list with icons (▼ for expanded folders, ▶ for collapsed)
- File size display (formatted with KB/MB)
- "▼ N more" indicator if can scroll down
- Fixed height for consistency

---

## 4. Server HTTP API (`server/src/http-api.ts`)

### Key Endpoints

**GET /api/sources/status**
```json
{
  "obsidian": { "connected": boolean, "detail": string },
  "googleDocs": { "connected": boolean, "detail": string },
  "notion": { "connected": boolean, "detail": string }
}
```

**POST /api/sources/google** - Configure Google Docs
**DELETE /api/sources/google** - Disconnect Google Docs
**POST /api/sources/notion** - Configure Notion
**DELETE /api/sources/notion** - Disconnect Notion

**Static File Serving:**
- Serves GUI from `gui/dist/`
- SPA fallback: Non-API routes serve `index.html`
- MIME type detection for assets

---

## 5. GUI Web Interface (`gui/src/`)

### **pages/Archive.tsx** (Current - placeholder)
```typescript
// Stub implementation - shows "Archive search coming soon"
// Has search input but no functionality
```

### **api/config.ts** (114 lines)
HTTP client for browser-based API calls:
```typescript
const API_URL = import.meta.env.DEV 
  ? 'http://localhost:4243/api' 
  : '/api';

export async function getSourcesStatus(): Promise<SourcesStatus>
export async function configureGoogleDocs(config: GoogleDocsConfig): Promise<void>
export async function disconnectGoogleDocs(): Promise<void>
export async function configureNotion(config: NotionConfig): Promise<void>
export async function disconnectNotion(): Promise<void>
```

### **types.ts** (154 lines)
Browser-compatible type definitions (duplicated from @jacques/core):
```typescript
interface SavedConversation {
  id: string;
  title: string;
  project: string;
  date: string;
  messages: ConversationMessage[];
  metadata: {
    messageCount: number;
    toolCallCount: number;
    estimatedTokens: number;
    technologies?: string[];
    filesModified?: string[];
  };
}
```

---

## 6. Key Architectural Patterns

### **Pattern 1: Inverted Index Search**
- Keywords → [Manifest References]
- Frequency-based scoring with field-specific weights
- Fast filtering without loading manifests
- Manifests loaded only for scoring/display

### **Pattern 2: Unified Project Index**
- Single source of truth: `.jacques/index.json`
- Three independent arrays: context, sessions, plans
- Bidirectional linking: Plans ↔ Sessions via session IDs

### **Pattern 3: Readable Filenames**
- Conversations: `2026-01-31_14-30_jwt-auth-setup_8d84.json`
- Plans: `2026-01-31_authentication-flow.md`
- Benefits: Browseable, debuggable, searchable

### **Pattern 4: Layout Responsiveness**
- Terminal width determines:
  - ≥62 chars: Horizontal with mascot
  - <62 chars: Vertical without mascot
  - ≥70 chars: Show version number
- Fixed content height: 10 rows (with scroll indicators)
- Scroll indicators: ▲ (more above), ▼ (more below)

### **Pattern 5: Component State Management**
- Parent (App.tsx) owns all state
- Components receive props and emit events via callbacks
- Keyboard handlers in parent coordinate navigation
- Views determined by string literal union types

### **Pattern 6: Settings Persistence**
- Global: `~/.jacques/config.json` (sources, archive settings)
- Per-project: `.jacques/index.json` (sessions, plans, context)
- HTTP API updates config on server; GUI reads via /api/sources/status

---

## 7. Data Flow for Archive Search

```
User Query
  ↓
App.tsx handles keyboard input
  ↓
searchConversations(SearchInput)  [archive-store.ts]
  ↓
readGlobalIndex()
  ↓
searchIndex(index, query)  [search-indexer.ts]
  ↓
Filter results by project/date/tech
  ↓
Load manifests for filtered results
  ↓
Return SearchOutput with results array
  ↓
Dashboard displays results in scrollable list
  ↓
User can select to view full conversation
```

---

## 8. File Size and Complexity

**Total Dashboard Components:** 7,263 lines
- **App.tsx:** 61KB (main orchestrator)
- **Dashboard.tsx:** 39KB (main display)
- **SettingsView.tsx:** 442 lines
- **Browser Views:** ~200-250 lines each

**Core Archive Module:** ~1,800 lines
- archive-store.ts: 786 lines
- search-indexer.ts: 344 lines
- manifest-extractor.ts: 200+ lines
- plan-extractor.ts: 433 lines
- types.ts: 206 lines

---

## 9. Essential Patterns for Archive Browser Implementation

### When implementing the Archive Browser feature, follow these patterns:

1. **Use SearchInput/SearchOutput types** - Consistent interface
2. **Respect the fixed height layout** - 10 rows for browser content
3. **Implement scroll indicators** - ▲/▼ for out-of-view items
4. **Use the color scheme** - BORDER_COLOR, ACCENT_COLOR, MUTED_TEXT
5. **Add keyboard navigation** - Arrow keys, Enter, Esc in App.tsx
6. **Maintain responsive layout** - Horizontal (≥62 chars) vs Vertical (<62 chars)
7. **Follow the view types pattern** - Add "archive-browser" to DashboardView union
8. **Use the props-based state** - All state in App.tsx, components receive props
9. **Integrate with HTTP API** - Browser version uses /api endpoints
10. **Respect the manifest caching** - Don't load full conversations unnecessarily

---

This comprehensive architecture ensures consistency, maintainability, and a professional user experience across both the TUI dashboard and web GUI for the Archive Browser feature.