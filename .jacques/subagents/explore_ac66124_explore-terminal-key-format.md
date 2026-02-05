# Explore: Explore terminal key format

> Session: `140f7e47-bbca-4654-9982-fe180f5ee2bc`
> Date: 2026-02-03
> Tokens: ~44 741

---

Perfect! Now I have all the information. Let me create a comprehensive report of how terminal_key is constructed.

## Terminal Key Construction Format

I found the exact code that builds the `terminal_key` string across the codebase. Here's how it's constructed:

### Python Implementation (hooks/adapters/base.py, lines 346-362)

```python
def build_terminal_key(self, terminal: dict) -> str:
    """
    Build a unique key for this terminal instance.
    
    Priority: iTerm > Kitty > WezTerm > TTY > PID
    """
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

### Bash Implementation (hooks/statusline.sh, lines 149-164)

```bash
# Capture terminal identity for focus detection
iterm_session_id="${ITERM_SESSION_ID:-}"
term_session_id="${TERM_SESSION_ID:-}"
kitty_window_id="${KITTY_WINDOW_ID:-}"
terminal_pid="$$"

# Build terminal_key (same logic as jacques-register-session.py)
if [ -n "$iterm_session_id" ]; then
  terminal_key="ITERM:$iterm_session_id"
elif [ -n "$kitty_window_id" ]; then
  terminal_key="KITTY:$kitty_window_id"
elif [ -n "$term_session_id" ]; then
  terminal_key="TERM:$term_session_id"
else
  terminal_key=""
fi
```

### Terminal Key Formats

At runtime, the `terminal_key` uses the following prefixes and formats:

| Prefix | Format | Example | Source |
|--------|--------|---------|--------|
| `ITERM` | `ITERM:{session_id}` | `ITERM:w0t1p0` | `$ITERM_SESSION_ID` environment variable |
| `KITTY` | `KITTY:{window_id}` | `KITTY:1` | `$KITTY_WINDOW_ID` environment variable |
| `WEZTERM` | `WEZTERM:{pane_id}` | `WEZTERM:pane:0` | `$WEZTERM_PANE` environment variable (Python only) |
| `TERM` | `TERM:{session_id}` | `TERM:123.456` | `$TERM_SESSION_ID` environment variable (Bash only) |
| `TTY` | `TTY:{tty_path}` | `TTY:/dev/ttys000` | Result of `os.ttyname()` or `tty` command |
| `PID` | `PID:{pid}` | `PID:12345` | `os.getppid()` (parent process ID) |
| `AUTO` | `AUTO:{session_id}` | `AUTO:abc123def` | Server-side fallback when session is auto-registered from context_update before SessionStart fires |
| `UNKNOWN` | `UNKNOWN:{timestamp}` | `UNKNOWN:1707000000.123` | Fallback when no other identifiers available (Python only) |

### Priority Order

The terminal_key is built with a strict priority order (first match wins):

**Python (base.py)**: `ITERM` > `KITTY` > `WEZTERM` > `TTY` > `PID` > `UNKNOWN`

**Bash (statusline.sh)**: `ITERM` > `KITTY` > `TERM` > (empty string if none match)

Note: The Bash version is simpler and doesn't have `WEZTERM`, `TTY`, `PID`, or `UNKNOWN` fallbacks.

### Terminal Identity Data Collected (base.py, lines 310-344)

The underlying terminal dictionary collects these environment variables:

```python
def get_terminal_identity(self) -> dict:
    """Get terminal-specific identifiers from environment and system."""
    return {
        "tty": tty,                              # From os.ttyname() or 'tty' command
        "terminal_pid": os.getppid(),            # Parent process ID
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

### Server-Side Usage (session-registry.ts, lines 192-193, 264-266)

When sessions are auto-registered before SessionStart fires, the server assigns a temporary `AUTO:` prefixed key:

```typescript
terminal_key: `AUTO:${event.session_id}`,  // Line 192
```

This is later updated when the full SessionStart event arrives with a proper terminal_key:

```typescript
if (event.terminal_key && event.terminal_key !== '' && session.terminal_key.startsWith('AUTO:')) {
  this.log(`[Registry] Updating terminal_key from context_update: ${session.terminal_key} -> ${event.terminal_key}`);
  session.terminal_key = event.terminal_key;
}
```