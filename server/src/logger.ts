/**
 * Logger Module
 *
 * Provides console interception and WebSocket broadcasting for server logs.
 * Allows GUI to display real-time server logs.
 */

import type { ServerLogMessage } from './types.js';

type LogLevel = 'info' | 'warn' | 'error';
type LogCallback = (message: ServerLogMessage) => void;

// Store original console methods
const originalConsole = {
  log: console.log.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

// Log listeners
const listeners: Set<LogCallback> = new Set();

// Max log history for new clients
const LOG_HISTORY_SIZE = 100;
const logHistory: ServerLogMessage[] = [];

/**
 * Create a log message
 */
function createLogMessage(level: LogLevel, args: unknown[], source: string): ServerLogMessage {
  const message = args
    .map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');

  return {
    type: 'server_log',
    level,
    message,
    timestamp: Date.now(),
    source,
  };
}

/**
 * Parse source from log message (e.g., "[Server]" or "[HTTP API]")
 */
function parseSource(message: string): string {
  const match = message.match(/^\[([^\]]+)\]/);
  return match ? match[1] : 'Server';
}

/**
 * Broadcast log to all listeners
 */
function broadcastLog(logMessage: ServerLogMessage): void {
  // Add to history
  logHistory.push(logMessage);
  if (logHistory.length > LOG_HISTORY_SIZE) {
    logHistory.shift();
  }

  // Notify listeners
  for (const listener of listeners) {
    try {
      listener(logMessage);
    } catch {
      // Ignore listener errors
    }
  }
}

/**
 * Start intercepting console output
 */
export function startLogInterception(): void {
  console.log = (...args: unknown[]) => {
    originalConsole.log(...args);
    const firstArg = String(args[0] || '');
    const source = parseSource(firstArg);
    broadcastLog(createLogMessage('info', args, source));
  };

  console.warn = (...args: unknown[]) => {
    originalConsole.warn(...args);
    const firstArg = String(args[0] || '');
    const source = parseSource(firstArg);
    broadcastLog(createLogMessage('warn', args, source));
  };

  console.error = (...args: unknown[]) => {
    originalConsole.error(...args);
    const firstArg = String(args[0] || '');
    const source = parseSource(firstArg);
    broadcastLog(createLogMessage('error', args, source));
  };
}

/**
 * Stop intercepting console output
 */
export function stopLogInterception(): void {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}

/**
 * Add a log listener
 */
export function addLogListener(callback: LogCallback): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Get log history
 */
export function getLogHistory(): ServerLogMessage[] {
  return [...logHistory];
}

/**
 * Clear log history
 */
export function clearLogHistory(): void {
  logHistory.length = 0;
}
