# Explore: Explore content modal components

> Session: `e2f00a75-f290-4e4c-8246-423222b1fc29`
> Date: 2026-02-04
> Tokens: ~78 117

---

Perfect! Now I have a comprehensive view of the codebase. Let me create a summary document:

## Complete Exploration Summary

I've thoroughly explored the `/Users/gole/Desktop/jacques-context-manager/gui/src/` directory and identified the complete current architecture. Here's what exists:

### **Key Finding: ContentModal Does NOT Exist Yet**

The files you mentioned (`ContentModal.tsx`, `contentModalConfigs.tsx`, `useContentModal.ts`) do not exist. However, there is a **full conversation modal system already in place** that handles content expansion in a different way.

---

## **Current Architecture (What Exists)**

### **1. Core Display Components**

**ConversationViewer.tsx** (lines 1-861)
- Main conversation display component
- Manages message grouping, filtering, navigation
- Props: `conversation`, `onBack`
- Key features:
  - Content type filters (agentProgress, bashProgress, mcpProgress, webSearch, toolCalls, thinking)
  - Auto-expand/collapse all functionality
  - Message navigation (keyboard shortcuts: `[`/`]` for previous/next question, `e` to expand, `c` to collapse)
  - Right sidebar with three navigators: QuestionNavigator, PlanNavigator, SubagentNavigator

**AssistantMessageGroup.tsx** (lines 1-757)
- Groups consecutive assistant messages together
- Renders message header with token breakdown
- Maps each message content to appropriate renderer
- Auto-expands when navigation targets are set
- Contains all ContentRenderer logic directly (not extracted)

**AssistantMessage.tsx** (lines 1-396)
- Individual assistant message wrapper
- Uses CollapsibleBlock for thinking/tool_use/tool_result content
- Maps content types to specific block renderers

### **2. Collapsible Block System**

**CollapsibleBlock.tsx** (lines 1-121)
- Generic collapsible container component
- Props: `title`, `icon`, `summary`, `defaultExpanded`, `forceExpanded`, `headerStyle`, `children`
- Ref API: `expand()`, `scrollIntoView()`
- Used by: thinking, tool_use, tool_result, agent progress, bash progress

**Key implementation details:**
- Simple toggle expand/collapse button
- Summary shows when collapsed
- Content renders inside with `className="jacques-expand-content"`
- Rotates chevron icon on expand

### **3. Progress Block Renderers**

**AgentProgressBlock.tsx** (lines 1-462)
- Displays subagent execution progress
- Shows: agent type, model, token stats, query, final response
- Auto-fetches subagent data on mount using `getSubagentFromSession()`
- Features:
  - "View Full Conversation" toggle for full subagent JSONL
  - Response auto-collapsing if >8 lines or 600 chars
  - Markdown rendering for Plan agents
  - Detailed token breakdown (fresh input, cache creation, cache read)
- Ref API: `expand()`, `scrollIntoView()`

**BashProgressBlock.tsx** (lines 1-85)
- Shows bash command execution streaming output
- Props: `content`, `expanded`
- Features: elapsed time, line count summary
- Ref API: `expand()`, `scrollIntoView()`

**WebSearchBlock.tsx** (lines 1-157)
- Displays web search queries and results
- Toggle to show/hide URLs
- Simple state-based expansion (no refs)
- Renders URL list with titles and links

**MCPProgressBlock.tsx** (lines 1-64)
- Shows MCP tool call status
- Simple stateless display
- Shows: server name, tool name, completion status

### **4. Plan Display System**

**PlanNavigator.tsx** (lines 1-440)
- Right sidebar navigator for plans
- Detects three plan sources:
  1. **Embedded**: User messages with trigger patterns ("Implement the following plan:")
  2. **Written**: Write tool calls to plan files (detects via path and markdown validation)
  3. **Agent**: Plan agent responses (agentType === 'Plan')
- Features:
  - Grouped by source type
  - Shows plan count, title, preview
  - "View" button to open full plan
  - Active plan highlight based on scroll position
  - Collapsible section

**PlanViewer.tsx** (lines 1-281)
- Modal overlay component that displays full plan content
- Props: `plan`, `sessionId`, `onClose`
- Fetches plan content from API:
  - For embedded/written: `/api/sessions/{sessionId}/plans/{messageIndex}`
  - For agent: `/api/sessions/{sessionId}/subagents/{agentId}`
- Features:
  - Loading state with spinner
  - Error handling
  - Markdown rendering via MarkdownRenderer
  - Close button + Escape key handler
  - Shows source icon and label
  - Styled modal with 80% width, 80vh max height

### **5. Supporting Components**

**MarkdownRenderer.tsx** (lines 1-170)
- Uses react-markdown for rendering markdown
- Custom styled components for all markdown elements
- Full table support, links, blockquotes, code blocks

**CodeBlock.tsx** (lines 1-89)
- Displays code with syntax highlighting capability
- Language label + line count
- Copy to clipboard button with feedback

### **6. Type System (types.ts)**

**MessageContent union type** includes:
```typescript
type MessageContent =
  | TextContent
  | ThinkingContent
  | ToolUseContent
  | ToolResultContent
  | CodeContent
  | AgentProgressContent
  | BashProgressContent
  | MCPProgressContent
  | WebSearchContent;
```

**AgentProgressContent** structure:
```typescript
interface AgentProgressContent {
  type: 'agent_progress';
  prompt?: string;
  agentId?: string;
  tokenCount?: number;
  messageCount?: number;
  model?: string;
  agentType?: string;  // 'Explore', 'Plan', 'general-purpose', etc.
  agentDescription?: string;
}
```

### **7. Navigation & Auto-Expand System**

In ConversationViewer.tsx:
- State: `navigationTarget` with structure:
  ```typescript
  interface NavigationTarget {
    messageIndex: number;
    contentIndex?: number;
    contentId?: string;  // e.g., agentId for subagents
  }
  ```
- Method `navigateToMessage()` scrolls to element and sets target
- AssistantMessageGroup receives `targetMessageIndex`, `targetContentIndex`, `targetContentId` props
- Auto-expands matching content via ref methods

---

## **How Expand Buttons Work Currently**

1. **CollapsibleBlock headers** act as buttons
2. Clicking toggles local `isExpanded` state
3. Content appears/disappears when expanded
4. Refs allow parent to programmatically expand
5. Navigation triggers auto-expand from right sidebar

---

## **Key Files Location Summary**

| File | Lines | Purpose |
|------|-------|---------|
| `gui/src/components/Conversation/ConversationViewer.tsx` | 861 | Main orchestrator, message grouping, navigation |
| `gui/src/components/Conversation/AssistantMessageGroup.tsx` | 757 | Groups assistant messages, content rendering |
| `gui/src/components/Conversation/AssistantMessage.tsx` | 396 | Individual message wrapper |
| `gui/src/components/Conversation/CollapsibleBlock.tsx` | 121 | Reusable collapsible container |
| `gui/src/components/Conversation/AgentProgressBlock.tsx` | 462 | Subagent display with full conversation toggle |
| `gui/src/components/Conversation/BashProgressBlock.tsx` | 85 | Bash output display |
| `gui/src/components/Conversation/WebSearchBlock.tsx` | 157 | Web search results |
| `gui/src/components/Conversation/MCPProgressBlock.tsx` | 64 | MCP tool calls |
| `gui/src/components/Conversation/PlanNavigator.tsx` | 440 | Right sidebar plan detector |
| `gui/src/components/Conversation/PlanViewer.tsx` | 281 | Modal for viewing full plans |
| `gui/src/components/Conversation/MarkdownRenderer.tsx` | 170 | Markdown rendering |
| `gui/src/components/Conversation/CodeBlock.tsx` | 89 | Code display |
| `gui/src/types.ts` | 340 | All type definitions |

---

## **What Needs to Be Created**

Based on your requirements, you would need to create:

1. **ContentModal.tsx** - Generic modal for expanded content display
2. **contentModalConfigs.tsx** - Factory functions for different modal configurations
3. **useContentModal.ts** - Hook to manage modal state and configuration
4. Integration points in existing components to use the new modal system

The current system is **fully functional but tightly coupled** - each content type handles its own expansion/display logic. A ContentModal system would centralize this into reusable modal patterns.