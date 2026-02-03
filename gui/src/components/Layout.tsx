import { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  Archive,
  BookOpen,
  Settings,
  Terminal,
} from 'lucide-react';
import { colors } from '../styles/theme';
import { ProjectSelector } from './ProjectSelector';
import { useJacquesClient } from '../hooks/useJacquesClient';
import { useProjectScope } from '../hooks/useProjectScope.js';
import { getSourcesStatus } from '../api';
import type { SourcesStatus } from '../api';
import { MultiLogPanel } from './MultiLogPanel';
import { SectionHeader, ToastContainer, NotificationCenter } from './ui';
import { NotificationProvider } from '../hooks/useNotifications';
import { useSessionBadges } from '../hooks/useSessionBadges';

const navItems = [
  { path: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/project', label: 'Project', Icon: FolderOpen },
  { path: '/conversations', label: 'Conversations', Icon: MessageSquare },
  { path: '/archive', label: 'Archive', Icon: Archive },
  { path: '/context', label: 'Context', Icon: BookOpen },
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

  // Session badges for notification detection (plan count, auto-compact)
  const sessionIds = sessions.map(s => s.session_id);
  const { badges } = useSessionBadges(sessionIds);

  const [showLogs, setShowLogs] = useState(() => {
    const saved = localStorage.getItem('jacques-show-logs');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('jacques-show-logs', String(showLogs));
  }, [showLogs]);

  // Load source status
  useEffect(() => {
    async function loadSourceStatus() {
      try {
        const status = await getSourcesStatus();
        setSourceStatus(status);
      } catch (error) {
        console.error('Failed to load source status:', error);
      }
    }
    loadSourceStatus();
  }, [location.pathname]);

  return (
    <NotificationProvider
      sessions={sessions}
      claudeOperations={claudeOperations}
      badges={badges}
    >
    <div style={styles.container}>
      <ToastContainer />
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

        {/* Block art separator */}
        <div style={styles.blockSeparator}>
          <div style={{
            height: '1px',
            background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)`,
          }} />
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
                {isActive && <span style={styles.activeIndicator} />}
                <item.Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sources Section */}
        <div style={styles.sourcesSection}>
          <Link to="/sources" style={styles.sectionHeaderLink}>
            <SectionHeader title="Sources" accentColor={colors.accent} />
          </Link>
          {[
            { key: 'obsidian' as const, label: 'Obsidian' },
            { key: 'googleDocs' as const, label: 'Google Docs' },
            { key: 'notion' as const, label: 'Notion' },
          ].map(({ key, label }) => (
            <Link
              key={key}
              to="/sources"
              style={{
                ...styles.sourceItem,
                color: sourceStatus[key].connected ? colors.textSecondary : colors.textMuted,
              }}
            >
              <span>{label}</span>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: sourceStatus[key].connected ? colors.success : colors.textMuted,
                  opacity: sourceStatus[key].connected ? 1 : 0.4,
                  marginLeft: 'auto',
                  flexShrink: 0,
                }}
              />
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div style={styles.sidebarFooter}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <NavLink
              to="/settings"
              style={{
                ...styles.navLink,
                ...(location.pathname === '/settings' ? styles.navLinkActive : {}),
                flex: 1,
              }}
            >
              {location.pathname === '/settings' && <span style={styles.activeIndicator} />}
              <Settings size={16} style={{ flexShrink: 0, opacity: location.pathname === '/settings' ? 1 : 0.6 }} />
              <span>Settings</span>
            </NavLink>

            <NotificationCenter />

            <button
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, border: 'none', borderRadius: '6px',
                cursor: 'pointer', transition: 'all 150ms ease', flexShrink: 0,
                backgroundColor: showLogs ? colors.bgElevated : 'transparent',
                color: showLogs ? colors.accent : colors.textMuted,
              }}
              onClick={() => setShowLogs(s => !s)}
              title={showLogs ? 'Hide logs' : 'Show logs'}
            >
              <Terminal size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Content Area */}
      <div style={styles.contentArea}>
        <main style={styles.main}>
          <Outlet />
        </main>

        {showLogs && (
          <MultiLogPanel
            serverLogs={serverLogs}
            apiLogs={apiLogs}
            claudeOperations={claudeOperations}
          />
        )}
      </div>
    </div>
    </NotificationProvider>
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
    position: 'relative',
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
    padding: '0 16px 12px',
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
  blockSeparator: {
    padding: '0 16px 16px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '0 8px',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: '6px',
    color: colors.textSecondary,
    textDecoration: 'none',
    transition: 'all 150ms ease',
    fontSize: '13px',
    position: 'relative' as const,
  },
  navLinkActive: {
    backgroundColor: colors.bgElevated,
    color: colors.accent,
  },
  activeIndicator: {
    position: 'absolute' as const,
    left: '-8px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '2px',
    height: '16px',
    backgroundColor: colors.accent,
    borderRadius: '0 2px 2px 0',
  },
  sourcesSection: {
    marginTop: 'auto',
    padding: '16px 8px 0',
    borderTop: `1px solid ${colors.borderSubtle}`,
  },
  sectionHeaderLink: {
    textDecoration: 'none',
    display: 'block',
    padding: '0 12px',
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
    borderRadius: '4px',
    transition: 'background-color 150ms ease',
  },
  sidebarFooter: {
    padding: '12px 8px 0',
    borderTop: `1px solid ${colors.borderSubtle}`,
    marginTop: '16px',
  },
  main: {
    flex: 1,
    padding: 0,
    overflow: 'auto',
    minHeight: 0,
  },
};
