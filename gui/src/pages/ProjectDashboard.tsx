/**
 * ProjectDashboard - Terminal-style project overview with ASCII art flair
 *
 * Design principles:
 * - Full viewport layout with smooth scrolling
 * - Terminal aesthetic with colorful block patterns
 * - Custom scrollbars matching the theme
 * - Dense, scannable information
 */

import { useMemo, useState, useEffect, useRef } from 'react';
import { useJacquesClient } from '../hooks/useJacquesClient';
import { useProjectScope } from '../hooks/useProjectScope.js';
import { listSessionsByProject, type SessionEntry } from '../api';
import type { Session } from '../types';

// ============================================================
// Color Palette
// ============================================================

const PALETTE = {
  coral: '#E67E52',
  coralDark: '#D06840',
  coralLight: '#F09070',
  teal: '#2DD4BF',
  purple: '#A78BFA',
  blue: '#60A5FA',
  pink: '#F472B6',
  yellow: '#FBBF24',
  muted: '#8B9296',
  text: '#E5E7EB',
  textDim: '#6B7075',
  bg: '#0d0d0d',
  bgCard: '#1a1a1a',
  bgHover: '#252525',
  success: '#4ADE80',
  danger: '#EF4444',
};

// ============================================================
// Inject global styles for custom scrollbars
// ============================================================

const scrollbarStyles = `
  .jacques-dashboard::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  .jacques-dashboard::-webkit-scrollbar-track {
    background: ${PALETTE.bg};
  }
  .jacques-dashboard::-webkit-scrollbar-thumb {
    background: ${PALETTE.muted}40;
    border-radius: 4px;
  }
  .jacques-dashboard::-webkit-scrollbar-thumb:hover {
    background: ${PALETTE.coral}60;
  }
  .jacques-dashboard::-webkit-scrollbar-corner {
    background: ${PALETTE.bg};
  }
  .jacques-dashboard {
    scrollbar-width: thin;
    scrollbar-color: ${PALETTE.muted}40 ${PALETTE.bg};
  }
  .jacques-session-row:hover {
    background-color: ${PALETTE.bgHover} !important;
  }
  .jacques-doc-item:hover {
    color: ${PALETTE.coral} !important;
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  @keyframes slide-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .jacques-animate-in {
    animation: slide-in 0.3s ease-out forwards;
  }
`;

// ============================================================
// Helper Functions
// ============================================================

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

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// ============================================================
// Types
// ============================================================

interface SessionListItem {
  id: string;
  title: string;
  displayTitle: string;
  source: 'live' | 'saved';
  date: string;
  contextPercent?: number;
  isActive?: boolean;
  status?: string;
}

interface PlanItem { title: string; sessionId: string; }
interface ExploreItem { description: string; sessionId: string; }
interface WebSearchItem { query: string; sessionId: string; }

// ============================================================
// Data Aggregation
// ============================================================

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
    items.push({
      id: session.session_id,
      title: session.session_title || 'Untitled',
      displayTitle: session.session_title || 'Untitled',
      source: 'live',
      date: new Date(session.registered_at).toISOString(),
      contextPercent: session.context_metrics?.used_percentage ? Math.round(session.context_metrics.used_percentage) : undefined,
      isActive: session.status === 'active' || session.status === 'working',
      status: session.status,
    });
  }

  for (const session of savedSessions) {
    if (seenIds.has(session.id)) continue;
    seenIds.add(session.id);

    let displayTitle = session.title;
    if (session.mode === 'execution' && session.planRefs && session.planRefs.length > 0) {
      const cleanTitle = session.planRefs[0].title.replace(/^Plan:\s*/i, '');
      displayTitle = `Plan: ${truncate(cleanTitle, 35)}`;
    }

    items.push({ id: session.id, title: session.title, displayTitle, source: 'saved', date: session.endedAt });
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

// ============================================================
// Decorative Components
// ============================================================

function BlockPattern({ colors: patternColors, style }: { colors: string[]; style?: React.CSSProperties }) {
  const blocks = ['█', '▓', '▒', '░'];
  return (
    <div style={{ display: 'flex', gap: '2px', ...style }}>
      {patternColors.map((color, i) => (
        <span key={i} style={{ color, opacity: 0.8, fontSize: '10px', lineHeight: 1 }}>
          {blocks[i % blocks.length]}
        </span>
      ))}
    </div>
  );
}

function CornerAccent({ position }: { position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' }) {
  const isTop = position.includes('top');
  const isLeft = position.includes('Left');

  const positionStyle: React.CSSProperties = {
    position: 'fixed',
    [isTop ? 'top' : 'bottom']: '20px',
    [isLeft ? 'left' : 'right']: '20px',
    opacity: 0.12,
    pointerEvents: 'none',
    zIndex: 0,
  };

  const pattern = isTop
    ? [PALETTE.coral, PALETTE.coralLight, PALETTE.yellow, PALETTE.pink]
    : [PALETTE.teal, PALETTE.blue, PALETTE.purple, PALETTE.pink];

  return (
    <div style={positionStyle}>
      {[0, 1, 2].map(row => (
        <div key={row} style={{ display: 'flex', gap: '1px', marginBottom: '1px' }}>
          {pattern.slice(0, 4 - row).map((color, i) => (
            <span key={i} style={{
              color,
              fontSize: `${14 - row * 3}px`,
              opacity: 1 - row * 0.25,
              transform: isLeft ? 'none' : 'scaleX(-1)',
            }}>
              █
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title, accentColor }: { title: string; accentColor: string }) {
  return (
    <div style={styles.sectionHeader}>
      <span style={{ color: accentColor, marginRight: '8px', fontSize: '8px' }}>█▓▒░</span>
      <span>{title}</span>
      <div style={{ ...styles.sectionLine, background: `linear-gradient(90deg, ${accentColor}30, transparent)` }} />
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={styles.statPill}>
      <span style={{ color, fontSize: '6px', marginRight: '6px' }}>██</span>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

function ScrollableList({ children, maxHeight = 400 }: { children: React.ReactNode; maxHeight?: number }) {
  return (
    <div
      className="jacques-dashboard"
      style={{
        maxHeight,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollBehavior: 'smooth',
      }}
    >
      {children}
    </div>
  );
}

function DocumentColumn({ title, items, accentColor, maxHeight = 300 }: {
  title: string;
  items: Array<{ text: string }>;
  accentColor: string;
  maxHeight?: number;
}) {
  return (
    <div style={styles.documentColumn}>
      <div style={styles.columnHeader}>
        <span style={{ color: accentColor, marginRight: '6px', fontSize: '8px' }}>▓░</span>
        {title}
        {items.length > 0 && (
          <span style={{ marginLeft: '6px', opacity: 0.5 }}>({items.length})</span>
        )}
      </div>
      <div style={{ ...styles.columnUnderline, background: `linear-gradient(90deg, ${accentColor}40, transparent)` }} />
      <ScrollableList maxHeight={maxHeight}>
        {items.length === 0 ? (
          <div style={styles.emptyText}>None yet</div>
        ) : (
          items.map((item, i) => (
            <div
              key={i}
              className="jacques-doc-item jacques-animate-in"
              style={{
                ...styles.documentItem,
                animationDelay: `${i * 30}ms`,
              }}
            >
              <span style={{ color: accentColor, marginRight: '6px', opacity: 0.5 }}>›</span>
              {truncate(item.text, 28)}
            </div>
          ))
        )}
      </ScrollableList>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function ProjectDashboard() {
  const { sessions: allLiveSessions, connected } = useJacquesClient();
  const { selectedProject, filterSessions } = useProjectScope();
  const styleRef = useRef<HTMLStyleElement | null>(null);

  const [savedSessionsByProject, setSavedSessionsByProject] = useState<Record<string, SessionEntry[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inject custom scrollbar styles
  useEffect(() => {
    if (!styleRef.current) {
      const style = document.createElement('style');
      style.textContent = scrollbarStyles;
      document.head.appendChild(style);
      styleRef.current = style;
    }
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, []);

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

  const projectName = selectedProject || 'All Projects';

  return (
    <div className="jacques-dashboard" style={styles.viewport}>
      {/* Corner decorations - fixed position */}
      <CornerAccent position="topRight" />
      <CornerAccent position="bottomLeft" />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header} className="jacques-animate-in">
          <div style={styles.headerLeft}>
            <BlockPattern
              colors={[PALETTE.coral, PALETTE.coralLight, PALETTE.yellow, PALETTE.pink, PALETTE.purple]}
              style={{ marginBottom: '8px' }}
            />
            <h1 style={styles.title}>PROJECT DASHBOARD</h1>
          </div>
          <div style={styles.connectionBadge}>
            <span style={{
              ...styles.connectionDot,
              backgroundColor: connected ? PALETTE.success : PALETTE.danger,
              boxShadow: connected ? `0 0 8px ${PALETTE.success}60` : 'none',
              animation: connected ? 'pulse-glow 2s ease-in-out infinite' : 'none',
            }} />
            <span style={{ color: connected ? PALETTE.success : PALETTE.danger }}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Project Name & Stats */}
        <div style={styles.projectSection} className="jacques-animate-in">
          <div style={styles.projectName}>{projectName}</div>
          <div style={styles.statsRow}>
            <StatPill label="Sessions" value={stats.totalSessions} color={PALETTE.coral} />
            <StatPill label="Input" value={formatTokens(stats.totalInputTokens)} color={PALETTE.teal} />
            <StatPill label="Output" value={formatTokens(stats.totalOutputTokens)} color={PALETTE.blue} />
            {stats.totalPlans > 0 && <StatPill label="Plans" value={stats.totalPlans} color={PALETTE.purple} />}
            {stats.totalExplorations > 0 && <StatPill label="Explores" value={stats.totalExplorations} color={PALETTE.pink} />}
            {stats.totalWebSearches > 0 && <StatPill label="Searches" value={stats.totalWebSearches} color={PALETTE.blue} />}
          </div>
        </div>

        {/* Error */}
        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* Main Content Grid */}
        <div style={styles.mainGrid}>
          {/* Sessions Panel */}
          <div style={styles.sessionsPanel}>
            <SectionHeader title="SESSIONS" accentColor={PALETTE.coral} />

            {loading ? (
              <div style={styles.emptyText}>Loading...</div>
            ) : sessionList.length === 0 ? (
              <div style={styles.emptyText}>No sessions yet</div>
            ) : (
              <ScrollableList maxHeight={500}>
                <div style={styles.sessionsList}>
                  {sessionList.map((session, index) => {
                    const isLive = session.source === 'live';
                    const dotColor = isLive
                      ? (session.status === 'working' ? PALETTE.coral : PALETTE.success)
                      : PALETTE.textDim;

                    return (
                      <div
                        key={session.id}
                        className="jacques-session-row jacques-animate-in"
                        style={{
                          ...styles.sessionRow,
                          animationDelay: `${index * 40}ms`,
                        }}
                      >
                        <span style={{
                          color: dotColor,
                          fontSize: '8px',
                          width: '16px',
                          textShadow: isLive ? `0 0 6px ${dotColor}` : 'none',
                          animation: isLive && session.status === 'working' ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
                        }}>
                          {isLive ? '██' : '░░'}
                        </span>
                        <span style={styles.sessionTitle}>
                          {truncate(session.displayTitle, 38)}
                        </span>
                        <span style={styles.sessionMeta}>
                          {formatDate(session.date)}
                        </span>
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
                    );
                  })}
                </div>
              </ScrollableList>
            )}
          </div>

          {/* Documents Panel */}
          <div style={styles.documentsPanel}>
            <SectionHeader title="DOCUMENTS" accentColor={PALETTE.teal} />

            <div style={styles.documentsGrid}>
              <DocumentColumn
                title="PLANS"
                items={documents.plans.map(p => ({ text: p.title }))}
                accentColor={PALETTE.purple}
                maxHeight={200}
              />
              <DocumentColumn
                title="EXPLORATIONS"
                items={documents.explorations.map(e => ({ text: e.description }))}
                accentColor={PALETTE.teal}
                maxHeight={200}
              />
              <DocumentColumn
                title="WEB SEARCHES"
                items={documents.webSearches.map(s => ({ text: `"${s.query}"` }))}
                accentColor={PALETTE.blue}
                maxHeight={200}
              />
            </div>
          </div>
        </div>

        {/* Footer decoration */}
        <div style={styles.footer}>
          <BlockPattern
            colors={[PALETTE.textDim, PALETTE.muted, PALETTE.coral, PALETTE.muted, PALETTE.textDim]}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Styles
// ============================================================

const styles: Record<string, React.CSSProperties> = {
  viewport: {
    width: '100%',
    height: '100vh',
    backgroundColor: PALETTE.bg,
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollBehavior: 'smooth',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 40px',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    fontSize: '13px',
    color: PALETTE.text,
    lineHeight: 1.6,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative' as const,
    zIndex: 1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: PALETTE.text,
    letterSpacing: '0.1em',
    margin: 0,
  },
  connectionBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    padding: '6px 12px',
    backgroundColor: PALETTE.bgCard,
    borderRadius: '4px',
    border: `1px solid ${PALETTE.muted}20`,
  },
  connectionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  projectSection: {
    marginBottom: '32px',
  },
  projectName: {
    fontSize: '28px',
    fontWeight: 700,
    color: PALETTE.coral,
    marginBottom: '16px',
    textShadow: `0 0 40px ${PALETTE.coral}25`,
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
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: `${PALETTE.danger}15`,
    border: `1px solid ${PALETTE.danger}40`,
    borderRadius: '4px',
    fontSize: '12px',
    color: PALETTE.danger,
    marginBottom: '24px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr',
    gap: '40px',
    flex: 1,
  },
  sessionsPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  documentsPanel: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: PALETTE.muted,
    letterSpacing: '0.15em',
    marginBottom: '16px',
  },
  sectionLine: {
    flex: 1,
    height: '1px',
    marginLeft: '12px',
  },
  sessionsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  sessionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    backgroundColor: PALETTE.bgCard,
    borderRadius: '4px',
    border: `1px solid transparent`,
    transition: 'background-color 150ms, border-color 150ms',
    cursor: 'pointer',
  },
  sessionTitle: {
    flex: 1,
    color: PALETTE.text,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  sessionMeta: {
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
  },
  documentsGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  documentColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  columnHeader: {
    fontSize: '10px',
    fontWeight: 600,
    color: PALETTE.muted,
    letterSpacing: '0.1em',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
  },
  columnUnderline: {
    height: '2px',
    marginBottom: '12px',
    borderRadius: '1px',
  },
  documentItem: {
    fontSize: '12px',
    color: PALETTE.text,
    padding: '6px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    cursor: 'pointer',
    transition: 'color 150ms',
  },
  emptyText: {
    fontSize: '12px',
    color: PALETTE.textDim,
    fontStyle: 'italic' as const,
    padding: '12px 0',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: '40px',
    paddingBottom: '20px',
    display: 'flex',
    justifyContent: 'center',
    opacity: 0.4,
  },
};
