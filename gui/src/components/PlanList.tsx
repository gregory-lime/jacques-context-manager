/**
 * PlanList - Clickable list of plans
 */

import { colors } from '../styles/theme';
import { PlanIcon } from './Icons';

export interface PlanListItem {
  id: string;
  title: string;
  filename: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  sessions: string[];
}

interface PlanListProps {
  plans: PlanListItem[];
  onPlanClick?: (plan: PlanListItem) => void;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PlanList({ plans, onPlanClick }: PlanListProps) {
  if (plans.length === 0) {
    return (
      <div style={styles.empty}>
        No plans yet
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {plans.map((plan) => (
        <button
          key={plan.id}
          style={styles.planRow}
          onClick={() => onPlanClick?.(plan)}
          type="button"
        >
          <span style={styles.icon}>
            <PlanIcon size={14} color={colors.textMuted} />
          </span>
          <span style={styles.title}>{plan.title}</span>
          <span style={styles.date}>{formatDate(plan.updatedAt)}</span>
          <span style={styles.viewButton}>View</span>
        </button>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  empty: {
    fontSize: '12px',
    color: colors.textMuted,
    fontStyle: 'italic' as const,
    padding: '8px 0',
  },
  planRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    backgroundColor: colors.bgElevated,
    border: `1px solid transparent`,
    borderRadius: '6px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'all 150ms ease',
    width: '100%',
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: '13px',
    color: colors.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  date: {
    fontSize: '11px',
    color: colors.textMuted,
    flexShrink: 0,
  },
  viewButton: {
    fontSize: '11px',
    color: colors.accent,
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(230, 126, 82, 0.1)',
    flexShrink: 0,
  },
};
