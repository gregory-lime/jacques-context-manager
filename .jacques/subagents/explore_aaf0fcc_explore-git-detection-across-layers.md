# Explore: Explore git detection across layers

> Session: `77d3dc6b-a84d-4db0-8d39-6031292c9f61`
> Date: 2026-02-04
> Tokens: ~71 690

---

Perfect! Now I have a comprehensive understanding. Let me create a detailed report of all git detection code in the Jacques codebase.

## Comprehensive Git Detection Code Analysis

I've completed a thorough exploration of all git branch, worktree, and repository detection code across the Jacques codebase. Here's my complete findings:

### Overview

Git detection happens in **THREE independent locations** with **significant duplication and inconsistencies**:

1. **Bash (statusline.sh)** - Shell script with caching
2. **Python (base.py)** - Adapter method using subprocess
3. **TypeScript - DISPLAY ONLY** - No actual git detection here

---

## Location 1: Bash - `hooks/statusline.sh` (Lines 44-68)

**File**: `/Users/gole/Desktop/jacques-context-manager/hooks/statusline.sh`

**Implementation**:
```bash
# Detect git branch and worktree from project directory (cached for 60s)
git_branch=""
git_worktree=""
git_dir="${project_dir:-$cwd}"
if [ -n "$git_dir" ] && [ -d "$git_dir" ]; then
  git_cache="/tmp/jacques-git-$(echo "$git_dir" | tr '/' '-').cache"
  cache_stale=1
  if [ -f "$git_cache" ]; then
    cache_age=$(( now - $(stat -f %m "$git_cache" 2>/dev/null || echo 0) ))
    [ "$cache_age" -lt 60 ] && cache_stale=0
  fi
  if [ "$cache_stale" = "1" ]; then
    git_branch=$(git -C "$git_dir" rev-parse --abbrev-ref HEAD 2>/dev/null)
    git_git_dir=$(git -C "$git_dir" rev-parse --git-dir 2>/dev/null)
    git_common_dir=$(git -C "$git_dir" rev-parse --git-common-dir 2>/dev/null)
    if [ -n "$git_git_dir" ] && [ -n "$git_common_dir" ] && [ "$git_git_dir" != "$git_common_dir" ]; then
      git_worktree=$(basename "$git_dir")
    fi
    printf '%s\n%s' "$git_branch" "$git_worktree" > "$git_cache" 2>/dev/null
  else
    git_branch=$(head -1 "$git_cache" 2>/dev/null)
    git_worktree=$(tail -1 "$git_cache" 2>/dev/null)
    [ "$git_branch" = "$git_worktree" ] && git_worktree=""
  fi
fi
```

**Key Features**:
- **60-second caching** of git info to reduce subprocess calls
- **Worktree detection**: Compares `git-dir` vs `git-common-dir`
- **Branch detection**: `git rev-parse --abbrev-ref HEAD`
- **Cache files**: `/tmp/jacques-git-{sanitized-path}.cache` (2 lines: branch on line 1, worktree on line 2)
- **Platform-specific**: Uses `stat -f` (macOS) with fallback to `echo 0`
- **Empty string defaults**: Returns empty strings when not a git repo

**Payload** (Line 174):
```bash
"git_branch":"$git_branch","git_worktree":"$git_worktree"
```

---

## Location 2: Python - `hooks/adapters/base.py` (Lines 368-402)

**File**: `/Users/gole/Desktop/jacques-context-manager/hooks/adapters/base.py`

**Implementation**:
```python
def detect_git_info(self, project_path: str) -> dict:
    """
    Detect git branch and worktree status from project directory.

    Returns dict with:
        - git_branch: Current branch name (empty string if not a git repo)
        - git_worktree: Worktree name if in a worktree (empty string otherwise)
    """
    result = {'git_branch': '', 'git_worktree': ''}
    if not project_path or not os.path.isdir(project_path):
        return result
    try:
        import subprocess
        branch = subprocess.run(
            ['git', '-C', project_path, 'rev-parse', '--abbrev-ref', 'HEAD'],
            capture_output=True, text=True, timeout=5
        )
        if branch.returncode == 0:
            result['git_branch'] = branch.stdout.strip()

        # Detect worktree: git-dir differs from git-common-dir
        git_dir = subprocess.run(
            ['git', '-C', project_path, 'rev-parse', '--git-dir'],
            capture_output=True, text=True, timeout=5
        )
        common_dir = subprocess.run(
            ['git', '-C', project_path, 'rev-parse', '--git-common-dir'],
            capture_output=True, text=True, timeout=5
        )
        if (git_dir.returncode == 0 and common_dir.returncode == 0 and
                git_dir.stdout.strip() != common_dir.stdout.strip()):
            result['git_worktree'] = os.path.basename(project_path)
    except Exception:
        pass
    return result
```

**Usage in `claude_code.py` (Lines 198-216)**:
```python
# Detect git branch and worktree
git_info = self.detect_git_info(project_info['project_path'])

return self.build_base_payload(
    event='session_start',
    session_id=session_id,
    ...
    git_branch=git_info['git_branch'],
    git_worktree=git_info['git_worktree'],
)
```

**Key Features**:
- **NO caching** - Runs git commands every time (3 subprocess calls per detection)
- **Same worktree logic**: Compares `--git-dir` vs `--git-common-dir`
- **Same branch logic**: `git rev-parse --abbrev-ref HEAD`
- **5-second timeout** per subprocess call
- **Silent failures**: Catches all exceptions and returns empty strings
- **Empty string defaults**: Same as Bash version

**Called from**: `ClaudeCodeAdapter.build_session_start_payload()` during session registration

---

## Location 3: TypeScript - Type Definitions & Display

**Files**:
- `/Users/gole/Desktop/jacques-context-manager/server/src/types.ts` (Lines 142-145)
- `/Users/gole/Desktop/jacques-context-manager/core/src/types.ts` (Lines 83-84)
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/SessionsList.tsx` (Line 22)

**Type Definitions in `server/src/types.ts`**:
```typescript
export interface Session {
  ...
  /** Current git branch name */
  git_branch?: string | null;
  /** Git worktree name (if session is in a worktree) */
  git_worktree?: string | null;
}

export interface SessionStartEvent extends BaseEvent {
  ...
  /** Git branch detected from project directory */
  git_branch?: string;
  /** Git worktree name */
  git_worktree?: string;
}

export interface ContextUpdateEvent extends BaseEvent {
  ...
  /** Git branch detected from project directory */
  git_branch?: string;
  /** Git worktree name (basename of worktree dir) */
  git_worktree?: string;
}
```

**Event Flow**:
```
statusline.sh (detects)
  ↓
ContextUpdateEvent (carries data)
  ↓
SessionRegistry.updateContext() (stores)
  ↓
Session object (contains git_branch, git_worktree)
  ↓
Dashboard display (SessionsList.tsx)
```

**Display Code in `dashboard/src/components/SessionsList.tsx` (Lines 22-36)**:
```typescript
function formatSessionName(session: Session): string {
  const project = session.project || "unknown";
  const terminal = session.terminal?.term_program || "Terminal";
  const branch = session.git_branch;
  const maxLength = 50;

  let formatted: string;
  if (branch) {
    formatted = `${project} @${branch} / ${terminal}`;
  } else {
    formatted = `${project} / ${terminal}`;
  }
  
  if (formatted.length > maxLength) {
    return formatted.substring(0, maxLength - 3) + "...";
  }
  return formatted;
}
```

**Display Format**: Shows branch as `project @branch-name / terminal`

---

## Data Flow Through Layers

### Path 1: SessionStart Hook (Python Detection)
```
Session started
  ↓
jacques-register-session.py
  ↓
ClaudeCodeAdapter.build_session_start_payload()
  ↓
detect_git_info() [base.py] - 3 subprocess calls, NO caching
  ↓
SessionStartEvent.git_branch, git_branch
  ↓
SessionRegistry.registerSession()
  ↓
Session.git_branch, git_worktree stored
```

### Path 2: StatusLine Hook (Bash Detection)
```
StatusLine from Claude Code
  ↓
statusline.sh (receives context_window data)
  ↓
detect_git_info() [Bash] - 3 git commands, 60-second caching
  ↓
ContextUpdateEvent.git_branch, git_worktree
  ↓
SessionRegistry.updateContext()
  ↓
Session.git_branch, git_worktree updated
```

### Path 3: Dashboard Display (No Detection)
```
WebSocket receives SessionUpdateMessage
  ↓
Dashboard renders SessionsList
  ↓
formatSessionName() - reads session.git_branch
  ↓
Displays as "project @branch / terminal"
```

---

## Key Inconsistencies & Duplication

| Aspect | Bash (statusline.sh) | Python (base.py) | Note |
|--------|---------------------|------------------|------|
| **Caching** | 60 seconds | None | Python recalculates on every session start |
| **Subprocess calls per detection** | 3 | 3 | Same: branch, git-dir, git-common-dir |
| **Timeout** | Implicit (bash timeout) | 5 seconds | Python explicit, Bash implicit |
| **Error handling** | Silent failures (2>/dev/null) | try/except silently | Both silent but different mechanisms |
| **Worktree logic** | `git_dir != git_common_dir` | Same | Identical logic |
| **Branch detection** | `rev-parse --abbrev-ref HEAD` | Same | Identical |
| **Return values** | Empty strings | Empty strings | Consistent |
| **When called** | Every statusLine event | Every session_start | Different triggers |
| **Frequency** | High (real-time context updates) | Moderate (session registration) | Could conflict if data diverges |

---

## Problems This Creates

1. **Double Detection**: Both Bash and Python run git detection, sometimes creating different results
   - Bash runs on statusLine (frequent, cached)
   - Python runs on SessionStart (once per session, no cache)
   - If branch changes between events, they diverge

2. **No Unified Detection**: Two separate implementations with identical logic
   - Maintenance burden: fix must be applied twice
   - Testing burden: must test both implementations

3. **Caching Mismatch**:
   - Bash caches for 60 seconds
   - Python doesn't cache at all
   - No coordination between cache layers

4. **Missing from Activity Events**: 
   - `ActivityEvent` (PostToolUse hook) has NO git detection
   - If branch changes mid-session, activity events won't reflect it
   - Only statusLine and sessionStart update git_branch

5. **Type Redundancy**:
   - Same `git_branch` / `git_worktree` fields duplicated across:
     - `SessionStartEvent`
     - `ContextUpdateEvent`
     - Session object (server/src/types.ts)
     - Session object (core/src/types.ts) - SEPARATE TYPE DEFINITION
   - Core types not imported/used consistently

---

## File Locations Summary

| File | Type | Function | Line Range |
|------|------|----------|------------|
| `/hooks/statusline.sh` | Bash | Main git detection (cached) | 44-68, 174, 199-200 |
| `/hooks/adapters/base.py` | Python | Git detection (no cache) | 368-402 |
| `/hooks/adapters/claude_code.py` | Python | Calls detect_git_info | 199, 214-215 |
| `/server/src/types.ts` | TypeScript | Type definitions | 142-145, 179-182, 220-223 |
| `/core/src/types.ts` | TypeScript | Type definitions (duplicate) | 83-84 |
| `/server/src/session-registry.ts` | TypeScript | Stores git data | 78-81, 102-103, 198-199, 282-289 |
| `/dashboard/src/components/SessionsList.tsx` | TypeScript | Displays git_branch | 22, 26-29 |
| `/dashboard/src/session/transformer.ts` | TypeScript | SavedContext schema | 35, 111, 173 |
| `/core/src/session/transformer.ts` | TypeScript | SavedContext schema | 35, 111, 173 |
| `/core/src/handoff/catalog.ts` | TypeScript | (no git detection) | - |

---

## Recommendations for Next Steps

The duplication and inconsistency suggests these areas for investigation:

1. **Consolidate Detection**: Move git detection to a single, shared location
2. **Implement Unified Caching**: Cache git info at server level, not in hooks
3. **Add to Activity Events**: Consider running git detection during tool use
4. **Deduplication of Types**: Use single Session type definition from core/types.ts everywhere
5. **Cross-layer Testing**: Test that both paths produce identical results

This is complete codebase documentation of every git-related detection mechanism.