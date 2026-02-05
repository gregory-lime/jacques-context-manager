# Explore: Explore ProjectDashboard page

> Session: `085762a5-d9bb-4b79-aa35-386f0a7e7df5`
> Date: 2026-02-03
> Tokens: ~51 915

---

Perfect! Now I have all the information I need. Let me provide a comprehensive analysis of the ProjectDashboard page and its architecture.

## Complete ProjectDashboard Analysis

I've thoroughly explored the ProjectDashboard component and related architecture. Here's the comprehensive breakdown:

### 1. **ProjectDashboard.tsx - Full Content & Structure**

**Location**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/pages/ProjectDashboard.tsx`

**Main Sections**:
- **Header** (lines 301-320): Shows "PROJECT DASHBOARD" title with BlockPattern decoration and a connection status badge (Connected/Disconnected with live glow effect)
- **Project Name & Stats** (lines 323-333): Displays selected project name in large coral text with stats pills showing:
  - Total Sessions (coral)
  - Input tokens (teal)
  - Output tokens (blue)
  - Plans (purple) - conditional display
  - Explorations (pink) - conditional display
  - Web Searches (blue) - conditional display

- **Main Grid (2-column layout, lines 339-422)**:
  
  **Left Panel - SESSIONS** (60% width, 1.2fr):
  - Scrollable list with max-height of 500px
  - Each session row shows:
    - Status indicator (██ for live with glow effect, ░░ for saved)
    - Session title (truncated to 38 chars)
    - Relative date (e.g., "2m ago", "Yesterday")
    - Context percentage badge (coral if <70%, yellow if >70%)
  - Uses `ScrollableList` helper with smooth scrolling

  **Right Panel - DOCUMENTS** (40% width, 1fr):
  - Three document columns in vertical layout (gap: 24px):
    1. **PLANS** - purple accent, max-height 200px
    2. **EXPLORATIONS** - teal accent, max-height 200px
    3. **WEB SEARCHES** - blue accent, max-height 200px
  - Each column shows:
    - Column header with "▓░" prefix and item count in parentheses
    - Gradient underline matching accent color
    - Scrollable list of items (truncated to 28 chars)
    - Staggered animation on items (`animationDelay: ${i * 30}ms`)

- **Footer** (lines 426-430): BlockPattern decoration with reduced opacity (0.4)

### 2. **Components Used**

**Imported directly in ProjectDashboard**:
- `SectionHeader` - from `../components/ui` (renders "░▒▓" prefix + title + optional action)
- `BlockPattern` - from `../components/ui/decorative/BlockPattern` (renders colorful Unicode blocks)
- `CornerAccent` - from `../components/ui/decorative/CornerAccent` (fixed position corner decorations - topRight and bottomLeft)

**Hooks**:
- `useJacquesClient()` - gets live sessions and connection status
- `useProjectScope()` - gets selected project and filter function

**API**:
- `listSessionsByProject()` - fetches saved sessions grouped by project

### 3. **Page Sizing & Constraints**

**Viewport (`.jacques-dashboard` class)**:
- `width: '100%'` - full window width
- `height: '100vh'` - full window height
- `overflowY: 'auto'` - scrollable vertically
- `overflowX: 'hidden'` - no horizontal scroll
- `scrollBehavior: 'smooth'`
- `backgroundColor: colors.bgPrimary` (#0d0d0d - deepest dark)

**Container**:
- `maxWidth: '1200px'` - constrained width
- `margin: '0 auto'` - centered horizontally
- `padding: '32px 40px'` - generous padding (32px vertical, 40px horizontal)
- `minHeight: '100vh'` - full viewport minimum
- `display: 'flex'` with `flexDirection: 'column'`
- `position: 'relative'`, `zIndex: 1` (above corner decorations)

**Main Grid Layout**:
- `display: 'grid'`
- `gridTemplateColumns: '1.2fr 1fr'` - 60/40 split (sessions wider than documents)
- `gap: '40px'` - large gap between panels
- `flex: 1` - grows to fill available space

### 4. **Routing & Layout**

**App.tsx Structure** (`/Users/gole/Desktop/jacques-gui-redesign/gui/src/App.tsx`):
```
<ProjectScopeProvider>
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<Dashboard />} />  // Home page
      <Route path="conversations" element={<Conversations />} />
      <Route path="conversations/:id" element={<Conversations />} />
      <Route path="archive" element={<Archive />} />
      <Route path="project" element={<ProjectDashboard />} />  ← Route path
      <Route path="context" element={<Context />} />
      <Route path="settings" element={<Settings />} />
      <Route path="sources" element={<Sources />} />
      ...
    </Route>
  </Routes>
</ProjectScopeProvider>
```

**Layout.tsx** (`/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/Layout.tsx`):
- Provides the chrome/shell for all pages
- **Sidebar** (240px fixed width):
  - Logo section with Jacques mascot (32x32px image)
  - Project selector dropdown
  - Navigation menu with 5 items (Dashboard, Project, Conversations, Archive, Context)
  - Sources section (Obsidian, Google Docs, Notion) with connection indicators
  - Settings link in footer
- **Content Area** (flex: 1):
  - Main outlet for page content
  - MultiLogPanel for server logs, API logs, Claude operations
- Full viewport layout: `height: '100vh'`, `overflow: 'hidden'`

### 5. **Data Aggregation & Computation**

**Key Functions**:

1. **`computeStats(liveSessions, savedSessions)`** - Aggregates:
   - Total input/output tokens from both live and saved sessions
   - Total plans, explorations, web searches from saved sessions
   - Total sessions count

2. **`toSessionListItems(liveSessions, savedSessions)`** - Merges and sorts:
   - Converts to `SessionListItem[]` with normalized fields
   - Deduplicates by ID (live takes precedence over saved)
   - Sorts by date descending (most recent first)
   - Adds `displayTitle` logic (converts plan refs for execution mode)

3. **`aggregateDocuments(savedSessions)`** - Extracts all:
   - Plan items with titles (cleaning "Plan:" prefix)
   - Exploration descriptions
   - Web search queries

**State Management**:
- `allLiveSessions` - from WebSocket via `useJacquesClient()`
- `savedSessionsByProject` - fetched from API, keyed by project
- `selectedProject` - from context via `useProjectScope()`
- Memoized selectors for filtered data, stats, and documents

### 6. **Styling & Theme Integration**

**Custom Palette** (within ProjectDashboard):
```
coral: #E67E52
coralLight: #F09070
teal: #2DD4BF
purple: #A78BFA
blue: #60A5FA
pink: #F472B6
yellow: #FBBF24
text: #E5E7EB
textMuted: colors.textMuted (#6B7075)
success: #4ADE80
danger: #EF4444
```

**Typography**:
- Font: `'JetBrains Mono', 'Fira Code', 'SF Mono', monospace`
- Base size: 13px
- Headings: 20px (title), 28px (project name)
- Small labels: 10-11px

**Animations**:
- `.jacques-animate-in` class with staggered delays
- `pulse-glow` animation for connection dots and working sessions
- Smooth transitions on hover states (150ms)

### 7. **Comparison with Dashboard Page**

**Dashboard.tsx** (home page):
- Shows **live/active sessions only** in a grid (320px cards min-width, auto-fill)
- Uses `SessionCard` components with rich metadata (plans, agents, files)
- One-page (no scrolling content container)
- Displays connection status badge

**ProjectDashboard.tsx**:
- Shows **both live and saved sessions** in a list (merged by date)
- Aggregates project-wide documents (plans, explorations, searches)
- Scrollable viewport with constrained max-width
- More **analytics-focused** (token counts, stats pills)
- Emphasizes document artifacts over session metadata

---

All file paths are absolute and ready for reference.