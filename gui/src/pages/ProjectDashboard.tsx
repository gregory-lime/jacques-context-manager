/**
 * ProjectDashboard - Full-width project overview with active sessions,
 * session history, and categorized assets.
 *
 * Layout: Header -> Active Sessions (horizontal scroll) -> Session History -> Assets grid
 */

import { useMemo, useState, useEffect } from 'react';
import { useJacquesClient } from '../hooks/useJacquesClient';
import { useProjectScope } from '../hooks/useProjectScope.js';
import { useSessionBadges } from '../hooks/useSessionBadges';
import { listSessionsByProject, type SessionEntry } from '../api';
import { colors } from '../styles/theme';
import { SectionHeader, Badge } from '../components/ui';
import { SessionCard } from '../components/SessionCard';
import { ActiveSessionViewer } from '../components/ActiveSessionViewer';
import { PlanIcon, AgentIcon, StatusDot } from '../components/Icons';
import { Globe, Terminal } from 'lucide-react';
import type { Session } from '../types';

// ─── Color Constants ─────────────────────────────────────────
// Canonical colors — match SessionCard, Badge, and Conversation components

const COLOR = {
  plan: '#34D399',       // green — plans everywhere
  planBg: 'rgba(52, 211, 153, 0.10)',
  agent: '#FF6600',      // orange — agents/bots everywhere
  agentBg: 'rgba(255, 102, 0, 0.10)',
  web: '#60A5FA',        // blue — web searches
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
  gitBranch?: string;
}

interface PlanItem { title: string; sessionId: string; }
interface ExploreItem { description: string; sessionId: string; }
interface WebSearchItem { query: string; sessionId: string; }

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
      gitBranch: session.git_branch ?? undefined,
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
    });
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return items;
}

function aggregateDocuments(savedSessions: SessionEntry[]) {
  const plans: PlanItem[] = [];
  const explorations: ExploreItem[] = [];
  const webSearches: WebSearchItem[] = [];

  for (const session of savedSessions) {
    if (session.planRefs) {
      for (const ref of session.planRefs) {
        plans.push({ title: ref.title.replace(/^Plan:\s*/i, ''), sessionId: session.id });
      }
    }
    if (session.exploreAgents) {
      for (const agent of session.exploreAgents) {
        explorations.push({ description: agent.description, sessionId: session.id });
      }
    }
    if (session.webSearches) {
      for (const search of session.webSearches) {
        webSearches.push({ query: search.query, sessionId: session.id });
      }
    }
  }

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

function ScrollableList({ children, maxHeight = 400 }: { children: React.ReactNode; maxHeight?: number }) {
  return (
    <div
      className="jacques-dashboard"
      style={{ maxHeight, overflowY: 'auto', overflowX: 'hidden', scrollBehavior: 'smooth' }}
    >
      {children}
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
    <div style={styles.sessionCardSlot}>
      <div style={{
        backgroundColor: PALETTE.bgCard,
        borderRadius: '10px',
        border: `1px solid ${PALETTE.textDim}18`,
        padding: '20px',
      }}>
        {/* Header: dot + status + model + time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="jacques-skeleton" style={{ width: 6, height: 6, borderRadius: '50%' }} />
            <div className="jacques-skeleton" style={{ width: 48, height: 11, borderRadius: 3 }} />
          </div>
          <div className="jacques-skeleton" style={{ width: 64, height: 11, borderRadius: 3 }} />
        </div>
        {/* Title */}
        <div style={{ marginBottom: 16 }}>
          <div className="jacques-skeleton" style={{ width: '75%', height: 15, borderRadius: 4 }} />
        </div>
        {/* Context meter bar */}
        <div style={{ marginBottom: 16 }}>
          <div className="jacques-skeleton" style={{ width: '100%', height: 8, borderRadius: 4, marginBottom: 6 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="jacques-skeleton" style={{ width: 40, height: 12, borderRadius: 3 }} />
            <div className="jacques-skeleton" style={{ width: 72, height: 11, borderRadius: 3 }} />
          </div>
        </div>
        {/* Footer */}
        <div style={{ minHeight: 20 }}>
          <div className="jacques-skeleton" style={{ width: 32, height: 13, borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}

function SkeletonAssetCard() {
  return (
    <div style={styles.assetCard}>
      <div className="jacques-skeleton" style={{ width: 3, flexShrink: 0, borderRadius: 0 }} />
      <div style={styles.assetCardBody}>
        <div className="jacques-skeleton" style={{ width: 22, height: 22, borderRadius: 4, flexShrink: 0 }} />
        <div className="jacques-skeleton" style={{ flex: 1, height: 12, borderRadius: 4 }} />
      </div>
    </div>
  );
}

/** A single asset card (plan, exploration, web search) styled as a mini-document */
function AssetCard({ text, icon, accentColor, accentBg }: {
  text: string;
  icon: React.ReactNode;
  accentColor: string;
  accentBg: string;
}) {
  return (
    <div className="jacques-asset-item" style={styles.assetCard}>
      <div style={{ ...styles.assetCardAccent, backgroundColor: accentColor }} />
      <div style={styles.assetCardBody}>
        <div style={{ ...styles.assetCardIcon, backgroundColor: accentBg }}>
          {icon}
        </div>
        <span style={styles.assetCardText}>{text}</span>
      </div>
    </div>
  );
}

/** Column of asset cards with header, gradient underline, and scrollable list */
function AssetColumn({ title, icon, items, accentColor, accentBg, maxHeight = 280 }: {
  title: string;
  icon: React.ReactNode;
  items: Array<{ text: string; icon: React.ReactNode }>;
  accentColor: string;
  accentBg: string;
  maxHeight?: number;
}) {
  return (
    <div style={styles.assetColumn}>
      <div style={styles.assetColumnHeader}>
        {icon}
        <span>{title}</span>
        {items.length > 0 && (
          <span style={styles.assetColumnCount}>({items.length})</span>
        )}
      </div>
      <div style={{ ...styles.assetColumnUnderline, background: `linear-gradient(90deg, ${accentColor}40, transparent)` }} />
      <ScrollableList maxHeight={maxHeight}>
        {items.length === 0 ? (
          <div style={styles.emptyText}>None yet</div>
        ) : (
          <div style={styles.assetCardList}>
            {items.map((item, i) => (
              <AssetCard
                key={i}
                text={item.text}
                icon={item.icon}
                accentColor={accentColor}
                accentBg={accentBg}
              />
            ))}
          </div>
        )}
      </ScrollableList>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────

export function ProjectDashboard() {
  const { sessions: allLiveSessions, focusedSessionId, connected } = useJacquesClient();
  const { selectedProject, filterSessions } = useProjectScope();
  const [savedSessionsByProject, setSavedSessionsByProject] = useState<Record<string, SessionEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

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

  // Badge data for active session cards
  const sessionIds = useMemo(
    () => filteredLiveSessions.map(s => s.session_id),
    [filteredLiveSessions],
  );
  const { badges } = useSessionBadges(sessionIds);

  const projectName = selectedProject || 'All Projects';

  // Early return: if viewing a session, show ActiveSessionViewer
  if (selectedSession) {
    return (
      <ActiveSessionViewer
        sessionId={selectedSession.session_id}
        onBack={() => setSelectedSession(null)}
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

        {/* ── Active Sessions ── */}
        <section className="jacques-animate-in" style={{ flexShrink: 0 }}>
          <SectionHeader
            title={`ACTIVE SESSIONS (${filteredLiveSessions.length})`}
            accentColor={PALETTE.coral}
          />

          {loading ? (
            <div className="jacques-horizontal-scroll">
              <SkeletonSessionCard />
              <SkeletonSessionCard />
            </div>
          ) : filteredLiveSessions.length === 0 ? (
            <div style={styles.emptyActive}>
              <Terminal size={20} color={PALETTE.textDim} style={{ opacity: 0.4 }} />
              <span style={{ color: PALETTE.textDim, fontSize: '13px' }}>No active sessions</span>
            </div>
          ) : (
            <div className="jacques-scroll-fade">
              <div className="jacques-horizontal-scroll">
                {filteredLiveSessions.map((session) => (
                  <div key={session.session_id} style={styles.sessionCardSlot}>
                    <SessionCard
                      session={session}
                      isFocused={session.session_id === focusedSessionId}
                      badges={badges.get(session.session_id)}
                      onClick={() => setSelectedSession(session)}
                      onPlanClick={() => setSelectedSession(session)}
                      onAgentClick={() => setSelectedSession(session)}
                    />
                  </div>
                ))}
              </div>
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
                        {session.gitBranch && (
                          <span style={styles.historyBranch}>@{session.gitBranch}</span>
                        )}
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

        {/* ── Assets ── */}
        <section className="jacques-animate-in" style={{ flexShrink: 0 }}>
          <SectionHeader title="ASSETS" accentColor={PALETTE.teal} />

          {loading ? (
            <div style={styles.assetsGrid}>
              {['PLANS', 'EXPLORATIONS', 'WEB SEARCHES'].map((title) => (
                <div key={title} style={styles.assetColumn}>
                  <div style={styles.assetColumnHeader}><span>{title}</span></div>
                  <div style={{ ...styles.assetColumnUnderline, background: `linear-gradient(90deg, ${PALETTE.teal}40, transparent)` }} />
                  <div style={styles.assetCardList}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <SkeletonAssetCard key={i} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div style={styles.assetsGrid}>
            <AssetColumn
              title="PLANS"
              icon={<PlanIcon size={14} color={COLOR.plan} />}
              items={documents.plans.map(p => ({
                text: p.title,
                icon: <PlanIcon size={11} color={COLOR.plan} />,
              }))}
              accentColor={COLOR.plan}
              accentBg={COLOR.planBg}
              maxHeight={240}
            />
            <AssetColumn
              title="EXPLORATIONS"
              icon={<AgentIcon size={14} color={COLOR.agent} />}
              items={documents.explorations.map(e => ({
                text: e.description,
                icon: <AgentIcon size={11} color={COLOR.agent} />,
              }))}
              accentColor={COLOR.agent}
              accentBg={COLOR.agentBg}
              maxHeight={240}
            />
            <AssetColumn
              title="WEB SEARCHES"
              icon={<Globe size={14} color={COLOR.web} />}
              items={documents.webSearches.map(s => ({
                text: `"${s.query}"`,
                icon: <Globe size={11} color={COLOR.web} />,
              }))}
              accentColor={COLOR.web}
              accentBg={COLOR.webBg}
              maxHeight={240}
            />
          </div>
          )}
        </section>
      </div>
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
    overflow: 'hidden',
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
  sessionCardSlot: {
    minWidth: '340px',
    maxWidth: '340px',
    flexShrink: 0,
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
  historyBranch: {
    fontSize: '11px',
    color: PALETTE.coral,
    flexShrink: 0,
    fontFamily: 'monospace',
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

  // Assets
  assetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  assetColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: PALETTE.bgCard,
    borderRadius: '10px',
    border: `1px solid ${PALETTE.textDim}18`,
    padding: '20px',
  },
  assetColumnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10px',
    fontWeight: 600,
    color: PALETTE.muted,
    letterSpacing: '0.1em',
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
  },
  assetColumnCount: {
    marginLeft: '2px',
    opacity: 0.5,
  },
  assetColumnUnderline: {
    height: '2px',
    marginBottom: '12px',
    borderRadius: '1px',
  },

  // Asset card — mini document style
  assetCardList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  assetCard: {
    display: 'flex',
    alignItems: 'stretch',
    borderRadius: '6px',
    backgroundColor: PALETTE.bg,
    border: `1px solid ${PALETTE.textDim}12`,
    overflow: 'hidden',
    cursor: 'pointer',
  },
  assetCardAccent: {
    width: '3px',
    flexShrink: 0,
    borderRadius: '3px 0 0 3px',
  },
  assetCardBody: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    minWidth: 0,
    flex: 1,
  },
  assetCardIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '22px',
    borderRadius: '4px',
    flexShrink: 0,
  },
  assetCardText: {
    fontSize: '12px',
    color: PALETTE.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    lineHeight: 1.4,
  },

  // Shared
  emptyText: {
    fontSize: '12px',
    color: PALETTE.textDim,
    fontStyle: 'italic' as const,
    padding: '12px 0',
  },
};
