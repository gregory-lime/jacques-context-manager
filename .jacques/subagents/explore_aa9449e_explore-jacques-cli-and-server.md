# Explore: Explore jacques CLI and server

> Session: `65129a93-e45b-4801-99c5-3e75cd390d91`
> Date: 2026-02-04
> Tokens: ~65 748

---

Perfect! Now I have a complete picture. Let me create a comprehensive report of how the jacques command and GUI system work:

## Jacques Command & GUI Architecture Report

### Overview

The `jacques` system has **two distinct user-facing applications**:

1. **Terminal Dashboard** (TUI using Ink/React) - default interactive experience
2. **Web GUI** (React SPA) - served via HTTP API

These run on different technologies and serve different purposes:

---

### The "jacques" Command Flow

When a user types `jacques`:

```
$ jacques
     ↓
npm script → /dashboard/src/cli.ts (Node.js entry point)
     ↓
Checks TTY (requires interactive terminal)
     ↓
Starts embedded server (silent mode)
     ↓
Renders Ink/React App component (TUI)
```

**Files:**
- Root: `package.json` has `"dashboard": "cd dashboard && node dist/cli.js"`
- Entry: `/dashboard/src/cli.ts` (lines 1-373)
- Main TUI component: `/dashboard/src/components/App.tsx`

**Key features:**
- Shows startup animation ("Starting Jacques...")
- Uses alternate screen buffer (`\x1b[?1049h`) to avoid terminal scrolling
- Connects via WebSocket to embedded server on `ws://localhost:4242`
- Handles cleanup on Ctrl+C

---

### Server Architecture (Three Ports)

The server runs **three protocols** on three different ports:

| Port | Protocol | Purpose | Started by |
|------|----------|---------|-----------|
| `/tmp/jacques.sock` | Unix Socket | Hook events from Claude Code | `UnixSocketServer` |
| `4242` | WebSocket | Real-time updates to dashboard | `JacquesWebSocketServer` |
| `4243` | HTTP API | REST endpoints + static GUI files | `createHttpApi()` |

**Server startup flow:**

1. **Standalone**: `npm run start:server` → `/server/src/server.ts`
   - Pre-flight checks (PID file, socket, ports)
   - Starts `startEmbeddedServer()`
   - Writes PID to `~/.jacques/server.pid`

2. **Embedded** (via dashboard): `dashb oard/cli.ts` line 77
   - Calls `startEmbeddedServer({ silent: true })`
   - If server already running, connects to it
   - Same server as standalone, just in silent mode

**Startup sequence** (`/server/src/start-server.ts` lines 410-454):

```
startEmbeddedServer()
  ├→ Create SessionRegistry
  ├→ Start UnixSocketServer → /tmp/jacques.sock
  ├→ Start JacquesWebSocketServer → port 4242
  ├→ Start HTTP API server → port 4243
  ├→ Start terminal focus watcher
  └→ Return EmbeddedServer interface with stop() method
```

---

### HTTP API Server (Port 4243)

**Location:** `/server/src/http-api.ts` (1442 lines)

**Serves two things:**

1. **REST API** for session management, archive, notifications, etc.
   - `/api/sessions/` - List/get sessions
   - `/api/archive/` - Archive search and retrieval
   - `/api/sources/` - Source configuration (Obsidian, Google Docs, Notion)
   - `/api/notifications/` - Notification settings
   - `/api/projects/` - Project plan management

2. **Static GUI files** (SPA routing)
   - Checks for GUI build: `/Users/gole/Desktop/jacques-context-manager/gui/dist/`
   - If missing, shows 503 error page
   - Serves `index.html` for SPA routes (no `.` in URL means it's a route, not a file)

**GUI Detection** (lines 273-277):
```typescript
const GUI_DIST_PATH = join(__dirname, '..', '..', 'gui', 'dist');
const guiAvailable = existsSync(join(GUI_DIST_PATH, 'index.html'));

if (!guiAvailable && !silent) {
  log('[HTTP API] GUI not built. Run: npm run build:gui');
}
```

**Static file serving** (lines 1371-1412):
- Hashed assets (in `/assets/`) get 1-year cache
- HTML gets `no-cache` (revalidates on each load)
- SPA routing: non-existent routes fall back to `index.html`

---

### GUI (React SPA) Architecture

**Build:**
```bash
npm run build:gui
  → tsc && vite build (from gui/package.json)
  → TypeScript compilation + Vite bundling
  → Output: gui/dist/
```

**Runtime:**
- **Entry point:** `gui/src/main.tsx`
  - Renders React app in `<div id="root">` (from `index.html`)
  - Uses BrowserRouter for client-side routing
  
- **Main app:** `gui/src/App.tsx` (35 lines)
  - Routes for Dashboard, Archive, Context, Settings, Sources
  - OAuth callbacks for Google Docs, Notion
  
- **Tech stack:**
  - React 18.3.1
  - React Router DOM 6.22.3
  - Lucide React (icons)
  - React Markdown
  - Vite (build tool)
  - TypeScript 5.7

**API communication:**
- Connects to HTTP API at `http://localhost:4243` (same origin)
- Fetches session data, archive, settings
- Long-running requests use Server-Sent Events (SSE) for progress streaming

---

### Comparison: Dashboard vs GUI

| Aspect | Terminal Dashboard | Web GUI |
|--------|-------------------|---------|
| **Tech** | Ink (React for CLIs) | React 18 SPA |
| **Transport** | WebSocket (4242) | HTTP (4243) |
| **Access** | TTY-only (no pipes/redirects) | Any browser via localhost:4243 |
| **Use case** | Real-time monitoring in terminal | Browse/manage sessions, configure sources |
| **Routes** | Commands (search, list, status) | React Router (/, /archive, /settings, etc.) |
| **Start method** | `jacques` (default) | Visit `http://localhost:4243` in browser |
| **Session display** | Fixed 10-row scrollable list | Scrollable tables, cards |
| **Requires build step** | ✅ tsc (TypeScript compile) | ✅ tsc + vite (with bundling) |

---

### Build & Launch Sequence

**Full build:**
```bash
npm run build:all
  → build:core (core module TypeScript)
  → build:server (server TypeScript → dist/server.js)
  → build:dashboard (dashboard TypeScript → dist/cli.js)
  → build:gui (GUI TypeScript + Vite bundling → dist/)
```

**Start server + dashboard:**
```bash
npm run start:server          # Standalone (port 4242 + 4243)
# OR (more common)
jacques                       # Embedded server + TUI (same ports)
# OR open in browser
http://localhost:4243        # Opens GUI (server must be running)
```

**Development mode:**
```bash
npm run dev:server            # tsc --watch (rebuild on changes)
npm run dev:dashboard         # tsc --watch
npm run dev:gui              # Vite dev server (auto-reload on src/ changes)
```

---

### Key Files Summary

| Path | Purpose | Lines |
|------|---------|-------|
| `package.json` | Root workspace, scripts, CLI entry | 46 |
| `server/src/server.ts` | Standalone server entry, pre-flight checks | 189 |
| `server/src/start-server.ts` | Embeddable server module, orchestrator | 523 |
| `server/src/http-api.ts` | HTTP server, REST API, GUI static files | 1443 |
| `dashboard/src/cli.ts` | Terminal dashboard entry, Ink app | 373 |
| `gui/src/main.tsx` | GUI entry point, React root | 13 |
| `gui/src/App.tsx` | React Router setup, page routes | 35 |
| `gui/index.html` | HTML template with Vite script | 13 |
| `gui/package.json` | GUI build config (Vite + TypeScript) | 27 |

---

### GUI Build Prerequisites

The GUI will not be available until:

1. **TypeScript compiled:**
   ```bash
   npm run build:gui
   ```

2. **Build outputs to:**
   ```
   gui/dist/
   ├── index.html
   ├── assets/
   │   ├── [hash].js
   │   ├── [hash].css
   │   └── ...
   └── ...
   ```

3. **Server checks:**
   ```typescript
   const guiAvailable = existsSync(join(GUI_DIST_PATH, 'index.html'));
   ```

4. **If missing, shows:**
   - 503 error page with build instructions
   - or terminal output: `[HTTP API] GUI not built. Run: npm run build:gui`

---

### Architecture Diagram

```
User Command
    │
    ├─→ "jacques" 
    │       └─→ /dashboard/src/cli.ts
    │           └─→ Starts: startEmbeddedServer({ silent: true })
    │           └─→ Renders: Ink/React TUI
    │           └─→ Uses: WebSocket (port 4242)
    │
    └─→ "npm run start:server"
            └─→ /server/src/server.ts
            └─→ Starts: startEmbeddedServer({ silent: false })
            └─→ Outputs: Console logs
            └─→ Writes: ~/.jacques/server.pid

EmbeddedServer (/server/src/start-server.ts)
    ├─→ UnixSocketServer (/tmp/jacques.sock)
    │   └─→ Receives: Hook events from Claude Code
    │
    ├─→ JacquesWebSocketServer (port 4242)
    │   └─→ Broadcasts: Session updates to dashboard
    │
    ├─→ HTTP API Server (port 4243) (/server/src/http-api.ts)
    │   ├─→ REST endpoints (/api/sessions, /api/archive, etc.)
    │   └─→ Static GUI files (gui/dist/)
    │       └─→ React SPA
    │           └─→ Routes: /, /archive, /context, /settings, /sources
    │           └─→ API: Calls http://localhost:4243/api/*
    │
    └─→ Terminal Focus Watcher (macOS-specific)
        └─→ Monitors: Terminal window focus
        └─→ Updates: Focused session in registry
```

This is the complete architecture for how `jacques` integrates both a real-time terminal dashboard and a modern web GUI, both communicating with the same central server.