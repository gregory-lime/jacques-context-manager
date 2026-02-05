/**
 * Session Registry
 * 
 * Manages active AI sessions from multiple sources (Claude Code, Cursor, etc.)
 * with focus detection. Focus is determined by most recent activity.
 */

import type {
  Session,
  SessionStatus,
  SessionSource,
  SessionStartEvent,
  ActivityEvent,
  ContextUpdateEvent,
  IdleEvent,
  ContextMetrics,
  ModelInfo,
  AutoCompactStatus,
} from './types.js';
import type { Logger } from './logging/logger-factory.js';
import { createLogger } from './logging/logger-factory.js';
import type { DetectedSession } from './process-scanner.js';

export interface SessionRegistryOptions {
  /** Suppress console output */
  silent?: boolean;
  /** Optional logger for dependency injection */
  logger?: Logger;
}

/**
 * SessionRegistry - tracks all active AI sessions from all sources
 *
 * Key behaviors:
 * - Sessions are indexed by session_id
 * - Sessions track their source (claude_code, cursor, etc.)
 * - Focus is determined by most recent activity
 * - Activity updates automatically change focus
 * - Sessions can be manually focused via setFocusedSession
 */
export class SessionRegistry {
  private sessions = new Map<string, Session>();
  private focusedSessionId: string | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private logger: Logger;

  constructor(options: SessionRegistryOptions = {}) {
    // Support both old silent flag and new logger injection
    this.logger = options.logger ?? createLogger({ silent: options.silent });
  }

  // Convenience accessors for logging (messages already include [Registry] prefix)
  private get log() { return this.logger.log.bind(this.logger); }
  private get warn() { return this.logger.warn.bind(this.logger); }

  /**
   * Register a session discovered at startup from process scanning
   * Creates a session with DISCOVERED: terminal key prefix
   * @param discovered Detected session from process scanner
   * @returns The created session, or existing session if already registered
   */
  registerDiscoveredSession(discovered: DetectedSession): Session {
    // Check if session already exists (skip if registered via hooks)
    const existing = this.sessions.get(discovered.sessionId);
    if (existing) {
      this.log(`[Registry] Session already registered, skipping discovery: ${discovered.sessionId}`);
      return existing;
    }

    // Build terminal key based on available info
    // Priority: terminalSessionId > tty > pid
    let terminalKey: string;
    if (discovered.terminalSessionId) {
      // Use terminal-specific session ID (WT_SESSION, ITERM_SESSION_ID, etc.)
      const prefix = discovered.terminalType?.replace(/\s+/g, '') || 'TERM';
      terminalKey = `DISCOVERED:${prefix}:${discovered.terminalSessionId}`;
    } else if (discovered.tty && discovered.tty !== '?') {
      terminalKey = `DISCOVERED:TTY:${discovered.tty}:${discovered.pid}`;
    } else {
      terminalKey = `DISCOVERED:PID:${discovered.pid}`;
    }

    const session: Session = {
      session_id: discovered.sessionId,
      source: 'claude_code',
      session_title: discovered.title || `Session in ${discovered.project}`,
      transcript_path: discovered.transcriptPath,
      cwd: discovered.cwd,
      project: discovered.project,
      model: null, // Unknown until hooks fire
      workspace: null,
      terminal: null, // Not available from process scan
      terminal_key: terminalKey,
      status: 'active',
      last_activity: discovered.lastActivity,
      registered_at: Date.now(),
      context_metrics: discovered.contextMetrics,
      autocompact: null, // Unknown until hooks fire
      git_branch: discovered.gitBranch,
      git_worktree: null,
      git_repo_root: null,
    };

    this.sessions.set(discovered.sessionId, session);

    // Auto-focus if this is the only session
    if (this.sessions.size === 1) {
      this.focusedSessionId = discovered.sessionId;
    }

    const contextInfo = session.context_metrics
      ? `~${session.context_metrics.used_percentage.toFixed(1)}%`
      : 'unknown';
    const terminalInfo = discovered.terminalType || 'Unknown terminal';
    this.log(`[Registry] Discovered session: ${discovered.sessionId} [${discovered.project}] - ${contextInfo} (${terminalInfo})`);
    this.log(`[Registry] Terminal key: ${session.terminal_key}`);

    return session;
  }

  /**
   * Register a new session or update an existing auto-registered one
   * @param event SessionStart event data
   * @returns The created/updated session
   */
  registerSession(event: SessionStartEvent): Session {
    // Claude Code sends source as "startup", "clear", "resume" etc. to indicate how session started
    // We need to normalize these to "claude_code" for our internal tracking
    const rawSource = event.source || 'claude_code';
    const source: SessionSource = ['startup', 'clear', 'resume'].includes(rawSource) ? 'claude_code' : rawSource as SessionSource;

    // Check if session was already auto-registered from context_update or discovered at startup
    const existing = this.sessions.get(event.session_id);
    if (existing) {
      // Check if upgrading from a discovered session
      const wasDiscovered = existing.terminal_key?.startsWith('DISCOVERED:');

      // Update the existing session with terminal identity info
      this.log(`[Registry] Updating ${wasDiscovered ? 'discovered' : 'auto-registered'} session with terminal info: ${event.session_id}`);
      existing.terminal = event.terminal;
      existing.terminal_key = event.terminal_key;
      existing.session_title = event.session_title || existing.session_title;
      existing.transcript_path = event.transcript_path || existing.transcript_path;
      if (event.autocompact) {
        existing.autocompact = event.autocompact;
      }
      if (event.git_branch !== undefined) {
        existing.git_branch = event.git_branch || null;
        existing.git_worktree = event.git_worktree || null;
      }
      if (event.git_repo_root !== undefined) {
        existing.git_repo_root = event.git_repo_root || null;
      }
      this.log(`[Registry] Terminal key updated: ${existing.terminal_key}`);
      return existing;
    }

    const session: Session = {
      session_id: event.session_id,
      source: source,
      session_title: event.session_title,
      transcript_path: event.transcript_path,
      cwd: event.cwd,
      project: event.project,
      model: event.model ? { id: event.model, display_name: event.model } : null,
      workspace: null,
      terminal: event.terminal,
      terminal_key: event.terminal_key,
      status: 'active',
      last_activity: event.timestamp,
      registered_at: event.timestamp,
      context_metrics: null,
      autocompact: event.autocompact || null,
      git_branch: event.git_branch || null,
      git_worktree: event.git_worktree || null,
      git_repo_root: event.git_repo_root || null,
    };

    this.sessions.set(event.session_id, session);

    // Auto-focus new session
    this.focusedSessionId = event.session_id;

    // Log autocompact status if present
    const acStatus = session.autocompact
      ? `AC:${session.autocompact.enabled ? 'ON' : 'OFF'}@${session.autocompact.threshold}%`
      : 'AC:unknown';
    this.log(`[Registry] Session registered: ${event.session_id} [${source}] - "${session.session_title || 'Untitled'}" (${acStatus})`);
    this.log(`[Registry] Terminal key: ${session.terminal_key}`);

    return session;
  }

  /**
   * Update session with activity event
   * @param event Activity event data
   * @returns Updated session or null if session not found
   */
  updateActivity(event: ActivityEvent): Session | null {
    const session = this.sessions.get(event.session_id);
    if (!session) {
      this.warn(`[Registry] Activity for unknown session: ${event.session_id}`);
      return null;
    }

    session.last_activity = event.timestamp;
    session.status = 'working';

    // Update title if changed
    if (event.session_title && event.session_title !== session.session_title) {
      session.session_title = event.session_title;
    }

    // Update context metrics if provided
    if (event.context_metrics) {
      session.context_metrics = event.context_metrics;
    }

    // Activity implies this session is focused
    this.focusedSessionId = event.session_id;

    return session;
  }

  /**
   * Update session with context data from statusLine or preCompact
   * @param event Context update event data
   * @returns Updated session (auto-creates if not found)
   */
  updateContext(event: ContextUpdateEvent): Session {
    let session = this.sessions.get(event.session_id);
    let isNewSession = false;
    
    // Auto-register session if it doesn't exist
    // This handles the timing issue where statusLine/preCompact fires before SessionStart
    if (!session) {
      // Determine source from event, default to claude_code for backward compatibility
      const source: SessionSource = event.source || 'claude_code';
      
      this.log(`[Registry] Auto-registering session from context_update: ${event.session_id} [${source}]`);
      
      // Derive project name: prefer project_dir, fall back to cwd
      const projectDir = event.project_dir || event.cwd || '';
      const projectName = projectDir.split('/').filter(Boolean).pop() || 'Unknown Project';
      
      // Generate fallback title with project name
      const fallbackTitle = `Session in ${projectName}`;
      
      session = {
        session_id: event.session_id,
        source: source,
        session_title: fallbackTitle, // Fallback title until activity events provide better one
        transcript_path: event.transcript_path || null,
        cwd: event.cwd || '',
        project: projectName,
        model: event.model ? { 
          id: event.model, 
          display_name: event.model_display_name || event.model 
        } : null,
        workspace: event.project_dir ? {
          current_dir: event.cwd || '',
          project_dir: event.project_dir,
        } : null,
        terminal: null,
        terminal_key: `AUTO:${event.session_id}`,
        status: 'active',
        last_activity: event.timestamp,
        registered_at: event.timestamp,
        context_metrics: null,
        autocompact: event.autocompact || null,
        git_branch: event.git_branch || null,
        git_worktree: event.git_worktree || null,
        git_repo_root: event.git_repo_root || null,
      };

      this.sessions.set(event.session_id, session);
      isNewSession = true;
    }
    
    // Update source if provided and not already set (or was auto-detected)
    if (event.source && (!session.source || session.source === 'claude_code')) {
      session.source = event.source;
    }

    session.last_activity = event.timestamp;
    
    // Update context metrics
    const metrics: ContextMetrics = {
      used_percentage: event.used_percentage ?? 0,
      remaining_percentage: event.remaining_percentage ?? 100,
      context_window_size: event.context_window_size ?? 0,
      total_input_tokens: event.total_input_tokens ?? 0,
      total_output_tokens: event.total_output_tokens ?? 0,
      is_estimate: event.is_estimate ?? false,
    };
    session.context_metrics = metrics;
    
    // Debug: log context update details (show ~ for estimates)
    const estimateMarker = metrics.is_estimate ? '~' : '';
    this.log(`[Registry] Context updated for ${event.session_id}: ${estimateMarker}${metrics.used_percentage.toFixed(1)}% used, model: ${event.model || 'unchanged'}`);
    
    // Update autocompact status if provided
    if (event.autocompact) {
      session.autocompact = event.autocompact;
    }

    // Update model if provided
    if (event.model) {
      session.model = {
        id: event.model,
        display_name: event.model_display_name || event.model,
      };
    }

    // Update workspace info - prefer project_dir for project name
    if (event.project_dir) {
      session.workspace = {
        current_dir: event.cwd || session.cwd,
        project_dir: event.project_dir,
      };
      // Use project_dir for project name (more accurate than cwd)
      const projectName = event.project_dir.split('/').filter(Boolean).pop();
      if (projectName) {
        session.project = projectName;
      }
    } else if (event.cwd) {
      session.cwd = event.cwd;
      // Only use cwd for project name if we don't have project_dir
      if (!session.workspace?.project_dir) {
        session.project = event.cwd.split('/').filter(Boolean).pop() || event.cwd;
      }
    }

    // Context update implies activity - auto-focus
    this.focusedSessionId = event.session_id;

    // Update terminal_key if provided (from statusLine hook)
    if (event.terminal_key && event.terminal_key !== '' && session.terminal_key.startsWith('AUTO:')) {
      this.log(`[Registry] Updating terminal_key from context_update: ${session.terminal_key} -> ${event.terminal_key}`);
      session.terminal_key = event.terminal_key;
    }

    // Update session_title if provided and different (from statusLine hook reading transcript)
    if (event.session_title && event.session_title.trim() !== '' && event.session_title !== session.session_title) {
      const oldTitle = session.session_title;
      session.session_title = event.session_title.trim();
      this.log(`[Registry] Session title updated: "${oldTitle}" -> "${session.session_title}"`);
    }

    // Update transcript_path if provided and not already set (from statusLine hook)
    if (event.transcript_path && !session.transcript_path) {
      session.transcript_path = event.transcript_path;
      this.log(`[Registry] Transcript path set: ${session.transcript_path}`);
    }

    // Update git branch if provided (from statusLine hook)
    if (event.git_branch !== undefined) {
      if (event.git_branch !== session.git_branch) {
        this.log(`[Registry] Git branch updated: "${session.git_branch}" -> "${event.git_branch}"`);
      }
      session.git_branch = event.git_branch || null;
      session.git_worktree = event.git_worktree || null;
    }

    // Update git_repo_root if provided (from statusLine hook)
    if (event.git_repo_root !== undefined) {
      if (event.git_repo_root !== session.git_repo_root) {
        this.log(`[Registry] Git repo root updated: "${session.git_repo_root}" -> "${event.git_repo_root}"`);
      }
      session.git_repo_root = event.git_repo_root || null;
    }

    if (isNewSession) {
      this.log(`[Registry] Session auto-registered: ${event.session_id} - Project: "${session.project}"`);
    }

    return session;
  }

  /**
   * Mark session as idle
   * @param sessionId Session ID
   * @returns Updated session or null if session not found
   */
  setSessionIdle(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.warn(`[Registry] Idle event for unknown session: ${sessionId}`);
      return null;
    }

    session.status = 'idle';
    this.log(`[Registry] Session idle: ${sessionId}`);
    
    return session;
  }

  /**
   * Unregister a session
   * @param sessionId Session ID
   */
  unregisterSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.warn(`[Registry] Unregister for unknown session: ${sessionId}`);
      return;
    }

    this.sessions.delete(sessionId);
    this.log(`[Registry] Session removed: ${sessionId}`);

    // Clear focus if this was the focused session
    if (this.focusedSessionId === sessionId) {
      // Focus most recent remaining session
      const remaining = Array.from(this.sessions.values())
        .sort((a, b) => b.last_activity - a.last_activity);
      this.focusedSessionId = remaining[0]?.session_id || null;
      
      if (this.focusedSessionId) {
        this.log(`[Registry] Focus shifted to: ${this.focusedSessionId}`);
      }
    }
  }

  /**
   * Get a session by ID
   * @param sessionId Session ID
   * @returns Session or undefined
   */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions sorted by last activity (most recent first)
   * @returns Array of sessions
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.last_activity - a.last_activity);
  }

  /**
   * Get the focused session ID
   * @returns Focused session ID or null
   */
  getFocusedSessionId(): string | null {
    return this.focusedSessionId;
  }

  /**
   * Get the focused session
   * @returns Focused session or null
   */
  getFocusedSession(): Session | null {
    if (!this.focusedSessionId) return null;
    return this.sessions.get(this.focusedSessionId) || null;
  }

  /**
   * Manually set the focused session
   * @param sessionId Session ID to focus
   * @returns true if session exists and was focused
   */
  setFocusedSession(sessionId: string): boolean {
    if (!this.sessions.has(sessionId)) {
      this.warn(`[Registry] Cannot focus unknown session: ${sessionId}`);
      return false;
    }
    this.focusedSessionId = sessionId;
    this.log(`[Registry] Focus set to: ${sessionId}`);
    return true;
  }

  /**
   * Get the number of active sessions
   * @returns Session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Check if a session exists
   * @param sessionId Session ID
   * @returns true if session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Find a session by terminal key
   * @param terminalKey Terminal key to search for
   * @returns Session or null if not found
   */
  findSessionByTerminalKey(terminalKey: string): Session | null {
    // Extract the UUID part for iTerm keys (handle w1t0p0:UUID vs just UUID)
    const extractITermUUID = (key: string): string | null => {
      if (!key.startsWith('ITERM:')) return null;
      const parts = key.substring(6); // Remove "ITERM:"
      // If it contains ":", take the last part (the UUID)
      if (parts.includes(':')) {
        return parts.split(':').pop() || null;
      }
      return parts;
    };

    const searchUUID = extractITermUUID(terminalKey);

    for (const session of this.sessions.values()) {
      // Exact match
      if (session.terminal_key === terminalKey) {
        return session;
      }

      // For iTerm: match by UUID portion (handles w1t0p0:UUID vs UUID mismatch)
      if (searchUUID && session.terminal_key?.startsWith('ITERM:')) {
        const sessionUUID = extractITermUUID(session.terminal_key);
        if (sessionUUID === searchUUID) {
          return session;
        }
      }
    }
    return null;
  }

  /**
   * Clear all sessions (for testing or reset)
   */
  clear(): void {
    this.sessions.clear();
    this.focusedSessionId = null;
    this.log('[Registry] All sessions cleared');
  }

  /**
   * Start periodic cleanup of stale sessions
   * @param maxIdleMinutes Maximum idle time before a session is removed (default: 60 minutes)
   */
  startCleanup(maxIdleMinutes: number = 60): void {
    if (this.cleanupInterval) {
      return; // Already running
    }

    const runCleanup = (): void => {
      const cutoff = Date.now() - (maxIdleMinutes * 60 * 1000);
      const staleSessionIds: string[] = [];

      for (const [id, session] of this.sessions) {
        if (session.status === 'idle' && session.last_activity < cutoff) {
          staleSessionIds.push(id);
        }
      }

      for (const id of staleSessionIds) {
        this.log(`[Registry] Cleaning up stale session: ${id}`);
        this.unregisterSession(id);
      }

      if (staleSessionIds.length > 0) {
        this.log(`[Registry] Cleaned up ${staleSessionIds.length} stale session(s)`);
      }
    };

    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(runCleanup, 5 * 60 * 1000);
    this.log(`[Registry] Stale session cleanup started (threshold: ${maxIdleMinutes} minutes)`);
  }

  /**
   * Stop periodic cleanup of stale sessions
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.log('[Registry] Stale session cleanup stopped');
    }
  }
}
