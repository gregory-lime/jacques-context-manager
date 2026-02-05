# Server (`@jacques/server`)

Real-time session tracking, event processing, and REST/WebSocket API. Depends on `@jacques/core` (must be built first).

**Build**: `cd server && npx tsc`
**Test**: `cd server && npm test`
**Start**: `npm run start:server` (standalone) or embedded via dashboard
**Ports**: 4242 (WebSocket), 4243 (HTTP API)

## Key Files

| File | Responsibility |
|------|----------------|
| `server.ts` | Main orchestrator — wires socket, WebSocket, registry, HTTP |
| `start-server.ts` | Embeddable entry point (used by dashboard) |
| `types.ts` | Server-specific types (events, messages) |
| `session-registry.ts` | In-memory session state management |
| `process-scanner.ts` | Cross-platform startup session detection |
| `unix-socket.ts` | Listen on `/tmp/jacques.sock` for hook events |
| `websocket.ts` | Broadcast session updates to clients |
| `http-api.ts` | REST API on port 4243 |
| `terminal-activator.ts` | Activate terminal window via AppleScript |
| `focus-watcher.ts` | Monitor OS focus changes |

## Event Flow

```
Hooks (Python/Bash)
    ↓ newline-delimited JSON
/tmp/jacques.sock (Unix socket)
    ↓
UnixSocketServer → EventHandler → SessionRegistry
                                      ↓
                                BroadcastService → WebSocket clients (4242)
                                      ↓
                                HTTP API (4243) — for GUI and REST queries
```

**Event types**: SessionStart, PostToolUse, ContextUpdate, Stop, SessionEnd

## Startup Session Detection

At startup, Jacques scans for running Claude Code sessions **before** hooks fire. This provides immediate visibility into active sessions.

**Process** (in `start-server.ts`):
1. `scanForActiveSessions()` enumerates running `claude` processes
2. Maps each process CWD to `~/.claude/projects/{encoded-path}/`
3. Finds active JSONL files (modified < 60s) or most recent
4. Registers sessions with `DISCOVERED:*` terminal key prefix
5. Broadcasts to connected clients

**Platform support**: macOS, Linux, Windows. See `docs/PLATFORM-SUPPORT.md` for details.

**Multi-session same-directory**: Detects ALL active sessions, not just one per directory.

**Hook upgrade**: When hooks fire, `DISCOVERED:*` sessions upgrade to real terminal keys.

## Session Registry

In-memory session store indexed by `session_id`.

- **Auto-registration**: If `context_update` arrives before `session_start`, auto-creates the session
- **Discovery registration**: Sessions detected at startup via process scanning
- **Auto-focus**: Most recently active session gets focus
- **Terminal identity**: `terminal_key` combines TTY, iTerm session ID, terminal PID
- **Auto-compact tracking**: Reads `~/.claude/settings.json` for autoCompact settings

## HTTP API Endpoints

### Sessions
- `GET /api/sessions` — All sessions from cache
- `GET /api/sessions/:id` — Single session with **catalog overlay** (deduplicated planRefs)
- `GET /api/sessions/:id/plans/:messageIndex` — Plan content (handles all source types)

### Archive
- `GET /api/archive/search?q=...` — Search archived conversations
- `GET /api/archive/manifests` — List all manifests

### Catalog
- `POST /api/catalog/extract` — Trigger catalog extraction
- `GET /api/projects/:path/catalog` — Extraction stats for a project
- `GET /api/projects/:path/subagents/:id/content` — Subagent result markdown
- `GET /api/projects/:path/plans/:id/content` — Plan content from catalog

### Sources
- `GET /api/sources/status` — Check source connections
- `POST /api/sources/google` — Configure Google Docs OAuth
- `POST /api/sources/notion` — Configure Notion OAuth

### Static Files
- `GET /` — Serve `gui/dist/index.html`
- `GET /*` — Static assets

## Catalog Overlay

The session API overlays deduplicated `planRefs` from catalog manifests onto the session index cache. This is critical for the Plan Identity System:

1. `GET /api/sessions/:id` reads session from cache
2. Looks up `.jacques/sessions/{id}.json` catalog manifest
3. If found, replaces cache `planRefs` with catalog's deduplicated version (has `catalogId`, `sources`)
4. Falls back to raw cache planRefs when no catalog exists

## WebSocket Messages

**Server → Client**: InitialState, SessionUpdate, SessionRemoved, FocusChanged, ServerStatus, AutoCompactToggled, HandoffReady

**Client → Server**: SelectSession, TriggerAction, ToggleAutoCompact, FocusTerminal

## Services

- `broadcast-service.ts` — Dispatch events to all WebSocket clients
- `notification-service.ts` — Native OS desktop notifications (node-notifier)
- `watchers/handoff-watcher.ts` — Monitor `.jacques/handoffs/` for new files

## MCP Server (`server/src/mcp/`)

Model Context Protocol server for Claude Code integration. Provides `search_conversations` tool.

**Entry**: `server/dist/mcp/server.js` (installed as `jacques-mcp` binary)

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

## Server Management

**PID file**: `~/.jacques/server.pid`

**Pre-flight checks** before starting:
- PID file liveness (is the recorded PID still alive?)
- Socket liveness (is something listening on /tmp/jacques.sock?)
- Port availability (are 4242/4243 free?)

**Troubleshooting** — if sessions stop registering:
1. `npm run stop:server` to kill zombie processes
2. `lsof -i :4242 -i :4243` should show nothing
3. `ls /tmp/jacques.sock` should not exist
4. Start fresh
