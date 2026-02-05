# Explore: Explore dashboard UI components

> Session: `7d6efafc-a92b-437d-b423-c34f24962694`
> Date: 2026-01-31
> Tokens: ~62 760

---

Perfect! Now I have a comprehensive understanding of the dashboard UI. Let me create a detailed summary report of my findings.

## Dashboard UI Exploration Report

Based on my thorough exploration of the Jacques context manager dashboard UI structure in `/Users/gole/Desktop/jacques-context-manager/dashboard/src/`, here's a comprehensive analysis of the UI patterns, components, and interactive elements:

---

### 1. **Main UI Structure**

**Entry Point**: `cli.ts`
- Provides CLI commands: `jacques` (dashboard), `jacques status`, `jacques list`, `jacques search`, `jacques archive-stats`
- Uses Ink (React for CLIs) rendering
- Manages alternate screen buffer (`\x1b[?1049h` enter, `\x1b[?1049l` exit) for full-screen TUI mode
- Window management with proper cleanup on exit

**Root Component**: `App.tsx`
- State management for all UI views and dialogs
- Keyboard input handling with Ink's `useInput` hook
- Manages session data, scroll positions, and modal states
- Provides unified notification system (temporary messages)

**Main Dashboard**: `Dashboard.tsx`
- Responsive layout system (horizontal for 62+ char width, vertical below)
- Displays mascot (Jacques Derrida ASCII art from `/assets/mascot-ansi.ts`)
- Shows focused session details with progress indicators
- Fixed 10-row content area with controlled heights for consistency

---

### 2. **Key Components & Their Roles**

#### **Status Display Components**

| Component | Purpose | Pattern |
|-----------|---------|---------|
| `ProgressBar` | Visual context usage bar with color coding | Uses solid/empty blocks (█/░), 3-tier colors (green <60%, yellow 60-80%, red ≥80%) |
| `MiniProgress` | Compact percentage indicator for lists | Shows `ctx:XX%` format with estimate prefix (`~`) |
| `ContextProgress` | Full context metrics display | Shows percentage, token counts, visual bar, estimate flag |
| `SessionDetails` | Detailed session information | Title, model, project, metrics, auto-compact status, warnings |

#### **Navigation & Selection Components**

| Component | Purpose | Pattern |
|-----------|---------|---------|
| `Menu` | 5-button main menu (1-5 keys) | Bordered box with icons, enabled/disabled states, selection highlight |
| `SessionsList` | Lists all active sessions | Focused first, sorted by activity, status icons (🟢 focused, 💤 idle) |
| `VerticalMenu` | Vertical option list for dialogs | Arrow key navigation, Enter selection, colored text states |

#### **View Containers** (Horizontal & Vertical Layouts)

All views use a consistent responsive layout:
- **Horizontal Layout** (≥62 chars): Mascot on left, content on right, bordered box
- **Vertical Layout** (<62 chars): Mascot on top, content below, no border
- **Fixed height**: 10 rows for consistency across all views
- **Color scheme**: Soft coral accent (#E67E52), muted gray (#8B9296)

#### **Interactive Dialog Views**

| Component | Purpose | Key Pattern |
|-----------|---------|------------|
| `LoadContextView` | Load context options (saved/sources) | Horizontal layout, selection highlight with `> ` prefix |
| `SourceSelectionView` | External sources (Obsidian, etc.) | Status indicators (● Connected, ○ Not connected, coming soon) |
| `ObsidianConfigView` | Configure Obsidian vault path | Toggle between vault selection and manual path input modes |
| `ObsidianBrowserView` | File explorer for Obsidian | Scrollable tree with expandable folders, 6-item visible window, scroll indicators (▲/▼) |
| `AddContextConfirmView` | Confirm file addition | Shows success/error states, file details, optional description input |
| `SettingsView` | Archive filter & auto-archive toggle | Filter options (Everything/Without Tools/Messages Only) with status display |
| `HandoffBrowserView` | Browse generated handoff files | Similar to Obsidian browser, shows date and token estimates |

#### **Status & Warning Components**

| Component | Purpose | Visual Pattern |
|-----------|---------|----------------|
| `CompactPanel` | Context compaction workflow helper | Bordered warning box, 2-state (70%-78% warning, ≥78% danger) |
| `AutoCompactToggle` | Auto-compact status display | Shows [ON] green or [OFF] yellow with threshold/bug indicator |
| `Header` | Title, version, connection status | Connection indicator (● green/○ red), session count |

---

### 3. **View Types & Navigation Flow**

The dashboard has 11 distinct views (defined in `DashboardView` type):

```
main
├── save (Save Context flow)
├── load (Load Context options)
│   └── load-sources
│       ├── obsidian-config
│       └── obsidian-browser
│           └── add-context-confirm
├── fetch (placeholder)
├── sessions (Active Sessions list)
├── settings (Archive settings)
└── handoff-browser (Browse handoffs)
```

**Navigation Pattern**:
- Escape key returns to previous view
- Each view resets relevant state on exit
- Main menu always accessible via Escape

---

### 4. **Keyboard Shortcuts & Input Handling**

#### **Main Menu Shortcuts**
```
Number Keys:     1-5 for menu items
Arrow Keys:      Up/Down navigation, scrolling in lists
Enter:          Select menu item or confirm action
Escape:         Back to previous menu/exit dialog
q/Q/Ctrl+C:    Quit dashboard
s/S:            Show settings
a/A:            View active sessions
h:              Copy handoff prompt to clipboard
H:              Browse handoffs
c:              Create handoff from transcript
```

#### **Input Handling Patterns**

**Text Input** (label/description fields):
```typescript
// Alphanumeric + dash/underscore for labels
if (/^[a-zA-Z0-9_-]$/.test(input)) {
  setSaveLabel(prev => prev + input);
}
// Full character input for descriptions
if (input && input.length === 1) {
  setDescription(prev => prev + input);
}

// Backspace/Delete support
if (key.backspace || key.delete) {
  setText(prev => prev.slice(0, -1));
}
```

**Selection Navigation**:
```typescript
// Vertical menus
if (key.upArrow) setIndex(prev => Math.max(0, prev - 1));
if (key.downArrow) setIndex(prev => Math.min(maxIndex, prev + 1));
if (key.return) handleSelect(index);
```

**Scrollable Lists**:
```typescript
// With automatic scroll adjustment to keep selection visible
if (key.downArrow) {
  const newIndex = Math.min(items.length - 1, selectedIndex + 1);
  if (newIndex >= scrollOffset + VISIBLE_ITEMS) {
    setScrollOffset(newIndex - VISIBLE_ITEMS + 1);
  }
}
```

---

### 5. **State Management Patterns**

**App.tsx manages**:
- Current view state
- Selected/focused indices for each view
- Scroll offsets for scrollable lists (SessionsList, Obsidian, Handoff)
- Form input states (saveLabel, obsidianManualPath, addContextDescription)
- Modal/dialog states (success/error messages, loading flags)
- Session data caching (parsedEntries, sessionFile)

**Pattern**: Each dialog feature has dedicated state slices that are cleared on return-to-main

**Async Operations**:
- Long operations set loading flags and catch errors
- Success/error states shown in dedicated views
- Users press Enter/Escape to dismiss results

---

### 6. **Visual Design Patterns**

#### **Color Coding**
```
Accent/Active:      #E67E52 (soft coral - selection, headers, important)
Background/Muted:   #8B9296 (gray - secondary text, separators)
Success:            #4ADE80 (green - ✓ messages)
Error:              #EF4444 (red - warnings, high danger)
Progress:
  • 0-60%: Green
  • 60-80%: Yellow
  • 80%+: Red
Status:
  • Active: ● Green
  • Warning: ⚠️ Yellow/Orange
  • Danger: 🔴 Red
```

#### **Interactive Elements**
- **Selection**: Colored text with bold flag, `> ` prefix or highlight
- **Disabled**: Gray text
- **Status indicators**: ● (connected), ○ (not connected), 🟢 (focused), 💤 (idle)
- **Scroll indicators**: ▲ more above / ▼ more below
- **Bordered boxes**: Single-line borders with corners (╭─╮╰─╯│)
- **Separators**: Dashes `─`.repeat(35)

#### **Responsive Breakpoints**
```
Width ≥ 70: Show version number
Width ≥ 62: Horizontal layout (mascot + content side-by-side)
Width < 62: Vertical layout (mascot above content)
Width ≥ 60: Allowed for horizontal
Width < 60: Force vertical
```

---

### 7. **Save/Load Context Flow Patterns**

#### **Save Context Flow**
1. Menu item → Load session JSONL file (try transcript_path, detect from cwd, search by ID)
2. Apply filter (Everything/Without Tools/Messages Only)
3. Show preview (message count, duration, filter label)
4. Enter optional label (alphanumeric + dash/underscore)
5. Confirm → Transform → Save locally + archive globally
6. Show success with file path and size
7. Return to main on Enter/Escape

#### **Load Context Flow**
1. Menu item → Choose source type
2. Select external source (Obsidian configured/not)
3. If Obsidian not configured: detect vaults or enter path manually
4. Browse vault files (expandable tree, 6-item window)
5. Select file → Enter description → Confirm
6. Copy to `.jacques/context/` and index in `.jacques/index.json`
7. Show success then return to main

---

### 8. **Progress Indicators & Status Display**

**Real-time Metrics Display** (Dashboard header):
```
├─ Project / Title
├─ Context: XX.X% (YYYk/ZZZk tokens)
│  └─ Visual bar with color coding
├─ Status: [working|idle|active]
├─ Auto-compact: [ON/OFF] @ XXX% (or bug@~78%)
└─ Last activity: X minutes ago
```

**CompactPanel** appears when context >70%:
- Warning at 70%+: "Create handoff before ~78% bug triggers"
- Danger at ≥73%: "CONTEXT CRITICAL - DANGER!"
- Shows workflow steps and keyboard shortcuts

**Handoff Workflow Indicators**:
- No handoff: Instructions for creating via [c] prompt
- Handoff ready: "✓ Handoff file ready" → instructions for [h] copy

---

### 9. **Clipboard Integration**

**Pattern** (uses system `pbcopy`/`xclip`):
```typescript
function copyToClipboard(text: string): Promise<void> {
  const proc = spawn("pbcopy"); // or "xclip" on Linux
  proc.stdin.write(text);
  proc.stdin.end();
  // Promise resolves on process close (code 0 = success)
}

// Usage:
copyToClipboard(text)
  .then(() => showNotification("Copied!"))
  .catch(() => showNotification("Failed"));
```

---

### 10. **Error Handling & User Feedback**

**Notification System**:
```typescript
showNotification(message, duration = 3000)
  // Auto-dismisses after timeout
  // Shows in cyan at bottom of screen
  // Used for: success, warnings, feedback
```

**Inline Errors** (in dialogs):
- Display as red text
- Prevent further action (button presses ignored)
- User must fix and retry

**Modal Success/Error States**:
- Dedicated view shows full message
- Hides input controls
- Only Enter/Escape closes, returns to main

---

### 11. **Component Composition Example**

All major views follow this structure:

```typescript
// 1. Props with complete state
interface ViewProps {
  items: T[];
  selectedIndex: number;
  scrollOffset: number;
  terminalWidth: number;
  loading?: boolean;
  error?: string | null;
}

// 2. Responsive layout decision
const useHorizontalLayout = terminalWidth >= HORIZONTAL_LAYOUT_MIN_WIDTH;

// 3. Build content lines (consistent structure)
const contentLines: React.ReactNode[] = [];
contentLines.push(<Text>Title</Text>);
contentLines.push(<Text>Separator</Text>);
// ... items with selection indicator ...
// Pad to FIXED_CONTENT_HEIGHT

// 4. Render with layout wrapper
return (
  <Box width={terminalWidth} flexDirection="column">
    {useHorizontalLayout ? (
      <HorizontalLayout content={contentLines} {...props} />
    ) : (
      <VerticalLayout content={contentLines} {...props} />
    )}
  </Box>
);
```

---

### Summary: Key UI Patterns for Phase 5 Implementation

When implementing Phase 5 (context breakdown), consider:

1. **Use existing ProgressBar component** with color tier system
2. **Follow the responsive layout pattern** (Horizontal ≥62 chars, Vertical <62)
3. **Implement as a new view** alongside existing views (add to DashboardView type)
4. **Use dialog/modal pattern** from SessionDetails or CompactPanel
5. **Provide scrollable content** if breakdown exceeds 10 rows (use offset pattern)
6. **Show loading state** while parsing transcript (set loading flag)
7. **Color-code categories** (messages = green, skills = yellow, system = blue, cache = purple)
8. **Display estimated tokens** for each category with breakdown bar
9. **Include visual separator** between main progress and detailed breakdown
10. **Add keyboard shortcut** (e.g., `d` for details) accessible from main menu

All component files are in `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/`.