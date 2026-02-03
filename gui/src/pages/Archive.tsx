import { useState, useEffect, useCallback } from 'react';
import { colors } from '../styles/theme';
import { ConversationViewer } from '../components/Conversation';
import type { SavedConversation, ConversationMessage, MessageContent } from '../types';
import {
  getSessionStats,
  listSessionsByProject,
  getSession,
  rebuildSessionIndex,
  type SessionStats,
  type SessionEntry,
  type RebuildProgress,
  type ParsedEntry,
} from '../api';

// Format date to readable string
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

// Format token count with K/M suffix
function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(0)}K`;
  }
  return count.toString();
}

/**
 * Transform ParsedEntry array to ConversationMessage array for the viewer
 * This replaces the old transform that read from archived JSON
 */
function transformEntriesToMessages(
  entries: ParsedEntry[],
  subagentTokenMap?: Map<string, { tokenCount: number; messageCount: number; model?: string }>
): ConversationMessage[] {
  const messages: ConversationMessage[] = [];
  let currentAssistantMessage: ConversationMessage | null = null;

  // Track seen agent IDs globally to avoid duplicates across all messages
  const seenAgentIds = new Set<string>();

  for (const entry of entries) {
    if (entry.type === 'user_message') {
      // Skip internal command messages (console/CLI internal messages)
      // BUT preserve /clear commands so we can show markers
      const text = entry.content.text || '';
      const isClearCommand = text.includes('<command-name>/clear</command-name>');
      if (
        !isClearCommand && (
          text.startsWith('<local-command-caveat>') ||
          text.startsWith('<command-name>') ||
          text.startsWith('<local-command-stdout>') ||
          text.startsWith('<command-message>') ||
          text.startsWith('<command-args>') ||
          // Also skip messages that are just whitespace or very short internal markers
          text.trim().length === 0
        )
      ) {
        continue;
      }

      // Flush any pending assistant message
      if (currentAssistantMessage) {
        messages.push(currentAssistantMessage);
        currentAssistantMessage = null;
      }
      // Add user message
      messages.push({
        id: entry.uuid,
        role: 'user',
        timestamp: new Date(entry.timestamp).getTime(),
        content: entry.content.text ? [{ type: 'text', text: entry.content.text }] : [],
      });
    } else if (entry.type === 'assistant_message') {
      // Flush any pending assistant message
      if (currentAssistantMessage) {
        messages.push(currentAssistantMessage);
      }
      // Start new assistant message
      const content: MessageContent[] = [];
      if (entry.content.thinking) {
        content.push({ type: 'thinking', text: entry.content.thinking });
      }
      if (entry.content.text) {
        content.push({ type: 'text', text: entry.content.text });
      }
      currentAssistantMessage = {
        id: entry.uuid,
        role: 'assistant',
        timestamp: new Date(entry.timestamp).getTime(),
        content,
        tokens: entry.content.usage
          ? {
              input: entry.content.usage.inputTokens,
              output: entry.content.usage.outputTokens,
              cacheCreation: entry.content.usage.cacheCreation,
              cacheRead: entry.content.usage.cacheRead,
            }
          : undefined,
        model: entry.content.model,
        durationMs: entry.content.durationMs,
        costUSD: entry.content.costUSD,
      };
    } else if (entry.type === 'tool_call') {
      // Add to current assistant message or create one
      if (!currentAssistantMessage) {
        currentAssistantMessage = {
          id: `assistant-${entry.uuid}`,
          role: 'assistant',
          timestamp: new Date(entry.timestamp).getTime(),
          content: [],
          tokens: entry.content.usage
            ? {
                input: entry.content.usage.inputTokens,
                output: entry.content.usage.outputTokens,
                cacheCreation: entry.content.usage.cacheCreation,
                cacheRead: entry.content.usage.cacheRead,
              }
            : undefined,
          model: entry.content.model,
          durationMs: entry.content.durationMs,
          costUSD: entry.content.costUSD,
        };
      } else if (entry.content.usage) {
        // Accumulate tokens from tool calls into existing assistant message
        if (!currentAssistantMessage.tokens) {
          currentAssistantMessage.tokens = {
            input: 0,
            output: 0,
          };
        }
        currentAssistantMessage.tokens.input =
          (currentAssistantMessage.tokens.input || 0) + (entry.content.usage.inputTokens || 0);
        currentAssistantMessage.tokens.output =
          (currentAssistantMessage.tokens.output || 0) + (entry.content.usage.outputTokens || 0);
        currentAssistantMessage.tokens.cacheCreation =
          (currentAssistantMessage.tokens.cacheCreation || 0) + (entry.content.usage.cacheCreation || 0);
        currentAssistantMessage.tokens.cacheRead =
          (currentAssistantMessage.tokens.cacheRead || 0) + (entry.content.usage.cacheRead || 0);
        // Accumulate cost and duration too
        if (entry.content.costUSD) {
          currentAssistantMessage.costUSD = (currentAssistantMessage.costUSD || 0) + entry.content.costUSD;
        }
        if (entry.content.durationMs) {
          currentAssistantMessage.durationMs = (currentAssistantMessage.durationMs || 0) + entry.content.durationMs;
        }
      }
      currentAssistantMessage.content.push({
        type: 'tool_use',
        id: entry.uuid,
        name: entry.content.toolName || 'Unknown',
        input: entry.content.toolInput || {},
      });
    } else if (entry.type === 'tool_result') {
      // Add to current assistant message
      if (currentAssistantMessage) {
        currentAssistantMessage.content.push({
          type: 'tool_result',
          tool_use_id: entry.uuid,
          content: entry.content.toolResultContent || '',
          is_error: false,
        });
      }
    } else if (entry.type === 'agent_progress') {
      // Add agent progress to assistant message
      // IMPORTANT: Deduplicate by agentId GLOBALLY - only show one block per subagent
      // Claude Code sends multiple progress entries as the agent conversation progresses
      const agentId = entry.content.agentId;

      // Skip if we've already seen this agent
      if (!agentId || seenAgentIds.has(agentId)) {
        continue;
      }

      // Mark as seen
      seenAgentIds.add(agentId);

      if (!currentAssistantMessage) {
        currentAssistantMessage = {
          id: `assistant-${entry.uuid}`,
          role: 'assistant',
          timestamp: new Date(entry.timestamp).getTime(),
          content: [],
        };
      }

      // Look up subagent token info if available
      const subagentInfo = subagentTokenMap ? subagentTokenMap.get(agentId) : undefined;
      currentAssistantMessage.content.push({
        type: 'agent_progress',
        prompt: entry.content.agentPrompt,
        agentId: agentId,
        // Don't include messageContent - it's just one message from the stream
        // The "View Full Conversation" button shows the complete conversation
        tokenCount: subagentInfo?.tokenCount,
        messageCount: subagentInfo?.messageCount,
        model: subagentInfo?.model,
        agentType: entry.content.agentType,
        agentDescription: entry.content.agentDescription,
      });
    } else if (entry.type === 'bash_progress') {
      // Add bash progress to assistant message
      if (!currentAssistantMessage) {
        currentAssistantMessage = {
          id: `assistant-${entry.uuid}`,
          role: 'assistant',
          timestamp: new Date(entry.timestamp).getTime(),
          content: [],
        };
      }
      currentAssistantMessage.content.push({
        type: 'bash_progress',
        output: entry.content.bashOutput,
        fullOutput: entry.content.bashFullOutput,
        elapsedSeconds: entry.content.bashElapsedSeconds,
        totalLines: entry.content.bashTotalLines,
      });
    } else if (entry.type === 'mcp_progress') {
      // Add MCP progress to assistant message
      if (!currentAssistantMessage) {
        currentAssistantMessage = {
          id: `assistant-${entry.uuid}`,
          role: 'assistant',
          timestamp: new Date(entry.timestamp).getTime(),
          content: [],
        };
      }
      currentAssistantMessage.content.push({
        type: 'mcp_progress',
        status: entry.content.mcpStatus,
        serverName: entry.content.mcpServerName,
        toolName: entry.content.mcpToolName,
      });
    } else if (entry.type === 'web_search') {
      // Add web search to assistant message
      if (!currentAssistantMessage) {
        currentAssistantMessage = {
          id: `assistant-${entry.uuid}`,
          role: 'assistant',
          timestamp: new Date(entry.timestamp).getTime(),
          content: [],
        };
      }
      currentAssistantMessage.content.push({
        type: 'web_search',
        searchType: entry.content.searchType,
        query: entry.content.searchQuery,
        resultCount: entry.content.searchResultCount,
        urls: entry.content.searchUrls,
      });
    }
  }

  // Flush any pending assistant message
  if (currentAssistantMessage) {
    messages.push(currentAssistantMessage);
  }

  return messages;
}

/**
 * Transform session data to SavedConversation format for the viewer
 */
function transformToSavedConversation(
  sessionEntry: SessionEntry,
  entries: ParsedEntry[],
  statistics: {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCacheCreation: number;
    totalCacheRead: number;
    toolCalls: number;
    userMessages: number;
    assistantMessages: number;
  },
  subagents?: Array<{ id: string; sessionId: string }>
): SavedConversation {
  const messages = transformEntriesToMessages(entries);

  return {
    id: sessionEntry.id,
    sessionId: sessionEntry.id, // Same as id for direct JSONL sessions
    title: sessionEntry.title,
    project: sessionEntry.projectSlug,
    date: sessionEntry.endedAt.split('T')[0],
    messages,
    metadata: {
      messageCount: sessionEntry.messageCount,
      toolCallCount: sessionEntry.toolCallCount,
      estimatedTokens: 0,
      actualTokens: {
        input: statistics.totalInputTokens,
        output: statistics.totalOutputTokens,
        cacheCreation: statistics.totalCacheCreation > 0 ? statistics.totalCacheCreation : undefined,
        cacheRead: statistics.totalCacheRead > 0 ? statistics.totalCacheRead : undefined,
      },
      subagents: subagents && subagents.length > 0
        ? {
            count: subagents.length,
            totalTokens: 0, // Will be populated when subagent is opened
            ids: subagents.map(s => s.id),
          }
        : undefined,
      hadAutoCompact: sessionEntry.hadAutoCompact,
      autoCompactAt: sessionEntry.autoCompactAt,
    },
  };
}

export function Archive() {
  // State
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [projectSessions, setProjectSessions] = useState<Record<string, SessionEntry[]>>({});
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SessionEntry[] | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<SavedConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rebuild state
  const [rebuildProgress, setRebuildProgress] = useState<RebuildProgress | null>(null);
  const [rebuildResult, setRebuildResult] = useState<{ totalSessions: number; lastScanned: string } | null>(null);
  const [isRebuilding, setIsRebuilding] = useState(false);

  // Load session data
  const loadSessionData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, sessionsData] = await Promise.all([
        getSessionStats(),
        listSessionsByProject(),
      ]);
      setStats(statsData);
      setProjectSessions(sessionsData.projects);

      // Auto-expand first project if only one
      const projects = Object.keys(sessionsData.projects);
      if (projects.length === 1) {
        setExpandedProjects(new Set([projects[0]]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  // Handle search (client-side filtering)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const query = searchQuery.toLowerCase();
    const allSessions = Object.values(projectSessions).flat();
    const filtered = allSessions.filter(
      (session) =>
        session.title.toLowerCase().includes(query) ||
        session.projectSlug.toLowerCase().includes(query)
    );
    setSearchResults(filtered);
  }, [searchQuery, projectSessions]);

  // Handle rebuild index
  const handleRebuild = () => {
    setIsRebuilding(true);
    setRebuildProgress(null);
    setRebuildResult(null);

    rebuildSessionIndex({
      onProgress: (progress) => {
        setRebuildProgress(progress);
      },
      onComplete: (result) => {
        setRebuildResult(result);
        setIsRebuilding(false);
        // Reload session data
        loadSessionData();
      },
      onError: (errorMsg) => {
        setError(errorMsg);
        setIsRebuilding(false);
      },
    });
  };

  // Handle session click
  const handleSessionClick = async (session: SessionEntry) => {
    try {
      setError(null);
      const data = await getSession(session.id);
      const saved = transformToSavedConversation(
        data.metadata,
        data.entries,
        data.statistics,
        data.subagents
      );
      setSelectedConversation(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    }
  };

  // Toggle project expansion
  const toggleProject = (project: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(project)) {
        next.delete(project);
      } else {
        next.add(project);
      }
      return next;
    });
  };

  // If viewing a conversation, show the viewer
  if (selectedConversation) {
    return (
      <ConversationViewer
        conversation={selectedConversation}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  // Get projects to display (either search results or all)
  const displayProjects = searchResults
    ? { 'Search Results': searchResults }
    : projectSessions;

  const projectNames = Object.keys(displayProjects).sort();

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>Sessions</h1>
          {stats && (
            <span style={styles.statsText}>
              {stats.totalSessions} sessions • {stats.totalProjects} projects • {stats.sizeFormatted}
            </span>
          )}
        </div>
        <div style={styles.buttonGroup}>
          <button
            style={{
              ...styles.rebuildButton,
              ...(isRebuilding ? styles.rebuildButtonDisabled : {}),
            }}
            onClick={handleRebuild}
            disabled={isRebuilding}
            type="button"
            title="Rebuild session index"
          >
            {isRebuilding ? (
              <>
                <span style={styles.spinner}>◐</span>
                Rebuilding...
              </>
            ) : (
              'Rebuild Index'
            )}
          </button>
        </div>
      </div>

      {/* Progress bar during rebuild */}
      {rebuildProgress && (
        <div style={styles.progressContainer}>
          <div style={styles.progressHeader}>
            <span style={styles.progressPhase}>
              {rebuildProgress.phase === 'scanning' ? 'Scanning projects...' : 'Processing sessions...'}
            </span>
            <span style={styles.progressCount}>
              {rebuildProgress.completed}/{rebuildProgress.total}
            </span>
          </div>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: rebuildProgress.total > 0
                  ? `${(rebuildProgress.completed / rebuildProgress.total) * 100}%`
                  : '0%',
              }}
            />
          </div>
          <div style={styles.progressDetails}>
            <span>{rebuildProgress.current}</span>
          </div>
        </div>
      )}

      {/* Rebuild result */}
      {rebuildResult && !isRebuilding && (
        <div style={styles.resultBanner}>
          Index rebuilt: {rebuildResult.totalSessions} sessions indexed
        </div>
      )}

      {/* Search */}
      <div style={styles.searchSection}>
        <input
          type="text"
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
        {searchQuery && searchResults !== null && (
          <span style={styles.searchCount}>
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBanner}>
          {error}
          <button
            style={styles.dismissButton}
            onClick={() => setError(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={styles.loading}>
          <span style={styles.spinner}>◐</span>
          Loading sessions...
        </div>
      )}

      {/* Empty state */}
      {!loading && projectNames.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>📦</span>
          <p style={styles.emptyTitle}>No sessions found</p>
          <p style={styles.emptyHint}>
            Start a Claude Code session in any project to see it here.
            Click "Rebuild Index" to scan for existing sessions.
          </p>
        </div>
      )}

      {/* Project list */}
      {!loading && projectNames.length > 0 && (
        <div style={styles.projectList}>
          {projectNames.map((project) => {
            const sessions = displayProjects[project];
            const isExpanded = expandedProjects.has(project);

            return (
              <div key={project} style={styles.projectSection}>
                <button
                  style={styles.projectHeader}
                  onClick={() => toggleProject(project)}
                  type="button"
                >
                  <span style={{
                    ...styles.projectIcon,
                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                  }}>
                    ▶
                  </span>
                  <span style={styles.projectName}>{project}</span>
                  <span style={styles.projectCount}>
                    {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {isExpanded && (
                  <div style={styles.sessionList}>
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        style={styles.sessionCard}
                        onClick={() => handleSessionClick(session)}
                        type="button"
                      >
                        <div style={styles.cardHeader}>
                          <span style={styles.cardTitle}>{session.title}</span>
                          <div style={styles.cardBadges}>
                            {session.mode === 'planning' && (
                              <span style={styles.planningBadge} title="Session used plan mode">
                                📋 Planning
                              </span>
                            )}
                            {session.mode === 'execution' && (
                              <span style={styles.executionBadge} title="Session started by implementing a plan">
                                ▶️ Executing
                              </span>
                            )}
                            {session.planCount && session.planCount > 0 && (
                              <span style={styles.planCountBadge} title={`${session.planCount} plan${session.planCount > 1 ? 's' : ''} detected`}>
                                {session.planCount} plan{session.planCount > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <span style={styles.cardDate}>{formatDate(session.endedAt)}</span>
                        </div>
                        <div style={styles.cardMeta}>
                          <span>{session.messageCount} msgs</span>
                          <span style={styles.metaDot}>•</span>
                          <span>{session.toolCallCount} tools</span>
                          {session.hasSubagents && (
                            <>
                              <span style={styles.metaDot}>•</span>
                              <span style={styles.subagentBadge}>
                                {session.subagentIds?.length || '?'} agents
                              </span>
                            </>
                          )}
                          {session.tokens && (
                            <>
                              <span style={styles.metaDot}>•</span>
                              <span style={styles.tokenBadge}>
                                {formatTokenCount(session.tokens.input + session.tokens.cacheCreation + session.tokens.cacheRead)} in
                              </span>
                              <span style={styles.tokenBadge}>
                                {formatTokenCount(session.tokens.output)} out
                              </span>
                            </>
                          )}
                          {session.hadAutoCompact && (
                            <>
                              <span style={styles.metaDot}>•</span>
                              <span style={styles.autoCompactBadge}>
                                compacted
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: colors.textPrimary,
    margin: 0,
  },
  statsText: {
    fontSize: '13px',
    color: colors.textMuted,
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
  },
  rebuildButton: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: colors.accent,
    color: colors.textPrimary,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 150ms ease',
  },
  rebuildButtonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
  progressContainer: {
    padding: '16px',
    backgroundColor: colors.bgSecondary,
    borderRadius: '8px',
    border: `1px solid ${colors.borderSubtle}`,
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  progressPhase: {
    fontSize: '13px',
    color: colors.textPrimary,
    fontWeight: 500,
  },
  progressCount: {
    fontSize: '12px',
    color: colors.textMuted,
  },
  progressBar: {
    height: '6px',
    backgroundColor: colors.bgElevated,
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: '3px',
    transition: 'width 200ms ease',
  },
  progressDetails: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: colors.textMuted,
  },
  resultBanner: {
    padding: '12px 16px',
    backgroundColor: colors.bgSecondary,
    borderRadius: '8px',
    border: `1px solid ${colors.success}`,
    fontSize: '13px',
    color: colors.success,
  },
  searchSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  searchInput: {
    flex: 1,
    maxWidth: '400px',
    padding: '10px 14px',
    fontSize: '14px',
    fontFamily: 'inherit',
    backgroundColor: colors.bgInput,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: '6px',
    color: colors.textPrimary,
    outline: 'none',
  },
  searchCount: {
    fontSize: '12px',
    color: colors.textMuted,
  },
  errorBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: colors.bgSecondary,
    borderRadius: '8px',
    border: `1px solid ${colors.danger}`,
    fontSize: '13px',
    color: colors.danger,
  },
  dismissButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    color: colors.danger,
    cursor: 'pointer',
    fontSize: '18px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '48px',
    color: colors.textMuted,
    fontSize: '14px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px',
    backgroundColor: colors.bgSecondary,
    borderRadius: '8px',
    border: `1px dashed ${colors.borderSubtle}`,
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: colors.textPrimary,
    margin: '0 0 8px 0',
  },
  emptyHint: {
    fontSize: '13px',
    color: colors.textMuted,
    margin: 0,
    maxWidth: '300px',
  },
  projectList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  projectSection: {
    backgroundColor: colors.bgSecondary,
    borderRadius: '8px',
    border: `1px solid ${colors.borderSubtle}`,
    overflow: 'hidden',
  },
  projectHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left' as const,
    color: colors.textPrimary,
    fontSize: '14px',
  },
  projectIcon: {
    fontSize: '10px',
    color: colors.textMuted,
    transition: 'transform 150ms ease',
  },
  projectName: {
    fontWeight: 500,
    color: colors.accentOrange,
  },
  projectCount: {
    marginLeft: 'auto',
    fontSize: '12px',
    color: colors.textMuted,
  },
  sessionList: {
    borderTop: `1px solid ${colors.borderSubtle}`,
    padding: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  sessionCard: {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    backgroundColor: colors.bgElevated,
    border: `1px solid transparent`,
    borderRadius: '6px',
    textAlign: 'left' as const,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '6px',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.textPrimary,
    lineHeight: 1.3,
  },
  cardDate: {
    fontSize: '11px',
    color: colors.textMuted,
    flexShrink: 0,
    marginLeft: '12px',
  },
  cardMeta: {
    display: 'flex',
    gap: '4px',
    fontSize: '12px',
    color: colors.textSecondary,
  },
  metaDot: {
    color: colors.textMuted,
  },
  subagentBadge: {
    color: colors.accentOrange,
    fontWeight: 500,
  },
  tokenBadge: {
    color: colors.accent,
    fontFamily: 'monospace',
    fontWeight: 500,
  },
  autoCompactBadge: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  cardBadges: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: '8px',
  },
  planningBadge: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#34D399',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  executionBadge: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#60A5FA',
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  planCountBadge: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#A78BFA',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
};

// Add keyframe animation for spinner via global style (if not already in global CSS)
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('style[data-jacques-spinner]')) {
  spinnerStyle.setAttribute('data-jacques-spinner', 'true');
  document.head.appendChild(spinnerStyle);
}
