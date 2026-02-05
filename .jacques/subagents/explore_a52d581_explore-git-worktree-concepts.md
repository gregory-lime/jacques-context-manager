# Explore: Explore Git worktree concepts

> Session: `149fd300-5b16-4c88-8f85-e2ce16aa781f`
> Date: 2026-02-03
> Tokens: ~68 817

---

Perfect! Now I have enough information. Let me create a comprehensive exploration report. Since this is a read-only task in plan mode, I'll compile my findings into a thorough analysis document.

## Jacques Context Manager - Git Branch & Worktree Integration Exploration

Based on my thorough exploration of the jacques-context-manager codebase, I've mapped the complete data flow for session information and identified the optimal integration points for adding git branch and worktree detection. Here's my comprehensive analysis:

### 1. Current Session Representation

**Type Definition** (`server/src/types.ts` - lines 109-142):

The `Session` interface currently contains:
- `session_id`: Unique session identifier
- `source`: 'claude_code' | 'cursor' | string
- `cwd`: Current working directory
- `project`: Project name (basename of cwd)
- `workspace`: WorkspaceInfo (project_dir)
- `terminal`: TerminalIdentity (TTY, process ID, terminal emulator detection)
- `terminal_key`: Unique terminal identifier for focus detection
- `context_metrics`: Token usage
- `status`: 'active' | 'working' | 'idle'
- Plus model, transcript, and autocompact info

**Notable absence**: No git-related fields currently exist in the Session type, though `gitBranch` is already planned in the transformer types.

### 2. Data Flow: Hooks → Server → Dashboard

**Hook-to-Server Pipeline**:

1. **Claude Code Hooks** (`hooks/claude-code/`):
   - `register-session.py` → SessionStart event
   - `statusline.sh` → ContextUpdate events (runs in real-time)
   - `report-activity.py` → Activity events
   - `session-idle.py` → Idle events
   - `unregister-session.py` → SessionEnd events

2. **Adapter Pattern** (`hooks/adapters/base.py`):
   - `ClaudeCodeAdapter.build_session_start_payload()` extracts project info via `extract_project_info()`
   - This function determines project name and path from workspace or cwd
   - All adapters use `build_base_payload()` to add timestamp, source, session_id

3. **Unix Socket → Server** (`server/src/unix-socket.ts`):
   - Listens on `/tmp/jacques.sock`
   - Receives newline-delimited JSON events from hooks
   - Parses and dispatches to SessionRegistry

4. **SessionRegistry** (`server/src/session-registry.ts`):
   - `registerSession()` creates Session objects from SessionStartEvent
   - `updateContext()` and `updateActivity()` update existing sessions with latest data
   - Automatically focuses most recently active session
   - **Lines 60-99 show the session creation logic**

5. **WebSocket Broadcast** (`server/src/websocket.ts`):
   - Broadcasts `SessionUpdateMessage` to all connected dashboard/GUI clients
   - Real-time updates as context changes

6. **Dashboard Display**:
   - `dashboard/src/components/Dashboard.tsx` receives sessions via WebSocket
   - `CompactPanel.tsx` displays current session info
   - `ProjectDashboardView.tsx` aggregates project-level stats

### 3. Existing Git/Worktree Awareness

**Pre-existing git branch field** found in `dashboard/src/session/transformer.ts` (line 35):

```typescript
export interface SessionInfo {
  id: string;
  gitBranch?: string;
  workingDirectory?: string;
  // ... other fields
}

export interface TransformOptions {
  gitBranch?: string;  // Line 111 - already planned parameter
}
```

This shows the feature was planned but **not yet implemented**. The field exists in the saved context transformer but is never populated.

**Documentation reference** (`docs/parallel-claude-code-workflow.md`):
- Extensive guidance on using git worktrees for parallel Claude Code sessions
- Mentions that Jacques should track git information for users working with worktrees
- No implementation exists yet

### 4. Optimal Integration Points for Git Branch Detection

**Four strategic injection points** (in order of upstream to downstream):

#### A. **Hook Level** (Earliest - Most Efficient)
**File**: `hooks/adapters/base.py` → `extract_project_info()`

**Current code** (lines 202-225):
```python
def extract_project_info(self, input_data: dict) -> dict:
    project_path = self.get_project_path(input_data) or ''
    cwd = input_data.get('cwd', os.getcwd())
    if project_path:
        project_name = os.path.basename(project_path)
    # ...
    return {
        'project': project_name,
        'project_path': project_path,
        'cwd': cwd,
    }
```

**Integration point**: Add git detection here:
- Detect if `project_path` or `cwd` is a git repository
- Extract current branch via `git rev-parse --abbrev-ref HEAD`
- Detect if in git worktree via `git worktree list` parsing
- Return additional fields: `git_branch`, `git_worktree_path`, `git_worktree_id`

**Advantages**:
- Runs only at SessionStart (once per session, not on every activity)
- Minimal overhead
- Data flows naturally through existing payload structure
- Easy to add as optional fields that don't break backward compatibility

#### B. **Event Payload Level**
**File**: `server/src/types.ts` → SessionStartEvent

**Current structure** (lines 162-175):
```typescript
export interface SessionStartEvent extends BaseEvent {
  event: 'session_start';
  session_title: string | null;
  transcript_path: string | null;
  cwd: string;
  project: string;
  // ... other fields
}
```

**Integration point**: Add optional fields:
```typescript
git_branch?: string;
git_worktree?: string;
git_worktree_path?: string;
```

#### C. **Session Type** (Primary Data Model)
**File**: `server/src/types.ts` → Session interface

**Current structure** (lines 109-142) - missing git fields

**Integration point**: Add:
```typescript
git_branch?: string | null;
git_worktree?: {
  path: string;
  branch: string;
  id: string;  // Unique worktree identifier
} | null;
```

**Cascade effect**:
- Automatically flows to `SessionUpdateMessage` (line 256)
- Updated on every session update
- Available to all WebSocket clients

#### D. **Display Layer** (Dashboard/GUI)
**Files**:
- `dashboard/src/components/CompactPanel.tsx` - Shows current session info (could display branch as badge)
- `gui/src/components/SessionList.tsx` - Session list display
- `gui/src/types.ts` - Session type mirror for browser
- `dashboard/src/session/transformer.ts` - Already has `gitBranch` field (line 35) but never populated

**Integration point**: Display git info:
- Show branch name as badge in session header
- Show worktree indicator
- Filter/group sessions by branch in project dashboard

### 5. Multi-Source Compatibility

**Claude Code** (`hooks/adapters/claude_code.py`):
- Input has `workspace.project_dir` (reliable project root)
- Can reliably detect git branch from SessionStart hook

**Cursor** (`hooks/adapters/cursor.py`):
- Input has `workspace_roots[]` (first element is project)
- Can reliably detect git branch from SessionStart hook

**Both sources**: Git detection works identically since both provide a `cwd` or `project_dir` that's within the git repository.

### 6. Key Implementation Considerations

**When to detect git info**:
- ✅ SessionStart hook (once per session)
- ❌ NOT on every activity (wasteful, git state rarely changes mid-session)
- ✅ Update only if status changes (e.g., user switches branches)

**Fallback behavior**:
- If git operations fail (permission denied, not a repo), gracefully degrade to null
- Session should work fine with `git_branch: null`
- No breaking changes

**Terminal compatibility**:
- Works in any terminal where git is available
- Hooks already use subprocess calls (`os.popen`, `subprocess`)
- Git commands are POSIX-standard

**Performance**:
- `git rev-parse --abbrev-ref HEAD`: ~5-20ms (cached by git)
- `git worktree list`: ~5-10ms (one-time parse)
- Negligible overhead at SessionStart

### 7. Saved Context Integration

**Already partially implemented** in `dashboard/src/session/transformer.ts`:

```typescript
export interface TransformOptions {
  gitBranch?: string;  // Parameter exists but never populated
}

export interface SessionInfo {
  gitBranch?: string;  // Field exists but never set
}

// In transformToSavedContext():
session: {
  gitBranch,  // Line 173 - already assigns parameter to output
  // ...
}
```

**Usage in save dialogs**: When users save a session context, it will automatically include git branch info once the hook integration is complete.

### 8. Database/Archive Integration

**Archive system** (`core/src/archive/manifest-extractor.ts`):
- ConversationManifest could include git metadata
- Search functionality could filter by branch
- No changes needed at manifest level (stores what's in session)

**Project cache** (`core/src/cache/session-index.ts`):
- SessionIndex could track git branch per session
- Enables fast lookups like "show all sessions on feature/auth-refactor"

### Summary of Integration Path

```
Hooks (Base Adapter)
  ↓ extract_project_info() + git detection
Session Start Event (types.ts)
  ↓ add git_branch, git_worktree fields
Session Registry (session-registry.ts)
  ↓ registerSession() creates Session with git info
WebSocket Message
  ↓ SessionUpdateMessage broadcasts to clients
Dashboard/GUI
  ↓ Display branch badge + worktree indicator
Transformer (transformer.ts)
  ↓ Save git info to SavedContext JSON
Archive + Search
  ↓ Search conversations by branch
```

### Files Requiring Changes (In Order of Data Flow)

1. **`hooks/adapters/base.py`** - Add git detection helper
2. **`hooks/adapters/claude_code.py`** - Call git detection in payload building
3. **`hooks/adapters/cursor.py`** - Call git detection in payload building
4. **`server/src/types.ts`** - Add git fields to SessionStartEvent, Session, ContextUpdateEvent
5. **`server/src/session-registry.ts`** - Store git info when registering/updating sessions
6. **`gui/src/types.ts`** - Mirror Session type changes for browser
7. **`dashboard/src/session/transformer.ts`** - Already has gitBranch field, no changes needed (unless adding worktree)
8. **`dashboard/src/components/CompactPanel.tsx`** - Display branch info
9. **`gui/src/components/SessionList.tsx`** - Display branch badge

### Testing Points

1. **Unit tests**: Mock git commands in adapters
2. **Integration test**: SessionStart hook with mock git repo
3. **End-to-end test**: Create worktree, start Claude Code, verify branch displays
4. **Graceful degradation**: Test when git is unavailable or repo is not git

This comprehensive exploration reveals that the groundwork for git integration already exists in the codebase, with the `gitBranch` field already planned in the transformer. The implementation path is clear and non-breaking, requiring changes primarily in the hook adapters and type definitions, with straightforward display changes in the UI layer.