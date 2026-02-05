/**
 * Embeddable Server Module
 *
 * Provides a programmatic interface to start the Jacques server.
 * Can be imported and used by the dashboard or run standalone.
 */

import { SessionRegistry } from './session-registry.js';
import { UnixSocketServer } from './unix-socket.js';
import { JacquesWebSocketServer } from './websocket.js';
import { startFocusWatcher } from './focus-watcher.js';
import { createHttpApi, type HttpApiServer } from './http-api.js';
import { startLogInterception, stopLogInterception, addLogListener } from './logger.js';
import { ServerConfig } from './config/config.js';
import { createLogger, type Logger } from './logging/logger-factory.js';
import { BroadcastService } from './services/broadcast-service.js';
import { NotificationService } from './services/notification-service.js';
import { HandoffWatcher } from './watchers/handoff-watcher.js';
import { EventHandler } from './handlers/event-handler.js';
import { scanForActiveSessions } from './process-scanner.js';
import type {
  ClientMessage,
  AutoCompactToggledMessage,
  ServerLogMessage,
  HandoffContextMessage,
  HandoffContextErrorMessage,
  GetHandoffContextRequest,
  FocusTerminalRequest,
  FocusTerminalResultMessage,
  TileWindowsRequest,
  TileWindowsResultMessage,
  UpdateNotificationSettingsRequest,
  NotificationSettingsMessage,
  ChatSendRequest,
  ChatAbortRequest,
  CatalogUpdatedMessage,
} from './types.js';
import { ChatService } from './services/chat-service.js';
import { WebSocket } from 'ws';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { getCompactContextForSkill } from '@jacques/core/handoff';
import { ClaudeOperationLogger } from '@jacques/core';
import { activateTerminal } from './terminal-activator.js';

export interface EmbeddedServerOptions {
  /** Suppress console output */
  silent?: boolean;
  /** Unix socket path (default: /tmp/jacques.sock) */
  unixSocketPath?: string;
  /** WebSocket port (default: 4242) */
  wsPort?: number;
  /** HTTP API port (default: 4243) */
  httpPort?: number;
}

export interface EmbeddedServer {
  /** Stop the server and clean up resources */
  stop: () => Promise<void>;
  /** Get the session registry */
  getRegistry: () => SessionRegistry;
  /** Get the WebSocket server */
  getWebSocketServer: () => JacquesWebSocketServer;
}

/**
 * Start the Jacques server programmatically
 */
export async function startEmbeddedServer(
  options: EmbeddedServerOptions = {}
): Promise<EmbeddedServer> {
  const {
    silent = false,
    unixSocketPath = ServerConfig.unixSocketPath,
    wsPort = ServerConfig.wsPort,
    httpPort = ServerConfig.httpPort,
  } = options;

  // Create logger for orchestrator
  const logger = createLogger({ silent, prefix: 'Server' });

  // Initialize core components
  const registry = new SessionRegistry({ silent });
  let focusWatcher: { stop: () => void } | null = null;
  let httpServer: HttpApiServer | null = null;

  // Create WebSocket server
  const wsServer = new JacquesWebSocketServer({
    port: wsPort,
    onClientMessage: handleClientMessage,
    silent,
  });

  // Set state provider for WebSocket server
  wsServer.setStateProvider({
    getAllSessions: () => registry.getAllSessions(),
    getFocusedSessionId: () => registry.getFocusedSessionId(),
    getFocusedSession: () => registry.getFocusedSession(),
  });

  // Create broadcast service
  const broadcastService = new BroadcastService({
    wsServer,
    registry,
    logger,
  });

  // Create handoff watcher
  const handoffWatcher = new HandoffWatcher({
    handoffFilename: ServerConfig.handoffFilename,
    broadcast: (msg) => {
      wsServer.broadcast(msg);
      // Also notify the notification service about handoff_ready
      if (msg.type === 'handoff_ready') {
        notificationService.onHandoffReady(msg.session_id, msg.path);
      }
    },
    logger,
  });

  // Create notification service
  const notificationService = new NotificationService({
    broadcast: (msg) => wsServer.broadcast(msg),
    logger,
  });

  // Create chat service
  const chatService = new ChatService({
    logger,
    onCatalogChange: (projectPath: string) => {
      const msg: CatalogUpdatedMessage = {
        type: 'catalog_updated',
        projectPath,
        action: 'refresh',
      };
      wsServer.broadcast(msg);
    },
  });

  // Create event handler
  const eventHandler = new EventHandler({
    registry,
    broadcastService,
    handoffWatcher,
    notificationService,
    logger,
  });

  // Create Unix socket server
  const unixServer = new UnixSocketServer({
    socketPath: unixSocketPath,
    onEvent: (event) => eventHandler.handleEvent(event),
    onError: (err) => {
      logger.error(`Unix socket error: ${err.message}`);
    },
    silent,
  });

  // Wire up Claude operations to broadcast via WebSocket
  ClaudeOperationLogger.onOperation = (op) => {
    logger.log(`Claude operation: ${op.operation} (${op.inputTokens} in, ${op.outputTokens} out, ${op.durationMs}ms)`);
    wsServer.broadcastClaudeOperation(op);
    // Also check for large operation notifications
    notificationService.onClaudeOperation({
      id: op.id,
      operation: op.operation,
      phase: op.phase,
      totalTokens: op.totalTokens,
      userPromptPreview: op.userPromptPreview,
    });
  };

  /**
   * Handle client messages
   */
  function handleClientMessage(ws: WebSocket, message: ClientMessage): void {
    switch (message.type) {
      case 'select_session':
        if (registry.setFocusedSession(message.session_id)) {
          broadcastService.forceBroadcastFocusChange();
        }
        break;

      case 'trigger_action':
        logger.log(`Action requested: ${message.action} for session ${message.session_id}`);
        break;

      case 'toggle_autocompact':
        handleToggleAutoCompact(ws);
        break;

      case 'get_handoff_context':
        handleGetHandoffContext(ws, message as GetHandoffContextRequest);
        break;

      case 'focus_terminal':
        handleFocusTerminal(ws, message as FocusTerminalRequest);
        break;

      case 'tile_windows':
        handleTileWindows(ws, message as TileWindowsRequest);
        break;

      case 'update_notification_settings':
        handleUpdateNotificationSettings(ws, message as UpdateNotificationSettingsRequest);
        break;

      case 'chat_send': {
        const chatMsg = message as ChatSendRequest;
        chatService.send(ws, chatMsg.projectPath, chatMsg.message);
        break;
      }

      case 'chat_abort': {
        const abortMsg = message as ChatAbortRequest;
        chatService.abort(abortMsg.projectPath);
        break;
      }

      default:
        logger.error(`Unknown client message type: ${(message as ClientMessage).type}`);
    }
  }

  /**
   * Handle get handoff context request
   * Returns compact pre-extracted context for LLM skill (~2k tokens)
   */
  async function handleGetHandoffContext(
    ws: WebSocket,
    request: GetHandoffContextRequest
  ): Promise<void> {
    const session = registry.getSession(request.session_id);

    if (!session) {
      sendErrorResponse(ws, request.session_id, `Session not found: ${request.session_id}`);
      return;
    }

    if (!session.transcript_path) {
      sendErrorResponse(ws, request.session_id, 'Session has no transcript path');
      return;
    }

    const projectDir = session.workspace?.project_dir || session.cwd;

    try {
      logger.log(`Extracting compact handoff context for session ${request.session_id}`);
      const result = await getCompactContextForSkill(session.transcript_path, projectDir);

      const response: HandoffContextMessage = {
        type: 'handoff_context',
        session_id: request.session_id,
        context: result.context,
        token_estimate: result.tokenEstimate,
        data: {
          title: result.data.title,
          projectDir: result.data.projectDir,
          filesModified: result.data.filesModified,
          toolsUsed: result.data.toolsUsed,
          recentMessages: result.data.recentMessages,
          assistantHighlights: result.data.assistantHighlights,
          decisions: result.data.decisions,
          technologies: result.data.technologies,
          blockers: result.data.blockers,
          totalUserMessages: result.data.totalUserMessages,
          totalToolCalls: result.data.totalToolCalls,
          plans: result.data.plans,
        },
      };

      logger.log(`Compact context extracted: ~${result.tokenEstimate} tokens`);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response));
      }
    } catch (err) {
      logger.error(`Failed to extract handoff context: ${err}`);
      sendErrorResponse(
        ws,
        request.session_id,
        `Failed to extract context: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * Send error response for handoff context request
   */
  function sendErrorResponse(ws: WebSocket, sessionId: string, error: string): void {
    const errorResponse: HandoffContextErrorMessage = {
      type: 'handoff_context_error',
      session_id: sessionId,
      error,
    };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(errorResponse));
    }
  }

  /**
   * Handle toggle auto-compact request
   */
  function handleToggleAutoCompact(ws: WebSocket): void {
    try {
      let settings: Record<string, unknown> = {};
      if (existsSync(ServerConfig.claudeSettingsPath)) {
        try {
          const content = readFileSync(ServerConfig.claudeSettingsPath, 'utf-8');
          settings = JSON.parse(content);
        } catch {
          // Start fresh if file is corrupted
        }
      }

      const currentValue = settings.autoCompact !== false;
      const newValue = !currentValue;
      settings.autoCompact = newValue;

      const dir = dirname(ServerConfig.claudeSettingsPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(ServerConfig.claudeSettingsPath, JSON.stringify(settings, null, 2));

      const response: AutoCompactToggledMessage = {
        type: 'autocompact_toggled',
        enabled: newValue,
        warning: newValue ? undefined : 'Known bug: may still trigger at ~78%',
      };

      logger.log(`Auto-compact toggled to: ${newValue ? 'ON' : 'OFF'}`);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response));
      }

      // Update all sessions with new autocompact status
      const sessions = registry.getAllSessions();
      for (const session of sessions) {
        session.autocompact = {
          enabled: newValue,
          threshold: ServerConfig.autoCompactThreshold,
          bug_threshold: newValue ? null : 78,
        };
        wsServer.broadcastSessionUpdate(session);
      }
    } catch (err) {
      logger.error(`Failed to toggle auto-compact: ${err}`);
    }
  }

  /**
   * Handle focus terminal request
   * Looks up the session's terminal_key and activates the terminal window
   */
  async function handleFocusTerminal(
    ws: WebSocket,
    request: FocusTerminalRequest
  ): Promise<void> {
    const session = registry.getSession(request.session_id);

    if (!session) {
      const response: FocusTerminalResultMessage = {
        type: 'focus_terminal_result',
        session_id: request.session_id,
        success: false,
        method: 'unsupported',
        error: `Session not found: ${request.session_id}`,
      };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response));
      }
      return;
    }

    logger.log(`Focusing terminal for session ${request.session_id} (key: ${session.terminal_key})`);

    if (!session.terminal_key) {
      const response: FocusTerminalResultMessage = {
        type: 'focus_terminal_result',
        session_id: request.session_id,
        success: false,
        method: 'unsupported',
        error: 'Session has no terminal key',
      };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response));
      }
      return;
    }

    const result = await activateTerminal(session.terminal_key);

    const response: FocusTerminalResultMessage = {
      type: 'focus_terminal_result',
      session_id: request.session_id,
      success: result.success,
      method: result.method,
      error: result.error,
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
    }

    if (result.success) {
      logger.log(`Terminal focused via ${result.method} for session ${request.session_id}`);
    } else {
      logger.log(`Terminal focus failed (${result.method}): ${result.error}`);
    }
  }

  /**
   * Handle tile windows request
   * Tiles multiple terminal windows side-by-side or in a grid
   */
  async function handleTileWindows(
    ws: WebSocket,
    request: TileWindowsRequest
  ): Promise<void> {
    const { session_ids, layout: requestedLayout, display_id } = request;

    if (!session_ids || session_ids.length === 0) {
      const response: TileWindowsResultMessage = {
        type: 'tile_windows_result',
        success: false,
        positioned: 0,
        total: 0,
        layout: 'side-by-side',
        errors: ['No session IDs provided'],
      };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response));
      }
      return;
    }

    // Get terminal keys for the requested sessions
    const terminalKeys: string[] = [];
    const errors: string[] = [];

    for (const sessionId of session_ids) {
      const session = registry.getSession(sessionId);
      if (!session) {
        errors.push(`Session not found: ${sessionId}`);
        continue;
      }
      if (!session.terminal_key) {
        errors.push(`Session has no terminal key: ${sessionId}`);
        continue;
      }
      terminalKeys.push(session.terminal_key);
    }

    if (terminalKeys.length === 0) {
      const response: TileWindowsResultMessage = {
        type: 'tile_windows_result',
        success: false,
        positioned: 0,
        total: session_ids.length,
        layout: requestedLayout || 'side-by-side',
        errors,
      };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response));
      }
      return;
    }

    try {
      const { createWindowManager, isWindowManagementSupported, suggestLayout } = await import('./window-manager/index.js');

      if (!isWindowManagementSupported()) {
        const response: TileWindowsResultMessage = {
          type: 'tile_windows_result',
          success: false,
          positioned: 0,
          total: terminalKeys.length,
          layout: requestedLayout || 'side-by-side',
          errors: ['Window management not supported on this platform'],
        };
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(response));
        }
        return;
      }

      const manager = createWindowManager();
      const layout = requestedLayout || suggestLayout(terminalKeys.length);

      // Get target display if specified
      let targetDisplay;
      if (display_id) {
        const displays = await manager.getDisplays();
        targetDisplay = displays.find(d => d.id === display_id);
      }

      logger.log(`Tiling ${terminalKeys.length} windows with layout: ${layout}`);
      const result = await manager.tileWindows(terminalKeys, layout, targetDisplay);

      const response: TileWindowsResultMessage = {
        type: 'tile_windows_result',
        success: result.success,
        positioned: result.positioned,
        total: result.total,
        layout,
        errors: [...errors, ...(result.errors || [])].length > 0 ? [...errors, ...(result.errors || [])] : undefined,
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response));
      }

      if (result.success) {
        logger.log(`Tiled ${result.positioned}/${result.total} windows`);
      } else {
        logger.log(`Partial tile: ${result.positioned}/${result.total} windows positioned`);
      }
    } catch (err) {
      logger.error(`Failed to tile windows: ${err}`);
      const response: TileWindowsResultMessage = {
        type: 'tile_windows_result',
        success: false,
        positioned: 0,
        total: terminalKeys.length,
        layout: requestedLayout || 'side-by-side',
        errors: [err instanceof Error ? err.message : String(err)],
      };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(response));
      }
    }
  }

  /**
   * Handle update notification settings request
   */
  function handleUpdateNotificationSettings(
    ws: WebSocket,
    request: UpdateNotificationSettingsRequest
  ): void {
    const updated = notificationService.updateSettings(request.settings);
    const response: NotificationSettingsMessage = {
      type: 'notification_settings',
      settings: updated,
    };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
    }
    logger.log(`Notification settings updated: desktop=${updated.enabled}`);
  }

  // Start log interception for broadcasting to GUI
  startLogInterception();

  // Add log listener to broadcast to WebSocket clients
  const removeLogListener = addLogListener((logMessage: ServerLogMessage) => {
    wsServer.broadcast(logMessage);
  });

  // Start the server
  if (!silent) {
    logger.log('');
    logger.log('Starting Jacques server...');
  }

  try {
    // Start Unix socket server
    await unixServer.start();

    // Start WebSocket server
    await wsServer.start();

    // Start HTTP API server with API log callback
    httpServer = await createHttpApi({
      port: httpPort,
      silent,
      onApiLog: (log) => {
        wsServer.broadcastApiLog(log);
      },
      notificationService,
    });

    // Start stale session cleanup
    registry.startCleanup(ServerConfig.staleSessionCleanupMinutes);

    // Start terminal focus watcher
    focusWatcher = startFocusWatcher(
      {
        onFocusChange: (terminalKey) => {
          if (terminalKey) {
            const session = registry.findSessionByTerminalKey(terminalKey);
            if (session && session.session_id !== registry.getFocusedSessionId()) {
              logger.log(`Terminal focus detected: ${terminalKey} -> ${session.session_id}`);
              registry.setFocusedSession(session.session_id);
              broadcastService.forceBroadcastFocusChange();
            }
          }
        },
      },
      ServerConfig.focusWatcherPollMs,
      { silent }
    );

    if (!silent) {
      logger.log('Jacques server started successfully');
      logger.log(`Unix socket: ${unixSocketPath}`);
      logger.log(`WebSocket:   ws://localhost:${wsPort}`);
      logger.log(`HTTP API:    http://localhost:${httpPort}`);
      logger.log('');
    }

    // Scan for existing Claude sessions at startup
    try {
      logger.log('Scanning for running Claude Code sessions...');
      const discovered = await scanForActiveSessions();
      for (const session of discovered) {
        const registered = registry.registerDiscoveredSession(session);
        broadcastService.broadcastSessionWithFocus(registered);
      }
      if (discovered.length > 0) {
        logger.log(`Found ${discovered.length} active session(s)`);
      } else {
        logger.log('No active sessions found');
      }
    } catch (err) {
      logger.warn(`Session scan failed: ${err}`);
    }
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'EADDRINUSE') {
      logger.error(`Port already in use. Another Jacques server may be running.`);
      logger.error(`Run: npm run stop:server`);
    } else {
      logger.error(`Failed to start: ${err}`);
    }
    throw err;
  }

  // Return the server interface
  return {
    stop: async () => {
      if (!silent) {
        logger.log('Shutting down...');
      }

      try {
        // Stop watchers and intervals synchronously (fast operations)
        if (focusWatcher) {
          focusWatcher.stop();
          focusWatcher = null;
        }

        registry.stopCleanup();
        handoffWatcher.stopAll();
        chatService.killAll();

        // Remove log listener
        removeLogListener();

        // Stop all servers in parallel (async operations)
        const shutdownPromises: Promise<void>[] = [];

        if (httpServer) {
          shutdownPromises.push(
            httpServer.stop().catch((err) => {
              logger.error(`HTTP API stop error: ${err}`);
            })
          );
        }

        shutdownPromises.push(
          unixServer.stop().catch((err) => {
            logger.error(`UnixSocket stop error: ${err}`);
          }),
          wsServer.stop().catch((err) => {
            logger.error(`WebSocket stop error: ${err}`);
          })
        );

        // Wait for all servers to stop
        await Promise.all(shutdownPromises);

        // Stop log interception last
        stopLogInterception();

        if (!silent) {
          logger.log('Shutdown complete');
        }
      } catch (err) {
        logger.error(`Error during shutdown: ${err}`);
        throw err;
      }
    },
    getRegistry: () => registry,
    getWebSocketServer: () => wsServer,
  };
}
