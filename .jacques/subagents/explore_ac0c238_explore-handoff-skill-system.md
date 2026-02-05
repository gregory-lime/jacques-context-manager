# Explore: Explore handoff skill system

> Session: `ad407d41-6bf6-491f-a1af-10f2fa41b27a`
> Date: 2026-02-01
> Tokens: ~50 113

---

Perfect! Now I have comprehensive information. Let me compile the research findings into a clear report.

## Jacques Handoff Skill Implementation Research

I've completed a thorough exploration of the Jacques handoff skill system. Here are the key findings:

### 1. **Skill Location & Structure**

Skills are located in **`~/.claude/skills/`** and follow a standard format:
- **`jacques-handoff`** (LLM-powered skill):
  - `/Users/gole/.claude/skills/jacques-handoff/SKILL.md`
  - Comprehensive instructions for generating ~1000 token handoff documents
  - Can extract from CLAUDE.md, plans, and conversation context

- **`jacques-paste`** (Recovery skill):
  - `/Users/gole/.claude/skills/jacques-paste/SKILL.md`
  - Loads latest handoff and resumes work
  - Provides context summarization and proposed next steps

### 2. **How Skills Are Invoked**

**User invocation**: User types `/jacques-handoff` or `/jacques-paste` in Claude Code
- Claude Code recognizes the skill name and looks in `~/.claude/skills/{name}/SKILL.md`
- Reads the YAML frontmatter (name, description) and instructions
- Executes the LLM agent with the skill instructions
- Token usage is tracked by Claude Code's internal session metrics

**No special token reporting**:
- Claude Code doesn't report skill execution tokens separately
- Tokens are accumulated in the normal session context window
- The `statusLine` hook captures real-time metrics (used%, remaining%, total tokens)

### 3. **Skill Prompt Structure**

Each skill file (`SKILL.md`) uses YAML frontmatter:
```yaml
---
name: jacques-handoff
description: Generate a session handoff document for continuing work
---

## Instructions
[Detailed extraction and formatting instructions...]
```

**The `/jacques-handoff` skill includes**:
- Priority-based extraction (CLAUDE.md first, then transcript)
- Required sections: Header, Project Context, Current Task, Progress Made, User Decisions, Plan Status, Blockers, Warnings, Next Steps
- Quality requirements: specific file paths, absolute paths, function names
- ~1000 token target

### 4. **Token Tracking Mechanism**

Tokens are tracked through **two primary hooks**:

#### **`statusLine` (Real-time Context Updates)**
- **File**: `/Users/gole/Desktop/jacques-context-manager/hooks/statusline.sh`
- Receives JSON from Claude Code's statusLine feature (built-in)
- Extracts context metrics:
  - `used_percentage`: Current context usage
  - `remaining_percentage`: Available context
  - `context_window_size`: Total tokens (e.g., 200k)
  - `total_input_tokens`: User message tokens
  - `total_output_tokens`: Claude response tokens
  - `model`: Model ID
  - Model display name
- Sends to Jacques server via Unix socket `/tmp/jacques.sock`
- Displays abbreviated status: `[Model] ctx:XX% [AC:ON/OFF]`

#### **`PostToolUse` Hook (Activity Tracking)**
- **File**: `/Users/gole/Desktop/jacques-context-manager/hooks/jacques-report-activity.py`
- Called after every tool invocation
- Updates session activity timestamp
- Extracts and refreshes session title from transcript
- Sends activity event to server (non-blocking)

**Key insight**: Token usage percentage comes from Claude Code itself via the `statusLine` callback - Jacques reads these metrics, not calculates them.

### 5. **How Skill Execution Affects Tokens**

When `/jacques-handoff` is executed:
1. User types `/jacques-handoff` in Claude Code
2. Claude Code loads `~/.claude/skills/jacques-handoff/SKILL.md`
3. LLM processes the skill instructions against current conversation context
4. Skill responses add to context window (tokens consumed)
5. `statusLine` hook captures updated metrics after skill finishes
6. Jacques dashboard receives updated context percentage in real-time

**The flow**:
```
User: /jacques-handoff
  ↓
Claude Code (skill invocation)
  ↓
LLM processes skill instructions against transcript
  ↓
Response tokens added to session context
  ↓
statusLine captures metrics: used_pct, total_tokens, etc.
  ↓
Sent to Jacques server via Unix socket
  ↓
Dashboard displays updated context %
```

### 6. **Existing Handoff Examples**

The project has **working handoff files** in `.jacques/handoffs/`:
- Format: `YYYY-MM-DDTHH-mm-ss-handoff.md`
- Real example: `.jacques/handoffs/2026-02-01T12-45-00-handoff.md` (84 lines, ~350 tokens)
- Includes: Project Context, Current Task, Progress Made, User Decisions, Blockers, Warnings, Next Steps

### 7. **Dashboard-to-Skill Integration**

The dashboard CLI (`dashboard/src/cli.ts`) has these commands:
- `jacques` - Interactive dashboard (Ink/React TUI)
- `jacques status` - One-shot status
- `jacques list` - JSON output of sessions
- `jacques search` - Archive search

**No direct skill triggering from dashboard yet**:
- Dashboard can generate fast rule-based handoffs (files modified, tools used, recent messages)
- Full LLM-powered `/jacques-handoff` must be invoked manually by user
- Potential integration: Dashboard keyboard shortcut → Copies handoff template for manual paste

### 8. **Three-Layer Token Tracking Architecture**

```
Claude Code Session
  ↓
statusLine (captures: used%, remaining%, model, context_window_size, token_counts)
  ↓
Unix socket /tmp/jacques.sock (newline-delimited JSON)
  ↓
Jacques Server (session-registry.ts)
  ↓
WebSocket (port 4242) → Dashboard
  ↓
Real-time percentage display + token estimates
```

### 9. **Key Files Reference**

| File | Purpose |
|------|---------|
| `/Users/gole/.claude/skills/jacques-handoff/SKILL.md` | LLM skill for generating handoffs |
| `/Users/gole/.claude/skills/jacques-paste/SKILL.md` | Skill for loading and resuming handoffs |
| `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/generator.ts` | Rule-based handoff generation (files, tools, messages) |
| `/Users/gole/Desktop/jacques-context-manager/hooks/statusline.sh` | Real-time context metric capture |
| `/Users/gole/Desktop/jacques-context-manager/hooks/jacques-report-activity.py` | Activity and session title tracking |
| `/Users/gole/Desktop/jacques-context-manager/.jacques/handoffs/` | Generated handoff storage |

### 10. **Critical Implementation Details**

- **No API calls needed**: Jacques works with local hooks and Unix socket communication
- **Token overhead is minimal**: Hooks use `jq` and bash, <100ms per statusLine update
- **Skill execution is async**: Claude Code handles skill processing independently
- **Token data source**: Claude Code's built-in `statusLine` feature (not calculated by Jacques)
- **Dashboard limitation**: Cannot run inline in Claude Code (requires TTY/separate terminal)

---

This research provides a complete understanding of how the handoff skill system works, how token tracking is implemented, and where integration points exist for dashboard automation.