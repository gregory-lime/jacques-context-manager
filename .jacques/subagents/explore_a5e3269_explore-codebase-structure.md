# Explore: Explore codebase structure

> Session: `2c4fddda-3739-4251-bbb8-8c837573456c`
> Date: 2026-01-31
> Tokens: ~64 767

---

Perfect! Now I have a comprehensive understanding. Let me compile a thorough exploration report.

## Comprehensive Codebase Exploration Report

### 1. PROJECT OVERVIEW

**Jacques Context Manager** is a comprehensive context tracking and management system for Claude Code (and Cursor) sessions. It monitors AI coding sessions in real-time, tracks context window usage, saves/exports session contexts, and provides multi-session management.

**Key Tagline**: "Real-time token usage monitoring for Claude Code sessions"

---

### 2. OVERALL ARCHITECTURE

The project uses a **monorepo workspace** structure with multiple independently built packages:

```
jacques-context-manager/
├── server/          # Node.js WebSocket + Unix socket server (context monitoring)
├── dashboard/       # CLI terminal UI (React Ink-based)
├── gui/            # Web-based GUI (future component)
├── core/           # Shared business logic (TypeScript library)
├── hooks/          # Claude Code hook scripts (Python adapters)
└── scripts/        # Setup and configuration helpers
```

**Technology Stack**:
- **Server**: Node.js + Express, TypeScript, WebSocket (ws), Unix sockets
- **Dashboard**: React Ink (terminal UI), Commander.js (CLI)
- **Core**: TypeScript library (session parsing, filtering, storage)
- **Hooks**: Python 3 scripts (Claude Code integration points)
- **Dependencies**: tiktoken (token estimation), jq (JSON parsing)

---

### 3. HOW IT CURRENTLY WORKS: ARCHITECTURE FLOW

```
Claude Code Session
    │
    ├─ [SessionStart Hook] → register-session.py
    │   ├─ Extract terminal identity, transcript path
    │   ├─ Parse session title from transcript
    │   └─ Send to server via Unix socket
    │
    ├─ [PostToolUse Hook] → report-activity.py
    │   ├─ Track tool usage
    │   └─ Update focus, send activity event
    │
    ├─ [StatusLine Hook] → statusline.sh
    │   ├─ Display context % in Claude Code status bar
    │   └─ Send context metrics to server
    │
    ├─ [Stop Hook] → session-idle.py
    │   └─ Mark session as idle
    │
    └─ [SessionEnd Hook] → unregister-session.py
        └─ Unregister session

                    ↓ Unix Socket (/tmp/jacques.sock)

        ┌─────────────────────────────────┐
        │   Jacques Server                │
        │                                 │
        │  SessionRegistry:               │
        │  - Tracks all active sessions   │
        │  - Manages focus state          │
        │  - Updates context metrics      │
        │  - Watches for handoff files    │
        │                                 │
        │  FocusWatcher:                  │
        │  - Detects terminal focus       │
        │  - Auto-focuses sessions        │
        │                                 │
        │  HandoffWatcher:                │
        │  - Watches for .jacques-handoff │
        │  - Broadcasts file ready events │
        └─────────────────────────────────┘

                    ↓ WebSocket (ws://localhost:4242)

        ┌─────────────────────────────────┐
        │   Dashboard CLI / GUI Clients   │
        │  - Real-time session tracking   │
        │  - Interactive UI               │
        │  - Save/filter contexts         │
        └─────────────────────────────────┘
```

---

### 4. CURRENT CONTEXT SAVING IMPLEMENTATION

Jacques has **already implemented sophisticated context saving** with filtering and token estimation:

#### **A. Context Saving Flow**

1. **Session Parsing** (`core/src/session/`):
   - Parses Claude Code JSONL transcript files
   - Categorizes entries by type (user_message, assistant_message, tool_call, system_event, etc.)
   - Extracts metadata (timestamps, token counts, model info)

2. **Smart Filtering** (`dashboard/src/session/filters.ts`):
   - **4 filter types** with progressive compression:
     - **Everything** (Full context, 0% savings)
     - **Without Thinking** (excludes extended thinking blocks, ~30-40% savings)
     - **Without MCP** (excludes tool calls/hooks, ~20-50% savings)
     - **Conversation Only** (user + assistant messages only, ~50-75% savings)

3. **Token Estimation** (`dashboard/src/session/token-estimator.ts`):
   - Uses **tiktoken** (cl100k_base encoding, same as Claude)
   - ~95% accuracy vs actual Claude token counts
   - Graceful fallback to character-based estimation

4. **Storage** (`core/src/storage/writer.ts`):
   - Saves as JSON files with metadata (contextGuardian wrapper)
   - Filename format: `{date}_{sessionId}_{filterSuffix}_{label}.json`
   - Examples: `2026-01-30_abc12345_no-thinking_bugfix.json`

5. **SavedContext Format** (`core/src/session/transformer.ts`):
   ```json
   {
     "contextGuardian": {
       "version": "1.0.0",
       "savedAt": "ISO8601",
       "sourceFile": "path/to/transcript.jsonl",
       "filterApplied": "no_thinking"
     },
     "session": {
       "id": "session-id",
       "slug": "human-readable-name",
       "startedAt": "ISO8601",
       "model": "claude-opus-4-5",
       "workingDirectory": "/path/to/project"
     },
     "statistics": {
       "totalEntries": 150,
       "userMessages": 20,
       "assistantMessages": 20,
       "tokens": { "totalInput": 15000, "totalOutput": 8500 }
     },
     "conversation": [ /* DisplayMessage array */ ]
   }
   ```

#### **B. Dashboard UI for Saving**

The dashboard (`dashboard/src/components/`) includes:
- **FilterSelectionView**: Interactive menu showing all 4 filters with real-time token estimates
- **Keyboard navigation**: Arrow keys to select, Enter to confirm, ESC to cancel
- **Preview screen**: Shows what will be saved before confirmation
- **Label support**: Optional user-provided label for context

---

### 5. HANDOFF/EXPORT FUNCTIONALITY (PARTIALLY IMPLEMENTED)

The codebase **already has infrastructure for "session handoff"**:

#### **A. Handoff File Watching**

In `server/src/server.ts`:
```typescript
- startHandoffWatcher(projectDir, sessionId)
  - Watches for `.jacques-handoff.md` file in project directory
  - Broadcasts "handoff_ready" event when file is created/exists
  - Used to signal context is ready for export

- stopHandoffWatcher(projectDir)
  - Cleans up watcher when session ends
```

#### **B. Handoff Message Type**

In `server/src/types.ts`:
```typescript
export interface HandoffReadyMessage {
  type: 'handoff_ready';
  session_id: string;
  path: string;
}
```

#### **C. Client Message Support**

In `server/src/types.ts`:
```typescript
export interface TriggerActionRequest {
  type: 'trigger_action';
  session_id: string;
  action: 'smart_compact' | 'new_session' | 'save_snapshot';
  options?: Record<string, unknown>;
}
```

**Current limitation**: These are defined but not yet fully implemented in the handler.

---

### 6. FILE TYPES AND PATTERNS

#### **A. Session Transcript Format (JSONL)**

Claude Code stores sessions as **line-delimited JSON** (~/.claude/sessions/):
```jsonl
{"type":"human","message":{"role":"user","content":"..."}}
{"type":"assistant","message":{"role":"assistant","content":"...","model":"claude-opus-4-5"}}
{"type":"tool_call","tool_name":"SearchTool","input":{...}}
{"type":"tool_result","result":"..."}
{"type":"summary","summary":"Session summary text"}
```

#### **B. Saved Context Format (JSON)**

Single JSON file with complete SavedContext structure (wrapped in contextGuardian metadata).

#### **C. Configuration Files**

- `~/.claude/settings.json`: Claude Code configuration, hooks, autoCompact settings
- `~/.jacques/index.json`: Context index (saved in `.jacques/` directory)
- `.jacques/context/`: Directory storing saved contexts
- `.jacques/sessions/`: Session transcript archives

---

### 7. MAIN ENTRY POINTS

#### **A. Server**
- **Path**: `server/src/server.ts`
- **Start Command**: `npm run start:server`
- **Listens On**:
  - Unix socket: `/tmp/jacques.sock` (hooks send events here)
  - WebSocket: `ws://localhost:4242` (dashboard clients connect)
- **Main Class**: `SessionRegistry` (manages all sessions)

#### **B. Dashboard CLI**
- **Path**: `dashboard/src/cli.ts`
- **Start Command**: `npm run start:dashboard`
- **Component**: React Ink-based terminal UI
- **Main Class**: `JacquesClient` (WebSocket connection to server)

#### **C. Hooks (Claude Code Integration)**
- **Python Scripts** in `hooks/`:
  - `jacques-register-session.py`: SessionStart
  - `jacques-report-activity.py`: PostToolUse
  - `jacques-session-idle.py`: Stop
  - `jacques-unregister-session.py`: SessionEnd
  - `statusline.sh`: StatusLine (bash wrapper calling hooks)

#### **D. Setup/Configuration**
- **Path**: `scripts/setup.js`, `scripts/configure-claude.js`
- **Purpose**: Install hooks into Claude Code, configure settings.json

---

### 8. EXISTING PLAN-RELATED FUNCTIONALITY

#### **A. Plan Archiving** (`core/src/archive/manifest-extractor.ts`)

The codebase already supports **plan detection and archiving**:
- Detects `.claude/plans/` directory
- Extracts plan metadata and references
- Searches and indexes plans globally
- Saves plan manifests

```typescript
export function detectPlans(): PlanReference[]
export function readPlanContent(planPath: string): string
export function archivePlan(planPath: string): Promise<void>
```

#### **B. Conversation Archiving** (`core/src/archive/`)

- `saveConversation()`: Save session to archive
- `readConversation()`: Load archived session
- `archiveConversation()`: Archive with metadata
- `searchConversations()`: Full-text search across archives

#### **C. Cross-Project Search** (`core/src/archive/search-indexer.ts`)

- Tokenizes text for search
- Creates searchable index of conversations
- Supports keyword extraction from paths and fields
- Global and local archive indexes

---

### 9. SESSION HANDOFF - PROPOSED ARCHITECTURE

Based on the existing infrastructure, here's what "session handoff" should enable:

#### **Goal**: Export current session context to start a fresh chat in new session

#### **Expected Flow**:

```
User wants to handoff current session
    ↓
[Dashboard] "Handoff to New Session" button
    ↓
Generates compressed context (SavedContext JSON)
    ↓
Creates .jacques-handoff.md in project root
    ↓
Broadcasts handoff_ready event
    ↓
User starts new Claude Code session
    ↓
New session reads .jacques-handoff.md
    ↓
Claude loads context automatically
    ↓
Conversation continues fresh
```

#### **What Needs to Be Implemented**:

1. **Handoff Generator** (new module):
   - Read current session
   - Apply compression filter (conversation-only default)
   - Generate markdown prompt with context
   - Write `.jacques-handoff.md`

2. **New Dashboard Action**:
   - Add "Handoff to New Session" menu option
   - Trigger handoff generation
   - Show confirmation with file path

3. **Bootstrap Hook** (new Python script):
   - New Claude Code SessionStart hook
   - Detects `.jacques-handoff.md`
   - Reads and injects context into first message
   - Cleans up handoff file after injection

4. **Handoff File Format** (`.jacques-handoff.md`):
   ```markdown
   # Handoff: [Project Name]
   
   **Session**: [Previous Session ID]
   **Date**: ISO timestamp
   **Filter**: Conversation Only
   
   ## Context
   
   [Actual SavedContext embedded as JSON or prose]
   
   ## Instructions for Claude
   
   > Continue the conversation from this context...
   ```

---

### 10. KEY ARCHITECTURE DECISIONS IN CODEBASE

1. **Unix Socket for Hooks**: Low-latency, file-based (no network stack overhead)
2. **WebSocket for Dashboard**: Persistent connection, real-time updates
3. **SessionRegistry Pattern**: Single source of truth for session state
4. **Graceful Degradation**: Hooks write to fallback files if server unavailable
5. **Terminal Identity Tracking**: Multiple terminal emulator support (iTerm, Kitty, WezTerm, etc.)
6. **Tiktoken Integration**: Accurate token counting matching Claude's encoding
7. **Workspace Awareness**: Tracks project_dir vs cwd for accurate project identification

---

### 11. CURRENT STATE SUMMARY

| Component | Status | Details |
|-----------|--------|---------|
| **Real-time Monitoring** | ✅ Complete | Server + hooks + dashboard fully working |
| **Context Saving** | ✅ Complete | 4 filter options, token estimation, metadata |
| **Session Management** | ✅ Complete | Multi-session tracking, focus detection |
| **Handoff Infrastructure** | ⚠️ Partial | File watching in place, action handler stubbed |
| **Plan Archiving** | ✅ Complete | Detection, indexing, search implemented |
| **Conversation Archiving** | ✅ Complete | Save/load with full-text search |
| **Dashboard UI** | ✅ Complete | Terminal-based monitoring + save flows |
| **Session Handoff Feature** | ❌ Not Implemented | Ready for implementation |

---

### 12. CRITICAL FILES FOR SESSION HANDOFF IMPLEMENTATION

**Core Architecture**:
- `/server/src/server.ts` - Main server, handoff watcher stubs
- `/server/src/types.ts` - Message types (already has HandoffReadyMessage)
- `/core/src/session/transformer.ts` - Context serialization
- `/core/src/storage/writer.ts` - File I/O

**For Handoff Implementation**:
- `/dashboard/src/components/` - Add handoff action button
- `/hooks/` - Create new `jakarta-handoff-bootstrap.py` or similar
- `/core/src/` - Add new `handoff/` module for generation logic

---

This comprehensive exploration shows that **Jacques already has substantial context management capabilities**. The "session handoff" feature would be a natural extension that leverages existing infrastructure (handoff file watching, action triggering system, context serialization) to enable seamless context transfer between Claude Code sessions.