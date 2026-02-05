import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Archive,
  BookOpen,
  Settings,
  Terminal,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { colors } from '../styles/theme';
import { ProjectSelector } from './ProjectSelector';
import { useJacquesClient } from '../hooks/useJacquesClient';
import { useProjectScope } from '../hooks/useProjectScope.js';
import { getSourcesStatus } from '../api';
import type { SourcesStatus } from '../api';
import { MultiLogPanel } from './MultiLogPanel';
import { SidebarSessionList } from './SidebarSessionList';
import { SectionHeader, ToastContainer, NotificationCenter } from './ui';
import { NotificationProvider } from '../hooks/useNotifications';
import { useSessionBadges } from '../hooks/useSessionBadges';
import { useOpenSessions } from '../hooks/useOpenSessions';

const navItems = [
  { path: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/archive', label: 'Archive', Icon: Archive },
  { path: '/context', label: 'Context', Icon: BookOpen },
];

export function Layout() {
  const location = useLocation();
  const { sessions, serverLogs, claudeOperations, apiLogs } = useJacquesClient();
  const { selectedProject, setSelectedProject, archivedProjects } = useProjectScope();
  const { state: openSessionsState, viewDashboard } = useOpenSessions();
  const [sourceStatus, setSourceStatus] = useState<SourcesStatus>({
    obsidian: { connected: false },
    googleDocs: { connected: false },
    notion: { connected: false },
  });

  // Session badges for notification detection (plan count, auto-compact)
  const sessionIds = sessions.map(s => s.session_id);
  const { badges } = useSessionBadges(sessionIds);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('jacques-sidebar-collapsed') === 'true';
  });

  const [showLogs, setShowLogs] = useState(() => {
    const saved = localStorage.getItem('jacques-show-logs');
    return saved !== null ? saved === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('jacques-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

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
      <aside
        style={{
          ...styles.sidebar,
          width: sidebarCollapsed ? '56px' : '240px',
          transition: 'width 200ms ease',
        }}
        id="sidebar"
      >
        {/* Logo/Title */}
        <div style={{
          ...styles.logoSection,
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          padding: sidebarCollapsed ? '0 0 12px' : '0 16px 12px',
        }}>
          <img
            src="/jacsub.png"
            alt="Jacques"
            style={styles.mascot}
          />
          {!sidebarCollapsed && <span style={styles.logoText}>Jacques</span>}
        </div>

        {/* Block art separator */}
        {!sidebarCollapsed && (
          <div style={styles.blockSeparator}>
            <div style={{
              height: '1px',
              background: `linear-gradient(90deg, transparent, ${colors.accent}40, transparent)`,
            }} />
          </div>
        )}

        {/* Project Scope Selector */}
        {!sidebarCollapsed && (
          <ProjectSelector
            sessions={sessions}
            archivedProjects={archivedProjects}
            selectedProject={selectedProject}
            onSelectProject={setSelectedProject}
          />
        )}

        {/* Navigation */}
        <nav style={{
          ...styles.nav,
          padding: sidebarCollapsed ? '0 4px' : '0 8px',
        }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));

            const handleClick = item.path === '/' && isActive && openSessionsState.activeViewId
              ? (e: React.MouseEvent) => {
                  e.preventDefault();
                  viewDashboard();
                }
              : undefined;

            return (
              <React.Fragment key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={handleClick}
                  style={{
                    ...styles.navLink,
                    ...(isActive ? styles.navLinkActive : {}),
                    ...(sidebarCollapsed ? {
                      justifyContent: 'center',
                      padding: '8px',
                      gap: '0',
                    } : {}),
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  {isActive && !sidebarCollapsed && <span style={styles.activeIndicator} />}
                  <item.Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.6 }} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
                {item.path === '/' && !sidebarCollapsed && <SidebarSessionList />}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Sources Section */}
        {!sidebarCollapsed && (
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
        )}

        {/* Footer */}
        <div style={{
          ...styles.sidebarFooter,
          ...(sidebarCollapsed ? { marginTop: 'auto' } : {}),
        }}>
          <div style={{
            display: 'flex',
            alignItems: sidebarCollapsed ? 'center' : 'center',
            gap: '4px',
            flexDirection: sidebarCollapsed ? 'column' : 'row',
          }}>
            {!sidebarCollapsed ? (
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
            ) : (
              <NavLink
                to="/settings"
                style={{
                  ...styles.navLink,
                  ...(location.pathname === '/settings' ? styles.navLinkActive : {}),
                  justifyContent: 'center',
                  padding: '8px',
                }}
                title="Settings"
              >
                <Settings size={16} style={{ flexShrink: 0, opacity: location.pathname === '/settings' ? 1 : 0.6 }} />
              </NavLink>
            )}

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

            <button
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, border: 'none', borderRadius: '6px',
                cursor: 'pointer', transition: 'all 150ms ease', flexShrink: 0,
                backgroundColor: 'transparent',
                color: colors.textMuted,
              }}
              onClick={() => setSidebarCollapsed(c => !c)}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
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
    backgroundColor: colors.bgSecondary,
    borderRight: `1px solid ${colors.borderSubtle}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 0',
    flexShrink: 0,
    overflow: 'hidden',
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
