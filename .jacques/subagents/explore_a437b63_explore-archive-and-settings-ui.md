# Explore: Explore archive and settings UI

> Session: `dea2f256-f9e8-44c8-8419-5c7983e29457`
> Date: 2026-02-01
> Tokens: ~79 066

---

Excellent! Now I have a comprehensive understanding of the codebase. Let me compile a detailed report for the user.

## Jacques Codebase Exploration Report

Based on my thorough exploration of the Jacques codebase, here's a complete breakdown of the four areas you requested:

---

### 1. Settings UI Implementation

**Location**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/SettingsView.tsx`

**Structure**:
- **Component**: `SettingsView` - displays and manages archive settings with Claude connection
- **Settings items** (5 total):
  - Index 0: Claude Code Connection (token input/status)
  - Index 1-3: Archive Filter Options (Everything, Without Tools, Messages Only)
  - Index 4: Auto-Archive Toggle

**Key Features**:
- Two layout modes (horizontal for wide terminals, vertical for narrow)
- Archive filter selection with radio buttons
- Auto-archive toggle (checkbox style)
- Archive statistics display (conversation count, projects, size, location)
- Claude token connection/disconnection with verification
- Success message display on successful connection
- Scroll support for settings items

**Configuration Storage**:
- File: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/utils/settings.ts`
- Claude settings: `~/.claude/settings.json` (auto-compact toggle)
- Jacques config: `~/.jacques/config.json` (archive filter, auto-archive, sources)

**Key Functions**:
```typescript
- getArchiveSettings() / setArchiveSettings()
- getArchiveFilter() / setArchiveFilter()
- toggleAutoArchive()
- getAutoCompactEnabled() / setAutoCompact()
- isClaudeConnected() / saveClaudeToken() / verifyToken()
```

---

### 2. Archive System in `core/src/archive/`

**Core Module Structure**:

**File**: `types.ts` (107 lines)
- Defines `ConversationManifest` (~1-2KB per conversation)
- Defines `SearchIndex` with inverted keyword mapping
- Defines `SearchResult` and `SearchOutput` for search responses
- Defines `ArchiveSettings` with filter and auto-archive options

**File**: `archive-store.ts` (786 lines) - Main file I/O orchestration
```
Directory structure:
~/.jacques/archive/
├── index.json              # Global search index (keywords → manifests)
├── manifests/[id].json     # Lightweight conversation metadata
├── conversations/[project]/[filename].json  # Full content
└── plans/[project]/[filename].md   # Plan files

Local project (.jacques/):
.jacques/
├── sessions/index.json     # Project-level session index
├── sessions/[filename].json # Local copy of conversations
├── plans/[filename].md     # Local plan copies
└── context/                # LoadContext imported files
```

**Key Functions**:
```typescript
// Path helpers
- getGlobalArchivePath() / getGlobalIndexPath()
- getManifestPath(id) / getConversationPath(projectSlug, id)
- getLocalArchivePath(projectPath) / getLocalIndexPath(projectPath)

// Index operations
- readGlobalIndex() / writeGlobalIndex(index)
- readLocalIndex(projectPath) / writeLocalIndex(projectPath, index)

// Manifest operations
- saveManifest(manifest) / readManifest(id)
- listManifests()

// Conversation operations
- saveConversation(conversation, manifest) / readConversation(projectSlug, id)

// Plan operations
- archivePlan(planPath, options)
- isPlanArchived(projectSlug, planName)

// Full flow
- archiveConversation(conversation, manifest, options)
  → Saves manifest, conversation, archives plans, updates index

// Search
- searchConversations(input: SearchInput): Promise<SearchOutput>

// Statistics
- getArchiveStats(): Promise<{totalConversations, totalProjects, sizeFormatted}>
```

**File**: `manifest-extractor.ts` (80+ lines)
- Extracts `ConversationManifest` from JSONL session files
- Technology detection (40+ tech patterns: typescript, react, postgres, etc.)
- Plan reference extraction
- User question and file modification tracking

**File**: `plan-extractor.ts`
- Detects embedded plans in user messages
- Deduplication using SHA-256 hashing + Jaccard similarity
- Bidirectional linking to sessions

**File**: `search-indexer.ts`
- Inverted index implementation
- Tokenization and keyword extraction
- Field-based scoring (title, question, file, tech)

---

### 3. Dashboard Components for Conversation Display

**Main Router Component**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/App.tsx`
- Manages all view states and routing
- Handles keyboard input for navigation across views
- Coordinates save/load/settings/handoff flows

**Dashboard View Type** (`Dashboard.tsx`):
```typescript
type DashboardView =
  | "main"           # Main menu
  | "save"           # Save context (with preview and label input)
  | "load"           # Load context menu
  | "load-sources"   # Source selection (Obsidian, Google Docs, Notion)
  | "obsidian-config" / "obsidian-browser"
  | "google-docs-browser"
  | "notion-browser"
  | "add-context-confirm"
  | "settings"       # Archive filter, auto-archive, Claude connection
  | "sessions"       # Active sessions list
  | "handoff-browser" # Browse handoff files
  | "llm-working"    # LLM operation progress
```

**Browser/Viewer Components** (reusable patterns):

1. **ObsidianBrowserView.tsx**
   - Tree-based file browser with expand/collapse
   - Shows vault files with sizes and relative paths
   - Scroll support (VISIBLE_ITEMS constant for viewport)
   - File selection triggers AddContextConfirmView

2. **HandoffBrowserView.tsx**
   - Browse `.jacques/handoffs/` directory
   - Shows timestamp, title, token count
   - Selection copies handoff to clipboard
   - Scroll indicators (▲ more above / ▼ more below)

3. **GoogleDocsBrowserView.tsx** / **NotionBrowserView.tsx**
   - Similar folder/file browser pattern
   - Collapse/expand folders
   - Export/fetch content on file selection

**Reusable Component Patterns**:
- Fixed content height (10 rows visible)
- Horizontal/vertical layout responsive design
- Soft coral accent color (#E67E52) and muted text (#8B9296)
- Border colors with title and controls
- Scroll offset state for managing long lists
- Visible items constant for viewport clipping

---

### 4. Catalog/Indexing System

**Project Index** (`core/src/context/indexer.ts` - unified `.jacques/index.json`):
```typescript
// Unified project index structure
{
  "version": "1.0.0",
  "files": [
    {
      "id": "auth-flow-abc123",
      "name": "Authentication Flow",
      "path": ".jacques/context/auth-flow.md",
      "source": "obsidian",
      "sourceFile": "/vault/Auth Flow.md",
      "description": "OAuth implementation notes"
    }
  ],
  "sessions": [
    {
      "id": "session-uuid",
      "title": "Session title",
      "filename": "2026-01-31_14-30_title-slug_8d84.json",
      "path": "sessions/2026-01-31_14-30_title-slug_8d84.json",
      "savedAt": "2026-01-31T14:30:00Z",
      "startedAt": "2026-01-31T14:20:00Z",
      "endedAt": "2026-01-31T14:30:00Z",
      "durationMinutes": 10,
      "messageCount": 15,
      "toolCallCount": 8,
      "technologies": ["typescript", "react"],
      "userLabel": "optional label"
    }
  ],
  "plans": [
    {
      "id": "plan-slug-abc123",
      "title": "Implementation Plan",
      "filename": "2026-01-31_plan-title.md",
      "path": "plans/2026-01-31_plan-title.md",
      "createdAt": "2026-01-31T14:30:00Z",
      "updatedAt": "2026-01-31T14:30:00Z",
      "sessions": ["session-id-1", "session-id-2"]
    }
  ]
}
```

**Global Search Index** (`~/.jacques/archive/index.json`):
```typescript
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-31T14:30:00Z",
  "keywords": {
    "authentication": [
      { "id": "manifest-id-1", "score": 1.5, "field": "title" },
      { "id": "manifest-id-2", "score": 1.0, "field": "question" }
    ]
  },
  "projects": {
    "jacques-context-manager": {
      "path": "/Users/gole/Desktop/jacques-context-manager",
      "conversationCount": 5,
      "lastActivity": "2026-01-31T14:30:00Z"
    }
  },
  "metadata": {
    "totalConversations": 42,
    "totalKeywords": 250
  }
}
```

**Indexer Functions** (`core/src/context/indexer.ts`):
```typescript
- readProjectIndex(projectPath)
- writeProjectIndex(projectPath, index)
- addSessionToIndex(projectPath, sessionEntry)
- addContextToIndex(projectPath, contextEntry)
- addPlanToIndex(projectPath, planEntry)
```

**Manifest Extraction** for search indexing:
- Extracts title (Claude's summary or first user message)
- Collects user questions (truncated to 200 chars each)
- Identifies files modified (from Write/Edit tool calls)
- Detects technologies (40+ patterns: typescript, react, postgres, docker, etc.)
- Tracks plans created (embedded and from Write tools)
- Captures tool usage and message counts

**Search Execution Flow**:
1. User runs `jacques search "keyword"`
2. `searchConversations(input: SearchInput)` is called
3. Searches inverted index in `~/.jacques/archive/index.json`
4. Loads matching manifests from `~/.jacques/archive/manifests/`
5. Applies filters (project, date range, technologies)
6. Returns top 10 results (configurable limit, max 50)

---

### Key Architectural Patterns

**1. View Management**:
- App.tsx acts as state container for all views
- Dashboard.tsx renders based on currentView prop
- Keyboard input handling centralized in App.tsx
- Each view has dedicated scroll state and selection index

**2. Settings Architecture**:
- Dual config files: `~/.claude/settings.json` (Claude Code) and `~/.jacques/config.json` (Jacques)
- Settings utility provides getter/setter functions
- Archive settings include filter type and auto-archive toggle

**3. Archive Design**:
- Three-tier storage: global index → manifests → conversations
- Readable filenames: `YYYY-MM-DD_HH-MM_title-slug_id.json`
- Local project cache in `.jacques/` for quick access
- Inverted keyword index for fast search

**4. Component Patterns**:
- Fixed viewport height (10 rows) with scroll offset state
- Responsive layouts (≥60 chars: horizontal; <60: vertical)
- Tree browsers with expand/collapse support
- Selection index with scroll clamping
- Scroll indicators on first/last visible item

---

### File Paths Summary

**Settings**:
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/SettingsView.tsx`
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/utils/settings.ts`

**Archive System**:
- `/Users/gole/Desktop/jacques-context-manager/core/src/archive/archive-store.ts`
- `/Users/gole/Desktop/jacques-context-manager/core/src/archive/types.ts`
- `/Users/gole/Desktop/jacques-context-manager/core/src/archive/manifest-extractor.ts`
- `/Users/gole/Desktop/jacques-context-manager/core/src/archive/search-indexer.ts`
- `/Users/gole/Desktop/jacques-context-manager/core/src/archive/plan-extractor.ts`

**Dashboard Components**:
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/App.tsx` (main router)
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/Dashboard.tsx` (view renderer)
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/HandoffBrowserView.tsx`
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ObsidianBrowserView.tsx`
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/GoogleDocsBrowserView.tsx`
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/NotionBrowserView.tsx`

**Indexing**:
- `/Users/gole/Desktop/jacques-context-manager/core/src/context/indexer.ts` (project index)
- `/Users/gole/Desktop/jacques-context-manager/core/src/archive/archive-store.ts` (global index)