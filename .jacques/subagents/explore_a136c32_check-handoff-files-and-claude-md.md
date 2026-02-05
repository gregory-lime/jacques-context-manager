# Explore: Check handoff files and CLAUDE.md

> Session: `38ceac2d-df45-4064-8a36-488d23eaa7f3`
> Date: 2026-01-31
> Tokens: ~44 499

---

Perfect! Now I have all the information I need. Let me compile my findings:

## Summary of Current State

Based on my thorough exploration of the handoff system, here's what I found:

### 1. **Skill File Status** ✓ Correct Format

The skill file at `/Users/gole/.claude/skills/handoff.skill.md` is **correctly formatted** according to Claude Code's skill specification:

```yaml
---
name: handoff
description: Generate a session handoff document for continuing work in a new session
---
```

**However, there are two issues preventing discovery:**

#### Issue A: File Location
- **Current location**: `~/.claude/skills/handoff.skill.md` (single file)
- **Required location**: `~/.claude/skills/handoff/SKILL.md` (directory with SKILL.md)

According to the official Claude Code documentation, skills must be in a directory structure:
```
~/.claude/skills/[skill-name]/SKILL.md
```

The current flat file structure is **not discovered** by Claude Code. It needs to be a directory.

#### Issue B: Frontmatter Fields Are Minimal
The current frontmatter has only `name` and `description`, which is valid but doesn't specify:
- `context: fork` - needed to run this in a subagent
- `allowed-tools` - to specify which tools the orchestrator can use
- `model` - to specify which model should execute this

Looking at the subagent files (handoff-progress, handoff-blockers, etc.), they DO specify these fields:
```yaml
---
name: handoff-progress
description: Extract progress made in the session. Called by handoff-orchestrator.
tools: Read, Grep, Glob
model: haiku
---
```

### 2. **Subagent Files** ✓ Correct Format

The files in `~/.claude/agents/` are **correctly structured** as subagent markdown files:
- `handoff-orchestrator.md` - Main orchestrator
- `handoff-progress.md` - Extracts progress
- `handoff-blockers.md` - Extracts blockers
- `handoff-task-focus.md` - Extracts task focus
- `handoff-next-steps.md` - Extracts next steps
- `handoff-decisions.md` - Extracts decisions
- `handoff-warnings.md` - Extracts warnings

These follow the correct agent format with YAML frontmatter and markdown instructions.

### 3. **CLAUDE.md Documentation** ⚠️ Missing Information

The CLAUDE.md file has no documentation about:
- The handoff skill/subagent system
- How to invoke it (`/handoff`)
- The subagent architecture pattern
- How to continue work in a new session using handoff files

### 4. **Settings Configuration** ✓ No Changes Needed

The `~/.claude/settings.json` only configures hooks for Jacques, not skills. No changes are needed there for skills to be discovered (skills are auto-discovered from directories).

## Sources

- [Extend Claude with skills - Claude Code Docs](https://code.claude.com/docs/en/skills)
- [GitHub - anthropics/skills: Public repository for Agent Skills](https://github.com/anthropics/skills)
- [Inside Claude Code Skills: Structure, prompts, invocation | Mikhail Shilkov](https://mikhail.io/2025/10/claude-code-skills/)