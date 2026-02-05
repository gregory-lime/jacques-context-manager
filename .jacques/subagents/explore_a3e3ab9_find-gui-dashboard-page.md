# Explore: Find GUI Dashboard page

> Session: `140f7e47-bbca-4654-9982-fe180f5ee2bc`
> Date: 2026-02-03
> Tokens: ~25 963

---

Perfect! I found the Dashboard component. Here are the full details:

**Full Path**: `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Dashboard.tsx`

**Contents**:

```typescript
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
  const { sessions, focusedSessionId, connected } = useJacquesClient();
  const { selectedProject, filterSessions } = useProjectScope();
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const filteredSessions = useMemo(
    () => filterSessions(sessions),
    [sessions, filterSessions]
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
```

**Key Details**:
- This is a page-level component that renders multiple `SessionCard` components
- It uses a responsive CSS Grid layout with auto-fill and minimum 320px width
- The component handles session filtering by project scope
- It manages selected session state and shows the `ActiveSessionViewer` when a session is selected
- SessionCard components are passed props including `session`, `isFocused`, `badges`, and click handlers for session, plan, and agent interactions