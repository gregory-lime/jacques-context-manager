# Explore: Research OS window focusing APIs

> Session: `6fd059b5-b21d-406b-8867-285c2ad0cf98`
> Date: 2026-02-03
> Tokens: ~39 364

---

Perfect! I now have comprehensive information. Let me compile a thorough research report on terminal window focusing capabilities.

## Comprehensive Research Report: Terminal Window Focusing on macOS and Windows

Based on my research, here's a detailed analysis of how to programmatically bring terminal windows to focus across different platforms and terminals.

---

### **macOS Terminal Window Focusing**

#### **iTerm2 (Best Support)**

**What's Possible:**
- **Activate specific sessions by UUID** ✅
  - Using iTerm2's Python API: `await session.async_activate()` brings a session to the front
  - Can activate specific tabs (windows with multiple tabs)
  - Options to bring the terminal app to front AND give it keyboard focus
  - AppleScript approach: `tell application "iTerm" to activate` (app-level only)

**Implementation Methods:**
1. **Python API (Direct)** - Most reliable
   - Get session by ID: `app.get_session_by_id(session_id)`
   - Call `async_activate()` on the session object
   - Directly supported in iTerm2 0.26+ Python API

2. **AppleScript (Limited)**
   - Can tell iTerm to activate, but only activates the app, not specific windows/tabs
   - Requires AppleScript automation permission in System Preferences > Security & Privacy > Automation

3. **it2 CLI tool** - For command-line access to iTerm2
   - GitHub: [tmc/it2](https://github.com/tmc/it2)
   - Go-based, can list and interact with sessions

**Limitations:**
- AppleScript alone cannot activate a specific window/tab without activating all other windows in the app
- Requires iTerm2 to be installed (not Terminal.app)

**Documentation:**
- [iTerm2 Scripting Documentation](https://iterm2.com/documentation-scripting.html)
- [iTerm2 Python API - Session](https://iterm2.com/python-api/session.html)
- [iTerm2 Python API Examples](https://iterm2.com/python-api/examples/set_title_forever.html)

---

#### **Terminal.app (Very Limited)**

**What's Possible:**
- Create new tabs and windows ✅
- Run commands in tabs ✅
- **Activate specific tabs:** ❌ NOT POSSIBLE

**Key Limitation:**
- AppleScript cannot activate a specific window without activating ALL windows of the app simultaneously
- This is a fundamental macOS AppleScript limitation

**Workaround:**
- Use Window Groups (save tab configuration, reopen with same layout)
- Terminal.app has limited scripting compared to iTerm2

**Documentation:**
- [Apple Support: Open Terminal Windows/Tabs](https://support.apple.com/guide/terminal/open-new-terminal-windows-and-tabs-trmlb20c7888/mac)

---

#### **Kitty Terminal**

**What's Possible:**
- **Focus specific windows/tabs by ID** ✅
- **Focus by title, PID, CWD** ✅
- Remote control protocol for window management

**Implementation:**
```bash
# Focus window by ID
kitten @ focus-window --match id:1

# Focus by title
kitten @ focus-window --match title:mywindow

# Focus by PID
kitten @ focus-window --match pid:12345

# Focus by working directory
kitten @ focus-window --match cwd:/path/to/dir
```

**Requirements:**
- Add to `kitty.conf`: `allow_remote_control yes`
- Or use: `kitty --listen-on=unix:/tmp/mykitty` or `kitty --listen-on=tcp:localhost:12345`

**Window ID:**
- Kitty provides `KITTY_WINDOW_ID` environment variable (NOT standard X11 `WINDOWID`)
- Access window IDs through remote control protocol

**Documentation:**
- [Kitty Remote Control Documentation](https://sw.kovidgoyal.net/kitty/remote-control/)
- [Kitty CLI Interface](https://sw.kovidgoyal.net/kitty/invocation/)
- [Kitty focus-window action](https://man.archlinux.org/man/extra/kitty/kitten-@-focus-window.1.en)

---

#### **WezTerm**

**What's Possible:**
- **Focus specific panes by ID** ✅
- **CLI activation** ✅
- **Lua API for pane activation** ✅

**Implementation:**
```bash
# CLI method
wezterm cli activate-pane --pane-id <id>

# Interactive pane selection (shows labeled overlay)
wezterm cli activate-pane  # Shows PaneSelect modal
```

**Lua API:**
```lua
-- In Lua config
local mux = wezterm.mux
pane:activate()  -- Activates pane and its containing tab
```

**Pane ID Access:**
- Panes have unique IDs accessible through `wezterm cli list-panes`

**Documentation:**
- [WezTerm activate-pane CLI](https://wezterm.org/cli/cli/activate-pane.html)
- [WezTerm PaneSelect action](https://wezterm.org/config/lua/keyassignment/PaneSelect.html)
- [WezTerm pane.activate() API](https://wezterm.org/config/lua/pane/activate.html)

---

#### **Alacritty (Very Limited)**

**What's Possible:**
- Create new windows via IPC ⚠️
- Focus new windows: **NOT YET IMPLEMENTED**

**Current State:**
- IPC messaging system exists (`alacritty msg create-window`)
- Feature request exists for window focus on creation (#8282)
- Not yet available in stable releases

**Workaround:**
- No built-in way to focus existing Alacritty windows from command line
- Manual GNOME shortcuts or keyboard binding workarounds only

**Status:**
- This is a known limitation/requested feature

---

#### **VS Code Integrated Terminal**

**What's Possible:**
- **Focus terminal panel within VS Code** ✅
- **Bring VS Code window to front** ✅

**Method:**
- VS Code command: `workbench.action.terminal.focus`
- Integrates with VS Code's focus system

**External Terminal Limitation:**
- Cannot externally focus VS Code terminal from outside process
- External terminals opened by VS Code often hide behind the editor window
- Current issue (#139215): "code from terminal not transferring focus to a vs code window on macOS"

**Documentation:**
- [VS Code Terminal Basics](https://code.visualstudio.com/docs/terminal/basics)
- [VS Code Terminal Advanced](https://code.visualstudio.com/docs/terminal/advanced)

---

### **macOS System-Level Window Activation (Node.js)**

#### **Node.js Libraries**

**node-window-manager** ⭐ Most Complete
- [GitHub: sentialx/node-window-manager](https://github.com/sentialx/node-window-manager)
- [npm: node-window-manager](https://www.npmjs.com/package/node-window-manager)
- Supports macOS, Windows, Linux
- Requires accessibility permissions
- Provides: `windowManager.requestAccessibility()` to trigger system dialog

**mac-focus-window** (Specialized)
- [GitHub: karaggeorge/mac-focus-window](https://github.com/karaggeorge/mac-focus-window)
- Lightweight, focused on bringing windows to front
- Requires accessibility permissions
- Method: `canRequestAccess()` to check without prompting user

**node-mac-permissions** (Permission Management)
- [GitHub: codebytere/node-mac-permissions](https://www.npmjs.com/package/node-mac-permissions)
- Check and manage macOS system permissions
- Handles Accessibility, Input Monitoring, Speech Recognition, etc.

**macos_accessibility_client** (Query-only)
- [GitHub: ahkohd/macos_accessibility_client](https://github.com/ahkohd/macos_accessibility_client)
- Only supports checking if app is trusted accessibility client (no focusing)

#### **macOS Accessibility Permissions (Critical)**

**Permission Type:** Accessibility (Privacy & Security settings)

**Requirements:**
- App must request permission first time
- User must manually approve in System Preferences > Security & Privacy > Accessibility
- Cannot be granted programmatically - must open System Preferences

**Limitation:**
- No API exists to programmatically request Accessibility access
- Calling `windowManager.requestAccessibility()` opens System Preferences manually

**Documentation:**
- [Apple Support: Allow accessibility apps to access your Mac](https://support.apple.com/guide/mac-help/allow-accessibility-apps-to-access-your-mac-mh43185/mac)
- [Apple Accessibility Programming Guide](https://developer.apple.com/library/archive/documentation/Accessibility/Conceptual/AccessibilityMacOSX/)

---

### **Windows Terminal Window Focusing**

#### **Windows Terminal (Tabs)**

**What's Possible:**
- **Focus specific tabs at launch** ✅
- **Chain multiple pane operations** ✅

**Implementation:**
```powershell
# Focus tab 1
wt focus-tab -t 1

# From PowerShell (escape semicolons with backticks)
wt new-tab -p "Ubuntu-18.04" `; focus-tab -t 1

# Or use stop-parsing operator
wt --% new-tab -p "Ubuntu-18.04" ; focus-tab -t 1
```

**Limitations:**
- Can only focus tabs specified in command-line arguments at launch
- Cannot dynamically focus existing tabs in running Terminal
- Must use backtick escaping or stop-parsing operator in PowerShell

**Documentation:**
- [Windows Terminal Command Line Arguments](https://learn.microsoft.com/en-us/windows/terminal/command-line-arguments)
- [Windows Terminal Actions](https://learn.microsoft.com/en-us/windows/terminal/customize-settings/actions)
- [Windows Terminal Tips & Tricks](https://learn.microsoft.com/en-us/windows/terminal/tips-and-tricks)

---

#### **PowerShell Window Focus (Generic)**

**What's Possible:**
- **Bring any window to foreground** ✅
- **Find window by process/title** ✅

**Implementation via Win32 API:**
```powershell
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
  }
"@

# Get window and focus it
[Win32]::SetForegroundWindow($windowHandle)
```

**Process:**
1. Find window handle using `FindWindow` or `GetWindowByTitle`
2. Use `SetForegroundWindow` to bring to front
3. Use `ShowWindow` to ensure visible

**Restrictions:**
- SetForegroundWindow has strict security restrictions
- Only works if:
  - Calling process is a desktop application (not UWP)
  - Foreground process hasn't called `LockSetForegroundWindow`
  - Or there's been some idle time in foreground

**Important:** 
- Background processes cannot immediately steal focus
- Windows will flash taskbar button instead if foreground app is active
- User may need to click to give focus

**Documentation:**
- [SetForegroundWindow (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setforegroundwindow)
- [GetForegroundWindow (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getforegroundwindow)
- [AllowSetForegroundWindow (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-allowsetforegroundwindow)
- [P/Invoke: SetForegroundWindow](https://www.pinvoke.net/default.aspx/user32.SetForegroundWindow)

---

### **Node.js Window Management (Windows)**

#### **win32-api** ⭐ Best Option
- [GitHub: deskbtm/win32-ffi](https://github.com/deskbtm/win32-ffi)
- [npm: win32-api](https://www.npmjs.com/package/win32-api)
- Provides FFI bindings to user32.dll, kernel32.dll, comctl32.dll
- Supports calling SetForegroundWindow, FindWindow, etc.

#### **node-process-windows**
- [GitHub: bryphe/node-process-windows](https://github.com/bryphe/node-process-windows)
- [npm: node-process-windows](https://www.npmjs.com/package/node-process-windows)
- Higher-level API: `focusWindow()` method
- More user-friendly than raw FFI

#### **forcefocus**
- [GitHub: robinwassen/forcefocus](https://github.com/robinwassen/forcefocus)
- Prebuilt native binaries for Windows, macOS, Linux
- Downloaded on install
- "Force" focus capability (attempts to bypass restrictions)

#### **Modern Alternatives (Recommended)**
- **Koffi** and **libwin32** - More reliable than legacy node-ffi
- [How to Invoke Win32 API in Node.js with libwin32 and Koffi](https://docs.lextudio.com/blog/invoke-win32-api-nodejs-libwin32-koffi/)
- Avoid node-ffi-napi - becomes outdated with Node.js versions

**Note:** Old node-ffi is deprecated; modern libraries provide better stability.

---

### **Cross-Platform Solutions**

#### **node-window-manager** (Best for Cross-Platform)
- [GitHub: sentialx/node-window-manager](https://github.com/sentialx/node-window-manager)
- Supports Windows, macOS, Linux
- Unified API across platforms
- Method: `getWindowByTitle()`, then `.focus()` or `.setForeground()`

#### **Electron-Based Approach**
If your Node.js app is Electron-based:
- Use Electron's `BrowserWindow.focus()` for your own window
- External window focusing has same platform limitations as native

---

### **Summary: Focusing Capabilities by Terminal**

| Terminal | Tab Focus | Pane Focus | Method | Reliability | Notes |
|----------|-----------|------------|--------|-------------|-------|
| **iTerm2** | ✅ Full | ✅ Full | Python API / UUID | Excellent | Best on macOS |
| **Terminal.app** | ❌ No | N/A | AppleScript | N/A | Fundamental limitation |
| **Kitty** | ✅ Full | ✅ Full | Remote control CLI | Excellent | Requires config |
| **WezTerm** | ✅ Full | ✅ Full | CLI / Lua | Excellent | Window/pane IDs available |
| **Alacritty** | ❌ No | ❌ No | N/A | N/A | Feature not implemented |
| **VS Code** | ✅ Internal | ✅ Internal | Commands | Good | Only within VS Code |
| **Windows Terminal** | ✅ Launch-time | N/A | CLI args | Good | Can't focus existing tabs |
| **Generic (Win)** | ✅ Any | N/A | Win32 API | Moderate | Subject to OS restrictions |

---

### **Your Session Identifiers - Mapping to Focus Methods**

Based on your available identifiers:

| Identifier | Terminal | Usage |
|-----------|----------|-------|
| iTerm UUID | iTerm2 | Use Python API: `get_session_by_id(uuid)` → `async_activate()` |
| TTY device path | All | Could use for matching, but not direct focus |
| Terminal PID | All | Use with Win32 FindWindow, generic lookups |
| Kitty window ID | Kitty | Use: `kitten @ focus-window --match id:<id>` |
| WezTerm pane ID | WezTerm | Use: `wezterm cli activate-pane --pane-id <id>` |
| VS Code marker | VS Code | Use internal command `workbench.action.terminal.focus` |
| X11 WINDOWID | Linux Kitty | Can use with X11 tools, less reliable |

---

### **Security & Permissions**

**macOS:**
- **Accessibility permission** required (System Preferences > Security & Privacy > Accessibility)
- No programmatic way to grant - must open System Preferences
- Only applies to system-level focus; terminal-native APIs may not need it

**Windows:**
- Win32 API restrictions (SetForegroundWindow has built-in guards)
- Background app cannot steal focus from active foreground window
- Will flash taskbar instead if user has active window

**Linux:**
- X11 WINDOWID approach less reliable
- Kitty's remote control requires `allow_remote_control yes`

---

### **Recommended Implementation Strategy for Jacques**

Given your Jacques context manager use case and multi-terminal support:

1. **iTerm2** → Use Python API (most reliable, tab-specific)
2. **Kitty** → Use `kitten @ focus-window` command (reliable, requires config)
3. **WezTerm** → Use `wezterm cli activate-pane` (reliable)
4. **Terminal.app** → Document as unsupported (AppleScript limitation)
5. **Alacritty** → Document as unsupported (not yet implemented)
6. **Windows** → Use `node-process-windows` npm package + Win32 API
7. **VS Code** → Use internal command when focusing VS Code sessions
8. **Fallback** → `node-window-manager` for generic system-level window activation

This gives you best-in-class support for each terminal while documenting known limitations transparently.

---

### **Sources**

**macOS - iTerm2:**
- [iTerm2 Scripting Documentation](https://iterm2.com/documentation-scripting.html)
- [iTerm2 Python API - Session](https://iterm2.com/python-api/session.html)

**macOS - Terminal.app:**
- [Apple Support: Open Terminal Windows/Tabs](https://support.apple.com/guide/terminal/open-new-terminal-windows-and-tabs-trmlb20c7888/mac)

**macOS - System-Level:**
- [GitHub: sentialx/node-window-manager](https://github.com/sentialx/node-window-manager)
- [GitHub: karaggeorge/mac-focus-window](https://github.com/karaggeorge/mac-focus-window)
- [npm: node-mac-permissions](https://www.npmjs.com/package/node-mac-permissions)

**Kitty:**
- [Kitty Remote Control Documentation](https://sw.kovidgoyal.net/kitty/remote-control/)

**WezTerm:**
- [WezTerm activate-pane CLI](https://wezterm.org/cli/cli/activate-pane.html)

**Windows:**
- [Windows Terminal Command Line Arguments](https://learn.microsoft.com/en-us/windows/terminal/command-line-arguments)
- [SetForegroundWindow (Microsoft Learn)](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setforegroundwindow)
- [GitHub: bryphe/node-process-windows](https://github.com/bryphe/node-process-windows)
- [GitHub: deskbtm/win32-ffi](https://github.com/deskbtm/win32-ffi)
- [How to Invoke Win32 API in Node.js with libwin32 and Koffi](https://docs.lextudio.com/blog/invoke-win32-api-nodejs-libwin32-koffi/)