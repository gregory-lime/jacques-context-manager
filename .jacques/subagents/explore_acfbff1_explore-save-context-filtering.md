# Explore: Explore Save Context filtering

> Session: `cd506061-fc7c-4e92-a166-1ef4456fc31c`
> Date: 2026-02-01
> Tokens: ~45 793

---

Perfect! Now I have a comprehensive understanding of the Save Context feature. Let me provide you with a detailed analysis.

## Save Context Feature Analysis

I've explored the Jacques dashboard's Save Context feature. Here's what I found:

### 1. Filter Types & Configurations

**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/session/filters.ts`

There are **3 filter types** with specific purposes:

```typescript
enum FilterType {
  EVERYTHING = "everything",           // Full context with all data
  WITHOUT_TOOLS = "without_tools",     // Remove tool calls and results
  MESSAGES_ONLY = "messages_only",     // Just conversational text, no code/tools/thinking
}
```

Each filter has a configuration with:
- **Label**: Display name for the UI
- **Suffix**: Appended to saved filename (e.g., `_full`, `_no-tools`, `_messages`)
- **Description**: Explains what gets included

### 2. Filtering Logic - What Gets Kept vs Discarded

**For `EVERYTHING`**:
- Includes all parsed entries with no filtering

**For `WITHOUT_TOOLS`**:
- **Excludes**: `tool_call` and `tool_result` entries
- **Keeps**: User messages, assistant messages, system events, hook events, summaries

**For `MESSAGES_ONLY`**:
- **Only includes**: `user_message` and `assistant_message` entries
- **Removes from kept entries**: 
  - Thinking blocks (Claude's extended reasoning)
  - Code blocks (markdown fenced code ```...```)
- These are stripped by the `cleanForMessagesOnly()` function using regex to replace code blocks with `[code removed]`

### 3. SavedContext Type Structure

**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/session/transformer.ts`

The saved context file has this structure:

```typescript
interface SavedContext {
  contextGuardian: {
    version: string;                    // "1.0.0"
    savedAt: string;                    // ISO timestamp
    sourceFile: string;                 // Original JSONL file path
    filterApplied?: string;             // Filter type used
  };
  session: SessionInfo {
    id: string;
    slug: string;                       // Human-readable short identifier
    startedAt: string;                  // ISO timestamp
    endedAt: string;                    // ISO timestamp
    claudeCodeVersion?: string;
    model?: string;
    gitBranch?: string;
    workingDirectory?: string;
    summary?: string;                   // Auto-generated session summary
  };
  statistics: SessionStatistics {
    totalEntries: number;
    userMessages: number;
    assistantMessages: number;
    toolCalls: number;
    hookEvents: number;
    systemEvents: number;
    turnCount: number;
    tokens?: {                          // Optional token metrics
      totalInput: number;
      totalOutput: number;
    };
    totalDurationMs?: number;
    estimatedCost?: number;
  };
  conversation: DisplayMessage[];       // Array of filtered messages
}
```

Each `DisplayMessage` in the conversation array contains:
- **id**: UUID
- **type**: One of 8 types (user_message, assistant_message, tool_call, tool_result, hook_progress, turn_duration, system_event, error)
- **timestamp**: ISO timestamp
- **content**: Text, thinking, tool info, etc.
- **metadata**: Model, tokens, cost, duration, parent ID

### 4. Entry Types from Raw JSONL

**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/session/parser.ts`

The parser normalizes Claude Code's raw JSONL entries into:

| Raw Type | Parsed Type | Included in Filters |
|----------|-------------|-------------------|
| `user` | `user_message` | EVERYTHING, WITHOUT_TOOLS, MESSAGES_ONLY |
| `queue-operation` (with message) | `user_message` | EVERYTHING, WITHOUT_TOOLS, MESSAGES_ONLY |
| `assistant` (with tool_use) | `tool_call` | EVERYTHING, WITHOUT_TOOLS only |
| `assistant` (regular) | `assistant_message` | EVERYTHING, WITHOUT_TOOLS, MESSAGES_ONLY |
| `progress` (hook_progress type) | `hook_progress` | EVERYTHING, WITHOUT_TOOLS only |
| `progress` (other) | `system_event` | EVERYTHING, WITHOUT_TOOLS only |
| `system` (turn_duration) | `turn_duration` | EVERYTHING, WITHOUT_TOOLS only |
| `system` (other) | `system_event` | EVERYTHING, WITHOUT_TOOLS only |
| `summary` | `summary` | EVERYTHING, WITHOUT_TOOLS only |
| `file-history-snapshot` | `skip` | Skipped in all filters |

### 5. Transformation Flow

**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/session/transformer.ts`

The transformation process:

1. **Parse JSONL** → Categorizes 15+ raw entry types into 8 normalized types
2. **Apply Filter** → Selects entries based on FilterType
3. **Clean Entries** → For MESSAGES_ONLY, removes thinking blocks and code blocks
4. **Calculate Statistics** → Counts entries by type, aggregates tokens/cost/duration
5. **Extract Metadata** → Finds model, summary, timestamps from entries
6. **Transform to SavedContext** → Converts ParsedEntry to DisplayMessage format
7. **Write to File** → Saves JSON to `.context/saved/` directory

### 6. Token Estimation

**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/session/token-estimator.ts`

Before saving, the dashboard shows token estimates for each filter using `estimateTokensForFilters()`:

- Uses **tiktoken** `cl100k_base` encoding (Claude's actual tokenizer)
- Falls back to **character-based** estimation (4 chars per token) if tiktoken unavailable
- For each filter type, returns:
  - `current`: Full tokens
  - `filtered`: Tokens after filter applied
  - `savings`: Difference in tokens
  - `savingsPercent`: Percentage saved

The dashboard displays these estimates in the **FilterSelectionView** component, showing:
```
Everything: 45.2k tokens (no change)
Without Tools: 42.1k tokens (-7%)
Messages Only: 38.5k tokens (-15%)
```

### 7. File Storage

**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/storage/writer.ts`

Saved files are stored in:
- **Path**: `.context/saved/` (per-project) or `~/.jacques/archive/` (global)
- **Filename format**: `[YYYY-MM-DD]_[session-id-short]_[filter-suffix]_[optional-label].json`
  - Example: `2026-01-31_8d84_no-tools_jwt-setup.json`
- **Format**: Pretty-printed JSON (2-space indentation)
- **Dual-save**: Via `saveToArchive()`, contexts also save to global archive with manifest extraction for cross-project search

### Summary of What's Kept vs Discarded

| Filter | Keeps | Removes |
|--------|-------|---------|
| **EVERYTHING** | All entries | Nothing (except skipped types) |
| **WITHOUT_TOOLS** | Messages, hooks, system events, summaries | Tool calls, tool results |
| **MESSAGES_ONLY** | User & assistant messages only | Tools, hooks, thinking, code blocks, system events |

The filtering is applied **after parsing** but **before** token counting and file writing, so the token estimates accurately reflect what will be saved.