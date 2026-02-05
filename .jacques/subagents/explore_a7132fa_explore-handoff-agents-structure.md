# Explore: Explore handoff agents structure

> Session: `7d6efafc-a92b-437d-b423-c34f24962694`
> Date: 2026-01-31
> Tokens: ~19 934

---

Perfect! I've explored all 9 handoff agent files. Here's a comprehensive summary:

## Handoff Agent Files Summary

### File Listing

Located at `~/.claude/agents/`, there are 9 handoff-related agent files:

1. **handoff-orchestrator.md** (3,111 bytes) - Master orchestrator
2. **handoff-project-context.md** (2,243 bytes) - Project orientation extractor
3. **handoff-task-focus.md** (2,069 bytes) - Current task extractor
4. **handoff-progress.md** (2,680 bytes) - Progress documentation extractor
5. **handoff-antipatterns.md** (2,079 bytes) - Failed approaches extractor
6. **handoff-decisions.md** (2,337 bytes) - Key decisions extractor
7. **handoff-blockers.md** (2,149 bytes) - Issues and bugs extractor
8. **handoff-next-steps.md** (2,296 bytes) - Next steps extractor
9. **handoff-warnings.md** (1,775 bytes) - Gotchas and warnings extractor

---

### Naming Convention

**Pattern**: `handoff-{topic}.md`

- Orchestrator: singular (no suffix)
- Extractors: topic names describing what they extract (project-context, task-focus, progress, etc.)
- All use simple kebab-case names, lowercase

---

### File Structure (Metadata Header + Content)

Each file follows a consistent YAML frontmatter + markdown structure:

```yaml
---
name: handoff-{topic}
description: [1 sentence describing function]
tools: [tool list, e.g., "Read, Grep, Glob"]
model: [haiku | inherit]
---
```

Then **markdown content** with:
- Purpose/goal statement
- "How to Extract" section (specific detection mechanisms)
- Output schema with examples (GOOD vs. BAD)
- Quality checklist
- Token budget table/statement

---

### Orchestrator Architecture

**handoff-orchestrator.md** is the master coordinator that:

1. **Invokes all 8 extractors in parallel** using the Task tool
2. **Applies quality gates** before synthesis:
   - Content OR explicit "None in this session"
   - No vague language
   - Absolute file paths
   - Actionable next steps
3. **Synthesizes outputs** into structured markdown (no original content added)
4. **Writes to timestamped file**: `.jacques/handoffs/YYYY-MM-DDTHH-mm-ss-handoff.md`

**Output Format**:
```markdown
# Session Handoff
> Project: [name] | Generated: [timestamp]
## Project Context
[150 tokens max]
## Current Task
[100 tokens max]
## Progress Made
[200 tokens max]
## What Didn't Work
[100 tokens max]
## Key Decisions
[150 tokens max]
## Blockers & Bugs
[100 tokens max]
## Warnings & Gotchas
[50 tokens max]
## Next Steps
[150 tokens max]
```

**Total Budget**: ~1100 tokens (1000 content + 100 orchestrator overhead)

---

### Extractor Architecture (8 Parallel Subagents)

All extractors use the **Haiku model** and follow identical structure:

| Agent | Tools | Purpose | Max Tokens | Key Detection |
|-------|-------|---------|------------|---------------|
| **project-context** | Read, Grep, Glob | Orientation/tech stack | 150 | CLAUDE.md, package.json, directory structure |
| **task-focus** | Read, Grep, Glob | Current goal/approach | 100 | First user message, task evolution markers |
| **progress** | Read, Grep, Glob | Completed/in-progress work | 200 | Write/Edit calls, confirmations, TODOs |
| **antipatterns** | Read, Grep, Glob | Failed approaches | 100 | Error signals, reverted changes, "didn't work" phrases |
| **decisions** | Read, Grep, Glob | Architectural choices | 150 | Decision language ("let's use", "trade-off") |
| **blockers** | Read, Grep, Glob | Open issues/bugs | 100 | Error messages, stack traces, resolution status |
| **next-steps** | Read, Grep, Glob | Prioritized actions | 150 | "Next, I'll...", in-progress work inference |
| **warnings** | Read, Grep, Glob | Gotchas/quirks | 50 | "It turns out...", order dependencies, environment issues |

---

### Quality Standards (Consistent Across All Agents)

**Each agent enforces**:

1. **Specificity**: Not "worked on auth" but "added password validation to /src/auth/login.ts"
2. **Absolute paths**: Always `/absolute/path/to/file`, never relative
3. **No placeholders**: No "[TODO]", no "to be determined"
4. **Actionability**: Next steps don't say "continue working", they say specific file and operation
5. **Completeness**: Every section has content OR explicit "None in this session"
6. **Token discipline**: Strict max limits per section

**Output Examples Provided**:
- GOOD: Detailed, specific, actionable
- BAD: Vague, relative paths, not useful

---

### Extractor Reference Pattern

Each extractor's "How to Extract" section defines:

1. **What to search for**: Specific language markers and patterns
2. **Detection mechanisms**: How to find relevant content
3. **Output schema**: Structured markdown format
4. **Quality checklist**: Pre-return verification steps
5. **Token budget**: Maximum output size

---

### How Orchestrator References Extractors

From `handoff-orchestrator.md` lines 16-26:

```
Launch these 8 subagents simultaneously using the Task tool:
- `handoff-project-context` - [description]
- `handoff-task-focus` - [description]
- `handoff-progress` - [description]
- `handoff-antipatterns` - [description]
- `handoff-decisions` - [description]
- `handoff-blockers` - [description]
- `handoff-next-steps` - [description]
- `handoff-warnings` - [description]
```

**Reference by `name` field** from YAML frontmatter, invoked via Task tool for parallel execution.

---

### Key Documentation Features

Each agent includes:

1. **Goal Statement**: Clear purpose (e.g., "Summarize what is being worked on...")
2. **Extraction Instructions**: 3-4 numbered steps with specific search terms
3. **Output Schema**: Markdown template showing exact format expected
4. **Quality Checklist**: Pre-return validation (checkbox format)
5. **GOOD/BAD Examples**: Side-by-side comparison with 2-3 sentences each explaining why
6. **Token Budget**: Explicit maximum in table or statement form

---

### Comments & Documentation Patterns

**Documentation style**:
- Markdown headers (`##`, `###`)
- Inline code for commands/paths (backticks)
- Tables for token budgets and decision matrices
- Numbered lists for sequential instructions
- Checkbox lists for quality gates
- Bullet points for examples and patterns

**No comments within code** - all documentation is in markdown sections before extraction logic.

---

### Summary Table

| Aspect | Details |
|--------|---------|
| **Total files** | 9 (1 orchestrator + 8 extractors) |
| **Naming** | `handoff-{topic}.md` |
| **Execution** | Orchestrator spawns 8 parallel extractors via Task tool |
| **Models** | Orchestrator: inherit (inherits from caller), Extractors: haiku |
| **Tools** | All use: Read, Grep, Glob (orchestrator adds Write, Task) |
| **Output** | Structured markdown, timestamped file in `.jacques/handoffs/` |
| **Total tokens** | ~1100 (1000 content + 100 overhead) |
| **Quality gates** | Specificity, absolute paths, actionability, no placeholders |
| **Documentation** | Comprehensive "How to Extract" + examples + checklists per agent |