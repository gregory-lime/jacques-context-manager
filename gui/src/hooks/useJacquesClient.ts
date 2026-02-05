import { useState, useEffect, useCallback } from 'react';
import type { Session, ClaudeOperation, ApiLog } from '../types';
import { toastStore } from '../components/ui/ToastContainer';

// WebSocket URL - the GUI connects to the Jacques server
// In production (served from HTTP API), we're on port 4243, WebSocket is on 4242
// In dev mode (Vite on 5173), WebSocket is on 4242
const SERVER_URL = import.meta.env.VITE_JACQUES_SERVER_URL || 'ws://localhost:4242';

// Server log type
export interface ServerLog {
  type: 'server_log';
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
  source: string;
}

// Simplified WebSocket client for browser use
// The full JacquesClient uses Node.js EventEmitter which isn't available in browsers
class BrowserJacquesClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  public onConnected?: () => void;
  public onDisconnected?: () => void;
  public onInitialState?: (sessions: Session[], focusedId: string | null) => void;
  public onSessionUpdate?: (session: Session) => void;
  public onSessionRemoved?: (sessionId: string) => void;
  public onFocusChanged?: (sessionId: string | null, session: Session | null) => void;
  public onAutocompactToggled?: (enabled: boolean) => void;
  public onServerLog?: (log: ServerLog) => void;
  public onClaudeOperation?: (operation: ClaudeOperation) => void;
  public onApiLog?: (log: ApiLog) => void;
  public onHandoffReady?: (sessionId: string, path: string) => void;

  connect() {
    try {
      this.ws = new WebSocket(SERVER_URL);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.onConnected?.();
      };

      this.ws.onclose = () => {
        this.onDisconnected?.();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // Will trigger onclose
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch {
          // Ignore parse errors
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleMessage(message: { type: string; [key: string]: unknown }) {
    switch (message.type) {
      case 'initial_state':
        this.onInitialState?.(
          message.sessions as Session[],
          message.focused_session_id as string | null
        );
        break;
      case 'session_update':
        this.onSessionUpdate?.(message.session as Session);
        break;
      case 'session_removed':
        this.onSessionRemoved?.(message.session_id as string);
        break;
      case 'focus_changed':
        this.onFocusChanged?.(
          message.session_id as string | null,
          message.session as Session | null
        );
        break;
      case 'autocompact_toggled':
        this.onAutocompactToggled?.(message.enabled as boolean);
        break;
      case 'server_log':
        this.onServerLog?.(message as unknown as ServerLog);
        break;
      case 'claude_operation':
        this.onClaudeOperation?.(message.operation as unknown as ClaudeOperation);
        break;
      case 'api_log':
        this.onApiLog?.({
          method: message.method as string,
          path: message.path as string,
          status: message.status as number,
          durationMs: message.durationMs as number,
          timestamp: message.timestamp as number,
        });
        break;
      case 'handoff_ready':
        this.onHandoffReady?.(
          message.session_id as string,
          message.path as string,
        );
        break;
    }
  }

  selectSession(sessionId: string) {
    this.send({ type: 'select_session', session_id: sessionId });
  }

  triggerAction(sessionId: string, action: string) {
    this.send({ type: 'trigger_action', session_id: sessionId, action });
  }

  toggleAutoCompact() {
    this.send({ type: 'toggle_autocompact' });
  }

  focusTerminal(sessionId: string) {
    this.send({ type: 'focus_terminal', session_id: sessionId });
  }

  tileWindows(sessionIds: string[], layout?: 'side-by-side' | 'thirds' | '2x2') {
    this.send({
      type: 'tile_windows',
      session_ids: sessionIds,
      layout,
    });
  }

  private send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  getIsConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export interface JacquesState {
  sessions: Session[];
  focusedSessionId: string | null;
  connected: boolean;
  lastUpdate: number;
  serverLogs: ServerLog[];
  claudeOperations: ClaudeOperation[];
  apiLogs: ApiLog[];
}

export interface UseJacquesClientReturn extends JacquesState {
  selectSession: (sessionId: string) => void;
  triggerAction: (
    sessionId: string,
    action: 'smart_compact' | 'new_session' | 'save_snapshot'
  ) => void;
  toggleAutoCompact: () => void;
  focusTerminal: (sessionId: string) => void;
  tileWindows: (sessionIds: string[], layout?: 'side-by-side' | 'thirds' | '2x2') => void;
}

const MAX_LOGS = 100;
const MAX_CLAUDE_OPS = 50;
const MAX_API_LOGS = 100;

export function useJacquesClient(): UseJacquesClientReturn {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [focusedSessionId, setFocusedSessionId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([]);
  const [claudeOperations, setClaudeOperations] = useState<ClaudeOperation[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [client, setClient] = useState<BrowserJacquesClient | null>(null);

  useEffect(() => {
    const jacquesClient = new BrowserJacquesClient();

    // Event handlers
    jacquesClient.onConnected = () => {
      setConnected(true);
      setLastUpdate(Date.now());
    };

    jacquesClient.onDisconnected = () => {
      setConnected(false);
      setLastUpdate(Date.now());
    };

    jacquesClient.onInitialState = (initialSessions: Session[], initialFocusedId: string | null) => {
      setSessions(initialSessions);
      setFocusedSessionId(initialFocusedId);
      setLastUpdate(Date.now());
    };

    jacquesClient.onSessionUpdate = (session: Session) => {
      setSessions(prev => {
        const index = prev.findIndex(s => s.session_id === session.session_id);
        let newSessions: Session[];
        if (index >= 0) {
          newSessions = [...prev];
          newSessions[index] = session;
        } else {
          newSessions = [...prev, session];
        }
        // Sort by last activity (most recent first)
        return newSessions.sort((a, b) => b.last_activity - a.last_activity);
      });
      setLastUpdate(Date.now());
    };

    jacquesClient.onSessionRemoved = (sessionId: string) => {
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      setFocusedSessionId(prev => {
        if (prev === sessionId) {
          return null;
        }
        return prev;
      });
      setLastUpdate(Date.now());
    };

    jacquesClient.onFocusChanged = (sessionId: string | null, session: Session | null) => {
      setFocusedSessionId(sessionId);

      if (session) {
        setSessions(prev => {
          const index = prev.findIndex(s => s.session_id === session.session_id);
          if (index >= 0) {
            const newSessions = [...prev];
            newSessions[index] = session;
            return newSessions.sort((a, b) => b.last_activity - a.last_activity);
          }
          return [...prev, session].sort((a, b) => b.last_activity - a.last_activity);
        });
      }

      setLastUpdate(Date.now());
    };

    jacquesClient.onAutocompactToggled = (enabled: boolean) => {
      setSessions(prev => prev.map(session => ({
        ...session,
        autocompact: session.autocompact ? {
          ...session.autocompact,
          enabled,
          bug_threshold: enabled ? null : 78,
        } : {
          enabled,
          threshold: 95,
          bug_threshold: enabled ? null : 78,
        },
      })));
      setLastUpdate(Date.now());
    };

    jacquesClient.onServerLog = (log: ServerLog) => {
      setServerLogs(prev => {
        const newLogs = [...prev, log];
        // Keep only the last MAX_LOGS entries
        if (newLogs.length > MAX_LOGS) {
          return newLogs.slice(-MAX_LOGS);
        }
        return newLogs;
      });
    };

    jacquesClient.onClaudeOperation = (operation: ClaudeOperation) => {
      setClaudeOperations(prev => {
        const newOps = [...prev, operation];
        // Keep only the last MAX_CLAUDE_OPS entries
        if (newOps.length > MAX_CLAUDE_OPS) {
          return newOps.slice(-MAX_CLAUDE_OPS);
        }
        return newOps;
      });
    };

    jacquesClient.onApiLog = (log: ApiLog) => {
      setApiLogs(prev => {
        const newLogs = [...prev, log];
        // Keep only the last MAX_API_LOGS entries
        if (newLogs.length > MAX_API_LOGS) {
          return newLogs.slice(-MAX_API_LOGS);
        }
        return newLogs;
      });
    };

    jacquesClient.onHandoffReady = (_sessionId: string, path: string) => {
      const filename = path.split('/').pop() ?? 'handoff';
      toastStore.push({
        title: 'Handoff Ready',
        body: `Generated ${filename}`,
        priority: 'medium',
        category: 'handoff',
      });
    };

    // Connect
    jacquesClient.connect();
    setClient(jacquesClient);

    // Cleanup on unmount
    return () => {
      if (jacquesClient.getIsConnected()) {
        jacquesClient.disconnect();
      }
    };
  }, []);

  const selectSession = useCallback((sessionId: string) => {
    client?.selectSession(sessionId);
  }, [client]);

  const triggerAction = useCallback((
    sessionId: string,
    action: 'smart_compact' | 'new_session' | 'save_snapshot'
  ) => {
    client?.triggerAction(sessionId, action);
  }, [client]);

  const toggleAutoCompact = useCallback(() => {
    client?.toggleAutoCompact();
  }, [client]);

  const focusTerminal = useCallback((sessionId: string) => {
    client?.focusTerminal(sessionId);
  }, [client]);

  const tileWindows = useCallback((sessionIds: string[], layout?: 'side-by-side' | 'thirds' | '2x2') => {
    client?.tileWindows(sessionIds, layout);
  }, [client]);

  return {
    sessions,
    focusedSessionId,
    connected,
    lastUpdate,
    serverLogs,
    claudeOperations,
    apiLogs,
    selectSession,
    triggerAction,
    toggleAutoCompact,
    focusTerminal,
    tileWindows,
  };
}
