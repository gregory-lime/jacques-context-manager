# Explore: Explore Layout and MultiLogPanel

> Session: `f39b0117-a297-4e14-97ff-791b1c0dd632`
> Date: 2026-02-03
> Tokens: ~56 868

---

Perfect! Now I have all the information needed. Let me create a comprehensive analysis report.

## Complete Layout & MultiLogPanel Structure Analysis

I've thoroughly explored the Layout component, MultiLogPanel integration, and the skeleton loading system. Here's the complete analysis:

---

### **1. Layout.tsx - Full Structure (277 lines)**

**Overall Architecture:**
- **Container**: `display: flex; height: 100vh; overflow: hidden` (full viewport)
- **Sidebar**: Fixed `240px` width on the left
- **Content Area**: Flexing column that fills remaining space

**Sidebar Structure (lines 54-152):**
```
sidebar (240px, flexDirection: column)
├── logoSection (logo + "Jacques" text)
├── blockSeparator (gradient line)
├── ProjectSelector
├── nav (navigation items)
│   ├── Dashboard
│   ├── Project
│   ├── Conversations
│   ├── Archive
│   └── Context
├── sourcesSection (marginTop: auto)
│   ├── Sources header
│   ├── Obsidian (with status dot)
│   ├── Google Docs
│   └── Notion
└── sidebarFooter (borderTop, marginTop: auto)
    └── Settings link
```

**Key Sidebar Styles:**
- `sidebar`: `width: 240px`, `borderRight: 1px solid ${borderSubtle}`, `display: flex`, `flexDirection: column`, `padding: 16px 0`
- `sourcesSection`: `marginTop: auto` + `padding: 16px 8px 0` + `borderTop: 1px solid ${borderSubtle}` (pushes it to bottom)
- `sidebarFooter`: `padding: 12px 8px 0`, `borderTop: 1px solid ${borderSubtle}`, `marginTop: 16px` (always at bottom)
- Navigation items: `display: flex`, `gap: 2px`, `padding: 0 8px`

**Content Area Structure (lines 155-165):**
```
contentArea (flex: 1, flexDirection: column, minWidth: 0, overflow: hidden)
├── main (flex: 1, overflow: auto, minHeight: 0)
│   └── Outlet (page content)
└── MultiLogPanel (flex: 0, fixed height based on state)
```

**Key Content Area Styles:**
```javascript
contentArea: {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,        // Prevents flex overflow
  overflow: 'hidden', // Hides overflow, MultiLogPanel handles scrolling
}
main: {
  flex: 1,
  padding: 0,
  overflow: 'auto',
  minHeight: 0,       // Allows flex child to shrink below content size
}
```

**Navigation Active State:**
- Active indicator: `position: absolute`, `left: -8px`, `width: 2px`, `height: 16px` (thin left bar)
- Active background: `backgroundColor: ${bgElevated}`
- Active color: `color: ${accent}`

---

### **2. MultiLogPanel.tsx - Complete Structure (1032 lines)**

**Props Interface (lines 53-58):**
```typescript
interface MultiLogPanelProps {
  serverLogs: ServerLog[];
  apiLogs: ApiLog[];
  claudeOperations: ClaudeOperation[];
  maxLogs?: number;
}
```

**Height Management State (lines 117-126):**
```typescript
const [panelHeight, setPanelHeight] = useState(() => {
  const saved = localStorage.getItem(PANEL_HEIGHT_KEY);
  return saved ? parseInt(saved, 10) : DEFAULT_PANEL_HEIGHT;
});
const [isDragging, setIsDragging] = useState(false);
const dragStartY = useRef(0);
const dragStartHeight = useRef(0);
const isExpanded = panelHeight > HEADER_HEIGHT + 20; // Shows content if > 60px
```

**Constants (lines 8-13):**
```typescript
const PANEL_HEIGHT_KEY = 'jacques-log-panel-height';
const DEFAULT_PANEL_HEIGHT = 250;
const MIN_PANEL_HEIGHT = 60;   // Just header
const MAX_PANEL_HEIGHT = 600;
const HEADER_HEIGHT = 40;
```

**Resize Handle Logic (lines 163-177):**
- `handleResizeStart`: Records `dragStartY` and `dragStartHeight`, sets `isDragging: true`
- `handleMouseMove`: Calculates `delta = dragStartY - e.clientY`, applies constraints with `Math.min/max`
- `handleMouseUp`: Sets `isDragging: false`
- `handleResizeDoubleClick`: Toggles between `MIN_PANEL_HEIGHT` and `DEFAULT_PANEL_HEIGHT`
- Height is persisted to localStorage on every change (line 130)

**Resize Handle Styles (lines 748-778):**
```javascript
resizeHandle: {
  position: 'absolute',
  top: -8,                    // 8px above container (overlap)
  left: 0, right: 0,
  height: '16px',
  cursor: 'row-resize',
  backgroundColor: 'transparent',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 150ms ease',
}
resizeGrip: {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  padding: '4px 30px',
  backgroundColor: colors.bgSecondary,
  borderRadius: '4px 4px 0 0',
  border: `1px solid ${colors.borderSubtle}`,
  borderBottom: 'none',
}
resizeGripBar: {
  width: '50px',
  height: '3px',
  backgroundColor: colors.textMuted,
  borderRadius: '2px',
  opacity: 0.6,
}
```

**Container Styles (lines 738-747):**
```javascript
container: {
  position: 'relative',
  backgroundColor: colors.bgSecondary,
  borderTop: `2px solid ${colors.borderSubtle}`,
  boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.15)',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  transition: 'height 150ms ease',
}
```

**Tab/Header Layout (lines 779-825):**
```javascript
header: {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
  borderBottom: `1px solid ${colors.borderSubtle}`,
  cursor: 'pointer',
  userSelect: 'none',
}
tabs: {
  display: 'flex',
  gap: '0',  // No gap between tabs
}
tab: {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 12px',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  cursor: 'pointer',
}
logContainer: {
  flex: 1,
  overflowY: 'auto',
  padding: '8px 16px',
  fontFamily: 'monospace',
  fontSize: '12px',
  backgroundColor: colors.bgPrimary,
  minHeight: 0,  // Allows shrinking
}
```

**Rendering Structure (lines 631-735):**
```javascript
<div style={container}>
  {/* Resize handle (always visible) */}
  <div style={resizeHandle} onMouseDown={handleResizeStart} onDoubleClick={handleResizeDoubleClick}>
    <div style={resizeGrip}>
      <div style={resizeGripBar} />
      <div style={resizeGripBar} />
    </div>
  </div>

  {/* Header / Tab bar */}
  <div style={header} onClick={toggleExpanded}>
    <div style={tabs} onClick={(e) => e.stopPropagation()}>
      {/* Tab buttons with badges */}
    </div>
    <div style={expandArea}>
      <span>{isExpanded ? '▾ collapse' : '▴ expand'}</span>
    </div>
  </div>

  {/* Log content (only rendered if isExpanded) */}
  {isExpanded && (
    <div ref={logContainerRef} style={logContainer} onScroll={handleScroll}>
      {renderContent()}
    </div>
  )}

  {/* Auto-scroll button */}
  {isExpanded && !autoScroll && (
    <button style={scrollButton}>↓ Scroll to bottom</button>
  )}

  {/* Debug detail panel (overlay) */}
  {selectedDebug && renderDebugPanel()}
</div>
```

**Export:**
```typescript
export function MultiLogPanel({...}: MultiLogPanelProps) { ... }
export default MultiLogPanel;
```

---

### **3. Sidebar Component Structure**

**No separate sidebar component** — everything is inline in `Layout.tsx` with these sections:

| Section | Purpose | Flex Behavior |
|---------|---------|--------------|
| Logo | Brand identity | `flexShrink: 0` |
| Separator | Visual divider | `flexShrink: 0` |
| ProjectSelector | Project scope selection | `flexShrink: 0` |
| Navigation | Main menu items | `flexShrink: 0` |
| Sources | Obsidian/Google Docs/Notion | `marginTop: auto` (pushes down) |
| Footer/Settings | Settings button | `marginTop: 16px`, at bottom |

---

### **4. Skeleton Loading System**

**Global CSS Definition (globals.css lines 321-331):**
```css
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.jacques-skeleton {
  background: linear-gradient(90deg, #1a1a1a 25%, #252525 50%, #1a1a1a 75%);
  background-size: 800px 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 8px;
}
```

**Session History Skeleton (ProjectDashboard.tsx lines 448-452):**
```typescript
{loading ? (
  <div style={{ ...styles.historyList, flex: 1, overflowY: 'auto', minHeight: 0 }}>
    {Array.from({ length: 8 }, (_, i) => (
      <SkeletonRow key={i} height={44} />
    ))}
  </div>
```

**SkeletonRow Implementation (line 249-251):**
```typescript
function SkeletonRow({ height }: { height: number }) {
  return <div className="jacques-skeleton" style={{ height, width: '100%' }} />;
}
```

**Actual History Row Structure (lines 698-751):**
```javascript
historyRow: {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '12px 16px',
  backgroundColor: PALETTE.bgCard,      // #1a1a1a
  borderRadius: '8px',
  border: `1px solid ${PALETTE.textDim}18`,
}
historyRowMain: {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
}
historyBadgeRow: {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  paddingLeft: '22px',
}
```

**Animation Classes (globals.css lines 210-212):**
```css
.jacques-animate-in {
  animation: slide-in 0.3s ease-out forwards;
}

@keyframes slide-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

### **5. Integration Points**

**Layout → MultiLogPanel (lines 160-164):**
```typescript
<MultiLogPanel
  serverLogs={serverLogs}
  apiLogs={apiLogs}
  claudeOperations={claudeOperations}
/>
```

**Data Flow:**
1. `Layout` hooks into `useJacquesClient()` (line 30)
2. Receives `serverLogs`, `apiLogs`, `claudeOperations` from hook
3. Passes directly to `MultiLogPanel` as props
4. `MultiLogPanel` manages its own internal state (height, tabs, expand/collapse)

**Key Layout Constraint:**
- `contentArea: minWidth: 0` + `overflow: hidden` prevents flex overflow
- `main: minHeight: 0` allows it to shrink when MultiLogPanel expands
- `MultiLogPanel: flexShrink: 0` ensures it never shrinks below its computed height

---

### **Summary for Implementation**

**Key Takeaways:**
1. **Layout is a two-part sidebar + content area** with MultiLogPanel at the bottom of content
2. **Sidebar sections use `marginTop: auto`** to push Settings to bottom
3. **MultiLogPanel has 3 resize states**: collapsed (60px header only), expanded (250-600px), with persistent localStorage
4. **Skeleton loading uses CSS shimmer animation** applied to `.jacques-skeleton` with `height` prop only
5. **History row skeleton should match actual row height** (44px) with same structure (flex column with gap)
6. **All animations use `animation-delay`** for staggered entrance (line 472: `animationDelay: ${index * 40}ms`)

This gives you everything needed to implement the skeleton loading for history rows to match the real row styling and animations.