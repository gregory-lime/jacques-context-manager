/**
 * Jacques Server
 *
 * Standalone entry point for the Jacques server.
 * Uses the embeddable server module for the actual implementation.
 */

import { startEmbeddedServer } from './start-server.js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const PID_FILE = join(homedir(), '.jacques', 'server.pid');

let server: Awaited<ReturnType<typeof startEmbeddedServer>> | null = null;

/**
 * Write PID file for process management
 */
function writePidFile(): void {
  try {
    const dir = join(homedir(), '.jacques');
    if (!existsSync(dir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(PID_FILE, String(process.pid));
  } catch (err) {
    console.error(`[Server] Warning: Could not write PID file: ${err}`);
  }
}

/**
 * Remove PID file on shutdown
 */
function removePidFile(): void {
  try {
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }
  } catch {
    // Ignore errors when removing PID file
  }
}

/**
 * Start the server
 */
async function start(): Promise<void> {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║         JACQUES - Claude Code Context Monitor          ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Write PID file for process management
    writePidFile();
    console.log(`[Server] PID: ${process.pid} (written to ${PID_FILE})`);

    server = await startEmbeddedServer({ silent: false });

    console.log('[Server] Waiting for Claude Code sessions...');
    console.log('[Server] Press Ctrl+C to stop');
    console.log('');

  } catch (err) {
    console.error(`[Server] Failed to start: ${err}`);
    removePidFile();
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(): Promise<void> {
  console.log('');

  if (server) {
    await server.stop();
  }

  // Clean up PID file
  removePidFile();

  process.exit(0);
}

// Register shutdown handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error(`[Server] Uncaught exception: ${err.message}`);
  console.error(err.stack);
  shutdown();
});

process.on('unhandledRejection', (reason) => {
  console.error(`[Server] Unhandled rejection: ${reason}`);
  shutdown();
});

// Start the server
start();
