# Explore: Explore plans and session storage

> Session: `ec3adf96-3f1a-451a-9097-07d12e8e7a7c`
> Date: 2026-02-02
> Tokens: ~69 323

---

Perfect! I have gathered comprehensive information. Now let me compile a detailed report covering all the requested areas.

## Jacques Plans and Sessions Storage & Indexing Analysis

Based on my exploration of the codebase, here's a comprehensive overview of how plans and sessions are stored, indexed, and managed in Jacques:

---

## 1. PLANS STORAGE & ORGANIZATION

### File Structure
Plans are stored in multiple locations:

**Local Project Plans** (`.jacques/plans/`)
```
~/.claude/projects/{encoded-path}/
└── .jacques/
    └── plans/
        ├── 2026-02-01_archive-display-filtering-improvements.md
        ├── 2026-02-01_plan-fix-llm-handoff.md
        └── ...
```

**Global Archive Plans** (`~/.jacques/archive/`)
```
~/.jacques/archive/
└── plans/
    ├── {projectSlug}/
    │   ├── {planName}.md
    │   └── ...
    └── ...
```

### Plan Storage Schema

Plans are indexed in `.jacques/index.json` with this structure:

```typescript
interface PlanEntry {
  id: string;                // Filename without .md (e.g., "2026-02-01_archive-display-filtering-improvements")
  title: string;             // Extracted from first markdown heading (e.g., "Archive Display & Filtering Improvements")
  filename: string;          // Filename with date prefix (e.g., "2026-02-01_archive-display-filtering-improvements.md")
  path: string;              // Relative path from project root (e.g., "plans/2026-02-01_archive-display-filtering-improvements.md")
  createdAt: string;         // ISO timestamp when plan was created
  updatedAt: string;         // ISO timestamp when plan was last modified
  sessions: string[];        // Array of session IDs that reference this plan (bidirectional linking)
}
```

### Archive-Level Plan Reference

In the global archive manifests, plans are referenced with additional metadata:

```typescript
interface PlanReference {
  path: string;              // Original path (e.g., ~/.claude/plans/foo.md)
  name: string;              // Plan filename (e.g., "foo.md")
  archivedPath: string;      // Path in archive (e.g., "plans/foo.md")
  source: "embedded" | "write";  // Detection method:
                             // "embedded" = found in user message via trigger pattern
                             // "write" = created with Write tool
}
```

### Plan Detection & Extraction (plan-extractor.ts)

Plans are automatically detected from user messages with these trigger patterns:
```typescript
const PLAN_TRIGGER_PATTERNS = [
  /^implement the following plan[:\s]*/i,
  /^here is the plan[:\s]*/i,
  /^follow this plan[:\s]*/i,
];
```

**Extraction Process:**
1. Scans all user messages for trigger patterns
2. Extracts content after trigger (minimum 100 characters)
3. Requires markdown heading (`#`) for structure validation
4. Splits multiple plans by top-level headings
5. Deduplicates using:
   - SHA-256 hash of normalized content (exact match)
   - Title + length range + Jaccard similarity (≥90% for fuzzy match)
6. Writes to `.jacques/plans/{date}_{slug}.md`
7. Indexes in `.jacques/index.json` with session linking

**Key Constants:**
```typescript
const MIN_PLAN_LENGTH = 100;           // Minimum content chars after trigger
const MIN_SIMILARITY = 0.9;            // Jaccard similarity threshold for dedup
```

---

## 2. SESSIONS TRACKING & STORAGE

### Session Registry (Live Tracking)

The server tracks active sessions in memory with this schema:

```typescript
interface Session {
  // Identity
  session_id: string;                  // Unique session ID from Claude Code
  source: 'claude_code' | 'cursor' | string;  // Source AI tool
  
  // Metadata
  session_title: string | null;        // Extracted from transcript (fallback to first user message)
  transcript_path: string | null;      // Path to JSONL file (encoded with dashes)
  cwd: string;                         // Current working directory
  project: string;                     // Project name (derived from cwd)
  
  // Model & Workspace
  model: ModelInfo | null;             // { id: string; display_name: string }
  workspace: WorkspaceInfo | null;     // { current_dir: string; project_dir: string }
  
  // Terminal Identity
  terminal: TerminalIdentity | null;   // TTY, terminal PID, term program, session IDs
  terminal_key: string;                // Unique key combining multiple env vars
  
  // Session State
  status: 'active' | 'working' | 'idle';  // Current activity level
  last_activity: number;               // Unix timestamp of last activity
  registered_at: number;               // Unix timestamp when registered
  
  // Context Metrics (updated in real-time)
  context_metrics: ContextMetrics | null;  // Token usage data
  
  // Auto-Compact Configuration
  autocompact: AutoCompactStatus | null;   // Enabled, threshold, bug_threshold
  
  // Session Start Reason
  start_reason?: 'startup' | 'resume' | 'clear' | 'compact';
}
```

### Context Metrics Schema

```typescript
interface ContextMetrics {
  used_percentage: number;        // 0-100
  remaining_percentage: number;   // 0-100
  total_input_tokens: number;     // Fresh tokens
  total_output_tokens: number;    // Generated tokens
  context_window_size: number;    // Total limit (e.g., 200000)
  total_cost_usd?: number;        // Cumulative cost
  total_duration_ms?: number;     // Session duration
  is_estimate?: boolean;          // true if from hooks, false if from preCompact
}
```

### Auto-Compact Status

```typescript
interface AutoCompactStatus {
  enabled: boolean;               // From ~/.claude/settings.json
  threshold: number;              // Percentage (default 95%)
  bug_threshold: number | null;   // 78 if disabled due to bug #18264
}
```

### Saved Project Sessions (.jacques/index.json)

Each project maintains a unified index of all knowledge:

```typescript
interface ProjectIndex {
  version: string;                // "1.0.0"
  updatedAt: string;              // ISO timestamp
  context: ContextFile[];         // Imported context files
  sessions: SessionEntry[];       // Saved conversations
  plans: PlanEntry[];            // Implementation plans
}

interface SessionEntry {
  id: string;                     // UUID of the conversation
  title: string;                  // Claude's auto-summary (or first user message)
  filename: string;               // Saved as JSON (e.g., "2026-02-01_21-55_archive-display-filtering-improvements_21ea.json")
  path: string;                   // Relative path (e.g., "sessions/2026-02-01_21-55_archive-display-filtering-improvements_21ea.json")
  savedAt: string;                // ISO timestamp when saved
  startedAt: string;              // ISO timestamp when session began
  endedAt: string;                // ISO timestamp when session ended
  durationMinutes: number;        // Session length
  messageCount: number;           // Total user + assistant messages
  toolCallCount: number;          // Number of tool invocations
  technologies: string[];         // Detected tech stack (typescript, react, jest, etc.)
  userLabel?: string;             // Optional user-provided label
}
```

---

## 3. SESSION METADATA STORED

### Terminal Identity

```typescript
interface TerminalIdentity {
  tty: string | null;             // Terminal TTY (/dev/ttys000)
  terminal_pid: number;           // Parent shell PID
  term_program: string | null;    // iTerm, kitty, etc.
  iterm_session_id: string | null; // iTerm session UUID
  term_session_id: string | null; // macOS Terminal session
  kitty_window_id: string | null; // Kitty terminal window
  wezterm_pane: string | null;    // WezTerm pane ID
  vscode_injection: string | null; // VSCode integrated terminal
  windowid: string | null;        // X11 window ID
  term: string | null;            // TERM environment variable
}
```

### Model Information

```typescript
interface ModelInfo {
  id: string;                     // e.g., "claude-opus-4-5-20251101"
  display_name: string;           // User-friendly name
}
```

---

## 4. GLOBAL ARCHIVE STRUCTURE (`~/.jacques/archive/`)

### Directory Layout

```
~/.jacques/archive/
├── index.json                           # Global search index (inverted keywords)
├── manifests/
│   ├── {sessionId}.json                 # Manifest for each conversation (~1-2KB)
│   └── ...
├── conversations/
│   ├── {projectSlug}/
│   │   ├── {sessionId}.json             # Full saved conversation
│   │   └── ...
│   └── ...
├── plans/
│   ├── {projectSlug}/
│   │   ├── {planName}.md               # Plan content
│   │   └── ...
│   └── ...
└── subagents/
    ├── {agentId}.json                   # Archived subagent conversation
    └── ...
```

### Manifest Schema (~1-2KB per conversation)

```typescript
interface ConversationManifest {
  // Identity
  id: string;                           // Session UUID
  projectSlug: string;                  // e.g., "jacques-context-manager"
  projectPath: string;                  // Full path
  
  // Metadata
  archivedAt: string;                   // ISO timestamp
  autoArchived: boolean;                // true if from SessionEnd hook, false if manual
  
  // Content
  title: string;                        // Auto-generated or fallback
  startedAt: string;                    // ISO timestamp
  endedAt: string;                      // ISO timestamp
  durationMinutes: number;
  
  // Searchable Content
  userQuestions: string[];              // All user messages (truncated to 200 chars)
  filesModified: string[];              // Paths touched during session
  toolsUsed: string[];                  // Unique tool names (Bash, Read, Write, etc.)
  technologies: string[];               // Detected tech stack
  
  // Plans & Subagents
  plans: PlanReference[];               // Plans created/edited in session
  subagents?: SubagentSummary;          // Subagent invocations
  contextSnippets?: string[];           // (max 300 chars × 20 snippets)
  
  // Statistics
  messageCount: number;
  toolCallCount: number;
  
  // Optional
  userLabel?: string;                   // Manual label from user
}

interface SubagentSummary {
  count: number;                        // Number of subagents invoked
  totalTokens: number;                  // Sum of all subagent tokens
  ids: string[];                        // Subagent IDs for linking
}
```

### Search Index Schema (inverted keyword index)

```typescript
interface SearchIndex {
  version: string;                      // "1.0.0"
  lastUpdated: string;                  // ISO timestamp
  
  // Inverted index: keyword → array of manifest references
  keywords: {
    [keyword: string]: IndexReference[];
  };
  
  // Quick project lookup
  projects: {
    [slug: string]: ProjectInfo;
  };
  
  metadata: {
    totalConversations: number;
    totalKeywords: number;
  };
}

interface IndexReference {
  id: string;                           // Manifest/conversation ID
  score: number;                        // Frequency-based weight
  field: string;                        // "title" | "question" | "file" | "tech"
}

interface ProjectInfo {
  path: string;                         // Full project path
  conversationCount: number;
  lastActivity: string;                 // ISO timestamp
}
```

---

## 5. SUBAGENT STORAGE

### Subagent Archive Schema

```typescript
interface ArchivedSubagent {
  id: string;                           // Agent ID (e.g., "a0323e0")
  sessionId: string;                    // Parent session ID
  projectSlug: string;                  // Project context
  archivedAt: string;                   // ISO timestamp
  prompt: string;                       // Task given to agent
  model?: string;                       // e.g., "claude-haiku-4-5"
  conversation: DisplayMessage[];       // Full conversation
  statistics: {
    messageCount: number;
    toolCallCount: number;
    tokens: SubagentTokenStats;
    durationMs?: number;
  };
}

interface SubagentTokenStats {
  totalInput: number;
  totalOutput: number;
  cacheCreation?: number;
  cacheRead?: number;
}

interface SubagentReference {
  id: string;                           // Agent ID
  sessionId: string;                    // Parent session
  promptPreview: string;                // Truncated (max 100 chars)
  model?: string;
  tokenCount: number;                   // Total tokens used
  messageCount: number;                 // Conversation length
  position: {
    afterMessageUuid?: string;          // Preceding message in parent
    index: number;                      // Position in parent conversation
  };
}
```

### Subagent Source (Claude Code JSONL)

Claude Code stores subagent conversations in separate JSONL files:
```
~/.claude/projects/{encoded-path}/
├── {session-id}.jsonl                  # Main session JSONL
└── {session-id}/
    └── subagents/
        ├── agent-a0323e0.jsonl         # Full subagent conversation
        ├── agent-a4e4321.jsonl
        └── ...
```

Each subagent JSONL contains:
- Complete conversation transcript
- Full token usage data
- Tool calls and results
- `agentId` field linking to parent

---

## 6. SESSION TRANSCRIPT JSONL FORMAT

### Raw Entry Types (from Claude Code)

```typescript
// User messages
interface RawUserEntry {
  type: "user";
  uuid: string;
  parentUuid?: string;
  timestamp: string;
  sessionId: string;
  message: {
    role: "user";
    content: string | ContentBlock[];
  };
}

// Assistant responses
interface RawAssistantEntry {
  type: "assistant";
  uuid: string;
  parentUuid?: string;
  timestamp: string;
  sessionId: string;
  model?: string;
  message: {
    id: string;
    type: "message";
    role: "assistant";
    content: ContentBlock[];
    model?: string;
    stop_reason?: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;        // WARNING: inaccurate in JSONL!
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  costUSD?: number;
  durationMs?: number;
}

// Content blocks
interface ContentBlock {
  type: "text" | "tool_use" | "tool_result" | "thinking";
  text?: string;                         // For text blocks
  thinking?: string;                     // For thinking blocks
  id?: string;                          // For tool calls
  name?: string;                        // Tool name
  input?: Record<string, unknown>;      // Tool input
  content?: string | ContentBlock[];    // Tool result
}

// Progress events (hook execution, agent calls, etc.)
interface RawProgressEntry {
  type: "progress";
  uuid: string;
  parentUuid?: string;
  timestamp: string;
  sessionId: string;
  data?: {
    type?: string;                       // "hook_progress", "agent_progress", "bash_progress", etc.
    hookEvent?: string;                 // "SessionStart", "Stop", "SessionEnd"
    hookName?: string;
    command?: string;
  };
}

// Queue operations (deprecated)
interface RawQueueOperationEntry {
  type: "queue-operation";
  uuid: string;
  timestamp: string;
  sessionId: string;
  operation?: string;
  message?: {
    role: "user";
    content: string | ContentBlock[];
  };
}

// System events
interface RawSystemEntry {
  type: "system";
  uuid: string;
  timestamp: string;
  sessionId: string;
  subtype?: string;                     // "turn_duration", "stop_hook_summary"
  durationMs?: number;
  data?: {
    turnDurationMs?: number;
    totalCostUSD?: number;
  };
}

// Session summary
interface RawSummaryEntry {
  type: "summary";
  uuid: string;
  timestamp: string;
  sessionId: string;
  summary?: string;
  model?: string;
}

// File tracking (usually skipped)
interface RawFileHistoryEntry {
  type: "file-history-snapshot";
  uuid: string;
  timestamp: string;
  [key: string]: unknown;
}
```

### Parsed Entry Types (normalized)

```typescript
export interface ParsedEntry {
  type: ParsedEntryType;
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  content: ParsedContent;
}

export type ParsedEntryType =
  | "user_message"
  | "assistant_message"
  | "tool_call"
  | "tool_result"
  | "hook_progress"
  | "turn_duration"
  | "system_event"
  | "summary"
  | "skip";

export interface ParsedContent {
  text?: string;                        // User/assistant text
  thinking?: string;                    // Extended thinking
  toolName?: string;                    // Tool name
  toolInput?: Record<string, unknown>;  // Tool parameters
  toolResultId?: string;                // Tool call ID being resolved
  toolResultContent?: string;           // Result content
  hookEvent?: string;                   // "SessionStart", "Stop", etc.
  hookName?: string;
  hookCommand?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;               // Estimated via tiktoken
    cacheCreation?: number;
    cacheRead?: number;
  };
  costUSD?: number;
  durationMs?: number;
  model?: string;
}
```

### Saved Session JSON Format

When a session is saved to `.jacques/sessions/`, it's stored with metadata wrapper:

```typescript
{
  "contextGuardian": {
    "version": "1.0.0",
    "savedAt": "2026-02-01T20:57:07.275Z",
    "sourceFile": "/Users/gole/.claude/projects/-Users-gole-Desktop-jacques/21ea55e2.jsonl",
    "filterApplied": "everything" | "without_tools" | "messages_only"
  },
  "session": {
    "id": "21ea55e2-80bc-4adb-bf99-47e013418abf",
    "slug": "Implement the following plan: # Archive Display & Filtering Improvements...",
    "startedAt": "2026-02-01T20:43:21.405Z",
    "endedAt": "2026-02-01T20:55:37.906Z",
    "model": "claude-opus-4-5-20251101",
    "workingDirectory": "/Users/gole/Desktop/jacques-context-manager"
  },
  "statistics": {
    "totalEntries": 380,
    "userMessages": 83,
    "assistantMessages": 40,
    "toolCalls": 80,
    "hookEvents": 133,
    "agentCalls": 35,
    "bashProgress": 5,
    "mcpCalls": 0,
    "webSearches": 0,
    "systemEvents": 2,
    "turnCount": 2,
    "tokens": {
      "totalInput": 122,
      "totalOutput": 903,
      "cacheCreation": 448772,
      "cacheRead": 10995115
    },
    "totalDurationMs": 506913
  },
  "conversation": [
    {
      "id": "635916e8-56b4-456d-8462-c0343b5c6d3f",
      "type": "hook_progress",
      "timestamp": "2026-02-01T20:43:21.652Z",
      "content": {
        "hookEvent": "SessionStart",
        "hookName": "SessionStart:clear",
        "hookCommand": "python3 ~/.jacques/hooks/jacques-register-session.py"
      },
      "metadata": {}
    },
    // ... more entries
  ]
}
```

---

## 7. KEY DESIGN PATTERNS

### Path Encoding in Claude Code
Claude encodes project paths using dashes: `/Users/gole/Desktop/jacques-context-manager` → `-Users-gole-Desktop-jacques-context-manager`

**Critical**: The leading dash represents the root `/`, not a separator.

### Terminal Key Uniqueness
Sessions are uniquely identified by `terminal_key` which combines:
- TTY path
- Terminal PID
- iTerm session ID
- Terminal program
- Other terminal-specific environment variables

This allows Jacques to track sessions across terminal windows.

### Focus Management
- Focus automatically shifts to the session with most recent activity
- `updateActivity()` and `updateContext()` auto-focus their session
- Manual focus via `setFocusedSession(sessionId)`
- When focused session is removed, focus shifts to most recent remaining

### Auto-Registration of Sessions
If a `context_update` event arrives before `session_start`, the registry auto-creates the session. This handles timing issues where statusLine fires before SessionStart hook.

### Output Tokens Estimation
**Important Discovery**: Claude Code JSONL files record inaccurate `output_tokens` (typically 1-9 regardless of actual text). Jacques uses **tiktoken** (`cl100k_base` encoding) to estimate actual output tokens from:
- Assistant message text
- Thinking blocks
- Tool call JSON serialization

This gives ~30-100x more accurate estimates than raw JSONL values.

---

## Summary Diagram

```
Claude Code/Cursor Session
    ↓
Claude Code JSONL
    └── {session-id}.jsonl              (main session entries)
    └── {session-id}/subagents/         (subagent conversations)
        ├── agent-a1b2c3d.jsonl
        └── agent-x9y8z7w.jsonl
    ↓
Jacques Server (Session Registry)
    └── Tracks active sessions in memory
    └── Maintains focus state
    └── Updates context metrics
    ↓
Save Context / Archive
    ├── Local: .jacques/
    │   ├── index.json (ProjectIndex)
    │   ├── sessions/
    │   ├── plans/
    │   └── context/
    └── Global: ~/.jacques/archive/
        ├── index.json (SearchIndex)
        ├── manifests/ (lightweight metadata)
        ├── conversations/ (full session JSON)
        ├── plans/ (by project)
        └── subagents/ (archived conversations)
```