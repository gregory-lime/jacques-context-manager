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
import { HandoffWatcher } from './watchers/handoff-watcher.js';
import { EventHandler } from './handlers/event-handler.js';
import type {
  ClientMessage,
  AutoCompactToggledMessage,
  ServerLogMessage,
  HandoffContextMessage,
  HandoffContextErrorMessage,
  GetHandoffContextRequest,
  FocusTerminalRequest,
  FocusTerminalResultMessage,
} from './types.js';
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
    broadcast: (msg) => wsServer.broadcast(msg),
    logger,
  });

  // Create event handler
  const eventHandler = new EventHandler({
    registry,
    broadcastService,
    handoffWatcher,
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
