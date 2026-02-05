# Explore: Explore hook-based handoff options

> Session: `38ceac2d-df45-4064-8a36-488d23eaa7f3`
> Date: 2026-01-31
> Tokens: ~45 442

---

Perfect! I've gathered comprehensive information about Claude Code hooks. Let me now compile my findings into a detailed report for the user.

## Investigation Report: Claude Code Hook Triggering for Handoff Generation

Based on my thorough investigation of the Jacques codebase and Claude Code hook documentation, here are the key findings:

### Current Architecture

Jacques uses a **one-way reactive hook system**:
- Hooks fire at specific lifecycle points initiated by Claude Code (SessionStart, PostToolUse, SessionEnd, PreCompact, Stop, etc.)
- Hooks are configured in `~/.claude/settings.json` or `.claude/settings.json`
- All hooks in Jacques currently **send events TO Jacques server** via Unix socket (`/tmp/jacques.sock`)
- Hooks are **purely reactive**—they cannot be triggered externally

### Can Hooks Be Triggered Externally?

**No, not directly.** According to official Claude Code hooks documentation:

1. **Hooks are event-driven only**: They fire automatically when specific Claude Code lifecycle events occur
2. **No external trigger mechanism**: There is no API or mechanism to invoke hooks from external processes
3. **One-way communication**: Hooks send output to Claude Code, not the other way around
4. **Lifecycle events are internal**: SessionStart, PostToolUse, PreCompact, Stop, etc. are all initiated by Claude Code internally

The documented hook events are:
- SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PostToolUseFailure, Stop, SessionEnd, PreCompact, Notification, SubagentStart, SubagentStop, PermissionRequest

**None of these can be triggered from outside Claude Code.**

### Alternative Approaches for Handoff Triggering

Given this limitation, here are viable alternatives:

#### 1. **Use statusLine Output to Trigger Jacques Dashboard Action** (Most Feasible)
The `statusline.sh` hook outputs text that appears in Claude Code's status bar. The status bar could theoretically contain actionable instructions, but Claude Code doesn't provide a mechanism to respond to statusLine output directly.

#### 2. **Manual Trigger from Jacques Dashboard** (Currently Implemented)
Looking at your handoff code (`/Users/gole/Desktop/jacques-context-manager/core/src/handoff/catalog.ts`), handoffs are generated manually and stored in `.jacques/handoffs/`. This is the current design.

**Workaround**: Jacques dashboard could:
- Detect when context approaches critical threshold (80%+)
- Show a prominent "Generate Handoff Now" button
- When clicked, user manually runs a command like:
  ```bash
  claude /handoff --generate
  ```
- Or Jacques could generate a `.instructions.md` file that the user copies/pastes into Claude Code

#### 3. **PreCompact Hook → Handoff Generation** (Semi-Automatic)
When Claude Code fires the `PreCompact` hook (before auto-compaction):
- Hook can generate a handoff file
- User still has to paste the handoff manually
- But it's **automatic timing** (happens right when needed)

```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "auto",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.jacques/hooks/generate-handoff.py"
          }
        ]
      }
    ]
  }
}
```

#### 4. **SessionEnd Hook → Auto-Handoff** (Post-Session)
Generate handoff automatically when session ends, saved to `.jacques/handoffs/` for next session:

```json
{
  "hooks": {
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.jacques/hooks/generate-handoff-on-end.py"
          }
        ]
      }
    ]
  }
}
```

#### 5. **MCP Tool for Handoff Generation** (Claude Code Integration)
Create an MCP tool that Claude Code can invoke directly via `/mcp handoff-generator` or similar. This gives Claude full control over when to generate handoffs:

- Jacques provides MCP server already (`server/src/mcp/`)
- Add a `generate_session_handoff` tool
- Claude Code can call it anytime: "Generate a session handoff"
- User sees handoff being generated in real-time

### Fundamental Limitation

**Claude Code hooks are strictly reactive**. They respond to events Claude Code initiates, but:
- ✗ Cannot be called from external processes
- ✗ Cannot be triggered by Jacques dashboard
- ✗ Cannot respond to statusLine output
- ✗ No "pull" mechanism (hooks only "push")

This is a design choice by Anthropic—hooks are meant for automation within Claude Code's lifecycle, not for external control.

### Recommendations

**For automatic handoff generation without manual copy/paste:**

1. **Best Option**: Extend the existing MCP server to include a `generate_session_handoff` tool
   - Claude Code can invoke it with: `Generate a handoff for this session`
   - Completely automatic, user-initiated
   - Leverages existing MCP infrastructure

2. **Second Best**: Use `PreCompact` hook to auto-generate handoff before compaction
   - Hooks as a scheduled trigger when context pressure builds
   - Handoff appears in `.jacques/handoffs/` ready for next session

3. **Current Workaround**: Keep manual button in Jacques dashboard
   - User clicks "Generate Handoff"
   - Jacques creates instructions for user to copy/paste
   - Honest about the limitation but better UX than nothing

### Files Relevant to Implementation

- `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/catalog.ts` - Handoff storage
- `/Users/gole/Desktop/jacques-context-manager/server/src/mcp/` - MCP server (extensible)
- `/Users/gole/Desktop/jacques-context-manager/.claude/settings.local.json` - Example hook config

Sources:
- [Hooks reference - Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Claude Code Hooks: A Practical Guide to Workflow Automation](https://www.datacamp.com/tutorial/claude-code-hooks)