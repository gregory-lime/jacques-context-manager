/**
 * Process Scanner
 *
 * Cross-platform scanner for detecting running Claude Code sessions.
 * Supports macOS, Linux, and Windows.
 *
 * ## How It Works
 *
 * 1. Enumerate all running Claude processes with their PIDs and TTYs
 * 2. Get working directory (CWD) for each process
 * 3. Map CWD to Claude's project directory (~/.claude/projects/{encoded-path})
 * 4. Find ALL active JSONL files in that directory (not just most recent)
 * 5. Parse each for sessionId, gitBranch, context metrics
 * 6. Return all detected sessions
 *
 * ## Platform Support
 *
 * - macOS/Linux: Uses pgrep, ps, lsof
 * - Windows: Uses PowerShell (Get-Process, Get-WmiObject)
 *
 * ## Multi-Session Detection
 *
 * Multiple Claude processes can run in the same directory. We detect all of them by:
 * - Finding all JSONL files modified within ACTIVE_SESSION_THRESHOLD_MS
 * - Using TTY to create unique terminal keys for each process
 * - Matching processes to sessions by recency when exact match isn't possible
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as os from "os";
import { promises as fs } from "fs";
import { platform } from "process";
import {
  encodeProjectPath,
  parseJSONLContent,
  getEntryStatistics,
} from "@jacques/core/session";
import type { ContextMetrics } from "./types.js";

const execAsync = promisify(exec);

/** Sessions modified within this threshold are considered "active" */
const ACTIVE_SESSION_THRESHOLD_MS = 60 * 1000; // 1 minute

/**
 * Information about a detected running Claude process
 */
export interface DetectedProcess {
  pid: number;
  tty: string;
  cwd: string;
  /** Terminal type detected from environment (if available) */
  terminalType?: string;
  /** Terminal session ID (WT_SESSION, ITERM_SESSION_ID, etc.) */
  terminalSessionId?: string;
}

/**
 * A session detected from a running Claude process
 */
export interface DetectedSession {
  /** Session ID from the JSONL file */
  sessionId: string;
  /** Working directory of the Claude process */
  cwd: string;
  /** Path to the session transcript JSONL file */
  transcriptPath: string;
  /** Git branch if detected */
  gitBranch: string | null;
  /** Context metrics from parsing the transcript */
  contextMetrics: ContextMetrics | null;
  /** Last modification time of the transcript */
  lastActivity: number;
  /** Session title extracted from transcript */
  title: string | null;
  /** Process ID */
  pid: number;
  /** TTY of the process */
  tty: string;
  /** Project name derived from CWD */
  project: string;
  /** Terminal type (iTerm2, Windows Terminal, etc.) */
  terminalType?: string;
  /** Terminal session ID for unique identification */
  terminalSessionId?: string;
}

/**
 * JSONL file info with parsed metadata
 */
interface SessionFileInfo {
  filePath: string;
  sessionId: string;
  modifiedAt: Date;
  gitBranch: string | null;
  title: string | null;
  contextMetrics: ContextMetrics | null;
}

// ============================================================
// Platform Detection
// ============================================================

const isWindows = platform === "win32";
const isMac = platform === "darwin";
const isLinux = platform === "linux";

// ============================================================
// Process Enumeration - Platform Specific
// ============================================================

/**
 * Get all running Claude Code processes
 */
async function getClaudeProcesses(): Promise<DetectedProcess[]> {
  if (isWindows) {
    return getClaudeProcessesWindows();
  } else {
    return getClaudeProcessesUnix();
  }
}

/**
 * Get Claude processes on macOS/Linux using pgrep, ps, lsof
 */
async function getClaudeProcessesUnix(): Promise<DetectedProcess[]> {
  try {
    // Get PIDs of running claude processes
    const { stdout: pgrepOut } = await execAsync("pgrep -x claude");
    const pids = pgrepOut
      .trim()
      .split("\n")
      .filter((p) => p)
      .map((p) => parseInt(p, 10));

    if (pids.length === 0) {
      return [];
    }

    const processes: DetectedProcess[] = [];

    for (const pid of pids) {
      try {
        // Get TTY for this process
        const { stdout: psOut } = await execAsync(`ps -o tty= -p ${pid}`);
        const tty = psOut.trim() || "?";

        // Get CWD using lsof
        const { stdout: lsofOut } = await execAsync(
          `lsof -p ${pid} 2>/dev/null | grep cwd | awk '{print $NF}'`
        );
        const cwd = lsofOut.trim();

        if (cwd) {
          // Try to get terminal environment variables
          const terminalInfo = await getTerminalInfoUnix(pid);

          processes.push({
            pid,
            tty,
            cwd,
            terminalType: terminalInfo.type,
            terminalSessionId: terminalInfo.sessionId,
          });
        }
      } catch {
        // Skip this process if we can't get its info
        continue;
      }
    }

    return processes;
  } catch {
    // pgrep returns exit code 1 if no processes found
    return [];
  }
}

/**
 * Try to get terminal info from process environment on Unix
 */
async function getTerminalInfoUnix(
  pid: number
): Promise<{ type?: string; sessionId?: string }> {
  try {
    // Try reading /proc/PID/environ on Linux
    if (isLinux) {
      const { stdout } = await execAsync(
        `cat /proc/${pid}/environ 2>/dev/null | tr '\\0' '\\n' | grep -E '^(ITERM_SESSION_ID|TERM_SESSION_ID|KITTY_WINDOW_ID|WEZTERM_PANE|WT_SESSION)='`
      );
      return parseTerminalEnvOutput(stdout);
    }

    // On macOS, we can't easily read another process's environment
    // The hook system handles this when it fires
    return {};
  } catch {
    return {};
  }
}

/**
 * Parse terminal environment variable output
 */
function parseTerminalEnvOutput(
  output: string
): { type?: string; sessionId?: string } {
  const lines = output.trim().split("\n");
  for (const line of lines) {
    const [key, value] = line.split("=");
    if (!value) continue;

    switch (key) {
      case "ITERM_SESSION_ID":
        return { type: "iTerm2", sessionId: value };
      case "TERM_SESSION_ID":
        return { type: "Terminal.app", sessionId: value };
      case "KITTY_WINDOW_ID":
        return { type: "Kitty", sessionId: value };
      case "WEZTERM_PANE":
        return { type: "WezTerm", sessionId: value };
      case "WT_SESSION":
        return { type: "Windows Terminal", sessionId: value };
    }
  }
  return {};
}

/**
 * Get Claude processes on Windows using PowerShell
 */
async function getClaudeProcessesWindows(): Promise<DetectedProcess[]> {
  try {
    // PowerShell script to get Claude processes with their working directories
    // Note: claude.exe is the Windows executable name
    const psScript = `
      $ErrorActionPreference = 'SilentlyContinue'
      Get-Process -Name claude,claude-code 2>$null | ForEach-Object {
        $proc = $_
        try {
          $wmi = Get-WmiObject Win32_Process -Filter "ProcessId=$($proc.Id)" 2>$null
          if ($wmi) {
            # Try to get working directory from command line or executable path
            $cwd = if ($wmi.ExecutablePath) { Split-Path -Parent $wmi.ExecutablePath } else { $null }

            # Get environment variables for terminal detection
            $wtSession = [System.Environment]::GetEnvironmentVariable('WT_SESSION', 'Process')

            @{
              PID = $proc.Id
              CWD = $cwd
              WT_SESSION = $wtSession
            } | ConvertTo-Json -Compress
          }
        } catch {}
      }
    `.replace(/\n/g, " ");

    const { stdout } = await execAsync(
      `powershell.exe -NoProfile -Command "${psScript}"`,
      { timeout: 10000 }
    );

    const processes: DetectedProcess[] = [];
    const lines = stdout.trim().split("\n").filter((l) => l.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.CWD) {
          processes.push({
            pid: data.PID,
            tty: `PID:${data.PID}`, // Windows doesn't have TTY concept
            cwd: data.CWD,
            terminalType: data.WT_SESSION ? "Windows Terminal" : "PowerShell/cmd",
            terminalSessionId: data.WT_SESSION || undefined,
          });
        }
      } catch {
        // Skip malformed JSON
      }
    }

    return processes;
  } catch (err) {
    // PowerShell not available or failed
    return [];
  }
}

// ============================================================
// Session File Discovery
// ============================================================

/**
 * Find all active session files for a given CWD
 * Returns sessions modified within ACTIVE_SESSION_THRESHOLD_MS
 */
async function findActiveSessionFiles(cwd: string): Promise<SessionFileInfo[]> {
  const claudeDir = path.join(os.homedir(), ".claude", "projects");
  const encodedPath = encodeProjectPath(cwd);
  const projectDir = path.join(claudeDir, encodedPath);

  try {
    await fs.access(projectDir);
  } catch {
    return [];
  }

  try {
    const files = await fs.readdir(projectDir);
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

    if (jsonlFiles.length === 0) {
      return [];
    }

    const now = Date.now();
    const activeSessions: SessionFileInfo[] = [];

    for (const filename of jsonlFiles) {
      const filePath = path.join(projectDir, filename);
      const stats = await fs.stat(filePath);
      const mtime = stats.mtime.getTime();

      // Check if file was modified within threshold (active session)
      if (now - mtime <= ACTIVE_SESSION_THRESHOLD_MS) {
        const metadata = await extractSessionMetadata(filePath);

        if (metadata.sessionId) {
          activeSessions.push({
            filePath,
            sessionId: metadata.sessionId,
            modifiedAt: stats.mtime,
            gitBranch: metadata.gitBranch,
            title: metadata.title,
            contextMetrics: metadata.contextMetrics,
          });
        }
      }
    }

    // Sort by modification time (most recent first)
    activeSessions.sort(
      (a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime()
    );

    return activeSessions;
  } catch {
    return [];
  }
}

/**
 * Find the most recent session file for a CWD (fallback for inactive detection)
 */
async function findMostRecentSessionFile(cwd: string): Promise<SessionFileInfo | null> {
  const claudeDir = path.join(os.homedir(), ".claude", "projects");
  const encodedPath = encodeProjectPath(cwd);
  const projectDir = path.join(claudeDir, encodedPath);

  try {
    await fs.access(projectDir);
  } catch {
    return null;
  }

  try {
    const files = await fs.readdir(projectDir);
    const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

    if (jsonlFiles.length === 0) {
      return null;
    }

    // Get stats and find most recent
    let mostRecent: { filePath: string; mtime: Date } | null = null;

    for (const filename of jsonlFiles) {
      const filePath = path.join(projectDir, filename);
      const stats = await fs.stat(filePath);

      if (!mostRecent || stats.mtime > mostRecent.mtime) {
        mostRecent = { filePath, mtime: stats.mtime };
      }
    }

    if (!mostRecent) {
      return null;
    }

    const metadata = await extractSessionMetadata(mostRecent.filePath);

    if (!metadata.sessionId) {
      return null;
    }

    return {
      filePath: mostRecent.filePath,
      sessionId: metadata.sessionId,
      modifiedAt: mostRecent.mtime,
      gitBranch: metadata.gitBranch,
      title: metadata.title,
      contextMetrics: metadata.contextMetrics,
    };
  } catch {
    return null;
  }
}

// ============================================================
// Session Metadata Extraction
// ============================================================

/**
 * Extract session metadata from JSONL file
 */
async function extractSessionMetadata(
  filePath: string
): Promise<{
  sessionId: string | null;
  gitBranch: string | null;
  title: string | null;
  contextMetrics: ContextMetrics | null;
}> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());

    let sessionId: string | null = null;
    let gitBranch: string | null = null;
    let title: string | null = null;

    // Parse first few lines to get session metadata
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      try {
        const entry = JSON.parse(lines[i]);

        // Get session ID from any entry
        if (!sessionId && entry.sessionId) {
          sessionId = entry.sessionId;
        }

        // Get git branch from progress/context events
        if (!gitBranch && entry.data?.gitBranch) {
          gitBranch = entry.data.gitBranch;
        }

        // Extract title from first user message
        if (!title && entry.type === "user" && entry.message?.content) {
          const userContent =
            typeof entry.message.content === "string"
              ? entry.message.content
              : entry.message.content[0]?.text || "";
          if (userContent) {
            // Truncate to first line, max 60 chars
            title = userContent.split("\n")[0].slice(0, 60);
            if (userContent.length > 60) {
              title += "...";
            }
          }
        }

        // Stop early if we have everything
        if (sessionId && gitBranch && title) break;
      } catch {
        continue;
      }
    }

    // Parse full content for statistics
    let contextMetrics: ContextMetrics | null = null;
    try {
      const entries = parseJSONLContent(content);
      const stats = getEntryStatistics(entries);

      // Calculate context percentage from token stats
      if (stats.lastInputTokens > 0) {
        // Default context window size for Claude (200k tokens)
        const contextWindowSize = 200000;
        const usedPercentage =
          (stats.lastInputTokens / contextWindowSize) * 100;

        contextMetrics = {
          used_percentage: Math.min(usedPercentage, 100),
          remaining_percentage: Math.max(100 - usedPercentage, 0),
          context_window_size: contextWindowSize,
          total_input_tokens: stats.totalInputTokens,
          total_output_tokens: stats.totalOutputTokens,
          is_estimate: true, // Mark as estimate since not from preCompact
        };
      }
    } catch {
      // Statistics extraction failed, metrics remain null
    }

    return { sessionId, gitBranch, title, contextMetrics };
  } catch {
    return {
      sessionId: null,
      gitBranch: null,
      title: null,
      contextMetrics: null,
    };
  }
}

// ============================================================
// Main Scanner Function
// ============================================================

/**
 * Scan for active Claude Code sessions
 *
 * Detects running Claude processes, matches them to session files,
 * and extracts metadata for registration.
 *
 * ## Multi-Session Support
 *
 * When multiple Claude processes run in the same directory:
 * - Finds ALL recently modified JSONL files (within 1 minute)
 * - Creates unique terminal keys using TTY + PID
 * - Returns one DetectedSession per active session file
 *
 * ## Platform Support
 *
 * - macOS/Linux: Uses pgrep, ps, lsof
 * - Windows: Uses PowerShell (Get-Process, Get-WmiObject)
 */
export async function scanForActiveSessions(): Promise<DetectedSession[]> {
  const processes = await getClaudeProcesses();

  if (processes.length === 0) {
    return [];
  }

  const sessions: DetectedSession[] = [];
  const processedSessionIds = new Set<string>();

  // Group processes by CWD
  const processesByCwd = new Map<string, DetectedProcess[]>();
  for (const proc of processes) {
    const existing = processesByCwd.get(proc.cwd) || [];
    existing.push(proc);
    processesByCwd.set(proc.cwd, existing);
  }

  // Process each unique CWD
  for (const [cwd, cwdProcesses] of processesByCwd) {
    // Find all active session files for this CWD
    let sessionFiles = await findActiveSessionFiles(cwd);

    // If no active sessions found, fall back to most recent
    if (sessionFiles.length === 0) {
      const mostRecent = await findMostRecentSessionFile(cwd);
      if (mostRecent) {
        sessionFiles = [mostRecent];
      }
    }

    if (sessionFiles.length === 0) {
      continue;
    }

    // Match processes to session files
    // Strategy: If N processes and M sessions, pair them by recency
    const numPairs = Math.min(cwdProcesses.length, sessionFiles.length);

    for (let i = 0; i < numPairs; i++) {
      const proc = cwdProcesses[i];
      const sessionFile = sessionFiles[i];

      // Skip if we already registered this session ID
      if (processedSessionIds.has(sessionFile.sessionId)) {
        continue;
      }
      processedSessionIds.add(sessionFile.sessionId);

      // Derive project name from CWD
      const project = path.basename(cwd) || "Unknown";

      sessions.push({
        sessionId: sessionFile.sessionId,
        cwd,
        transcriptPath: sessionFile.filePath,
        gitBranch: sessionFile.gitBranch,
        contextMetrics: sessionFile.contextMetrics,
        lastActivity: sessionFile.modifiedAt.getTime(),
        title: sessionFile.title,
        pid: proc.pid,
        tty: proc.tty,
        project,
        terminalType: proc.terminalType,
        terminalSessionId: proc.terminalSessionId,
      });
    }

    // If more session files than processes, register remaining sessions
    // with synthetic process info (they might be from recently closed terminals)
    for (let i = numPairs; i < sessionFiles.length; i++) {
      const sessionFile = sessionFiles[i];

      if (processedSessionIds.has(sessionFile.sessionId)) {
        continue;
      }
      processedSessionIds.add(sessionFile.sessionId);

      const project = path.basename(cwd) || "Unknown";

      sessions.push({
        sessionId: sessionFile.sessionId,
        cwd,
        transcriptPath: sessionFile.filePath,
        gitBranch: sessionFile.gitBranch,
        contextMetrics: sessionFile.contextMetrics,
        lastActivity: sessionFile.modifiedAt.getTime(),
        title: sessionFile.title,
        pid: 0, // Unknown PID
        tty: "?",
        project,
      });
    }
  }

  return sessions;
}

/**
 * Get platform information for diagnostics
 */
export function getPlatformInfo(): {
  platform: string;
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
} {
  return {
    platform,
    isWindows,
    isMac,
    isLinux,
  };
}
