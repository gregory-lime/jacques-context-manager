/**
 * Utils module exports
 */

export {
  // Claude settings
  getClaudeSettings,
  setClaudeSettings,
  getAutoCompactEnabled,
  setAutoCompact,
  toggleAutoCompact,
  getAutoCompactThreshold,
  // Jacques config
  getJacquesConfig,
  setJacquesConfig,
  // Archive settings
  getDefaultArchiveSettings,
  getArchiveSettings,
  setArchiveSettings,
  getArchiveFilter,
  setArchiveFilter,
  getAutoArchiveEnabled,
  setAutoArchiveEnabled,
  toggleAutoArchive,
  getArchivePath,
} from "./settings.js";

export type {
  ClaudeSettings,
  ArchiveFilterType,
  ArchiveSettings,
  JacquesConfig,
} from "./settings.js";

// Claude token management
export {
  validateToken,
  verifyToken,
  saveClaudeToken,
  getClaudeToken,
  isClaudeConnected,
  maskToken,
  disconnectClaude,
} from "./claude-token.js";
