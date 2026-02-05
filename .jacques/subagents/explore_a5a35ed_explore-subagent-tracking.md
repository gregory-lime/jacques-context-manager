# Explore: Explore subagent tracking

> Session: `b1a7eed5-9a35-4ace-a47b-6865d6338fc8`
> Date: 2026-02-02
> Tokens: ~65 458

---

Perfect! Now I have comprehensive understanding. Let me create a thorough exploration report.

## Comprehensive Report: Subagent/Agent Tracking in Jacques Codebase

Based on my exploration of the codebase, here's a detailed analysis of how subagents (agents/questions from Task tool calls) are tracked:

### 1. **How Subagents Are Detected in Conversation Transcripts**

#### Agent Progress Entries
Subagent activity is captured via **`agent_progress` entries** in the parsed transcript (`core/src/session/parser.ts`):

```typescript
// From RawProgressEntry in parser.ts
case "agent_progress": {
  // Look up agent type from parent Task tool call
  const parentToolUseId = progressEntry.parentToolUseID;
  const taskInfo = parentToolUseId ? context?.taskCalls.get(parentToolUseId) : undefined;

  return {
    uuid,
    parentUuid,
    timestamp,
    sessionId,
    type: "agent_progress",
    content: {
      agentPrompt: progressEntry.data?.prompt,      // The question/task prompt
      agentId: progressEntry.data?.agentId,          // Agent ID (e.g., "a0323e0")
      agentMessageType: progressEntry.data?.message?.type,
      agentMessageContent: progressEntry.data?.message?.message?.content,
      agentType: taskInfo?.subagentType,             // "Explore", "Plan", etc.
      agentDescription: taskInfo?.description,       // Short description
    },
  };
}
```

#### Task Tool Call Context
The parsing system maintains a **`ParseContext`** that tracks Task tool calls:

```typescript
export interface ParseContext {
  /** Map of tool_use ID to Task tool info */
  taskCalls: Map<string, TaskToolInfo>;
}

export interface TaskToolInfo {
  toolUseId: string;
  subagentType: string; // "Explore", "Plan", "general-purpose", etc.
  description?: string; // Short description
  prompt?: string; // Full prompt given to the agent
}
```

**Key flow (lines 358-396 in parser.ts)**:
1. First pass: `extractContextFromEntry()` finds all Task tool calls in assistant entries
2. Stores Task info indexed by `tool_use_id`
3. Second pass: `categorizeEntry()` uses parent `parentToolUseID` to link `agent_progress` back to their Task calls
4. Enriches agent_progress with `agentType` and `agentDescription`

---

### 2. **What Data Is Extracted About Each Subagent**

#### Stored in ParsedContent
```typescript
export interface ParsedContent {
  // For agent_progress (subagent/explore calls)
  agentPrompt?: string;                    // The question/task prompt
  agentId?: string;                        // e.g., "a0323e0"
  agentMessageType?: "user" | "assistant"; // "user" for question, "assistant" for response
  agentMessageContent?: unknown[];         // Full message content (array of blocks)
  agentType?: string;                      // Subagent type: "Explore", "Plan", "general-purpose"
  agentDescription?: string;               // Short description from Task tool call
}
```

#### Archived as ArchivedSubagent
From `core/src/archive/subagent-store.ts`:

```typescript
export interface ArchivedSubagent {
  id: string;                          // Agent ID (e.g., "a0323e0")
  sessionId: string;                   // Parent session ID
  projectSlug: string;                 // Project name
  archivedAt: string;                  // ISO timestamp
  prompt: string;                      // Task prompt (first user message of subagent)
  model?: string;                      // Model used (e.g., "claude-haiku-4-5")
  conversation: DisplayMessage[];      // Full conversation messages
  statistics: {
    messageCount: number;
    toolCallCount: number;
    tokens: SubagentTokenStats;
    durationMs?: number;
  };
}
```

#### SubagentReference (for manifest/index linking)
```typescript
export interface SubagentReference {
  id: string;                          // Agent ID
  sessionId: string;
  promptPreview: string;               // Max 100 chars
  model?: string;
  tokenCount: number;
  messageCount: number;
  position: {
    afterMessageUuid?: string;         // UUID of preceding message in parent
    index: number;                     // Position in conversation
  };
}
```

---

### 3. **How the Session Parser Handles agent_progress Entries**

#### Parsing Flow (parser.ts, lines 301-353)

**Two-pass approach:**

**Pass 1: Context Extraction**
- `extractContextFromEntry()` (lines 358-396) scans all entries
- Finds `assistant` entries with `tool_use` blocks where `name === "Task"`
- Extracts `subagent_type` and `prompt` from tool input
- Stores in `context.taskCalls` Map indexed by `tool_use_id`

**Pass 2: Categorization**
- `categorizeEntry()` processes each entry
- For `type: "progress"` with `data.type === "agent_progress"`:
  - Reads `parentToolUseID` from the entry
  - Looks up corresponding Task info from context
  - Combines agent_progress data with Task metadata
  - Returns enriched ParsedEntry

**Key Link**: `parentToolUseID` connects agent_progress to parent Task call:
```typescript
// From RawProgressEntry interface (line 85)
parentToolUseID?: string; // Links agent_progress to parent Task tool call
```

#### Entry Statistics
`getEntryStatistics()` (lines 759-903) counts:
- `agentCalls`: Entries where `type === "agent_progress"` (line 834)
- Token usage from each agent_progress entry

---

### 4. **Where Subagent Data Is Stored/Indexed**

#### File System Structure
```
~/.claude/projects/{encoded-path}/
├── {session-id}.jsonl                 # Main conversation
└── {session-id}/
    └── subagents/
        ├── agent-a0323e0.jsonl        # User-visible agent (e.g., Explore)
        ├── agent-acompact-83efcb.jsonl  # Internal: auto-compact (filtered out)
        └── agent-aprompt_suggestion-4e4eb6.jsonl  # Internal (filtered out)
```

#### Detection (detector.ts, lines 195-240)
`listSubagentFiles()` scans the subagents directory:
- Looks for files matching pattern: `agent-{agentId}.jsonl`
- Returns sorted array of `SubagentFile` objects
- Distinguishes user-visible from internal agents (by ID prefix)

#### Archive Storage (subagent-store.ts)
```
~/.jacques/archive/subagents/{agentId}.json  # Full archived subagent
```

#### Session Index (cache/session-index.ts, lines 248-256)
Session entries track subagents:
```typescript
export interface SessionEntry {
  hasSubagents: boolean;                    // Whether user-visible subagents exist
  subagentIds?: string[];                   // User-visible IDs (excludes internal)
  hadAutoCompact?: boolean;                 // Auto-compact indicator
}
```

**Filtering logic** (lines 253-256):
```typescript
// Filter out internal agents (prompt_suggestion, acompact)
const userVisibleSubagents = subagentFiles.filter((f: SubagentFile) =>
  !f.agentId.startsWith('aprompt_suggestion-') &&
  !f.agentId.startsWith('acompact-')
);
```

---

### 5. **Key Files and Their Roles**

| File | Purpose |
|------|---------|
| `core/src/session/parser.ts` | Parses JSONL, extracts agent_progress, links to Task calls |
| `core/src/session/detector.ts` | Finds subagent JSONL files in file system |
| `core/src/session/transformer.ts` | Transforms parsed entries to display format |
| `core/src/archive/subagent-store.ts` | Manages archived subagent storage/retrieval |
| `core/src/archive/bulk-archive.ts` | Archives entire sessions + subagents (lines 154-230, 259-288) |
| `core/src/cache/session-index.ts` | Lightweight index with subagent metadata (lines 248-256) |
| `core/src/archive/manifest-extractor.ts` | Extracts manifests (calls `detectPlans()` line 160, but NOT agent_progress extraction) |

---

### 6. **Extracting Questions from Conversations**

**Current Implementation**:
- **User questions**: Extracted from `user_message` entries (manifest-extractor.ts, lines 273-284)
- **Agent prompts**: Available in `ParsedEntry.content.agentPrompt` from agent_progress entries

**To extract "questions" as user-triggered Task calls**:

1. **Filter for agent_progress entries** with `agentType !== "acompact"` and `agentType !== "aprompt_suggestion"`
2. **Use `agentPrompt`** field (the question given to the agent)
3. **Optional**: Cross-reference with `agentDescription` for metadata

**Example extraction pattern**:
```typescript
const questions = entries
  .filter((e) => e.type === "agent_progress")
  .filter((e) => {
    const id = e.content.agentId || "";
    return !id.startsWith("acompact-") && !id.startsWith("aprompt_suggestion-");
  })
  .map((e) => ({
    id: e.content.agentId,
    question: e.content.agentPrompt,
    type: e.content.agentType,
    description: e.content.agentDescription,
  }));
```

---

### 7. **Critical Implementation Details**

**Context Tracking**:
- Task calls must be extracted BEFORE processing agent_progress
- `parentToolUseID` is the link (not the tool_use_id in agent_progress itself)

**Internal vs User-Visible Agents**:
- Agent IDs starting with `acompact-` or `aprompt_suggestion-` are internal
- These are filtered out in session-index.ts and counts
- Only user-triggered agents shown in UI

**Token Estimation**:
- Subagent token counts are estimated from text via tiktoken
- Each subagent conversation has separate statistics
- Total parent session tokens ≠ sum of subagent tokens

**File Storage**:
- Main conversation: `{sessionId}.jsonl`
- Subagent conversations: `{sessionId}/subagents/agent-{agentId}.jsonl`
- Archive copies: `~/.jacques/archive/subagents/{agentId}.json`

---

### 8. **Data Flow Diagram**

```
JSONL File
    ↓
Session Parser (2-pass)
    ├─ Pass 1: Extract Task calls → ParseContext.taskCalls Map
    └─ Pass 2: Categorize entries, link agent_progress via parentToolUseID
    ↓
ParsedEntry[] (includes agent_progress with agentType, agentPrompt)
    ↓
Bulk Archive
    ├─ Manifest Extractor (doesn't process agent_progress)
    ├─ Subagent Files Detector (finds agent-*.jsonl files)
    └─ Subagent Archiver (parses each agent-*.jsonl separately)
    ↓
Archive Storage
    ├─ ~/.jacques/archive/subagents/{agentId}.json (full conversation)
    └─ Session Index (metadata about subagents)
```

This structure enables efficient tracking, searching, and retrieval of subagent interactions across multiple sessions.