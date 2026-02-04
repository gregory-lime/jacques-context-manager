# Hooks (Python/Bash)

Integration scripts that send session events from Claude Code and Cursor to the Jacques server via Unix socket.

**Location**: `hooks/`
**Communication**: `/tmp/jacques.sock` (newline-delimited JSON)
**Test**: `cd hooks && python3 -m pytest adapters/test_*.py`

## Hook Scripts

### Claude Code Hooks (`hooks/`)

| Script | Event | What It Does |
|--------|-------|--------------|
| `jacques-register-session.py` | SessionStart | Register session with metadata (cwd, terminal identity, model, transcript path) |
| `jacques-report-activity.py` | PostToolUse | Track tool usage, update last_activity |
| `jacques-session-idle.py` | Stop | Mark session as idle |
| `jacques-unregister-session.py` | SessionEnd | Remove session from registry |
| `statusline.sh` | statusLine | Extract context metrics via `jq`, send to server, display abbreviated status |

### Cursor Hooks (`hooks/cursor/`)

| Script | Event |
|--------|-------|
| `session-start.py` | Register Cursor session |
| `post-tool-use.py` | Activity tracking |
| `after-agent-response.py` | Subagent tracking |
| `session-end.py` | Cleanup |
| `pre-compact.py` | Receive actual context metrics |

## Adapter Pattern (`hooks/adapters/`)

All hooks use adapters to normalize events from different AI tools:

| File | Responsibility |
|------|----------------|
| `base.py` | BaseAdapter — common functionality, socket communication |
| `claude_code.py` | ClaudeCodeAdapter — extract session_id, workspace.project_dir, etc. |
| `cursor.py` | CursorAdapter — extract conversation_id, workspace_roots[0], etc. |
| `template.py` | Template for adding new AI tool adapters |
| `tokenizer.py` | Token estimation (tiktoken with char-based fallback) |
| `skills.py` | Detect installed Claude Code skills |
| `calibration.py` | Calibrate token estimation against actual preCompact data |

**Field Mappings**:
| Source | Session ID | Project Path | Context Event |
|--------|-----------|-------------|---------------|
| Claude Code | `session_id` | `workspace.project_dir` | statusLine |
| Cursor | `conversation_id` | `workspace_roots[0]` | preCompact |

## Session Title Extraction

`statusline.sh` extracts titles with priority-based fallback:

1. `sessions-index.json` (closed/indexed sessions only)
2. Transcript `"type":"summary"` entries (after conversation progresses)
3. First user message (always available, skipping internal `<local-command>` tags)

Active sessions typically show the first user message until Claude generates a summary or the session gets indexed.

## Installation

`hooks/install.py` configures Claude Code/Cursor to call hooks by updating settings files. Run via `npm run configure`.

## Token Estimation (Cursor)

For Cursor sessions without preCompact data:
1. tiktoken `cl100k_base` encoding (~90% accurate)
2. Fallback to char-based estimation (4 chars/token)
3. Add skill overhead detection (~34k tokens for 21 skills)
4. Calibrate when preCompact provides actual metrics
