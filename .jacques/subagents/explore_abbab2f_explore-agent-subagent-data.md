# Explore: Explore agent/subagent data

> Session: `f8a3c98c-94f5-454a-a33d-ccfa8f81916b`
> Date: 2026-02-03
> Tokens: ~79 045

---

Perfect! Now I have enough information. Let me create a comprehensive research report for you.

## Research Summary: Explore Agent Output Storage and Structure

Based on my analysis of the codebase, here's what I found about how Explore agent outputs are stored and structured:

### 1. **Subagent Storage Architecture**

Explore agents (along with Plan and other subagents) are stored in separate JSONL files:

**Location:** `~/.claude/projects/{encoded-project-path}/{session-id}/subagents/agent-{agentId}.jsonl`

**File Detection** (`core/src/session/detector.ts`):
- The `listSubagentFiles()` function locates all subagent JSONL files for a session
- Agent IDs are extracted from filenames: `agent-a0323e0.jsonl` → agent ID `a0323e0`
- Each subagent file is a complete JSONL conversation

### 2. **Agent Type Classification**

The system tracks agent types in the `Task` tool call:

**Source:** `core/src/session/parser.ts` (lines 364-371)
```typescript
context.taskCalls.set(block.id, {
  toolUseId: block.id,
  subagentType: (input.subagent_type as string) || "unknown",  // "Explore", "Plan", etc.
  description: input.description as string | undefined,        // Short description
  prompt: input.prompt as string | undefined,                  // Full prompt
});
```

**Available Data:**
- `subagentType`: "Explore", "Plan", "general-purpose", etc.
- `description`: Short user-facing description of the task
- `prompt`: Full prompt text given to the agent

### 3. **Agent Progress Entry Structure**

When an `agent_progress` entry is created in the main JSONL, it links to the parent Task tool call:

**From `core/src/session/parser.ts` (lines 543-562):**
```typescript
case "agent_progress": {
  const parentToolUseId = progressEntry.parentToolUseID;
  const taskInfo = parentToolUseId ? context?.taskCalls.get(parentToolUseId) : undefined;

  return {
    type: "agent_progress",
    content: {
      agentPrompt: progressEntry.data?.prompt,           // From progress event
      agentId: progressEntry.data?.agentId,
      agentMessageType: progressEntry.data?.message?.type,
      agentMessageContent: progressEntry.data?.message?.message?.content,
      agentType: taskInfo?.subagentType,                 // From Task tool call
      agentDescription: taskInfo?.description,           // From Task tool call
    },
  };
}
```

**Available Fields in `ParsedEntry.content` (for `agent_progress` type):**
- `agentPrompt`: The prompt from the progress event
- `agentId`: The agent's ID
- `agentMessageType`: "user" or "assistant"
- `agentMessageContent`: The message content array
- `agentType`: "Explore", "Plan", etc. (from parent Task call)
- `agentDescription`: Task description (from parent Task call)

### 4. **Accessing Subagent Output via HTTP API**

The server exposes subagent conversations through REST endpoints:

**Endpoint:** `GET /api/sessions/{sessionId}/subagents/{agentId}`

**Response** (`server/src/http-api.ts`, lines 800-821):
```typescript
{
  id: agentId,
  sessionId,
  prompt: string,  // First user message from subagent JSONL
  model: string,   // Model used
  entries: ParsedEntry[],  // All parsed entries from subagent JSONL
  statistics: {
    messageCount: number,
    toolCallCount: number,
    tokens: {
      totalInput: number,
      totalOutput: number,
      freshInput?: number,
      cacheCreation?: number,
      cacheRead?: number,
    },
    durationMs?: number,
  },
}
```

### 5. **Subagent Archive Storage**

When archived, subagents are stored separately:

**Location:** `~/.jacques/archive/subagents/{agentId}.json`

**Archived Subagent Structure** (`core/src/archive/subagent-store.ts`, lines 38-60):
```typescript
{
  id: string;                    // Agent ID
  sessionId: string;             // Parent session ID
  projectSlug: string;           // Project name
  archivedAt: string;            // ISO timestamp
  prompt: string;                // Task prompt given to agent
  model?: string;                // Model used
  conversation: DisplayMessage[]; // Full conversation with formatted messages
  statistics: {
    messageCount: number;
    toolCallCount: number;
    tokens: SubagentTokenStats;
    durationMs?: number;
  };
}
```

### 6. **Extracting Agent Outputs**

To get the final text response from an Explore agent:

**Step 1:** Parse the subagent JSONL entries
**Step 2:** Find `assistant_message` type entries with `content.text` field
**Step 3:** Concatenate all text blocks from assistant messages

**The Final Output:**
- Assistant messages contain the agent's final response/document
- Entry type `"assistant_message"` has `content.text` with the markdown/text output
- Multiple text blocks can be concatenated for complete output

### 7. **Type Definitions Available**

**From `gui/src/api/config.ts` (lines 598-621):**
```typescript
interface SubagentData {
  id: string;
  sessionId: string;
  prompt: string;           // The task prompt
  model?: string;           // Model used
  entries: ParsedEntry[];   // All conversation entries
  statistics: {
    messageCount: number;
    toolCallCount: number;
    tokens: { ... };
    durationMs?: number;
  };
}
```

### 8. **Key Data Points You Can Extract**

For an Explore agent, you can get:

1. **Agent Type**: From the Task tool call (`agentType` = "Explore")
2. **Agent Description**: From the Task tool call (`agentDescription`)
3. **Agent Prompt**: Full prompt text given to the agent (`prompt` field)
4. **Final Output/Document**: Text content from `assistant_message` entries in subagent JSONL
5. **Conversation**: Full message history (user → assistant exchanges)
6. **Token Usage**: Input/output tokens, cache metrics
7. **Model**: Which Claude model was used
8. **Duration**: How long the subagent ran

### 9. **Important Implementation Details**

- **Subagent type is determined at Task call time**, not stored in the subagent JSONL itself
- The main JSONL contains `agent_progress` entries that reference the subagent
- These `agent_progress` entries link to the parent Task tool call via `parentToolUseID`
- Internal agents (like `acompact-*` and `aprompt_suggestion-*`) are filtered out from user-visible counts
- The subagent JSONL is a complete, independent conversation file

### 10. **Current API Accessibility**

All this data is accessible via:
- **Direct file reading**: `core/src/session/parser.ts` - `parseJSONL()`
- **HTTP API**: `GET /api/sessions/{sessionId}/subagents/{agentId}`
- **GUI types**: `gui/src/api/config.ts` - `SubagentData` interface
- **Archive**: `~/.jacques/archive/subagents/{agentId}.json` (after archiving)

The system is well-structured to extract full context about Explore agents including their prompts, types, and complete output documents.