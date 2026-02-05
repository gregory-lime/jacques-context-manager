# Explore: Explore codebase structure

> Session: `87cb5a8d-1f94-47f8-ae07-f271578d28fc`
> Date: 2026-02-02
> Tokens: ~97 805

---

Perfect! Now I have a comprehensive understanding of the codebase. Let me create a detailed report:

## Codebase Exploration Report: Jacques Context Manager

### Project Overview

Jacques is a real-time context monitor for Claude Code and Cursor. The codebase follows a monorepo architecture with three main workspaces:
- **core**: Business logic and utilities shared across projects
- **server**: Node.js/TypeScript WebSocket server
- **dashboard**: Ink/React-based terminal UI

---

## 1. Dashboard Component Patterns (`dashboard/src/components/`)

### Architecture Pattern: Responsive View System

The dashboard uses a **view-based state management pattern** where:
- **App.tsx** is the root component managing all state and keyboard input
- **Dashboard.tsx** is the presenter that renders different views based on `currentView` state
- Individual view components (SaveContextView, SettingsView, etc.) are embedded within Dashboard

#### State Management in App.tsx (Lines 129-250)
```typescript
// UI state
const [currentView, setCurrentView] = useState<DashboardView>("main");
const [selectedMenuIndex, setSelectedMenuIndex] = useState<number>(0);

// Save flow state
const [savePreview, setSavePreview] = useState<SavePreviewData | null>(null);
const [saveLabel, setSaveLabel] = useState<string>("");
// ... ~30+ state variables for different flows
```

**Key Pattern**: Flat state management using useState hooks rather than context. All state lives in App.tsx and is passed down to Dashboard as props.

### Keyboard Input Handling Pattern (App.tsx Lines 1033-1822)

The `useInput` hook from Ink captures all keyboard events. The handler uses a switch/if structure organized by `currentView`:

```typescript
useInput((input, key) => {
  if (currentView === "main") {
    if (key.upArrow) { /* ... */ }
    if (key.downArrow) { /* ... */ }
    if (key.return) { /* ... */ }
    // Number keys, shortcuts (h, H, c, w, etc.)
  } else if (currentView === "save") {
    // Handle save-specific input
  }
  // ... 20+ view-specific handlers
});
```

**Key Insight**: Each view has its own keyboard handling logic nested in the same hook. This creates a "router" pattern where keyboard behavior changes based on the current view.

### View Types (Dashboard.tsx Lines 35-51)

```typescript
export type DashboardView =
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
  | "archive-initializing";
```

---

## 2. Responsive Layout System (Dashboard.tsx)

### Two-Layout Pattern with Breakpoints

The dashboard implements **responsive design** based on terminal width:

#### Breakpoints (Dashboard.tsx Lines 166-169)
```typescript
const HORIZONTAL_LAYOUT_MIN_WIDTH = 62;  // Break to vertical only when < 62
const FIXED_CONTENT_HEIGHT = 10;          // Consistent 10-row content area
const showVersion = terminalWidth >= 70;  // Hide version at < 70 chars
```

#### Horizontal Layout (Lines 351-496)
- Uses bordered box with mascot on left, content on right
- Mascot is 14 chars wide + 3 padding = 17 chars total
- Content width: `terminalWidth - mascotDisplayWidth - 3`
- Bottom border shows notifications or controls

#### Vertical Layout (Lines 281-337)
- No borders
- Mascot and content stacked vertically
- Simpler rendering for narrow terminals

**Pattern**: Both layouts share identical content lines; the presentation changes based on terminal width at render time using `useHorizontalLayout` boolean.

### ANSI Art Handling (mascot-ansi.ts)

The mascot uses **truecolor ANSI escape codes** (RGB format):
```typescript
export const MASCOT_ANSI = `[38;2;225;225;225m▄[0m...`
// Format: [38;2;R;G;Bm = set foreground color, [0m = reset
```

**Key Pattern**: 
- Generated from PNG using `npm run convert-mascot`
- Uses `Text wrap="truncate-end"` to handle ANSI codes without breaking layout
- 14 characters wide visually (ANSI codes don't count toward width)

---

## 3. Component Patterns

### Scrollable List Pattern (ObsidianBrowserView, SettingsView)

Multiple components implement scrolling with fixed viewport:

```typescript
// In App.tsx for Obsidian browser
const VISIBLE_ITEMS = 10;  // From ObsidianBrowserView
const maxVisibleItems = VISIBLE_ITEMS;

if (key.upArrow) {
  const newIndex = Math.max(0, obsidianFileIndex - 1);
  setObsidianFileIndex(newIndex);
  // Adjust scroll if needed
  if (newIndex < obsidianScrollOffset) {
    setObsidianScrollOffset(newIndex);
  }
}
```

**Key Pattern**:
- Maintain `selectedIndex` and `scrollOffset` separately
- Clamp selectedIndex to list bounds
- Auto-adjust scrollOffset to keep selection visible
- Separate visual rendering from selection tracking

### State Props Pattern (Dashboard.tsx Lines 53-143)

Dashboard receives ~70+ props organized by feature area:

```typescript
interface DashboardProps {
  // Core session props
  sessions: Session[];
  focusedSessionId: string | null;
  
  // Save flow props
  savePreview?: SavePreviewData | null;
  saveLabel?: string;
  
  // Obsidian browser props
  obsidianVaultName?: string;
  obsidianTreeItems?: FlatTreeItem[];
  // ... etc
}
```

**Pattern**: Props are grouped by feature with clear naming conventions:
- State: `[featureName][Property]`
- Callbacks: `on[Action]` (not implemented in this version)
- Flags: `is[Adjective]` or `has[Property]`

---

## 4. Core Module Structure (`core/src/`)

### Export Pattern (core/src/index.ts)

The core module uses a **barrel export pattern** with careful alias management to avoid naming conflicts:

```typescript
// Direct exports (no conflicts)
export { detectCurrentSession, parseJSONL, FilterType } from "./session/index.js";

// Aliased exports (for conflicting names)
export {
  formatFileSize as formatStorageFileSize,
  formatTokenCount as formatSessionTokenCount,
} from "./session/index.js";

export {
  addToIndex as addToContextIndex,
  removeFromIndex as removeFromContextIndex,
} from "./context/index.js";
```

**Key Pattern**: 
- Use explicit aliases for modules with overlapping names (addToIndex exists in multiple modules)
- Always use `.js` extensions in imports (NodeNext module resolution requires this)
- Separate type exports from value exports

### Module Organization

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `session/` | JSONL parsing, filtering, transformation | parseJSONL, FilterType, applyFilter |
| `archive/` | Cross-project search, archiving | extractManifest, searchConversations, initializeArchive |
| `context/` | Project knowledge management | addContext, readProjectIndex, addPlanToIndex |
| `sources/` | External adapters (Obsidian, Docs, Notion) | detectObsidianVaults, getGoogleDocsFileTree |
| `handoff/` | Session handoff generation | generateHandoffWithLLM, listHandoffs |
| `storage/` | File I/O for saved contexts | saveContext, saveToArchive |
| `utils/` | Settings and configuration | getClaudeSettings, validateToken |

---

## 5. Context Indexer (`core/src/context/indexer.ts`)

### Unified Project Index Pattern

The indexer manages `.jacques/index.json` with three parallel arrays:

```typescript
interface ProjectIndex {
  version: string;
  updatedAt: string;
  context: ContextFile[];      // Imported context files
  sessions: SessionEntry[];     // Saved conversation sessions
  plans: PlanEntry[];          // Extracted plans
}
```

#### Operations Pattern

Each entity type (context, sessions, plans) has CRUD operations:
- `add[Entity]ToIndex(cwd, entry)` - Add or update
- `remove[Entity]FromIndex(cwd, id)` - Remove
- `read/writeProjectIndex()` - Atomic reads/writes

**Key Pattern**: Update timestamp on every write, maintain sorted order by date (newest first)

#### Legacy Compatibility (Lines 214-266)

Provides deprecated aliases for backward compatibility:
```typescript
export async function readContextIndex() { /* maps to readProjectIndex */ }
export async function addToIndex() { /* maps to addContextToIndex */ }
```

---

## 6. Archive Store (`core/src/archive/archive-store.ts`)

### Filename Generation Pattern

```typescript
function generateSessionFilename(manifest: ConversationManifest): string {
  // Format: [YYYY-MM-DD]_[HH-MM]_[title-slug]_[4-char-id].json
  // Example: 2026-01-31_14-30_jwt-auth-setup_8d84.json
}

function generatePlanFilename(planPath: string, options: { content?: string; createdAt?: Date } = {}): string {
  // Format: [YYYY-MM-DD]_[title-slug].md
  // Extracts title from first # heading in content
}
```

**Key Pattern**: Use ISO dates for sorting, slugified titles for readability, short IDs for uniqueness

---

## 7. Keyboard Navigation Hook

### Custom Hook: useJacquesClient (dashboard/src/hooks/useJacquesClient.ts)

Wraps WebSocket client with React state management:

```typescript
export interface UseJacquesClientReturn extends JacquesState {
  sessions: Session[];
  focusedSessionId: string | null;
  connected: boolean;
  selectSession: (sessionId: string) => void;
  triggerAction: (sessionId: string, action: string) => void;
  toggleAutoCompact: () => void;
}
```

**Pattern**: 
- Single WebSocket connection per app lifecycle (useEffect cleanup)
- Event listener callbacks update local state
- All updates trigger `lastUpdate` timestamp for reactivity
- Callback methods dispatch commands back to server

---

## 8. State Data Flow

### From Server to UI

```
WebSocket (JacquesClient)
  ↓
useJacquesClient Hook (state + callbacks)
  ↓
App.tsx (manages all UI state)
  ↓
Dashboard.tsx (presenter, renders based on currentView)
  ↓
Individual View Components
```

### Event-Driven Updates

1. **Session Update**: Server sends `session_update` → Hook updates state → App re-renders
2. **Focus Change**: User clicks in view → App calls `selectSession()` → WebSocket message to server
3. **View Change**: User presses key → App keyboard handler calls `setCurrentView()` → Dashboard re-renders

---

## 9. TypeScript Configuration

### Shared tsconfig.json Pattern

Both dashboard and core use:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",          // ← Critical for .js extensions
    "jsx": "react-jsx",            // Only in dashboard
    "strict": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

**Key Points**:
- `NodeNext` module resolution enforces `.js` extensions in imports
- `strict: true` ensures full type safety
- `declaration: true` generates `.d.ts` files for library consumers
- Both packages output to `dist/` directory

---

## 10. Color Palette

The entire dashboard uses a consistent **soft coral/peach** theme:

```typescript
const BORDER_COLOR = "#E67E52";      // Soft coral - matches mascot skin tone
const ACCENT_COLOR = "#E67E52";      // Same - used for highlights
const MUTED_TEXT = "#8B9296";        // Cool gray for secondary text
```

These constants are duplicated across multiple files (ProgressBar, SettingsView, LoadContextView, etc.) - could be centralized to a theme module.

---

## 11. View Rendering Pattern (Dashboard.tsx Lines 651-976)

Dashboard uses early returns for different views:

```typescript
export function Dashboard(props: DashboardProps) {
  if (currentView === "save") {
    return <Box>...<SaveContextView /></Box>;
  }
  if (currentView === "load") {
    return <Box>...<LoadContextView /></Box>;
  }
  // ... 10+ view checks
  
  // Default: main menu
  const contentLines = [/* build main menu lines */];
  return <Box>...<HorizontalLayout content={contentLines} /></Box>;
}
```

**Pattern**: Each view is rendered in full-screen container (`Box width={terminalWidth} height={terminalHeight}`), maintaining consistent terminal dimensions.

---

## Summary Table

| Aspect | Pattern | Location |
|--------|---------|----------|
| **State Management** | Flat state in App.tsx, passed to Dashboard | App.tsx lines 129-250 |
| **Keyboard Input** | Single useInput hook with view-based switch | App.tsx lines 1033-1822 |
| **Views** | 16 different views, early returns in Dashboard | Dashboard.tsx lines 651-976 |
| **Responsive Layout** | 2 layouts, breakpoint at 62 chars | Dashboard.tsx lines 351-496 |
| **Scrolling** | selectedIndex + scrollOffset pattern | App.tsx lines 1315-1332 |
| **Module Exports** | Barrel exports with aliasing | core/src/index.ts |
| **Configuration** | TypeScript ES2022 + NodeNext modules | tsconfig.json |
| **Color Palette** | Soft coral theme (#E67E52) | Constants across components |
| **Async Operations** | useCallback handlers with error handling | App.tsx lines 608-826 |
| **WebSocket Connection** | Custom hook with event listeners | useJacquesClient.ts |

---

## Key Architectural Decisions

1. **No Context API or Redux**: All state lives in App.tsx root component
2. **Ink/React for Terminal**: Declarative UI rendering with text-based box model
3. **Early View Returns**: Dashboard uses early returns rather than conditional rendering
4. **Separate Scrolling State**: selectedIndex and scrollOffset are independent
5. **Type Safety**: Strict TypeScript with full type coverage for all data
6. **Shared Core Library**: Reusable business logic in @jacques/core package
7. **Terminal Resize Handling**: Hard reset (ANSI `\x1Bc`) prevents ghosting
8. **ANSI Art Generation**: Automated from PNG for maintainability