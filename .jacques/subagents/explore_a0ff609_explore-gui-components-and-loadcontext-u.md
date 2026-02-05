# Explore: Explore GUI components and LoadContext UI

> Session: `c113e71d-f804-4875-b8a5-956015ed3948`
> Date: 2026-01-31
> Tokens: ~70 777

---

Perfect! Now let me create a comprehensive analysis document. Let me compile my findings into a clear, structured report.

## Comprehensive Analysis: Dashboard GUI Components for LoadContext Feature

Based on my thorough exploration of the codebase, here's a complete understanding of the LoadContext feature, component architecture, and navigation patterns:

---

### **1. COMPONENT ARCHITECTURE OVERVIEW**

The dashboard uses a **view-based navigation system** with centralized state management in `App.tsx`. All views share a consistent **Ink/React component pattern** with responsive layouts.

**Key File Locations:**
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/App.tsx` - State orchestrator
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/Dashboard.tsx` - View renderer
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/` - Individual view components

---

### **2. LOADCONTEXT MENU FLOW**

The flow follows a **hierarchical view stack** pattern:

```
Main Menu (main)
    ↓ Select "Load Context" (key: 2)
Load Context View (load) - Shows 2 options
    ↓ Select "Load from other sources"
Source Selection View (load-sources) - Shows Obsidian, Google Docs, Notion
    ↓ Select "Obsidian"
Obsidian Config View (obsidian-config) - If not connected
    ↓ Select vault or enter manual path
Obsidian Browser View (obsidian-browser) - File tree with folders/files
    ↓ Select a file
Add Context Confirm View (add-context-confirm) - Confirm + optional description
    ↓ Press Enter to add
Success notification → Return to main
```

**View Type Enum** (from Dashboard.tsx:28-39):
```typescript
type DashboardView = 
  | "main"
  | "save"
  | "load"
  | "load-sources"
  | "obsidian-config"
  | "obsidian-browser"
  | "add-context-confirm"
  | "fetch"
  | "settings"
  | "sessions"
  | "handoff-browser"
```

---

### **3. STATE MANAGEMENT PATTERN IN APP.tsx**

**Centralized State Approach:**
- App.tsx maintains ALL state using `useState` hooks
- State organized by feature (save flow, LoadContext flow, Obsidian config, etc.)
- Views are **stateless presentation components** - receive props, emit events via keyboard handlers

**LoadContext State Variables** (App.tsx:117-143):
```typescript
// LoadContext flow state
const [loadContextIndex, setLoadContextIndex] = useState<number>(0);
const [sourceItems, setSourceItems] = useState<SourceItem[]>([]);
const [selectedSourceIndex, setSelectedSourceIndex] = useState<number>(0);

// Obsidian config state
const [obsidianVaults, setObsidianVaults] = useState<ObsidianVault[]>([]);
const [obsidianConfigIndex, setObsidianConfigIndex] = useState<number>(0);
const [obsidianManualPath, setObsidianManualPath] = useState<string>("");
const [obsidianManualMode, setObsidianManualMode] = useState<boolean>(false);
const [obsidianConfigError, setObsidianConfigError] = useState<string | null>(null);

// Obsidian browser state
const [obsidianVaultName, setObsidianVaultName] = useState<string>("");
const [obsidianFileTree, setObsidianFileTree] = useState<FileTreeNode[]>([]);
const [obsidianExpandedFolders, setObsidianExpandedFolders] = useState<Set<string>>(new Set());
const [obsidianTreeItems, setObsidianTreeItems] = useState<FlatTreeItem[]>([]);
const [obsidianFileIndex, setObsidianFileIndex] = useState<number>(0);
const [obsidianScrollOffset, setObsidianScrollOffset] = useState<number>(0);
const [obsidianBrowserLoading, setObsidianBrowserLoading] = useState<boolean>(false);
const [obsidianBrowserError, setObsidianBrowserError] = useState<string | null>(null);

// Add context confirm state
const [selectedObsidianFile, setSelectedObsidianFile] = useState<ObsidianFile | null>(null);
const [addContextDescription, setAddContextDescription] = useState<string>("");
const [addContextSuccess, setAddContextSuccess] = useState<{ name: string; path: string } | null>(null);
const [addContextError, setAddContextError] = useState<string | null>(null);
```

---

### **4. KEYBOARD INPUT HANDLING**

**Pattern: Event-driven view-specific handlers** via `useInput` hook

App.tsx uses a massive `useInput` block (lines 573-1009) with view-specific branches:

```typescript
useInput((input, key) => {
  if (currentView === "main") {
    // Handle main menu: arrow keys, enter, q, s, a, numbers
  } else if (currentView === "load") {
    // Handle load context: up/down to navigate, return to select
  } else if (currentView === "load-sources") {
    // Handle source selection: up/down, return
  } else if (currentView === "obsidian-config") {
    // Handle vault config: up/down (nav mode) OR text input (manual mode)
  } else if (currentView === "obsidian-browser") {
    // Handle file browser: up/down with scroll management
  } else if (currentView === "add-context-confirm") {
    // Handle description input or confirmation
  }
  // ... more views
}, { isActive: isRawModeSupported });
```

**Key Navigation Patterns:**
- **Up/Down arrows**: Navigate lists, with automatic scroll offset management
- **Enter**: Select current item, move to next view
- **Escape**: Return to previous view (handled per-view)
- **Text input**: Captured character-by-character in input text states

---

### **5. FILE BROWSER COMPONENT PATTERN**

Both **ObsidianBrowserView** and **HandoffBrowserView** demonstrate a reusable browser pattern:

**From ObsidianBrowserView.tsx:**

```typescript
interface ObsidianBrowserViewProps {
  vaultName: string;
  items: FlatTreeItem[];
  selectedIndex: number;
  scrollOffset: number;
  terminalWidth: number;
  loading?: boolean;
  error?: string | null;
}

const VISIBLE_ITEMS = 6; // Fixed visible window

// Core logic:
// 1. Calculate visible window from scrollOffset + VISIBLE_ITEMS
// 2. Build content lines with:
//    - Title with scroll indicators (▲ more / ▼ more)
//    - Separator
//    - Loading/error/empty states
//    - File list with indentation and icons
//    - Footer with scroll info
// 3. Pad to FIXED_CONTENT_HEIGHT (10 lines)
// 4. Render in horizontal or vertical layout
```

**Scroll Management** (App.tsx:866-882):
```typescript
if (key.upArrow) {
  const newIndex = Math.max(0, obsidianFileIndex - 1);
  setObsidianFileIndex(newIndex);
  // Adjust scroll if needed
  if (newIndex < obsidianScrollOffset) {
    setObsidianScrollOffset(newIndex);
  }
  return;
}

if (key.downArrow) {
  const newIndex = Math.min(obsidianTreeItems.length - 1, obsidianFileIndex + 1);
  setObsidianFileIndex(newIndex);
  // Adjust scroll if needed
  if (newIndex >= obsidianScrollOffset + VISIBLE_ITEMS) {
    setObsidianScrollOffset(newIndex - VISIBLE_ITEMS + 1);
  }
  return;
}
```

---

### **6. RESPONSIVE LAYOUT SYSTEM**

All views use a **dual-layout pattern**:

**Layout Constants** (every view):
```typescript
const ACCENT_COLOR = "#E67E52";           // Coral
const MUTED_TEXT = "#8B9296";             // Gray
const BORDER_COLOR = "#E67E52";           // Coral
const MASCOT_WIDTH = 14;                  // Visual width
const MIN_CONTENT_WIDTH = 42;             // Minimum content area
const CONTENT_PADDING = 2;                // Padding around content
const HORIZONTAL_LAYOUT_MIN_WIDTH = 62;   // Break point
const FIXED_CONTENT_HEIGHT = 10;          // Fixed box height
```

**Layout Decision:**
```typescript
const useHorizontalLayout = terminalWidth >= HORIZONTAL_LAYOUT_MIN_WIDTH;
const showVersion = terminalWidth >= 70;

return useHorizontalLayout ? (
  <LayoutHorizontal ... />
) : (
  <LayoutVertical ... />
);
```

**Horizontal Layout** (with mascot + borders):
```
╭─ Jacques v0.1.0 ──────────────────────────╮
│  Mascot ASCII Art  │  Content Area         │
│                    │  (title, options,     │
│                    │   controls, etc)      │
│                    │                       │
│                    │  (10 lines fixed)     │
│                    │                       │
│                    │                       │
│                    │                       │
│                    │                       │
│                    │                       │
╰─[Enter] Select [Esc] Back ─────────────────╯
```

**Vertical Layout** (simple, no border):
```
Jacques v0.1.0

   Mascot ASCII Art
   (full width)

   Title
   ─────
   Options...
   
[↑↓] Navigate [Enter] Select [Esc] Back
```

---

### **7. VIEW COMPONENT PATTERNS**

Each view follows this structure:

**1. Props Interface:**
```typescript
interface ViewProps {
  selectedIndex?: number;        // For lists
  scrollOffset?: number;         // For scrolling
  terminalWidth: number;         // For responsive layout
  loading?: boolean;             // Optional states
  error?: string | null;         // Error messages
  // ... view-specific data
}
```

**2. Content Building:**
```typescript
const contentLines: React.ReactNode[] = [];

// Title section
contentLines.push(<Text key="title" bold color={ACCENT_COLOR}>View Title</Text>);
contentLines.push(<Text key="sep" color={MUTED_TEXT}>{"─".repeat(35)}</Text>);

// Item list or form
for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const isSelected = i === selectedIndex;
  const textColor = isSelected ? ACCENT_COLOR : "white";
  
  contentLines.push(
    <Text color={textColor} bold={isSelected}>
      {isSelected ? "> " : "  "}
      {item.label}
      {isSelected && <Text color={ACCENT_COLOR}>_</Text>}
    </Text>
  );
}

// Pad to fixed height
while (contentLines.length < FIXED_CONTENT_HEIGHT) {
  contentLines.push(<Box key={`pad-${contentLines.length}`} />);
}
```

**3. Layout Rendering:**
```typescript
return (
  <Box width={terminalWidth} flexDirection="column">
    {useHorizontalLayout ? (
      <ViewHorizontalLayout content={contentLines} terminalWidth={terminalWidth} showVersion={showVersion} />
    ) : (
      <ViewVerticalLayout content={contentLines} showVersion={showVersion} />
    )}
  </Box>
);
```

---

### **8. CORE NAVIGATION TRANSITIONS**

**From App.tsx keyboard handlers:**

**Load Context Selection** (line 330-342):
```typescript
const handleLoadContextSelect = useCallback(async (index: number) => {
  const option = LOAD_OPTIONS[index];
  if (!option.enabled) return;

  if (option.key === "sources") {
    const isConnected = isObsidianConfigured();
    setSourceItems(buildSourceItems(isConnected));
    setSelectedSourceIndex(0);
    setCurrentView("load-sources");  // ← View transition
  }
}, []);
```

**Source Selection** (line 370-396):
```typescript
const handleSourceSelect = useCallback(async (index: number) => {
  const source = sourceItems[index];
  if (!source?.enabled) return;

  if (source.key === "obsidian") {
    if (source.connected) {
      const vaultPath = getObsidianVaultPath();
      setObsidianVaultName(getVaultName(vaultPath));
      setCurrentView("obsidian-browser");  // ← Skip config, go to browser
      await loadVaultTree(vaultPath);
    } else {
      setCurrentView("obsidian-config");   // ← Ask for config first
      const vaults = await detectObsidianVaults();
      setObsidianVaults(vaults);
      setObsidianConfigIndex(0);
    }
  }
}, [sourceItems, loadVaultTree]);
```

**Obsidian Item Selection** (line 466-487):
```typescript
const handleObsidianItemSelect = useCallback((index: number) => {
  const item = obsidianTreeItems[index];
  if (!item) return;

  if (item.type === "folder") {
    toggleObsidianFolder(item.id);  // ← Toggle expand
  } else {
    setSelectedObsidianFile({...});
    setCurrentView("add-context-confirm");  // ← Move to confirm
  }
}, [obsidianTreeItems, toggleObsidianFolder]);
```

**Return to Main** (line 288-327):
```typescript
const returnToMain = useCallback(() => {
  setCurrentView("main");
  setSelectedMenuIndex(0);
  // Reset ALL sub-view state
  setLoadContextIndex(0);
  setSourceItems([]);
  // ... reset everything else
}, []);
```

---

### **9. LIST SELECTION WITH SCROLL PATTERN**

Both **ObsidianBrowserView** and **HandoffBrowserView** show the scroll pattern:

```typescript
// Calculate visible window
const totalItems = items.length;
const canScrollUp = scrollOffset > 0;
const canScrollDown = scrollOffset + VISIBLE_ITEMS < totalItems;

// Get visible slice
const visibleItems = items.slice(scrollOffset, scrollOffset + VISIBLE_ITEMS);

// Add scroll indicators
if (canScrollUp) {
  contentLines.push(
    <Text>
      <Text bold color={ACCENT_COLOR}>Title </Text>
      <Text color={MUTED_TEXT}>▲ more</Text>
    </Text>
  );
} else {
  contentLines.push(<Text bold color={ACCENT_COLOR}>Title</Text>);
}

// ... render items ...

// Scroll down indicator
if (canScrollDown) {
  contentLines.push(
    <Text color={MUTED_TEXT}>
      ▼ {totalItems - scrollOffset - VISIBLE_ITEMS} more
    </Text>
  );
}
```

---

### **10. FORM INPUT PATTERN**

**Text Input** (Description field in AddContextConfirmView):

From App.tsx (lines 911-923):
```typescript
if (!addContextError) {
  if (key.backspace || key.delete) {
    setAddContextDescription((prev) => prev.slice(0, -1));
    return;
  }

  // Add character to description (any single character)
  if (input && input.length === 1) {
    setAddContextDescription((prev) => prev + input);
    return;
  }
}
```

**Rendering**:
```typescript
<Text key="desc-input">
  {description}
  <Text color={ACCENT_COLOR}>_</Text>  {/* Cursor indicator */}
</Text>
```

---

### **11. ERROR AND SUCCESS STATE HANDLING**

**ObsidianBrowserView** (lines 84-108):
```typescript
if (loading) {
  contentLines.push(<Text key="loading" color={MUTED_TEXT}>Loading files...</Text>);
} else if (error) {
  contentLines.push(<Text key="error" color="#EF4444">✗ {error}</Text>);
} else if (items.length === 0) {
  contentLines.push(<Text key="empty" color={MUTED_TEXT}>No markdown files found</Text>);
} else {
  // Render items...
}
```

**AddContextConfirmView** (lines 51-132):
```typescript
if (success) {
  // Success view (readonly, shows results)
  contentLines.push(<Text color={SUCCESS_COLOR}>✓ Context added</Text>);
  // ... show file details ...
} else if (error) {
  // Error view (readonly, shows error)
  contentLines.push(<Text color={ERROR_COLOR}>✗ {error}</Text>);
} else {
  // Confirm form (interactive)
  // ... show file details + description input ...
}
```

---

### **12. FOLDER EXPAND/COLLAPSE PATTERN**

From App.tsx (lines 450-463):

```typescript
const toggleObsidianFolder = useCallback((folderId: string) => {
  setObsidianExpandedFolders((prev) => {
    const next = new Set(prev);
    if (next.has(folderId)) {
      next.delete(folderId);
    } else {
      next.add(folderId);
    }
    // Re-flatten the tree with new expanded state
    const items = flattenTree(obsidianFileTree, next);
    setObsidianTreeItems(items);
    return next;
  });
}, [obsidianFileTree]);
```

**UI Indicators** (ObsidianBrowserView line 124):
```typescript
if (item.type === "folder") {
  icon = item.isExpanded ? "▼ " : "▶ ";
  suffix = ` (${item.fileCount})`;
}
```

---

### **13. COLORS AND STYLING CONSTANTS**

Consistent throughout all views:
```typescript
const ACCENT_COLOR = "#E67E52";           // Coral/peach (mascot skin tone)
const MUTED_TEXT = "#8B9296";             // Muted gray
const BORDER_COLOR = "#E67E52";           // Coral
const SUCCESS_COLOR = "#4ADE80";          // Green (used in sources)
const ERROR_COLOR = "#EF4444";            // Red
```

---

### **14. EXISTING REUSABLE COMPONENTS**

Beyond views, these components exist and are used:

- **ProgressBar**: Progress visualization with percentage
- **ContentBox**: Bordered box component
- **VerticalMenu**: Menu item rendering helper
- **ImageMascot / Mascot**: Mascot rendering

---

### **SUMMARY: Design Patterns for New File Explorer**

For designing a new file explorer component, follow these patterns:

1. **Props Interface**: Accept `selectedIndex`, `scrollOffset`, `terminalWidth`, `loading`, `error`, plus data-specific props
2. **Content Building**: Build array of React elements, pad to `FIXED_CONTENT_HEIGHT`
3. **Scroll Management**: Track `scrollOffset` and `selectedIndex` separately; adjust scroll when navigating
4. **Layout**: Dual horizontal/vertical with responsive breakpoint at `HORIZONTAL_LAYOUT_MIN_WIDTH = 62`
5. **State**: Manage in App.tsx via `useState` hooks, passed down as props
6. **Keyboard**: Handle in App.tsx's `useInput` view-specific branch
7. **Navigation**: Transition views via `setCurrentView()` and update related state
8. **UI Elements**: Use consistent colors, icons (▼/▶/●/○), indentation for hierarchy
9. **States**: Handle loading/error/empty/normal states clearly
10. **Input**: Character-by-character text capture with backspace support

---

This architecture is clean, maintainable, and provides a solid foundation for extending with new file explorer features!