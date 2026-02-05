# Explore: Explore layout and height structure

> Session: `f39b0117-a297-4e14-97ff-791b1c0dd632`
> Date: 2026-02-03
> Tokens: ~36 226

---

Perfect! I now have all the key files. Let me compile a comprehensive analysis of the layout height chain.

## Full Layout Height Chain Analysis

### 1. **Global Base (HTML → #root)**

**File: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/styles/globals.css`**

```css
html {
  font-size: 14px;
  line-height: 1.4;
  /* ... */
}

body {
  min-height: 100vh;
  /* ... */
}

#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
```

**Root properties:**
- `min-height: 100vh` - Takes full viewport height
- `display: flex; flex-direction: column` - Flex column container
- This stretches to fill the viewport vertically

---

### 2. **Layout Container**

**File: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/Layout.tsx` (lines 170-182)**

```typescript
container: {
  display: 'flex',
  height: '100vh',           // ← EXACT height
  overflow: 'hidden',        // ← Prevents scrolling on container itself
}

contentArea: {
  flex: 1,                   // ← Takes all remaining space after sidebar
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  overflow: 'hidden',        // ← Prevents overflow
}

sidebar: {
  width: '240px',
  flexShrink: 0,             // ← Fixed width, doesn't shrink
  // ... other styles
}
```

**Layout structure:**
```
<Layout>
  container { display: flex; height: 100vh; overflow: hidden; }
    ├─ sidebar { width: 240px; flexShrink: 0; }
    └─ contentArea { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
```

The container takes exactly `100vh` and hides overflow. This means **no scrollbar on the container itself**.

---

### 3. **Content Area (Main + MultiLogPanel)**

**File: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/Layout.tsx` (lines 155-165)**

```typescript
<div style={styles.contentArea}>
  <main style={styles.main}>
    <Outlet />  {/* ← ProjectDashboard rendered here */}
  </main>

  <MultiLogPanel
    serverLogs={serverLogs}
    apiLogs={apiLogs}
    claudeOperations={claudeOperations}
  />
</div>
```

**Layout structure:**
```
contentArea { flex: 1; display: flex; flex-direction: column; overflow: hidden; height: 100vh - 240px (sidebar) }
  ├─ main { flex: 1; overflow: auto; minHeight: 0; }
  └─ MultiLogPanel { height: 250px (default, resizable 60-600px); flexShrink: 0; }
```

---

### 4. **Main Content Area**

**File: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/Layout.tsx` (lines 270-275)**

```typescript
main: {
  flex: 1,              // ← Takes all remaining space after MultiLogPanel
  padding: 0,
  overflow: 'auto',     // ← Scrollable
  minHeight: 0,         // ← Critical: allows flex child to shrink below content size
}
```

**Key heights:**
- **Default:** `contentArea height - MultiLogPanel.defaultHeight`
- **With defaults:** `(100vh) - 250px`
- **Scrollable:** Yes (`overflow: auto`)
- **Min height:** 0 (allows shrinking below content size)

---

### 5. **MultiLogPanel (Resizable Bottom Panel)**

**File: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/MultiLogPanel.tsx` (lines 8-13, 631-735)**

```typescript
const DEFAULT_PANEL_HEIGHT = 250;    // ← Default height
const MIN_PANEL_HEIGHT = 60;         // ← Minimum height (header only)
const MAX_PANEL_HEIGHT = 600;        // ← Maximum height
const HEADER_HEIGHT = 40;            // ← Header bar height

// Container
container: {
  position: 'relative',
  backgroundColor: colors.bgSecondary,
  borderTop: `2px solid ${colors.borderSubtle}`,
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,                      // ← Never shrinks
  transition: 'height 150ms ease',
}

header: {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
  borderBottom: `1px solid ${colors.borderSubtle}`,
  cursor: 'pointer',
  userSelect: 'none',
  // Note: height not explicitly set; derived from content + padding
}

logContainer: {
  flex: 1,                            // ← Takes remaining space after header
  overflowY: 'auto',                  // ← Scrollable
  padding: '8px 16px',
  fontFamily: 'monospace',
  fontSize: '12px',
  minHeight: 0,                       // ← Critical: allows flex to shrink
}
```

**Panel state logic:**

```typescript
const isExpanded = panelHeight > HEADER_HEIGHT + 20;  // ← Expansion threshold

return (
  <div style={{ ...styles.container, height: panelHeight }}>
    {/* Resize handle */}
    <div style={styles.resizeHandle} />
    
    {/* Header */}
    <div style={styles.header} onClick={toggleExpanded} />
    
    {/* Log content - only rendered if expanded */}
    {isExpanded && (
      <div ref={logContainerRef} style={styles.logContainer}>
        {renderContent()}
      </div>
    )}
  </div>
);
```

**Dynamic height behavior:**
- **Stored in localStorage:** `jacques-log-panel-height`
- **Default on first load:** 250px
- **Range:** 60px–600px (user draggable)
- **Resize handle:** 8px above panel (absolute positioning at `top: -8px`)
- **Collapse threshold:** Height ≤ (40px header + 20px threshold) hides content
- **Collapsed appearance:** Shows only header with resize grip + tabs with counts

---

### 6. **ProjectDashboard (Main Content)**

**File: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/pages/ProjectDashboard.tsx` (lines 581-597)**

```typescript
viewport: {
  width: '100%',
  height: '100%',              // ← Fills parent <main>
  backgroundColor: PALETTE.bg,
  overflowY: 'auto',           // ← Scrollable
  overflowX: 'hidden',
}

container: {
  padding: '24px 32px',
  fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
  display: 'flex',
  flexDirection: 'column',
  gap: '32px',
}
```

**Structure:**
```
ProjectDashboard rendered in <main>
  ├─ viewport { width: 100%; height: 100%; overflow: auto; }
  │   └─ container { display: flex; flex-direction: column; gap: 32px; }
  │       ├─ header
  │       ├─ sections (4x)
  │       │   ├─ Active Sessions (horizontal scroll, no fixed height)
  │       │   ├─ Session History (ScrollableList, maxHeight: 500px)
  │       │   └─ Assets (3-column grid, no fixed height)
```

---

## Complete Height Chain Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Viewport (100vh)                                                │
│ #root { min-height: 100vh; flex-direction: column; }           │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Layout.container { height: 100vh; overflow: hidden; }      │  │
│ │                                                             │  │
│ │ ┌──────────────┬─────────────────────────────────────────┐ │  │
│ │ │ Sidebar      │ contentArea { flex: 1; flex-dir: col; }│ │  │
│ │ │ 240px        │                                         │ │  │
│ │ │ flexShrink:0 │ ┌──────────────────────────────────┐   │ │  │
│ │ │              │ │ main { flex: 1; overflow: auto; }│   │ │  │
│ │ │              │ │ minHeight: 0;                     │   │ │  │
│ │ │              │ │ (100vh - 240px - MultiLogHeight) │   │ │  │
│ │ │              │ │                                   │   │ │  │
│ │ │              │ │ ┌──────────────────────────────┐  │   │ │  │
│ │ │              │ │ │ ProjectDashboard             │  │   │ │  │
│ │ │              │ │ │ viewport {width:100%,height:│  │   │ │  │
│ │ │              │ │ │ 100%, overflow: auto}        │  │   │ │  │
│ │ │              │ │ │                              │  │   │ │  │
│ │ │              │ │ │ container { flexDir: col;    │  │   │ │  │
│ │ │              │ │ │ gap: 32px; padding: 24px }   │  │   │ │  │
│ │ │              │ │ │                              │  │   │ │  │
│ │ │              │ │ │ [Header + 4 Sections]        │  │   │ │  │
│ │ │              │ │ └──────────────────────────────┘  │   │ │  │
│ │ │              │ └──────────────────────────────────┘   │ │  │
│ │ │              │                                         │ │  │
│ │ │              │ ┌──────────────────────────────────┐   │ │  │
│ │ │              │ │ MultiLogPanel                    │   │ │  │
│ │ │              │ │ height: 60–600px (default 250)  │   │ │  │
│ │ │              │ │ flexShrink: 0                   │   │ │  │
│ │ │              │ │                                  │   │ │  │
│ │ │              │ │ ┌────────────────────────────┐   │   │ │  │
│ │ │              │ │ │ Header + Tabs (40px+)      │   │   │ │  │
│ │ │              │ │ ├────────────────────────────┤   │   │ │  │
│ │ │              │ │ │ LogContainer { flex: 1;    │   │   │ │  │
│ │ │              │ │ │ overflow: auto; minH: 0; } │   │   │ │  │
│ │ │              │ │ │ (only if expanded)         │   │   │ │  │
│ │ │              │ │ └────────────────────────────┘   │   │ │  │
│ │ │              │ └──────────────────────────────────┘   │ │  │
│ │ │              │                                         │ │  │
│ │ └──────────────┴─────────────────────────────────────────┘ │  │
│ │                                                             │  │
│ └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Sizing Constants & Calculations

| Component | Height | Type | Notes |
|-----------|--------|------|-------|
| **Container** | 100vh | Fixed | Exact viewport height, no overflow |
| **Sidebar** | 100vh | N/A | Full height, 240px width |
| **ContentArea** | 100vh - 240px | Flex | Flex column, fills remaining space |
| **Main** | Remaining - MultiLogPanel height | Flex | Flex: 1, scrollable |
| **MultiLogPanel** | 60–600px (default 250px) | Resizable | User-draggable, stored in localStorage |
| **ResizeHandle** | 16px | Absolute | Positioned 8px above panel (`top: -8px`) |
| **Header (Log)** | ~40px | Content | Tabs + expand button |
| **LogContainer** | Height - Header | Flex | Flex: 1, scrollable, minHeight: 0 |

---

## Critical CSS Properties for Layout Integrity

### Why `minHeight: 0` matters:
- **Main:** `minHeight: 0` allows it to shrink below its content when MultiLogPanel is expanded
- **LogContainer:** `minHeight: 0` allows it to shrink below log content height

### Why `overflow: hidden` matters:
- **Layout.container:** Prevents scrollbar on main container
- **ContentArea:** Prevents overflow within the flex column

### Why `flexShrink: 0` matters:
- **Sidebar:** Won't compress when space is tight
- **MultiLogPanel:** Won't shrink below user-set height

---

## Responsive Behavior

**When resizing MultiLogPanel:**
1. User drags resize handle (8px region above panel)
2. `panelHeight` state updates (constrained: 60–600px)
3. Saved to localStorage (`jacques-log-panel-height`)
4. `main` recalculates: `contentArea height - panelHeight`
5. ProjectDashboard content scrolls if it exceeds main height

**When collapsing (double-click resize handle):**
- If expanded: Sets height to 60px (MIN_PANEL_HEIGHT)
- If collapsed: Sets height to 250px (DEFAULT_PANEL_HEIGHT)
- Content hidden when height ≤ 60px (header + 20px threshold)

---

## Summary

The layout uses a **nested flexbox** hierarchy with **exact viewport sizing** at the top:

1. **#root** (100vh) → Flex column base
2. **Layout.container** (100vh) → Horizontal flex with sidebar + contentArea
3. **contentArea** (flex: 1) → Vertical flex containing main + MultiLogPanel
4. **main** (flex: 1) → Scrollable, shrinks to accommodate MultiLogPanel
5. **MultiLogPanel** (60–600px, flexShrink: 0) → Resizable, always takes its height
6. **ProjectDashboard** (100% of main) → Scrollable viewport with sections

The key is **`minHeight: 0` on flex children** and **`overflow: hidden` on containers** to prevent layout thrashing when content exceeds available space.