# Platform & Terminal Support

This document describes Jacques' cross-platform support for detecting Claude Code sessions across different operating systems and terminal emulators.

## Overview

Jacques detects running Claude Code sessions at startup using:
1. **Process scanning** - Find running `claude` processes
2. **Terminal identification** - Match processes to terminal windows
3. **Session file matching** - Link processes to JSONL transcript files

## Supported Platforms

| Platform | Status | Process Detection | Terminal ID | Notes |
|----------|--------|-------------------|-------------|-------|
| macOS | Full | `pgrep`, `lsof` | Yes | Primary development platform |
| Linux | Full | `pgrep`, `lsof`, `/proc` | Yes | Uses /proc for env vars |
| Windows | Full | PowerShell | Partial | Requires PowerShell 5.1+ |

## Terminal Support

### macOS Terminals

| Terminal | Env Variable | Detection | Focus Detection |
|----------|--------------|-----------|-----------------|
| **iTerm2** | `ITERM_SESSION_ID` | Excellent | AppleScript |
| **Terminal.app** | `TERM_SESSION_ID` | Good | AppleScript |
| **Kitty** | `KITTY_WINDOW_ID` | Excellent | - |
| **WezTerm** | `WEZTERM_PANE` | Excellent | - |
| **Alacritty** | None | TTY fallback | - |
| **VS Code** | `VSCODE_INJECTION` | Good | - |
| **Hyper** | None | TTY fallback | - |

### Windows Terminals

| Terminal | Env Variable | Detection | Notes |
|----------|--------------|-----------|-------|
| **Windows Terminal** | `WT_SESSION` | Good | GUID per session |
| **PowerShell** | None | PID fallback | Standard console |
| **cmd.exe** | None | PID fallback | Standard console |
| **VS Code** | `VSCODE_INJECTION` | Good | Integrated terminal |
| **ConEmu** | `ConEmuANSI` | Partial | Third-party |

### Linux Terminals

| Terminal | Env Variable | Detection | Notes |
|----------|--------------|-----------|-------|
| **GNOME Terminal** | `VTE_VERSION` | Partial | - |
| **Konsole** | `KONSOLE_VERSION` | Partial | - |
| **Kitty** | `KITTY_WINDOW_ID` | Excellent | Same as macOS |
| **WezTerm** | `WEZTERM_PANE` | Excellent | Same as macOS |
| **Alacritty** | `WINDOWID` | Partial | X11 window ID |
| **VS Code** | `VSCODE_INJECTION` | Good | - |

## How Session Detection Works

### Step 1: Process Enumeration

**macOS/Linux:**
```bash
# Find Claude processes
pgrep -x claude

# Get TTY for process
ps -o tty= -p $PID

# Get working directory
lsof -p $PID | grep cwd | awk '{print $NF}'
```

**Windows (PowerShell):**
```powershell
# Find Claude processes with working directory
Get-Process -Name claude | ForEach-Object {
  $wmi = Get-WmiObject Win32_Process -Filter "ProcessId=$($_.Id)"
  @{
    PID = $_.Id
    CWD = Split-Path -Parent $wmi.ExecutablePath
    WT_SESSION = $env:WT_SESSION
  }
}
```

### Step 2: Session File Matching

1. Encode CWD to Claude's path format: `/Users/gole/project` → `-Users-gole-project`
2. Look in `~/.claude/projects/{encoded-path}/`
3. Find all `.jsonl` files modified within 60 seconds (active sessions)
4. Fall back to most recent file if none active
5. Parse first 50 lines for `sessionId`, `gitBranch`, title

### Step 3: Multi-Session Detection

When multiple Claude processes run in the same directory:

1. Group processes by CWD
2. Find ALL active session files (modified < 60s ago)
3. Match N processes to M session files by recency
4. Create unique terminal keys for each:
   - With terminal session ID: `DISCOVERED:iTerm2:uuid`
   - With TTY: `DISCOVERED:TTY:ttys001:12345`
   - Fallback: `DISCOVERED:PID:12345`

### Step 4: Hook Upgrade

When hooks fire (SessionStart, statusLine), the discovered session is upgraded:
- Terminal key changes from `DISCOVERED:*` to actual key (e.g., `ITERM:uuid`)
- Full terminal identity captured
- Model, autocompact settings populated

## Terminal Key Format

Terminal keys uniquely identify terminal instances:

| Format | Example | Source |
|--------|---------|--------|
| `ITERM:{session_id}` | `ITERM:w0t0p0:ABC123` | iTerm2 hook |
| `KITTY:{window_id}` | `KITTY:42` | Kitty hook |
| `WEZTERM:{pane}` | `WEZTERM:pane:0` | WezTerm hook |
| `WT:{session}` | `WT:{GUID}` | Windows Terminal |
| `TTY:{tty}` | `TTY:/dev/ttys001` | Unix TTY |
| `PID:{pid}` | `PID:12345` | Fallback |
| `DISCOVERED:*` | `DISCOVERED:TTY:ttys001:12345` | Startup scan |
| `AUTO:{session_id}` | `AUTO:abc-123` | Auto-registered |

## Environment Variables Reference

### Terminal Identification

| Variable | Set By | Value |
|----------|--------|-------|
| `ITERM_SESSION_ID` | iTerm2 | `w{window}t{tab}p{pane}:{uuid}` |
| `TERM_SESSION_ID` | Terminal.app | UUID |
| `KITTY_WINDOW_ID` | Kitty | Integer |
| `WEZTERM_PANE` | WezTerm | `pane:{id}` |
| `WT_SESSION` | Windows Terminal | GUID |
| `WT_PROFILE_ID` | Windows Terminal | GUID |
| `VSCODE_INJECTION` | VS Code | `true` |
| `WINDOWID` | X11 | Integer |
| `TERM_PROGRAM` | Various | Terminal name |
| `TERM` | Shell | Terminal type |

### Captured by Hooks

The hooks capture these environment variables and send them to Jacques:
- `TTY` / `tty` - Unix TTY device
- `TERM_PROGRAM` - Terminal application name
- `ITERM_SESSION_ID` - iTerm2 session UUID
- `TERM_SESSION_ID` - Terminal.app session ID
- `KITTY_WINDOW_ID` - Kitty window identifier
- `WEZTERM_PANE` - WezTerm pane identifier
- `VSCODE_INJECTION` - VS Code terminal marker
- `WINDOWID` - X11 window ID

## Implementation Files

| File | Purpose |
|------|---------|
| `server/src/process-scanner.ts` | Cross-platform process detection |
| `server/src/session-registry.ts` | Session registration and matching |
| `server/src/start-server.ts` | Startup scan integration |
| `server/src/focus-watcher.ts` | Terminal focus detection (macOS) |
| `hooks/adapters/terminal_key.py` | Terminal key generation |

## Platform-Specific Notes

### macOS

- Full support for all major terminals
- Focus detection uses AppleScript (iTerm2, Terminal.app)
- Can detect terminal from environment at hook time
- Cannot read process environment without hooks (security)

### Linux

- Process environment readable via `/proc/{pid}/environ`
- No terminal focus detection (window manager dependent)
- X11 `WINDOWID` available for some terminals

### Windows

- Requires PowerShell 5.1+ (pre-installed on Windows 10/11)
- No TTY concept - uses PID-based identification
- `WT_SESSION` can be inherited by child processes (false positives)
- Working directory detection less reliable than Unix

## Limitations

1. **Startup detection timing**: Sessions must have recent file activity to be detected
2. **Same-directory sessions**: Matched by recency, not guaranteed accurate
3. **Windows CWD**: May return executable path, not actual working directory
4. **Terminal focus (Windows)**: Not implemented yet
5. **Environment inheritance**: Some terminal vars inherited by child processes

## Troubleshooting

### Sessions not detected at startup

1. Check if Claude process is running: `pgrep -x claude` (macOS/Linux)
2. Verify JSONL file exists: `ls ~/.claude/projects/*/`
3. Check file modification time (must be < 60 seconds old)

### Wrong terminal matched

1. Terminal key is best-effort at startup
2. Will be corrected when hooks fire
3. Check logs for "Updating discovered session"

### Windows detection failing

1. Ensure PowerShell is available: `powershell.exe -Command "echo test"`
2. Check execution policy: `Get-ExecutionPolicy`
3. Verify Claude process name: `Get-Process | Where-Object Name -like "*claude*"`

## Future Improvements

- [ ] Windows terminal focus detection
- [ ] Better same-directory session matching using file locks
- [ ] ConEmu/cmder support
- [ ] tmux/screen session detection
- [ ] WSL integration
