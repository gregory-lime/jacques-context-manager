import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import { colors } from '../styles/theme';
import { ProjectSelector } from './ProjectSelector';
import { useJacquesClient } from '../hooks/useJacquesClient';
import { useProjectScope } from '../hooks/useProjectScope.js';
import { getSourcesStatus } from '../api';
import type { SourcesStatus } from '../api';
import { MultiLogPanel } from './MultiLogPanel';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '◉' },
  { path: '/project', label: 'Project', icon: '▸' },
  { path: '/conversations', label: 'Conversations', icon: '▸' },
  { path: '/archive', label: 'Archive', icon: '▸' },
  { path: '/context', label: 'Context', icon: '▸' },
];

export function Layout() {
  const location = useLocation();
  const { sessions, serverLogs, claudeOperations, apiLogs } = useJacquesClient();
  const { selectedProject, setSelectedProject, archivedProjects } = useProjectScope();
  const [sourceStatus, setSourceStatus] = useState<SourcesStatus>({
    obsidian: { connected: false },
    googleDocs: { connected: false },
    notion: { connected: false },
  });

  // Load source status
  useEffect(() => {
    async function loadSourceStatus() {
      try {
        const status = await getSourcesStatus();
        setSourceStatus(status);
      } catch (error) {
        console.error('Failed to load source status:', error);
        // Keep default disconnected state on error
      }
    }
    loadSourceStatus();
  }, [location.pathname]); // Refresh when navigating

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar} id="sidebar">
        {/* Logo/Title */}
        <div style={styles.logoSection}>
          <img
            src="/jacsub.png"
            alt="Jacques"
            style={styles.mascot}
          />
          <span style={styles.logoText}>Jacques</span>
        </div>

        {/* Project Scope Selector */}
        <ProjectSelector
          sessions={sessions}
          archivedProjects={archivedProjects}
          selectedProject={selectedProject}
          onSelectProject={setSelectedProject}
        />

        {/* Navigation */}
        <nav style={styles.nav}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  ...styles.navLink,
                  ...(isActive ? styles.navLinkActive : {}),
                }}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sources Section */}
        <div style={styles.sourcesSection}>
          <Link to="/sources" style={styles.sectionHeaderLink}>
            <div style={styles.sectionHeader}>SOURCES</div>
          </Link>
          <Link
            to="/sources"
            style={{
              ...styles.sourceItem,
              color: sourceStatus.obsidian.connected ? colors.textSecondary : colors.textMuted,
            }}
          >
            <span style={styles.navIcon}>▸</span>
            <span>Obsidian</span>
            <span
              style={{
                ...styles.statusDot,
                color: sourceStatus.obsidian.connected ? colors.success : colors.textMuted,
              }}
            >
              {sourceStatus.obsidian.connected ? '●' : '○'}
            </span>
          </Link>
          <Link
            to="/sources"
            style={{
              ...styles.sourceItem,
              color: sourceStatus.googleDocs.connected ? colors.textSecondary : colors.textMuted,
            }}
          >
            <span style={styles.navIcon}>▸</span>
            <span>Google Docs</span>
            <span
              style={{
                ...styles.statusDot,
                color: sourceStatus.googleDocs.connected ? colors.success : colors.textMuted,
              }}
            >
              {sourceStatus.googleDocs.connected ? '●' : '○'}
            </span>
          </Link>
          <Link
            to="/sources"
            style={{
              ...styles.sourceItem,
              color: sourceStatus.notion.connected ? colors.textSecondary : colors.textMuted,
            }}
          >
            <span style={styles.navIcon}>▸</span>
            <span>Notion</span>
            <span
              style={{
                ...styles.statusDot,
                color: sourceStatus.notion.connected ? colors.success : colors.textMuted,
              }}
            >
              {sourceStatus.notion.connected ? '●' : '○'}
            </span>
          </Link>
        </div>

        {/* Footer */}
        <div style={styles.sidebarFooter}>
          <NavLink
            to="/settings"
            style={{
              ...styles.navLink,
              ...(location.pathname === '/settings' ? styles.navLinkActive : {}),
            }}
          >
            <span style={styles.navIcon}>⚙</span>
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

      {/* Content Area - flex column for main + log panel */}
      <div style={styles.contentArea}>
        {/* Main Content */}
        <main style={styles.main}>
          <Outlet />
        </main>

        {/* Multi-Log Panel */}
        <MultiLogPanel
          serverLogs={serverLogs}
          apiLogs={apiLogs}
          claudeOperations={claudeOperations}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    height: '100vh',
    overflow: 'hidden',
  },
  contentArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
  },
  sidebar: {
    width: '240px',
    backgroundColor: colors.bgSecondary,
    borderRight: `1px solid ${colors.borderSubtle}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 0',
    flexShrink: 0,
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '0 16px 16px',
    borderBottom: `1px solid ${colors.borderSubtle}`,
    marginBottom: '16px',
  },
  mascot: {
    width: '32px',
    height: '32px',
    objectFit: 'contain',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.accent,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '0 8px',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '6px',
    color: colors.textSecondary,
    textDecoration: 'none',
    transition: 'all 150ms ease',
  },
  navLinkActive: {
    backgroundColor: colors.bgElevated,
    color: colors.accent,
  },
  navIcon: {
    width: '16px',
    textAlign: 'center' as const,
  },
  sourcesSection: {
    marginTop: 'auto',
    padding: '16px 8px',
    borderTop: `1px solid ${colors.borderSubtle}`,
  },
  sectionHeader: {
    fontSize: '11px',
    fontWeight: 600,
    color: colors.textMuted,
    padding: '0 12px 8px',
    letterSpacing: '0.05em',
  },
  sectionHeaderLink: {
    textDecoration: 'none',
  },
  sourceItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    color: colors.textSecondary,
    fontSize: '13px',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  statusDot: {
    marginLeft: 'auto',
    color: colors.success,
    fontSize: '8px',
  },
  sidebarFooter: {
    padding: '16px 8px 0',
    borderTop: `1px solid ${colors.borderSubtle}`,
    marginTop: '16px',
  },
  main: {
    flex: 1,
    padding: '24px',
    overflow: 'auto',
    minHeight: 0,
  },
};
