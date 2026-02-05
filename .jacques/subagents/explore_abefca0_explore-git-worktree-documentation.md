# Explore: Explore Git worktree documentation

> Session: `149fd300-5b16-4c88-8f85-e2ce16aa781f`
> Date: 2026-02-03
> Tokens: ~31 071

---

Perfect! Now I have a comprehensive understanding of the codebase. Let me provide you with a detailed analysis report.

## Analysis Report: Git Worktree Integration for Jacques

Based on my exploration of the Jacques codebase, documentation, and relevant code, here's what I found:

### 1. **Existing Git Worktree Knowledge**

The project already has excellent documentation about parallel Claude Code workflows with git worktrees:
- **Location**: `/Users/gole/Desktop/jacques-context-manager/docs/parallel-claude-code-workflow.md`
- **Coverage**: Quick start guide, merging strategies, pitfalls, and alternative tools (GitButler, Crystal, ccswitch)
- **Status**: This doc is comprehensive and up-to-date

### 2. **Current Architecture for Tracking Sessions**

The Jacques system currently tracks sessions by:
- **Session ID**: Unique identifier from Claude Code (stored in transcript)
- **Terminal Key**: Terminal environment identity (iTerm session, Kitty window ID, etc.) - this is the PRIMARY differentiator
- **Project Path**: Derived from `cwd` or `workspace.project_dir`

**Key Insight**: Sessions are keyed by `terminal_key` (from the environment), not by git branch/worktree. This means each terminal window gets its own session automatically.

### 3. **Session Type Definition** (from `/server/src/types.ts`)

```typescript
export interface Session {
  session_id: string;          // From Claude Code
  source: SessionSource;        // 'claude_code', 'cursor', etc.
  session_title: string | null; // Auto-extracted from transcript
  terminal_key: string;         // ITERM:..., KITTY:..., etc.
  cwd: string;                  // Current working directory
  project: string;              // Derived from cwd
  status: SessionStatus;         // 'active' | 'working' | 'idle'
  context_metrics: ContextMetrics | null;
  // ... other fields
}
```

**Missing field for worktrees**: No `git_branch` or `git_worktree` information currently captured.

### 4. **Where Branch Detection Could Happen**

The `statusline.sh` hook runs on **every turn** and receives:
- Current working directory (`cwd`)
- Project directory (`project_dir`)
- Session ID from Claude Code
- All context metrics

**Opportunity**: This is the ideal place to detect git branch/worktree changes since it runs frequently and has access to `cwd`.

#### Current statusline.sh Details:
- **Claude Code version** (`/hooks/statusline.sh`): Full-featured, includes session title extraction, terminal identity capture, auto-compact settings
- **Cursor version** (`/hooks/claude-code/statusline.sh`): Simplified version with debugging flags
- **Both versions**: Extract context data but don't capture git branch information

### 5. **Session Display Components**

**SessionsList.tsx** currently displays:
```
[icon] {project} / {terminal_program}    {context_percentage}
```

**Current formatting**: 
- Shows "project name / terminal" (e.g., "jacques-context-manager / iTerm2")
- Limited to 40 chars
- Status icons: 🟢 (focused) or 💤 (idle)

**Missing**: No branch/worktree identifier in the display. This means if you run 3 worktrees of the same project in different terminals, they show identically except for terminal type.

### 6. **CompactPanel Component**

The panel shows context usage warnings and handoff instructions but has no worktree-awareness. It could benefit from branch context to help users understand which branch's context is critical.

### 7. **Hook Event Flow**

Current event flow:
```
statusline.sh → Unix socket → Session Registry → WebSocket → Dashboard
```

**Current data in context_update event**: No git branch information.

### 8. **Key Findings & Recommendations**

**Strengths of current system**:
- Terminal-based session identification already prevents cross-talk between worktrees
- Each terminal gets its own session automatically
- statusline.sh runs frequently (every turn) - good hook point for branch detection

**Limitations for worktree workflows**:
1. **No branch visibility**: Can't see which branch each session is on at a glance
2. **Naming ambiguity**: Multiple worktrees of same project in different terminals appear nearly identical
3. **Context confusion**: When switching between worktrees, no indication that context is tied to a specific branch
4. **Dashboard usability**: Hard to tell which session corresponds to which worktree/branch without manually tracking

**Suggested Implementation Path**:
1. **Extend Session type** to include optional `git_branch` and `git_worktree_name` fields
2. **Enhance statusline.sh** to detect current git branch via `git rev-parse --abbrev-ref HEAD` and pass it via context_update event
3. **Update SessionRegistry** to store and track branch information
4. **Modify SessionsList display** to show branch name alongside project (e.g., "jacques-context-manager [feature/search] / iTerm2")
5. **Enhance CompactPanel** to show which branch's context is near critical
6. **Consider branch-aware session titles** in dashboard (e.g., "feature-branch: Task description" instead of just "Task description")

### 9. **Data Flow for Proposed Feature**

```
statusline.sh (runs git branch detection)
  ↓
context_update event {session_id, git_branch, git_worktree}
  ↓
SessionRegistry.updateContext() stores branch info
  ↓
WebSocket broadcast includes branch data
  ↓
Dashboard SessionsList shows [branch] in display
```

### 10. **No Changes Needed For**:
- Terminal isolation (already works via terminal_key)
- Cross-session context bleeding (already prevented)
- Session lifecycle tracking (already handles multi-session scenarios)

---

**Summary**: Jacques already handles parallel worktrees correctly via terminal isolation, but lacks **visibility** of which branch each session is on. The fix is primarily UI/data enhancement rather than architectural changes. The `statusline.sh` hook is the natural place to capture branch info since it runs frequently and has directory access.