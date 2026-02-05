# Explore: Explore dashboard UI patterns

> Session: `ad407d41-6bf6-491f-a1af-10f2fa41b27a`
> Date: 2026-02-01
> Tokens: ~69 102

---

Now let me compile the comprehensive research report:

## Jacques Dashboard UI Architecture - Comprehensive Research Report

Based on my thorough exploration of the Jacques dashboard codebase, here's a detailed breakdown of the existing UI patterns and components that should inform your LLM working indicator design:

---

### 1. EXISTING VIEW PATTERNS

**All views follow a consistent structure:**
- Bordered layout (horizontal) or plain layout (vertical) depending on terminal width
- Fixed content height of 10 rows
- Mascot (Jacques Derrida ANSI art) on the left side in horizontal mode
- Color-coordinated styling with soft coral accent color (#E67E52)
- Scrollable content areas with up/down indicators (▲/▼)

**Key View Components:**
- **Dashboard.tsx** - Main container with `HorizontalLayout` and `VerticalLayout` sub-components
- **LoadContextView.tsx** - Menu selection view (Load from saved, Load from sources)
- **ObsidianBrowserView.tsx** - File tree browser with expandable folders
- **HandoffBrowserView.tsx** - Scrollable handoff file list
- **GoogleDocsBrowserView.tsx** - Google Docs file tree browser
- **NotionBrowserView.tsx** - Notion pages tree browser
- **SettingsView.tsx** - Settings and archive statistics
- **AddContextConfirmView.tsx** - Confirmation dialog for adding context
- **SaveContextView.tsx** - Save conversation dialog

---

### 2. LOADING STATES IMPLEMENTATION

**Current pattern (from ObsidianBrowserView, HandoffBrowserView, GoogleDocsBrowserView, NotionBrowserView, SettingsView):**

```tsx
// Props interface
interface BrowserViewProps {
  loading?: boolean;
  error?: string | null;
}

// In component
if (loading) {
  contentLines.push(
    <Text key="loading" color={MUTED_TEXT}>
      Loading files...    // Simple text message
    </Text>
  );
} 
else if (error) {
  contentLines.push(
    <Text key="error" color="#EF4444">
      ✗ {error}         // Red error with ✗ icon
    </Text>
  );
}
else if (items.length === 0) {
  contentLines.push(
    <Text key="empty" color={MUTED_TEXT}>
      No items found
    </Text>
  );
}
else {
  // Render normal content
}
```

**Loading trigger pattern (from App.tsx):**
```tsx
const loadVaultTree = useCallback(async (vaultPath: string) => {
  setObsidianBrowserLoading(true);      // SET LOADING
  setObsidianBrowserError(null);
  setObsidianFileTree([]);
  
  try {
    const tree = await getVaultFileTree(vaultPath);
    setObsidianFileTree(tree);
    const items = flattenTree(tree, new Set());
    setObsidianTreeItems(items);
  } catch (err) {
    setObsidianBrowserError(...);
  } finally {
    setObsidianBrowserLoading(false);   // CLEAR LOADING
  }
}, []);
```

---

### 3. BORDER & BOX STYLING

**Color Palette:**
- **BORDER_COLOR** = "#E67E52" (soft coral, matches mascot skin)
- **ACCENT_COLOR** = "#E67E52" (same coral, used for highlights)
- **MUTED_TEXT** = "#8B9296" (gray, used for secondary text)
- **SUCCESS_COLOR** = "#4ADE80" (green, for success states)
- **ERROR_COLOR** = "#EF4444" (red, for errors)

**Horizontal Box Structure:**
```
╭─ Jacques v0.1.0 ─────────────────────────────────────────╮
│ [mascot] │ [title]                                        │
│ [mascot] │ [progress bar]                                 │
│ [mascot] │ [project / session title]                      │
│ [mascot] │                                                │
│ [mascot] │ > Save Context                                 │
│ [mascot] │   Load Context                                 │
│ [mascot] │   Fetch Context (disabled)                    │
│ [mascot] │   Active Sessions (4)                          │
│ [mascot] │                                                │
│ [mascot] │                                                │
╰─ [Q]uit [S]ettings ──────────────────────────────────────╯
```

**Vertical Box Structure:**
```
Jacques v0.1.0
[mascot]

Context Manager
█████░░░░░░░░░░░░░░ ~45.2% (5.6k/12.4k)
project / Untitled

> Save Context
  Load Context
  ...

[Q]uit [S]ettings
```

**Box Construction in HorizontalLayout:**
```tsx
// Top border: ╭ + title + dashes + ╮
<Text color={BORDER_COLOR}>╭</Text>
<Text color={ACCENT_COLOR}>{"─ " + title}</Text>
{showVersion && <Text color={MUTED_TEXT}>{" v0.1.0"}</Text>}
<Text color={BORDER_COLOR}> {"─".repeat(remainingBorder)}╮</Text>

// Content rows: │ + mascot + │ + content + │
<Text color={BORDER_COLOR}>│</Text>
<Box width={mascotDisplayWidth} justifyContent="center">
  <Text wrap="truncate-end">{mascotLine}</Text>
</Box>
<Text color={BORDER_COLOR}>│</Text>
<Box width={contentWidth} paddingLeft={CONTENT_PADDING} paddingRight={CONTENT_PADDING}>
  {contentLine}
</Box>
<Text color={BORDER_COLOR}>│</Text>

// Bottom border: ╰ + dashes + controls + dashes + ╯
<Text color={BORDER_COLOR}>╰{"─".repeat(bottomLeftBorder)}</Text>
<Text color={ACCENT_COLOR}>[Q]</Text>
<Text color={MUTED_TEXT}>uit </Text>
// ... more controls
<Text color={BORDER_COLOR}>{"─".repeat(bottomRightBorder)}╯</Text>
```

---

### 4. MASCOT INTEGRATION

**Mascot Asset:**
- Located in: `/dashboard/src/assets/mascot-ansi.ts`
- ANSI art representation (14 chars visual width)
- Imported as: `import { MASCOT_ANSI } from "../assets/mascot-ansi.js"`
- Rendered with: `<Text wrap="truncate-end">{MASCOT_ANSI}</Text>`
- Split by newlines for multi-row rendering
- Vertical centering in fixed 10-row content height

**Mascot Layout Math:**
```tsx
const mascotLines = MASCOT_ANSI.split("\n").filter(
  (line) => line.trim().length > 0
);
const mascotHeight = mascotLines.length;
const totalHeight = FIXED_CONTENT_HEIGHT; // 10 rows
const mascotTopPadding = Math.floor((totalHeight - mascotHeight) / 2);

// Render each row
mascotLineIndex = rowIndex - mascotTopPadding;
mascotLine = (mascotLineIndex >= 0 && mascotLineIndex < mascotLines.length)
  ? mascotLines[mascotLineIndex]
  : "";
```

---

### 5. REUSABLE COMPONENTS

**Core Components:**
- **ProgressBar.tsx** - Shows percentage with color coding (green/yellow/red)
  - `percentage`, `width` (default 30), `showLabel`, `isEstimate` props
  - Uses filled "█" and empty "░" characters
  
- **MiniProgress.tsx** - Compact version for session lists
  - Displays "ctx:~45.2%" format
  
- **ImageMascot.tsx** - Just wraps the ANSI art display
  
- **BottomControls.tsx** - Keyboard shortcuts footer

**Layout Patterns - Reusable Constants:**
```tsx
// Every view uses these same constants
const ACCENT_COLOR = "#E67E52";
const MUTED_TEXT = "#8B9296";
const BORDER_COLOR = "#E67E52";
const MASCOT_WIDTH = 14;
const MIN_CONTENT_WIDTH = 42;
const CONTENT_PADDING = 2;
const HORIZONTAL_LAYOUT_MIN_WIDTH = 62;  // Breakpoint for responsive layout
const FIXED_CONTENT_HEIGHT = 10;         // All boxes are 10 rows tall
```

**State Management Pattern (from App.tsx):**
```tsx
// Each async operation uses:
const [xxxLoading, setxxxLoading] = useState<boolean>(false);
const [xxxError, setxxxError] = useState<string | null>(null);

// In async handler:
try {
  setxxxLoading(true);
  const result = await asyncOperation();
  setxxxState(result);
} catch (err) {
  setxxxError(err.message);
} finally {
  setxxxLoading(false);
}
```

---

### 6. KEY INSIGHTS FOR YOUR LLM WORKING INDICATOR

**What works well in Jacques:**
1. **Simple loading text** - "Loading files..." is clear and minimal
2. **Error states** - Red text with "✗" icon is immediately recognizable
3. **Empty states** - Distinct messages prevent confusion
4. **Fixed dimensions** - 10-row height is consistent across all views
5. **Color consistency** - Coral #E67E52 is used for all interactive elements
6. **Scroll indicators** - ▲/▼ symbols provide visual feedback
7. **State segregation** - Loading, error, empty, and content are mutually exclusive

**Design considerations for LLM working indicator:**
- Keep it **single-line or 2-3 lines max** (fits in 10-row box)
- Use the coral color (#E67E52) for visibility
- Provide **clear state transitions** (idle → working → done/error)
- Include **error messages** in red (#EF4444) if LLM fails
- Show **progress indication** (spinner, dots, percentage) if possible
- Make it **dismissible** or auto-dismiss after completion
- Consider **notification bar** pattern (used at bottom of App.tsx)

**Notification Pattern Already in Use (App.tsx):**
```tsx
const [notification, setNotification] = useState<string | null>(null);

const showNotification = useCallback((message: string, duration = 3000) => {
  setNotification(message);
  setTimeout(() => setNotification(null), duration);
}, []);

// Render
{notification && (
  <Box marginTop={1}>
    <Text color="cyan" bold>
      {notification}
    </Text>
  </Box>
)}
```

---

### 7. FILE ORGANIZATION FOR REFERENCE

Key component files:
- `/dashboard/src/components/Dashboard.tsx` - Main shell with layouts
- `/dashboard/src/components/App.tsx` - Controller with state management
- `/dashboard/src/components/ProgressBar.tsx` - Reusable progress display
- `/dashboard/src/components/ObsidianBrowserView.tsx` - Pattern example for loading/error states
- `/dashboard/src/components/HandoffBrowserView.tsx` - Alternative pattern example
- `/dashboard/src/components/SettingsView.tsx` - Shows archive stats loading pattern
- `/dashboard/src/assets/mascot-ansi.ts` - ANSI art asset

All views inherit:
- Responsive horizontal/vertical layout logic
- Consistent color palette
- Fixed 10-row height constraint
- Loading/error/empty state handling pattern
- Scroll indicator system

This architecture provides a solid foundation for creating a reusable, cohesive LLM working indicator component that matches Jacques' design language and interaction patterns.