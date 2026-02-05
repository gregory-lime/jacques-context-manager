# Explore: Explore right sidebar components

> Session: `351f1baf-83f0-482f-aff5-cb03475048a7`
> Date: 2026-02-03
> Tokens: ~37 153

---

Perfect! I now have a comprehensive understanding of the right sidebar structure. Let me create a detailed report.

## Right Sidebar Structure Analysis

### 1. **Architecture Overview**

The right sidebar is **separate from the main ConversationViewer component** but rendered as part of its layout. It's implemented as a container (`navigatorsPanel`) that holds three independent navigator components:

- **QuestionNavigator** - Displays user questions
- **PlanNavigator** - Shows detected plans (embedded and written)
- **SubagentNavigator** - Lists subagent calls

**Location in ConversationViewer.tsx:**
- Lines 542-560: The navigators panel is rendered within `contentArea` as a flex sibling to the messages container
- Each navigator is conditionally rendered (returns `null` if no items to display)

### 2. **Sidebar Container Styles** (ConversationViewer.tsx, lines 816-824)

```typescript
navigatorsPanel: {
  display: 'flex',
  flexDirection: 'column' as const,
  width: '200px',          // Fixed width
  flexShrink: 0,           // Never shrinks
  backgroundColor: colors.bgSecondary,
  borderLeft: `1px solid ${colors.borderSubtle}`,
  overflow: 'auto',        // Content scrolls independently
}
```

**Key characteristics:**
- Fixed width of 200px
- Vertical flexbox layout stacking the three navigators
- Left border separates from main content
- Auto-scrolling when content exceeds height
- Part of `contentArea` flex layout (lines 805-809)

### 3. **Individual Navigator Components**

#### **QuestionNavigator.tsx**

**Structure:**
- Header with icon + "Questions (n)" count
- Scrollable list of user questions
- Footer with keyboard hint [/] for navigation

**Styling:**
- Each item has a circular marker (6px, changes color on active)
- Text preview (50 char max with ellipsis)
- Hover/active states with background color
- Smooth 150ms transitions

**State:**
- `hoveredIndex` - tracks hover state
- No collapse/expand functionality - always fully expanded

**Layout:**
```
├── header (12px padding, icon + text)
├── list (flex: 1, overflow: auto)
│  └── item buttons (flex layout)
└── hint (keyboard navigation hint)
```

#### **PlanNavigator.tsx**

**Structure:**
- Header with "Plans (n)" count
- Groups plans by source type (Embedded first, then Written)
- Each plan has:
  - Source indicator (icon + colored label)
  - Navigation button with marker + title
  - "View" button to open full plan viewer

**Plan Detection:**
- Extracts from user messages with triggers: "Implement the following plan:", "Here is the plan:", "Follow this plan:"
- Detects Write tool calls to files with "plan" in the name
- Validates: ≥100 chars + markdown heading + not code

**Styling:**
- Source groups with uppercase headers (Embedded/Written)
- Each plan item has flex layout: navigation button + view button
- View button is small secondary button (10px text)
- Same hover/active marker patterns as QuestionNavigator

**State:**
- `hoveredKey` - tracks which plan is hovered
- No collapse/expand functionality

#### **SubagentNavigator.tsx**

**Structure:**
- Header with "Subagents (n)" count
- Groups by agent type (Explore, Plan, General, Bash)
- Shows agent prompt preview in button

**Agent Type Styling:**
- Explore (blue #60A5FA)
- Plan (green #34D399)
- General (purple #A78BFA)
- Bash (pink #F472B6)

**Layout:**
```
├── header
├── list
│  └── typeGroup
│     ├── typeHeader (colored by type)
│     └── items (buttons with markers)
```

**State:**
- `hoveredId` - tracks hover state
- No collapse/expand functionality

### 4. **Styling Patterns Across All Navigators**

**Shared design elements:**
- Container: `flexShrink: 0` - never collapses
- Header: 12px padding, icon + text, subtle border-bottom
- List: `flex: 1, overflow: auto` - grows to fill space
- Items: Circular marker (6px) + text preview
- Transitions: 150ms ease on all interactions
- Colors: Use theme colors (accent, textMuted, bgElevated)

**Marker behavior:**
- Hollow circle (border only) when inactive
- Filled with accent color when active
- Smooth transition between states

### 5. **Current Collapse/Expand Functionality**

**Status:** None currently implemented

- All navigators are always fully visible (no collapse buttons)
- If a navigator has no items, it returns `null` and doesn't render at all
- Each navigator scrolls independently within its section
- No section headers with expand/collapse toggles

### 6. **Navigation Flow**

Each navigator passes a callback to parent:
```typescript
onNavigate={(messageIndex, contentIndex?, contentId?) => {
  // Scrolls to message and potentially expands specific content
}}
```

The ConversationViewer handles this by:
- Scrolling the message into view
- Setting a `navigationTarget` for 500ms to expand specific content
- Clearing the target after animation completes (AssistantMessage handles the expansion)

### 7. **Key Files & Imports**

**In ConversationViewer.tsx:**
```typescript
import { QuestionNavigator } from './QuestionNavigator';
import { SubagentNavigator } from './SubagentNavigator';
import { PlanNavigator, type PlanInfo } from './PlanNavigator';
```

**Rendered at lines 544-560:**
- Wrapped in `navigatorsPanel` container
- Receives filtered messages, current scroll position, and navigation callback
- PlanNavigator also receives `onViewPlan` callback for modal viewing

---

## Summary

The right sidebar is a well-structured, self-contained component system with:
- **Fixed 200px width** sidebar positioned to the right of messages
- **Three independent navigator components** that conditionally render
- **No current collapse/expand functionality** - all sections visible when populated
- **Consistent styling patterns** using the theme system
- **Smooth navigation** with marker highlighting and scrolling
- **Intelligent content detection** (plans, questions, subagents) based on message analysis

Each navigator uses similar UX patterns (hover states, active markers, keyboard hints) and could easily support collapsing if that becomes a requirement.