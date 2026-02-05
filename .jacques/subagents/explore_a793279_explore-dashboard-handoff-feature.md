# Explore: Explore dashboard handoff feature

> Session: `cd506061-fc7c-4e92-a166-1ef4456fc31c`
> Date: 2026-02-01
> Tokens: ~79 543

---

Now I have all the information I need. Let me create a comprehensive exploration report:

## Dashboard Create Handoff Feature - Complete Exploration Report

Based on my thorough exploration of the codebase, here's a comprehensive overview of the Create Handoff feature in the Jacques dashboard:

---

### 1. **Main Menu Component That Shows "Create Handoff" Option**

**File:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/Dashboard.tsx` (lines 597-602)

The menu is defined in the `Dashboard` component:
```tsx
const MENU_ITEMS: VerticalMenuItem[] = [
  { key: "1", label: "Save Context", enabled: true },
  { key: "2", label: "Load Context", enabled: true },
  { key: "3", label: "Create Handoff", enabled: true },
  { key: "4", label: "Settings", enabled: true },
];
```

The menu is rendered as a vertical selection menu with menu items 1-4. The "Create Handoff" option is menu item **3** and is **always enabled**. The menu displays with:
- Selected item highlighted in coral/peach (#E67E52)
- "> " prefix for selected item
- "  " prefix for unselected items
- Grayed out appearance for disabled items

---

### 2. **Handler/Logic When User Selects Create Handoff**

**File:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/App.tsx` (lines 351-414)

When the user selects option "3" (Create Handoff), the `handleMenuSelect` function is called:

```tsx
case "3": // Create Handoff (LLM-powered)
  if (!focusedSession) {
    showNotification("No active session");
    return;
  }

  if (!focusedSession.transcript_path) {
    showNotification("No transcript available for this session");
    return;
  }

  // Check if skill is installed
  const skillInstalled = await isSkillInstalled();
  if (!skillInstalled) {
    showNotification("Skill not installed: ~/.claude/skills/jacques-handoff/");
    return;
  }

  // Create abort controller for cancellation
  const abortController = new AbortController();
  setLlmAbortController(abortController);

  // Show LLM working view
  setCurrentView("llm-working");
  setLlmWorkingActive(true);
  setLlmWorkingTitle("Creating Handoff");
  setLlmWorkingDescription("Analyzing conversation and generating summary...");
  setLlmWorkingElapsedSeconds(0);
  setLlmWorkingStartTime(Date.now());

  try {
    const result = await generateHandoffWithLLM(
      focusedSession.transcript_path,
      focusedSession.workspace?.project_dir || focusedSession.cwd,
      { signal: abortController.signal }
    );

    // Clear working state
    setLlmWorkingActive(false);
    setLlmAbortController(null);
    setCurrentView("main");

    // Show success notification with token count
    const tokenDisplay = result.totalTokens.toLocaleString();
    showNotification(
      `Handoff saved: ${result.filename} (${tokenDisplay} tokens)`,
      5000
    );
  } catch (error) {
    // Clear working state
    setLlmWorkingActive(false);
    setLlmAbortController(null);
    setCurrentView("main");

    // Show error notification
    if (error instanceof ClaudeCodeError && error.message === "Cancelled by user") {
      showNotification("Handoff creation cancelled");
    } else {
      showNotification(
        `Failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  break;
```

**Flow:**
1. Validates there's an active focused session
2. Checks if `transcript_path` exists (this is where the "transcript not available" error comes from)
3. Verifies the skill is installed at `~/.claude/skills/jacques-handoff/`
4. Switches to "llm-working" view to show progress
5. Calls `generateHandoffWithLLM()` from the core module
6. On success: shows notification with filename and token count
7. On error: catches `ClaudeCodeError` for user cancellation, shows error message

---

### 3. **Where the "transcript not available" Error Comes From**

**File:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/App.tsx` (line 358)

```tsx
if (!focusedSession.transcript_path) {
  showNotification("No transcript available for this session");
  return;
}
```

**The error originates from a check on the `transcript_path` property of the focused session.** This property must exist and be a valid file path for handoff creation to proceed.

There's also a similar check for the manual handoff shortcut at line 961-963:
```tsx
const transcriptPath = focusedSession.transcript_path;
if (!transcriptPath) {
  showNotification("No transcript available");
  return;
}
```

---

### 4. **How the Dashboard Currently Tries to Get the Transcript**

The dashboard **doesn't actively fetch or search for the transcript**. Instead:

**A. It relies on the session object having `transcript_path` populated:**
- This comes from the Jacques server via WebSocket
- The server gets this from Claude Code's session metadata
- The server populates it in the `Session` type defined in `server/src/types.ts`

**B. Session data flows like this:**
1. Claude Code sends SessionStart hook → Jacques Server registers session
2. `statusLine.sh` updates context → server gets updated with available metadata
3. The `transcript_path` is provided by Claude Code's session context

**C. What happens when trying to detect transcripts (Save flow at lines 288-313):**

If `transcript_path` is not available, the App component has a fallback detection mechanism (used in Save flow, but not in Create Handoff):

```tsx
// First, try to use transcript_path from the session if available
if (focusedSession.transcript_path) {
  try {
    const { promises: fs } = await import("fs");
    const stats = await fs.stat(focusedSession.transcript_path);
    detected = { ... };
  } catch {
    detected = null;
  }
}

// Fall back to detecting from Claude projects directory by cwd
if (!detected) {
  detected = await detectCurrentSession({ cwd });
}

// Last resort: search by session ID across all projects
if (!detected) {
  detected = await findSessionById(focusedSession.session_id);
}
```

**However, this fallback is NOT implemented in the Create Handoff flow** - it directly checks and fails if `transcript_path` is missing.

---

### 5. **The LLM Handoff Generation Process**

**File:** `/Users/gole/Desktop/jacques-context-manager/core/src/handoff/llm-generator.ts`

Once transcript is available, the LLM handoff generator:

1. **Reads the skill prompt** from `~/.claude/skills/jacques-handoff/SKILL.md`
2. **Reads the transcript** from the provided path
3. **Spawns Claude Code CLI** with:
   - System prompt: The skill file content
   - User prompt: The transcript
   - Allowed tools: Read, Write, Glob, Grep
   - Output format: JSON
4. **Parses the response** and extracts:
   - `content`: The handoff markdown
   - `inputTokens`: Tokens used
   - `outputTokens`: Tokens generated
5. **Saves the handoff** to `.jacques/handoffs/{timestamp}-handoff.md`

---

### 6. **Session Object Structure**

The `transcript_path` is part of the `Session` type. Sessions include:
- `session_id`: Unique identifier
- `project`: Project name/path
- `cwd`: Current working directory
- `workspace`: Workspace metadata (with `project_dir`)
- `transcript_path`: Path to the JSONL transcript file (this is what's checked)
- `context_metrics`: Token usage information
- `session_title`: Generated title
- `source`: Origin (claude_code, cursor)
- `terminal`: Terminal metadata

---

### 7. **Alternative Handoff Generation Methods**

The dashboard supports **three ways to create handoffs:**

**A. Menu option "3" (Create Handoff) - LLM powered**
- Uses `generateHandoffWithLLM()` 
- Requires skill installed
- Shows progress in LLM working view
- Returns detailed token usage

**B. Keyboard shortcut [c] - Fast rule-based**
- Uses `generateHandoffFromTranscript()`
- No skill required
- Rule-based extraction (files, tools, recent messages)
- Faster but less intelligent

**C. Keyboard shortcut [H] - Browse existing handoffs**
- Lists handoffs from `.jacques/handoffs/`
- User can copy any existing handoff
- Shows token estimates and timestamps

---

### **Summary of Key Files**

| File | Purpose |
|------|---------|
| `dashboard/src/components/Menu.tsx` | Menu item definitions (not used in current impl) |
| `dashboard/src/components/Dashboard.tsx` | Dashboard main component with menu items |
| `dashboard/src/components/App.tsx` | Event handlers (line 251-414 for Create Handoff logic) |
| `dashboard/src/components/HandoffBrowserView.tsx` | UI for browsing existing handoffs |
| `core/src/handoff/llm-generator.ts` | LLM-powered handoff generation |
| `core/src/handoff/generator.ts` | Rule-based handoff generation |
| `core/src/handoff/catalog.ts` | Handoff file management and listing |
| `core/src/handoff/prompts.ts` | Handoff invocation prompts |

---

This comprehensive exploration shows that the Create Handoff feature is well-integrated into the dashboard menu system, with clear error handling and multiple generation strategies depending on user needs and available tools.