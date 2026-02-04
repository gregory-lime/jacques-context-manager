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

**Current Status**: Phases 1-4, 6-12 complete. Phase 5 (context breakdown) pending.

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
cd server && npm test                                           # Run all server tests
cd core && npm test                                             # Run core tests
cd dashboard && npm test                                        # Run dashboard tests
cd hooks && python3 -m pytest adapters/test_*.py                # Run hook adapter tests
```

**Important**: Tests use `--experimental-vm-modules` because the codebase uses ES modules (`"type": "module"`).

**Test Organization**:
- `server/src/*.test.ts`: Server component tests
- `core/src/**/*.test.ts`: Core module tests (plan-extractor, catalog)
- `dashboard/src/**/*.test.ts`: Dashboard tests (sources, context, archive)
- `hooks/adapters/test_*.py`: Hook adapter tests
- Tests use mock data, no actual AI tool sessions required

## Architecture

```
Claude Code/Cursor
    ↓ (hooks via Unix socket /tmp/jacques.sock)
Jacques Server (Node.js + TypeScript)
    ↓ (WebSocket on port 4242)
Dashboard (Ink/React CLI)
```

- **Server** (`server/src/`): Unix socket listener, session registry, WebSocket broadcaster, HTTP API
- **Core** (`core/src/`): Shared business logic — archive, catalog, context indexing, session parsing, handoff generation
- **Dashboard** (`dashboard/src/`): Ink/React TUI with components, archive UI, context management
- **Hooks** (`hooks/`): Python/Bash scripts that send events from Claude Code/Cursor to the server
- **GUI** (`gui/`): Web-based GUI (Electron/React) for browsing sessions, plans, and subagents

**Build order**: Core → Server → Dashboard (each depends on the previous)

## TypeScript Configuration

- **Target**: ES2022
- **Module**: NodeNext (ES modules with `.js` extensions in imports)
- **All imports must use `.js` extension** even for `.ts` files (e.g., `import { foo } from './types.js'`)
- Output directory: `dist/`
- Source maps and declarations enabled

## File Organization

```
jacques-context-manager/
├── core/src/            # Shared business logic (TypeScript)
│   ├── archive/         # Cross-project search and archiving
│   ├── cache/           # Lightweight session indexing
│   ├── catalog/         # Catalog extraction (pre-extract JSONL → .jacques/)
│   ├── context/         # Project knowledge management (index.json)
│   ├── handoff/         # Session handoff generation
│   ├── session/         # JSONL parsing, filtering, transformation
│   └── sources/         # External source adapters (Obsidian, etc.)
├── server/src/          # Node.js server (TypeScript)
├── server/src/mcp/      # MCP server for archive search
├── dashboard/src/       # Terminal dashboard (Ink/React)
│   ├── archive/         # Conversation archive & search
│   ├── components/      # React/Ink UI components
│   ├── sources/         # External source adapters (Obsidian, etc.)
│   ├── context/         # Context file management
│   ├── session/         # Session parsing and transformation
│   ├── storage/         # File I/O utilities
│   └── templates/       # Skill templates
├── gui/                 # Web-based GUI (Electron/React)
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

## Common Operations

Before exploring source code, read the relevant `docs/` file listed below. The docs contain architecture, key files, data flows, and API endpoints for each component.

| Task | Read first | Then |
|------|-----------|------|
| Work on catalog extraction | `docs/CORE.md` (Catalog Module section) | `core/src/catalog/` |
| Work on server API | `docs/SERVER.md` (HTTP API section) | `server/src/http-api.ts` |
| Work on CLI dashboard | `docs/DASHBOARD.md` | `dashboard/src/components/` |
| Work on web GUI | `docs/GUI.md` | `gui/src/` |
| Work on hooks | `docs/HOOKS.md` | `hooks/` |
| Parse JSONL transcripts | `docs/JSONL-FORMAT.md` | `core/src/session/` |
| Work on plans/dedup | `docs/CORE.md` (Plan Identity section) | `core/src/catalog/extractor.ts`, `core/src/archive/plan-cataloger.ts` |
| Work on archive/search | `docs/CORE.md` (Archive Module section) | `core/src/archive/` |
| Debug unexpected behavior | `docs/PITFALLS.md` | Relevant source files |
| Build and test everything | Use commands in Key Commands above | `cd core && npx tsc && cd ../server && npx tsc && cd ../dashboard && npx tsc` |
| Re-extract all catalogs | Start server, then `curl -X POST http://localhost:4243/api/catalog/extract -H 'Content-Type: application/json' -d '{"force": true}'` | Or use dashboard Settings → Re-extract All |

## Detailed Documentation

Architecture docs by component (read when working on that component):

- `docs/CORE.md` — Core package modules: session parsing, archive, catalog, context, handoff
- `docs/SERVER.md` — Server: session registry, event flow, HTTP API, WebSocket, MCP
- `docs/DASHBOARD.md` — CLI TUI: Ink components, keyboard shortcuts, views
- `docs/GUI.md` — Web GUI: React pages, API client, plan loading flow
- `docs/HOOKS.md` — Hook scripts: adapters, field mappings, token estimation

Reference docs (read when working on specific problems):

- `docs/JSONL-FORMAT.md` — Claude Code JSONL entry types, structures, token data
- `docs/PHASES.md` — Development phase history and progress tracking
- `docs/PITFALLS.md` — Common pitfalls, known bugs, and lessons learned
