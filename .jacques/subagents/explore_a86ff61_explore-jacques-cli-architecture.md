# Explore: Explore Jacques CLI architecture

> Session: `38ceac2d-df45-4064-8a36-488d23eaa7f3`
> Date: 2026-01-31
> Tokens: ~61 588

---

Perfect! Now I have enough information to provide a comprehensive analysis. Let me create a detailed exploration report:

## Jacques CLI Architecture Exploration Report

### 1. Current CLI Entry Point and Structure

**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/cli.ts`

Jacques has a **command-driven CLI** with the following structure:

```
jacques [command] [options]
├── jacques / jacques dashboard    # Interactive TUI (default)
├── jacques status                 # One-shot status snapshot
├── jacques list                   # Sessions as JSON output
├── jacques search <query>         # Archive conversation search
└── jacques archive-stats          # Archive statistics
```

**Key implementation details:**
- Uses **Commander.js** for CLI parsing
- **Ink/React** for interactive TUI rendering
- **WebSocket client** (`JacquesClient`) connects to server on `ws://localhost:4242`
- Alternate screen buffer mode (`\x1b[?1049h/l`) prevents terminal ghosting
- TTY detection - exits gracefully if not in interactive terminal

---

### 2. Claude Code Integration Architecture

Jacques communicates with Claude Code through a **three-layer socket-based architecture**:

#### Layer 1: Hooks (Python/Bash) → Unix Socket
Located in `/Users/gole/Desktop/jacques-context-manager/hooks/`:

**Event sources that trigger handoffs:**
- `statusline.sh` - Real-time context metrics from Claude Code status bar
- `claude-code/register-session.py` - New session registration
- `claude-code/post-tool-use.py` - Tool activity tracking
- `claude-code/session-idle.py` - Idle state tracking
- `claude-code/unregister-session.py` - Session cleanup

**Communication mechanism:**
- Newline-delimited JSON over Unix socket `/tmp/jacques.sock`
- Example from `statusline.sh`:
  ```bash
  session_id=$(echo "$input" | jq -r '.session_id')
  used_pct=$(echo "$input" | jq -r '.context_window.used_percentage')
  # ... Extract transcript_path, model, workspace info
  ```

#### Layer 2: Server (Node.js + TypeScript)
Located in `/Users/gole/Desktop/jacques-context-manager/server/src/`:

**Components:**
- `unix-socket.ts` - Listens on `/tmp/jacques.sock` for hook events
- `session-registry.ts` - Maintains session state indexed by `session_id`
- `websocket.ts` - Broadcasts updates to connected dashboard clients on port 4242
- `server.ts` - Main orchestrator wiring everything together

#### Layer 3: Dashboard (Ink/React)
**Client**: `JacquesClient` in `/Users/gole/Desktop/jacques-context-manager/core/src/client/websocket-client.ts`

**Connection flow:**
```
Dashboard → JacquesClient.connect() 
          → WebSocket('ws://localhost:4242')
          → Receives ServerMessage events
          → Emits to UI (initial_state, session_update, etc.)
```

---

### 3. Existing LLM/API Integration

**Current Status**: **NONE** - No direct LLM API calls exist in Jacques.

**Evidence:**
- `package.json` dependencies: `ws`, `ink`, `react`, `commander`, `@dqbd/tiktoken` - NO anthropic/openai/api packages
- `core/package.json`: Same - no LLM libraries
- Zero references to Claude API, API keys, or HTTP calls in codebase
- Token estimation uses `tiktoken` library locally only

**What currently happens instead:**
1. User presses `h` in dashboard
2. Jacques copies a **prompt template** to clipboard
3. User manually pastes prompt in Claude Code session
4. Claude (in session) generates handoff and writes to `.jacques/handoffs/`
5. Jacques reads and displays the handoff later

This is **prompt-to-clipboard** pattern, not direct API integration.

---

### 4. Handoff System Deep Dive

#### Handoff Module Structure
Located in `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/`:

**Files:**
- `types.ts` - HandoffEntry, HandoffCatalog interfaces
- `catalog.ts` - File listing, token estimation, directory management
- `prompts.ts` - Orchestrator invocation prompt ("Use the handoff-orchestrator...")
- `index.ts` - Module exports

**Key functions:**
```typescript
// Catalog operations
listHandoffs(projectDir) → {directory, entries[]}  // Sorted newest-first
getHandoffContent(path) → string                   // Read file
getLatestHandoff(projectDir) → HandoffEntry | null // Most recent
estimateTokens(content) → number                  // Uses 4.5 chars/token
getHandoffsDir(projectDir) → path                 // .jacques/handoffs/
```

#### Subagent Architecture
Located in `~/.claude/agents/`:

**7 specialized subagent files** that Claude Code knows about:
1. `handoff-orchestrator.md` - Main coordinator (inherited model, has Task tool)
2. `handoff-task-focus.md` - Goal & approach extraction (haiku model, ~200 tokens)
3. `handoff-progress.md` - Task completion status (haiku, ~400 tokens)
4. `handoff-decisions.md` - Key choices made (haiku, ~400 tokens)
5. `handoff-blockers.md` - Bugs and issues (haiku, ~300 tokens)
6. `handoff-next-steps.md` - Prioritized actions (haiku, ~300 tokens)
7. `handoff-warnings.md` - Gotchas and warnings (haiku, ~200 tokens)

**Prompt invocation:**
```typescript
export const HANDOFF_INVOCATION = 
  "Use the handoff-orchestrator to prepare for a new session";
```

#### Dashboard Integration
**File**: `dashboard/src/components/App.tsx` and `HandoffBrowserView.tsx`

**Keyboard shortcuts:**
- `h` - Copy handoff prompt to clipboard (uses `child_process.spawn` with `pbcopy`/`xclip`)
- `H` - Browse existing handoffs with scrollable list

**Menu option**: Fifth button in main menu would be "Generate Handoff"

**State management:**
```typescript
const [handoffEntries, setHandoffEntries] = useState<HandoffEntry[]>([]);
const [handoffSelectedIndex, setHandoffSelectedIndex] = useState<number>(0);
const [handoffScrollOffset, setHandoffScrollOffset] = useState<number>(0);
```

---

### 5. Options for Direct LLM Integration

Based on the current architecture, here are the technical options:

#### **Option A: Direct Claude API (Anthropic SDK)**
**Complexity**: Medium | **Dependencies**: anthropic npm package | **Cost**: API usage charges

**Pros:**
- Complete control over generation
- Can call directly from Jacques CLI without manual user step
- Real-time progress feedback
- Store API key in `~/.jacques/config.json`

**Cons:**
- Requires API key management
- Extra npm dependencies
- API costs
- Can't use Claude Code's extended thinking (different model context)

**Implementation points:**
```typescript
// In dashboard/src/cli.ts or new handoff/generator.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const message = await client.messages.create({
  model: "claude-opus-4-5-20251101",
  max_tokens: 2000,
  system: handoffSystemPrompt,
  messages: [{
    role: "user",
    content: currentSessionContent
  }]
});
```

#### **Option B: MCP Server Integration (Recommended)**
**Complexity**: Low | **Dependencies**: None (uses existing MCP infrastructure) | **Cost**: $0

Jacques **already has an MCP server** at `/Users/gole/Desktop/jacques-context-manager/server/src/mcp/`:

**What exists:**
- `search_conversations` tool already implemented for archive search
- MCP server infrastructure already running
- Can extend with new `generate_handoff` tool

**How it works:**
```
Jacques CLI 
  → Calls MCP server locally
  → MCP server has access to current session context
  → MCP server calls Claude via configured mcpServers in settings.json
  → Returns generated handoff
```

**Advantages:**
- Uses Claude Code's own MCP integration (no separate API key needed)
- Leverages existing infrastructure
- Can access current session via hooks/statusline
- Minimal code additions

#### **Option C: Hook-Based Generation**
**Complexity**: Low-Medium | **Dependencies**: None | **Cost**: $0

Create new hook that Claude Code calls to trigger generation:

```python
# hooks/claude-code/generate-handoff.py
# Called after user types /handoff or similar
# Receives current session context via stdin
# Writes .jacques/handoffs/[timestamp].md
```

**Advantages:**
- Stays within existing hook architecture
- No external dependencies
- Perfect model context (full session in memory)

**Disadvantages:**
- Requires Claude Code hook integration
- Less discoverable from Jacques CLI

---

### 6. Recommended Path Forward

**For direct handoff generation from Jacques CLI without manual steps:**

1. **Use Option B (MCP)** as primary approach:
   - Extend existing MCP server with `generate_handoff` tool
   - Jacques CLI calls MCP server (which can call Claude via settings)
   - Store generated handoff to `.jacques/handoffs/`

2. **Fallback to Option A (Direct API)** for advanced use:
   - Add optional API key support in `~/.jacques/config.json`
   - When configured, use direct Anthropic SDK
   - When not configured, fall back to clipboard + manual paste workflow

3. **Keep clipboard method** as fallback:
   - Current `h` / `H` shortcuts remain functional
   - Users without API key/MCP can still manually paste prompt

---

### 7. Key Files for Reference

**Current Implementation:**
- Entry point: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/cli.ts` (285 lines)
- Client: `/Users/gole/Desktop/jacques-context-manager/core/src/client/websocket-client.ts` (238 lines)
- Handoff catalog: `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/catalog.ts` (140 lines)
- Handoff types: `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/types.ts` (30 lines)
- Prompts: `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/prompts.ts` (24 lines)
- Dashboard app: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/App.tsx` (900+ lines)
- Browser view: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/HandoffBrowserView.tsx`

**Existing Examples:**
- Archive search MCP: `/Users/gole/Desktop/jacques-context-manager/server/src/mcp/`
- Hook communication: `/Users/gole/Desktop/jacques-context-manager/hooks/statusline.sh` (shows JSON socket pattern)
- Session registry: `/Users/gole/Desktop/jacques-context-manager/server/src/session-registry.ts` (state management)

---

### Summary

Jacques **currently relies on user-triggered manual steps** (copy prompt → paste in Claude → handoff generates). To enable **direct generation from Jacques CLI**, you have three clear paths:

1. **MCP integration** (minimal effort, leverages existing infrastructure) ← RECOMMENDED
2. **Direct Anthropic API** (full control, costs money, needs API key management)
3. **Hook-based** (stays within Claude Code integration pattern, works with existing hooks)

The architecture is well-designed for any of these approaches, with strong patterns already in place for configuration management, file I/O, and inter-process communication.