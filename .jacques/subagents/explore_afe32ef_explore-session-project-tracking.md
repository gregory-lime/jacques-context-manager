# Explore: Explore session & project tracking

> Session: `77d3dc6b-a84d-4db0-8d39-6031292c9f61`
> Date: 2026-02-04
> Tokens: ~69 717

---

Perfect! Now I have all the information I need. Let me create a comprehensive report.

## Comprehensive Report: Sessions and Project Tracking in Jacques

Based on my thorough exploration of the codebase, here's how sessions and projects are currently tracked:

### 1. **Session Storage & Fields**

Each **Session** object (defined in `server/src/types.ts`, lines 109-146) contains:

| Field | Type | Purpose |
|-------|------|---------|
| `session_id` | string | Unique identifier from the AI tool (Claude Code or Cursor) |
| `source` | SessionSource | Identifies which tool: `'claude_code'` or `'cursor'` |
| `session_title` | string \| null | Human-readable title extracted from transcript |
| `transcript_path` | string \| null | Path to Claude Code JSONL transcript file |
| `cwd` | string | Current working directory |
| `project` | string | Project name (basename of project path) |
| `workspace` | WorkspaceInfo \| null | `{ current_dir, project_dir }` structure |
| `model` | ModelInfo \| null | Model ID and display name |
| `terminal` | TerminalIdentity \| null | Terminal environment details (TTY, iTerm ID, Kitty ID, etc.) |
| `terminal_key` | string | **Unique terminal identifier** (ITERM:UUID, KITTY:ID, TTY:path, PID:pid) |
| `status` | 'active' \| 'working' \| 'idle' | Current state |
| `last_activity` | number | Unix timestamp of most recent activity |
| `registered_at` | number | When session was registered |
| `context_metrics` | ContextMetrics \| null | Token usage percentage, limits |
| `autocompact` | AutoCompactStatus \| null | Auto-compact settings from Claude Code |
| `git_branch` | string \| null | Current git branch name |
| `git_worktree` | string \| null | **Git worktree name** (if in a worktree) |

### 2. **How Sessions Are Indexed**

**Sessions are indexed by `session_id` (a Map in SessionRegistry)** — NOT grouped by project at the registry level. All sessions are flat, indexed only by their unique ID.

```typescript
// From session-registry.ts line 41
private sessions = new Map<string, Session>();
```

### 3. **Project Identity Determination**

Project identity is determined through a **priority-based hierarchy**:

**For determining the project name** (`session.project` field):
1. Use **basename** of `workspace.project_dir` (if provided)
2. Otherwise use **basename** of `cwd`
3. Fallback to 'Unknown'

```typescript
// From session-registry.ts lines 248-250
const projectName = event.project_dir.split('/').filter(Boolean).pop();
if (projectName) {
  session.project = projectName;
}
```

**For "workspace" info** (full path):
- Store in `workspace.project_dir` when available
- This distinguishes between `cwd` (current_dir) and the actual project root

### 4. **Data Flow: How Project Info Enters the System**

**From Claude Code hooks** (`jacques-register-session.py`):
- Extracts from `workspace.project_dir` in input JSON (lines 189-191)
- Falls back to `cwd` if no workspace provided
- Both are sent to the server in the registration payload (line 219)

**From Cursor hooks** (CursorAdapter):
- Uses `workspace_roots[0]` as project_dir (line 60 of cursor.py)
- `workspace_roots` is an array of open workspace paths

**From statusline.sh** (real-time context updates):
- Reads `workspace.project_dir` from Claude Code's statusLine JSON (line 40)
- Falls back to `cwd`
- Sends both in context_update event (lines 208-209 of types.ts)

### 5. **How Git Worktrees Are Detected**

The system **detects worktrees using git commands** (documented in base.py lines 368-402):

**Detection logic**:
```bash
git_dir=$(git -C "$project_dir" rev-parse --git-dir 2>/dev/null)
git_common_dir=$(git -C "$project_dir" rev-parse --git-common-dir 2>/dev/null)
# If git-dir differs from git-common-dir, it's a worktree
if [ "$git_git_dir" != "$git_common_dir" ]; then
  git_worktree=$(basename "$project_dir")
fi
```

**Key insight**: When you have a git worktree, the `--git-dir` points to the worktree-specific location (`.git/worktrees/name`), while `--git-common-dir` points to the shared repository root's `.git`. This difference is how worktrees are identified.

**Storage in session**:
- `session.git_branch` = Current branch name (from `git rev-parse --abbrev-ref HEAD`)
- `session.git_worktree` = **Basename of the worktree directory** (e.g., "feature-branch" if the worktree dir is `/path/to/feature-branch`)

### 6. **Session Registry Operations**

The **SessionRegistry** (`server/src/session-registry.ts`):

- **Stores all sessions in a flat Map** indexed by `session_id`
- **Auto-registers** sessions if a context_update event arrives before session_start (line 163)
- **Updates** sessions through events (registerSession, updateActivity, updateContext, setSessionIdle, unregisterSession)
- **Auto-focuses** the most recent session (by `last_activity` timestamp)
- **Focus shifting**: When a focused session is removed, focus automatically shifts to the session with most recent remaining activity (lines 333-339)

### 7. **Terminal Identity & Focus Detection**

**Terminal keys** are built using a priority system (lines 118-131 of base.py):
1. iTerm session ID → `ITERM:{sessionid}`
2. Kitty window ID → `KITTY:{id}`
3. WezTerm pane → `WEZTERM:{pane}`
4. TTY → `TTY:{ttypath}`
5. Process ID → `PID:{pid}`

**Use case**: Terminal keys enable matching sessions across restarts when the same terminal window reconnects. This is particularly important for iTerm's UUID, which persists across shell sessions in the same iTerm session.

### 8. **Critical Distinction: project.cwd vs. project.project_dir**

These are **different paths** with different purposes:

| Field | Meaning | Example |
|-------|---------|---------|
| `cwd` | Current working directory at session start | `/Users/gole/my-repo/src/components` |
| `workspace.project_dir` | Detected project root (via Claude Code or Cursor workspace settings) | `/Users/gole/my-repo` |
| `project` name | Basename of project_dir (or cwd if no project_dir) | `my-repo` |

**Problem with git worktrees**:
- Two worktrees of the same repo have **different `cwd` paths** but share the same `.git` repository
- **Currently, they would be treated as separate projects** because the project name is derived from the basename of the path
- They would NOT auto-group together since there's no project-path canonicalization

### 9. **Current Limitations**

1. **No project canonicalization**: Two worktrees of the same repo are treated as separate projects
2. **No git root detection**: The system doesn't try to find the common git root to identify shared repos
3. **Project grouping only at UI level**: The HTTP API has `getSessionsByProject()` (line 30 of http-api.ts), but it's not used by the registry for storage
4. **Session storage is flat**: Only indexed by session_id, no built-in project grouping in SessionRegistry

### 10. **How to Identify Shared Projects (Git Worktrees)**

To identify that two sessions are in the same git repository despite different paths, you would need to:

1. **Compare `git_common_dir`** output from both sessions
2. Or **canonicalize paths** by resolving symlinks and finding the git root
3. Store a **canonical git root** field alongside `git_branch` and `git_worktree`

Currently, this is NOT stored in session objects.

---

**Summary**: Sessions are uniquely identified by `session_id` and indexed flat in a Map. Project identity is determined by the basename of `workspace.project_dir` or `cwd`. Git worktrees are detected and stored as `git_worktree` field, but there's **no built-in mechanism to group worktrees of the same repo together** — they appear as separate projects unless the user has explicitly set up their paths to have the same basename.