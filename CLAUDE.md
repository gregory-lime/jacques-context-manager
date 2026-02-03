# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jacques is a real-time context monitor for multiple AI coding assistants (Claude Code, Cursor). It displays **exact token usage percentage** in real-time through:
- Terminal dashboard (Ink/React-based TUI)
- In-app statusLine integration
- Session lifecycle tracking

The system uses a three-layer architecture:
1. **Hooks** (Python/Bash) → send events via Unix socket
2. **Server** (Node.js/TypeScript) → manages sessions and broadcasts updates via WebSocket
3. **Dashboard** (Ink/React) → displays real-time context usage

**Current Status**: Phases 1-4, 6-7, 9-10, 11 complete. Phase 5 (context breakdown) pending.

## Key Commands

### Setup & Installation
```bash
npm run setup              # Full setup: install deps, build, symlink hooks
npm run configure          # Configure Claude Code settings.json with hooks
```

### Development
```bash
npm run install:all        # Install dependencies for server and dashboard
npm run build:all          # Build both server and dashboard TypeScript

# Server
npm run dev:server         # Server dev mode (tsc --watch)
npm run start:server       # Start Jacques server
cd server && npm test      # Run server tests

# Dashboard
npm run dev:dashboard      # Dashboard dev mode (tsc --watch)
npm run start:dashboard    # Start terminal dashboard
```

### Testing
```bash
cd server && npm test                                           # Run all tests
cd server && node --experimental-vm-modules node_modules/jest/bin/jest.js  # Full test command
```

**Important**: Tests use `--experimental-vm-modules` because the codebase uses ES modules (`"type": "module"`).

## Architecture

### Three-Layer System

```
Claude Code/Cursor
    ↓ (hooks via Unix socket /tmp/jacques.sock)
Jacques Server (Node.js + TypeScript)
    ↓ (WebSocket on port 4242)
Dashboard (Ink/React CLI)
```

### Server Components

- **`server/src/types.ts`**: Complete type definitions for sessions, events, and messages. This is the source of truth for all data structures.
- **`server/src/session-registry.ts`**: Manages session state. Sessions are indexed by `session_id`. Focus is determined by most recent activity.
- **`server/src/unix-socket.ts`**: Listens on `/tmp/jacques.sock` for newline-delimited JSON events from hooks.
- **`server/src/websocket.ts`**: Broadcasts session updates to dashboard clients on port 4242.
- **`server/src/server.ts`**: Main orchestrator - wires together Unix socket, WebSocket, and registry.

### Event Flow

1. **SessionStart** → `jacques-register-session.py` → Unix socket → `SessionRegistry.registerSession()`
2. **PostToolUse** → `jacques-report-activity.py` → Unix socket → `SessionRegistry.updateActivity()`
3. **statusLine** → `statusline.sh` → Unix socket → `SessionRegistry.updateContext()` → broadcasts to dashboard
4. **Stop** → `jacques-session-idle.py` → Unix socket → `SessionRegistry.setSessionIdle()`
5. **SessionEnd** → `jacques-unregister-session.py` → Unix socket → `SessionRegistry.unregisterSession()`

### Hook System

Located in `hooks/`:
- **`statusline.sh`**: Bash script that extracts context data using `jq`, sends to server, displays abbreviated status
- **`jacques-register-session.py`**: Registers new session, extracts terminal identity, reads transcript for title
- **`jacques-report-activity.py`**: Reports tool usage activity
- **`jacques-session-idle.py`**: Marks session as idle
- **`jacques-unregister-session.py`**: Removes session from registry

All hooks communicate via `/tmp/jacques.sock` using newline-delimited JSON.

### Dashboard

Built with **Ink** (React for CLIs). Entry point: `dashboard/src/cli.ts`

Commands:
- `jacques` or `jacques dashboard`: Interactive TUI (full-screen, requires TTY)
- `jacques status`: One-shot status check
- `jacques list`: JSON output of sessions
- `jacques search <query>`: Search archived conversations
- `jacques archive-stats`: Show archive statistics

**Technical Implementation**:
- **Alternate screen buffer**: Uses ANSI codes `\x1b[?1049h` (enter) / `\x1b[?1049l` (exit)
- **Anti-ghosting**: Terminal reset `\x1Bc` on resize event clears screen and scrollback
- **Responsive breakpoints**:
  - Horizontal layout: ≥60 chars width
  - Version display: ≥70 chars width
  - Vertical layout: <60 chars width
- **Fixed viewport**: 10-row content area with scroll support for long lists
- **Border calculations**: All widths derived from `terminalWidth` for pixel-perfect alignment
- **ANSI art**: Mascot converted from PNG using Jimp, rendered with `wrap="truncate-end"`

### Multi-Source Support

The system supports sessions from multiple AI tools:
- `claude_code`: Claude Code sessions
- `cursor`: Cursor AI sessions
- Extensible to other sources

Sessions are tagged with a `source` field. The registry handles sessions from all sources uniformly.

### LoadContext System

Enables importing external context from documentation sources into projects:

**Architecture**:
- `dashboard/src/sources/` - External source adapters (Obsidian, Google Docs, Notion)
- `dashboard/src/context/` - Context file management (indexer, manager)
- `~/.jacques/config.json` - Global source configuration
- `.jacques/index.json` - Per-project context file index
- `.jacques/context/` - Copied context files

**User Flow**:
```
Main Menu → Load Context → Load from other sources
    → Obsidian (Not connected) → Configure vault path
    → Obsidian (Connected) → Browse .md files → Select → Add to project
```

**Configuration Schema** (`~/.jacques/config.json`):
```json
{
  "version": "1.0.0",
  "sources": {
    "obsidian": { "enabled": true, "vaultPath": "/path/to/vault" }
  }
}
```

**Index Schema** (`.jacques/index.json`):
```json
{
  "version": "1.0.0",
  "files": [{
    "id": "auth-flow-abc123",
    "name": "Authentication Flow",
    "path": ".jacques/context/auth-flow.md",
    "source": "obsidian",
    "sourceFile": "/vault/Auth Flow.md",
    "description": "OAuth implementation notes"
  }]
}
```

### Archive & Search System

Cross-project search over saved Claude Code conversations using keyword indexing.

**Architecture**:
- `core/src/archive/` - Archive module (manifest extraction, indexing, storage, plan extraction)
- `server/src/mcp/` - MCP server with `search_conversations` tool
- `~/.jacques/archive/` - Global archive storage
- `~/.jacques/config.json` - Archive settings (filter, autoArchive)

**Storage Structure** (`~/.jacques/archive/`):
```
~/.jacques/archive/
├── index.json              # Keyword inverted index
├── manifests/[id].json     # Conversation metadata (~1-2KB each)
├── conversations/[project]/[id].json  # Full conversation content
└── plans/[name].md         # Plan files referenced in conversations
```

**CLI Commands**:
```bash
jacques search "authentication jwt"      # Search archived conversations
jacques search -p my-project "bug fix"   # Filter by project
jacques search --tech typescript react   # Filter by technologies
jacques archive-stats                    # Show archive statistics
```

**MCP Server**:
The archive is accessible via MCP for use in Claude Code:
```bash
npm run start:mcp  # Start the MCP server
```

Configure in `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "jacques": {
      "command": "node",
      "args": ["/path/to/jacques/server/dist/mcp/server.js"]
    }
  }
}
```

**Settings** (accessible via Jacques dashboard `[S]`):
- **Archive Filter**: Everything | Without Tools | Messages Only
- **Auto-Archive**: Toggle auto-archiving on session end (default: off)

**Embedded Plan Extraction**:
Plans embedded in user messages (e.g., "Implement the following plan:") are automatically:
- Detected via trigger patterns (case-insensitive)
- Extracted and validated (≥100 chars, requires markdown heading)
- Deduplicated using SHA-256 hash + Jaccard similarity (90% threshold)
- Saved to `.jacques/plans/` with readable filenames (YYYY-MM-DD_title-slug.md)
- Indexed in `.jacques/index.json` with bidirectional session links
- Included in handoff documents ("Plan Context" section)
- Archived to global `~/.jacques/archive/plans/`

**Module**: `core/src/archive/plan-extractor.ts`
- `detectEmbeddedPlans()`: Pattern matching in user messages
- `extractEmbeddedPlans()`: Full extraction with deduplication
- `findDuplicatePlan()`: Content-based duplicate detection
- `indexEmbeddedPlan()`: Index management with session linking

**Manifest Fields**:
- `title`: Claude's auto-generated summary (or first user message)
- `userQuestions`: All user messages (truncated)
- `filesModified`: Write/Edit tool call paths
- `toolsUsed`: Unique tool names
- `technologies`: Auto-detected from content (react, typescript, etc.)
- `plans`: Plan files created during the conversation

### Session Handoff System

Generates ~1000 token briefing documents for seamless session continuation when context fills up or you need to start a new session.

**Skills**:
- `/jacques-handoff` - Creates a handoff document using 8 parallel extractors
- `/jacques-paste` - Loads the latest handoff and continues work

Note: The dashboard cannot run inline in Claude Code (requires TTY). Use `jacques` in a separate terminal.

**When to Use**:
- Context usage exceeds 70% (check with dashboard)
- Ending a session with work in progress
- Switching to a different task mid-session
- Before significant context gets auto-compacted

**Invocation Methods**:
| Method | Trigger | LLM? | Description |
|--------|---------|------|-------------|
| `c` in dashboard | User presses key | No | Direct generation from transcript (fast) |
| `/jacques-handoff` | User types command | Yes | Intelligent extraction with 8 parallel subagents |
| `/jacques-paste` | User types command | Yes | Load latest handoff, summarize, propose next step |
| `h` in dashboard | User presses key | No | Copies prompt for manual paste |
| `H` in dashboard | User presses key | No | Browse existing handoffs |

**Output**: `.jacques/handoffs/{timestamp}-handoff.md`

**File Locations**:
| Location | Purpose |
|----------|---------|
| `~/.claude/skills/jacques-handoff/` | `/jacques-handoff` skill |
| `~/.claude/skills/jacques-paste/` | `/jacques-paste` skill |
| `~/.claude/agents/jacques-*.md` | 9 subagent files (orchestrator + 8 extractors) |
| `core/src/handoff/generator.ts` | Direct transcript-based generation |
| `core/src/handoff/catalog.ts` | Handoff file listing and management |

**Handoff Structure** (~1000 tokens):
| Section | Purpose | Token Budget |
|---------|---------|--------------|
| Project Context | Orientation (tech, dirs, entry points) | 150 |
| Current Task | Goal and approach | 100 |
| Progress Made | Done, in-progress, blocked items | 200 |
| What Didn't Work | Anti-patterns to avoid | 100 |
| Key Decisions | Choices with reasoning | 150 |
| Blockers & Bugs | Resolved and open issues | 100 |
| Warnings & Gotchas | Things to know upfront | 50 |
| Next Steps | Immediately actionable items | 150 |

**Handoff Structure** (from `c` shortcut):
- Files Modified
- Tools Used
- Recent Context (last 5 user messages)

**Extractor Architecture**:
8 specialized extractors run in parallel (haiku model):
- `jacques-project-context` - Orientation from CLAUDE.md or package.json
- `jacques-task-focus` - Current goal and approach
- `jacques-progress` - Completed, in-progress, blocked items
- `jacques-antipatterns` - What failed and why (prevents repeating mistakes)
- `jacques-decisions` - Key choices with reasoning
- `jacques-blockers` - Issues and resolution status
- `jacques-next-steps` - Prioritized actionable items
- `jacques-warnings` - Gotchas to know upfront

**Quality Gates**:
- Each extractor has explicit "How to Extract" detection mechanisms
- Structured output schemas enforce specificity
- Quality checklists prevent vague output
- Orchestrator validates before synthesis

**Two Complementary Approaches**:
- **Dashboard `c`**: Fast, rule-based extraction from transcript (files, tools, messages)
- **Skill `/jacques-handoff`**: LLM-powered intelligent summarization with quality validation

## TypeScript Configuration

- **Target**: ES2022
- **Module**: NodeNext (ES modules with `.js` extensions in imports)
- **All imports must use `.js` extension** even for `.ts` files (e.g., `import { foo } from './types.js'`)
- Output directory: `dist/`
- Source maps and declarations enabled

## Testing Patterns

- Test files: `*.test.ts`
- Framework: Jest with `ts-jest` preset for ESM
- Run with `--experimental-vm-modules` flag
- Example: See `server/src/session-registry.test.ts` for registry testing patterns
- Core tests: `cd core && npm test` (37 tests for plan-extractor module)
- Dashboard tests: `cd dashboard && npm test` (125 tests for sources/context/archive modules)

## Session Lifecycle

1. **Registration**: SessionStart hook creates session with metadata (cwd, terminal identity, model)
2. **Activity**: PostToolUse updates last_activity, sets status to 'working', auto-focuses session
3. **Context Updates**: statusLine provides real-time context metrics, auto-registers if session doesn't exist yet
4. **Idle**: Stop hook marks session as idle
5. **Removal**: SessionEnd hook deletes session, shifts focus to most recent remaining session

### Auto-Registration

If `context_update` event arrives before `session_start`, the registry auto-creates the session. This handles timing issues where statusLine fires before SessionStart hook.

## Important Details

### Server Management

**Starting**: `npm run start:server` (standalone) or `jacques` (dashboard with embedded server)

**Stopping**: `npm run stop:server` or press Q/Ctrl+C in the dashboard

**PID file**: `~/.jacques/server.pid` — written by standalone server, used by stop script

**Troubleshooting**: If sessions stop registering after a restart:
1. Run `npm run stop:server` to kill any zombie processes
2. Verify: `lsof -i :4242 -i :4243` should show nothing
3. Verify: `ls /tmp/jacques.sock` should not exist
4. Start fresh: `npm run start:server` or `jacques`

**Pre-flight checks**: The standalone server checks for existing instances before starting:
- PID file liveness (is the recorded PID still alive?)
- Socket liveness (is something listening on /tmp/jacques.sock?)
- Port availability (are 4242/4243 free?)
If any check fails, it prints a clear error and exits.

### Terminal Identity
Sessions are uniquely identified by `terminal_key` which combines multiple terminal environment variables (TTY, iTerm session ID, terminal PID, etc.). This allows Jacques to track sessions across terminal windows.

### Focus Management
- Focus automatically shifts to the session with most recent activity
- `SessionRegistry.updateActivity()` and `updateContext()` auto-focus their session
- Manual focus via `setFocusedSession(sessionId)`
- When a focused session is removed, focus shifts to most recent remaining session

### Auto-Compact Tracking
Sessions track auto-compact settings from `~/.claude/settings.json`:
- `enabled`: Whether autoCompact is enabled
- `threshold`: Percentage threshold (default 95%)
- `bug_threshold`: Set to 78 when disabled due to known bug (#18264) where compaction still triggers at ~78%

### Subagent Types

Claude Code creates different types of subagent files in `{session-id}/subagents/`:

| Agent Type | ID Pattern | User Visible | In Main JSONL | Description |
|------------|------------|--------------|---------------|-------------|
| **User Task** | `a{7chars}` (e.g., `afcd4a9`) | Yes | `agent_progress` entries | User-triggered Task tool calls (Explore, Plan, etc.) |
| **Auto-Compact** | `acompact-{6chars}` | No | No entries | Context compaction agent (summarizes when context fills) |
| **Prompt Suggestion** | `aprompt_suggestion-{6chars}` | No | No entries | Background feature for suggesting next actions |

**Key Insight**: The main JSONL transcript only contains `agent_progress` entries for user-visible agents. Internal agents (auto-compact, prompt_suggestion) exist only as separate JSONL files in the subagents directory.

**Filtering**: Jacques filters out internal agents from counts and display:
- `session-index.ts`: Only counts user-visible agents in `subagentIds`
- `http-api.ts`: Filters `listSubagentFiles()` results before returning
- `hadAutoCompact: true` flag indicates if auto-compact occurred (shown in UI)

### Context Metrics
All context percentages and token counts come from Claude Code's context_window data. The `is_estimate` flag indicates whether data is estimated (from hooks) or actual (from preCompact events).

### Session Title Extraction

Session titles are extracted by `statusline.sh` using a priority-based fallback system:

| Priority | Source | Location | Availability |
|----------|--------|----------|--------------|
| 1 | sessions-index.json | `~/.claude/projects/{path}/sessions-index.json` | Only for **closed/indexed** sessions |
| 2 | Transcript summary | `"type":"summary"` entries in transcript | Only after conversation progresses |
| 3 | First user message | `"type":"user"` entries in transcript | Always (fallback) |

**Why active sessions show the first user message:**
- `sessions-index.json` only contains sessions that have been closed or periodically indexed by Claude Code
- Summary entries are generated by Claude after the conversation has been running for a while
- New/active sessions fall back to the first real user message (skipping internal XML tags like `<local-command>`)

**When better titles appear:**
- After closing and reopening a session (adds to sessions-index.json)
- After Claude generates a summary entry during conversation
- After the session is indexed by Claude Code's background process

## File Organization

```
jacques-context-manager/
├── server/src/          # Node.js server (TypeScript)
├── dashboard/src/       # Terminal dashboard (Ink/React)
│   ├── archive/         # Conversation archive & search
│   ├── components/      # React/Ink UI components
│   ├── sources/         # External source adapters (Obsidian, etc.)
│   ├── context/         # Context file management
│   ├── session/         # Session parsing and transformation
│   ├── storage/         # File I/O utilities
│   └── templates/       # Skill templates
├── server/src/mcp/      # MCP server for archive search
├── hooks/               # Claude Code/Cursor hooks (Python/Bash)
├── scripts/             # Setup and configuration scripts
└── docs/                # Documentation
```

## Dependencies

### Required System Tools
- **jq**: JSON parsing in statusline.sh (`brew install jq`)
- **nc** (netcat): Unix socket communication (usually pre-installed)
- **Python 3.x**: For hook scripts

### Node.js Dependencies
- **ws**: WebSocket library for server and client
- **ink**: React-based CLI framework for dashboard
- **commander**: CLI argument parsing

## Development Phases & Progress

### Completed Phases

**Phase 1**: Terminal Context Monitor ✅
- Basic server/dashboard architecture
- Unix socket + WebSocket communication
- Session registry with focus detection

**Phase 2**: Multi-Source Adapter Architecture ✅
- Adapter pattern for multiple AI tools
- Claude Code + Cursor support
- Unified installer (`hooks/install.py`)
- 30/30 unit tests passing

**Phase 3**: Real-Time Context Tracking ✅
- Token estimation with tiktoken (fallback to char-based)
- Skill overhead detection (~34k tokens for 21 skills)
- Calibration system for improving estimates
- 61/61 tests passing

**Phase 4**: TUI Library Refactor (Ink) ✅
- Migrated from ANSI escape codes to Ink/React
- Jacques Derrida mascot
- Component-based architecture

**Phase 6**: Manual Compact Workflow ✅
- Auto-compact toggle functionality
- Handoff file generation
- Known bug #18264 handling (78% threshold despite autoCompact: false)

**Phase 7**: CLI Redesign (Hybrid Menu Interface) ✅
- Simplified 5-button menu
- Save Context feature (JSONL → JSON transformation)
- Session detection and parsing
- Removed unused components (~32.6 KB dead code)

**Phase 8**: UI Polish & Professional Terminal Experience ✅
- **Alternate screen buffer**: Full-screen mode like vim/htop (preserves terminal state on exit)
- **Anti-ghosting**: Hard reset (`\x1Bc`) on resize prevents artifacts
- **Responsive layout**: Horizontal down to 60 chars, vertical below; version hides at <70 chars
- **Fixed box height**: 10 rows consistent across all views
- **Scrollable sessions**: Arrow key navigation with overlay indicators (▲ more above / ▼ more below)
- **Perfect borders**: Mathematically correct width calculations for pixel-perfect alignment
- **Minimal spacing**: Single empty lines for breathing room
- **Soft coral palette**: #E67E52 accent color matching mascot

**Phase 9**: LoadContext Feature ✅
- **External sources**: Load context from Obsidian vaults (Google Docs, Notion coming soon)
- **Auto-detection**: Finds Obsidian vaults from system config, manual path entry fallback
- **File browser**: Scrollable list of markdown files with relative paths and sizes
- **Context catalog**: Copies files to `.jacques/context/`, indexes in `.jacques/index.json`
- **78/78 unit tests**: Full test coverage for sources and context modules

**Phase 10**: Conversation Archive & Search ✅
- **Cross-project search**: Keyword-indexed search over archived conversations
- **Dual save**: Save Context saves to both local project and global archive
- **MCP server**: `search_conversations` tool for Claude Code integration
- **CLI commands**: `jacques search`, `jacques archive-stats`
- **Settings view**: Configure archive filter and auto-archive toggle
- **Manifest extraction**: Title, user questions, files modified, technologies
- **Plan detection**: Automatically archives plans referenced in conversations
- **47/47 unit tests**: Full test coverage for archive module

**Phase 11**: Embedded Plan Extraction ✅
- **Automatic detection**: Scans user messages for "Implement the following plan:" trigger patterns
- **Multi-plan support**: Handles multiple plans per session (split by markdown headings)
- **Content-based deduplication**: SHA-256 hashing + Jaccard similarity (90% threshold)
- **Bidirectional linking**: Plans ↔ Sessions via `.jacques/index.json`
- **Handoff integration**: Includes plan context in session handoffs
- **Module**: `core/src/archive/plan-extractor.ts` (433 lines)
- **37/37 unit tests**: Full coverage for detection, extraction, deduplication, and indexing

### Pending Phases

**Phase 5**: Context Details Breakdown ⬜
- Show breakdown by category (messages, skills, system prompts, cache)
- Parse `transcript_path` for message-level analysis
- Capture cost and cache metrics from statusLine
- Plan validated and ready for implementation

## Key Architecture Patterns

### Adapter Pattern (Phase 2)

All hooks use adapters to normalize events from different AI tools:

```python
from adapters.claude_code import ClaudeCodeAdapter
from adapters.cursor import CursorAdapter

adapter = ClaudeCodeAdapter()
payload = adapter.build_session_start_payload(input_data)
adapter.send_event(payload)
```

**Location**: `hooks/adapters/`
- `base.py`: BaseAdapter with common functionality
- `claude_code.py`: Claude Code specific mappings
- `cursor.py`: Cursor specific mappings
- `template.py`: Template for adding new AI tools

### Field Mappings by Source

| Source          | Session ID        | Project Path            | Context Data Event |
| --------------- | ----------------- | ----------------------- | ------------------ |
| Claude Code CLI | `session_id`      | `workspace.project_dir` | statusLine         |
| Cursor Native   | `conversation_id` | `workspace_roots[0]`    | preCompact         |

### Session Auto-Registration

The registry auto-creates sessions from `context_update` events if they arrive before `session_start`. This handles timing issues where statusLine fires first.

### Token Estimation (Phase 3)

**For Cursor sessions without preCompact data:**
1. Use tiktoken `cl100k_base` encoding (~90% accurate)
2. Fallback to char-based estimation (4 chars/token) if tiktoken unavailable
3. Add skill overhead detection (detects installed skills, adds ~34k tokens)
4. Calibrate when preCompact provides actual metrics

**Session Start Context:**
- Claude Code: 0% (statusLine provides immediate updates)
- Cursor: ~18% (skills overhead + system prompt)

## Claude Code JSONL Format

**Important discoveries from Phase 7 parser implementation:**

### Entry Types

| Type                    | Subtype                   | Description                        |
| ----------------------- | ------------------------- | ---------------------------------- |
| `user`                  | -                         | User messages                      |
| `assistant`             | -                         | Claude responses + thinking        |
| `progress`              | `hook_progress`           | Hook execution logs                |
| `progress`              | `agent_progress`          | Subagent/explore agent calls       |
| `progress`              | `bash_progress`           | Bash command streaming output      |
| `progress`              | `mcp_progress`            | MCP tool executions                |
| `progress`              | `query_update`            | Web search queries                 |
| `progress`              | `search_results_received` | Web search results                 |
| `system`                | `turn_duration`           | Turn timing metrics                |
| `system`                | `stop_hook_summary`       | Hook summary                       |
| `summary`               | -                         | Session title                      |
| `queue-operation`       | -                         | Queue management (usually skip)    |
| `file-history-snapshot` | -                         | File tracking (skip)               |

### Filtered User Messages

User messages starting with these prefixes are **internal CLI messages** and should be hidden from archive display:

| Prefix | Description |
|--------|-------------|
| `<local-command-caveat>` | Warning before local command output |
| `<command-name>` | CLI command name (e.g., `/clear`, `/help`) |
| `<command-message>` | CLI command description |
| `<command-args>` | CLI command arguments |
| `<local-command-stdout>` | CLI command output |

These are generated when users run slash commands in the CLI and don't represent actual user questions.

### Progress Entry Structures

**agent_progress** (subagent/explore calls):
```json
{
  "type": "progress",
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

**bash_progress** (command streaming):
```json
{
  "type": "progress",
  "data": {
    "type": "bash_progress",
    "output": "recent output",
    "fullOutput": "complete output",
    "elapsedTimeSeconds": 2,
    "totalLines": 100
  }
}
```

**mcp_progress** (MCP tool calls):
```json
{
  "type": "progress",
  "data": {
    "type": "mcp_progress",
    "status": "started" | "completed",
    "serverName": "deepwiki",
    "toolName": "ask_question"
  }
}
```

**web search** (query_update / search_results_received):
```json
{
  "type": "progress",
  "data": {
    "type": "query_update" | "search_results_received",
    "query": "search terms",
    "resultCount": 10
  }
}
```

### Assistant Message Content

`assistant` entries contain `message.content[]` array with:
- `type: "text"` - Actual response text
- `type: "thinking"` - Extended thinking/reasoning
- `type: "tool_use"` - Tool calls (Bash, Read, Write, etc.)

### Token Usage Data

`assistant` entries include token usage in `message.usage`:
```json
{
  "usage": {
    "input_tokens": 15000,
    "output_tokens": 2500,
    "cache_creation_input_tokens": 0,
    "cache_read_input_tokens": 12000
  }
}
```

**⚠️ WARNING: `output_tokens` is INACCURATE!** Claude Code JSONL always shows 1-9 tokens regardless of actual output. See "Output Tokens in JSONL Are Inaccurate" in Common Pitfalls. Jacques uses tiktoken to estimate actual output tokens from text content.

**Token calculation for display:**
- **Input tokens** = `input_tokens + cache_read_input_tokens` (fresh + cached)
- **Output tokens** = Estimated via tiktoken from actual text content (NOT from `output_tokens` field)
- Note: `cache_creation_input_tokens` is a SUBSET of `input_tokens`, not additional tokens

### Path Encoding

Transcript paths use dash encoding: `/Users/gole/Desktop/project` → `-Users-gole-Desktop-project`
**Critical**: Keep the leading dash!

### Parsing Example

See `dashboard/src/session/parser.ts` for reference implementation.

### Subagent File Structure

Subagent conversations are stored in `{session-id}/subagents/agent-{agentId}.jsonl`:

```
~/.claude/projects/{encoded-path}/
├── {session-id}.jsonl              # Main conversation (has agent_progress for user agents)
└── {session-id}/
    └── subagents/
        ├── agent-a6047be.jsonl     # User-triggered Task agent
        ├── agent-acompact-83efcb.jsonl  # Internal: auto-compact (no agent_progress)
        └── agent-aprompt_suggestion-4e4eb6.jsonl  # Internal: prompt suggestion (no agent_progress)
```

**Important**: The number of subagent files may exceed the count of `agent_progress` entries in the main JSONL because internal agents don't create progress entries.

## Common Pitfalls & Solutions

### Timing Issues
**Problem**: statusLine fires BEFORE SessionStart hook
**Solution**: Auto-register sessions from context_update events

### Project Detection
**Problem**: `cwd` in hook input may be `~/.claude`, not the project directory
**Solution**: Always prefer `workspace.project_dir` over `cwd`

### Empty Transcripts
**Problem**: Transcript may be empty at SessionStart
**Solution**: Generate fallback titles using project name

### Cursor Model Confusion
**Problem**: Cursor reports different models in different events
**Solution**: Only use model from `sessionStart` (user's actual model), ignore model from `preCompact` (internal Gemini Flash for summarization)

### Skill Overhead
**Problem**: Cursor injects ALL installed skills into EVERY message (~20k tokens for 17 skills)
**Solution**: Detect skills at session start, add to baseline estimate

### Bash Case Statement Syntax in Hooks
**Problem**: Case patterns with `<` characters in bash break with quoted syntax
```bash
# BROKEN - causes syntax error:
case "$content" in
  '<local-command'*) continue ;;
esac
```
**Solution**: Use first-character checking instead:
```bash
# WORKS:
first_char="${content:0:1}"
if [ "$first_char" = "<" ]; then
  continue
fi
```

### Embedded Plan Detection
**Problem**: Plan content must be ≥100 chars AFTER trigger phrase removal
**Example**: User message "Implement the following plan:\n\n# Title\n\nContent" is 120 chars, but after removing trigger (31 chars), content is only 89 chars
**Solution**: Ensure plan content alone exceeds 100 characters, not including the trigger phrase
**Test gotcha**: When writing tests, account for this when creating test data

### Claude Code Source Field
**Problem**: Claude Code sends `source: "clear"`, `source: "startup"`, `source: "resume"` to indicate how session started, not which AI tool
**Solution**: Normalize these to `claude_code` in session-registry.ts for internal tracking

### Output Tokens in JSONL Are Inaccurate
**Problem**: Claude Code JSONL files record `output_tokens: 1` or very low values (1-9) for every assistant entry, regardless of actual text content length. This appears to be a streaming artifact where only incremental/partial values are logged, not the final totals.
**Evidence**:
- Text with 8,156 characters shows `output_tokens: 1`
- All entries have `stop_reason: null` (incomplete streaming state)
- Sum across entire session gives ~500 output tokens when actual output is 10,000+ tokens
**Solution**: Use **tiktoken** (`@dqbd/tiktoken` with `cl100k_base` encoding) to count actual tokens from:
- Assistant message text (`entry.content.text`)
- Thinking blocks (`entry.content.thinking`)
- Tool call inputs (`JSON.stringify(entry.content.toolInput)`)
**Implementation**: `core/src/session/parser.ts` - `countTokens()` function and `totalOutputTokensEstimated` field
**Note**: Other tools like ccusage, toktrack also have this limitation - they just read the inaccurate JSONL values. Our tiktoken approach gives ~30-100x more accurate estimates.

## Known Bugs & Workarounds

### Claude Code Bug #18264
Even with `autoCompact: false`, compaction still triggers at ~78% context usage.

**Workaround**: Create handoff files before 70% usage to avoid automatic compaction.

## Testing

### Running Tests

```bash
# Server tests
cd server && npm test

# Hook adapter tests
cd hooks && python3 -m pytest adapters/test_*.py

# All tests should pass:
# - Server: TypeScript compilation + Jest tests
# - Hooks: 61/61 unit tests (tokenizer, calibration, skills, adapters)
```

### Test Organization

- `server/src/*.test.ts`: Server component tests
- `hooks/adapters/test_*.py`: Hook adapter tests
- Tests use mock data, no actual AI tool sessions required

## Lessons Learned

### Technical
- statusLine provides `transcript_path` - enables real-time parsing
- Different AI tools have incompatible field names - adapter pattern essential
- tiktoken not available in system Python 3.13 - always implement fallbacks
- JSONL user messages are `type: "user"`, NOT `queue-operation`
- Path encoding uses dashes, keep the leading dash
- `PlanReference` requires `source: "embedded" | "write"` field (added in Phase 11)
- Jaccard similarity is lower than intuitive - 0.9 threshold appropriate for very similar plans
- Plan extraction triggers on Save Context or archive, not during active session

### Process
- Read files before editing (especially for large codebases)
- Test each functionality before moving to next task
- Use TDD when possible (Phase 2, 3 had excellent test coverage)
- Remove dead code aggressively (Phase 7 removed 32.6 KB)
