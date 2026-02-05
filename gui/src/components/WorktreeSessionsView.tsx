/**
 * WorktreeSessionsView - Git worktree visualization
 *
 * Subtle chunky pixel tree with glow, git icon, and clear worktree names.
 * Supports multi-select for window tiling.
 */

import { useMemo, useState, useCallback } from 'react';
import type { Session, SessionBadges } from '../types';
import { colors } from '../styles/theme';
import { CompactSessionCard } from './CompactSessionCard';
import { Terminal, GitBranch, LayoutGrid, X } from 'lucide-react';

interface Props {
  sessions: Session[];
  focusedSessionId: string | null;
  badges: Map<string, SessionBadges>;
  onSessionClick: (session: Session) => void;
  onFocusSession?: (sessionId: string) => void;
  onTileSessions?: (sessionIds: string[], layout?: 'side-by-side' | 'thirds' | '2x2') => void;
}

interface WorktreeGroup {
  id: string;
  branch: string;
  isMain: boolean;
  sessions: Session[];
}

function groupSessions(sessions: Session[]): WorktreeGroup[] {
  const map = new Map<string, WorktreeGroup>();

  for (const s of sessions) {
    const id = s.git_worktree || 'main';
    const branch = s.git_branch || 'main';
    const isMain = !s.git_worktree || id === 'main';

    if (!map.has(id)) {
      map.set(id, { id, branch, isMain, sessions: [] });
    }
    map.get(id)!.sessions.push(s);
  }

  return [...map.values()].sort((a, b) => {
    if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

// Pixel sizes
const PX = 4;
const TRUNK_W = PX * 2;
const BRANCH_H = PX * 2;
const NODE_SIZE = PX * 3;
const GUTTER_LEFT = 8;

export function WorktreeSessionsView({ sessions, focusedSessionId, badges, onSessionClick, onFocusSession, onTileSessions }: Props) {
  const groups = useMemo(() => groupSessions(sessions), [sessions]);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const handleSelectionChange = useCallback((sessionId: string, selected: boolean) => {
    setSelectedSessionIds(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(sessionId);
      } else {
        newSet.delete(sessionId);
      }
      return newSet;
    });
    // Auto-enable selection mode when first item is selected
    if (selected && !selectionMode) {
      setSelectionMode(true);
    }
  }, [selectionMode]);

  const handleClearSelection = useCallback(() => {
    setSelectedSessionIds(new Set());
    setSelectionMode(false);
  }, []);

  const handleTileClick = useCallback(() => {
    if (selectedSessionIds.size >= 2 && onTileSessions) {
      const sessionIds = Array.from(selectedSessionIds);
      // Suggest layout based on count
      let layout: 'side-by-side' | 'thirds' | '2x2' | undefined;
      if (sessionIds.length === 2) layout = 'side-by-side';
      else if (sessionIds.length === 3) layout = 'thirds';
      else if (sessionIds.length >= 4) layout = '2x2';

      onTileSessions(sessionIds, layout);
      // Clear selection after tiling
      handleClearSelection();
    }
  }, [selectedSessionIds, onTileSessions, handleClearSelection]);

  if (!sessions.length) {
    return (
      <div style={styles.empty}>
        <Terminal size={20} style={{ opacity: 0.3 }} />
        <span>No active sessions</span>
      </div>
    );
  }

  const total = groups.length;
  const selectedCount = selectedSessionIds.size;

  return (
    <div style={styles.root}>
      {/* Tile controls bar - shown when 2+ sessions selected */}
      {selectedCount >= 2 && onTileSessions && (
        <div style={styles.tileBar}>
          <span style={styles.tileBarText}>
            {selectedCount} sessions selected
          </span>
          <button
            onClick={handleTileClick}
            style={styles.tileButton}
            title="Tile selected sessions side-by-side"
          >
            <LayoutGrid size={14} />
            <span>Tile</span>
          </button>
          <button
            onClick={handleClearSelection}
            style={styles.clearButton}
            title="Clear selection"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {groups.map((g, i) => {
        const isFirst = i === 0;
        const isLast = i === total - 1;
        const nodeColor = g.isMain ? colors.success : colors.accent;
        const trunkLeft = GUTTER_LEFT + (NODE_SIZE - TRUNK_W) / 2;

        return (
          <div key={g.id} style={styles.group}>
            {/* Node row: tree node + branch + label (all on same line) */}
            <div style={styles.nodeRow}>
              {/* Trunk ABOVE the node (connecting from previous) */}
              {!isFirst && (
                <div
                  style={{
                    position: 'absolute',
                    left: trunkLeft,
                    top: 0,
                    width: TRUNK_W,
                    height: NODE_SIZE / 2 + 2, // Connect to center of node
                    backgroundColor: colors.borderSubtle,
                    opacity: 0.35,
                  }}
                />
              )}

              {/* Node */}
              <div
                style={{
                  width: NODE_SIZE,
                  height: NODE_SIZE,
                  backgroundColor: nodeColor,
                  opacity: 0.8,
                  boxShadow: `0 0 8px ${nodeColor}60, 0 0 12px ${nodeColor}30`,
                  marginLeft: GUTTER_LEFT,
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: 1,
                }}
              />

              {/* Horizontal branch */}
              <div
                style={{
                  width: PX * 3,
                  height: BRANCH_H,
                  backgroundColor: nodeColor,
                  opacity: 0.35,
                  flexShrink: 0,
                }}
              />

              {/* Label inline */}
              <div style={styles.labelRow}>
                <GitBranch
                  size={13}
                  color={g.isMain ? colors.success : colors.textSecondary}
                  strokeWidth={2}
                />
                <span style={{ ...styles.label, color: g.isMain ? colors.success : colors.textSecondary }}>
                  {g.id}
                </span>
                {g.branch !== g.id && (
                  <span style={styles.branchHint}>→ {g.branch}</span>
                )}
              </div>
            </div>

            {/* Cards area */}
            <div style={styles.cardArea}>
              {/* Trunk BELOW the node (continuing to next) */}
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    left: trunkLeft,
                    top: 0,
                    bottom: 0,
                    width: TRUNK_W,
                    backgroundColor: colors.borderSubtle,
                    opacity: 0.35,
                  }}
                />
              )}

              {/* Cards */}
              <div style={styles.cards}>
                {g.sessions.map(s => (
                  <CompactSessionCard
                    key={s.session_id}
                    session={s}
                    isFocused={s.session_id === focusedSessionId}
                    badges={badges.get(s.session_id)}
                    onClick={() => onSessionClick(s)}
                    onFocusClick={onFocusSession ? () => onFocusSession(s.session_id) : undefined}
                    selectionMode={selectionMode}
                    isSelected={selectedSessionIds.has(s.session_id)}
                    onSelectionChange={onTileSessions ? (selected) => handleSelectionChange(s.session_id, selected) : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
  },

  tileBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 16px',
    marginBottom: 12,
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    border: `1px solid ${colors.accent}40`,
  },

  tileBarText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: 500,
    flex: 1,
  },

  tileButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    color: '#fff',
    backgroundColor: colors.accent,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },

  clearButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    padding: 0,
    color: colors.textMuted,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },

  group: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },

  nodeRow: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    paddingTop: 8,
  },

  labelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },

  label: {
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: '0.01em',
    textTransform: 'uppercase',
  },

  branchHint: {
    color: colors.textMuted,
    opacity: 0.6,
    textTransform: 'none',
    fontWeight: 400,
    fontSize: 10,
  },

  cardArea: {
    display: 'flex',
    position: 'relative',
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: GUTTER_LEFT + NODE_SIZE + PX * 3 + 20, // Align with after the branch
  },

  cards: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    flex: 1,
  },

  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '48px 24px',
    color: colors.textMuted,
    fontSize: 13,
  },
};
