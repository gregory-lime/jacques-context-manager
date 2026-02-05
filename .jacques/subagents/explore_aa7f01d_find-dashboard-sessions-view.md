# Explore: Find Dashboard sessions view

> Session: `140f7e47-bbca-4654-9982-fe180f5ee2bc`
> Date: 2026-02-03
> Tokens: ~24 739

---

Perfect! I've read the full Dashboard.tsx file. Here's a comprehensive breakdown of the key sections you asked about:

## Dashboard Component File Analysis

### 1. **Active Sessions View (Lines 1099-1235)**

The `ActiveSessionsView` component renders when the user presses 'A':

```typescript
function ActiveSessionsView({
  sessions: Session[];
  focusedSessionId: string | null;
  terminalWidth: number;
  scrollOffset?: number;
}): React.ReactElement
```

**How it works:**
- Displays all active sessions in a scrollable list
- Shows focused session with a filled bullet (●) and bold text
- Shows non-focused sessions with an empty bullet (○)
- Displays project name and terminal program for each session
- Shows context metrics (percentage, tokens) underneath each session

**Key rendering logic (lines 1120-1169):**
```typescript
sessions.forEach((session) => {
  // Renders: ● project / Terminal
  // Then: ~XX.X% (current/max tokens) • total session tokens
  // Adds spacer between sessions
});
```

### 2. **Keyboard Input Handling**

The file itself doesn't contain the `useInput` hook implementation - that's handled in the parent component/CLI. However, the Dashboard receives state updates through props:
- `sessionsScrollOffset`: Controls scroll position in Active Sessions view
- `selectedMenuIndex`: For main menu navigation
- Other scroll offsets for different views

### 3. **ActiveSessionsView Component Details**

**Structure:**
- **Header (2 lines):** Title with session count and optional "▲ more above" indicator
- **Content (8 lines max):** Scrollable session list
- **Footer (1 line):** Help text with optional "▼ more below" indicator

**Scroll calculation (lines 1171-1184):**
```typescript
const HEADER_LINES = 2;
const FOOTER_LINES = 1;
const maxVisibleItems = FIXED_CONTENT_HEIGHT - HEADER_LINES - FOOTER_LINES; // = 7 items
const totalItems = allSessionItems.length;
const canScrollUp = scrollOffset > 0;
const canScrollDown = scrollOffset + maxVisibleItems < totalItems;
const visibleItems = allSessionItems.slice(scrollOffset, scrollOffset + maxVisibleItems);
```

**Scroll indicators (lines 1189-1219):**
- If `canScrollUp`: Overlays "▲ more above" on the title line
- If `canScrollDown`: Shows "▼ more below • [Esc] back" in footer

### 4. **Enter Key Handling in Sessions View**

The file doesn't show the actual Enter key handling - that would be in the CLI handler that manages state. The component is **presentation-only** and receives updates via props.

The parent component would:
1. Detect Enter key press
2. Get the currently selected session from the visible list
3. Emit an event to switch focus to that session
4. Update `focusedSessionId` prop

### 5. **ScrollOffset and Session Selection**

**ScrollOffset tracking (line 70, 839):**
```typescript
sessionsScrollOffset?: number;  // Passed from parent state
<ActiveSessionsView
  sessions={sessions}
  focusedSessionId={focusedSessionId}
  terminalWidth={terminalWidth}
  scrollOffset={sessionsScrollOffset}
/>
```

**Session selection logic:**
- Sessions are rendered in order, each taking 2-3 lines (name + metrics + spacer)
- The visible window is fixed at 10 rows total (FIXED_CONTENT_HEIGHT = 10)
- Scroll offset determines which items are in the visible slice
- Parent component tracks which session index the user is hovering over

**Visual indicators:**
- **Focused session:** Filled bullet (●) and bold project name
- **Scroll state:** Arrows (▲/▼) show if more items exist above/below

### Key Layout Constants
```typescript
FIXED_CONTENT_HEIGHT = 10    // Total rows in content area
HORIZONTAL_LAYOUT_MIN_WIDTH = 62
MIN_CONTENT_WIDTH = 42
BORDER_COLOR = "#E67E52"
ACCENT_COLOR = "#E67E52" (soft coral/peach)
MUTED_TEXT = "#8B9296"
```

The Sessions view uses the same `HorizontalLayout` or `VerticalLayout` wrappers as the main menu, ensuring consistent styling across the dashboard.