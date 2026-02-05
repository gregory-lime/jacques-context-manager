# Explore: Explore conversation viewer layout

> Session: `351f1baf-83f0-482f-aff5-cb03475048a7`
> Date: 2026-02-03
> Tokens: ~49 730

---

Perfect! Now I have a comprehensive understanding of the conversation viewer. Let me create a detailed summary report:

## Conversation Viewer Architecture Analysis

Based on my examination of the codebase, here's a complete breakdown of the conversation viewer components and layout:

### 1. **ConversationViewer.tsx - Overall Structure**

The component uses a **3-part vertical layout** with the following sections:

#### **Header Section** (Top Bar - 2 parts)
```
┌─────────────────────────────────────────────────────────────────┐
│ [◄ back] ● ● ●  conversation/project/date.jsonl  [Auto-compacted] │  
│ Conversation Title                                              │
├─────────────────────────────────────────────────────────────────┤
│ [All] [Without Tools] [Messages Only]  [Filter Content] [Expand All] │
└─────────────────────────────────────────────────────────────────┘
```

**Styling Details:**
- **Header padding**: `12px 16px` (consistent vertical + horizontal)
- **Header gap**: `12px` between top chrome row and title row
- **Header background**: `colors.bgSecondary`
- **Border**: `1px solid ${colors.borderSubtle}` (bottom only)
- **Title styling**: `18px` font size, `600` weight, `colors.textPrimary`

**Header Components:**
1. **Back Button** (optional, only if `onBack` prop provided)
   - 4px left/right padding, 10px gap
   - Monospace font, muted color
   - Shows icon + "back" text
   
2. **Chrome Dots** (macOS style)
   - Three circles: red, yellow, green
   - Each 6x6px, opacity 0.7
   - Gap of 6px between them

3. **File Path**
   - Monospace font, muted color
   - Format: `conversation/{project}/{date}.jsonl`
   - Can show optional "Auto-compacted" badge in teal/green

4. **Conversation Title**
   - Large, bold text below chrome row
   - Takes full width

#### **Filter Controls** (Horizontal bar below title)
```
┌─ Filter Tabs ─┬─ Filter Dropdown ┬─ Expand/Collapse ─┐
│ [All][Without][Messages]  [Filter Content ▼] [Expand All] │
└───────────────────────────────────────────────────────────┘
```

- **Gap between controls**: `12px`
- **Filter tabs**: `4px` gap between buttons, `4px` padding around group, `6px` border radius on group
  - Each tab: `6px 12px` padding, `12px` font size, `150ms ease` transition
  - Active tab: `colors.bgElevated` background, `colors.accent` text
  
- **Dropdown button**: Creates a dropdown with 6 content filters:
  - Agents (Bot icon)
  - Bash (Terminal icon)
  - MCP (Plug icon)
  - Search (Search icon)
  - Tools (Wrench icon)
  - Thinking (Brain icon)
  - Dropdown positioned `absolute`, top-right, `4px` margin-top
  - Dropdown background: `colors.bgElevated`
  - Shadow: `0 4px 12px rgba(0,0,0,0.3)`

### 2. **Content Area Layout** (Main Section)

```
┌──────────────────────────────────────┬────────────────┐
│                                      │                │
│  Messages Container (scrollable)    │ Right Sidebar  │
│  - padding: 24px all sides           │ 200px width    │
│  - flex: 1                           │                │
│  - overflow: auto                    │ 3 Navigators:  │
│                                      │ - Questions    │
│  [User Message Wrapper]              │ - Plans        │
│    [User Message Card]               │ - Subagents    │
│                                      │                │
│  [Assistant Message Wrapper]         │                │
│    [Assistant Message Group]         │                │
│                                      │                │
│  [Scroll to End Button ↓]            │                │
└──────────────────────────────────────┴────────────────┘
```

**Styling Details:**
- **contentArea**: `display: flex; flex: 1; overflow: hidden;`
- **Messages container**: 
  - `flex: 1`
  - `padding: 24px` (all sides)
  - `overflow: auto` (scrollable)
  - `position: relative` (for scroll button positioning)
  
- **Right sidebar (navigatorsPanel)**:
  - `width: 200px` (fixed)
  - `flexShrink: 0`
  - `backgroundColor: colors.bgSecondary`
  - `borderLeft: 1px solid ${colors.borderSubtle}`
  - `overflow: auto` (scrollable independently)

- **Message wrappers**:
  - **User messages**: `justifyContent: flex-start; paddingRight: 15%;`
  - **Assistant messages**: `justifyContent: flex-end; paddingLeft: 15%;`
  - Both use `display: flex` for alignment

- **Scroll to End button**:
  - `position: absolute; bottom: 20px; left: 50%;`
  - `transform: translateX(-50%)`
  - `zIndex: 10`
  - Styled with accent color, shadow, rounded corners

### 3. **Footer Section** (Bottom Bar)

```
┌─────────────────────────────────────────────────────────────────┐
│ [5 messages] [2.5K context] [500 out] (1.2K cached) [+ 200 subagents] │
│ [react] [typescript] [vite]                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Styling:**
- `display: flex; gap: 8px; alignItems: center;`
- `padding: 12px 16px`
- `borderTop: 1px solid ${colors.borderSubtle}`
- `backgroundColor: colors.bgSecondary`

**Badge Contents:**
- Message count
- Context tokens (with cache breakdown in tooltip)
- Output tokens
- Subagent tokens (if present)
- Technology tags

### 4. **Filter System**

**Filter Type Options:**
- `'all'` - Shows everything
- `'without_tools'` - Hides tool_use and tool_result content types
- `'messages_only'` - Shows only text content

**Content Type Filters** (granular control):
```typescript
{
  agentProgress: boolean;    // Subagent calls
  bashProgress: boolean;     // Bash streaming output
  mcpProgress: boolean;      // MCP tool calls
  webSearch: boolean;        // Web search queries/results
  toolCalls: boolean;        // Tool use/results
  thinking: boolean;         // Extended thinking blocks
}
```

### 5. **Conversation Title Handling**

The conversation title is displayed in the header (`styles.title`), but looking at `UserMessage.tsx`, when a user message contains an "Implement the following plan:" trigger, it's specially rendered:

**Plan Detection Logic:**
- Scans user messages for plan trigger patterns (case-insensitive):
  - "Implement the following plan:"
  - "Here is the plan:"
  - "Follow this plan:"
  
- **Plan Validation**: Content must be:
  - ≥100 characters
  - Have a markdown heading (`# Title`)
  - Have structure (lists or multiple paragraphs)

**Plan Rendering in User Message:**
```
┌─────────────────────────────────────────┐
│ Trigger text (italicized)               │
│ "Implement the following plan:"         │
│                                         │
│ ┌─ Plan Box (green border) ──────────┐  │
│ │ [📄] Plan: Title         [▼]       │  │
│ │ ────────────────────────────────── │  │
│ │ (When expanded:)                   │  │
│ │ Plan content rendered as markdown  │  │
│ │                                    │  │
│ │ (When collapsed:)                  │  │
│ │ First 3 lines preview...           │  │
│ └────────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Plan Box Styling:**
- Border: `1px solid #34D399` (green)
- Background: `colors.bgPrimary`
- Header background: `rgba(52, 211, 153, 0.1)` (very light green)
- Plan title color: `#34D399`
- Content padding: `16px`, max-height: `500px`, scrollable
- Preview max-height: `80px`, truncated

### 6. **Page-Level Wrapper (Layout.tsx)**

The ConversationViewer is placed within a larger application layout:

```
┌────────────────────────────────────────┐
│  Sidebar (240px)  │  Content Area      │
│  - Logo           │  ┌────────────────┐│
│  - Nav            │  │  Main Content  ││
│  - Project        │  │  (24px padding)││
│  - Sources        │  │  - ConversationViewer
│                   │  │  - Or other page
│  - Settings       │  │  ┌──────────────┤
│                   │  │  │ MultiLogPanel
│                   │  │  │ (below main) │
│                   │  └────────────────┘│
└────────────────────────────────────────┘
```

**Main page layout (`main` style in Layout.tsx):**
- `flex: 1`
- `padding: 24px`
- `overflow: auto`
- `minHeight: 0`

The ConversationViewer takes full height of `main`, minus the 24px padding from Layout, so:
- **Total container height**: `calc(100vh - 48px)` (Layout adds 48px top padding)
- **Container styling**: `display: flex; flexDirection: column; height: 100%; maxHeight: calc(100vh - 48px);`

### 7. **Key Navigation Features**

**Right Sidebar Navigators:**
1. **QuestionNavigator** - Jump between user questions
2. **PlanNavigator** - Navigate to plan sections
3. **SubagentNavigator** - Jump to subagent calls

**Keyboard Shortcuts:**
- `[` - Previous question
- `]` - Next question  
- `e` - Expand all messages
- `c` - Collapse all messages
- `End` or `Shift+G` - Scroll to bottom

### 8. **Message Grouping Logic**

Messages are grouped as:
- **User messages**: Always their own group
- **Assistant messages**: Consecutive ones grouped together
- **Markers**: Inserted for `/clear` commands and auto-compact events
- The grouping respects the auto-compact timestamp to insert a marker at the correct position

This creates a logical conversation flow with clear visual separation between user queries and assistant responses.