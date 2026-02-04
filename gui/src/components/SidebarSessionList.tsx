import { useState } from 'react';
import { X } from 'lucide-react';
import { useOpenSessions } from '../hooks/useOpenSessions';
import { useNavigate, useLocation } from 'react-router-dom';
import { colors } from '../styles/theme';
import { PlanIcon } from './Icons';

const PLAN_TITLE_PATTERNS = [
  /^implement the following plan[:\s]*/i,
  /^here is the plan[:\s]*/i,
  /^follow this plan[:\s]*/i,
];

function formatTitle(raw: string): { isPlan: boolean; display: string } {
  for (const pattern of PLAN_TITLE_PATTERNS) {
    if (pattern.test(raw)) {
      const cleaned = raw.replace(pattern, '').trim();
      const headingMatch = cleaned.match(/^#\s+(.+)/m);
      const name = headingMatch ? headingMatch[1].trim() : cleaned.split('\n')[0].trim();
      return { isPlan: true, display: name || 'Unnamed Plan' };
    }
  }
  return { isPlan: false, display: raw };
}

export function SidebarSessionList() {
  const { state, viewSession, closeSession } = useOpenSessions();
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (state.sessions.length === 0) return null;

  const handleClick = (id: string) => {
    viewSession(id);
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    closeSession(id);
  };

  return (
    <div style={styles.container}>
      {state.sessions.map((session, index) => {
        const isLast = index === state.sessions.length - 1;
        const isActive = state.activeViewId === session.id && location.pathname === '/';
        const { isPlan, display } = formatTitle(session.title);

        return (
          <div
            key={session.id}
            style={styles.itemRow}
            onMouseEnter={() => setHoveredId(session.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Tree connector */}
            <div style={styles.treeConnector}>
              {/* Vertical line */}
              <div style={{
                ...styles.treeLine,
                height: isLast ? '50%' : '100%',
              }} />
              {/* Horizontal branch */}
              <div style={styles.treeBranch} />
            </div>

            {/* Session item */}
            <button
              style={{
                ...styles.sessionButton,
                ...(isActive ? styles.sessionButtonActive : {}),
              }}
              onClick={() => handleClick(session.id)}
              type="button"
              title={session.title}
            >
              {isActive && <span style={styles.activeIndicator} />}
              {isPlan && (
                <PlanIcon size={12} color="#34D399" style={{ flexShrink: 0 }} />
              )}
              <span style={{
                ...styles.sessionTitle,
                color: isActive ? colors.accent : colors.textSecondary,
              }}>
                {display}
              </span>
              <button
                style={{
                  ...styles.closeButton,
                  opacity: hoveredId === session.id ? 1 : 0,
                }}
                onClick={(e) => handleClose(e, session.id)}
                type="button"
                title="Close tab"
              >
                <X size={12} />
              </button>
            </button>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxHeight: '240px',
    overflowY: 'auto',
    marginLeft: '20px',
    marginRight: '8px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'stretch',
    position: 'relative',
    minHeight: '28px',
  },
  treeConnector: {
    width: '16px',
    position: 'relative',
    flexShrink: 0,
  },
  treeLine: {
    position: 'absolute',
    left: '0px',
    top: 0,
    width: '1px',
    backgroundColor: colors.borderSubtle,
  },
  treeBranch: {
    position: 'absolute',
    left: '0px',
    top: '50%',
    width: '10px',
    height: '1px',
    backgroundColor: colors.borderSubtle,
  },
  sessionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    minWidth: 0,
    padding: '4px 6px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
    position: 'relative',
  },
  sessionButtonActive: {
    backgroundColor: colors.bgElevated,
  },
  activeIndicator: {
    position: 'absolute',
    left: '-20px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '2px',
    height: '12px',
    backgroundColor: colors.accent,
    borderRadius: '0 2px 2px 0',
  },
  sessionTitle: {
    fontSize: '12px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    textAlign: 'left',
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    height: '16px',
    border: 'none',
    borderRadius: '3px',
    backgroundColor: 'transparent',
    color: colors.textMuted,
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    transition: 'opacity 150ms ease',
  },
};
