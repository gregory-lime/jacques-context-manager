import type { Session, SessionBadges } from '../types';
import { colors } from '../styles/theme';
import { ContextMeter } from './ContextMeter';

interface SessionCardProps {
  session: Session;
  isFocused: boolean;
  badges?: SessionBadges;
  onClick?: () => void;
  onPlanClick?: () => void;
  onAgentClick?: () => void;
}

export function SessionCard({
  session,
  isFocused,
  badges,
  onClick,
  onPlanClick,
  onAgentClick,
}: SessionCardProps) {
  const project = session.project || 'unknown';
  const title = session.session_title || 'Untitled';
  const model = session.model?.display_name || session.model?.id || 'Unknown model';
  const status = session.status;

  // Status icon
  const statusIcon = status === 'working' ? '⚡' : status === 'idle' ? '💤' : '●';

  // Badge info - plans and agents are prominent/clickable
  const hasPlan = badges && badges.planCount > 0;
  const hasAgents = badges && badges.agentCount > 0;

  // Build agent type string
  let agentTypeStr = '';
  if (hasAgents && badges) {
    const types: string[] = [];
    if (badges.agentTypes.explore > 0) types.push('explore');
    if (badges.agentTypes.plan > 0) types.push('plan');
    agentTypeStr = types.length > 0 ? ` (${types.join(', ')})` : '';
  }

  // Secondary badges (smaller, inline)
  const secondaryBadges: string[] = [];
  if (badges) {
    if (badges.mode === 'planning') secondaryBadges.push('planning');
    if (badges.mode === 'execution') secondaryBadges.push('executing');
    if (badges.mcpCount > 0) secondaryBadges.push('mcp');
    if (badges.webSearchCount > 0) secondaryBadges.push('web');
    if (badges.hadAutoCompact) secondaryBadges.push('compacted');
  }

  // Shorten model name for display
  const shortModel = model
    .replace('claude-', '')
    .replace('-20251101', '')
    .replace('-20250218', '')
    .replace('-20250514', '');

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on a badge button
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

  return (
    <div
      style={{
        ...styles.card,
        borderColor: isFocused ? colors.accent : colors.borderSubtle,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.project}>{project}</span>
        <span style={styles.status}>
          {statusIcon} {status}
        </span>
      </div>

      {/* Title */}
      <div style={styles.title}>{title}</div>

      {/* Model */}
      <div style={styles.model}>{shortModel}</div>

      {/* Context Meter */}
      <div style={styles.meter}>
        <ContextMeter metrics={session.context_metrics} />
      </div>

      {/* Prominent Badges Row (Plans & Agents) */}
      {(hasPlan || hasAgents) && (
        <div style={styles.prominentBadges}>
          {hasPlan && (
            <button
              style={styles.planBadge}
              onClick={handlePlanClick}
              type="button"
              title="View plans"
            >
              📋 {badges!.planCount} plan{badges!.planCount > 1 ? 's' : ''}
            </button>
          )}
          {hasAgents && (
            <button
              style={styles.agentBadge}
              onClick={handleAgentClick}
              type="button"
              title="View agents"
            >
              🤖 {badges!.agentCount} agent{badges!.agentCount > 1 ? 's' : ''}{agentTypeStr}
            </button>
          )}
        </div>
      )}

      {/* Secondary Badges Row */}
      {secondaryBadges.length > 0 && (
        <div style={styles.secondaryBadges}>
          {secondaryBadges.map((badge, i) => (
            <span key={i}>
              {i > 0 && <span style={styles.metaDot}>·</span>}
              <span style={getSecondaryBadgeStyle(badge)}>{badge}</span>
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        <span style={styles.terminal}>
          {session.terminal?.term_program || 'Terminal'}
        </span>
        {isFocused && (
          <span style={styles.focusedBadge}>Focused</span>
        )}
      </div>
    </div>
  );
}

/**
 * Get style for secondary badges
 */
function getSecondaryBadgeStyle(badge: string): React.CSSProperties {
  if (badge === 'planning') {
    return { color: '#34D399' }; // Green for planning
  }
  if (badge === 'executing') {
    return { color: '#60A5FA' }; // Blue for execution
  }
  if (badge === 'mcp' || badge === 'web') {
    return { color: colors.textSecondary }; // Gray for external tools
  }
  if (badge === 'compacted') {
    return { color: colors.textMuted, fontStyle: 'italic' as const };
  }
  return { color: colors.textSecondary };
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: colors.bgSecondary,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: '8px',
    padding: '16px',
    transition: 'border-color 150ms ease, background-color 150ms ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  project: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.accentOrange,
  },
  status: {
    fontSize: '12px',
    color: colors.textMuted,
  },
  title: {
    fontSize: '14px',
    color: colors.textPrimary,
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  model: {
    fontSize: '12px',
    color: colors.textSecondary,
    marginBottom: '8px',
  },
  meter: {
    marginBottom: '12px',
  },
  prominentBadges: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap' as const,
  },
  planBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#A78BFA',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    border: '1px solid rgba(167, 139, 250, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  agentBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 500,
    color: colors.accentOrange,
    backgroundColor: 'rgba(255, 102, 0, 0.15)',
    border: '1px solid rgba(255, 102, 0, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  secondaryBadges: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    marginBottom: '8px',
  },
  metaDot: {
    color: colors.textMuted,
    margin: '0 2px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
  },
  terminal: {
    color: colors.textMuted,
  },
  focusedBadge: {
    backgroundColor: colors.accent,
    color: colors.bgPrimary,
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 500,
    fontSize: '11px',
  },
};
