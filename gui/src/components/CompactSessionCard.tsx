/**
 * CompactSessionCard - macOS-style window card for worktree sessions
 *
 * Design philosophy:
 * - Apple-inspired window chrome with single status dot
 * - Generous breathing room with clear visual hierarchy
 * - Focus button to bring terminal to foreground
 * - Infinite scroll for long plan titles on hover
 * - Subtle animations that feel native
 */

import { useRef, useEffect, useState } from 'react';
import type { Session, SessionBadges } from '../types';
import { colors } from '../styles/theme';
import { PlanIcon, AgentIcon } from './Icons';
import { GitBranch, Play, Zap, ChevronRight, Crosshair, Check } from 'lucide-react';

interface CompactSessionCardProps {
  session: Session;
  isFocused?: boolean;
  badges?: SessionBadges;
  onClick?: () => void;
  onFocusClick?: () => void;
  /** Whether multi-select mode is active */
  selectionMode?: boolean;
  /** Whether this card is selected (for tiling) */
  isSelected?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (selected: boolean) => void;
}

const PLAN_TITLE_PATTERNS = [
  /^implement the following plan[:\s]*/i,
  /^here is the plan[:\s]*/i,
  /^follow this plan[:\s]*/i,
];

function formatSessionTitle(rawTitle: string | null): { isPlan: boolean; displayTitle: string } {
  if (!rawTitle) return { isPlan: false, displayTitle: 'Untitled session' };
  for (const pattern of PLAN_TITLE_PATTERNS) {
    if (pattern.test(rawTitle)) {
      const cleaned = rawTitle.replace(pattern, '').trim();
      const headingMatch = cleaned.match(/^#\s+(.+)/m);
      const planName = headingMatch
        ? headingMatch[1].trim()
        : cleaned.split('\n')[0].trim();
      return { isPlan: true, displayTitle: planName || 'Unnamed Plan' };
    }
  }
  return { isPlan: false, displayTitle: rawTitle };
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return tokens.toString();
}

const STATUS_CONFIG = {
  working: {
    color: '#E67E52',
    label: 'working',
    glow: true,
    animate: true,
  },
  idle: {
    color: '#6B7075',
    label: 'idle',
    glow: false,
    animate: false,
  },
  active: {
    color: '#4ADE80',
    label: 'active',
    glow: true,
    animate: false,
  },
} as const;

export function CompactSessionCard({
  session,
  isFocused = false,
  badges,
  onClick,
  onFocusClick,
  selectionMode = false,
  isSelected = false,
  onSelectionChange,
}: CompactSessionCardProps) {
  const titleRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [focusHovered, setFocusHovered] = useState(false);
  const [checkboxHovered, setCheckboxHovered] = useState(false);

  // Check if title overflows and needs scrolling
  useEffect(() => {
    const checkOverflow = () => {
      if (titleRef.current && titleTextRef.current) {
        const containerWidth = titleRef.current.offsetWidth;
        const textWidth = titleTextRef.current.scrollWidth;
        setShouldScroll(textWidth > containerWidth);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [session.session_title]);

  const status = session.status;
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const { isPlan, displayTitle } = formatSessionTitle(session.session_title);

  const model = session.model?.display_name || session.model?.id || '';
  const shortModel = model
    .replace('claude-', '')
    .replace('-20251101', '')
    .replace('-20250218', '')
    .replace('-20250514', '');

  const hasPlan = badges && badges.planCount > 0;
  const hasAgents = badges && badges.agentCount > 0;
  const metrics = session.context_metrics;
  const percentage = metrics?.used_percentage ?? 0;

  // Calculate context bar color based on usage
  const getContextColor = (pct: number) => {
    if (pct >= 85) return colors.danger;
    if (pct >= 70) return colors.warning;
    return colors.accent;
  };

  const contextColor = getContextColor(percentage);

  const handleFocusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocusClick?.();
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange?.(!isSelected);
  };

  const handleCardClick = () => {
    if (selectionMode && onSelectionChange) {
      onSelectionChange(!isSelected);
    } else {
      onClick?.();
    }
  };

  return (
    <div
      className="jacques-compact-card"
      style={{
        ...styles.card,
        borderColor: isSelected ? colors.accent : isFocused ? colors.accent : colors.borderSubtle,
        boxShadow: isSelected
          ? `0 0 0 2px ${colors.accent}80, 0 4px 20px rgba(0,0,0,0.3)`
          : isFocused
          ? `0 0 0 1px ${colors.accent}40, 0 4px 20px rgba(0,0,0,0.3)`
          : '0 2px 8px rgba(0,0,0,0.2)',
      }}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Window Chrome Bar */}
      <div style={styles.windowBar}>
        <div style={styles.windowBarLeft}>
          {/* Selection checkbox (shown in selection mode or on hover) */}
          {(selectionMode || isHovered) && onSelectionChange && (
            <button
              onClick={handleCheckboxClick}
              onMouseEnter={() => setCheckboxHovered(true)}
              onMouseLeave={() => setCheckboxHovered(false)}
              style={{
                ...styles.checkbox,
                borderColor: isSelected ? colors.accent : checkboxHovered ? colors.textSecondary : colors.borderSubtle,
                backgroundColor: isSelected ? colors.accent : 'transparent',
              }}
              title={isSelected ? 'Deselect for tiling' : 'Select for tiling'}
            >
              {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
            </button>
          )}
          {/* Single status dot (like macOS red dot position) */}
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: statusCfg.color,
              boxShadow: statusCfg.glow ? `0 0 8px ${statusCfg.color}80` : 'none',
              animation: statusCfg.animate ? 'status-pulse 1.8s ease-in-out infinite' : 'none',
            }}
            title={statusCfg.label}
          />
          <span style={{ ...styles.statusLabel, color: statusCfg.color }}>
            {statusCfg.label}
          </span>
          {badges?.mode && (
            <span
              style={{
                ...styles.modeBadge,
                color: badges.mode === 'planning' ? '#34D399' : '#60A5FA',
                backgroundColor: badges.mode === 'planning'
                  ? 'rgba(52, 211, 153, 0.12)'
                  : 'rgba(96, 165, 250, 0.12)',
              }}
            >
              {badges.mode === 'planning' ? (
                <><GitBranch size={9} style={{ marginRight: 3 }} />plan</>
              ) : (
                <><Play size={9} style={{ marginRight: 3 }} />exec</>
              )}
            </span>
          )}
        </div>
        <div style={styles.windowBarRight}>
          {onFocusClick && (
            <button
              onClick={handleFocusClick}
              onMouseEnter={() => setFocusHovered(true)}
              onMouseLeave={() => setFocusHovered(false)}
              style={{
                ...styles.focusButton,
                opacity: focusHovered ? 1 : 0.4,
              }}
              title="Focus terminal"
            >
              <Crosshair size={13} />
            </button>
          )}
          {shortModel && (
            <span style={styles.modelLabel}>{shortModel}</span>
          )}
          <span style={styles.timeLabel}>{timeAgo(session.last_activity)}</span>
        </div>
      </div>

      {/* Card Body */}
      <div style={styles.cardBody}>
        {/* Title row with hover-scroll effect */}
        <div
          ref={titleRef}
          style={styles.titleContainer}
        >
          {isPlan && (
            <PlanIcon size={15} color="#34D399" style={{ flexShrink: 0, marginRight: 8 }} />
          )}
          {shouldScroll && isHovered && isPlan ? (
            // Infinite marquee for plan titles
            <div style={styles.marqueeWrapper}>
              <span className="jacques-marquee-infinite">
                <span>{displayTitle}</span>
                <span>{displayTitle}</span>
              </span>
            </div>
          ) : (
            <span
              ref={titleTextRef}
              style={{
                ...styles.title,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayTitle}
            </span>
          )}
        </div>

        {/* Context meter - sleek inline design */}
        <div style={styles.contextRow}>
          <div style={styles.contextBar}>
            <div
              style={{
                ...styles.contextFill,
                width: `${Math.min(100, percentage)}%`,
                backgroundColor: contextColor,
              }}
            />
          </div>
          <span style={{ ...styles.contextPercent, color: contextColor }}>
            {percentage.toFixed(0)}%
          </span>
          {metrics && (
            <span style={styles.tokenInfo}>
              <span style={{ color: '#2DD4BF' }}>↓</span>
              {formatTokens(metrics.total_input_tokens)}
              <span style={{ margin: '0 4px', opacity: 0.3 }}>·</span>
              <span style={{ color: '#60A5FA' }}>↑</span>
              {formatTokens(metrics.total_output_tokens)}
            </span>
          )}
        </div>

        {/* Footer: indicators + view hint */}
        <div style={styles.footer}>
          <div style={styles.indicators}>
            {hasPlan && (
              <span style={styles.indicator}>
                <PlanIcon size={12} color="#34D399" />
                <span style={styles.indicatorText}>{badges!.planCount}</span>
              </span>
            )}
            {hasAgents && (
              <span style={styles.indicator}>
                <AgentIcon size={12} color="#FF6600" />
                <span style={styles.indicatorText}>{badges!.agentCount}</span>
              </span>
            )}
            {badges?.hadAutoCompact && (
              <Zap size={11} color={colors.textMuted} style={{ opacity: 0.6 }} />
            )}
          </div>
          <span
            className="jacques-card-hint"
            style={{
              ...styles.viewHint,
              opacity: isHovered ? 1 : 0,
              transform: isHovered ? 'translateX(0)' : 'translateX(-4px)',
            }}
          >
            view <ChevronRight size={12} style={{ marginLeft: 2 }} />
          </span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: '10px',
    border: `1px solid ${colors.borderSubtle}`,
    cursor: 'pointer',
    transition: 'all 200ms ease',
    minWidth: '280px',
    flex: '1 1 280px',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  // Window Chrome Bar
  windowBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: colors.bgElevated,
    borderBottom: `1px solid ${colors.borderSubtle}`,
    gap: '12px',
  },
  windowBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
  },
  windowBarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  checkbox: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    border: `1.5px solid ${colors.borderSubtle}`,
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    transition: 'all 150ms ease',
    flexShrink: 0,
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusLabel: {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  modeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    fontSize: '10px',
    fontWeight: 500,
    borderRadius: '4px',
    lineHeight: 1.3,
  },
  focusButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    padding: 0,
    background: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: colors.textSecondary,
    transition: 'opacity 150ms ease, background-color 150ms ease',
  },
  modelLabel: {
    fontSize: '10px',
    color: colors.textMuted,
    fontFamily: "'JetBrains Mono', monospace",
  },
  timeLabel: {
    fontSize: '10px',
    color: colors.textMuted,
    opacity: 0.7,
  },

  // Card Body
  cardBody: {
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  // Title
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    minHeight: '24px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 500,
    color: colors.textPrimary,
    whiteSpace: 'nowrap',
    lineHeight: 1.4,
  },
  marqueeWrapper: {
    overflow: 'hidden',
    flex: 1,
    minWidth: 0,
    maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
  },

  // Context meter
  contextRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  contextBar: {
    flex: 1,
    height: '6px',
    backgroundColor: colors.bgElevated,
    borderRadius: '3px',
    overflow: 'hidden',
  },
  contextFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 300ms ease, background-color 300ms ease',
  },
  contextPercent: {
    fontSize: '12px',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    minWidth: '32px',
    textAlign: 'right',
  },
  tokenInfo: {
    fontSize: '11px',
    color: colors.textMuted,
    fontFamily: "'JetBrains Mono', monospace",
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  },

  // Footer
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '20px',
  },
  indicators: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  indicator: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    opacity: 0.6,
  },
  indicatorText: {
    fontSize: '11px',
    color: colors.textSecondary,
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
  },
  viewHint: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    color: colors.textMuted,
    transition: 'all 200ms ease',
    letterSpacing: '0.02em',
  },
};
