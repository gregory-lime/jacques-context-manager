# Explore: Explore dashboard architecture

> Session: `28a70977-a8f4-4e37-9059-2ccef9a41daf`
> Date: 2026-02-02
> Tokens: ~83 805

---

Perfect! Now I have a comprehensive understanding. Let me create a detailed report:

## Comprehensive Dashboard Architecture Overview

### 1. Component Architecture

The Jacques dashboard is built with **Ink (React for CLIs)** and follows a clear component hierarchy:

#### **Root Component: App.tsx**
- **Location**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/App.tsx`
- **Responsibility**: Main orchestrator managing all state and keyboard input
- **Key State Properties**:
  - `currentView`: Controls which view is rendered (main, save, load, settings, etc.)
  - `focusedSessionId`: Currently active session
  - `sessions`: Array of all active sessions
  - `connected`: WebSocket connection status
  - Menu selection, scroll offsets for all views
  - Modal/form state (save labels, filter selections, etc.)

#### **Dashboard Component: Dashboard.tsx**
- **Location**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/Dashboard.tsx`
- **Responsibility**: Renders the appropriate view based on `currentView`
- **Layout Modes**:
  - **Horizontal Layout** (≥62 chars width): Mascot + content with borders (responsive)
  - **Vertical Layout** (<62 chars width): Stacked layout without mascot borders
  - **Fixed Content Height**: 10 rows for consistent box size across terminal

#### **Key Supporting Components**:

| Component | Purpose |
|-----------|---------|
| `SessionsList.tsx` | Displays all active sessions with status icons (● = focused, 💤 = background) |
| `SessionDetails.tsx` | Shows detailed info for focused session (title, model, context %, auto-compact status, warnings) |
| `ProgressBar.tsx` | Visual progress bar for context usage (█ filled / ░ empty) with color coding |
| `Menu.tsx` | 5-button numbered menu (keys 1-5 for menu items) |
| `Header.tsx` | Title, version, connection status |
| `BottomControls.tsx` | Keyboard shortcut bar |

### 2. Data Structures

#### **Session Type** (from `/dashboard/src/types.ts`)
```typescript
interface Session {
  session_id: string;                          // UUID
  session_title: string | null;                // Auto-generated summary or first user message
  transcript_path: string | null;              // Path to JSONL file
  cwd: string;                                 // Current working directory
  project: string;                             // Project name
  model: ModelInfo | null;                     // { id, display_name }
  workspace: WorkspaceInfo | null;             // { current_dir, project_dir }
  terminal: TerminalIdentity | null;           // Terminal env vars (tty, term_program, etc.)
  terminal_key: string;                        // Unique identifier combining terminal env vars
  status: 'active' | 'working' | 'idle';      // Current status
  last_activity: number;                       // Unix timestamp
  registered_at: number;                       // Registration timestamp
  context_metrics: ContextMetrics | null;      // Current context usage data
  source?: 'startup' | 'resume' | 'clear' | 'compact';
  autocompact: AutoCompactStatus | null;       // { enabled, threshold, bug_threshold }
}

interface ContextMetrics {
  used_percentage: number;                     // 0-100
  remaining_percentage: number;
  total_input_tokens: number;                  // Cumulative session tokens
  total_output_tokens: number;
  context_window_size: number;                 // Model max (e.g., 200k)
  total_cost_usd?: number;
  total_duration_ms?: number;
  is_estimate?: boolean;                       // true if from hooks, false if from preCompact
}
```

#### **Archive Types** (from `/dashboard/src/archive/types.ts`)
```typescript
interface ConversationManifest {
  id: string;                                  // Session UUID
  projectSlug: string;                         // e.g., "jacques-context-manager"
  projectPath: string;
  archivedAt: string;                          // ISO timestamp
  autoArchived: boolean;                       // true = SessionEnd hook, false = manual
  title: string;                               // Claude's auto-generated summary
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  userQuestions: string[];                     // All user messages (searchable)
  filesModified: string[];                     // Write/Edit tool paths
  toolsUsed: string[];                         // Unique tool names
  technologies: string[];                      // Auto-detected (react, typescript, etc.)
  plans: PlanReference[];                      // Plans created during session
  messageCount: number;
  toolCallCount: number;
  userLabel?: string;                          // From Save Context label
}

interface ArchiveListItem {
  type: "project" | "conversation";
  key: string;
  projectSlug?: string;                        // For project items
  manifest?: ConversationManifest;             // For conversation items
  expanded?: boolean;                          // Project expansion state
  conversationCount?: number;                  // Number of conversations
}
```

#### **Context Types** (from `/dashboard/src/context/types.ts`)
```typescript
interface ProjectIndex {
  version: string;
  updatedAt: string;
  context: ContextFile[];                      // External files (Obsidian, Google Docs, etc.)
  sessions: SessionEntry[];                    // Saved conversations
  plans: PlanEntry[];                          // Created plans
}

interface ContextFile {
  id: string;
  name: string;
  path: string;                                // Local path in .jacques/context/
  source: "obsidian" | "google_docs" | "notion" | "local";
  sourceFile: string;                          // Original source location
  addedAt: string;
  description?: string;
  sizeBytes: number;
  tags?: string[];
}
```

### 3. View System

App.tsx supports the following views (defined in `DashboardView` type):

| View | Purpose | Components |
|------|---------|-----------|
| `main` | Main menu with 4 options | VerticalMenu/HorizontalMenu |
| `save` | Save Context workflow | SaveContextView |
| `load` | Load Context selection | LoadContextView |
| `load-sources` | Select external source | SourceSelectionView |
| `obsidian-config` | Configure Obsidian vault | ObsidianConfigView |
| `obsidian-browser` | Browse Obsidian files | ObsidianBrowserView |
| `google-docs-browser` | Browse Google Docs | GoogleDocsBrowserView |
| `notion-browser` | Browse Notion pages | NotionBrowserView |
| `add-context-confirm` | Confirm adding context | AddContextConfirmView |
| `settings` | Settings and archive config | SettingsView |
| `sessions` | Active sessions list | ActiveSessionsView |
| `handoff-browser` | Browse saved handoffs | HandoffBrowserView |
| `llm-working` | LLM streaming indicator | (inline in Dashboard) |
| `archive-browser` | Browse archived conversations | ArchiveBrowserView |
| `archive-initializing` | Archive initialization progress | ArchiveInitProgressView |

### 4. Rendering Patterns

#### **Main Menu View**
- Title + Version + Mascot (if horizontal layout)
- Context progress line (progress bar + percentage + token counts)
- Project/session line
- Menu items (4 items with > arrow for selection)
- Location: Inline in Dashboard component (lines 979-1027)

#### **Scrollable Views Pattern**
All browser views (archive, handoff, obsidian, etc.) follow consistent pattern:
1. **Header** (2 lines): Title + separator line
2. **Content** (6 lines): Scrollable items with scroll indicators (▲/▼)
3. **Footer** (1 line): Help text or scroll indicator
4. **Total**: 10 lines fixed height for consistency

Example from `ArchiveBrowserView`:
```typescript
const ARCHIVE_VISIBLE_ITEMS = 6;  // Items visible in scrollable area
// State: selectedIndex (current selection), scrollOffset (scroll position)
// Navigation: Up/Down arrows, Return to select, Escape to back
```

#### **Layout Responsiveness**
- **Horizontal Layout**: Uses border characters (╭─╮ etc.) + mascot on left
- **Vertical Layout**: Simple stacked layout, no borders, mascot hidden
- **Breakpoints**:
  - ≥70 chars: Show version number
  - ≥62 chars: Use horizontal layout
  - <62 chars: Use vertical layout

### 5. Color Scheme

Consistent palette across all components:
```typescript
const ACCENT_COLOR = "#E67E52";      // Coral (mascot skin tone) - highlights, selections
const BORDER_COLOR = "#E67E52";      // Coral - box borders
const MUTED_TEXT = "#8B9296";        // Gray - secondary text, spacers
const GREEN = "green";               // Success/OK status
const YELLOW = "yellow";             // Warnings
const RED = "red";                   // Errors/critical
```

### 6. Keyboard Navigation System

**Main Menu Navigation**:
- Arrow Up/Down: Navigate menu items
- Enter: Select item
- Number keys (1-4): Direct menu selection
- Esc: N/A (already at main)
- Q: Quit
- A: Show Active Sessions
- C: Create handoff from transcript
- H: Browse handoffs
- H (uppercase): Copy handoff prompt
- W: Open web GUI

**Sub-view Navigation** (consistent across all):
- Arrow Up/Down: Scroll/navigate items
- Enter: Select/expand item
- Esc: Return to parent view
- R: For right arrow (expansion toggle in some views)

### 7. State Management Flow

**App.tsx State Organization**:
1. **UI State**: `currentView`, `selectedMenuIndex`, `notification`
2. **Save Flow**: `savePreview`, `saveLabel`, `saveError`, `saveSuccess`, `saveScrollOffset`
3. **Session State**: `sessionsScrollOffset`
4. **LoadContext State**: `loadContextIndex`, `sourceItems`, `selectedSourceIndex`
5. **Obsidian State**: Config (vaults, manual path), Browser (vault name, tree items, file index, scroll)
6. **Settings State**: Archive filter, auto-archive toggle, archive stats
7. **Archive State**: Manifests by project, expanded projects, items, selected index, scroll
8. **Handoff State**: Entries, selected index, scroll
9. **Google Docs State**: File tree, items, selection, scroll
10. **Notion State**: Workspace name, file tree, items, selection, scroll
11. **LLM Working State**: Active, title, description, elapsed time, abort controller

### 8. Interactive Patterns

#### **Selection with Scrolling**
Used in: Archive, Handoff, Obsidian, Google Docs, Notion browsers
- `selectedIndex`: Currently highlighted item
- `scrollOffset`: Top line of visible window
- **Scroll Logic**:
  ```typescript
  // Move selection up
  const newIndex = Math.max(0, selectedIndex - 1);
  if (newIndex < scrollOffset) {
    scrollOffset = newIndex;  // Scroll up to show selection
  }
  
  // Move selection down
  const newIndex = Math.min(items.length - 1, selectedIndex + 1);
  if (newIndex >= scrollOffset + VISIBLE_ITEMS) {
    scrollOffset = newIndex - VISIBLE_ITEMS + 1;  // Scroll down
  }
  ```

#### **Folder Expansion Pattern**
Used in: Obsidian, Google Docs, Notion, Archive browsers
- `expandedFolders`/`expandedProjects`: Set of expanded folder/project IDs
- Toggle expands/collapses and rebuilds flat item list
- Related items show with indentation

#### **Modal Overlay Pattern**
Used in: AddContextConfirmView
- Modal view shows over main view
- Esc to close without action
- Enter to confirm

### 9. Display Formatting Functions

Located throughout components:

| Function | Purpose |
|----------|---------|
| `formatTokens(n)` | Format as K/M (e.g., 1200 → 1.2k) |
| `formatDuration(m)` | Format as "Xm" or "Xh Ym" |
| `formatDate(iso)` | Format as "Jan 31" |
| `truncate(text, max)` | Truncate with "..." if too long |
| `formatPercentage(pct)` | Format with 1 decimal (e.g., "45.2%") |
| `getContextColor(pct)` | Return color based on percentage |
| `getStatusIcon(status)` | Return emoji for session status |

### 10. Badge/Indicator Patterns

**Session Status Indicators**:
- `●` (filled circle): Focused session
- `○` (empty circle): Background session
- `💤` (sleeping): Idle session
- `⚡` (lightning): Working status
- `✓` (checkmark): Success
- `✗` (cross): Error
- `▲` / `▼` (triangles): Scroll indicators

**Context Usage Warnings**:
- `≥80%`: Red warning "Context nearly full!"
- `60-80%`: Yellow warning "Context usage is moderate"
- `<50%`: Green (no warning)

**Auto-Compact Status**:
- `[ON]` (green): Auto-compact enabled
- `[OFF]` (yellow): Disabled (with red warning about bug #18264)

### 11. Key Files and Their Purposes

| File | Size | Purpose |
|------|------|---------|
| `App.tsx` | ~1920 lines | Main orchestrator, state management, keyboard handling |
| `Dashboard.tsx` | ~1370 lines | View dispatcher, layout rendering (horizontal/vertical) |
| `SessionsList.tsx` | ~103 lines | Session list with icons and sorting |
| `SessionDetails.tsx` | ~241 lines | Detailed session info with warnings |
| `ProgressBar.tsx` | ~80 lines | Context usage visual indicator |
| `ArchiveBrowserView.tsx` | ~200+ lines | Archive browser with project expansion |
| `SettingsView.tsx` | ~varies | Settings menu with archive/Claude config |
| `types.ts` | ~157 lines | Session and message type definitions |
| `archive/types.ts` | ~205 lines | Archive manifest and search index types |
| `context/types.ts` | ~119 lines | Project index and context file types |

### 12. Data Flow Summary

```
WebSocket Client
    ↓ (Session updates from server)
useJacquesClient Hook
    ↓ (Sessions, focusedSessionId, connected)
App.tsx State
    ↓ (Spreads to Dashboard)
Dashboard.tsx (View dispatcher)
    ↓ Renders based on currentView
    ├→ Main Menu (SessionDetails + Menu)
    ├→ SaveContextView (Preview + Label)
    ├→ LoadContextView (Options)
    ├→ SourceSelectionView (Obsidian/Google Docs/Notion)
    ├→ ObsidianBrowserView (File browser)
    ├→ ArchiveBrowserView (Project groups)
    ├→ SettingsView (Archive settings + Claude token)
    ├→ ActiveSessionsView (All sessions)
    ├→ HandoffBrowserView (Saved handoffs)
    └→ LLMWorkingView (Streaming indicator)
```

---

**Summary**: The Jacques dashboard is a sophisticated multi-view TUI with clear separation of concerns. The App.tsx component manages all state and keyboard input, while Dashboard.tsx handles rendering logic. Each view follows consistent patterns for scrolling, selection, and layout. The component architecture uses Ink/React to create responsive layouts that adapt to terminal dimensions, with a soft coral color palette and careful attention to spacing and alignment.