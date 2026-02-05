# Explore: Explore JSONL task tracking format

> Session: `c6426d56-efd3-416b-a98f-8e7cd55d38b8`
> Date: 2026-02-03
> Tokens: ~66 234

---

Perfect! Now I have a comprehensive understanding. Let me create a final summary document:

## Summary: Task/Todo Progress Tracking in Claude Code JSONL Transcripts

Based on my research of the Jacques codebase, here's what I found about how Claude Code JSONL transcripts track task progress:

### Key Finding: Task Tool in JSONL

Claude Code uses a **Task tool** to create subagents/delegated work. This is tracked in the JSONL as `tool_use` entries:

**Location in JSONL**: `assistant` entries contain `message.content[]` array with `type: "tool_use"` blocks where `name === "Task"`

**Task Tool Input Structure** (from `core/src/session/parser.ts`):
```typescript
{
  type: "tool_use",
  id: "<tool-use-id>",
  name: "Task",
  input: {
    subagent_type: string;    // "Explore", "Plan", "general-purpose", etc.
    description: string;       // Short description of the task
    prompt: string;            // Full prompt given to the agent
    // ... other fields
  }
}
```

### How Task Progress is Tracked

1. **Task Calls** are extracted from assistant `tool_use` blocks
2. **Task Completion** is tracked via **agent_progress entries** in the main JSONL:
   - When a Task tool is invoked, Claude Code creates a subagent
   - The subagent's work creates `progress` entries with `data.type: "agent_progress"`
   - These entries have `parentToolUseID` that links back to the original Task tool call
   - The entry contains the agent's response

**Agent Progress Entry Structure**:
```json
{
  "type": "progress",
  "parentToolUseID": "<task-tool-use-id>",
  "data": {
    "type": "agent_progress",
    "prompt": "Task given to the agent",
    "agentId": "a6047be",
    "message": {
      "type": "user" | "assistant",
      "message": { "role": "...", "content": [...] }
    }
  }
}
```

### Current Limitations for Task Completion Tracking

The codebase currently **does not explicitly track task completion status** with fields like `status: "completed" | "pending"`. Instead, completion is inferred from:

1. **Presence of agent_progress**: If an agent_progress entry exists with the same parentToolUseID, the task was executed
2. **Agent Response Content**: The `message.content` in agent_progress shows what the agent produced
3. **No explicit status field**: JSONL entries don't have a "completed" or "pending" status marker

### Available Data in JSONL for Task Tracking

From `core/src/session/parser.ts` - TaskToolInfo interface:
```typescript
export interface TaskToolInfo {
  toolUseId: string;              // Original Task tool invocation ID
  subagentType: string;           // Task category (Explore, Plan, etc.)
  description?: string;           // What was asked
  prompt?: string;                // Full task prompt
}
```

And from ParsedContent interface:
```typescript
agentPrompt?: string;             // Task prompt to agent
agentId?: string;                 // Subagent ID
agentMessageType?: "user" | "assistant";
agentMessageContent?: unknown[];  // Agent's response
agentType?: string;               // Subagent type from Task
agentDescription?: string;        // Description from Task tool
```

### What Data Is Available to Determine Completion

1. **Task was created**: Tool_use entry exists with name "Task"
2. **Task was started**: agent_progress entry exists with matching parentToolUseID
3. **What the agent produced**: Message content in agent_progress shows output
4. **Agent type**: Know if it was Explore, Plan, etc.
5. **Execution status**: If agent_progress exists, task was at least started

### What Data Is NOT Available

- No explicit `completed: boolean` field
- No status enum (`pending | in_progress | completed`)
- No failure/error status tracking
- No explicit "abandoned task" marker
- No task dependencies or blocking relationships

### Related Files in Codebase

- **Parser**: `/Users/gole/Desktop/jacques-context-manager/core/src/session/parser.ts` - Extracts and links Task calls to agent_progress
- **Types**: `/Users/gole/Desktop/jacques-context-manager/core/src/session/parser.ts` lines 118-123 (TaskToolInfo interface)
- **Archive**: `/Users/gole/Desktop/jacques-context-manager/core/src/archive/types.ts` - Has SubagentSummary tracking subagent invocation counts

### Important Note

The system distinguishes between **user-visible agents** (from Task tool calls, have agent_progress entries in main JSONL) and **internal agents** (auto-compact, prompt_suggestion that have separate JSONL files but no agent_progress in main transcript).