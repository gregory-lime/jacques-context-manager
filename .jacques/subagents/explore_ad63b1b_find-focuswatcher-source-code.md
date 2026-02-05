# Explore: Find FocusWatcher source code

> Session: `140f7e47-bbca-4654-9982-fe180f5ee2bc`
> Date: 2026-02-03
> Tokens: ~25 231

---

Perfect! I found the FocusWatcher source code. Here are the complete details:

## FocusWatcher Source Code

**File Path**: `/Users/gole/Desktop/jacques-context-manager/server/src/focus-watcher.ts`

**Full Contents**:

```typescript
/**
 * Terminal Focus Watcher
 *
 * Monitors which terminal window is focused on macOS and sends
 * focus hints to the Jacques server to update the active session.
 *
 * Supports:
 * - iTerm2 (via ITERM_SESSION_ID)
 * - Terminal.app (via TTY)
 * - Other terminals (via window ID / PID)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import type { Logger } from './logging/logger-factory.js';
import { createLogger } from './logging/logger-factory.js';

const execAsync = promisify(exec);

export interface FocusInfo {
  app: string;
  iterm_session_id?: string;
  tty?: string;
  window_id?: string;
  terminal_pid?: number;
}

/**
 * Get the currently focused application name
 */
async function getFrontmostApp(): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`);
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Get iTerm2 session ID for the active tab
 */
async function getITermSessionId(): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `osascript -e 'tell application "iTerm2" to tell current session of current tab of current window to return unique ID'`
    );
    return stdout.trim() || null;
  } catch (error) {
    console.error(`[FocusWatcher] iTerm AppleScript error: ${error}`);
    return null;
  }
}

/**
 * Get Terminal.app TTY for the active tab
 */
async function getTerminalTTY(): Promise<string | null> {
  try {
    const script = `
      tell application "Terminal"
        return tty of selected tab of front window
      end tell
    `;
    const { stdout } = await execAsync(`osascript -e '${script}'`);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Get focus info for the currently active terminal
 */
export async function getTerminalFocusInfo(): Promise<FocusInfo | null> {
  const app = await getFrontmostApp();

  if (!app) return null;

  // Check if it's a terminal application
  const terminalApps = ['iTerm2', 'iTerm', 'Terminal', 'Alacritty', 'kitty', 'WezTerm', 'Hyper'];
  const isTerminal = terminalApps.some(t => app.toLowerCase().includes(t.toLowerCase()));

  if (!isTerminal) {
    return null; // Not a terminal, ignore
  }

  const focusInfo: FocusInfo = { app };

  if (app.includes('iTerm')) {
    focusInfo.iterm_session_id = await getITermSessionId() || undefined;
  } else if (app === 'Terminal') {
    focusInfo.tty = await getTerminalTTY() || undefined;
  }

  return focusInfo;
}

/**
 * Build a terminal key from focus info (matches format in jacques-register-session.py)
 */
export function buildTerminalKeyFromFocus(focus: FocusInfo): string | null {
  if (focus.iterm_session_id) {
    return `ITERM:${focus.iterm_session_id}`;
  }
  if (focus.tty) {
    return `TTY:${focus.tty}`;
  }
  if (focus.terminal_pid) {
    return `PID:${focus.terminal_pid}`;
  }
  return null;
}

export interface FocusWatcherCallbacks {
  onFocusChange: (terminalKey: string | null) => void;
}

export interface FocusWatcherOptions {
  /** Suppress console output */
  silent?: boolean;
  /** Optional logger for dependency injection */
  logger?: Logger;
}

/**
 * Start watching for terminal focus changes
 */
export function startFocusWatcher(
  callbacks: FocusWatcherCallbacks,
  pollIntervalMs: number = 500,
  options: FocusWatcherOptions = {}
): { stop: () => void } {
  // Support both old silent flag and new logger injection (messages already include [FocusWatcher] prefix)
  const logger = options.logger ?? createLogger({ silent: options.silent });
  const log = logger.log.bind(logger);
  const error = logger.error.bind(logger);

  let lastTerminalKey: string | null = null;
  let isRunning = true;

  const poll = async () => {
    if (!isRunning) return;

    try {
      const focusInfo = await getTerminalFocusInfo();
      const terminalKey = focusInfo ? buildTerminalKeyFromFocus(focusInfo) : null;

      // Only notify on change
      if (terminalKey !== lastTerminalKey) {
        log(`[FocusWatcher] Focus changed: ${lastTerminalKey} -> ${terminalKey}`);
        if (focusInfo) {
          log(`[FocusWatcher] App: ${focusInfo.app}, iTerm ID: ${focusInfo.iterm_session_id || 'none'}, TTY: ${focusInfo.tty || 'none'}`);
        }
        lastTerminalKey = terminalKey;
        callbacks.onFocusChange(terminalKey);
      }
    } catch (err) {
      error(`[FocusWatcher] Poll error: ${err}`);
    }

    if (isRunning) {
      setTimeout(poll, pollIntervalMs);
    }
  };

  // Start polling
  log('[FocusWatcher] Starting focus polling...');
  poll();

  return {
    stop: () => {
      isRunning = false;
      log('[FocusWatcher] Stopped');
    }
  };
}
```

This module provides terminal focus watching functionality for macOS, monitoring which terminal window is active and providing focus hints to the Jacques server. It supports iTerm2, Terminal.app, and other terminal emulators through AppleScript queries.