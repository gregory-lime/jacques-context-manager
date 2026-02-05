# Explore: Research handoff prompt optimization

> Session: `b9614f50-82aa-4001-b746-efcc74941c60`
> Date: 2026-02-01
> Tokens: ~60 193

---

Perfect! Now I have comprehensive information. Let me compile my research findings into a detailed report for the user.

## Summary of Findings

Based on my comprehensive analysis of the Jacques handoff system, I've identified several sophisticated patterns designed to **prevent Claude from doing extensive file searches**. Here are the key findings:

---

## 1. CLAUDE.md-FIRST STRATEGY (Most Important)

**Location**: `/Users/gole/.claude/skills/jacques-handoff/SKILL.md` lines 14-16

The skill prompt **explicitly tells Claude NOT to search deeply**:

```markdown
**Check CLAUDE.md first** - If the project has a CLAUDE.md in the root, 
use it for project context (tech stack, architecture, key directories). 
Don't scan many directories - CLAUDE.md has what you need.
```

**What this does**: By providing a pre-written CLAUDE.md document in each project, Claude is programmed to rely on it rather than discovering architecture through exploration. This is a **content-based constraint** rather than a tool constraint.

---

## 2. PRE-EXTRACTED COMPACT CONTEXT (Prevents Full File Reading)

**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/llm-generator.ts` lines 471-476

```typescript
// 3. Pre-extract compact context (rule-based, ~2k tokens instead of 60k)
// This avoids Claude reading the full transcript file
const { context: userPrompt, tokenEstimate } = await getCompactContextForSkill(
  transcriptPath,
  projectDir
);
```

**What this does**: The system extracts a ~2k token summary from the 60k token transcript BEFORE passing it to Claude. Claude never sees the full transcript file—only structured extracted data.

The extractor (`getCompactContextForSkill`) runs **rule-based extraction** (no LLM involved):
- Identifies files modified (Write/Edit calls)
- Extracts last 10 user messages
- Lists tools used
- Detects technologies via regex
- Formats as structured text sections

Claude receives this pre-digested format, eliminating the need to search through conversation history.

---

## 3. EXPLICIT `--allowedTools` RESTRICTION

**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/llm-generator.ts` line 249

```typescript
"--allowedTools",
"Write",  // Only needs Write to save handoff; context is pre-extracted
```

**What this does**: The Claude Code CLI is invoked with **only the `Write` tool available**. This explicitly prevents Claude from using:
- `Read` (can't search for additional files)
- `Glob` (can't search file system)
- `Grep` (can't search content)
- `Bash` (can't run exploratory commands)

Claude can ONLY write the handoff—it cannot explore.

---

## 4. SUBAGENT TOOL CONSTRAINTS (Multi-Layer Protection)

The orchestrator spawns 8 subagents, each with restricted tools:

**Location**: `/Users/gole/.claude/agents/jacques-*.md`

```
jacques-project-context.md:   tools: Read, Grep, Glob
jacques-task-focus.md:        tools: Read, Grep, Glob
jacques-progress.md:          tools: Read, Grep, Glob
jacques-antipatterns.md:      tools: Read, Grep, Glob
jacques-decisions.md:         tools: Read, Grep, Glob
jacques-blockers.md:          tools: Read, Grep, Glob
jacques-next-steps.md:        tools: Read, Grep, Glob
jacques-warnings.md:          tools: Read, Grep, Glob
```

**What this does**: While subagents have Read/Grep/Glob, they're **constrained by task design**:
- Each has a specific, narrow extraction goal
- Each has explicit "How to Extract" instructions (not "explore the codebase")
- Each has a max token budget (e.g., 150 tokens for project-context)

These constraints prevent exploration from becoming a search task.

---

## 5. EXPLICIT INSTRUCTIONS AGAINST SEARCHING

**Location**: `/Users/gole/.claude/agents/jacques-project-context.md` lines 14-25

```markdown
## How to Extract

1. **First, check for CLAUDE.md** (Glob for `**/CLAUDE.md` in project root)
   - If found: Extract project name, purpose, tech stack, key directories from it
   - Parse the "Project Overview" or similar section

2. **If no CLAUDE.md, infer from**:
   - `package.json`: name, description, dependencies → tech stack
   - Directory structure: `src/`, `lib/`, `app/`, `server/`, `tests/`
   - Config files: `tsconfig.json` (TypeScript), `pyproject.toml` (Python), etc.

3. **Key directories**: Only list 3-5 most important ones with one-line descriptions
```

**What this does**: The instructions explicitly define the **search strategy**:
- Start with one specific file (CLAUDE.md)
- Use only standard config files (package.json, tsconfig.json)
- **Don't scan many directories**
- List only 3-5 directories, not exhaustive exploration

---

## 6. QUALITY GATES THAT PREVENT VAGUENESS (Forces Specificity Without Searching)

**Location**: `/Users/gole/.claude/agents/jacques-orchestrator.md` lines 28-38

```markdown
### Step 2: Quality Gate

Before synthesizing, verify each section:
1. Has content OR explicit "None in this session"
2. No vague language ("worked on stuff", "made progress", "some issues")
3. File paths are absolute where mentioned
4. Next steps are actionable (not "continue working")

If any section fails quality check:
- If vague: Summarize with "[Extractor returned vague output - manual review needed]"
- If empty with no "None" message: Add "None in this session."
```

**What this does**: Rather than allowing Claude to search for more data to fill gaps, the system **forces acknowledgment of missing data**. If an extractor doesn't have enough information, it must say "None in this session" rather than try to search for it.

---

## 7. PARSED-ENTRIES PATTERN (Avoids Re-Reading)

**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/generator.ts` lines 756-777

```typescript
export async function getCompactContextForSkill(
  transcriptPath: string,
  projectDir: string
): Promise<CompactContextResult> {
  // Parse the JSONL file ONCE
  const entries = await parseJSONL(transcriptPath);

  // Extract data from parsed entries
  const data = await extractHandoffDataForSkill(entries, projectDir);

  // Format as compact context
  const context = formatAsSkillContext(data);
  
  return { context, tokenEstimate, data };
}
```

**What this does**: The transcript is parsed ONCE into structured entries, then extractors work from that (no re-reading). Claude never sees the raw transcript file at all.

---

## 8. STRUCTURED DATA SECTIONS (Prevents Open-Ended Queries)

**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/generator.ts` lines 622-722

```typescript
export function formatAsSkillContext(data: HandoffData): string {
  // Sections passed to Claude:
  // ### Project Info
  // ### Plan Context
  // ### User Messages (chronological, last 10)
  // ### Assistant Highlights (key responses)
  // ### Detected User Decisions
  // ### Detected Blockers/Errors
}
```

**What this does**: Instead of saying "analyze the conversation," the system provides **structured sections** that Claude consumes as-is. This removes the need to search/discover because all relevant data is already categorized.

---

## Key Pattern: **Content-Based Constraints Over Tool Constraints**

The system's genius is that it **combines multiple constraint layers**:

1. **Tool constraints** (`--allowedTools Write`)
2. **Data constraints** (only ~2k pre-extracted tokens)
3. **Instruction constraints** ("Check CLAUDE.md first, don't scan many directories")
4. **Task constraints** (each subagent has a specific, narrow goal)
5. **Quality constraints** (must produce specific output or "None")

Each layer reinforces the others, making file search unnecessary.

---

## Recommendations for Effective Constraint Language

Based on this analysis, here are prompt patterns that effectively prevent excessive searching:

### Pattern 1: Pre-Extraction + Constraint
```markdown
**Do not search the codebase.** All necessary data has been pre-extracted 
and provided in the sections below. Work only from this structured data.
```

### Pattern 2: Priority-Based Fallback (Not Search-Based)
```markdown
1. **First**, use [specific provided data structure]
2. **If not found**, use [other specific provided data]
3. **If still unclear**, respond with "Not available in provided context"
   (Do NOT attempt to search for this information)
```

### Pattern 3: Explicit "None" Option
```markdown
For any required section, output either:
- Specific findings based on provided data
- "Not found in provided context" if unavailable

Do NOT attempt to search for missing information.
```

### Pattern 4: Narrow Task Definition
```markdown
**Your task**: Extract X from the provided transcript sections only.
**Do not**: Search for files, read beyond provided data, or explore the project.
**If X is not in the provided data**: Output "Not found in provided context".
```

### Pattern 5: Token Budget as Constraint
```markdown
Given ~2000 tokens of pre-extracted project context (below), generate [output].
Only use the provided context. Do not attempt to read source files or search.
If information is missing, note it as "[Information not available in provided context]".
```

### Pattern 6: Explicit "Available Tools" Declaration
```markdown
**Available for this task**: 
- Read (transcript data only, already parsed)
- Write (output file only)

**NOT available**:
- Glob, Bash, or file system exploration

Work only with the provided structured data.
```

---

## Files to Reference

The implementation spans several key files:

1. **Core extraction**: `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/generator.ts` (lines 605-777)
2. **LLM invocation with tool restrictions**: `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/llm-generator.ts` (lines 240-250)
3. **Skill prompt strategy**: `/Users/gole/.claude/skills/jacques-handoff/SKILL.md` (lines 14-16)
4. **Subagent constraints**: `/Users/gole/.claude/agents/jacques-project-context.md` (lines 14-25)
5. **Quality gates**: `/Users/gole/.claude/agents/jacques-orchestrator.md` (lines 28-38)

---

## Conclusion

The Jacques system demonstrates that **preventing extensive file searches requires multiple, complementary constraint layers**:

- **Pre-extract** high-value information before passing to Claude
- **Limit tools** explicitly via tool allowlists
- **Provide structured sections** instead of open-ended queries
- **Force "None" responses** rather than search attempts
- **Define specific extraction methods** in instructions
- **Use token budgets** to make searching uneconomical

No single constraint is sufficient—the combination is what makes exploration unnecessary.