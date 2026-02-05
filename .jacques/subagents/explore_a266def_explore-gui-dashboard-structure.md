# Explore: Explore GUI dashboard structure

> Session: `f8b4534e-0e5f-47ce-a628-13ec9ab99113`
> Date: 2026-02-04
> Tokens: ~76 405

---

Perfect! Now let me compile my comprehensive findings. Let me create a summary document:

## Summary: GUI Dashboard Codebase Exploration

Based on my thorough exploration of the Jacques GUI dashboard, here's a comprehensive breakdown of the architecture, layout, components, and styling:

### 1. **Main Dashboard Page Layout & Components**

**File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Dashboard.tsx` (1,089 lines)

The Dashboard has a **vertical flex layout** with 5 main sections:

```
┌─ Header (flex-shrink: 0)
│  ├─ Project name + path (~24px)
│  └─ Stats pills (sessions, input/output tokens, plans, explores, searches)
├─ Active Sessions (flex-shrink: 0, horizontal scroll)
│  └─ SessionCard components in a flex row
├─ Session History (flex: 1, scrollable)
│  └─ Vertically stacked history rows
├─ Assets Section (flex-shrink: 0)
│  └─ 3 asset columns in CSS Grid
└─ ContentModal (overlay when viewing plan/explore/search)
```

**Key Container Style:**
- `flex-direction: column`
- `gap: 24px` between sections
- `height: 100%` with `overflow: hidden`
- `padding: 24px 32px`

### 2. **Grid/Flex Layout for Cards**

**Active Sessions:**
- **Layout:** `flex` (horizontal scroll)
- **Gap:** `16px`
- **Card size:** `minWidth: 340px` / `maxWidth: 340px`
- **Behavior:** Horizontal scrolling with fade gradient on right edge
- **Classes:** `.jacques-horizontal-scroll` with smooth scrolling

**Asset Cards (Plans, Explorations, Web Searches):**
- **Layout:** CSS Grid with `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`
- **Gap:** `20px`
- **Responsive:** Automatically adapts number of columns based on width
- **Minimum column width:** `280px`
- **Maximum columns:** Unlimited with `1fr` allocation

### 3. **Session Display (Working vs Idle, Focused vs Unfocused)**

**File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/components/SessionCard.tsx` (333 lines)

**Session Card Structure:**
```
┌─ Header (space-between)
│  ├─ Left: Status dot + status text + mode pill (planning/executing)
│  └─ Right: Model name + time ago
├─ Title row (with plan icon if applicable)
├─ Context Meter (progress bar)
└─ Footer
   ├─ Left: Plan count + Agent count buttons
   ├─ Center: MCP/Web search/Auto-compact icons
   └─ Right: "Click to view →" hint
```

**Status Styling:**
- **Working:** Coral (#E67E52) with pulse animation
- **Idle:** Dark gray (#6B7075) no animation
- **Active:** Green (#4ADE80) no animation

**Focused Session:**
- Border color changes to `colors.accent` (#E67E52)
- Adds left border width: `3px`
- Adds glow shadow: `0 0 16px rgba(230, 126, 82, 0.15)`
- Padding adjusted: `paddingLeft: 18px` to compensate for border

**Padding Issues:**
- Card padding: `20px` (all sides)
- When focused, left padding adjusted to `18px` to account for 3px border
- Footer has dynamic height based on content (minimum 20px)

### 4. **Plans Display**

Plans are displayed in multiple places:

**A. Session Card Footer:**
- Small button showing plan count
- Icon: `<PlanIcon size={13} />`
- Color: `#34D399` (green)
- Onclick navigates to full session viewer

**B. Session History Rows:**
- Plan icon appears next to title if session started with plan
- Shows session plan count: `{session.planCount}`

**C. Assets Grid (Bottom Section):**
- **"PLANS" Column** with list of plans
- Each plan item shows:
  - Colored left accent bar (3px wide, #34D399)
  - Plan icon in background box
  - Plan title text
  - Session count: `"Plan Title (3)"` if used in multiple sessions
- Clickable to view full plan in ContentModal

**D. Plan Viewer (Full Modal):**
- **File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/components/Conversation/PlanViewer.tsx`
- Full-screen overlay with:
  - Chrome bar title with badge (embedded/written/agent-generated)
  - Markdown content renderer
  - Close button (X icon)

### 5. **Subagents/Explorations/Web Searches Display**

**In Asset Grid:**

**Explorations:**
- Column with header "EXPLORATIONS (count)"
- Agent icon (#FF6600 orange)
- Gradient underline with agent color
- Each item: agent description text
- Clickable to view agent response in ContentModal

**Web Searches:**
- Column with header "WEB SEARCHES (count)"
- Globe icon (#60A5FA blue)
- Gradient underline with blue color
- Each item: quoted search query
- Clickable to show search results

**In Session History:**
- Small icons in footer second row:
  - Agent icon: `agentCount` badge
  - MCP icon: indicates MCP tool usage
  - Globe icon: indicates web searches
  - Zap icon: indicates auto-compact occurred

**In Active Session Card:**
- Footer center icons show: MCP, Web search, Auto-compact indicators

### 6. **Component Hierarchy & Styling Approach**

**Styling Approach:** **Pure inline React styles** (no CSS modules or Tailwind)

```typescript
const styles: Record<string, React.CSSProperties> = {
  // Define all styles as constants
  // Use PALETTE color constants for theming
}
```

**Color Palette (from Dashboard.tsx):**
```typescript
const PALETTE = {
  coral: colors.accent,           // #E67E52
  coralDark: colors.accentDark,   // #D06840
  coralLight: colors.accentLight, // #F09070
  teal: '#2DD4BF',
  purple: '#A78BFA',
  blue: '#60A5FA',
  pink: '#F472B6',
  yellow: '#FBBF24',
  muted: colors.textSecondary,    // #8B9296
  text: '#E5E7EB',
  textDim: colors.textMuted,      // #6B7075
  bg: colors.bgPrimary,           // #0d0d0d
  bgCard: colors.bgSecondary,     // #1a1a1a
  bgHover: colors.bgElevated,     // #252525
  success: colors.success,         // #4ADE80
  danger: colors.danger,           // #EF4444
};
```

**Asset Card Styling:**
```typescript
assetCard: {
  display: 'flex',
  alignItems: 'stretch',
  borderRadius: '6px',
  backgroundColor: PALETTE.bg,
  border: `1px solid ${PALETTE.textDim}12`,
  overflow: 'hidden',
  cursor: 'pointer',
},
assetCardAccent: {
  width: '3px',
  flexShrink: 0,
  borderRadius: '3px 0 0 3px',  // Left side only
},
assetCardBody: {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  minWidth: 0,
  flex: 1,
},
```

**Session History Row Styling:**
- Two-row layout per session:
  - Row 1: Status dot + title + date + context %
  - Row 2: Token counts + badges (indented with `paddingLeft: 22px`)
- Gap between rows: `4px`
- Padding: `12px 16px`
- Hover effect: background lightens + left border glow

### 7. **Layout File (Layout.tsx)**

**Overall Structure:**
```
<div style={styles.container}> // display: flex, height: 100vh
  <aside style={styles.sidebar}> // width: 240px, flex-direction: column
    Logo + Project Selector + Nav + Sources + Settings
  </aside>
  
  <div style={styles.contentArea}> // flex: 1, display: flex, flex-direction: column
    <main style={styles.main}> // flex: 1, overflow: auto
      <Outlet /> // Dashboard/Archive/Context/Settings
    </main>
    
    {showLogs && <MultiLogPanel />} // Optional bottom panel
  </div>
</div>
```

**Sidebar:**
- Width: `240px` (fixed)
- `flexDirection: column`
- Logo section with mascot image (32x32px)
- Navigation items in vertical flex
- Sources section (Obsidian, Google Docs, Notion status)
- Settings + Logs toggle in footer

### 8. **Responsive Breakpoints & Sizing**

**Defined in theme/index.ts:**
```typescript
breakpoints: {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
}
```

**Asset Grid Responsive:**
- Uses `repeat(auto-fit, minmax(280px, 1fr))`
- Minimum 280px columns
- Automatically adjusts number of columns
- For 1280px width: typically 3-4 columns
- For 640px width: 1-2 columns

### 9. **Global Styles (globals.css)**

**Key Classes:**
- `.jacques-horizontal-scroll` - Horizontal scrolling container with custom scrollbar
- `.jacques-scroll-fade` - Adds gradient fade on right edge (40px wide)
- `.jacques-session-card` - Card hover effects
- `.jacques-history-row` - Row hover with left border glow
- `.jacques-asset-item` - Asset card hover with slight translate
- `.jacques-animate-in` - Slide-in animation (300ms)
- `.jacques-skeleton` - Shimmer loading animation
- `@keyframes status-pulse` - Pulsing status dot for working sessions

**Animations:**
- Slide-in: 300ms ease-out
- Pulse: 1.8s ease-in-out infinite
- Shimmer (skeleton): 1.5s ease-in-out infinite

### 10. **Key UI Components**

**Atomic Components (ui/):**
- `Badge` - Status badges (live, idle)
- `SectionHeader` - Section titles with accent color
- `ContentModal` - Full-screen modal for plans/explores/searches
- `SearchInput` - Search field with clear button
- `EmptyState` - Empty state messages
- `TerminalPanel` - Log panel at bottom
- `ToastContainer` - Toast notifications

**Layout Components:**
- `SessionCard` - Individual session card
- `SessionList` - Vertical list (used in sidebar)
- `SidebarSessionList` - Tree-style open sessions in sidebar
- `ActiveSessionViewer` - Full session conversation view

**Content Components:**
- `PlanNavigator` - Detects and lists plans in conversation
- `PlanViewer` - Displays individual plan in modal
- `ConversationViewer` - Full conversation transcript with messages
- `SubagentNavigator` - Lists and navigates subagents

### 11. **Data Flow**

```
Session (from server via useJacquesClient)
  ↓
Dashboard component
  ├─ filteredLiveSessions (by project)
  ├─ filteredSavedSessions (from listSessionsByProject API)
  ├─ aggregateDocuments() → {plans, explorations, webSearches}
  └─ maps to display in sections
```

**Asset Aggregation Logic:**
- Plans: Deduplicated by title, tracks session count
- Explorations: Collected from all saved sessions
- Web searches: Collected from all saved sessions
- Can filter explorations by token cost (≥20K)

This comprehensive layout uses a sophisticated grid/flex system with inline styles, careful attention to color theming, responsive design, and smooth animations to create a professional terminal-inspired dashboard UI.