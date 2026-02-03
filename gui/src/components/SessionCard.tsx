import type { Session, SessionBadges } from '../types';
import { colors } from '../styles/theme';
import { ContextMeter } from './ContextMeter';
import { PlanIcon, AgentIcon } from './Icons';
import { Plug, Globe, Zap, GitBranch, Play, Search } from 'lucide-react';

interface SessionCardProps {
  session: Session;
  isFocused: boolean;
  badges?: SessionBadges;
  onClick?: () => void;
  onPlanClick?: () => void;
  onAgentClick?: () => void;
  onFocusTerminal?: () => void;
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
      const planName = headingMatch
        ? headingMatch[1].trim()
        : cleaned.split('\n')[0].trim();
      const display = planName.length > 60 ? planName.slice(0, 57) + '...' : planName;
      return { isPlan: true, displayTitle: display || 'Unnamed Plan' };
    }
  }
  return { isPlan: false, displayTitle: rawTitle };
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const STATUS_CONFIG = {
  working: { dotColor: '#E67E52', textColor: '#E67E52', pulse: true },
  idle:    { dotColor: '#6B7075', textColor: '#6B7075', pulse: false },
  active:  { dotColor: '#4ADE80', textColor: '#4ADE80', pulse: false },
} as const;

export function SessionCard({
  session,
  isFocused,
  badges,
  onClick,
  onPlanClick,
  onAgentClick,
  onFocusTerminal,
}: SessionCardProps) {
  const status = session.status;
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const { isPlan, displayTitle } = formatSessionTitle(session.session_title);

  const model = session.model?.display_name || session.model?.id || 'Unknown model';
  const shortModel = model
    .replace('claude-', '')
    .replace('-20251101', '')
    .replace('-20250218', '')
    .replace('-20250514', '');

  const hasPlan = badges && badges.planCount > 0;
  const hasAgents = badges && badges.agentCount > 0;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    onClick?.();
  };

  const handlePlanClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlanClick?.();
  };

  const handleAgentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAgentClick?.();
  };

  const handleFocusTerminal = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocusTerminal?.();
  };

  const focusedStyles: React.CSSProperties = isFocused ? {
    borderColor: colors.accent,
    borderLeftWidth: '3px',
    paddingLeft: '18px',
    boxShadow: '0 0 16px rgba(230, 126, 82, 0.15)',
  } : {};

  return (
    <div
      className="jacques-session-card"
      style={{
        ...styles.card,
        ...focusedStyles,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={handleCardClick}
    >
      {/* ── Header Row ── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: statusCfg.dotColor,
              animation: statusCfg.pulse ? 'status-pulse 1.8s ease-in-out infinite' : 'none',
            }}
          />
          <span style={{ ...styles.statusText, color: statusCfg.textColor }}>
            {status}
          </span>
          {badges?.mode && (
            <span
              style={{
                ...styles.modePill,
                color: badges.mode === 'planning' ? '#34D399' : '#60A5FA',
                backgroundColor: badges.mode === 'planning'
                  ? 'rgba(52, 211, 153, 0.12)'
                  : 'rgba(96, 165, 250, 0.12)',
              }}
            >
              {badges.mode === 'planning'
                ? <><GitBranch size={9} style={{ marginRight: 3 }} />planning</>
                : <><Play size={9} style={{ marginRight: 3 }} />executing</>
              }
            </span>
          )}
        </div>
        <div style={styles.headerRight}>
          <span style={styles.modelName}>{shortModel}</span>
          <span style={styles.timeAgo}>{timeAgo(session.last_activity)}</span>
        </div>
      </div>

      {/* ── Title ── */}
      <div style={styles.titleRow}>
        {isPlan && (
          <PlanIcon size={14} color="#34D399" style={{ flexShrink: 0, marginRight: 6 }} />
        )}
        <span style={styles.title}>{displayTitle}</span>
      </div>

      {/* ── Context Meter ── */}
      <div style={styles.meter}>
        <ContextMeter metrics={session.context_metrics} />
      </div>

      {/* ── Footer Row ── */}
      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          <button
            style={{
              ...styles.focusButton,
              ...(isFocused ? styles.focusButtonActive : {}),
            }}
            className="jacques-focus-btn"
            onClick={handleFocusTerminal}
            type="button"
            title={isFocused ? 'Focused — click to bring terminal to front' : 'Click to focus this terminal'}
          >
            <Search size={12} />
          </button>
          {hasPlan && (
            <button
              style={styles.indicatorButton}
              className="jacques-indicator"
              onClick={handlePlanClick}
              type="button"
              title="View plans"
            >
              <PlanIcon size={13} color="#34D399" />
              <span style={styles.indicatorCount}>{badges!.planCount}</span>
            </button>
          )}
          {hasAgents && (
            <button
              style={styles.indicatorButton}
              className="jacques-indicator"
              onClick={handleAgentClick}
              type="button"
              title="View agents"
            >
              <AgentIcon size={13} color="#FF6600" />
              <span style={styles.indicatorCount}>{badges!.agentCount}</span>
            </button>
          )}
        </div>

        <div style={styles.footerCenter}>
          {badges && badges.mcpCount > 0 && (
            <Plug size={10} color={colors.textMuted} style={{ opacity: 0.7 }} />
          )}
          {badges && badges.webSearchCount > 0 && (
            <Globe size={10} color="#60A5FA" style={{ opacity: 0.7 }} />
          )}
          {badges?.hadAutoCompact && (
            <Zap size={10} color={colors.textMuted} style={{ opacity: 0.7 }} />
          )}
        </div>

        <span className="jacques-session-card-hint" style={styles.hint}>
          Click to view →
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: '10px',
    border: `1px solid ${colors.borderSubtle}`,
    padding: '20px',
    position: 'relative',
  },

  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusText: {
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'lowercase' as const,
    letterSpacing: '0.02em',
  },
  modePill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: 500,
    borderRadius: '3px',
    lineHeight: 1.4,
    marginLeft: '2px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  modelName: {
    fontSize: '11px',
    color: colors.textMuted,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    letterSpacing: '-0.02em',
  },
  timeAgo: {
    fontSize: '10px',
    color: colors.textMuted,
    opacity: 0.7,
  },

  // Title
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '16px',
    minWidth: 0,
  },
  title: {
    fontSize: '15px',
    fontWeight: 500,
    color: colors.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    lineHeight: 1.3,
  },

  // Meter
  meter: {
    marginBottom: '16px',
  },

  // Footer
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '20px',
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  indicatorButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    border: 'none',
    background: 'none',
    padding: '2px 4px',
    margin: '-2px -4px',
    borderRadius: '4px',
    cursor: 'pointer',
    opacity: 0.5,
    transition: 'opacity 150ms ease',
  },
  indicatorCount: {
    fontSize: '11px',
    color: colors.textSecondary,
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
  },
  focusButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    border: 'none',
    background: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: colors.textMuted,
    opacity: 0.4,
    transition: 'all 150ms ease',
    padding: 0,
  },
  focusButtonActive: {
    color: colors.accent,
    opacity: 1,
    backgroundColor: 'rgba(230, 126, 82, 0.12)',
  },
  footerCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  hint: {
    fontSize: '10px',
    color: colors.textMuted,
    opacity: 0,
    transition: 'opacity 200ms ease',
    whiteSpace: 'nowrap' as const,
    letterSpacing: '0.01em',
  },
};
