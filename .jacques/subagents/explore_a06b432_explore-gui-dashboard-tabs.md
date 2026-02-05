# Explore: Explore GUI dashboard tabs

> Session: `73be7a34-ec84-42e5-a9b8-7ae01cef87ac`
> Date: 2026-02-04
> Tokens: ~82 196

---

Excellent! Now I have a comprehensive understanding of the codebase. Let me provide a detailed report with all the findings.

## Comprehensive Analysis Report: Jacques Dashboard GUI Codebase

### 1. **Tab Structure in Dashboard**

The dashboard uses a **three-panel right sidebar navigation system** for conversation viewing (located in `/components/Conversation/ConversationViewer.tsx`):

- **Questions Navigator** (`QuestionNavigator.tsx`) - Left navigation
- **Plans Navigator** (`PlanNavigator.tsx`) - Middle navigation  
- **Subagents Navigator** (`SubagentNavigator.tsx`) - Right navigation

These are **not traditional tabs**, but rather **collapsible panels** that display:
- Filterable lists of items
- Active/current item highlighting
- Click navigation to jump to specific content
- Keyboard shortcuts for jumping between items

### 2. **Session Storage Date Display Pattern**

The Archive page (session storage list) displays dates on the **right side of session cards** using this pattern:

**Layout Structure:**
```
[Line#] [Title ────────────────────] [Status Badges] [Date]
        [Meta Info: msgs, tools, agents, tokens]
```

**Key Implementation Details:**
- Date is placed in `cardHeader` with `justifyContent: 'space-between'` (line 222-226, Archive.tsx)
- Date formatting uses `formatDate()` function (lines 16-31) that converts ISO strings to:
  - "Today" for same day
  - "Yesterday" for 1 day ago
  - Day name for <7 days ago
  - "Mon Jan 15" format for older dates
- Date styling: `fontSize: '12px'`, `color: colors.textMuted`
- Positioned right via flexbox with badges between title and date
- **Critical**: `cardHeader` uses `alignItems: 'flex-start'` (not center), allowing title to wrap while date stays aligned

### 3. **Data Structures**

#### **Agent Responses (from AgentProgressContent type)**
```typescript
interface AgentProgressContent {
  type: 'agent_progress';
  prompt?: string;                          // The task given to agent
  agentId?: string;                         // Unique agent identifier
  messageType?: 'user' | 'assistant';       // Message role
  messageContent?: unknown[];               // Raw message content
  tokenCount?: number;                      // Tokens from archived subagent
  messageCount?: number;                    // Message count from archived
  model?: string;                           // Model used by agent
  agentType?: string;                       // "Explore", "Plan", "General", etc.
  agentDescription?: string;                // Short task description
}
```

#### **Plans (from PlanInfo interface)**
```typescript
interface PlanInfo {
  title: string;                            // Extracted from markdown heading
  source: 'embedded' | 'write' | 'agent';   // Detection source
  messageIndex: number;                     // Position in conversation
  filePath?: string;                        // If written to disk
  agentId?: string;                         // If from Plan subagent
}
```

**Plan Detection Sources:**
1. **Embedded** - User message with trigger pattern: "Implement the following plan:", "Here is the plan:", "Follow this plan:"
2. **Write** - File path contains "plan" or ".plan.md" or ".jacques/plans/"
3. **Agent** - Detected from agent_progress with `agentType === 'Plan'`

#### **Subagents (from SubagentInfo interface)**
```typescript
interface SubagentInfo {
  agentId: string;                          // Agent unique ID
  agentType?: string;                       // Type: Explore, Plan, General, Bash
  prompt?: string;                          // Task description
  messageIndex: number;                     // In conversation
  contentIndex: number;                     // In message content array
}
```

### 4. **Sorting and Ordering**

#### **Subagents (SubagentNavigator.tsx, lines 72-90)**
```
Ordered by type: Explore → Plan → General-purpose → Bash → Others
Items grouped by type with count badges
Active agent = closest to current scroll position
```

#### **Plans (PlanNavigator.tsx, lines 242-253)**
```
Ordered by source: Embedded → Agent → Written
Items grouped by source with type-colored icons
Active plan = closest to current scroll position
```

#### **Questions (QuestionNavigator.tsx, lines 21-39)**
```
Sequential order as they appear in conversation
Active question = closest to current scroll position
```

#### **Sessions in Archive (Archive.tsx, lines 140-144)**
```
Projects displayed alphabetically sorted
Sessions within each project maintain original order (by endedAt timestamp)
Search results flatten hierarchy but maintain date order
```

### 5. **Date/Time Handling Patterns**

**Archive Page Date Display:**
- Function `formatDate(dateStr: string)` (lines 16-31)
- Uses `endedAt` field (ISO string from SessionEntry)
- Relative formatting for recent dates, absolute for older
- Applied to session cards at line 323

**Conversation Viewer Timestamps:**
- Uses `timestamp` field (milliseconds since epoch)
- Converted to ISO string via `new Date(timestamp).toISOString()`
- Auto-compact markers display with ISO strings
- Subagent entries show timestamp in full conversation view

### 6. **Component Architecture for Tabs/Navigation**

**ConversationViewer.tsx Structure:**
- Main content area: messages with scroll tracking
- Right sidebar: 3 navigator panels (Questions, Plans, Subagents)
- Navigators are **optional** - render null if no items
- **Collapsible panels** with count badges
- **Active state highlighting** based on scroll position
- **Click navigation** with smooth scroll to content
- **Keyboard shortcuts**: `[`/`]` for questions, `e`/`c` for expand/collapse

**Navigator Panel Pattern (shared across all 3):**
- Header with icon, title, count, collapse toggle
- Scrollable list of items
- Item structure: marker dot + preview text
- Active state: colored marker dot + accent text color
- Hover state: elevated background
- Optional: action buttons (View plan, etc.)

### 7. **Agent Response Display**

**AgentProgressBlock.tsx** displays:
1. **Summary line**: Agent type + prompt preview + token/message counts
2. **Expandable sections**:
   - Stats bar (type badge, model, tokens, message count)
   - Query/Task (formatted preformatted text)
   - Response (final assistant message, collapsible if long)
   - Toggle to view full conversation
3. **Full Conversation**: Lazy-loads subagent JSONL with full message history

**Agent Type Styling:**
```
Explore:        Blue (#60A5FA)   Search icon
Plan:           Green (#34D399)  FileText icon
General:        Purple (#A78BFA) Bot icon
Bash:           Pink (#F472B6)   Terminal icon
```

### 8. **API Data Structures**

**SessionEntry** (from api/config.ts, lines 440-523) contains:
- `planRefs[]` - Array of plan metadata with source, title, path, agentId
- `exploreAgents[]` - Agent references with timestamp and token cost
- `webSearches[]` - Search queries and result counts
- `planCount` - Number of plans in session
- `mode` - 'planning' | 'execution' | null
- `tokens` - Input, output, cache creation/read

**SessionData** (lines 613-620):
- `metadata: SessionEntry` - Index metadata
- `entries: ParsedEntry[]` - Parsed JSONL entries
- `subagents: Array<{id, sessionId}>` - References to subagent files

### 9. **Key Implementation Patterns**

**Navigation Pattern:**
1. Navigator scans all messages for items (agents, plans, etc.)
2. Creates lookup map by type/source
3. Finds "active" item based on closest scroll position
4. Renders grouped list with count badges
5. On click: `onNavigate(messageIndex, contentIndex, contentId)`
6. Parent scrolls to message and expands specific content

**Filtering Pattern:**
- Content type filters in ConversationViewer (lines 136-155)
- Filters: agentProgress, bashProgress, mcpProgress, webSearch, toolCalls, thinking
- Applied via `shouldIncludeContent()` function (lines 627-645)
- Messages re-filtered on filter state change

**Active State Detection:**
```typescript
const findActiveAgent = () => {
  for (let i = subagents.length - 1; i >= 0; i--) {
    if (subagents[i].messageIndex <= currentIndex) {
      return subagents[i].agentId;
    }
  }
  return subagents[0]?.agentId;
};
```

### 10. **Styling Patterns**

**Common Component Styles:**
- Border: `1px solid ${colors.borderSubtle}`
- Active background: `colors.bgElevated`
- Hover transition: `'all 150ms ease'`
- Monospace fonts: `"'JetBrains Mono', 'Fira Code', 'SF Mono', monospace"`
- Marker dots: 6px radius circles, filled when active
- Badges: inline-flex, gap spacing, semantic coloring

**Right Sidebar Navigation (navigatorsPanel):**
- Width: 200px
- flexShrink: 0 (fixed width)
- borderLeft: 1px
- Each panel is flex column with header/list/footer
- List items have consistent 36px minHeight for touch targets

---

This comprehensive structure enables intuitive navigation through complex conversations with multiple agent types, embedded plans, and web searches, all while maintaining visual clarity through color-coding, grouping, and smart active-state detection.