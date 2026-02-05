# Explore: Explore terminal identity tracking

> Session: `6fd059b5-b21d-406b-8867-285c2ad0cf98`
> Date: 2026-02-03
> Tokens: ~63 407

---

Excellent! Now I have all the information I need. Let me compile a comprehensive report of my findings.

## Terminal Identity Tracking in Jacques - Complete Research Report

Based on my thorough analysis of the Jacques codebase, here's a comprehensive breakdown of how terminal identity is tracked and what OS-level identifiers are captured:

---

### 1. Terminal Identity Data Structure

The core terminal identity information is defined in `/Users/gole/Desktop/jacques-context-manager/server/src/types.ts` (lines 16-27) as the `TerminalIdentity` interface:

```typescript
export interface TerminalIdentity {
  tty: string | null;                    // Terminal device file
  terminal_pid: number;                  // Parent process ID
  term_program: string | null;           // Terminal application name
  iterm_session_id: string | null;       // iTerm2 unique session ID
  term_session_id: string | null;        // macOS Terminal.app session ID
  kitty_window_id: string | null;        // Kitty terminal window ID
  wezterm_pane: string | null;           // WezTerm pane identifier
  vscode_injection: string | null;       // VS Code integrated terminal marker
  windowid: string | null;               // Generic X11/Wayland window ID
  term: string | null;                   // TERM environment variable
}
```

---

### 2. Environment Variables Captured

The hook system captures these environment variables to identify the terminal:

| Environment Variable | Terminal | Description | OS-Level Mapping |
|----------------------|----------|-------------|------------------|
| `ITERM_SESSION_ID` | iTerm2 | Unique session ID for iTerm2 tabs | macOS AppleScript accessible |
| `TERM_SESSION_ID` | macOS Terminal.app | Session identifier | macOS Terminal.app property |
| `TERM_PROGRAM` | Any | Name of terminal application | Set by terminal emulator |
| `KITTY_WINDOW_ID` | Kitty | Window identifier | Kitty-specific variable |
| `WEZTERM_PANE` | WezTerm | Pane identifier | WezTerm-specific variable |
| `VSCODE_INJECTION` | VS Code | Integrated terminal marker | VS Code-specific variable |
| `WINDOWID` | X11/Wayland | X11 window ID | X11/Wayland window system |
| `TERM` | Any | Terminal type (xterm, alacritty, etc.) | Terminal capability database |

---

### 3. Terminal Key Generation (Priority-Based)

The `build_terminal_key()` function (in `/Users/gole/Desktop/jacques-context-manager/hooks/adapters/base.py` lines 346-362) creates a unique identifier using this priority:

```python
def build_terminal_key(self, terminal: dict) -> str:
    """Build a unique key for this terminal instance."""
    # Priority: iTerm > Kitty > WezTerm > TTY > PID
    if terminal.get("iterm_session_id"):
        return f"ITERM:{terminal['iterm_session_id']}"
    if terminal.get("kitty_window_id"):
        return f"KITTY:{terminal['kitty_window_id']}"
    if terminal.get("wezterm_pane"):
        return f"WEZTERM:{terminal['wezterm_pane']}"
    if terminal.get("tty"):
        return f"TTY:{terminal['tty']}"
    if terminal.get("terminal_pid"):
        return f"PID:{terminal['terminal_pid']}"
    return f"UNKNOWN:{time.time()}"
```

**Terminal Key Format Examples:**
- `ITERM:3BB6FF6B-BBD5-428D-96C0-8C2EB16ABCDE` (iTerm2 session)
- `KITTY:1` (Kitty window)
- `WEZTERM:pane-5` (WezTerm pane)
- `TTY:/dev/ttys000` (macOS TTY device)
- `PID:12345` (Process ID fallback)
- `AUTO:session-abc123` (Auto-registered sessions without terminal info)

---

### 4. How Terminal Identity is Captured

#### In Hook Scripts

The capture happens in `/Users/gole/Desktop/jacques-context-manager/hooks/jacques-register-session.py` (lines 85-115) and `/Users/gole/Desktop/jacques-context-manager/hooks/adapters/base.py` (lines 310-344):

**TTY Detection (device file):**
```python
tty = None
try:
    if sys.stdin.isatty():
        tty = os.ttyname(sys.stdin.fileno())  # Get /dev/ttysXXX
except:
    pass

if not tty:
    try:
        result = os.popen("tty 2>/dev/null").read().strip()
        if result and result != "not a tty":
            tty = result
    except:
        pass
```

**Process ID:**
```python
terminal_pid: os.getppid()  # Parent process ID of the shell
```

**All Environment Variables:**
```python
return {
    "tty": tty,
    "terminal_pid": os.getppid(),
    "term_program": os.environ.get("TERM_PROGRAM"),
    "iterm_session_id": os.environ.get("ITERM_SESSION_ID"),
    "term_session_id": os.environ.get("TERM_SESSION_ID"),
    "kitty_window_id": os.environ.get("KITTY_WINDOW_ID"),
    "wezterm_pane": os.environ.get("WEZTERM_PANE"),
    "vscode_injection": os.environ.get("VSCODE_INJECTION"),
    "windowid": os.environ.get("WINDOWID"),
    "term": os.environ.get("TERM"),
}
```

---

### 5. Server-Side Terminal Focus Watcher

Jacques has a sophisticated **macOS-specific focus watcher** (`/Users/gole/Desktop/jacques-context-manager/server/src/focus-watcher.ts`) that monitors which terminal window has focus using AppleScript:

**Supported Terminal Applications:**
- iTerm2 / iTerm
- Terminal.app
- Alacritty
- Kitty
- WezTerm
- Hyper

**macOS Integration Methods:**

1. **Get Frontmost Application:**
```typescript
osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'
```

2. **iTerm2 Session ID (current active tab):**
```typescript
osascript -e 'tell application "iTerm2" to tell current session of current tab of current window to return unique ID'
```

3. **Terminal.app TTY (current active tab):**
```typescript
osascript -e 'tell application "Terminal" to return tty of selected tab of front window'
```

The focus watcher polls every 500ms (configurable) and builds the same terminal keys as the hooks do, matching the format exactly.

---

### 6. Session Metadata Storage

Each session stores the full terminal identity. In `session-registry.ts` (lines 85-104):

```typescript
const session: Session = {
  session_id: event.session_id,
  source: source,
  // ... other fields ...
  terminal: event.terminal,        // Full TerminalIdentity object
  terminal_key: event.terminal_key, // Derived unique key
  // ...
};
```

The `terminal_key` is the primary field used for:
- Auto-focus detection
- Matching sessions to focused windows
- Uniquely identifying terminal windows

---

### 7. Flow: From Hook to Server to Focus Detection

1. **Hook Registers Session:**
   - Hook captures all terminal environment variables
   - Calls `get_terminal_identity()` to gather TTY and ENV vars
   - Calls `build_terminal_key()` to create unique identifier
   - Sends `session_start` event with `terminal` object and `terminal_key`

2. **Server Receives Event:**
   - SessionRegistry stores both `terminal` object and `terminal_key`
   - `terminal_key` is used for focus matching

3. **Focus Watcher Monitors macOS:**
   - Polls which terminal app is in focus
   - Gets iTerm session ID or Terminal.app TTY using AppleScript
   - Builds matching `terminal_key`
   - Could be used to auto-select the focused session

4. **Future Session Matching:**
   - When a new session arrives, its `terminal_key` is compared
   - Sessions from the same terminal window have matching keys
   - Allows tracking which terminal initiated which session

---

### 8. OS-Level Window Identifiers Captured

| Identifier | Type | OS-Level | Scope | Reliability |
|-----------|------|----------|-------|-------------|
| `ITERM_SESSION_ID` | UUID string | macOS | iTerm2 session tab | Highest - built-in iTerm2 |
| `tty` (/dev/ttysXXX) | Device file | macOS/Unix | Terminal device | High - OS-level |
| `terminal_pid` | Process ID | All Unix | Parent shell process | Medium - PID can be reused |
| `TERM_SESSION_ID` | String | macOS | Terminal.app session | High - Terminal.app built-in |
| `KITTY_WINDOW_ID` | String | All (Kitty) | Kitty window | High - Kitty-specific |
| `WEZTERM_PANE` | String | All (WezTerm) | WezTerm pane | High - WezTerm-specific |
| `WINDOWID` | X11 Window ID | X11/Linux | X11 window | Medium - depends on WM |
| `TERM` | String | All | Terminal type | Low - only identifies type, not window |

---

### 9. Auto-Registration Behavior

If a `context_update` event arrives before `session_start`, the registry auto-creates a session with:
```typescript
terminal_key: `AUTO:${event.session_id}`
```

This is replaced when `session_start` arrives with the real terminal identity (session-registry.ts, lines 264-267).

---

### 10. Multi-Source Support Pattern

The adapter pattern allows new AI tools to be added. Each adapter implements:
- `get_terminal_identity()` (from BaseAdapter)
- `build_terminal_key()` (from BaseAdapter)
- These are identical across all adapters, capturing the same environment variables

Existing adapters:
- `claude_code.py` - Claude Code CLI
- `cursor.py` - Cursor Native AI
- `template.py` - Template for new tools

---

### Summary: What Gets Captured

**Per Session Registration:**
1. Full `TerminalIdentity` object with 10 fields
2. Derived `terminal_key` (prioritized unique identifier)
3. `terminal_pid` (parent process ID)

**Key Terminal Window Identifiers:**
- **iTerm2:** ITERM_SESSION_ID (UUID)
- **macOS Terminal.app:** tty device file
- **Kitty:** KITTY_WINDOW_ID
- **WezTerm:** WEZTERM_PANE
- **Generic:** TTY device, PID, or TERM variable

**macOS-Specific Focus Watcher:**
- Monitors frontmost application via AppleScript
- Extracts iTerm session ID or Terminal.app TTY for focused window
- Polls every 500ms
- Could enable auto-focus based on which terminal window is active

---

This architecture allows Jacques to uniquely identify terminal windows across sessions and potentially implement terminal-window-aware focus detection on macOS.