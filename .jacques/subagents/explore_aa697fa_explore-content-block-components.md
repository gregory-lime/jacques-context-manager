# Explore: Explore content block components

> Session: `4836df4f-6499-4afa-8229-515cfcc3b17b`
> Date: 2026-02-04
> Tokens: ~47 208

---

Perfect! Now I have all the information needed. Let me create a comprehensive report.

## Complete Analysis: Content Block Rendering, Expansion, and Click Handling

### 1. **WebSearchBlock.tsx** (Lines 1-157)

#### Data Structure Received
```typescript
interface WebSearchContent {
  type: 'web_search';
  searchType?: 'query' | 'results';  // 'query' = searching, 'results' = completed
  query?: string;                    // The search query text
  resultCount?: number;              // Number of results found
  urls?: Array<{ title: string; url: string }>;  // Result URLs
}
```

#### Current Inline Display
- **Header**: Icon (Search/FileText) + "Web Search" label + Query (italic) + Status badge (e.g., "5 results" or "Searching...")
- **Summary**: Shows result count or "Searching..." in collapsed state
- **Expandable Section**: "Show URLs" / "Hide URLs" toggle button (lines 30-40)

#### Expansion Mechanism
- **State**: `useState(showUrls)` - simple boolean toggle
- **Click Handler**: Button onClick toggles state
- **Expanded Content**: URLs list (lines 42-58) with max-height: 200px and overflow: auto
- **URL Items**: Rendered as clickable links with numbered list (1. title)

#### Content for Modal
- Query text
- All URL results (title + clickable link)
- Result count

#### Styling Notes
- Container: `colors.bgElevated`, 8px 12px padding, 1px border
- URL list: max-height 200px, flex column with 4px gap
- Smooth transitions on hover

---

### 2. **BashProgressBlock.tsx** (Lines 1-85)

#### Data Structure Received
```typescript
interface BashProgressContent {
  type: 'bash_progress';
  output?: string;           // Recent/partial output
  fullOutput?: string;       // Complete command output
  elapsedSeconds?: number;   // Duration of command
  totalLines?: number;       // Line count
}
```

#### Current Inline Display
- **Header**: Terminal icon + "Bash Output" + Summary (e.g., "2.5s • 42 lines")
- **Content**: Full output in `<pre>` tag
- **Max-height**: 300px with overflow: auto

#### Expansion Mechanism
- **Uses CollapsibleBlock** (wrapper component, lines 44-51)
- **State**: `useState(forceExpanded)` - controlled by parent ref
- **Ref Interface**: Exposes `expand()` and `scrollIntoView()` methods
- **Default Expanded**: Can be passed via `expanded` prop

#### Content for Modal
- Full command output (from `fullOutput` or `output`)
- Duration
- Total lines
- Real-time streaming status if available

#### Styling Notes
- `pre` tag with monospace font
- Colors: `bgPrimary` background, `textSecondary` text
- Font size: 12px, line-height: 1.5
- wordBreak: 'break-all' for long lines

---

### 3. **MCPProgressBlock.tsx** (Lines 1-64)

#### Data Structure Received
```typescript
interface MCPProgressContent {
  type: 'mcp_progress';
  status?: string;      // 'started' | 'completed'
  serverName?: string;  // MCP server name (e.g., "deepwiki")
  toolName?: string;    // Tool being called (e.g., "ask_question")
}
```

#### Current Inline Display
- **Icon**: Check (if completed) or spinning Loader (if started)
- **Status**: Color changes based on completion (green for completed, accent for in-progress)
- **Header**: Icon + "MCP" + Server name badge + Tool name
- **No expansion**: This block is simple and inline-only

#### Expansion Mechanism
- **None currently** - This is a simple status indicator, not expandable
- Could show more details in modal: full execution details, parameters, results

#### Content for Modal (Not Currently Expandable)
- Server name
- Tool name
- Status with timestamp
- Input parameters (if available)
- Output/result (if completed)

#### Styling Notes
- Inline badges for server and tool
- Simple flex layout, 8px gaps
- Color indicates status (success green vs accent orange)

---

### 4. **AgentProgressBlock.tsx** (Lines 1-462)

#### Data Structure Received
```typescript
interface AgentProgressContent {
  type: 'agent_progress';
  prompt?: string;                    // Task given to subagent
  agentId?: string;                   // Unique agent ID
  messageType?: 'user' | 'assistant'; // Message type
  messageContent?: unknown[];         // Original message content
  tokenCount?: number;                // Estimated tokens
  messageCount?: number;              // Number of messages
  model?: string;                     // Model used
  agentType?: string;                 // "Explore", "Plan", "general-purpose", "Bash"
  agentDescription?: string;          // Short description
}
```

#### Current Inline Display (NOT Expanded)
- **Header** (CollapsibleBlock): Agent type badge + prompt preview (truncated to 60 chars) + stats
- **Stats Bar** (lines 152-186):
  - Type badge (colored, e.g., blue for "Explore", green for "Plan")
  - Model badge (if available)
  - Token badges (input/output tokens if subagent data loaded, otherwise estimated)
  - Cache info badge (if cache used)
  - Message count badge
- **Query Section** (lines 189-194): Full prompt in `<pre>` tag
- **Response Section** (lines 197-243):
  - Loading state with spinner (while fetching subagent data)
  - Error state with warning icon
  - Final response from subagent (auto-fetched on mount)
  - Plan agents: Rendered as Markdown (MarkdownRenderer component)
  - Regular agents: Rendered as `<pre>` (collapsible if >8 lines or >600 chars)

#### Expansion Mechanism
- **Uses CollapsibleBlock** with ref forwarding
- **Auto-fetching**: `useEffect` (lines 105-122) automatically fetches subagent data on mount
- **Response Expansion**: If response is long (>8 lines or >600 chars), shows "Show full response" button
- **Full Conversation Toggle** (lines 246-271):
  - Shows "View Full Conversation" button if both agentId and sessionId exist
  - Clicking loads entire SubagentConversation component (lazy loaded)
- **Ref Methods**: `expand()` to force expand, `scrollIntoView()` to scroll

#### Content for Modal
- **Query**: Full agent task/prompt
- **Response**: Complete final response (auto-loaded)
- **Full Conversation**: All messages between agent and Claude (user/assistant pairs)
- **Stats**: Token counts, model, message count, cache metrics
- **Agent Type**: Color-coded type indicator

#### Styling Notes
- Type badges: Solid colored backgrounds (blue, green, purple, etc.)
- Token badges: Orange background `rgba(230, 126, 82, 0.15)` with `accentOrange` color
- Response container: Uses `maxHeight: 168px` with overflow hidden when collapsed
- Plan responses: Green left border `#34D399`, green-tinted background
- Smooth transitions on all interactive elements

---

### 5. **AssistantMessage.tsx** - Content Type Rendering & Click Handling (Lines 23-223)

#### Overall Architecture
- **Main Container** (lines 90-135): Header with token breakdown + content area
- **ContentRenderer** (lines 145-223): Switch statement routes each content type to appropriate renderer

#### Header Display
- **Token Breakdown** (lines 94-110): Icon pills showing thinking tokens, tool tokens, text tokens
- **Total Token Badge** (line 111-113): Shows total tokens with "~" prefix if estimated
- **Timestamp** (line 114): Formatted to HH:MM

#### Content Type Routing (Switch Statement - lines 146-222)

| Type | Renderer | Behavior |
|------|----------|----------|
| `text` | TextBlock | Complex markdown parsing, conditional collapsing if >500 chars or >20 lines |
| `thinking` | CollapsibleBlock | Brain icon, token count summary, pre-formatted content |
| `tool_use` | CollapsibleBlock | Wrench icon, tool name + input summary, JSON-formatted input |
| `tool_result` | CollapsibleBlock | Check/Error icon, error flag styling, pre-formatted result |
| `code` | CodeBlock | Syntax highlighting component |
| `agent_progress` | AgentProgressBlock | Full subagent rendering with auto-fetch |
| `bash_progress` | BashProgressBlock | Bash output with duration/line count |
| `mcp_progress` | MCPProgressBlock | MCP status indicator |
| `web_search` | WebSearchBlock | Search query and results |

#### Click/Expansion Patterns

**1. TextBlock (lines 225-270)**
- Simple state: `useState(isExpanded)`
- Collapses if >500 chars or >20 lines (unless parent `allExpanded=true`)
- Truncates to 400 chars when collapsed
- Button text shows line count: `Show more (N lines)`
- Inline expansion with state toggle

**2. CollapsibleBlock-based Content**
- Theme icon rotates 90° when expanded
- Summary text only shows when collapsed
- Smooth animation on expand/collapse
- Children fade in with padding
- Used for: thinking, tool_use, tool_result

**3. AgentProgressBlock**
- Ref-based expansion with `useImperativeHandle`
- Auto-loading of subagent data
- Nested expansion: response can be expanded + full conversation can be toggled
- Supports `targetContentIndex` and `targetContentId` props for navigation

**4. BashProgressBlock**
- Ref-based expansion
- Fixed max-height: 300px during display
- Content always scrollable

**5. WebSearchBlock**
- Simple toggle button for URLs
- URLs only show when button is clicked
- Max-height: 200px for URL list

#### Navigation Targeting (Lines 27-56)
- **targetContentIndex**: Numeric index into `message.content` array
  - Finds ref at that index and calls `ref.expand()` then `ref.scrollIntoView()`
- **targetContentId**: String ID (e.g., agentId)
  - Searches through agent_progress contents for matching agentId
  - Performs same expand + scroll operations

---

### Summary: Current Expansion Strategies

1. **Simple Toggle**: WebSearchBlock - local state boolean
2. **Ref-Based (Controlled)**: CollapsibleBlock, AgentProgressBlock, BashProgressBlock - parent controls via ref
3. **Content-Length Based**: TextBlock - auto-collapses long text with "Show more" button
4. **Auto-Fetching**: AgentProgressBlock - loads subagent data on mount
5. **Nested Expansion**: AgentProgressBlock - response + full conversation are independent toggles
6. **Navigation Support**: AssistantMessage routes expansion requests to specific content blocks

---

### Data Flow for Modal Implementation

**For Modal, each block would provide:**

| Block Type | Modal Header | Modal Body | Source |
|------------|--------------|-----------|---------|
| WebSearch | Query + Status | All URLs with titles | Already loaded inline |
| Bash | Command + Duration | Full output + metadata | `fullOutput` prop |
| MCP | Server + Tool | Status + params + result | Needs fetching |
| AgentProgress | Agent Type + Prompt | Full conversation + response | Already auto-fetched via subagent data |
| Text | (message context) | Full text with markdown | Already inline |
| Thinking | Thinking summary | Full thinking text | Already inline |
| Tool Use | Tool name + input | Full JSON input + any results | Already inline |
| Tool Result | Tool result status | Full result content | Already inline |

All blocks are fully renderable without additional data fetching except potentially MCP (which currently shows minimal info).