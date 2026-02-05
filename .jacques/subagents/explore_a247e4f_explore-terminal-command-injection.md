# Explore: Explore terminal command injection

> Session: `38ceac2d-df45-4064-8a36-488d23eaa7f3`
> Date: 2026-01-31
> Tokens: ~70 744

---

Perfect! Now I have comprehensive understanding. Let me compile my findings into a detailed investigation report.

## Investigation Report: Cross-Process Command Injection for Jacques-Triggered `/handoff`

Based on my analysis of the Jacques codebase, here are the **5 viable options** for automatically triggering Claude Code's `/handoff` command from the Jacques dashboard:

---

### **OPTION 1: File-Based Trigger (Most Practical) ✅**

**Status: RECOMMENDED - Simplest & Most Reliable**

**How it works:**
1. User clicks "Create Handoff" in Jacques dashboard (running in Terminal A)
2. Jacques writes a trigger file to a known location (e.g., `~/.jacques/triggers/<session_id>.trigger`)
3. Claude Code hook detects the trigger file and executes `/handoff` command
4. Hook deletes the trigger file

**Advantages:**
- ✅ No process injection needed
- ✅ Works across ANY terminal emulator
- ✅ No permissions/security issues
- ✅ Already have infrastructure for file watching (handoff watcher in `server.ts:100-143`)
- ✅ Clean separation of concerns

**Implementation:**
```bash
# Jacques server creates trigger:
echo '{"action":"handoff","session_id":"xyz"}' > ~/.jacques/triggers/xyz.trigger

# New hook (jacques-trigger-watcher.sh) polls or watches:
if [ -f "$HOME/.jacques/triggers/$SESSION_ID.trigger" ]; then
  # Inject /handoff into Claude stdin
  rm "$HOME/.jacques/triggers/$SESSION_ID.trigger"
fi
```

**Files needed:**
- `server/src/trigger-manager.ts` - Write trigger files
- `hooks/jacques-trigger-watcher.sh` - New hook to monitor triggers
- Update `statusline.sh` to call watcher at each prompt

---

### **OPTION 2: TTY Detection + echo to stdin (macOS specific)**

**Status: VIABLE - Platform-dependent**

**How it works:**
1. Jacques has `terminal_key` from session registry (built in `statusline.sh:75-90`)
2. Parse terminal_key to extract TTY device (e.g., `/dev/ttys001`)
3. Write `/handoff\n` directly to that TTY

**Key code from Jacques:**
```typescript
// From session-registry.ts:371-400
findSessionByTerminalKey(terminalKey: string): Session | null {
  // Already has logic to find session by terminal_key!
  // ITERM: prefix for iTerm sessions
  // KITTY: prefix for Kitty terminal
  // TERM: prefix for Terminal.app
}
```

**Terminal identity captured in `statusline.sh:75-90`:**
```bash
iterm_session_id="${ITERM_SESSION_ID:-}"
term_session_id="${TERM_SESSION_ID:-}"
kitty_window_id="${KITTY_WINDOW_ID:-}"

if [ -n "$iterm_session_id" ]; then
  terminal_key="ITERM:$iterm_session_id"
```

**Advantages:**
- ✅ Direct TTY write = guaranteed delivery
- ✅ Terminal_key already in registry
- ✅ No file I/O

**Disadvantages:**
- ❌ Requires root/ptrace to write to another process's TTY
- ❌ May need `script -t` or similar workarounds
- ❌ Different on Linux/Windows

**Implementation attempt:**
```bash
# Try to write directly to TTY
echo "/handoff" > /dev/ttys001  # Permission denied unless same user
# Better: use script(1) or expect(1)
script -t /dev/ttys001 -c "echo /handoff"
```

---

### **OPTION 3: AppleScript (macOS iTerm/Terminal.app)**

**Status: VIABLE - iTerm/Terminal.app only**

**How it works:**
1. Detect terminal program from `terminal_key` (ITERM: or built-in)
2. Use AppleScript to send keystrokes to the terminal window
3. AppleScript executes `/handoff\n` in the target window

**Advantages:**
- ✅ Works reliably on macOS
- ✅ No file I/O, no TTY permissions needed
- ✅ Native to macOS

**Disadvantages:**
- ❌ macOS only
- ❌ Requires Accessibility permissions
- ❌ Brittle (window titles, focus state)

**Example (iTerm):**
```applescript
tell application "iTerm"
  set myWindow to (windows where name contains "Claude Code")
  tell myWindow[1]
    create window with default profile
    write text "/handoff"
  end tell
end tell
```

**Terminal.app:**
```applescript
tell application "Terminal"
  tell front window
    do script "/handoff"
  end tell
end tell
```

**Implementation:**
```typescript
// From dashboard - if macOS detected
const applescript = `
  tell application "iTerm"
    tell window 1
      tell current session
        write text "/handoff"
      end tell
    end tell
  end tell
`;
execSync(`osascript -e '${applescript}'`);
```

---

### **OPTION 4: Signal-Based Wake-Up (Claude Hook Callback)**

**Status: EXPERIMENTAL - Creative but fragile**

**How it works:**
1. On session start, hook writes its PID to `~/.jacques/session/<session_id>.pid`
2. Jacques dashboard sends SIGUSR1 to that PID
3. Hook catches signal and executes `/handoff`

**Advantages:**
- ✅ Cross-platform (signals work on Unix)
- ✅ No TTY permissions needed

**Disadvantages:**
- ❌ Hook must be running as background process (not ideal)
- ❌ Signal handling is complex in shell scripts
- ❌ PID may become stale/reused
- ❌ Fragile

**Implementation:**
```bash
# In statusline.sh
trap 'echo "/handoff" >> /tmp/claude-command.fifo' USR1
echo $$ > ~/.jacques/session/$SESSION_ID.pid

# In Jacques
kill -USR1 $(cat ~/.jacques/session/$SESSION_ID.pid)
```

---

### **OPTION 5: tmux/screen Integration**

**Status: VIABLE - If using tmux/screen**

**How it works:**
1. Detect if Claude Code running in tmux/screen session
2. Use `tmux send-keys` or `screen -X` to inject keystrokes
3. Equivalent to manually typing `/handoff` in that pane

**Advantages:**
- ✅ Native tmux/screen command, very reliable
- ✅ Cross-platform
- ✅ No permissions needed

**Disadvantages:**
- ❌ Only works if Claude Code running in tmux/screen
- ❌ Requires detecting pane/window number
- ❌ Many users don't use tmux

**Implementation:**
```bash
# Detect tmux session
if [ -n "$TMUX" ]; then
  # Send /handoff to Claude Code pane
  tmux send-keys -t claude-session "/handoff" Enter
fi
```

---

### **RECOMMENDATION: Option 1 + Option 2 Hybrid**

**Suggested Implementation:**

Use **Option 1 (File-based)** as the primary mechanism with **Option 3 (AppleScript)** as a macOS fallback:

```typescript
// In server.ts - new file: trigger-manager.ts
export async function triggerHandoff(session: Session): Promise<void> {
  // Platform 1: Try AppleScript (macOS only)
  if (process.platform === 'darwin') {
    try {
      await sendViaAppleScript(session.terminal);
      return;
    } catch (e) {
      console.log('[Trigger] AppleScript failed, falling back to file-based trigger');
    }
  }

  // Platform 2: File-based trigger (universal fallback)
  await writeTriggerFile(session.session_id, session.cwd);
}

// In statusline.sh - new hook watcher
if [ -f "$HOME/.jacques/triggers/$SESSION_ID.trigger" ]; then
  # This runs at each statusLine call (very frequent)
  # Inject /handoff into current session
  printf "\n/handoff\n" >> /dev/tty  # Or via other mechanism
  rm "$HOME/.jacques/triggers/$SESSION_ID.trigger"
fi
```

---

### **Key Technical Findings from Codebase:**

1. **Terminal Key Already Captured** (session-registry.ts:371-400)
   - `ITERM:<session_id>`, `KITTY:<window_id>`, `TERM:<session_id>`
   - Can be used to correlate sessions across terminals

2. **statusLine Fires Frequently** (hooks/statusline.sh runs per prompt)
   - Perfect for polling/watching mechanism
   - Runs as the same user in the same session

3. **No Claude Code API** for external triggering
   - Claude Code has NO public HTTP/RPC API
   - `/handoff` is a CLI-only command
   - No webhook/callback mechanism

4. **Existing Infrastructure**
   - Unix socket communication already working
   - File watcher already implemented (for handoff.md detection)
   - WebSocket broadcast to dashboard ready

5. **Session Registry Already has:**
   - `terminal_key` for identifying sessions
   - `terminal` object with TTY info
   - Capability to find sessions by any identifier

---

### **Security Considerations:**

| Option | Security Risk | Mitigation |
|--------|---------------|-----------|
| File-based | File permission races | Only write to `~/.jacques/` (user-only dir) |
| TTY write | Executing arbitrary code in another process | Only execute `/handoff`, never arbitrary input |
| AppleScript | Accessibility prompt | Require explicit user permission first time |
| Signal | Signal hijacking | Use only for this specific purpose, validate PID |
| tmux | Pane confusion | Verify session name matches before sending keys |

---

### **Next Steps if Implementing:**

1. **Quick Win (Option 1):** 
   - Add `trigger-manager.ts` to server
   - Add trigger polling to `statusline.sh`
   - Add UI button to dashboard to call trigger
   - Test file-based flow end-to-end

2. **Polish (Option 3 enhancement):**
   - Add AppleScript fallback for macOS
   - Test with iTerm and Terminal.app
   - Graceful degradation on permission errors

3. **Future (Option 5):**
   - Detect tmux sessions
   - Add tmux send-keys as alternative

---

This investigation shows that **Option 1 (file-based triggers) is the most practical, reliable, and cross-platform solution** for your use case. The infrastructure is already in place—you just need to add the polling mechanism to the hook and a button to the dashboard.