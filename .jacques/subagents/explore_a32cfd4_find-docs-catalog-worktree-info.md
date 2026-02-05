# Explore: Find docs catalog worktree info

> Session: `7eddbf0b-5e1c-4ac6-be36-93651d5e23ee`
> Date: 2026-02-03
> Tokens: ~33 879

---

Excellent! I now have comprehensive information. Let me create a final summary report:

## Summary Report: Git Worktrees, Branch Workflow, and Catalog Documentation

Based on my search of `/Users/gole/Desktop/jacques-context-manager/`, here are the findings:

### 1. **Git Worktrees & Branch Workflow Documentation**

**Primary Source**: `/Users/gole/Desktop/jacques-context-manager/docs/parallel-claude-code-workflow.md`

This is a comprehensive reference guide for running multiple Claude Code instances on the same project. Key sections:

- **Quick Start**: Git worktree commands with examples
  - Creating worktrees: `git worktree add ../jacques-feature-name -b feature/name`
  - Listing: `git worktree list`
  - Cleanup: `git worktree remove ../jacques-feature-name`

- **Merging Strategies**:
  - Option 1: PR-Based (safest) - each worktree pushes its branch and creates separate PRs
  - Option 2: Cherry-Pick - selective commit application
  - Option 3: Claude-Assisted Rebase - let Claude instance resolve conflicts with full context

- **Pitfalls to Avoid** (7 identified):
  1. Never run two instances in same directory (context bleeding)
  2. macOS file locking issues in `~/.local/share/claude/versions/`
  3. `.claude.json` corruption from concurrent writes
  4. Worktree bootstrapping (each needs `npm install`)
  5. Context exhaustion (limit to 3-5 parallel sessions)
  6. Version downgrade race conditions
  7. IDE integration risks (use terminal CLI instead)

- **Alternative**: GitButler - uses Claude Code lifecycle hooks to auto-sort parallel work without worktrees

- **Referenced Tools**: worktree-workflow, Crystal, ccswitch, GitButler

### 2. **Manual Compact Workflow Documentation**

**Source**: `/Users/gole/Desktop/jacques-context-manager/docs/manual-compact-workflow-plan.md`

Detailed feature plan addressing Claude Code's auto-compact bug (#18264). Three key features:

1. **Manual Compact Workflow** - UI panel with copy buttons for handoff prompts
2. **Auto-Compact Status Display** - Show ON/OFF status with bug warnings
3. **Auto-Compact Toggle** - Enable/disable directly from dashboard

### 3. **Catalog of Work (Sessions & Context)**

**Source**: `/Users/gole/Desktop/jacques-context-manager/.jacques/index.json`

The `.jacques` directory contains a structured catalog:

**Directory Structure**:
```
.jacques/
├── index.json           (10.7 KB - master index)
├── context/             (copied context files from Obsidian)
├── handoffs/            (47 stored handoff documents)
├── plans/               (plans extracted from sessions)
└── sessions/            (saved session metadata)
```

**Index Contents** (index.json):
- **Context files** (3 currently):
  - Quo Vadis AI discussion (7.4 KB)
  - CLAUDE documentation (3.1 KB)
  - Overview/Camper project (813 bytes)
  - Each has: id, name, path, source (obsidian), sourceFile, addedAt, sizeBytes, optional tags/description

- **Sessions** (cataloging 46+ saved sessions):
  - Each entry has: id, title, filename, path, savedAt, startedAt, endedAt, durationMinutes, messageCount, toolCallCount, technologies
  - Example: "Archive Display & Filtering Improvements" (12 min, 123 messages, 80 tool calls)
  - File naming convention: `YYYY-MM-DD_HH-MM_title-slug_XXXX.json`

### 4. **Related Documentation Files**

Additional docs available in `/docs/`:
- `context-keeper-analysis.md`
- `CURSOR_CONTEXT_TRACKING_RESEARCH.md`
- `CURSOR_USAGE.md`

### Key Takeaways

1. **Worktree strategy**: The project recommends using git worktrees for parallel work to avoid context bleeding and settings corruption, with clear guidance on merging strategies.

2. **Branch workflow**: Three distinct merging approaches documented with trade-offs, including Claude-assisted rebase for conflict resolution.

3. **Catalog system**: Comprehensive tracking of sessions, context files, and handoffs in `.jacques/index.json` with structured metadata for cross-project search and context management.

4. **Auto-compact handling**: Documented workaround for Claude Code bug #18264, with manual compact workflow as best practice for context management across sessions.