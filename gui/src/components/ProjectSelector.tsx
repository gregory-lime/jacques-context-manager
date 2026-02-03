import { useState, useMemo } from 'react';
import { colors } from '../styles/theme';
import type { Session } from '../types';

export interface ProjectInfo {
  name: string;
  sessionCount: number;
  isActive: boolean; // Has running sessions
  lastActivity?: number;
}

interface ProjectSelectorProps {
  sessions: Session[];
  archivedProjects?: string[]; // Projects with saved conversations but no active sessions
  selectedProject: string | null; // null = "All Projects"
  onSelectProject: (project: string | null) => void;
}

export function ProjectSelector({
  sessions,
  archivedProjects = [],
  selectedProject,
  onSelectProject,
}: ProjectSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Derive active projects from sessions
  const projects = useMemo(() => {
    const projectMap = new Map<string, ProjectInfo>();

    // Group sessions by project
    sessions.forEach((session) => {
      const name = session.project || 'unknown';
      const existing = projectMap.get(name);

      if (existing) {
        existing.sessionCount++;
        existing.lastActivity = Math.max(
          existing.lastActivity || 0,
          session.last_activity
        );
      } else {
        projectMap.set(name, {
          name,
          sessionCount: 1,
          isActive: true,
          lastActivity: session.last_activity,
        });
      }
    });

    // Add archived projects (no active sessions)
    archivedProjects.forEach((name) => {
      if (!projectMap.has(name)) {
        projectMap.set(name, {
          name,
          sessionCount: 0,
          isActive: false,
        });
      }
    });

    // Sort: active first (by last activity), then archived alphabetically
    return Array.from(projectMap.values()).sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      if (a.isActive && b.isActive) {
        return (b.lastActivity || 0) - (a.lastActivity || 0);
      }
      return a.name.localeCompare(b.name);
    });
  }, [sessions, archivedProjects]);

  const activeCount = projects.filter((p) => p.isActive).length;
  const totalSessions = sessions.length;

  // Current scope display
  const scopeLabel = selectedProject || 'All Projects';
  const scopeCount = selectedProject
    ? projects.find((p) => p.name === selectedProject)?.sessionCount || 0
    : totalSessions;

  const handleProjectClick = (projectName: string | null) => {
    onSelectProject(projectName);
    setIsExpanded(false);
  };

  return (
    <div style={styles.container}>
      {/* Collapsed scope indicator */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        style={styles.scopeButton}
        aria-expanded={isExpanded}
        aria-haspopup="listbox"
      >
        <div style={styles.scopeContent}>
          <span style={styles.chevron}>{isExpanded ? '▾' : '▸'}</span>
          <span style={styles.scopeLabel}>{scopeLabel}</span>
        </div>
        <span style={styles.scopeCount}>
          {scopeCount > 0 && (
            <span style={styles.countBadge}>{scopeCount}</span>
          )}
        </span>
      </button>

      {/* Expanded project list */}
      {isExpanded && (
        <div style={styles.dropdown}>
          {/* All Projects option */}
          <button
            type="button"
            onClick={() => handleProjectClick(null)}
            style={{
              ...styles.projectItem,
              ...(selectedProject === null ? styles.projectItemSelected : {}),
            }}
          >
            <span style={styles.projectIndicator}>
              {selectedProject === null ? '◉' : '○'}
            </span>
            <span style={styles.projectName}>All Projects</span>
            <span style={styles.sessionBadge}>{totalSessions}</span>
          </button>

          {/* Divider */}
          {projects.length > 0 && <div style={styles.divider} />}

          {/* Active projects section */}
          {activeCount > 0 && (
            <>
              <div style={styles.sectionLabel}>ACTIVE</div>
              {projects
                .filter((p) => p.isActive)
                .map((project) => (
                  <button
                    key={project.name}
                    type="button"
                    onClick={() => handleProjectClick(project.name)}
                    style={{
                      ...styles.projectItem,
                      ...(selectedProject === project.name
                        ? styles.projectItemSelected
                        : {}),
                    }}
                  >
                    <span
                      style={{
                        ...styles.projectIndicator,
                        color: colors.success,
                      }}
                    >
                      ●
                    </span>
                    <span style={styles.projectName}>{project.name}</span>
                    <span style={styles.sessionBadge}>
                      {project.sessionCount}
                    </span>
                  </button>
                ))}
            </>
          )}

          {/* Archived projects section */}
          {projects.some((p) => !p.isActive) && (
            <>
              <div style={{ ...styles.sectionLabel, marginTop: '8px' }}>
                ARCHIVED
              </div>
              {projects
                .filter((p) => !p.isActive)
                .map((project) => (
                  <button
                    key={project.name}
                    type="button"
                    onClick={() => handleProjectClick(project.name)}
                    style={{
                      ...styles.projectItem,
                      ...(selectedProject === project.name
                        ? styles.projectItemSelected
                        : {}),
                    }}
                  >
                    <span style={styles.projectIndicator}>○</span>
                    <span
                      style={{
                        ...styles.projectName,
                        color: colors.textMuted,
                      }}
                    >
                      {project.name}
                    </span>
                  </button>
                ))}
            </>
          )}

          {/* Empty state */}
          {projects.length === 0 && (
            <div style={styles.emptyState}>No projects yet</div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    padding: '0 8px',
    marginBottom: '8px',
  },
  scopeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '10px 12px',
    backgroundColor: colors.bgElevated,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    textAlign: 'left',
  },
  scopeContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
    flex: 1,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: '10px',
    width: '12px',
    flexShrink: 0,
  },
  scopeLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  scopeCount: {
    flexShrink: 0,
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '20px',
    padding: '0 6px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: colors.accent,
    color: colors.bgPrimary,
    borderRadius: '10px',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: '8px',
    right: '8px',
    marginTop: '4px',
    backgroundColor: colors.bgSecondary,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: '6px',
    padding: '6px',
    zIndex: 100,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  projectItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 10px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 100ms ease',
    textAlign: 'left',
  },
  projectItemSelected: {
    backgroundColor: colors.bgElevated,
  },
  projectIndicator: {
    fontSize: '8px',
    width: '16px',
    textAlign: 'center',
    color: colors.textMuted,
    flexShrink: 0,
  },
  projectName: {
    flex: 1,
    fontSize: '13px',
    color: colors.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sessionBadge: {
    fontSize: '11px',
    color: colors.textMuted,
    flexShrink: 0,
  },
  divider: {
    height: '1px',
    backgroundColor: colors.borderSubtle,
    margin: '6px 0',
  },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: colors.textMuted,
    padding: '4px 10px',
    letterSpacing: '0.05em',
  },
  emptyState: {
    padding: '16px',
    textAlign: 'center',
    fontSize: '13px',
    color: colors.textMuted,
  },
};
