# Explore: Explore codebase structure

> Session: `38208644-8c20-4744-84c2-19fe65ea1653`
> Date: 2026-02-02
> Tokens: ~47 690

---

Perfect! I now have a comprehensive understanding of the codebase. Let me create a detailed analysis document.

## Analysis Summary

Based on my examination of the Jacques context manager codebase, here's the complete technical analysis for implementing a PlanNavigator component:

### 1. **SessionEntry Interface Structure**
**Location:** `/Users/gole/Desktop/jacques-context-manager/core/src/cache/session-index.ts` (lines 35-75)

The SessionEntry interface contains:
- `id`: Session UUID
- `jsonlPath`: Full path to JSONL file
- `projectPath`: Decoded project path
- `projectSlug`: Project name (basename)
- `title`: Session title (from summary or first user message)
- `startedAt` / `endedAt`: ISO timestamps
- `messageCount`: Count of user + assistant messages
- `toolCallCount`: Count of tool calls
- `hasSubagents`: Boolean indicating if user-visible subagents exist
- `subagentIds`: Array of user-visible subagent IDs (excludes internal agents)
- `hadAutoCompact`: Optional flag for auto-compact indicator
- `tokens`: Optional token usage stats object with:
  - `input`: Fresh input tokens (non-cached)
  - `output`: Output tokens generated
  - `cacheCreation`: Tokens written to cache
  - `cacheRead`: Tokens read from cache
- `fileSizeBytes`: File size
- `modifiedAt`: Modification timestamp

### 2. **Plan Detection and Extraction Architecture**
**Location:** `/Users/gole/Desktop/jacques-context-manager/core/src/archive/plan-extractor.ts`

**Key Constants (lines 17-24):**
- `PLAN_TRIGGER_PATTERNS`: Three regex patterns to detect plans:
  1. `/^implement the following plan[:\s]*/i`
  2. `/^here is the plan[:\s]*/i`
  3. `/^follow this plan[:\s]*/i`
- `MIN_PLAN_LENGTH`: 100 characters minimum content length after trigger phrase
- `MIN_SIMILARITY`: 0.9 (90% threshold) for Jaccard similarity deduplication

**Core Functions:**
- `detectEmbeddedPlans(entries)` (lines 52-96): Scans all user messages for trigger patterns
- `splitMultiplePlans(content)` (lines 101-135): Splits content by top-level markdown headings (#)
- `extractPlanTitle(content)` (lines 141-156): Prefers first markdown heading, falls back to first line
- `generatePlanFingerprint(content)` (lines 162-197): Creates SHA-256 hash + normalized title + length range bucket
- `calculateSimilarity(text1, text2)` (lines 203-226): Jaccard word-overlap similarity
- `findDuplicatePlan()` (lines 232-268): Searches existing catalog with exact + fuzzy matching
- `extractEmbeddedPlans()` (lines 376-460): Main extraction function with deduplication and file writing

**Plan Storage:**
- Plans saved to: `.jacques/plans/{date}_{slug}.md`
- Indexed in: `.jacques/index.json` with PlanEntry objects
- Bidirectional linking with sessions via `PlanEntry.sessions[]` array

### 3. **API Endpoints for Sessions**
**Location:** `/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts`

**Key Endpoints:**
- `GET /api/sessions`: List all sessions from lightweight index
- `GET /api/sessions/:id`: Get single session by ID with full JSONL parsing
- `GET /api/sessions/:id/subagents/:agentId`: Get subagent JSONL entries
- `POST /api/sessions/rebuild`: Rebuild session index with SSE progress streaming

**Key Import:**
```typescript
import {
  getSessionIndex,
  buildSessionIndex,
  getSessionEntry,
  getSessionsByProject,
  getCacheIndexStats,
  parseJSONL,
  getEntryStatistics,
  listSubagentFiles,
} from '@jacques/core';
```

### 4. **Archive.tsx Structure**
**Location:** `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Archive.tsx`

**Session Card Display (lines 601-645):**
- Card header: Title + formatted date
- Card metadata row showing:
  - Message count (`session.messageCount`)
  - Tool count (`session.toolCallCount`)
  - Subagent badge (if `session.hasSubagents`): Shows count from `session.subagentIds?.length`
  - Token badges (if `session.tokens` exists): Input and output tokens, formatted with K/M suffix
  - Auto-compact badge (if `session.hadAutoCompact`): Shows "compacted" label
- Date formatting: "Today", "Yesterday", weekday, or "Mon, 15" format
- Token formatting: K/M suffixes for thousands/millions

**Key Functions:**
- `formatDate()`: Converts ISO timestamp to readable string
- `formatTokenCount()`: Adds K/M suffixes to token counts
- `transformToSavedConversation()`: Transforms SessionEntry + entries into SavedConversation format

### 5. **ConversationViewer.tsx - Right Panel Architecture**
**Location:** `/Users/gole/Desktop/jacques-context-manager/gui/src/components/Conversation/ConversationViewer.tsx`

**Right Panel Layout (lines 355-367):**
```tsx
<div style={styles.navigatorsPanel}>
  <QuestionNavigator
    messages={filteredMessages}
    currentIndex={currentMessageIndex}
    onNavigate={navigateToMessage}
  />
  <SubagentNavigator
    messages={filteredMessages}
    currentIndex={currentMessageIndex}
    onNavigate={navigateToMessage}
  />
</div>
```

**Panel Style (lines 595-603):**
- `display: 'flex'` with `flexDirection: 'column'`
- `width: '200px'` fixed width
- `backgroundColor: colors.bgSecondary`
- `borderLeft: 1px solid border`
- `overflow: 'auto'` for scrolling
- `borderTop: 1px solid` for section dividers

### 6. **SubagentNavigator Component Reference**
**Location:** `/Users/gole/Desktop/jacques-context-manager/gui/src/components/Conversation/SubagentNavigator.tsx`

**Key Pattern to Follow:**

**Component Signature (lines 36-40):**
```typescript
interface SubagentNavigatorProps {
  messages: ConversationMessage[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}
```

**Internal Data Structure (lines 10-16):**
```typescript
interface SubagentInfo {
  agentId: string;
  agentType?: string;
  prompt?: string;
  messageIndex: number;
  contentIndex: number;
}
```

**Key Implementation Details:**
- `getAgentTypeStyle()` function (lines 21-34): Maps agent types to icons, colors, labels
  - Explore: 🔍 #60A5FA
  - Plan: 📋 #34D399
  - General-purpose: 🤖 #A78BFA
  - Bash: 💻 #F472B6
  - Default: 🤖 #9CA3AF

- Extraction logic (lines 41-61): Loops through messages → assistant content → agent_progress items
- Grouping by type (lines 67-74): Uses Map to organize by agentType
- Type ordering (lines 76-85): Explore → Plan → General-purpose → Bash → Others
- Active agent detection (lines 88-97): Finds closest agent to current scroll position
- Rendering (lines 99-143):
  - Container header with count
  - Sorted type groups
  - Clickable agent items with prompt preview
  - Active marker: "▶" for active, "─" for inactive
  - Tooltip shows full prompt

**Styles Pattern:**
- `container`: Full flex column
- `header`: 12px padding, 12px font-weight, borderBottom
- `list`: Flex-1, overflow-auto, 8px padding
- `typeGroup`: marginBottom 12px
- `typeHeader`: Flex row with gap/icons/count
- `item`: Flex row with marker + preview, borderRadius 4px
- `itemActive`: Highlighted background + accent color

### 7. **GUI Types for Plans**
**Location:** `/Users/gole/Desktop/jacques-context-manager/gui/src/types.ts`

**Key Type: SavedConversation (lines 286-310):**
```typescript
export interface SavedConversation {
  id: string;
  sessionId?: string;  // For looking up subagent conversations
  title: string;
  project: string;
  date: string;
  messages: ConversationMessage[];
  metadata: {
    messageCount: number;
    toolCallCount: number;
    estimatedTokens: number;
    actualTokens?: TokenInfo;
    technologies?: string[];
    filesModified?: string[];
    subagents?: {
      count: number;
      totalTokens: number;
      ids: string[];
    };
    hadAutoCompact?: boolean;
  };
}
```

**AgentProgressContent Type (lines 244-260):**
```typescript
export interface AgentProgressContent {
  type: 'agent_progress';
  prompt?: string;
  agentId?: string;
  messageType?: 'user' | 'assistant';
  messageContent?: unknown[];
  tokenCount?: number;
  messageCount?: number;
  model?: string;
  agentType?: string;
  agentDescription?: string;
}
```

### 8. **Data Flow for Plans in Conversations**

**From Archive.tsx perspective (lines 407-422):**
```typescript
const handleSessionClick = async (session: SessionEntry) => {
  const data = await getSession(session.id);  // Calls /api/sessions/:id
  const saved = transformToSavedConversation(
    data.metadata,
    data.entries,      // ParsedEntry[] from JSONL
    data.statistics,
    data.subagents     // Array of { id, sessionId }
  );
  setSelectedConversation(saved);
};
```

**From ParsedEntry parsing:**
The `transformEntriesToMessages()` function (lines 48-272):
- Iterates through ParsedEntry array
- Filters internal command messages starting with `<` prefix
- Groups entries into ConversationMessage objects
- Handles: user_message, assistant_message, tool_call, tool_result, agent_progress, bash_progress, mcp_progress, web_search

### 9. **Key Integration Points for PlanNavigator**

**Would need to:**
1. Add `plans` extraction to `SavedConversation.metadata` (similar to `subagents`)
2. Extract plans from conversation entries where:
   - `entry.type === 'user_message'`
   - Message text matches PLAN_TRIGGER_PATTERNS
   - Content is ≥100 chars after trigger removal
3. Link plans to message indices for navigation
4. Display in right panel below SubagentNavigator
5. Follow SubagentNavigator styling/interaction patterns
6. Include plan title, status, referenced in X messages indicator

### 10. **Architecture Summary**

**Three-Layer Data Structure:**
1. **IndexLayer**: SessionEntry lightweight index (~5KB metadata)
2. **ParsingLayer**: ParsedEntry array from JSONL (read directly, not cached)
3. **ViewLayer**: ConversationMessage array (transformed for UI display)

**Plan Detection Points:**
1. During archive initialization: `extractEmbeddedPlans()` scans entries
2. Plans saved to filesystem: `.jacques/plans/`
3. Plans indexed in project: `.jacques/index.json`
4. Plans accessible via API for display

**Component Hierarchy:**
- Archive.tsx (page) → Session card click
- ConversationViewer.tsx (main) → navigatorsPanel (right side)
  - QuestionNavigator (top)
  - SubagentNavigator (middle)
  - **PlanNavigator (bottom)** ← New component

All file paths are absolute and consistent with the Jacques architecture.