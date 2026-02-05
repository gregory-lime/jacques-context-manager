/**
 * macOS Window Manager
 *
 * Implements window positioning and tiling using AppleScript.
 * Supports iTerm2, Terminal.app, and PID-based fallback.
 */

import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import type {
  WindowManager,
  WindowGeometry,
  Display,
  TileLayout,
  PositionResult,
  TileResult,
} from './types.js';
import { calculateTileGeometry, suggestLayout } from './layouts.js';
import { extractItermUuid } from '../terminal-activator.js';

const execAsync = promisify(execCb);

/**
 * Escape single quotes in AppleScript for shell execution
 */
function escapeAppleScript(script: string): string {
  return script.replace(/'/g, "'\\''");
}

/**
 * Execute an AppleScript and return the result
 */
async function runAppleScript(script: string): Promise<string> {
  const { stdout } = await execAsync(`osascript -e '${escapeAppleScript(script)}'`);
  return stdout.trim();
}

/**
 * macOS Window Manager using AppleScript
 */
export class MacOSWindowManager implements WindowManager {
  getPlatform(): string {
    return 'darwin';
  }

  isSupported(): boolean {
    return process.platform === 'darwin';
  }

  /**
   * Get all displays using NSScreen via AppleScript
   * Note: AppleScript has limited multi-monitor support.
   * For full multi-monitor support, would need a native extension.
   */
  async getDisplays(): Promise<Display[]> {
    try {
      // Get the desktop bounds (primary display work area)
      const script = `
        tell application "Finder"
          get bounds of window of desktop
        end tell
      `;
      const result = await runAppleScript(script);
      // Result is: "x1, y1, x2, y2"
      const parts = result.split(',').map(s => parseInt(s.trim(), 10));

      if (parts.length === 4) {
        const [x1, y1, x2, y2] = parts;
        return [
          {
            id: 'primary',
            bounds: { x: x1, y: y1, width: x2 - x1, height: y2 - y1 },
            workArea: { x: x1, y: y1, width: x2 - x1, height: y2 - y1 },
            isPrimary: true,
          },
        ];
      }

      // Fallback to reasonable defaults
      return [
        {
          id: 'primary',
          bounds: { x: 0, y: 0, width: 1920, height: 1080 },
          workArea: { x: 0, y: 23, width: 1920, height: 1057 }, // Account for menu bar
          isPrimary: true,
        },
      ];
    } catch {
      // Fallback to reasonable defaults
      return [
        {
          id: 'primary',
          bounds: { x: 0, y: 0, width: 1920, height: 1080 },
          workArea: { x: 0, y: 23, width: 1920, height: 1057 },
          isPrimary: true,
        },
      ];
    }
  }

  /**
   * Position a terminal window by its terminal key
   */
  async positionWindow(terminalKey: string, geometry: WindowGeometry): Promise<PositionResult> {
    const colonIndex = terminalKey.indexOf(':');
    if (colonIndex === -1) {
      return { success: false, error: `Invalid terminal key format: ${terminalKey}` };
    }

    const prefix = terminalKey.substring(0, colonIndex);
    const value = terminalKey.substring(colonIndex + 1);

    switch (prefix) {
      case 'ITERM':
        return this.positionITerm(value, geometry);
      case 'TTY':
        return this.positionTerminalApp(value, geometry);
      case 'PID':
        return this.positionByPid(value, geometry);
      case 'KITTY':
      case 'WEZTERM':
        // These terminals have their own positioning mechanisms
        // For now, just try to activate them (positioning not supported)
        return { success: false, error: `${prefix} window positioning not supported yet` };
      case 'TERM':
      case 'AUTO':
      case 'UNKNOWN':
        return { success: false, error: `${prefix} window positioning not supported` };
      default:
        return { success: false, error: `Unknown terminal key prefix: ${prefix}` };
    }
  }

  /**
   * Position an iTerm2 window by session UUID
   */
  private async positionITerm(
    itermSessionId: string,
    geometry: WindowGeometry
  ): Promise<PositionResult> {
    const uuid = extractItermUuid(itermSessionId);
    const { x, y, width, height } = geometry;

    // AppleScript bounds format: {left, top, right, bottom}
    const bounds = `{${x}, ${y}, ${x + width}, ${y + height}}`;

    const script = `
      tell application "iTerm2"
        repeat with w in windows
          repeat with t in tabs of w
            repeat with s in sessions of t
              if unique ID of s is "${uuid}" then
                -- Select the tab first
                select t
                -- Position the window
                set bounds of w to ${bounds}
                -- Bring to front
                set index of w to 1
                activate
                return "ok"
              end if
            end repeat
          end repeat
        end repeat
        return "not_found"
      end tell
    `;

    try {
      const result = await runAppleScript(script);
      if (result === 'ok') {
        return { success: true };
      }
      return { success: false, error: `Session not found: ${uuid}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Position a Terminal.app window by TTY path
   */
  private async positionTerminalApp(
    ttyPath: string,
    geometry: WindowGeometry
  ): Promise<PositionResult> {
    const { x, y, width, height } = geometry;
    const bounds = `{${x}, ${y}, ${x + width}, ${y + height}}`;

    const script = `
      tell application "Terminal"
        repeat with w in windows
          repeat with t in tabs of w
            if tty of t is "${ttyPath}" then
              -- Select the tab
              set selected tab of w to t
              -- Position the window
              set bounds of w to ${bounds}
              -- Bring to front
              set index of w to 1
              activate
              return "ok"
            end if
          end repeat
        end repeat
        return "not_found"
      end tell
    `;

    try {
      const result = await runAppleScript(script);
      if (result === 'ok') {
        return { success: true };
      }
      return { success: false, error: `TTY not found: ${ttyPath}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Position a window by process ID using System Events
   * Note: This is app-level only (cannot select specific tabs)
   */
  private async positionByPid(pid: string, geometry: WindowGeometry): Promise<PositionResult> {
    const { x, y, width, height } = geometry;

    // First, get the app name from the PID
    const getAppScript = `
      tell application "System Events"
        set theProcess to first process whose unix id is ${pid}
        return name of theProcess
      end tell
    `;

    try {
      const appName = await runAppleScript(getAppScript);

      // Now position the app's frontmost window
      const positionScript = `
        tell application "${appName}"
          if (count of windows) > 0 then
            set bounds of front window to {${x}, ${y}, ${x + width}, ${y + height}}
            activate
          end if
        end tell
      `;

      await runAppleScript(positionScript);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Tile multiple terminal windows
   */
  async tileWindows(
    terminalKeys: string[],
    layout: TileLayout,
    display?: Display
  ): Promise<TileResult> {
    if (terminalKeys.length === 0) {
      return { success: true, positioned: 0, total: 0 };
    }

    // Get display info
    const displays = await this.getDisplays();
    const targetDisplay = display || displays.find(d => d.isPrimary) || displays[0];

    if (!targetDisplay) {
      return {
        success: false,
        positioned: 0,
        total: terminalKeys.length,
        errors: ['No display available'],
      };
    }

    // Use suggested layout if too many windows for the requested layout
    const effectiveLayout =
      terminalKeys.length > getLayoutCapacity(layout)
        ? suggestLayout(terminalKeys.length)
        : layout;

    const errors: string[] = [];
    let positioned = 0;

    // Position each window
    for (let i = 0; i < terminalKeys.length; i++) {
      const terminalKey = terminalKeys[i];
      const geometry = calculateTileGeometry(
        targetDisplay.workArea,
        effectiveLayout,
        i,
        terminalKeys.length
      );

      const result = await this.positionWindow(terminalKey, geometry);
      if (result.success) {
        positioned++;
      } else if (result.error) {
        errors.push(`${terminalKey}: ${result.error}`);
      }

      // Small delay between windows to let AppleScript complete
      if (i < terminalKeys.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      success: positioned === terminalKeys.length,
      positioned,
      total: terminalKeys.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

/**
 * Get the layout capacity (imported from layouts for convenience)
 */
function getLayoutCapacity(layout: TileLayout): number {
  switch (layout) {
    case 'side-by-side':
      return 2;
    case 'thirds':
      return 3;
    case '2x2':
      return 4;
    default:
      return 2;
  }
}
