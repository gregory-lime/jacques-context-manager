/**
 * Cache Module
 *
 * Lightweight session indexing without content duplication.
 * Reads directly from Claude Code JSONL files.
 */

export {
  // Types
  type SessionEntry,
  type SessionIndex,
  // Constants
  getDefaultSessionIndex,
  decodeProjectPath,
  // Path helpers
  getCacheDir,
  getIndexPath,
  ensureCacheDir,
  // Index operations
  readSessionIndex,
  writeSessionIndex,
  extractSessionMetadata,
  listAllProjects,
  buildSessionIndex,
  getSessionIndex,
  getSessionEntry,
  getSessionsByProject,
  getIndexStats,
  invalidateIndex,
  detectModeAndPlans,
} from "./session-index.js";
