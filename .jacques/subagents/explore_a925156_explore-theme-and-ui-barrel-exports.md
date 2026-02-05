# Explore: Explore theme and UI barrel exports

> Session: `4836df4f-6499-4afa-8229-515cfcc3b17b`
> Date: 2026-02-04
> Tokens: ~28 049

---

Perfect! I have all the files. Now let me compile a comprehensive report based on these readings.

## Complete Design System & Component Architecture Report

### 1. Complete Color Palette

**Backgrounds:**
- `bgPrimary`: #0d0d0d (deepest dark, main background)
- `bgSecondary`: #1a1a1a (cards, sidebar)
- `bgElevated`: #252525 (hover states, modals)
- `bgInput`: #2a2a2a (input fields, code blocks)

**Accent Colors (Coral/Peach - from mascot's skin tone):**
- `accent`: #E67E52 (primary - buttons, links, progress)
- `accentLight`: #F09070 (lighter accent for hover)
- `accentDark`: #D06840 (darker accent for active states)
- `accentOrange`: #FF6600 (orange variant for mascot, project names)

**Text Colors:**
- `textPrimary`: #ffffff (headings, body text)
- `textSecondary`: #8B9296 (descriptions, timestamps)
- `textMuted`: #6B7075 (placeholders, disabled state)

**Semantic Colors:**
- `success`: #4ADE80 (connected, saved)
- `warning`: #FBBF24 (approaching limits)
- `danger`: #EF4444 (disconnected, failed)

**Borders:**
- `border`: #E67E52 (default - matches accent)
- `borderSubtle`: #3a3a3a (dividers)

**Progress Bar:**
- `progressFill`: #E67E52 (filled portion)
- `progressEmpty`: #8B9296 (empty portion)

**macOS Window Chrome:**
- `dotRed`: #FF5F56
- `dotYellow`: #FFBD2E
- `dotGreen`: #27C93F

---

### 2. Complete Theme System

**Typography:**
```typescript
fontFamily:
  - mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace
  - sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

fontSize:
  - xs: 11px
  - sm: 12px
  - base: 14px
  - lg: 16px
  - xl: 20px
  - 2xl: 24px

fontWeight:
  - normal: 400
  - medium: 500
  - semibold: 600
  - bold: 700

lineHeight:
  - tight: 1.2
  - normal: 1.4
  - relaxed: 1.6
```

**Spacing Scale (4px base unit):**
- 0: 0
- 1: 4px
- 2: 8px
- 3: 12px
- 4: 16px
- 5: 20px
- 6: 24px
- 8: 32px
- 10: 40px
- 12: 48px
- 16: 64px

**Border Radius:**
- none: 0
- sm: 4px
- md: 8px
- lg: 12px
- xl: 16px
- full: 9999px

**Shadows:**
- sm: 0 1px 2px rgba(0, 0, 0, 0.3)
- md: 0 4px 6px rgba(0, 0, 0, 0.4)
- lg: 0 10px 15px rgba(0, 0, 0, 0.5)
- xl: 0 20px 25px rgba(0, 0, 0, 0.6)

**Transitions:**
- fast: 150ms ease
- base: 250ms ease
- slow: 400ms ease

**Breakpoints:**
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

---

### 3. All CSS Animations (from globals.css)

**Spin Animation:**
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

**Pulse Glow Animation:**
```css
@keyframes pulse-glow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
```

**Slide In Animation:**
```css
@keyframes slide-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.jacques-animate-in {
  animation: slide-in 0.3s ease-out forwards;
}
```

**Expand In Animation:**
```css
@keyframes expand-in {
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 2000px; }
}
.jacques-expand-content {
  animation: expand-in 0.25s ease-out forwards;
  overflow: hidden;
}
```

**Fade In Animation:**
```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.jacques-fade-in {
  animation: fade-in 0.2s ease-out forwards;
}
```

**Status Pulse Animation:**
```css
@keyframes status-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}
```

**Shimmer Animation (for skeleton loaders):**
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

**Interactive State Transitions:**
- Session card hover: 200ms ease (background, border, shadow)
- History row hover: 200ms ease (background, border, shadow)
- Asset item hover: 150ms ease (background, border, transform)

---

### 4. UI Component Barrel Exports

**From `gui/src/components/ui/index.ts`:**
- `TerminalPanel`
- `SearchInput`
- `LineNumberList`
- `Badge`
- `SectionHeader`
- `EmptyState`
- `Toast` (component and type exports: `ToastData`, `ToastPriority`)
- `ToastContainer` and `toastStore`
- `NotificationCenter`
- `notificationStore`
- Notification types: `NotificationItem`, `NotificationCategory`, `NotificationPriority`

---

### 5. Conversation Component Barrel Exports

**From `gui/src/components/Conversation/index.ts`:**
- `ConversationViewer`
- `UserMessage`
- `AssistantMessage`
- `AssistantMessageGroup`
- `CodeBlock`
- `CollapsibleBlock`
- `QuestionNavigator`
- `SubagentNavigator`
- `PlanNavigator`
- `PlanViewer`
- `MarkdownRenderer`
- `ConversationMarker`
- Type exports: `PlanInfo`, `MarkerType`

---

### 6. How PlanNavigator and SubagentNavigator Trigger Modals/Viewers

#### PlanNavigator Modal Trigger Mechanism

**Props:**
```typescript
interface PlanNavigatorProps {
  messages: ConversationMessage[];
  currentIndex: number;
  onNavigate: (messageIndex: number, contentIndex?: number, contentId?: string) => void;
  onViewPlan?: (planInfo: PlanInfo) => void;  // <-- MODAL TRIGGER
}

export interface PlanInfo {
  title: string;
  source: 'embedded' | 'write' | 'agent';
  messageIndex: number;
  filePath?: string;
  agentId?: string;
}
```

**Modal Trigger Method:**
- Each plan item has a "View" button (line 318-333)
- Clicking "View" calls `onViewPlan()` callback with `PlanInfo` object
- The parent component (ConversationViewer) receives this callback and opens the `PlanViewer` modal
- Plan data passed includes: title, source type, message index, file path (for Write plans), and agent ID (for agent-generated plans)

**Plan Detection Logic:**
1. **Embedded Plans**: Scans user messages for trigger patterns:
   - "Implement the following plan:"
   - "Here is the plan:"
   - "Follow this plan:"
   - Must have ≥100 chars AND markdown heading (`#` symbol)
   
2. **Written Plans**: Detects Write tool calls that:
   - Target files ending in `.md` with "plan" in path or in `.jacques/plans/`
   - Content contains markdown heading AND markdown structure
   - Excludes code files (`.ts`, `.js`, `.py`, etc.)
   
3. **Agent Plans**: Detects `agent_progress` entries with `agentType === 'Plan'`

**Grouping & Sorting:**
- Plans grouped by source: `embedded` → `agent` → `write`
- Within each group, display in order of appearance
- Active plan is determined by closest to current scroll position

---

#### SubagentNavigator Modal Trigger Mechanism

**Props:**
```typescript
interface SubagentNavigatorProps {
  messages: ConversationMessage[];
  currentIndex: number;
  onNavigate: (messageIndex: number, contentIndex?: number, contentId?: string) => void;
}
```

**Modal Trigger Method:**
- Unlike PlanNavigator, SubagentNavigator **does NOT have an `onViewAgent` callback**
- Clicking a subagent item calls `onNavigate()` to scroll to that message
- There is **no dedicated viewer** - clicking navigates to the conversation point
- The `contentId` parameter passes the `agentId` for tracking

**Agent Detection Logic:**
- Scans assistant messages for `agent_progress` entries
- Extracts `agentId` and `agentType` from each agent_progress content
- Deduplicates by agentId (shows each agent once)

**Agent Type Color & Icon Mapping:**
```
- Explore: #60A5FA (blue) + Search icon
- Plan: #34D399 (green) + FileText icon
- General-Purpose: #A78BFA (purple) + Bot icon
- Bash: #F472B6 (pink) + Terminal icon
- Unknown: #9CA3AF (gray) + Bot icon
```

**Grouping & Sorting:**
- Sorted by type: Explore → Plan → General-Purpose → Bash → others
- Alphabetical for unknown types
- Active agent determined by closest to current scroll position

---

### 7. Detailed Component Styles

#### PlanNavigator Inline Styles:
```typescript
// Container
borderTop: 1px solid borderSubtle (#3a3a3a)

// Header
padding: 12px 16px
fontSize: 12px
fontWeight: 600
color: textSecondary (#8B9296)
borderBottom: 1px solid borderSubtle

// List items
padding: 8px
overflow: auto

// Plan item button
padding: 8px 10px
minHeight: 36px
borderRadius: 4px
transition: all 150ms ease
fontSize: 11px

// Active state
backgroundColor: bgElevated (#252525)
color: accent (#E67E52)

// Marker (indicator dot)
width: 6px, height: 6px
borderRadius: 50%
Active: filled with accent color
Inactive: 1px borderSubtle border

// View button
padding: 4px 8px
fontSize: 10px
border: 1px solid borderSubtle
borderRadius: 4px
transition: all 150ms ease
```

#### SubagentNavigator Inline Styles:
```typescript
// Container
borderTop: 1px solid borderSubtle

// Header
padding: 12px 16px
fontSize: 12px
fontWeight: 600
color: textSecondary
borderBottom: 1px solid borderSubtle

// Item button
padding: 8px 10px
minHeight: 36px
borderRadius: 4px
cursor: pointer
fontSize: 11px
transition: all 150ms ease
marginLeft: 8px

// Active/Hovered state
backgroundColor: bgElevated (#252525)
color: accent (#E67E52)

// Marker
width: 6px, height: 6px
borderRadius: 50%
```

---

### 8. CSS Custom Properties (from globals.css)

All theme values are also available as CSS variables for inline styles:

```css
--color-bg-primary: #0d0d0d
--color-bg-secondary: #1a1a1a
--color-bg-elevated: #252525
--color-bg-input: #2a2a2a
--color-accent: #E67E52
--color-accent-light: #F09070
--color-accent-dark: #D06840
--color-accent-orange: #FF6600
--color-text-primary: #ffffff
--color-text-secondary: #8B9296
--color-text-muted: #6B7075
--color-success: #4ADE80
--color-warning: #FBBF24
--color-danger: #EF4444
--color-border: #E67E52
--color-border-subtle: #3a3a3a
--color-progress-fill: #E67E52
--color-progress-empty: #8B9296
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace
--font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--radius-sm: 4px
--radius-md: 8px
--radius-lg: 12px
--border-width: 1px
--transition-fast: 150ms ease
--transition-base: 250ms ease
```

---

### Summary of Key Architectural Patterns

1. **Color Design**: Terminal-inspired dark theme with coral/peach accent (#E67E52) derived from Jacques mascot
2. **Spacing**: 4px base unit with scale of 1, 2, 3, 4, 5, 6, 8, 10, 12, 16
3. **Typography**: Monospace (JetBrains Mono) as primary font with 11px-24px range
4. **Animations**: 7 keyframe animations ranging from 0.2s-1.5s (fade, slide, expand, shimmer, spin, pulse, status-pulse)
5. **Plan Extraction**: 3 sources (embedded user messages, Write tool calls, Agent-generated) with intelligent filtering for code vs. markdown
6. **Navigation Pattern**: Both navigators collect items, group them, find active state, and render expandable sections with hover states
7. **Modal Triggering**: PlanNavigator has explicit `onViewPlan` callback; SubagentNavigator uses `onNavigate` to scroll instead