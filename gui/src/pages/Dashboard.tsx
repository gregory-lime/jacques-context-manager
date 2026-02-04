/**
 * Dashboard - Full-width project overview with active sessions,
 * session history, plans, and subagents.
 *
 * Layout: Header -> Active Sessions (grid) -> Session History -> Plans -> Subagents
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useJacquesClient } from '../hooks/useJacquesClient';
import { useProjectScope } from '../hooks/useProjectScope.js';
import { useSessionBadges } from '../hooks/useSessionBadges';
import { useOpenSessions } from '../hooks/useOpenSessions';
import { useAssetModal } from '../hooks/useAssetModal';
import { listSessionsByProject, getSessionPlanContent, getSubagentFromSession, getSessionWebSearches, type SessionEntry } from '../api';
import { colors } from '../styles/theme';
import { SectionHeader, Badge, ContentModal } from '../components/ui';
import { planModalConfig, agentModalConfig, webSearchModalConfig } from '../components/ui/contentModalConfigs';
import { SessionCard } from '../components/SessionCard';
import { ActiveSessionViewer } from '../components/ActiveSessionViewer';
import { PlanIcon, AgentIcon, StatusDot } from '../components/Icons';
import { Globe, Terminal } from 'lucide-react';
import type { Session } from '../types';

// ─── Color Constants ─────────────────────────────────────────

const COLOR = {
  plan: '#34D399',
  planBg: 'rgba(52, 211, 153, 0.10)',
  agent: '#FF6600',
  agentBg: 'rgba(255, 102, 0, 0.10)',
  web: '#60A5FA',
  webBg: 'rgba(96, 165, 250, 0.10)',
} as const;

const PALETTE = {
  coral: colors.accent,
  coralDark: colors.accentDark,
  coralLight: colors.accentLight,
  teal: '#2DD4BF',
  purple: '#A78BFA',
  blue: '#60A5FA',
  pink: '#F472B6',
  yellow: '#FBBF24',
  muted: colors.textSecondary,
  text: '#E5E7EB',
  textDim: colors.textMuted,
  bg: colors.bgPrimary,
  bgCard: colors.bgSecondary,
  bgHover: colors.bgElevated,
  success: colors.success,
  danger: colors.danger,
};

// ─── Helpers ─────────────────────────────────────────────────

function formatTokens(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${Math.round(count / 1000)}K`;
  return String(count);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const PLAN_TITLE_PATTERNS = [
  /^implement the following plan[:\s]*/i,
  /^here is the plan[:\s]*/i,
  /^follow this plan[:\s]*/i,
];

function formatSessionTitle(rawTitle: string | null): { isPlan: boolean; displayTitle: string } {
  if (!rawTitle) return { isPlan: false, displayTitle: 'Untitled' };
  for (const pattern of PLAN_TITLE_PATTERNS) {
    if (pattern.test(rawTitle)) {
      const cleaned = rawTitle.replace(pattern, '').trim();
      const headingMatch = cleaned.match(/^#\s+(.+)/m);
      const planName = headingMatch ? headingMatch[1].trim() : cleaned.split('\n')[0].trim();
      return { isPlan: true, displayTitle: planName || 'Unnamed Plan' };
    }
  }
  return { isPlan: false, displayTitle: rawTitle };
}

// ─── Types ───────────────────────────────────────────────────

interface SessionListItem {
  id: string;
  title: string;
  displayTitle: string;
  isPlan: boolean;
  source: 'live' | 'saved';
  date: string;
  contextPercent?: number;
  isActive?: boolean;
  status?: string;
  planCount?: number;
  agentCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  project?: string;
}

interface PlanItem { title: string; sessionId: string; sessionCount: number; messageIndex: number; source: 'embedded' | 'write' | 'agent'; filePath?: string; agentId?: string; }
interface ExploreItem { description: string; sessionId: string; agentId: string; tokenCost?: number; }
interface WebSearchItem { query: string; sessionId: string; resultCount?: number; }

// Unified subagent item for combined list
interface SubagentItem {
  type: 'explore' | 'search';
  description: string;
  sessionId: string;
  agentId?: string;
  tokenCost?: number;
  resultCount?: number;
}

// ─── Data Aggregation ────────────────────────────────────────

function computeStats(liveSessions: Session[], savedSessions: SessionEntry[]) {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalPlans = 0;
  let totalExplorations = 0;
  let totalWebSearches = 0;

  for (const session of liveSessions) {
    if (session.context_metrics) {
      totalInputTokens += session.context_metrics.total_input_tokens || 0;
      totalOutputTokens += session.context_metrics.total_output_tokens || 0;
    }
  }

  for (const session of savedSessions) {
    if (session.tokens) {
      totalInputTokens += session.tokens.input + session.tokens.cacheRead;
      totalOutputTokens += session.tokens.output;
    }
    if (session.planCount) totalPlans += session.planCount;
    if (session.exploreAgents) totalExplorations += session.exploreAgents.length;
    if (session.webSearches) totalWebSearches += session.webSearches.length;
  }

  return { totalSessions: liveSessions.length + savedSessions.length, totalInputTokens, totalOutputTokens, totalPlans, totalExplorations, totalWebSearches };
}

function toSessionListItems(liveSessions: Session[], savedSessions: SessionEntry[]): SessionListItem[] {
  const items: SessionListItem[] = [];
  const seenIds = new Set<string>();

  for (const session of liveSessions) {
    seenIds.add(session.session_id);
    const { isPlan, displayTitle } = formatSessionTitle(session.session_title);
    items.push({
      id: session.session_id,
      title: session.session_title || 'Untitled',
      displayTitle,
      isPlan,
      source: 'live',
      date: new Date(session.registered_at).toISOString(),
      contextPercent: session.context_metrics?.used_percentage ? Math.round(session.context_metrics.used_percentage) : undefined,
      isActive: session.status === 'active' || session.status === 'working',
      status: session.status,
      inputTokens: session.context_metrics?.total_input_tokens || undefined,
      outputTokens: session.context_metrics?.total_output_tokens || undefined,
      project: session.project,
    });
  }

  for (const session of savedSessions) {
    if (seenIds.has(session.id)) continue;
    seenIds.add(session.id);

    let displayTitle = session.title;
    let isPlan = false;

    if (session.mode === 'execution' && session.planRefs && session.planRefs.length > 0) {
      const cleanTitle = session.planRefs[0].title.replace(/^Plan:\s*/i, '');
      displayTitle = cleanTitle;
      isPlan = true;
    }

    items.push({
      id: session.id,
      title: session.title,
      displayTitle,
      isPlan,
      source: 'saved',
      date: session.endedAt,
      planCount: session.planCount,
      agentCount: session.subagentIds?.length,
      inputTokens: session.tokens ? session.tokens.input + session.tokens.cacheRead : undefined,
      outputTokens: session.tokens?.output || undefined,
      project: session.projectSlug,
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items;
}

function aggregateDocuments(savedSessions: SessionEntry[]) {
  const planMap = new Map<string, {
    title: string;
    sessionIds: Set<string>;
    messageIndex: number;
    source: 'embedded' | 'write' | 'agent';
    filePath?: string;
    agentId?: string;
    sessionId: string;
  }>();
  const explorations: ExploreItem[] = [];
  const webSearches: WebSearchItem[] = [];

  for (const session of savedSessions) {
    if (session.planRefs) {
      for (const ref of session.planRefs) {
        const title = ref.title.replace(/^Plan:\s*/i, '');
        const normalizedKey = title.toLowerCase().trim();
        const existing = planMap.get(normalizedKey);
        if (existing) {
          existing.sessionIds.add(session.id);
        } else {
          planMap.set(normalizedKey, {
            title,
            sessionIds: new Set([session.id]),
            messageIndex: ref.messageIndex,
            source: ref.source,
            filePath: ref.filePath,
            agentId: ref.agentId,
            sessionId: session.id,
          });
        }
      }
    }
    if (session.exploreAgents) {
      for (const agent of session.exploreAgents) {
        explorations.push({ description: agent.description, sessionId: session.id, agentId: agent.id, tokenCost: agent.tokenCost });
      }
    }
    if (session.webSearches) {
      for (const search of session.webSearches) {
        webSearches.push({ query: search.query, sessionId: session.id, resultCount: search.resultCount });
      }
    }
  }

  const plans: PlanItem[] = Array.from(planMap.values()).map(({ title, sessionIds, messageIndex, source, filePath, agentId, sessionId }) => ({
    title,
    sessionId,
    sessionCount: sessionIds.size,
    messageIndex,
    source,
    filePath,
    agentId,
  }));

  return { plans, explorations, webSearches };
}

// ─── Local Components ────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={styles.statPill}>
      <span style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
        marginRight: '6px',
        flexShrink: 0,
      }} />
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

function SkeletonHistoryRow() {
  return (
    <div style={styles.historyRow}>
      <div style={styles.historyRowMain}>
        <div className="jacques-skeleton" style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0 }} />
        <div className="jacques-skeleton" style={{ flex: 1, height: 14, borderRadius: 4 }} />
        <div className="jacques-skeleton" style={{ width: 48, height: 12, borderRadius: 4, flexShrink: 0 }} />
      </div>
      <div style={styles.historyMetaRow}>
        <div className="jacques-skeleton" style={{ width: 40, height: 11, borderRadius: 3 }} />
        <div className="jacques-skeleton" style={{ width: 40, height: 11, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function SkeletonSessionCard() {
  return (
    <div style={{
      backgroundColor: PALETTE.bgCard,
      borderRadius: '10px',
      border: `1px solid ${PALETTE.textDim}18`,
      overflow: 'hidden',
    }}>
      {/* Fake chrome bar */}
      <div style={{ padding: '8px 12px', backgroundColor: PALETTE.bgHover, borderBottom: `1px solid ${PALETTE.textDim}18` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="jacques-skeleton" style={{ width: 8, height: 8, borderRadius: '50%' }} />
          <div className="jacques-skeleton" style={{ width: 8, height: 8, borderRadius: '50%' }} />
          <div className="jacques-skeleton" style={{ width: 8, height: 8, borderRadius: '50%' }} />
          <div className="jacques-skeleton" style={{ width: 48, height: 11, borderRadius: 3, marginLeft: 8 }} />
        </div>
      </div>
      <div style={{ padding: '16px 20px 20px' }}>
        <div style={{ marginBottom: 16 }}>
          <div className="jacques-skeleton" style={{ width: '75%', height: 15, borderRadius: 4 }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className="jacques-skeleton" style={{ width: '100%', height: 8, borderRadius: 4, marginBottom: 6 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="jacques-skeleton" style={{ width: 40, height: 12, borderRadius: 3 }} />
            <div className="jacques-skeleton" style={{ width: 72, height: 11, borderRadius: 3 }} />
          </div>
        </div>
        <div style={{ minHeight: 20 }}>
          <div className="jacques-skeleton" style={{ width: 32, height: 13, borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}

function SkeletonListRow() {
  return (
    <div style={styles.listRow}>
      <div className="jacques-skeleton" style={{ width: 14, height: 14, borderRadius: 3, flexShrink: 0 }} />
      <div className="jacques-skeleton" style={{ flex: 1, height: 13, borderRadius: 4 }} />
      <div className="jacques-skeleton" style={{ width: 60, height: 11, borderRadius: 3, flexShrink: 0 }} />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function Dashboard() {
  const { sessions: allLiveSessions, focusedSessionId, connected } = useJacquesClient();
  const { selectedProject, filterSessions } = useProjectScope();
  const { state, openSession } = useOpenSessions();
  const [savedSessionsByProject, setSavedSessionsByProject] = useState<Record<string, SessionEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSmallAssets, setFilterSmallAssets] = useState(false);

  useEffect(() => {
    async function loadSavedSessions() {
      try {
        setLoading(true);
        const data = await listSessionsByProject();
        setSavedSessionsByProject(data.projects);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    }
    loadSavedSessions();
  }, []);

  const filteredLiveSessions = useMemo(() => filterSessions(allLiveSessions), [allLiveSessions, filterSessions]);

  const filteredSavedSessions = useMemo(() => {
    if (!selectedProject) return Object.values(savedSessionsByProject).flat();
    return savedSessionsByProject[selectedProject] || [];
  }, [selectedProject, savedSessionsByProject]);

  const stats = useMemo(() => computeStats(filteredLiveSessions, filteredSavedSessions), [filteredLiveSessions, filteredSavedSessions]);
  const sessionList = useMemo(() => toSessionListItems(filteredLiveSessions, filteredSavedSessions), [filteredLiveSessions, filteredSavedSessions]);
  const documents = useMemo(() => aggregateDocuments(filteredSavedSessions), [filteredSavedSessions]);

  const TOKEN_THRESHOLD = 20_000;
  const filteredDocuments = useMemo(() => {
    if (!filterSmallAssets) return documents;
    return {
      plans: documents.plans,
      explorations: documents.explorations.filter(e => (e.tokenCost ?? 0) >= TOKEN_THRESHOLD),
      webSearches: documents.webSearches.filter(() => false),
    };
  }, [documents, filterSmallAssets]);

  // Combine explorations + web searches into unified subagent list
  const subagentItems = useMemo((): SubagentItem[] => {
    const items: SubagentItem[] = [];
    for (const e of filteredDocuments.explorations) {
      items.push({ type: 'explore', description: e.description, sessionId: e.sessionId, agentId: e.agentId, tokenCost: e.tokenCost });
    }
    for (const s of filteredDocuments.webSearches) {
      items.push({ type: 'search', description: `"${s.query}"`, sessionId: s.sessionId, resultCount: s.resultCount });
    }
    return items;
  }, [filteredDocuments]);

  // Badge data for active session cards
  const sessionIds = useMemo(
    () => filteredLiveSessions.map(s => s.session_id),
    [filteredLiveSessions],
  );
  const { badges } = useSessionBadges(sessionIds);

  const { openAsset, modalProps } = useAssetModal();

  // ── Asset click handlers ──

  const handlePlanClick = useCallback(async (plan: PlanItem) => {
    openAsset(
      planModalConfig(plan.title, plan.source, '', plan.filePath),
      async () => {
        const data = await getSessionPlanContent(plan.sessionId, plan.messageIndex);
        return { content: data.content };
      },
    );
  }, [openAsset]);

  const handleExploreClick = useCallback(async (explore: ExploreItem) => {
    openAsset(
      agentModalConfig('explore', explore.description),
      async () => {
        const data = await getSubagentFromSession(explore.sessionId, explore.agentId);
        // Parser produces type "assistant_message" for assistant entries
        const assistantTexts = data.entries
          .filter(e => e.type === 'assistant_message' && e.content.text)
          .map(e => e.content.text!);
        return {
          content: assistantTexts.length > 0
            ? assistantTexts[assistantTexts.length - 1]
            : '*No response available*',
        };
      },
    );
  }, [openAsset]);

  const handleWebSearchClick = useCallback((search: WebSearchItem) => {
    openAsset(
      webSearchModalConfig(search.query, search.resultCount),
      async () => {
        const { searches } = await getSessionWebSearches(search.sessionId);
        const match = searches.find(s => s.query === search.query);
        return {
          content: webSearchModalConfig(
            search.query,
            match?.resultCount ?? search.resultCount,
            match?.urls,
          ).content,
        };
      },
    );
  }, [openAsset]);

  const handleSubagentClick = useCallback((item: SubagentItem) => {
    if (item.type === 'explore' && item.agentId) {
      handleExploreClick({ description: item.description, sessionId: item.sessionId, agentId: item.agentId, tokenCost: item.tokenCost });
    } else if (item.type === 'search') {
      const query = item.description.replace(/^"|"$/g, '');
      handleWebSearchClick({ query, sessionId: item.sessionId, resultCount: item.resultCount });
    }
  }, [handleExploreClick, handleWebSearchClick]);

  const projectName = selectedProject || 'All Projects';

  const handleActiveSessionClick = (session: Session) => {
    openSession({
      id: session.session_id,
      type: 'active',
      title: session.session_title || session.project || 'Untitled',
      project: session.project,
    });
  };

  const handleHistorySessionClick = (item: SessionListItem) => {
    openSession({
      id: item.id,
      type: item.source === 'live' ? 'active' : 'archived',
      title: item.displayTitle,
      project: item.project,
    });
  };

  // If viewing an open session, render the viewer
  const activeOpen = state.activeViewId
    ? state.sessions.find(s => s.id === state.activeViewId)
    : null;

  if (activeOpen) {
    return (
      <ActiveSessionViewer
        sessionId={activeOpen.id}
      />
    );
  }

  return (
    <div className="jacques-dashboard" style={styles.viewport}>
      <div style={styles.container}>

        {/* ── Project Header ── */}
        <header style={{ ...styles.header, flexShrink: 0 }} className="jacques-animate-in">
          <div>
            <div style={styles.projectNameRow}>
              <span style={styles.promptPrefix}>~/</span>
              <h1 style={styles.projectName}>{projectName}</h1>
            </div>
            <div style={styles.statsRow}>
              <StatPill label="Sessions" value={stats.totalSessions} color={PALETTE.coral} />
              <StatPill label="Input" value={formatTokens(stats.totalInputTokens)} color={PALETTE.teal} />
              <StatPill label="Output" value={formatTokens(stats.totalOutputTokens)} color={PALETTE.blue} />
              {stats.totalPlans > 0 && <StatPill label="Plans" value={stats.totalPlans} color={COLOR.plan} />}
              {stats.totalExplorations > 0 && <StatPill label="Explores" value={stats.totalExplorations} color={COLOR.agent} />}
              {stats.totalWebSearches > 0 && <StatPill label="Searches" value={stats.totalWebSearches} color={COLOR.web} />}
            </div>
          </div>
          <Badge
            label={connected ? 'Connected' : 'Disconnected'}
            variant={connected ? 'live' : 'idle'}
          />
        </header>

        {/* ── Error ── */}
        {error && <div style={{ ...styles.errorBanner, flexShrink: 0 }}>{error}</div>}

        {/* ── Active Sessions (grid) ── */}
        <section className="jacques-animate-in" style={{ flexShrink: 0 }}>
          <SectionHeader
            title={`ACTIVE SESSIONS (${filteredLiveSessions.length})`}
            accentColor={PALETTE.coral}
          />

          {loading ? (
            <div className="jacques-card-grid">
              <SkeletonSessionCard />
              <SkeletonSessionCard />
              <SkeletonSessionCard />
            </div>
          ) : filteredLiveSessions.length === 0 ? (
            <div style={styles.emptyActive}>
              <Terminal size={20} color={PALETTE.textDim} style={{ opacity: 0.4 }} />
              <span style={{ color: PALETTE.textDim, fontSize: '13px' }}>No active sessions</span>
            </div>
          ) : (
            <div className="jacques-card-grid">
              {filteredLiveSessions.map((session) => (
                <SessionCard
                  key={session.session_id}
                  session={session}
                  isFocused={session.session_id === focusedSessionId}
                  badges={badges.get(session.session_id)}
                  onClick={() => handleActiveSessionClick(session)}
                  onPlanClick={() => handleActiveSessionClick(session)}
                  onAgentClick={() => handleActiveSessionClick(session)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Session History ── */}
        <section className="jacques-animate-in" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flexShrink: 0 }}>
            <SectionHeader title="SESSION HISTORY" accentColor={PALETTE.coral} />
          </div>

          {loading ? (
            <div style={{ ...styles.historyList, flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {Array.from({ length: 8 }, (_, i) => (
                <SkeletonHistoryRow key={i} />
              ))}
            </div>
          ) : sessionList.length === 0 ? (
            <div style={{ ...styles.emptyText, flex: 1 }}>No sessions yet</div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
              <div style={styles.historyList}>
                {sessionList.map((session, index) => {
                  const isLive = session.source === 'live';
                  const dotColor = isLive
                    ? (session.status === 'working' ? PALETTE.coral : PALETTE.success)
                    : PALETTE.textDim;
                  return (
                    <div
                      key={session.id}
                      className="jacques-history-row jacques-animate-in"
                      style={{
                        ...styles.historyRow,
                        animationDelay: `${index * 40}ms`,
                      }}
                      onClick={() => handleHistorySessionClick(session)}
                    >
                      {/* Row 1: Status + Title + Date + Context */}
                      <div style={styles.historyRowMain}>
                        <StatusDot
                          size={10}
                          color={dotColor}
                          filled={isLive}
                          style={{
                            flexShrink: 0,
                            filter: isLive && session.status === 'working'
                              ? `drop-shadow(0 0 4px ${dotColor})`
                              : 'none',
                          }}
                        />
                        <div style={styles.historyTitleWrap}>
                          {session.isPlan && (
                            <PlanIcon size={13} color={COLOR.plan} style={{ flexShrink: 0, marginRight: '6px' }} />
                          )}
                          <span style={styles.historyTitle}>{session.displayTitle}</span>
                        </div>
                        <span style={styles.historyDate}>{formatDate(session.date)}</span>
                        {session.contextPercent !== undefined && (
                          <span style={{
                            ...styles.contextBadge,
                            color: session.contextPercent > 70 ? PALETTE.yellow : PALETTE.coral,
                            backgroundColor: session.contextPercent > 70 ? `${PALETTE.yellow}20` : `${PALETTE.coral}20`,
                          }}>
                            {session.contextPercent}%
                          </span>
                        )}
                      </div>

                      {/* Row 2: Tokens + badges */}
                      <div style={styles.historyMetaRow}>
                        {session.inputTokens !== undefined && (
                          <span style={styles.historyTokens}>
                            <span style={{ color: PALETTE.teal }}>↓</span> {formatTokens(session.inputTokens)}
                          </span>
                        )}
                        {session.outputTokens !== undefined && (
                          <span style={styles.historyTokens}>
                            <span style={{ color: PALETTE.blue }}>↑</span> {formatTokens(session.outputTokens)}
                          </span>
                        )}
                        {session.planCount !== undefined && session.planCount > 0 && (
                          <span style={styles.historyBadge}>
                            <PlanIcon size={11} color={COLOR.plan} />
                            <span>{session.planCount}</span>
                          </span>
                        )}
                        {session.agentCount !== undefined && session.agentCount > 0 && (
                          <span style={styles.historyBadge}>
                            <AgentIcon size={11} color={COLOR.agent} />
                            <span>{session.agentCount}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ── Plans ── */}
        {(loading || filteredDocuments.plans.length > 0) && (
          <section className="jacques-animate-in" style={{ flexShrink: 0 }}>
            <SectionHeader
              title={`PLANS${!loading ? ` (${filteredDocuments.plans.length})` : ''}`}
              accentColor={COLOR.plan}
            />

            {loading ? (
              <div style={styles.listContainer}>
                {Array.from({ length: 3 }, (_, i) => (
                  <SkeletonListRow key={i} />
                ))}
              </div>
            ) : (
              <div className="jacques-dashboard" style={styles.scrollableList}>
                <div style={styles.listContainer}>
                  {filteredDocuments.plans.map((plan, i) => (
                    <div
                      key={i}
                      className="jacques-list-row"
                      style={styles.listRow}
                      onClick={() => handlePlanClick(plan)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') handlePlanClick(plan); }}
                    >
                      <div style={styles.listRowLeft}>
                        <PlanIcon size={14} color={COLOR.plan} style={{ flexShrink: 0 }} />
                        <span style={styles.listRowText}>{plan.title}</span>
                      </div>
                      <div style={styles.listRowRight}>
                        <span style={{
                          ...styles.sourceBadge,
                          color: plan.source === 'embedded' ? COLOR.plan : COLOR.agent,
                          backgroundColor: plan.source === 'embedded' ? COLOR.planBg : COLOR.agentBg,
                        }}>
                          {plan.source}
                        </span>
                        {plan.sessionCount > 1 && (
                          <span style={styles.listRowMeta}>{plan.sessionCount} ses</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Subagents (explorations + web searches combined) ── */}
        {(loading || subagentItems.length > 0) && (
          <section className="jacques-animate-in" style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionHeader
                title={`SUBAGENTS${!loading ? ` (${subagentItems.length})` : ''}`}
                accentColor={COLOR.agent}
              />
              <label style={styles.toggleLabel}>
                <span style={{ color: filterSmallAssets ? PALETTE.text : PALETTE.textDim, fontSize: '11px' }}>
                  {'\u2265'}20K tokens
                </span>
                <button
                  onClick={() => setFilterSmallAssets(prev => !prev)}
                  style={{
                    ...styles.toggleTrack,
                    backgroundColor: filterSmallAssets ? PALETTE.teal : `${PALETTE.textDim}30`,
                  }}
                  aria-pressed={filterSmallAssets}
                  aria-label="Filter agents under 20K tokens"
                >
                  <span style={{
                    ...styles.toggleThumb,
                    transform: filterSmallAssets ? 'translateX(14px)' : 'translateX(0)',
                  }} />
                </button>
              </label>
            </div>

            {loading ? (
              <div style={styles.listContainer}>
                {Array.from({ length: 4 }, (_, i) => (
                  <SkeletonListRow key={i} />
                ))}
              </div>
            ) : (
              <div className="jacques-dashboard" style={styles.scrollableList}>
                <div style={styles.listContainer}>
                  {subagentItems.map((item, i) => (
                    <div
                      key={i}
                      className="jacques-list-row"
                      style={styles.listRow}
                      onClick={() => handleSubagentClick(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSubagentClick(item); }}
                    >
                      <div style={styles.listRowLeft}>
                        {item.type === 'explore' ? (
                          <AgentIcon size={14} color={COLOR.agent} style={{ flexShrink: 0 }} />
                        ) : (
                          <Globe size={14} color={COLOR.web} style={{ flexShrink: 0 }} />
                        )}
                        <span style={styles.listRowText}>{item.description}</span>
                      </div>
                      <div style={styles.listRowRight}>
                        {item.type === 'explore' && item.tokenCost !== undefined && (
                          <span style={styles.listRowMeta}>~{formatTokens(item.tokenCost)}</span>
                        )}
                        {item.type === 'search' && item.resultCount !== undefined && (
                          <span style={styles.listRowMeta}>{item.resultCount} results</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {modalProps && <ContentModal {...modalProps} />}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  // Layout
  viewport: {
    width: '100%',
    height: '100%',
    backgroundColor: PALETTE.bg,
    overflow: 'hidden',
  },
  container: {
    height: '100%',
    padding: '24px 32px',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    fontSize: '13px',
    color: PALETTE.text,
    lineHeight: 1.6,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    overflow: 'auto',
  },

  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  projectNameRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    marginBottom: '16px',
  },
  promptPrefix: {
    fontSize: '18px',
    fontWeight: 500,
    color: PALETTE.textDim,
    opacity: 0.5,
    userSelect: 'none' as const,
  },
  projectName: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.textPrimary,
    margin: 0,
  },
  statsRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  statPill: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 14px',
    backgroundColor: PALETTE.bgCard,
    borderRadius: '4px',
    fontSize: '12px',
    border: `1px solid ${PALETTE.muted}15`,
    transition: 'border-color 150ms, background-color 150ms',
  },
  statLabel: {
    color: PALETTE.muted,
    marginRight: '8px',
  },
  statValue: {
    color: PALETTE.text,
    fontWeight: 600,
  },

  // Error
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: `${PALETTE.danger}15`,
    border: `1px solid ${PALETTE.danger}40`,
    borderRadius: '4px',
    fontSize: '12px',
    color: PALETTE.danger,
  },

  // Active sessions
  emptyActive: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '24px',
    backgroundColor: PALETTE.bgCard,
    borderRadius: '8px',
    border: `1px solid ${PALETTE.textDim}20`,
    minHeight: '160px',
  },

  // Session history
  historyList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  historyRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    padding: '12px 16px',
    backgroundColor: PALETTE.bgCard,
    borderRadius: '8px',
    border: `1px solid ${PALETTE.textDim}18`,
    cursor: 'pointer',
  },
  historyRowMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  historyTitleWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
  },
  historyTitle: {
    color: PALETTE.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  historyDate: {
    fontSize: '11px',
    color: PALETTE.muted,
    flexShrink: 0,
  },
  contextBadge: {
    fontSize: '10px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '3px',
    fontFamily: 'monospace',
    flexShrink: 0,
  },
  historyMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    paddingLeft: '22px',
  },
  historyTokens: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '11px',
    color: PALETTE.muted,
    fontFamily: 'monospace',
  },
  historyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: PALETTE.muted,
    opacity: 0.5,
  },

  // Plans + Subagents list rows
  listContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '10px 16px',
    backgroundColor: PALETTE.bgCard,
    borderRadius: '8px',
    border: `1px solid ${PALETTE.textDim}18`,
    cursor: 'pointer',
  },
  listRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
    flex: 1,
  },
  listRowText: {
    fontSize: '13px',
    color: PALETTE.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  listRowRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  listRowMeta: {
    fontSize: '11px',
    color: PALETTE.muted,
    fontFamily: 'monospace',
  },
  sourceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },

  // Scrollable list container — fits ~6 rows, scrolls the rest
  scrollableList: {
    maxHeight: '252px',
    overflowY: 'auto',
    overflowX: 'hidden',
  },

  // Toggle switch
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    userSelect: 'none' as const,
  },
  toggleTrack: {
    position: 'relative' as const,
    width: '30px',
    height: '16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'background-color 150ms',
  },
  toggleThumb: {
    display: 'block',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    transition: 'transform 150ms',
  },

  // Shared
  emptyText: {
    fontSize: '12px',
    color: PALETTE.textDim,
    fontStyle: 'italic' as const,
    padding: '12px 0',
  },
};
