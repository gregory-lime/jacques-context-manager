import { useMemo, useState } from 'react';
import { useJacquesClient } from '../hooks/useJacquesClient';
import { useProjectScope } from '../hooks/useProjectScope.js';
import { useSessionBadges } from '../hooks/useSessionBadges';
import { SessionCard } from '../components/SessionCard';
import { ActiveSessionViewer } from '../components/ActiveSessionViewer';
import { colors } from '../styles/theme';
import type { Session } from '../types';

export function Dashboard() {
  const { sessions, focusedSessionId, connected } = useJacquesClient();
  const { selectedProject, filterSessions } = useProjectScope();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Filter sessions based on selected project scope
  const filteredSessions = useMemo(
    () => filterSessions(sessions),
    [sessions, filterSessions]
  );

  // Get session IDs for badge fetching
  const sessionIds = useMemo(
    () => filteredSessions.map((s) => s.session_id),
    [filteredSessions]
  );

  // Fetch badges for all visible sessions
  const { badges } = useSessionBadges(sessionIds);

  // Handle session card click
  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
  };

  // Handle plan badge click - open session viewer (plans are shown in navigator)
  const handlePlanClick = (session: Session) => {
    setSelectedSession(session);
  };

  // Handle agent badge click - open session viewer (agents are shown in navigator)
  const handleAgentClick = (session: Session) => {
    setSelectedSession(session);
  };

  // Handle back from session viewer
  const handleBack = () => {
    setSelectedSession(null);
  };

  // If viewing a session, show the viewer
  if (selectedSession) {
    return (
      <ActiveSessionViewer
        sessionId={selectedSession.session_id}
        onBack={handleBack}
      />
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard</h1>
          {selectedProject && (
            <span style={styles.scopeIndicator}>
              Filtered by: {selectedProject}
            </span>
          )}
        </div>
        <div style={styles.connectionStatus}>
          <span style={{
            ...styles.statusDot,
            backgroundColor: connected ? colors.success : colors.danger,
          }} />
          <span style={{ color: colors.textSecondary }}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Sessions Grid */}
      <div style={styles.sessionsSection}>
        <h2 style={styles.sectionTitle}>
          Active Sessions ({filteredSessions.length})
          {selectedProject && sessions.length !== filteredSessions.length && (
            <span style={styles.totalCount}> of {sessions.length} total</span>
          )}
        </h2>

        {filteredSessions.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              {selectedProject
                ? `No active sessions for ${selectedProject}`
                : 'No active sessions'}
            </p>
            <p style={styles.emptySubtext}>
              {selectedProject
                ? 'Select "All Projects" to see all sessions'
                : 'Start a Claude Code session to see it here'}
            </p>
          </div>
        ) : (
          <div style={styles.sessionsGrid}>
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.session_id}
                session={session}
                isFocused={session.session_id === focusedSessionId}
                badges={badges.get(session.session_id)}
                onClick={() => handleSessionClick(session)}
                onPlanClick={() => handlePlanClick(session)}
                onAgentClick={() => handleAgentClick(session)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: colors.textPrimary,
    marginBottom: '4px',
  },
  scopeIndicator: {
    fontSize: '13px',
    color: colors.accent,
  },
  totalCount: {
    color: colors.textMuted,
    fontWeight: 400,
  },
  connectionStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  sessionsSection: {
    marginTop: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: colors.textSecondary,
    marginBottom: '16px',
  },
  sessionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center' as const,
    backgroundColor: colors.bgSecondary,
    borderRadius: '8px',
    border: `1px solid ${colors.borderSubtle}`,
  },
  emptyText: {
    fontSize: '16px',
    color: colors.textSecondary,
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '14px',
    color: colors.textMuted,
  },
};
