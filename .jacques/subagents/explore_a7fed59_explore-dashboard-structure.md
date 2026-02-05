# Explore: Explore dashboard structure

> Session: `25f08958-807f-47f0-94dc-999411f7659a`
> Date: 2026-01-31
> Tokens: ~59 329

---

Perfect! I have gathered comprehensive information about the dashboard architecture and handoff feature. Let me provide you with a detailed report.

---

## Dashboard Architecture & Keyboard Handling Report

### 1. **Keyboard Handling Pattern in App.tsx**

The keyboard handler is implemented through Ink's `useInput` hook (lines 572-983 in App.tsx) with a view-based dispatcher pattern:

**Main Pattern:**
```typescript
useInput(
  (input, key) => {
    // Dispatcher based on currentView
    if (currentView === "main") {
      // Handle main menu input
    } else if (currentView === "save") {
      // Handle save flow input
    } else if (currentView === "handoff-browser") {
      // Handle handoff browser input
    }
    // ... more views
  },
  { isActive: isRawModeSupported }
);
```

**Key Shortcuts on Main View:**
- `[1-4]` or Arrow keys: Navigate menu items
- `[Enter]`: Select menu item
- `[s]/[S]`: Open settings
- `[a]/[A]`: Jump to active sessions
- `[h]`: Copy handoff prompt to clipboard
- `[H]`: Browse handoffs (capital H)
- `[q]/[Q]` or `Ctrl+C`: Quit

### 2. **Handoff Feature Implementation**

The handoff system is fully integrated with the following key components:

#### **File Structure:**
```
core/src/handoff/
├── types.ts         # HandoffEntry and HandoffCatalog interfaces
├── catalog.ts       # List, read, and generate handoff files
├── prompts.ts       # Handoff invocation prompts
└── index.ts         # Public exports

dashboard/src/components/
├── HandoffBrowserView.tsx  # Browse handoff files UI
└── App.tsx                 # Keyboard handler for handoff operations
```

#### **HandoffEntry Type (core/src/handoff/types.ts):**
```typescript
export interface HandoffEntry {
  filename: string;              // e.g., "2026-01-31T14-30-00-handoff.md"
  timestamp: Date;               // Parsed from filename
  path: string;                  // Full path to file
  tokenEstimate: number;         // content.length / 4.5
}

export interface HandoffCatalog {
  directory: string;             // .jacques/handoffs/
  entries: HandoffEntry[];       // Sorted by timestamp (newest first)
}
```

#### **Keyboard Handler for Handoffs (App.tsx, lines 643-678):**
```typescript
// Line 643-652: [h] - Copy handoff prompt
if (input === "h") {
  const prompt = getHandoffPrompt();
  copyToClipboard(prompt).then(() => {
    showNotification("Handoff prompt copied to clipboard!");
  });
  return;
}

// Line 654-678: [H] - Browse handoffs
if (input === "H") {
  if (!focusedSession) {
    showNotification("No active session");
    return;
  }
  const cwd = focusedSession.workspace?.project_dir || focusedSession.cwd;
  setHandoffBrowserLoading(true);
  setCurrentView("handoff-browser");
  
  listHandoffs(cwd).then((catalog) => {
    setHandoffEntries(catalog.entries);
    setHandoffBrowserLoading(false);
  });
  return;
}
```

#### **Handoff Browser View (lines 930-971):**
```typescript
} else if (currentView === "handoff-browser") {
  if (key.escape) {
    returnToMain();
    return;
  }
  
  if (key.upArrow) {
    const newIndex = Math.max(0, handoffSelectedIndex - 1);
    setHandoffSelectedIndex(newIndex);
    if (newIndex < handoffScrollOffset) {
      setHandoffScrollOffset(newIndex);
    }
    return;
  }
  
  if (key.downArrow) {
    const newIndex = Math.min(handoffEntries.length - 1, handoffSelectedIndex + 1);
    setHandoffSelectedIndex(newIndex);
    if (newIndex >= handoffScrollOffset + HANDOFF_VISIBLE_ITEMS) {
      setHandoffScrollOffset(newIndex - HANDOFF_VISIBLE_ITEMS + 1);
    }
    return;
  }
  
  if (key.return && handoffEntries.length > 0) {
    const selectedEntry = handoffEntries[handoffSelectedIndex];
    getHandoffContent(selectedEntry.path)
      .then((content) => copyToClipboard(content))
      .then(() => {
        showNotification("Handoff copied to clipboard!");
        returnToMain();
      });
    return;
  }
}
```

### 3. **transcript_path Handling in Server Types**

The `transcript_path` field is defined in `/Users/gole/Desktop/jacques-context-manager/server/src/types.ts`:

**Session Interface (lines 109-142):**
```typescript
export interface Session {
  session_id: string;
  source: SessionSource;
  session_title: string | null;
  transcript_path: string | null;  // ← Key field for handoff feature
  cwd: string;
  project: string;
  model: ModelInfo | null;
  workspace: WorkspaceInfo | null;
  terminal: TerminalIdentity | null;
  terminal_key: string;
  status: SessionStatus;
  last_activity: number;
  registered_at: number;
  context_metrics: ContextMetrics | null;
  start_reason?: 'startup' | 'resume' | 'clear' | 'compact';
  autocompact: AutoCompactStatus | null;
}
```

**How transcript_path is used in Save Flow (App.tsx, lines 207-222):**
```typescript
// First priority: Use transcript_path from session
if (focusedSession.transcript_path) {
  try {
    const stats = await fs.stat(focusedSession.transcript_path);
    detected = {
      filePath: focusedSession.transcript_path,
      sessionId: focusedSession.session_id,
      modifiedAt: stats.mtime,
      sizeBytes: stats.size,
    };
  } catch {
    // transcript_path doesn't exist, fall back to detection
    detected = null;
  }
}

// Fallback 1: Detect from Claude projects directory by cwd
if (!detected) {
  detected = await detectCurrentSession({ cwd });
}

// Fallback 2: Search by session ID across all projects
if (!detected) {
  detected = await findSessionById(focusedSession.session_id);
}
```

### 4. **Handoff File Format & Functions**

**Filename Format:** `YYYY-MM-DDTHH-mm-ss-handoff.md`

**Core Functions (core/src/handoff/catalog.ts):**
- `listHandoffs(projectDir)` - List all handoffs from `.jacques/handoffs/`
- `getHandoffContent(path)` - Read a single handoff file
- `generateHandoffFilename()` - Create timestamp-based filename
- `parseTimestampFromFilename(filename)` - Extract date from filename
- `formatHandoffDate(date)` - Format date for display
- `formatTokenEstimate(tokens)` - Format token count (e.g., "2.1k")
- `estimateTokens(content)` - Calculate tokens (length / 4.5)

**Handoff Prompts (core/src/handoff/prompts.ts):**
```typescript
export const HANDOFF_INVOCATION = "Use the handoff-orchestrator to prepare for a new session";
export function getHandoffPrompt(): string { ... }
```

### 5. **HandoffBrowserView Component**

Located at `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/HandoffBrowserView.tsx`

**Layout Properties:**
- Responsive design (horizontal ≥62 chars, vertical <62 chars)
- Fixed content height: 10 rows
- Visible items per page: 6
- Scroll indicators: ▲ (more above) / ▼ (more below)
- Accent color: #E67E52 (coral/peach)

**Display Format:**
```
2026-01-31 14:30 - Session Handoff (2.1k tokens)
```

**Controls:**
- `[↑↓]` Navigate
- `[Enter]` Copy to clipboard
- `[Esc]` Return to main menu

### 6. **Save Context Flow Architecture**

The save flow pattern (which can serve as reference for handoff implementation):

**State Management (App.tsx):**
```typescript
// Save flow state
const [savePreview, setSavePreview] = useState<SavePreviewData | null>(null);
const [saveLabel, setSaveLabel] = useState<string>("");
const [saveError, setSaveError] = useState<string | null>(null);
const [saveSuccess, setSaveSuccess] = useState<SaveSuccessData | null>(null);
const [saveScrollOffset, setSaveScrollOffset] = useState<number>(0);
const [selectedFilterType, setSelectedFilterType] = useState<FilterType>();
const [sessionFile, setSessionFile] = useState<SessionFile | null>(null);
const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([]);
```

**Flow Steps:**
1. Menu selection (`"1"`) triggers `handleMenuSelect()`
2. Load archive filter from settings
3. Detect/load session file (via `transcript_path` first)
4. Parse JSONL entries
5. Apply filter and generate preview
6. User enters label (alphanumeric, dash, underscore only)
7. Confirm with Enter → `handleSaveConfirm()`
8. Save to archive

### 7. **Session Parser Integration**

The session parser (`dashboard/src/session/parser.ts`) provides:

**ParsedEntry Types:**
- `user_message` - User input
- `assistant_message` - Claude's response
- `tool_call` - Tool invocations (Bash, Read, Write, etc.)
- `tool_result` - Tool output
- `hook_progress` - Hook execution logs
- `turn_duration` - Turn timing info
- `system_event` - System events
- `summary` - Session title

**Token Metadata:** Each entry captures usage data:
```typescript
usage?: {
  inputTokens: number;
  outputTokens: number;
  cacheCreation?: number;
  cacheRead?: number;
};
costUSD?: number;
durationMs?: number;
model?: string;
```

### 8. **Directory Structure**

```
/Users/gole/Desktop/jacques-context-manager/
├── core/src/
│   ├── handoff/              # Handoff module
│   ├── session/              # JSONL parsing & filtering
│   ├── archive/              # Cross-project search
│   ├── context/              # Knowledge management
│   ├── sources/              # Obsidian, etc.
│   ├── storage/              # File I/O
│   └── utils/                # Settings management
├── dashboard/src/
│   ├── components/
│   │   ├── App.tsx           # Main keyboard handler
│   │   ├── Dashboard.tsx     # View dispatcher
│   │   └── HandoffBrowserView.tsx
│   ├── handoff/              # Handoff UI logic
│   ├── session/              # Session parser
│   ├── archive/              # Archive UI logic
│   └── context/              # Context UI logic
├── server/src/
│   ├── types.ts              # Session and event types
│   ├── session-registry.ts   # Session state management
│   ├── unix-socket.ts        # Hook communication
│   └── websocket.ts          # Dashboard communication
└── hooks/                    # Python/Bash hooks
```

### 9. **Key Files You'll Need**

1. **Keyboard Handler:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/App.tsx` (lines 571-983)
2. **Handoff Types:** `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/types.ts`
3. **Handoff Catalog:** `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/catalog.ts`
4. **UI Component:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/HandoffBrowserView.tsx`
5. **Server Types:** `/Users/gole/Desktop/jacques-context-manager/server/src/types.ts` (Session interface)
6. **Session Parser:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/session/parser.ts`

### 10. **Implementation Patterns to Follow**

**Pattern 1: Keyboard Shortcut with Async Operation**
```typescript
// Main menu keyboard handler
if (input === "h") {
  const prompt = getHandoffPrompt();
  copyToClipboard(prompt).then(() => {
    showNotification("Handoff prompt copied to clipboard!");
  });
  return;
}
```

**Pattern 2: View-based State Management**
```typescript
const [currentView, setCurrentView] = useState<DashboardView>("main");
// ... view-specific state
// Return to main via: setCurrentView("main") and reset all related state
```

**Pattern 3: Scroll-aware Arrow Navigation**
```typescript
if (key.downArrow) {
  const newIndex = Math.min(items.length - 1, selectedIndex + 1);
  setSelectedIndex(newIndex);
  if (newIndex >= scrollOffset + VISIBLE_ITEMS) {
    setScrollOffset(newIndex - VISIBLE_ITEMS + 1);
  }
}
```

**Pattern 4: Error State Handling**
```typescript
// Show error, then only allow Enter/Escape
if (saveError) {
  if (key.return || key.escape) {
    returnToMain();
  }
  return;
}
```

This architecture gives you all the patterns and infrastructure you need to extend the handoff feature with additional functionality like generation, viewing details, or creating new handoff types.