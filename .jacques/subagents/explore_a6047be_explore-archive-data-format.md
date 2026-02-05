# Explore: Explore archive data format

> Session: `02fa9321-cb8c-45e3-afd2-654a76f9985c`
> Date: 2026-02-01
> Tokens: ~53 499

---

Now I have a comprehensive understanding. Let me provide a detailed report to the user.

## Archived Conversation Format Investigation

I've completed a thorough investigation of the archive system in Jacques. Here's what I found:

### 1. Archive Data Structure

The archive system uses a **two-tier storage model**:

#### Tier 1: ConversationManifest (~1-2 KB metadata)
Located at `~/.jacques/archive/manifests/{id}.json`

The manifest contains lightweight searchable metadata:

```typescript
interface ConversationManifest {
  // Session identity
  id: string;                          // UUID
  projectSlug: string;                 // e.g., "jacques-context-manager"
  projectPath: string;                 // Full path
  
  // Archival metadata
  archivedAt: string;                  // ISO timestamp
  autoArchived: boolean;               // SessionEnd hook (true) vs manual save (false)
  
  // Content summary
  title: string;                       // Claude's summary or fallback
  startedAt: string;                   // Session start time
  endedAt: string;                     // Session end time
  durationMinutes: number;
  
  // Searchable content
  userQuestions: string[];             // Truncated to 200 chars each
  filesModified: string[];             // Write/Edit tool paths
  toolsUsed: string[];                 // Unique tool names
  technologies: string[];              // Detected tech stack
  plans: PlanReference[];              // Embedded or write-detected plans
  
  // Optional content snippets
  contextSnippets?: string[];          // Up to 5 snippets, 150 chars max
  
  // Statistics
  messageCount: number;
  toolCallCount: number;
  userLabel?: string;                  // Manual user label
}
```

#### Tier 2: SavedContext (full conversation, ~50-500 KB)
Located at `~/.jacques/archive/conversations/{project}/{filename}.json`

The full conversation contains every message with detailed metadata:

```typescript
interface SavedContext {
  contextGuardian: {
    version: string;           // "1.0.0"
    savedAt: string;          // Archive timestamp
    sourceFile: string;       // Original JSONL path
    filterApplied?: string;   // "everything" | "without_tools" | "messages_only"
  };
  
  session: {
    id: string;
    slug: string;
    startedAt: string;
    endedAt: string;
    claudeCodeVersion?: string;
    model?: string;            // e.g., "claude-3-5-sonnet-20241022"
    gitBranch?: string;
    workingDirectory?: string;
    summary?: string;          // Claude's summary
  };
  
  statistics: {
    totalEntries: number;
    userMessages: number;
    assistantMessages: number;
    toolCalls: number;
    hookEvents: number;
    systemEvents: number;
    turnCount: number;
    tokens?: {                 // Only if present
      totalInput: number;
      totalOutput: number;
      cacheCreation?: number;
      cacheRead?: number;
    };
    totalDurationMs?: number;
    estimatedCost?: number;
  };
  
  conversation: DisplayMessage[];
}
```

### 2. DisplayMessage Structure (individual message in archive)

```typescript
interface DisplayMessage {
  id: string;                // UUID
  type:                      // One of:
    | "user_message"         // - User text input
    | "assistant_message"    // - Claude response + thinking
    | "tool_call"            // - Tool invocation
    | "tool_result"          // - Tool output
    | "hook_progress"        // - Hook execution logs
    | "turn_duration"        // - Turn timing
    | "system_event"         // - System events
    | "error";
    
  timestamp: string;         // ISO timestamp
  
  content: {
    text?: string;           // Text content (user/assistant)
    thinking?: string;       // Claude's extended thinking/reasoning
    toolName?: string;       // e.g., "Write", "Read", "Bash"
    toolInput?: Record<string, unknown>;    // Tool parameters
    toolResult?: string;     // Tool output
    summary?: string;        // For summary entries
    eventType?: string;      // System event type
    hookEvent?: string;      // "SessionStart", "Stop", etc.
    hookName?: string;       // Full hook name
    hookCommand?: string;    // Executed command
  };
  
  metadata: {
    model?: string;          // Model that generated message
    tokens?: {
      input: number;
      output: number;
    };
    costUSD?: number;        // Estimated cost
    durationMs?: number;     // Turn duration
    parentId?: string;       // Parent message UUID
  };
}
```

### 3. Original JSONL vs Archive Format

**Data Preserved:**
- User messages and assistant responses (text content)
- Claude's extended thinking
- Tool calls and their inputs
- Token counts (input/output, cache read/creation)
- Cost estimates
- Turn durations
- Model information
- Session metadata

**Data Lost During Archiving:**
- File history snapshots (skipped explicitly)
- Queue operation metadata (only messages extracted)
- Internal XML tags from input (stripped by parser)
- Raw JSONL line-by-line structure (reorganized by type)
- Some system events (filtered by type)
- Hook progress details (simplified to basic info)

**Key Transformations:**

| JSONL Field | Archive Field | Notes |
|------------|---------------|-------|
| `type: "user"` | `DisplayMessage.type: "user_message"` | Normalized naming |
| `type: "assistant"` with `tool_use` block | `DisplayMessage.type: "tool_call"` | Separated from text responses |
| `message.usage.input_tokens` | `DisplayMessage.metadata.tokens.input` | Flattened structure |
| `costUSD` | `DisplayMessage.metadata.costUSD` | Preserved as-is |
| `timestamp` | Both manifest AND message stored | Enables timeline reconstruction |
| `sessionId` | Manifest ID | Used as primary key |

### 4. Token-Related Fields in Archive

**At Session Level** (statistics):
- `totalInput`: Sum of all input tokens across conversation
- `totalOutput`: Sum of all output tokens
- `cacheCreation`: Optional prompt caching creation tokens
- `cacheRead`: Optional prompt caching read tokens

**At Message Level** (per DisplayMessage):
- `metadata.tokens.input`: Input tokens for that specific message
- `metadata.tokens.output`: Output tokens for that specific message
- `costUSD`: Estimated cost for that message
- `durationMs`: Wall-clock time for that message

**Important:** Token counts come from Claude Code's JSONL format. The archive **does NOT estimate** tokens—only preserves what Claude Code reported. If tokens are missing from the JSONL, they won't appear in the archive.

### 5. Filtering During Archive

Three filter levels control what gets saved:

```typescript
enum FilterType {
  EVERYTHING       // All data preserved
  WITHOUT_TOOLS    // Removes tool_call and tool_result entries
  MESSAGES_ONLY    // Only user_message + assistant_message
                   // Plus strips: thinking, code blocks
}
```

Applied during `SavedContext` transformation:
- **Everything**: Full conversation with all message types
- **Without Tools**: User/assistant/system/hooks/turns, but no tool execution details
- **Messages Only**: Pure conversation (stripped of thinking + code blocks)

### 6. Filename Format

Readable, sortable filename scheme:
```
[YYYY-MM-DD]_[HH-MM]_[title-slug]_[4-char-id].json

Example: 2026-01-31_14-30_jwt-auth-setup_8d84.json
```

### 7. Archive Storage Hierarchy

```
~/.jacques/archive/
├── index.json                              # Search index
├── manifests/
│   ├── {session-id}.json                   # ~1-2 KB each
│   └── ...
├── conversations/
│   ├── {project-slug}/
│   │   ├── 2026-01-31_14-30_title_8d84.json
│   │   └── ...
│   └── ...
└── plans/
    ├── {project-slug}/
    │   ├── 2026-01-31_auth-plan.md
    │   └── ...
    └── ...

Local project archive (.jacques/):
├── sessions/
│   └── {same filename scheme}
├── plans/
└── context/
```

### 8. Key Insights on Data Loss vs Preservation

**What makes archived data useful:**
- Full message text and thinking preserved exactly
- Token counts retained for cost analysis
- Tool names and inputs available for impact analysis
- Timestamps enable timeline reconstruction
- Technologies detected automatically from content + files

**What's not available for context breakdown:**
- Cache metrics (included but often empty)
- Skill overhead detection (must be recalculated)
- Exact prompt/system prompt token usage (aggregated only)
- Per-file token attribution (tool paths stored, but usage not per-file)

**Why this matters:**
The archive is optimized for **conversation replay and search**, not for detailed **token accounting**. To implement Phase 5 (context breakdown by category), you would need to:
1. Either store per-category token counts during archiving, OR
2. Re-analyze the conversation when displaying breakdown details

---

**Files Read:**
- `/Users/gole/Desktop/jacques-context-manager/core/src/archive/types.ts` - Type definitions
- `/Users/gole/Desktop/jacques-context-manager/core/src/archive/manifest-extractor.ts` - Extraction logic
- `/Users/gole/Desktop/jacques-context-manager/core/src/archive/archive-store.ts` - Storage and search
- `/Users/gole/Desktop/jacques-context-manager/core/src/session/transformer.ts` - SavedContext transformation
- `/Users/gole/Desktop/jacques-context-manager/core/src/session/parser.ts` - JSONL parsing with full type definitions
- `/Users/gole/Desktop/jacques-context-manager/core/src/session/filters.ts` - Filter application logic