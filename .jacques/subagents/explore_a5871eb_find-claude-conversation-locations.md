# Explore: Find Claude conversation locations

> Session: `dea2f256-f9e8-44c8-8419-5c7983e29457`
> Date: 2026-02-01
> Tokens: ~56 948

---

Excellent! Now I have enough information. Let me compile a comprehensive report.

## Summary: Claude Code Conversation History Storage Structure

Based on my exploration of the codebase and filesystem, here's a complete guide to how Claude Code stores conversation history:

### 1. Main Directory Structure

**Location**: `~/.claude/projects/`

```
~/.claude/
├── projects/                              # Session storage root
│   ├── -Users-gole-Desktop-project-name/  # Encoded project directory
│   │   ├── {session-uuid-1}.jsonl         # Session 1 transcript (JSONL format)
│   │   ├── {session-uuid-2}.jsonl         # Session 2 transcript
│   │   └── sessions-index.json            # Index of sessions (metadata)
│   └── -private-tmp/                      # Encoded project for /private/tmp
├── settings.json                          # Global Claude Code settings
├── history.jsonl                          # Global clipboard/paste history
├── plans/                                 # Saved plans directory
└── [other directories...]
```

### 2. Path Encoding Rules

Claude Code encodes absolute filesystem paths to directory names using a simple replacement rule:

- **Replace**: `/` (forward slash) → `-` (hyphen)
- **Keep**: Leading dash from the leading `/`
- **Example**: `/Users/gole/Desktop/project` → `-Users-gole-Desktop-project`

**Implementation** (from `dashboard/src/session/detector.ts`):
```typescript
export function encodeProjectPath(dirPath: string): string {
  const normalized = path.normalize(dirPath);
  return normalized.replace(/\//g, "-");
}

// Example: 
// Input:  "/Users/gole/Desktop/jacques-context-manager"
// Output: "-Users-gole-Desktop-jacques-context-manager"
```

**File locations**:
- `/Users/gole/Desktop/jacques-context-manager` → `~/.claude/projects/-Users-gole-Desktop-jacques-context-manager/`
- `/private/tmp` → `~/.claude/projects/-private-tmp/`

### 3. Session Transcript Format (JSONL)

**File Format**: Newline-delimited JSON (one valid JSON object per line)

**Storage Location**: `~/.claude/projects/{encoded-path}/{session-uuid}.jsonl`

**Full Path Example**: `/Users/gole/.claude/projects/-Users-gole-Desktop-jacques-context-manager-server/0c51ea48-49db-4240-be36-f942bd50601d.jsonl`

### 4. JSONL Entry Types

Transcripts contain multiple entry types. Key ones:

#### Queue Operation
```json
{
  "type": "queue-operation",
  "operation": "dequeue",
  "timestamp": "2026-02-01T15:28:45.907Z",
  "sessionId": "0c51ea48-49db-4240-be36-f942bd50601d"
}
```

#### User Message
```json
{
  "type": "user",
  "uuid": "cd267518-2bc7-40c4-9a8e-4128ae4bd2a5",
  "parentUuid": "dd14810b-d502-490a-a457-6d8a667e47f5",
  "timestamp": "2026-02-01T15:28:45.914Z",
  "sessionId": "0c51ea48-49db-4240-be36-f942bd50601d",
  "message": {
    "role": "user",
    "content": "Say hello in 3 words"
  }
}
```

#### Assistant Message
```json
{
  "type": "assistant",
  "uuid": "53eb14c9-891d-4f93-a7b3-48133158effa",
  "parentUuid": "cd267518-2bc7-40c4-9a8e-4128ae4bd2a5",
  "timestamp": "2026-02-01T15:28:48.244Z",
  "sessionId": "0c51ea48-49db-4240-be36-f942bd50601d",
  "message": {
    "model": "claude-opus-4-5-20251101",
    "id": "msg_01Rs4Bfd7oan35Yu13JDBUXo",
    "type": "message",
    "role": "assistant",
    "content": [
      {
        "type": "text",
        "text": "Hello, I'm Claude."
      }
    ],
    "usage": {
      "input_tokens": 3,
      "cache_creation_input_tokens": 0,
      "cache_read_input_tokens": 27180,
      "output_tokens": 2,
      "service_tier": "standard"
    }
  }
}
```

#### Hook Progress Event
```json
{
  "type": "progress",
  "uuid": "dd14810b-d502-490a-a457-6d8a667e47f5",
  "timestamp": "2026-02-01T15:28:45.835Z",
  "sessionId": "0c51ea48-49db-4240-be36-f942bd50601d",
  "data": {
    "type": "hook_progress",
    "hookEvent": "SessionStart",
    "hookName": "SessionStart:startup",
    "command": "python3 ~/.jacques/hooks/jacques-register-session.py"
  }
}
```

#### Summary Entry (Auto-generated Title)
```json
{
  "type": "summary",
  "uuid": "...",
  "timestamp": "...",
  "sessionId": "...",
  "summary": "Human-readable title or topic"
}
```

#### File History Snapshot
```json
{
  "type": "file-history-snapshot",
  "messageId": "...",
  "snapshot": {...}
}
```

#### System Event (Turn Duration, Cost)
```json
{
  "type": "system",
  "uuid": "...",
  "timestamp": "...",
  "sessionId": "...",
  "subtype": "turn_duration",
  "durationMs": 2500,
  "data": {
    "turnDurationMs": 2500,
    "totalCostUSD": 0.00015
  }
}
```

### 5. Sessions Index File

**File Format**: JSON with metadata about closed/indexed sessions

**Storage Location**: `~/.claude/projects/{encoded-path}/sessions-index.json`

**Full Path Example**: `/Users/gole/.claude/projects/-Users-gole-Desktop-jacques-context-manager-server/sessions-index.json`

**Structure**:
```json
{
  "version": 1,
  "entries": [
    {
      "sessionId": "068d5122-614e-4cd8-ac72-21aaf8a8276d",
      "fullPath": "/Users/gole/.claude/projects/-Users-gole-Desktop-jacques-context-manager-server/068d5122-614e-4cd8-ac72-21aaf8a8276d.jsonl",
      "fileMtime": 1769959709690,
      "firstPrompt": "Say hello in 3 words",
      "messageCount": 2,
      "created": "2026-02-01T15:28:27.178Z",
      "modified": "2026-02-01T15:28:29.656Z",
      "gitBranch": "",
      "projectPath": "/Users/gole/Desktop/jacques-context-manager/server",
      "isSidechain": false
    }
  ],
  "originalPath": "/Users/gole/Desktop/jacques-context-manager/server"
}
```

**Key Fields**:
- `sessionId`: Unique UUID identifying the session
- `fullPath`: Absolute path to the JSONL transcript file
- `fileMtime`: File modification timestamp in milliseconds
- `firstPrompt`: The user's first message (used as fallback title)
- `messageCount`: Total number of messages in session
- `created`: ISO 8601 timestamp of session creation
- `modified`: ISO 8601 timestamp of last modification
- `gitBranch`: Git branch if applicable
- `projectPath`: The actual filesystem path of the project
- `isSidechain`: Whether this is a subagent session

**Important Limitations**:
- `sessions-index.json` is **NOT updated in real-time** for active sessions
- Only populated when sessions are **closed** or **indexed by Claude Code's background process**
- Active sessions must fall back to transcript-based title extraction

### 6. Title Extraction Priority (from statusline.sh)

Jacques uses a 3-tier fallback system to extract session titles:

1. **Priority 1**: `sessions-index.json` lookup
   - Query: `.entries[] | select(.sessionId == {id}) | .summary`
   - **Note**: Modern Claude Code stores `summary` field (not `firstPrompt`) for the actual dynamic title
   - Only available for closed/indexed sessions

2. **Priority 2**: Transcript summary entries
   - Look for entries with `type: "summary"` in the JSONL
   - Extracted with: `grep '"type":"summary"' | tail -1 | jq -r '.summary'`
   - Generated by Claude after conversation progresses

3. **Priority 3**: First real user message
   - Fallback: first non-internal message
   - Skips patterns: `<local-command`, `<command-name>`, `<system-`, `<user-prompt-`, `[` (JSON arrays)
   - Always available from new sessions

### 7. Global History File

**File**: `~/.claude/history.jsonl`

**Format**: Newline-delimited JSON entries for clipboard/paste history

**Entry Structure**:
```json
{
  "display": "pasted content preview",
  "pastedContents": {},
  "timestamp": 1769879076891,
  "project": "/Users/gole/Desktop/jacques-context-manager",
  "sessionId": "7bdbef39-1420-4184-9506-63db6cfb7bdf"
}
```

Tracks Claude Code clipboard operations with session context.

### 8. Settings File

**File**: `~/.claude/settings.json`

**Contains**:
- `statusLine`: Hook configuration for real-time context updates
- `hooks`: Event handlers for SessionStart, PostToolUse, Stop, SessionEnd
- `autoCompact`: Auto-compaction settings (if enabled)

### 9. Code Implementation: JSONL Parser

**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/session/parser.ts`

**Key Functions**:
- `parseJSONL(filePath)`: Parse entire JSONL file into normalized entries
- `categorizeEntry(entry)`: Convert raw entry to standardized type
- `extractTextFromBlocks()`: Extract text from content blocks
- `extractThinkingFromBlocks()`: Extract Claude's thinking/reasoning
- `getEntryStatistics()`: Aggregate stats (tokens, cost, counts)

**Output Types**:
- `user_message`: User input
- `assistant_message`: Claude response (with optional thinking)
- `tool_call`: Tool invocations (with name, inputs, token usage)
- `hook_progress`: Hook execution logs
- `turn_duration`: Turn timing metrics
- `system_event`: System events
- `summary`: Session summaries
- `skip`: Entries to ignore (file-history-snapshot, etc.)

### 10. Session Detection

**Location**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/session/detector.ts`

**Key Functions**:
- `detectCurrentSession(cwd)`: Find most recently modified JSONL for a project
- `listProjectSessions(cwd)`: List all JSONL files for a project (sorted by mtime)
- `findSessionById(sessionId)`: Search across all projects for a session
- `getProjectDirPath(cwd)`: Get expected project directory path

### 11. Example File Paths

Real examples from the system:

```
/Users/gole/.claude/projects/-Users-gole-Desktop-jacques-context-manager-server/
├── 0c51ea48-49db-4240-be36-f942bd50601d.jsonl
├── 068d5122-614e-4cd8-ac72-21aaf8a8276d.jsonl
└── sessions-index.json

/Users/gole/.claude/projects/-Users-gole-Desktop-jacques-context-manager/
├── 63d7a4ab-b3af-48c2-8972-924ac7b9d905.jsonl
├── 280a0f08-4024-4421-96b7-b6d4e8075326/
│   └── subagents/
│       ├── agent-aprompt_suggestion-ddd61d.jsonl
│       ├── agent-aprompt_suggestion-bdca3f.jsonl
│       └── ...
├── cd506061-fc7c-4e92-a166-1ef4456fc31c.jsonl
└── sessions-index.json

/Users/gole/.claude/projects/-private-tmp/
├── d7f9a335-ec58-4b34-9cfb-bef8a6df725f.jsonl
├── 6a1c8600-29e7-4527-81e2-5974edf24330.jsonl
└── sessions-index.json
```

### 12. Integration with Jacques

Jacques system uses these locations via:
- **`detector.ts`**: Locates current session files
- **`parser.ts`**: Parses JSONL transcripts
- **`statusline.sh`**: Reads from sessions-index.json and transcript for titles
- **`session-registry.ts`**: Manages in-memory session state

All absolute paths in the codebase:
- `/Users/gole/Desktop/jacques-context-manager/core/src/session/detector.ts` - Path detection
- `/Users/gole/Desktop/jacques-context-manager/core/src/session/parser.ts` - JSONL parsing
- `/Users/gole/Desktop/jacques-context-manager/hooks/statusline.sh` - Title extraction script
- `/Users/gole/Desktop/jacques-context-manager/server/src/types.ts` - Type definitions