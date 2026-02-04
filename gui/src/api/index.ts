/**
 * API Module
 *
 * HTTP client for Jacques server API.
 */

export {
  getSourcesStatus,
  configureGoogleDocs,
  disconnectGoogleDocs,
  configureNotion,
  disconnectNotion,
  // Archive API
  getArchiveStats,
  listArchivedConversations,
  listConversationsByProject,
  getArchivedConversation,
  searchArchivedConversations,
  initializeArchive,
  // Subagent API
  getSubagent,
  listSessionSubagents,
  // Sessions API (Hybrid Architecture)
  getSessionStats,
  listSessions,
  listSessionsByProject,
  getSession,
  getSubagentFromSession,
  getSessionBadges,
  getSessionPlanContent,
  getSessionWebSearches,
  rebuildSessionIndex,
  // Plan Catalog API
  getProjectPlanCatalog,
  getPlanCatalogContent,
} from './config';

export type {
  SourceStatus,
  SourcesStatus,
  GoogleDocsConfig,
  NotionConfig,
  // Archive types
  ArchiveStats,
  ConversationManifest,
  ArchiveProgress,
  ArchiveInitResult,
  ArchivedConversation,
  // Subagent types
  SubagentSummary,
  SubagentTokenStats,
  SubagentReference,
  ArchivedSubagent,
  // Sessions types (Hybrid Architecture)
  SessionEntry,
  SessionStats,
  ParsedEntry,
  EntryStatistics,
  SessionData,
  SubagentData,
  SessionBadges,
  RebuildProgress,
  SessionPlanContent,
  SessionWebSearch,
  // Plan Catalog types
  PlanCatalogEntry,
  PlanCatalogContent,
} from './config';
