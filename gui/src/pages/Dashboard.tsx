import { useMemo, useState } from 'react';
import { Terminal } from 'lucide-react';
import { useJacquesClient } from '../hooks/useJacquesClient';
import { useProjectScope } from '../hooks/useProjectScope.js';
import { useSessionBadges } from '../hooks/useSessionBadges';
import { SessionCard } from '../components/SessionCard';
import { ActiveSessionViewer } from '../components/ActiveSessionViewer';
import { SectionHeader, Badge, EmptyState } from '../components/ui';
import { colors } from '../styles/theme';
import type { Session } from '../types';

export function Dashboard() {
  const { sessions, focusedSessionId, connected, focusTerminal } = useJacquesClient();
  const { selectedProject, filterSessions } = useProjectScope();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const filteredSessions = useMemo(
    () => {
      const filtered = filterSessions(sessions);
      // Pin focused session first, rest by registration time (stable order)
      return [...filtered].sort((a, b) => {
        if (a.session_id === focusedSessionId) return -1;
        if (b.session_id === focusedSessionId) return 1;
        return a.registered_at - b.registered_at;
      });
    },
    [sessions, filterSessions, focusedSessionId]
  );

  const sessionIds = useMemo(
    () => filteredSessions.map((s) => s.session_id),
    [filteredSessions]
  );

  const { badges } = useSessionBadges(sessionIds);

  const handleSessionClick = (session: Session) => {
    setSelectedSession(session);
  };

  const handlePlanClick = (session: Session) => {
    setSelectedSession(session);
  };

  const handleAgentClick = (session: Session) => {
    setSelectedSession(session);
  };

  const handleBack = () => {
    setSelectedSession(null);
  };

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
          <SectionHeader
            title={`Active Sessions (${filteredSessions.length})`}
            action={
              selectedProject && sessions.length !== filteredSessions.length ? (
                <span style={styles.totalCount}>of {sessions.length} total</span>
              ) : undefined
            }
          />
          {selectedProject && (
            <span style={styles.scopeIndicator}>
              Filtered by: {selectedProject}
            </span>
          )}
        </div>
        <Badge
          label={connected ? 'Connected' : 'Disconnected'}
          variant={connected ? 'live' : 'default'}
        />
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <EmptyState
          icon={Terminal}
          title={selectedProject
            ? `No active sessions for ${selectedProject}`
            : 'No active sessions'}
          description={selectedProject
            ? 'Select "All Projects" to see all sessions'
            : 'Start a Claude Code session to see it here'}
        />
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
              onFocusTerminal={() => focusTerminal(session.session_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  scopeIndicator: {
    fontSize: '13px',
    color: colors.accent,
  },
  totalCount: {
    color: colors.textMuted,
    fontWeight: 400,
    fontSize: '11px',
  },
  sessionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
};
