# Explore: Find actual menu being used

> Session: `b6aa3c40-2343-4f1d-be54-5e181c7ddcaa`
> Date: 2026-02-01
> Tokens: ~60 679

---

Perfect! I now have a complete understanding. Let me provide a comprehensive report.

## Jacques Dashboard CLI Menu Analysis

### CLI Entry Point

When `jacques` or `shack` is run:

1. **Entry point**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/cli.ts` (lines 1-338)
2. **Command**: `jacques dashboard` is the default command (line 212), or simply `jacques` triggers it
3. **Process**:
   - Checks for TTY (interactive terminal)
   - Starts embedded server in silent mode
   - Enters alternate screen buffer (`\x1b[?1049h`)
   - Renders `<App />` component using Ink

### Menu Definition - THREE Different Constants Found

There are **THREE separate menu item definitions** in the codebase, which represents a discrepancy:

#### 1. **Menu.tsx** - `DEFAULT_MENU_ITEMS` (NOT USED IN MAIN VIEW)
**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/Menu.tsx` (lines 25-31)

```typescript
export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { key: "1", icon: "💾", label: "Save Current Context", enabled: true },
  { key: "2", icon: "📂", label: "Load Context", enabled: false },
  { key: "3", icon: "📝", label: "Create Handoff", enabled: true },
  { key: "4", icon: "⚙️ ", label: "Settings", enabled: false },
  { key: "5", icon: "❌", label: "Quit", enabled: true },
];
```

**Status**: Exported in `/dashboard/src/components/index.ts` line 10, but **NOT USED** anywhere in the active codebase.

#### 2. **App.tsx** - `MENU_ITEMS` (USED FOR KEYBOARD NAVIGATION)
**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/App.tsx` (lines 805-810)

```typescript
const MENU_ITEMS = [
  { key: "1", label: "Save Context", enabled: true },
  { key: "2", label: "Load Context", enabled: true },
  { key: "3", label: "Fetch Context", enabled: false },
  { key: "4", label: "Active Sessions", enabled: true },
];
```

**Status**: Used for keyboard navigation logic (up/down arrows, Enter key, number keys) at lines 823, 830, 878.

#### 3. **Dashboard.tsx** - `MENU_ITEMS` (ACTUALLY RENDERED TO USER)
**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/Dashboard.tsx` (lines 518-523)

```typescript
const MENU_ITEMS: VerticalMenuItem[] = [
  { key: "1", label: "Save Context", enabled: true },
  { key: "2", label: "Load Context", enabled: true },
  { key: "3", label: "Fetch Context", enabled: false },
  { key: "4", label: `Active Sessions (${sessions.length})`, enabled: true },
];
```

**Status**: **ACTUALLY RENDERED** to the user at lines 740-754. Features dynamic session count.

### Which Menu Items Are Actually Displayed to the User?

**Dashboard.tsx's MENU_ITEMS** are what the user sees. This component renders them at lines 740-754:

```typescript
...MENU_ITEMS.map((item, index) => {
  const isSelected = index === selectedMenuIndex;
  const textColor = item.enabled
    ? isSelected
      ? ACCENT_COLOR
      : "white"
    : MUTED_TEXT;

  return (
    <Text key={item.key} color={textColor} bold={isSelected}>
      {isSelected ? "> " : "  "}
      {item.label}
    </Text>
  );
})
```

### Summary of Discrepancies

| File | Constant | Used For | Status |
|------|----------|----------|--------|
| Menu.tsx | `DEFAULT_MENU_ITEMS` | Dead code/legacy | Exported but unused |
| App.tsx | `MENU_ITEMS` | Keyboard navigation bounds | Local to App, used for input handling |
| Dashboard.tsx | `MENU_ITEMS` | **Rendering to user** | **Actually displayed** |

### Key Differences Between Them

1. **Menu.tsx**: Has 5 items, includes "Settings" and "Quit" (with emoji icons)
2. **App.tsx & Dashboard.tsx**: Have 4 items, label is "Fetch Context" (not "Create Handoff"), include "Active Sessions"
3. **Dashboard.tsx only**: Dynamically adds session count to "Active Sessions" label

### Conclusion

**The menu items actually rendered to the user come from `Dashboard.tsx` lines 518-523**. The `DEFAULT_MENU_ITEMS` in Menu.tsx appears to be legacy code that's no longer in use.