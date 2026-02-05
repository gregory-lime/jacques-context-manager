# Explore: Explore research/agent tracking

> Session: `ec3adf96-3f1a-451a-9097-07d12e8e7a7c`
> Date: 2026-02-02
> Tokens: ~60 391

---

Perfect! I have all the information needed. Let me provide a comprehensive report on how subagents, web searches, and research are tracked in Jacques:

---

## Comprehensive Guide: Subagents, Web Searches, and Research Tracking in Jacques

Based on my analysis of the codebase, here's how Jacques tracks subagents, web searches, and research activities:

### 1. SUBAGENT TRACKING (Agent Progress)

#### Raw JSONL Structure
Subagent activity flows through `progress` entries with type `"agent_progress"`:

```typescript
// From RawProgressEntry
{
  type: "progress",
  uuid: string;
  parentToolUseID?: string;  // Links to parent Task tool call
  data?: {
    type: "agent_progress";
    prompt: string;           // Task given to agent
    agentId: string;          // e.g., "a6047be"
    message?: {
      type: "user" | "assistant";
      message: { role: string; content: unknown[] };
      uuid: string;
      timestamp: string;
    };
  };
}
```

#### Key Linking Mechanism
**Two-layer linking** enables rich subagent metadata extraction:

1. **Task Tool Call** (parent): Claude executes `Task` tool with:
   ```typescript
   TaskToolInfo {
     toolUseId: string;        // Matches agent_progress.parentToolUseID
     subagentType: string;     // "Explore", "Plan", "general-purpose"
     description?: string;     // Short description from Task
     prompt?: string;          // Full prompt given to agent
   }
   ```

2. **Agent Progress** (child): References parent via `parentToolUseID` to inherit subagent type

#### Parsed Output
```typescript
ParsedEntry {
  type: "agent_progress";
  content: {
    agentPrompt: string;         // Task prompt
    agentId: string;             // Agent identifier
    agentMessageType: "user" | "assistant";
    agentMessageContent: unknown[];
    agentType: string;           // From parent Task: "Explore", "Plan", etc.
    agentDescription: string;    // From parent Task
  };
}
```

#### Extraction Process (`core/src/session/parser.ts`)

**First Pass - Build Context:**
```typescript
// Line 358-374: Extract Task tool calls
if (block.type === "tool_use" && block.name === "Task") {
  context.taskCalls.set(block.id, {
    toolUseId: block.id,
    subagentType: input.subagent_type as string,
    description: input.description,
    prompt: input.prompt
  });
}

// Second Pass - Link to agent_progress
case "agent_progress": {
  const parentToolUseId = progressEntry.parentToolUseID;
  const taskInfo = context?.taskCalls.get(parentToolUseId);
  // Now taskInfo contains subagent type and description
}
```

#### Statistics Collection
From `getEntryStatistics()` (line 833-834):
```typescript
case "agent_progress":
  agentCalls++;
  break;

// Output includes:
{
  agentCalls: number;      // Total subagent invocations
}
```

---

### 2. WEB SEARCH TRACKING

#### Dual-Entry Pattern
Web searches generate **two paired events**:

1. **Query Update** (`query_update`):
```typescript
RawProgressEntry {
  type: "progress";
  data: {
    type: "query_update";
    query: string;           // Search keywords
  };
}
```

2. **Search Results** (`search_results_received`):
```typescript
RawProgressEntry {
  type: "progress";
  parentToolUseID?: string;  // Links to WebSearch tool call
  data: {
    type: "search_results_received";
    query: string;
    resultCount: number;
  };
}
```

#### URL Extraction
URLs are stored separately and linked in **post-processing**:

```typescript
// From RawUserEntry with tool_result
userEntry: {
  toolUseResult?: {
    results?: Array<{
      content?: Array<{ title: string; url: string }>
    }>
  }
}
```

#### Parsed Output
```typescript
ParsedEntry {
  type: "web_search";
  content: {
    searchType: "query" | "results";
    searchQuery: string;
    searchResultCount?: number;
    searchUrls?: Array<{ title: string; url: string }>;
  };
}
```

#### Two-Pass Linking Algorithm (lines 309-352)

**Pass 1: Categorize & Track**
```typescript
const webSearchEntriesByToolId = new Map<string, number>();
for (const line of lines) {
  const parsed = categorizeEntry(rawEntry, context);
  if (parsed.type === "web_search" && parsed.content.searchType === "results") {
    // Track index by parentToolUseID (links to original WebSearch tool)
    webSearchEntriesByToolId.set(rawProgress.parentToolUseID, entries.length);
  }
}
```

**Pass 2: Attach URLs**
```typescript
for (const [toolUseId, urls] of context.webSearchResults) {
  const entryIndex = webSearchEntriesByToolId.get(toolUseId);
  if (entryIndex !== undefined) {
    entries[entryIndex].content.searchUrls = urls;
  }
}
```

#### Statistics Collection
From `getEntryStatistics()` (line 842-843):
```typescript
case "web_search":
  webSearches++;
  break;

// Output includes:
{
  webSearches: number;     // Total web search operations
}
```

---

### 3. PARSER STATISTICS & EXTRACTION

#### Complete Statistics Object
```typescript
getEntryStatistics() returns:
{
  // Entry type counts
  totalEntries: number;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  hookEvents: number;
  agentCalls: number;           // Subagent invocations
  bashProgress: number;
  mcpCalls: number;
  webSearches: number;          // Web search operations
  systemEvents: number;
  summaries: number;

  // Token metrics
  totalInputTokens: number;
  totalOutputTokens: number;
  totalOutputTokensEstimated: number;  // From text content via tiktoken
  totalCacheCreation: number;
  totalCacheRead: number;
  
  // Timing and cost
  totalCostUSD: number;
  totalDurationMs: number;
  turnCount: number;
  
  // Last turn metrics (for context window display)
  lastInputTokens: number;
  lastOutputTokens: number;
  lastCacheCreation: number;
  lastCacheRead: number;
}
```

#### Token Estimation Strategy
Claude Code JSONL records inaccurate output tokens (always 1-4). Jacques uses **tiktoken-based estimation**:

```typescript
// Line 733-747
function countTokens(text: string): number {
  const encoder = getEncoder();  // cl100k_base encoding
  if (encoder) {
    return encoder.encode(text).length;
  }
  // Fallback: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Applied to all text content:
totalOutputTokensEstimated += countTokens(entry.content.text);
totalOutputTokensEstimated += countTokens(entry.content.thinking);
```

---

### 4. ARCHIVE & MANIFEST EXTRACTION

#### ConversationManifest Data Structure
From `core/src/archive/types.ts`:

```typescript
interface ConversationManifest {
  // Identity
  id: string;                    // Session UUID
  projectSlug: string;
  projectPath: string;

  // Timestamps
  title: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;

  // Research artifacts
  userQuestions: string[];       // Truncated (200 chars max)
  filesModified: string[];       // From Write/Edit tools
  toolsUsed: string[];          // Unique tool names
  technologies: string[];       // Detected from content

  // Subagents
  subagents?: {
    count: number;
    totalTokens: number;
    ids: string[];               // Subagent IDs for linking
  };

  // Plans (both embedded and write-based)
  plans: PlanReference[];

  // Statistics
  messageCount: number;
  toolCallCount: number;
}
```

#### Manifest Extraction from Parsed Entries (lines 99-201)

```typescript
export async function extractManifest(jsonlPath: string, projectPath: string) {
  const entries = await parseJSONL(jsonlPath);
  return extractManifestFromEntries(entries, projectPath, jsonlPath);
}

// Extraction process:
1. Session ID & timestamps    → from first/last entries
2. Title                       → summary entry OR fallback from first user message
3. User questions             → all user_message entries (truncated to 200 chars)
4. Files modified             → from Write/Edit tool calls
5. Tools used                  → unique tool names from tool_call entries
6. Technologies               → regex pattern matching on content + file paths
7. Plans                       → detectPlans() + extractEmbeddedPlans()
```

---

### 5. TOOL USAGE EXTRACTION

#### Types Detected
```typescript
ParsedEntry types include:
- "tool_call"       // Claude invoked a tool (Task, Write, Bash, etc.)
- "tool_result"     // Result from tool execution
- "bash_progress"   // Streaming output from Bash
- "mcp_progress"    // MCP tool execution tracking
```

#### Tool Call Structure
```typescript
ParsedEntry {
  type: "tool_call";
  content: {
    toolName: string;          // e.g., "Task", "Write", "Read", "Bash"
    toolInput: Record<string, unknown>;
    toolUseId: string;         // For linking to results
    usage?: TokenUsage;        // From JSONL
    model?: string;
    costUSD?: number;
    durationMs?: number;
  };
}
```

#### Bash Progress Details
```typescript
ParsedEntry {
  type: "bash_progress";
  content: {
    bashOutput: string;        // Recent output
    bashFullOutput: string;    // Complete output
    bashElapsedSeconds: number;
    bashTotalLines: number;
  };
}
```

#### MCP Progress Tracking
```typescript
ParsedEntry {
  type: "mcp_progress";
  content: {
    mcpStatus: "started" | "completed";
    mcpServerName: string;     // e.g., "deepwiki"
    mcpToolName: string;       // e.g., "ask_question"
  };
}
```

---

### 6. FILTER TYPES FOR CONTEXT EXTRACTION

From `core/src/session/filters.ts`:

```typescript
enum FilterType {
  EVERYTHING = "everything",           // Full context with all data
  WITHOUT_TOOLS = "without_tools",     // Remove tool calls/results/progress
  MESSAGES_ONLY = "messages_only",     // Just conversational text
}

// Filtering logic:
EVERYTHING
  → Include all entry types

WITHOUT_TOOLS
  → Exclude: tool_call, tool_result, bash_progress, mcp_progress

MESSAGES_ONLY
  → Include: user_message, assistant_message only
  → Strip: thinking blocks, code blocks from text
```

---

### 7. DATA FLOW DIAGRAM

```
JSONL File
    ↓
parseJSONLContent(content)
    ↓
[Pass 1: Extract Context]
├─ Task tool calls → taskCalls map
└─ WebSearch results → webSearchResults map
    ↓
[Pass 2: Categorize Entries]
├─ agent_progress: Link to taskCalls by parentToolUseID
├─ web_search (results): Track entry index by parentToolUseID
└─ Other entries: Categorize normally
    ↓
[Pass 3: Post-Process Links]
└─ Attach searchUrls to web_search results
    ↓
ParsedEntry[]
    ↓
getEntryStatistics()
    ├─ Count each type
    ├─ Aggregate token usage
    └─ Calculate totals
    ↓
Statistics + extractManifest()
    ├─ Extract userQuestions
    ├─ Extract filesModified
    ├─ Detect technologies
    └─ Compile metadata
    ↓
ConversationManifest + SavedContext
```

---

### 8. KEY PATTERNS & GOTCHAS

#### Parent-Child Linking Pattern
**Subagents** and **Web Searches** use `parentToolUseID` to link progress entries to their initiating tool calls:
- Parent: `assistant` entry with `tool_use` block (name="Task" or "WebSearch")
- Child: `progress` entry with `parentToolUseID` matching parent's `tool.id`

#### Post-Processing Strategy
Web search URLs are linked **in a second pass** after all entries are parsed because:
1. URLs are embedded in `user` entries (tool results)
2. Progress entries only have result counts, not URLs
3. Need to map progress entries to their tool_use IDs for URL association

#### Token Accuracy Warning
- **JSONL `output_tokens` is inaccurate** (always 1-4 tokens)
- Jacques uses **tiktoken `cl100k_base`** to estimate from actual text
- Fallback: ~4 characters per token if tiktoken unavailable

#### Context Preservation
Statistics track **both perspectives**:
- **Cumulative**: Sum across all turns (for billing)
- **Last turn**: Final turn metrics (represents actual context window)

---

### 9. FILE LOCATIONS

| File | Purpose |
|------|---------|
| `core/src/session/parser.ts` | Complete parsing logic with agent/web search linking |
| `dashboard/src/session/parser.ts` | Simplified dashboard version (basic parsing only) |
| `core/src/archive/manifest-extractor.ts` | Extract searchable metadata from sessions |
| `core/src/archive/types.ts` | ConversationManifest and archive data structures |
| `core/src/session/filters.ts` | Context filtering (everything/without_tools/messages_only) |
| `core/src/session/transformer.ts` | Transform ParsedEntries to SavedContext JSON |
| `dashboard/src/archive/manifest-extractor.test.ts` | Test examples showing extraction patterns |

---

### 10. EXAMPLE: EXTRACTING RESEARCH DATA

```typescript
// Parse JSONL
const entries = await parseJSONL('/path/to/session.jsonl');

// Get statistics
const stats = getEntryStatistics(entries);
console.log(`Subagent calls: ${stats.agentCalls}`);
console.log(`Web searches: ${stats.webSearches}`);

// Extract manifest
const manifest = await extractManifest('/path/to/session.jsonl', projectPath);
console.log(`Technologies: ${manifest.technologies}`);      // ["react", "typescript"]
console.log(`Tools used: ${manifest.toolsUsed}`);          // ["Write", "Read", "Bash"]
console.log(`Files modified: ${manifest.filesModified.length}`);

// Filter entries
const filtered = applyFilter(entries, FilterType.WITHOUT_TOOLS);
// Now only has user/assistant messages, no tool calls

// Find specific research
const webSearches = entries.filter(e => e.type === 'web_search');
webSearches.forEach(search => {
  console.log(`Query: ${search.content.searchQuery}`);
  console.log(`Results: ${search.content.searchResultCount}`);
  search.content.searchUrls?.forEach(url => {
    console.log(`  - ${url.title}: ${url.url}`);
  });
});
```

This comprehensive system enables Jacques to track the full research lifecycle: agent invocations, web searches, tool usage, and technologies used—all with proper linking back to their source tool calls and preserved for archive and search.