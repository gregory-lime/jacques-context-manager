# Explore: Explore dashboard components

> Session: `ec3adf96-3f1a-451a-9097-07d12e8e7a7c`
> Date: 2026-02-02
> Tokens: ~93 132

---

Perfect! Now I have enough information to provide a comprehensive exploration report. Let me compile all my findings:

## Dashboard Components Exploration - Jacques Context Manager

I've thoroughly explored the dashboard architecture in the Jacques project. Here's a comprehensive breakdown of the UI structure, components, and patterns:

---

### 1. ENTRY POINT AND APPLICATION STRUCTURE

**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/cli.ts`

The dashboard is built as an Ink/React CLI application with these main commands:
- `jacques` or `jacques dashboard` - Interactive TUI (full-screen, requires TTY)
- `jacques status` - One-shot status check (non-interactive)
- `jacques list` - JSON output of sessions
- `jacques search <query>` - Search archived conversations
- `jacques archive-stats` - Show archive statistics

**Key features**:
- Alternate screen buffer management (`\x1b[?1049h/l`) for full-screen mode
- Startup animation with animated dots
- Cleanup handlers for SIGINT/SIGTERM
- Server auto-start with silent mode
- Connection timeout handling (3 seconds)

---

### 2. TOP-LEVEL APP COMPONENT

**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/App.tsx`

**Purpose**: Root component handling all state and navigation logic

**Key responsibilities**:
- WebSocket client connection via `useJacquesClient()` hook
- Session state management (1919 lines)
- Keyboard input handling
- View navigation
- Data flow orchestration

**Major state categories**:
- **UI Navigation**: `currentView`, `selectedMenuIndex`, `notification`
- **Save Flow**: `savePreview`, `saveLabel`, `saveError`, `saveSuccess`, `saveScrollOffset`
- **Load Context**: `loadContextIndex`, `sourceItems`, `selectedSourceIndex`
- **Obsidian Config**: `obsidianVaults`, `obsidianConfigIndex`, `obsidianManualPath/Mode`
- **Obsidian Browser**: `obsidianVaultName`, `obsidianFileTree`, `obsidianExpandedFolders`, `obsidianTreeItems`, `obsidianFileIndex`, `obsidianScrollOffset`
- **Settings**: `settingsIndex`, `archiveFilter`, `autoArchiveEnabled`, `claudeConnected`, `claudeTokenMasked`, `claudeTokenInput`
- **Archive**: `archiveManifestsByProject`, `archiveExpandedProjects`, `archiveItems`, `archiveInitProgress`
- **LLM Working**: `llmWorkingActive`, `llmWorkingTitle`, `llmStreamingText`, `llmInputTokens`, `llmOutputTokens`
- **Handoff Browser**: `handoffEntries`, `handoffSelectedIndex`, `handoffScrollOffset`
- **Google Docs & Notion**: Similar state structures

**View Types**:
```typescript
type DashboardView = 
  | "main"
  | "save"
  | "load"
  | "load-sources"
  | "obsidian-config"
  | "obsidian-browser"
  | "google-docs-browser"
  | "notion-browser"
  | "add-context-confirm"
  | "fetch"
  | "settings"
  | "sessions"
  | "handoff-browser"
  | "llm-working"
  | "archive-browser"
  | "archive-initializing"
```

---

### 3. DASHBOARD COMPONENT

**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/Dashboard.tsx` (1372 lines)

**Purpose**: Main rendering logic for all views with responsive layout

**Responsive Design Constants**:
```typescript
BORDER_COLOR = "#E67E52"                    // Soft coral matching mascot
ACCENT_COLOR = "#E67E52"
MUTED_TEXT = "#8B9296"
MASCOT_WIDTH = 14                           // Actual mascot pixel width
HORIZONTAL_LAYOUT_MIN_WIDTH = 62            // Break to vertical only when <62 chars
FIXED_CONTENT_HEIGHT = 10                   // Fixed 10-row content area
```

**Layout Patterns**:

1. **Horizontal Layout** (>=62 chars wide):
   - Mascot on left side + content on right
   - Bordered box with top/bottom title and controls
   - Full-screen terminal dimensions

2. **Vertical Layout** (<62 chars wide):
   - Mascot above content
   - No border, simpler layout
   - Saves vertical space

**Key Rendering Functions**:
- `HorizontalLayout()` - Renders with border, mascot, and terminal-aware sizing
- `VerticalLayout()` - Simple stacked layout
- `ProgressLine()` - Shows context usage with progress bar
- `ProjectLine()` - Shows project and session title
- `ActiveSessionsView()` - Shows all active sessions with scrolling
- `SaveContextView()` - Save flow UI
- `PlaceholderView()` - Template for future features

**Anti-ghosting Terminal Handling**:
```typescript
// Hard reset clears screen AND scrollback buffer
process.stdout.write('\x1Bc');  // Full terminal reset
```

---

### 4. CORE COMPONENTS LIBRARY

#### **4.1 ProgressBar Component**
**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ProgressBar.tsx`

- `ProgressBar` - Full progress bar with label
- `MiniProgress` - Compact indicator (e.g., "ctx:45%")
- Color scheme: filled (`#E67E52`), empty (`#8B9296`)

#### **4.2 Session Components**
**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/SessionsList.tsx`

- Displays active sessions with status icons (🟢 focused, 💤 idle)
- Shows context percentage with color coding
- Sorted by focused first, then by last activity
- Limits display to 10 sessions, shows "+N more" if exceeded

#### **4.3 Menu Component**
**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/Menu.tsx`

- 5-button vertical menu system
- Each item has key, icon, label, and enabled status
- Fixed-width bordered box

#### **4.4 Load Context View**
**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/LoadContextView.tsx`

- Entry point for context loading workflow
- Two options: "Load from saved conversations", "Load from other sources"
- Reusable layout components (LoadHorizontalLayout, LoadVerticalLayout)

#### **4.5 Browser Views (File explorers)**

**Obsidian Browser**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ObsidianBrowserView.tsx`
- File explorer with expandable folders
- Scroll indicators (▲ more above, ▼ more below)
- Fixed 6-item visible area (`VISIBLE_ITEMS = 6`)
- Supports folder expansion/collapse

**Archive Browser**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ArchiveBrowserView.tsx`
- Displays conversations grouped by project
- Project expansion/collapse
- Shows metadata: date, duration, message count
- 6-item visible area (`ARCHIVE_VISIBLE_ITEMS = 6`)

**Google Docs & Notion Browsers**: Similar patterns to Obsidian
- `GoogleDocsBrowserView.tsx`
- `NotionBrowserView.tsx`

#### **4.6 Settings View**
**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/SettingsView.tsx`

- Archive filter options (Everything, Without Tools, Messages Only)
- Auto-archive toggle
- Claude token connection/management
- Archive statistics display
- Initialize/Re-initialize archive buttons
- Browse archive button

#### **4.7 Additional Views**
- `AddContextConfirmView.tsx` - Confirm adding context with optional description
- `HandoffBrowserView.tsx` - Browse and select handoff files
- `ObsidianConfigView.tsx` - Configure Obsidian vault path
- `SourceSelectionView.tsx` - Choose external source (Obsidian, Google Docs, Notion)
- `LLMWorkingView.tsx` - Show spinner, streaming output, and token counts during LLM operations
- `ArchiveInitProgressView.tsx` - Show archive initialization progress
- `SettingsView.tsx` - Global settings and configuration

---

### 5. DATA CONNECTION HOOK

**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/hooks/useJacquesClient.ts`

**Purpose**: React hook wrapping WebSocket client connection

**Key events handled**:
- `connected` / `disconnected` - Connection status
- `initial_state` - Get all sessions and focused ID on connect
- `session_update` - Individual session update
- `session_removed` - Session deletion
- `focus_changed` - Focus shift with updated session data
- `autocompact_toggled` - Auto-compact status change
- `handoff_ready` - Handoff file ready notification

**Return interface**:
```typescript
{
  sessions: Session[],
  focusedSessionId: string | null,
  connected: boolean,
  lastUpdate: number,
  selectSession: (sessionId: string) => void,
  triggerAction: (sessionId: string, action: 'smart_compact' | 'new_session' | 'save_snapshot') => void,
  toggleAutoCompact: () => void,
  handoffReady: boolean,
  handoffPath: string | null
}
```

---

### 6. KEYBOARD INPUT HANDLING

**Location**: App.tsx `useInput()` hook (lines 1032-1822)

**Main menu (main view)**:
- Arrow keys (Up/Down) - Menu navigation
- Enter - Select menu item
- Number keys (1-4) - Direct menu access
- Q/Ctrl+C - Quit
- A - Show Active Sessions
- H - Copy handoff prompt to clipboard
- H (uppercase) - Browse handoffs
- C - Create handoff from transcript
- W - Open web GUI in browser

**Save view**:
- Up/Down arrows - Scroll
- Enter - Confirm save
- Escape - Cancel
- Alphanumeric input - Build label (alphanumeric, dash, underscore only)

**Browser views** (Obsidian, Google Docs, Notion):
- Up/Down arrows - Navigate items with scroll clamping
- Enter - Select item (toggle folder or confirm file)
- Escape - Go back

**Settings view**:
- Up/Down arrows - Navigate settings items with scrolling
- Return/Space - Toggle or activate setting
- Return (when in token input) - Save and verify token

**Archive browser**:
- Up/Down arrows - Navigate with scroll
- Enter - Toggle project expansion or show conversation
- Escape - Go back

---

### 7. KEY UI PATTERNS

**Fixed-Height Content Area**: All views use `FIXED_CONTENT_HEIGHT = 10` for consistent box sizing across different layouts.

**Scrolling Pattern**:
```typescript
// Visible items constant per view
const VISIBLE_ITEMS = 6;  // or 8, 10 depending on view

// Scroll clamping
const visibleItems = items.slice(scrollOffset, scrollOffset + VISIBLE_ITEMS);
const canScrollUp = scrollOffset > 0;
const canScrollDown = scrollOffset + VISIBLE_ITEMS < totalItems;
```

**Scroll Indicators**: Overlaid on first/last visible line showing "▲ more above" and "▼ more below"

**Color Palette**:
- Accent: `#E67E52` (soft coral)
- Muted: `#8B9296` (gray)
- Border: `#E67E52` (coral)
- Status: `green`, `yellow`, `red` (standard)

**Border Styling**:
- Top: `╭─ Title ─╮`
- Sides: `│ content │`
- Bottom: `╰─ Controls ─╯`

**Terminal Size Responsiveness**:
```typescript
const useHorizontalLayout = terminalWidth >= HORIZONTAL_LAYOUT_MIN_WIDTH;
const showVersion = terminalWidth >= 70;  // Hide version on narrow terminals
```

---

### 8. FILE ORGANIZATION

```
dashboard/src/
├── cli.ts                              # Entry point
├── types.ts                            # TypeScript interfaces
├── hooks/
│   └── useJacquesClient.ts            # WebSocket client hook
├── components/
│   ├── App.tsx                         # Root component (1919 lines)
│   ├── Dashboard.tsx                   # Main renderer (1372 lines)
│   ├── Menu.tsx                        # 5-button menu
│   ├── ProgressBar.tsx                 # Progress visualization
│   ├── SessionsList.tsx                # Session display
│   ├── Header.tsx                      # Header component
│   ├── LoadContextView.tsx             # Load context entry
│   ├── SourceSelectionView.tsx         # Source picker
│   ├── ObsidianConfigView.tsx          # Obsidian config
│   ├── ObsidianBrowserView.tsx         # Obsidian file browser
│   ├── GoogleDocsBrowserView.tsx       # Google Docs browser
│   ├── NotionBrowserView.tsx           # Notion pages browser
│   ├── AddContextConfirmView.tsx       # Add context confirmation
│   ├── SettingsView.tsx                # Settings & configuration
│   ├── HandoffBrowserView.tsx          # Handoff file browser
│   ├── ArchiveBrowserView.tsx          # Archive browser
│   ├── LLMWorkingView.tsx              # LLM progress indicator
│   ├── ArchiveInitProgressView.tsx     # Archive init progress
│   ├── FilterSelectionView.tsx         # Archive filter selector
│   ├── AutoCompactToggle.tsx           # Auto-compact toggle
│   ├── ContextProgress.tsx             # Context progress display
│   ├── SessionDetails.tsx              # Session details view
│   ├── Mascot.tsx                      # Mascot component
│   ├── VerticalMenu.tsx                # Vertical menu
│   ├── HorizontalMenu.tsx              # Horizontal menu
│   ├── CompactHeader.tsx               # Compact header
│   ├── CompactPanel.tsx                # Compact panel
│   ├── ContentBox.tsx                  # Content box wrapper
│   ├── BottomControls.tsx              # Bottom controls
│   └── index.ts                        # Component exports
├── assets/
│   └── mascot-ansi.ts                  # ANSI art mascot
├── storage/
│   └── writer.ts                       # File I/O utilities
├── session/
│   ├── parser.ts                       # JSONL parser
│   ├── transformer.ts                  # Session transformer
│   ├── token-estimator.ts              # Token estimation
│   ├── filters.ts                      # Filtering logic
│   ├── detector.ts                     # Session detection
│   └── index.ts                        # Session exports
├── sources/
│   ├── obsidian.ts                     # Obsidian adapter
│   ├── googledocs.ts                   # Google Docs adapter
│   ├── notion.ts                       # Notion adapter
│   ├── config.ts                       # Source configuration
│   ├── types.ts                        # Source types
│   └── index.ts                        # Source exports
├── context/
│   ├── manager.ts                      # Context file management
│   ├── indexer.ts                      # Context indexing
│   ├── types.ts                        # Context types
│   └── index.ts                        # Context exports
├── archive/
│   ├── archive-store.ts                # Archive storage
│   ├── search-indexer.ts               # Search indexing
│   ├── manifest-extractor.ts           # Manifest extraction
│   ├── types.ts                        # Archive types
│   └── index.ts                        # Archive exports
├── handoff/
│   ├── catalog.ts                      # Handoff file catalog
│   └── subagents.ts                    # Subagent utilities
├── utils/
│   └── settings.ts                     # Settings utilities
├── templates/
│   ├── compact-prompt.ts               # Compact prompt template
│   └── context-skill.ts                # Context skill template
└── websocket-client.ts                 # WebSocket client
```

---

### 9. STATE FLOW DIAGRAM

```
useJacquesClient Hook (WebSocket)
    ↓ provides sessions, focusedSessionId, connected
    ↓
App Component (state management & keyboard handling)
    ↓ dispatches handlers: handleMenuSelect, handleSaveConfirm, etc.
    ↓
Dashboard Component (rendering)
    ↓ decides: HorizontalLayout or VerticalLayout
    ↓
View Components (ObsidianBrowserView, SettingsView, etc.)
    ↓
Terminal output with ANSI colors and box drawing
```

---

### 10. KEY INK/REACT PATTERNS USED

1. **Box component** with `flexDirection="column"` for vertical stacking
2. **Text component** with `color` prop for ANSI colors
3. **useInput hook** for keyboard event handling
4. **useStdout hook** for terminal dimensions and resize events
5. **useState** for local view state management
6. **useEffect** for side effects (timers, event listeners)
7. **useCallback** for memoized event handlers

**Important Details**:
- Terminal width tracked via `stdout?.columns`
- Resize events via `stdout.on('resize', ...)`
- Alternate screen buffer managed via direct process.stdout.write()
- ANSI art with `wrap="truncate-end"` to handle codes properly

---

### 11. COMPONENT INHERITANCE PATTERNS

All browser views follow the same pattern:

```typescript
interface ViewProps {
  items: FlatTreeItem[] | ArchiveListItem[];
  selectedIndex: number;
  scrollOffset: number;
  terminalWidth: number;
  loading?: boolean;
  error?: string | null;
}

// Returns responsive layout
return useHorizontalLayout ? (
  <HorizontalLayout content={...} />
) : (
  <VerticalLayout content={...} />
);
```

---

### 12. IMPORTANT ARCHITECTURE INSIGHTS

1. **Single source of truth**: All state lives in App.tsx, views are pure renderers
2. **Responsive breakpoints**: 62-char width for layout switch, 70-char for version display
3. **Fixed content height**: All views use 10-row content area for consistency
4. **Scroll management**: Manual scroll clamping per view (6 visible items typical)
5. **Terminal anti-ghosting**: Hard reset (`\x1Bc`) on resize clears artifacts
6. **Lazy data loading**: Observes when entering views, loads async data then
7. **Streaming support**: LLM working view displays live token counts and text
8. **Multi-source architecture**: Obsidian, Google Docs, Notion all use same adapter pattern

---

### 13. ABSOLUTE FILE PATHS SUMMARY

Core files:
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/cli.ts` - CLI entry
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/App.tsx` - Root state
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/Dashboard.tsx` - Main renderer
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/hooks/useJacquesClient.ts` - WebSocket hook
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/types.ts` - Type definitions

Component directories:
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/` - 32 UI components
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/sources/` - External adapters
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/session/` - Session parsing
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/archive/` - Archive management

This architecture provides a solid foundation for extending the dashboard with new views, sources, and features while maintaining consistency in styling, layout, and keyboard handling.