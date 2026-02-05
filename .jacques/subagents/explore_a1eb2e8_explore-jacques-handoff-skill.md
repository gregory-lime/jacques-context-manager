# Explore: Explore jacques-handoff skill

> Session: `cd506061-fc7c-4e92-a166-1ef4456fc31c`
> Date: 2026-02-01
> Tokens: ~50 324

---

Perfect! Now I have comprehensive information. Let me create a summary report of my findings.

## Exploration Report: Jacques Handoff Skill and Generation System

I've thoroughly explored the Jacques handoff system, which includes skill definitions, orchestrator/extractor agents, transcript handling, and LLM invocation mechanisms. Here are my findings:

---

### 1. SKILL DEFINITION FILES (`~/.claude/skills/jacques-handoff/`)

**Location:** `/Users/gole/.claude/skills/jacques-handoff/SKILL.md`

The skill definition (`SKILL.md`) provides:
- Instructions for generating ~1000 token handoff documents
- 8 required sections: Header, Project Context, Current Task, Progress Made, User Decisions, Plan Status, Blockers & Bugs, What Didn't Work, Warnings & Gotchas, Next Steps
- Extraction priority (CLAUDE.md first, then user decisions, then active plans)
- Quality requirements emphasizing specificity, absolute file paths, and function names
- Output format with specific markdown structure and filename pattern: `.jacques/handoffs/{YYYY-MM-DDTHH-mm-ss}-handoff.md`

**Key Quality Standards:**
- ~1000 tokens comprehensive but focused
- Specific details (not "added file listing" but "`listGoogleDriveFiles()` with pagination")
- Absolute file paths throughout
- User decisions matter (captures "yes do that" / "no use this instead")

---

### 2. ORCHESTRATOR & EXTRACTOR AGENTS (`~/.claude/agents/`)

There are **9 agent files total**: 1 orchestrator + 8 specialized extractors

#### **Orchestrator: `jacques-orchestrator.md`**
- **Role:** Coordinates 8 parallel subagents and synthesizes outputs
- **Process:**
  1. Launches all 8 extractors simultaneously using the Task tool
  2. Applies quality gate before synthesis (no vague language, has content or "None in session")
  3. Synthesizes into final markdown format
  4. Writes to `.jacques/handoffs/{timestamp}-handoff.md`
- **Token Budget:** ~1100 total (100 tokens for headers/formatting + 8 extractors)
- **Model:** Uses `inherit` (inherits from parent session model, typically Opus 4.5)
- **Tools:** Read, Write, Task, Glob

#### **8 Specialized Extractors (all use Haiku model for cost efficiency)**

1. **`jacques-project-context.md`** (150 tokens max)
   - Checks CLAUDE.md first for project name, purpose, tech stack, key directories
   - Falls back to package.json, directory structure, config files
   - Output: Project name, purpose, tech, key directories with descriptions, entry points

2. **`jacques-task-focus.md`** (100 tokens max)
   - Finds original request (first user message) and tracks evolution
   - Identifies current state vs. original scope
   - Output: "Working on", "Goal", "Approach" schema

3. **`jacques-progress.md`** (200 tokens max)
   - Extracts Write/Edit tool calls for files modified
   - Looks for completion signals ("that works", test passes, "Done" language)
   - Identifies in-progress vs. blocked items
   - Output: Completed, In Progress, Files Modified categories

4. **`jacques-antipatterns.md`** (100 tokens max)
   - Searches for failure signals (errors, "didn't work", reverted changes)
   - Identifies root causes and what worked instead
   - Output: "Tried" / "Failed because" / "Fix" schema

5. **`jacques-decisions.md`** (150 tokens max)
   - Captures decision language ("Let's use X", "I chose to", trade-offs)
   - Finds architectural choices, design patterns, library selections
   - Includes reasoning and rejected alternatives
   - Output: Table format with Decision | Reasoning | Rejected Alternative

6. **`jacques-blockers.md`** (100 tokens max)
   - Finds error messages, stack traces, non-zero exit codes
   - Identifies resolution status (resolved vs. open)
   - Detects workarounds and external dependencies
   - Output: Resolved / Open Issues sections

7. **`jacques-next-steps.md`** (150 tokens max)
   - Finds explicit "Next, I'll..." statements
   - Infers from in-progress work (complete remaining parts, run tests)
   - Identifies open questions
   - Prioritizes: unblock other work → complete in-progress → start new items
   - Output: Immediate (Do First) | Then | Questions to Resolve

8. **`jacques-warnings.md`** (50 tokens max)
   - Documents discovered quirks ("It turns out...", "Note that...")
   - Identifies order dependencies and setup requirements
   - Flags environment issues, version requirements, fragile code
   - Output: Bulleted warnings with actionable guidance

**Design Philosophy:**
- All extractors use the **Haiku model** for cost efficiency (10x cheaper than Sonnet)
- Run in **parallel** (via Task tool) to reduce latency
- Each has **explicit detection mechanisms** for what to extract
- **Structured output schemas** enforce specificity
- **Quality checklists** prevent vague output

---

### 3. HOW THE SKILL GETS THE TRANSCRIPT

There are **two complementary approaches:**

#### **Approach A: Rule-Based Generation (Fast)**
**File:** `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/generator.ts`

- **Function:** `generateHandoffFromTranscript(transcriptPath, projectDir)`
- **Process:**
  1. Uses `parseJSONL(transcriptPath)` to parse the JSONL transcript file
  2. Calls `extractHandoffData()` which does rule-based extraction:
     - `extractTitle()` - Finds summary entry or first user message
     - `extractFilesModified()` - Scans for Write/Edit tool calls
     - `extractToolsUsed()` - Collects unique tool names
     - `extractRecentMessages()` - Captures last 5 user messages
  3. Formats as markdown using `formatHandoffMarkdown()`
  4. Saves to `.jacques/handoffs/{timestamp}-handoff.md`
  5. Returns token estimate (~4.5 chars per token)

#### **Approach B: LLM-Powered Generation (Intelligent)**
**File:** `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/llm-generator.ts`

- **Function:** `generateHandoffWithLLM(transcriptPath, projectDir, options)`
- **Process:**
  1. Reads the skill prompt from `~/.claude/skills/jacques-handoff/SKILL.md`
  2. Reads the transcript file from `transcriptPath`
  3. Combines them into user prompt: `"Generate a session handoff. The conversation transcript is below:\n\n{transcript}"`
  4. **Spawns Claude Code CLI** with `claude` command:
     ```
     claude -p "{userPrompt}" --system-prompt "{skillPrompt}" --output-format json --allowedTools Read,Write,Glob,Grep
     ```
  5. Parses JSON response from Claude, extracts `result` field
  6. Saves to `.jacques/handoffs/{timestamp}-handoff.md`
  7. Returns token usage: `{ inputTokens, outputTokens, totalTokens }`

**Key Difference:** The LLM approach passes the entire transcript as the user prompt context to Claude Code CLI, which applies the skill instructions to intelligently extract and format the handoff.

---

### 4. TRANSCRIPT PARSING (`core/src/session/parser.ts`)

The system parses Claude Code's **JSONL transcript format** with these entry types:

| Type | Description | Parsed As |
|------|-----------|-----------|
| `user` | User messages | `user_message` |
| `queue-operation` | Queued input (with message content) | `user_message` |
| `assistant` | Claude responses + tool calls | `assistant_message` or `tool_call` |
| `progress` | Hook execution logs | `hook_progress` |
| `system` | System events, turn duration | `system_event` or `turn_duration` |
| `summary` | Auto-generated session summary | `summary` |
| `file-history-snapshot` | File tracking (skipped) | `skip` |

**Entry Structure:**
```typescript
interface ParsedEntry {
  type: ParsedEntryType;
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  content: ParsedContent;
}
```

**Content varies by type:**
- **Messages:** `text`, `thinking` (extended thinking)
- **Tool calls:** `toolName`, `toolInput`
- **Summaries:** `summary` field
- **Token usage:** `usage.inputTokens`, `usage.outputTokens`, cache metrics

---

### 5. LLM INVOCATION MECHANISM

The system uses **Claude Code CLI** to invoke the LLM:

**Command Template:**
```bash
claude \
  -p "{transcriptContext}" \
  --system-prompt "{skillInstructions}" \
  --output-format json \
  --allowedTools Read,Write,Glob,Grep
```

**Response Parsing:**
- Claude Code CLI outputs **JSON** format
- Extracts `response.result` field for content
- Captures `response.usage.input_tokens` and `response.usage.output_tokens`

**Configuration:**
- **Timeout:** 120 seconds (configurable)
- **CWD:** Project directory (for relative path access)
- **Output:** JSON with usage metrics
- **Allowed Tools:** Read, Write, Glob, Grep (skill can inspect files)

**Error Handling:**
- Custom `ClaudeCodeError` class for CLI failures
- Timeout handling with `AbortSignal` support
- JSON parsing with fallback handling

---

### 6. ACTUAL GENERATED HANDOFF EXAMPLE

Example from `.jacques/handoffs/2026-02-01T14-35-22-handoff.md`:

```markdown
# Session Handoff

> Project: jacques-context-manager | Generated: 2026-02-01T14:35:22

## Project Context
Jacques is a real-time context monitor for AI coding assistants...

## Current Task
Implementing graceful shutdown and clean startup for the `jacques` CLI command...

## Progress Made
**Completed - Silent Mode for Server Components:**
1. **WebSocket Server** (`/Users/gole/Desktop/jacques-context-manager/server/src/websocket.ts`) [DONE]
   - Added `silent?: boolean` to `WebSocketServerConfig`
   - Added `log`/`error` instance methods that respect silent mode
   ...

## User Decisions
| Decision | User's Choice | Context |
|----------|---------------|---------|
| Shutdown logging | Suppress all internal logs | User wanted clean output... |

## Blockers & Bugs
None in this session.

## Next Steps
1. **Test the full experience** - Run `jacques` to verify startup animation...
```

---

### 7. FILE STRUCTURE SUMMARY

```
~/.claude/
├── skills/
│   └── jacques-handoff/
│       └── SKILL.md                    # Skill definition with instructions
└── agents/
    ├── jacques-orchestrator.md         # Master coordinator
    ├── jacques-project-context.md      # Extractor 1
    ├── jacques-task-focus.md           # Extractor 2
    ├── jacques-progress.md             # Extractor 3
    ├── jacques-antipatterns.md         # Extractor 4
    ├── jacques-decisions.md            # Extractor 5
    ├── jacques-blockers.md             # Extractor 6
    ├── jacques-next-steps.md           # Extractor 7
    └── jacques-warnings.md             # Extractor 8

project/
├── core/src/handoff/
│   ├── generator.ts                    # Rule-based extraction
│   ├── llm-generator.ts                # Claude Code CLI invocation
│   ├── catalog.ts                      # Handoff file management
│   ├── types.ts                        # Type definitions
│   ├── prompts.ts                      # Handoff invocation prompts
│   └── index.ts                        # Public exports
└── .jacques/handoffs/
    └── {YYYY-MM-DDTHH-mm-ss}-handoff.md  # Generated handoff files
```

---

### Key Insights

1. **Dual Approach:** Fast rule-based generation vs. intelligent LLM-powered synthesis
2. **Modular Extractors:** 8 focused agents (haiku) coordinated by orchestrator (opus)
3. **Direct CLI Integration:** Uses `claude` command with skill prompts and transcript context
4. **JSONL Parsing:** Sophisticated parser handles Claude Code's complex session format
5. **Quality Gates:** Orchestrator validates before synthesis to prevent vague output
6. **Token Awareness:** Explicit token budgets for each section (~1100 total)
7. **Specificity Focus:** All instructions emphasize absolute paths, function names, concrete details