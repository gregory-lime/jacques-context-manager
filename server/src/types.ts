/**
 * Jacques Server Types
 * 
 * Type definitions for sessions, events, and context metrics
 * used throughout the Jacques server and dashboard.
 */

// ============================================================
// Terminal Identity
// ============================================================

/**
 * Terminal-specific identifiers captured from environment
 * Used to uniquely identify terminal instances
 */
export interface TerminalIdentity {
  tty: string | null;
  terminal_pid: number;
  term_program: string | null;
  iterm_session_id: string | null;
  term_session_id: string | null;
  kitty_window_id: string | null;
  wezterm_pane: string | null;
  vscode_injection: string | null;
  windowid: string | null;
  term: string | null;
}

// ============================================================
// Auto-Compact Status
// ============================================================

/**
 * Auto-compact status for Claude Code sessions
 * 
 * Claude Code has an `autoCompact` setting in ~/.claude/settings.json.
 * Known Bug (Issue #18264): Even with autoCompact: false, compaction 
 * still triggers at ~78% context usage.
 */
export interface AutoCompactStatus {
  /** Whether auto-compact is enabled in settings.json (true if not set) */
  enabled: boolean;
  /** Threshold percentage for auto-compact (95 default, or from CLAUDE_AUTOCOMPACT_PCT_OVERRIDE) */
  threshold: number;
  /** Bug threshold - 78 if disabled due to known bug, null otherwise */
  bug_threshold: number | null;
}

// ============================================================
// Context Metrics
// ============================================================

/**
 * Context window metrics for a session
 * Tracks token usage, limits, and breakdown
 */
export interface ContextMetrics {
  /** Percentage of context window used (0-100) */
  used_percentage: number;
  /** Percentage of context window remaining (0-100) */
  remaining_percentage: number;
  /** Total tokens currently used */
  total_input_tokens: number;
  /** Total output tokens */
  total_output_tokens: number;
  /** Maximum context window size */
  context_window_size: number;
  /** Total cost in USD */
  total_cost_usd?: number;
  /** Total duration in ms */
  total_duration_ms?: number;
  /** True if this is an estimate (not actual from preCompact) */
  is_estimate?: boolean;
}

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  display_name: string;
}

/**
 * Workspace information
 */
export interface WorkspaceInfo {
  current_dir: string;
  project_dir: string;
}

// ============================================================
// Session
// ============================================================

/**
 * Session status
 */
export type SessionStatus = 'active' | 'working' | 'idle';

/**
 * Session source - identifies which AI tool the session is from
 */
export type SessionSource = 'claude_code' | 'cursor' | string;

/**
 * Complete session representation
 */
export interface Session {
  /** Unique session identifier from the AI tool */
  session_id: string;
  /** Source identifier (claude_code, cursor, etc.) */
  source: SessionSource;
  /** Human-readable session title (extracted from transcript) */
  session_title: string | null;
  /** Path to the session transcript file */
  transcript_path: string | null;
  /** Current working directory */
  cwd: string;
  /** Project name (derived from cwd) */
  project: string;
  /** Model information */
  model: ModelInfo | null;
  /** Workspace information */
  workspace: WorkspaceInfo | null;
  /** Terminal identity information */
  terminal: TerminalIdentity | null;
  /** Unique terminal key for identification */
  terminal_key: string;
  /** Current session status */
  status: SessionStatus;
  /** Timestamp of last activity */
  last_activity: number;
  /** Timestamp when session was registered */
  registered_at: number;
  /** Context metrics (updated from statusLine) */
  context_metrics: ContextMetrics | null;
  /** Session start reason (startup, resume, clear, compact) */
  start_reason?: 'startup' | 'resume' | 'clear' | 'compact';
  /** Auto-compact status (from ~/.claude/settings.json) */
  autocompact: AutoCompactStatus | null;
  /** Current git branch name */
  git_branch?: string | null;
  /** Git worktree name (if session is in a worktree) */
  git_worktree?: string | null;
  /** Canonical git repo root path (main worktree root, shared across all worktrees) */
  git_repo_root?: string | null;
}

// ============================================================
// Hook Events (Unix Socket → Server)
// ============================================================

/**
 * Base event structure
 */
interface BaseEvent {
  event: string;
  timestamp: number;
  session_id: string;
  /** Source identifier (claude_code, cursor, etc.) */
  source?: SessionSource;
}

/**
 * Session start event from SessionStart hook
 */
export interface SessionStartEvent extends BaseEvent {
  event: 'session_start';
  session_title: string | null;
  transcript_path: string | null;
  cwd: string;
  project: string;
  model?: string;
  /** Hook trigger reason (startup, resume, clear, compact) - different from source (AI tool) */
  hook_source?: 'startup' | 'resume' | 'clear' | 'compact';
  terminal: TerminalIdentity | null;
  terminal_key: string;
  /** Auto-compact settings (from ~/.claude/settings.json) */
  autocompact?: AutoCompactStatus;
  /** Git branch detected from project directory */
  git_branch?: string;
  /** Git worktree name */
  git_worktree?: string;
  /** Canonical git repo root path (main worktree root) */
  git_repo_root?: string;
}

/**
 * Activity event from PostToolUse hook
 */
export interface ActivityEvent extends BaseEvent {
  event: 'activity';
  session_title: string | null;
  tool_name: string;
  terminal_pid: number;
  context_metrics?: ContextMetrics;
}

/**
 * Context update event from statusLine or hooks
 */
export interface ContextUpdateEvent extends BaseEvent {
  event: 'context_update';
  used_percentage: number;
  remaining_percentage: number;
  context_window_size: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  model: string;
  model_display_name?: string;
  cwd: string;
  project_dir?: string;
  /** True if this is an estimate (from hooks), false if actual (from preCompact) */
  is_estimate?: boolean;
  /** Auto-compact settings (from ~/.claude/settings.json via statusLine) */
  autocompact?: AutoCompactStatus;
  /** Terminal key for focus detection (from statusLine hook) */
  terminal_key?: string;
  /** Session title extracted from transcript (from statusLine hook) */
  session_title?: string;
  /** Path to the session transcript file (from statusLine hook) */
  transcript_path?: string;
  /** Git branch detected from project directory */
  git_branch?: string;
  /** Git worktree name (basename of worktree dir) */
  git_worktree?: string;
  /** Canonical git repo root path (main worktree root) */
  git_repo_root?: string;
}

/**
 * Idle event from Stop hook
 */
export interface IdleEvent extends BaseEvent {
  event: 'idle';
  terminal_pid: number;
}

/**
 * Session end event from SessionEnd hook
 */
export interface SessionEndEvent extends BaseEvent {
  event: 'session_end';
  terminal_pid: number;
}

/**
 * Union type for all hook events
 */
export type HookEvent = 
  | SessionStartEvent 
  | ActivityEvent 
  | ContextUpdateEvent 
  | IdleEvent 
  | SessionEndEvent;

// ============================================================
// WebSocket Messages (Server ↔ Dashboard)
// ============================================================

/**
 * Initial state sent to newly connected clients
 */
export interface InitialStateMessage {
  type: 'initial_state';
  sessions: Session[];
  focused_session_id: string | null;
}

/**
 * Session update broadcast
 */
export interface SessionUpdateMessage {
  type: 'session_update';
  session: Session;
}

/**
 * Session removed broadcast
 */
export interface SessionRemovedMessage {
  type: 'session_removed';
  session_id: string;
}

/**
 * Focus changed broadcast
 */
export interface FocusChangedMessage {
  type: 'focus_changed';
  session_id: string | null;
  session: Session | null;
}

/**
 * Server status message
 */
export interface ServerStatusMessage {
  type: 'server_status';
  status: 'connected' | 'disconnected';
  session_count: number;
}

/**
 * Auto-compact toggled response
 */
export interface AutoCompactToggledMessage {
  type: 'autocompact_toggled';
  enabled: boolean;
  warning?: string;
}

/**
 * Handoff file ready notification
 */
export interface HandoffReadyMessage {
  type: 'handoff_ready';
  session_id: string;
  path: string;
}

/**
 * Handoff progress notification
 * Sent during handoff generation to show extractor progress
 */
export interface HandoffProgressMessage {
  type: 'handoff_progress';
  session_id: string;
  stage: 'starting' | 'extracting' | 'synthesizing' | 'writing' | 'complete';
  extractors_done: number;
  extractors_total: number;
  current_extractor?: string;
  output_file?: string;
}

/**
 * Server log message
 * Broadcast to clients for real-time log viewing
 */
export interface ServerLogMessage {
  type: 'server_log';
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  source: string;
}

/**
 * Handoff context response
 * Contains pre-extracted compact context for LLM skill (~2k tokens)
 */
export interface HandoffContextMessage {
  type: 'handoff_context';
  session_id: string;
  /** Compact context for LLM skill consumption */
  context: string;
  /** Estimated token count */
  token_estimate: number;
  /** Raw extracted data for reference */
  data: {
    title: string;
    projectDir: string;
    filesModified: string[];
    toolsUsed: string[];
    recentMessages: string[];
    assistantHighlights: string[];
    decisions: string[];
    technologies: string[];
    blockers: string[];
    totalUserMessages: number;
    totalToolCalls: number;
    plans?: Array<{ path: string; title: string }>;
  };
}

/**
 * Handoff context error response
 */
export interface HandoffContextErrorMessage {
  type: 'handoff_context_error';
  session_id: string;
  error: string;
}

/**
 * Claude operation message
 * Broadcasts Claude Code CLI operations (e.g., LLM handoff) to GUI
 */
export interface ClaudeOperationMessage {
  type: 'claude_operation';
  operation: {
    /** Unique identifier for this operation */
    id: string;
    /** ISO timestamp when operation started */
    timestamp: string;
    /** Operation type (e.g., "llm-handoff") */
    operation: string;
    /** Phase: "start" when beginning, "complete" when done */
    phase: 'start' | 'complete';
    /** Input tokens used by the LLM */
    inputTokens: number;
    /** Output tokens generated by the LLM */
    outputTokens: number;
    /** Total tokens (input + output) */
    totalTokens: number;
    /** Cache read tokens (if any) */
    cacheReadTokens?: number;
    /** Duration in milliseconds */
    durationMs: number;
    /** Whether the operation succeeded */
    success: boolean;
    /** Error message if operation failed */
    errorMessage?: string;
    /** Character count of user prompt */
    userPromptChars: number;
    /** Character count of system prompt */
    systemPromptChars: number;
    /** Estimated tokens for user prompt (~4 chars/token) */
    userPromptTokensEst?: number;
    /** Estimated tokens for system prompt (~4 chars/token) */
    systemPromptTokensEst?: number;
    /** Output content length (chars) */
    outputLength?: number;
    /** Truncated preview of user prompt */
    userPromptPreview?: string;
    /** Truncated preview of system prompt */
    systemPromptPreview?: string;
  };
}

/**
 * Focus terminal result message
 * Sent back to the client that requested terminal focus
 */
export interface FocusTerminalResultMessage {
  type: 'focus_terminal_result';
  session_id: string;
  success: boolean;
  method: string;
  error?: string;
}

// ============================================================
// Notification System
// ============================================================

/**
 * Notification category for server-side notifications
 */
export type NotificationCategory =
  | 'context'
  | 'operation'
  | 'plan'
  | 'auto-compact'
  | 'handoff';

/**
 * Server-side notification settings
 * Persisted in ~/.jacques/config.json under "notifications"
 */
export interface NotificationSettings {
  /** Whether desktop (OS) notifications are enabled */
  enabled: boolean;
  /** Per-category toggles */
  categories: Record<NotificationCategory, boolean>;
  /** Minimum tokens for a "large operation" notification */
  largeOperationThreshold: number;
  /** Context percentage thresholds that trigger notifications */
  contextThresholds: number[];
}

/**
 * A fired notification item
 */
export interface NotificationItem {
  /** Unique notification ID */
  id: string;
  /** Notification category */
  category: NotificationCategory;
  /** Short title */
  title: string;
  /** Longer description */
  body: string;
  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** When the notification was created */
  timestamp: number;
  /** Associated session ID, if any */
  sessionId?: string;
}

/**
 * Notification settings message (server → client)
 */
export interface NotificationSettingsMessage {
  type: 'notification_settings';
  settings: NotificationSettings;
}

/**
 * Notification fired message (server → client)
 * Sent when the server detects and fires a notification
 */
export interface NotificationFiredMessage {
  type: 'notification_fired';
  notification: NotificationItem;
}

/**
 * Client request to update notification settings
 */
export interface UpdateNotificationSettingsRequest {
  type: 'update_notification_settings';
  settings: Partial<NotificationSettings>;
}

/**
 * API log message
 * Broadcasts HTTP API requests to GUI for debugging
 */
export interface ApiLogMessage {
  type: 'api_log';
  /** HTTP method (GET, POST, DELETE) */
  method: string;
  /** Request path (e.g., /api/sources/status) */
  path: string;
  /** HTTP status code */
  status: number;
  /** Request duration in milliseconds */
  durationMs: number;
  /** Timestamp when request completed */
  timestamp: number;
}

// ============================================================
// Chat Messages (WebSocket: Client ↔ Server)
// ============================================================

/**
 * Client sends a chat message
 */
export interface ChatSendRequest {
  type: 'chat_send';
  projectPath: string;
  message: string;
}

/**
 * Client requests abort of active chat
 */
export interface ChatAbortRequest {
  type: 'chat_abort';
  projectPath: string;
}

/**
 * Server streams a text delta back
 */
export interface ChatDeltaMessage {
  type: 'chat_delta';
  projectPath: string;
  text: string;
}

/**
 * Server notifies about a tool being used
 */
export interface ChatToolEventMessage {
  type: 'chat_tool_event';
  projectPath: string;
  toolName: string;
}

/**
 * Server signals chat completion
 */
export interface ChatCompleteMessage {
  type: 'chat_complete';
  projectPath: string;
  fullText: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Server signals a chat error
 */
export interface ChatErrorMessage {
  type: 'chat_error';
  projectPath: string;
  reason: 'aborted' | 'timeout' | 'process_error' | 'spawn_failed' | 'already_active';
  message: string;
}

/**
 * Server notifies that project catalog was updated
 */
export interface CatalogUpdatedMessage {
  type: 'catalog_updated';
  projectPath: string;
  action: 'add' | 'update' | 'delete' | 'refresh';
  itemId?: string;
}

/**
 * Union type for all server → client messages
 */
export type ServerMessage =
  | InitialStateMessage
  | SessionUpdateMessage
  | SessionRemovedMessage
  | FocusChangedMessage
  | ServerStatusMessage
  | AutoCompactToggledMessage
  | HandoffReadyMessage
  | HandoffProgressMessage
  | ServerLogMessage
  | HandoffContextMessage
  | HandoffContextErrorMessage
  | ClaudeOperationMessage
  | ApiLogMessage
  | FocusTerminalResultMessage
  | NotificationSettingsMessage
  | NotificationFiredMessage
  | ChatDeltaMessage
  | ChatToolEventMessage
  | ChatCompleteMessage
  | ChatErrorMessage
  | CatalogUpdatedMessage;

/**
 * Client request to select a session
 */
export interface SelectSessionRequest {
  type: 'select_session';
  session_id: string;
}

/**
 * Client request to trigger an action
 */
export interface TriggerActionRequest {
  type: 'trigger_action';
  session_id: string;
  action: 'smart_compact' | 'new_session' | 'save_snapshot';
  options?: Record<string, unknown>;
}

/**
 * Client request to toggle auto-compact setting
 */
export interface ToggleAutoCompactRequest {
  type: 'toggle_autocompact';
  session_id?: string;
}

/**
 * Client request to get compact handoff context for LLM skill
 */
export interface GetHandoffContextRequest {
  type: 'get_handoff_context';
  session_id: string;
}

/**
 * Client request to focus a terminal window
 */
export interface FocusTerminalRequest {
  type: 'focus_terminal';
  session_id: string;
}

/**
 * Union type for all client → server messages
 */
export type ClientMessage =
  | SelectSessionRequest
  | TriggerActionRequest
  | ToggleAutoCompactRequest
  | GetHandoffContextRequest
  | FocusTerminalRequest
  | UpdateNotificationSettingsRequest
  | ChatSendRequest
  | ChatAbortRequest;

// ============================================================
// Configuration
// ============================================================

/**
 * Jacques server configuration
 */
export interface ServerConfig {
  unix_socket_path: string;
  websocket_port: number;
  log_level: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Default server configuration
 */
export const DEFAULT_CONFIG: ServerConfig = {
  unix_socket_path: '/tmp/jacques.sock',
  websocket_port: 4242,
  log_level: 'info',
};
