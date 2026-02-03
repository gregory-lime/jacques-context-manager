# Jacques - Claude Code Context Monitor

<p align="center">
  <strong>Real-time token usage monitoring for Claude Code sessions</strong>
</p>

Jacques displays **exact context window usage** for your Claude Code sessions in real-time. Know precisely how much of your context is used, get warnings before hitting limits, and track multiple sessions simultaneously.

## Features

- **Real-time context monitoring** - See exactly how much of your context window is used (e.g., "42.5%")
- **Multi-session tracking** - Monitor multiple Claude Code sessions across terminals
- **Automatic focus detection** - Active session is highlighted automatically
- **StatusLine integration** - Context percentage displayed directly in Claude Code
- **Terminal dashboard** - Clean, simple terminal UI with progress bars
- **Warning thresholds** - Visual alerts when context usage is high (60%, 80%)

## Quick Start

### 1. Setup

```bash
# Clone or navigate to the project
cd /Users/gole/Desktop/jacques-context-manager

# Run the setup script (installs dependencies, builds, sets up hooks)
npm run setup
```

### 2. Configure Claude Code

```bash
# Automatically configure Claude Code hooks
npm run configure
```

This will:

- Back up your existing `~/.claude/settings.json`
- Add Jacques hooks for session tracking
- Configure statusLine for context display

### 3. Start Jacques

**Terminal 1 - Start the server:**

```bash
npm run start:server
```

**Terminal 2 - Start the dashboard:**

```bash
npm run start:dashboard
```

### 4. Use Claude Code

Start or restart a Claude Code session. You'll see:

- Context percentage in Claude Code's status line: `[Opus] ctx:42%`
- Full dashboard with session details, progress bar, and status

## Commands

| Command                   | Description                                |
| ------------------------- | ------------------------------------------ |
| `npm run setup`           | Full setup (install, build, symlink hooks) |
| `npm run configure`       | Configure Claude Code hooks                |
| `npm run start:server`    | Start the Jacques server                   |
| `npm run start:dashboard` | Start the terminal dashboard               |
| `npm run status`          | Quick status check (one-shot)              |
| `npm test`                | Run tests                                  |
| `npm run build:all`       | Rebuild everything                         |

## Dashboard

```
╔═══════════════════════════════════════════════════════╗
║         JACQUES - Claude Code Context Monitor          ║
╠═══════════════════════════════════════════════════════╣
║ ● Connected                                            ║
╠═══════════════════════════════════════════════════════╣
║                                                        ║
║  Active Session: Implementing auth feature             ║
║  Model: Opus ⚡ working                                ║
║  Project: my-project                                   ║
║                                                        ║
║  Context Used: 42.5%                                   ║
║  ████████████░░░░░░░░░░░░░░░░░░ 85k / 200k            ║
║                                                        ║
║  Last activity: 2s ago                                 ║
║                                                        ║
╠═══════════════════════════════════════════════════════╣
║ Sessions (2)                                           ║
║                                                        ║
║ ▶ ⚡ Implementing auth feature              ctx:42%    ║
║   💤 Bug fix for API                        ctx:15%    ║
║                                                        ║
╠═══════════════════════════════════════════════════════╣
║ [q] Quit  [r] Refresh                                  ║
╚═══════════════════════════════════════════════════════╝
```

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│  Claude Code                                             │
│  ├── statusLine → displays context in status bar         │
│  └── hooks → report session lifecycle events             │
└───────────────────┬─────────────────────────────────────┘
                    │ Unix Socket (/tmp/jacques.sock)
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Jacques Server                                          │
│  ├── Receives hook events & context updates              │
│  ├── Tracks all active sessions                          │
│  └── Broadcasts to dashboard clients                     │
└───────────────────┬─────────────────────────────────────┘
                    │ WebSocket (ws://localhost:4242)
                    ▼
┌─────────────────────────────────────────────────────────┐
│  Dashboard                                               │
│  └── Displays real-time context usage                    │
└─────────────────────────────────────────────────────────┘
```

### Hooks

Jacques uses Claude Code's hook system to track sessions:

| Hook           | Purpose                                |
| -------------- | -------------------------------------- |
| `SessionStart` | Register new session, capture metadata |
| `PostToolUse`  | Track activity, update focus           |
| `Stop`         | Mark session as idle                   |
| `SessionEnd`   | Unregister session                     |
| `statusLine`   | Display context % in Claude Code       |

## Manual Configuration

If you prefer to configure Claude Code manually, add this to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.jacques/hooks/statusline.sh"
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.jacques/hooks/jacques-register-session.py"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.jacques/hooks/jacques-report-activity.py"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.jacques/hooks/jacques-session-idle.py"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.jacques/hooks/jacques-unregister-session.py"
          }
        ]
      }
    ]
  }
}
```

## Requirements

- **Node.js 18+**
- **Python 3.x**
- **jq** - For JSON parsing in statusLine (`brew install jq`)
- **nc** (netcat) - For socket communication (usually pre-installed)

## Project Structure

```
jacques-context-manager/
├── server/                    # Jacques server
│   └── src/
│       ├── types.ts           # TypeScript interfaces
│       ├── session-registry.ts # Session state management
│       ├── unix-socket.ts     # Unix socket listener
│       ├── websocket.ts       # WebSocket broadcaster
│       └── server.ts          # Main entry point
├── dashboard/                 # Terminal dashboard
│   └── src/
│       ├── types.ts           # Client types
│       ├── websocket-client.ts # Server connection
│       ├── display.ts         # Terminal rendering
│       └── cli.ts             # CLI entry point
├── hooks/                     # Claude Code hooks
│   ├── statusline.sh          # Context display
│   ├── jacques-register-session.py
│   ├── jacques-report-activity.py
│   ├── jacques-session-idle.py
│   └── jacques-unregister-session.py
└── scripts/                   # Setup & config scripts
    ├── setup.js               # Full setup script
    └── configure-claude.js    # Claude Code configuration
```

## Troubleshooting

### Server won't start

```bash
# Check if another instance is running
pgrep -f "jacques.*server"

# Check if socket exists and remove if stale
ls -la /tmp/jacques.sock
rm /tmp/jacques.sock

# Check if port is in use
lsof -i :4242
```

### Dashboard shows "Disconnected"

1. Make sure the server is running: `npm run start:server`
2. Check server logs for errors
3. Verify WebSocket port is not blocked

### Hooks not firing

```bash
# Verify hooks are executable
ls -la ~/.jacques/hooks/

# Test hook manually
echo '{"session_id":"test","cwd":"/tmp"}' | python3 ~/.jacques/hooks/jacques-register-session.py

# Check Claude Code settings
cat ~/.claude/settings.json | jq '.hooks'
```

### StatusLine not showing

```bash
# Test statusLine script
echo '{"session_id":"test","context_window":{"used_percentage":42.5},"model":{"display_name":"Opus"}}' | ~/.jacques/hooks/statusline.sh

# Check jq is installed
which jq || brew install jq
```

## Development

```bash
# Server development (auto-rebuild on changes)
npm run dev:server

# Dashboard development (auto-rebuild)
npm run dev:dashboard

# Run tests
npm test
```

## License

MIT
