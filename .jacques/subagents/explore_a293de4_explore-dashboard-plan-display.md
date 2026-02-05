# Explore: Explore dashboard plan display

> Session: `c6426d56-efd3-416b-a98f-8e7cd55d38b8`
> Date: 2026-02-03
> Tokens: ~85 394

---

Perfect! Now I have enough information to provide a comprehensive summary. Let me compile my findings:

## Summary: Current Plan Display and UI Capabilities in Jacques

Based on my thorough exploration of the codebase, here's what I found:

### 1. **Plan Data Structure** (`dashboard/src/context/types.ts`)
Plans are represented as `PlanEntry` objects with these fields:
- `id`: Unique identifier
- `title`: Plan name/heading
- `filename`: Saved file name
- `path`: File path to plan
- `createdAt`: Creation timestamp (ISO)
- `updatedAt`: Last update timestamp (ISO)
- `sessions`: Array of session IDs that used this plan

### 2. **Terminal Dashboard Plan Views**

#### **Project Dashboard View** (`dashboard/src/components/ProjectDashboardView.tsx`)
- Accessible via `[P]` shortcut on main menu
- Shows 3 responsive layouts based terminal width:
  - **Full (≥90 chars)**: Two-column with scene art + sessions + plans + statistics
  - **Compact (70-89 chars)**: Compact scene art + stacked sections
  - **Minimal (<70 chars)**: Text-only, no scene art
- **Plans Section**:
  - Displays plans list alongside sessions
  - Tab (`[Tab]`) to switch between sessions and plans sections
  - Arrow keys to navigate
  - Shows: `> Plan Title` (selected), `  Plan Title` (unselected)
  - Displays "No plans yet" if empty
  - Shows scroll indicator "▼ more" if more plans available
  - `[Enter]` to view full plan content

#### **Plan Viewer View** (`dashboard/src/components/PlanViewerView.tsx`)
- Accessible from Project Dashboard by pressing Enter on a plan
- Full-page view with:
  - **Header**: Plan title + update date (right-aligned)
  - **Scrollable Content**: Markdown rendering with:
    - H1 headings: Bold coral color (#E67E52)
    - H2 headings: Bold white
    - H3 headings: Bold default
    - Lists (-, *, numbered): Default rendering
    - Code blocks: Muted color (#8B9296)
  - **Scroll Indicators**: "▲ X lines above" / "▼ X lines below"
  - **Footer**: `[↑↓] Scroll [Esc] Back to Dashboard`
  - **Visible Lines**: 15 lines of content per screen (configurable)

### 3. **Web GUI Plan Views** (GUI-based, not dashboard)

#### **Plan Navigator** (`gui/src/components/Conversation/PlanNavigator.tsx`)
- Sidebar component showing all plans in a conversation
- Detects both **embedded** and **written** plans:
  - **Embedded**: User messages containing trigger patterns ("Implement the following plan:", "Here is the plan:", "Follow this plan:")
  - **Written**: Assistant messages using Write tool on plan files
- Features:
  - Groups plans by source type with colored badges
  - Shows plan count per source
  - Active plan highlight (closest to current scroll position)
  - Hover states and visual indicators
  - "View" button to open full plan modal
  - Collapsible header

#### **Plan Viewer Modal** (`gui/src/components/Conversation/PlanViewer.tsx`)
- Modal overlay (80% width, max 900px, 80vh height)
- Displays full plan with:
  - **Header**: Icon (embedded/written) + title + source label + file path
  - **Content**: Markdown rendering with proper styling
  - **Loading State**: Spinner + "Loading plan content..."
  - **Error State**: Styled error message
  - **Footer**: "Press Escape to close" hint + Close button
- Markdown rendering via `MarkdownRenderer` component

### 4. **Progress Bar & Context Display Components**

#### **ProgressBar** (`dashboard/src/components/ProgressBar.tsx`)
- Shows context usage percentage with visual bar
- Characters: `█` (filled) and `░` (empty)
- Color: Soft coral (#E67E52)
- Empty: Muted gray (#8B9296)
- Shows percentage with optional `~` prefix for estimates
- Used in project dashboard statistics

#### **ContextProgress** (`dashboard/src/components/ContextProgress.tsx`)
- Shows below header in main dashboard
- Displays: `Context: XX.X%` (colored red/yellow/green based on usage)
- Shows token counts: `(used / total tokens)`
- 50-char wide progress bar
- Color coding: Green <60%, Yellow 60-80%, Red ≥70%

#### **MiniProgress**
- Compact indicator for session lists
- Format: `ctx:XX%` (with ~ prefix for estimates)
- Shows "ctx:?%" if percentage is null

### 5. **UI Components Available for Stats Display**

#### **ASCII Art Library** (`dashboard/src/components/ascii-art/`)
- `dotLine()`: Top/bottom borders
- `sectionLine()`: Section dividers
- `progressBar()`: Token/usage visualization
- `formatTokens()`: Token count formatting (1M, 1K, etc.)
- `formatDuration()`: Time formatting
- `formatDate()`: Date formatting
- `truncate()`: Text truncation with ellipsis
- `pad()`: Text padding (left/right)
- **SCENE_FULL**: Large ASCII art for full layout
- **SCENE_COMPACT**: Smaller scene art for compact layout

### 6. **Key UI Patterns**

**Text Styling**:
- Accent color: `#E67E52` (coral)
- Muted text: `#8B9296` (gray)
- Green status: `#22C55E`
- Selection highlight: White/bold

**Layout Patterns**:
- Box flexDirection for columns/rows
- marginTop/marginLeft for spacing
- Width calculations derived from terminalWidth
- Fixed content heights (10 rows visible)
- Scroll offset tracking for long lists

**Navigation Patterns**:
- Arrow keys: Up/Down navigation
- Enter: Selection/action
- Escape: Back to previous view
- Tab: Section switching
- PageUp/PageDown: Large scrolls

### 7. **What's Missing/Not Currently Used**

For plan progress tracking, the UI infrastructure exists but isn't currently used:
- No completion percentage on plans
- No task/section breakdown indicators
- No visual progress bar for plan completion
- No estimated vs. actual metrics
- No time tracking (created/last modified only)
- No status badges (e.g., "In Progress", "Completed", "Blocked")

### 8. **Extensibility Opportunities**

The component system is ready to add:
- Plan status indicators (embedded in PlansList render)
- Progress bars (using existing ProgressBar component)
- Metadata display (createdAt/updatedAt already in data)
- Session linkage visualization (sessions array in PlanEntry)
- Plan templates/categories (could add to PlanEntry type)
- Search/filtering (infrastructure exists from archive search)

This is a solid, well-architected foundation with all the UI components and patterns needed for displaying plan progress and detailed metrics.