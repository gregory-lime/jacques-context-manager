/**
 * CatalogPanel - Left panel showing project context catalog
 *
 * Three collapsible sections: Context Files, Plans, Sessions.
 * Search filter, click-to-open ContentModal, Add Context button.
 */

import { useState } from 'react';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRightIcon,
  Plus,
  BookOpen,
  Clock,
  Loader,
} from 'lucide-react';
import { colors } from '../../styles/theme';
import { SearchInput } from '../ui/SearchInput';
import type { ProjectCatalog, CatalogItem, CatalogPlanEntry, CatalogSessionEntry } from '../../types';

// ─── Type Colors ──────────────────────────────────────────────

const TYPE_COLORS = {
  context: '#E67E52',  // coral
  plan: '#A78BFA',     // purple
  session: '#60A5FA',  // blue
};

// ─── Props ────────────────────────────────────────────────────

interface CatalogPanelProps {
  catalog: ProjectCatalog | null;
  loading: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onItemClick: (type: 'context' | 'plan' | 'session', item: CatalogItem | CatalogPlanEntry | CatalogSessionEntry) => void;
  onAddContext: () => void;
}

// ─── Component ────────────────────────────────────────────────

export function CatalogPanel({
  catalog,
  loading,
  collapsed,
  onToggleCollapse,
  onItemClick,
  onAddContext,
}: CatalogPanelProps) {
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    context: true,
    plans: true,
    sessions: false,
  });

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter items by search
  const filterText = search.toLowerCase();
  const contextItems = catalog?.context.filter(f =>
    f.name.toLowerCase().includes(filterText) ||
    f.description?.toLowerCase().includes(filterText)
  ) ?? [];
  const planItems = catalog?.plans.filter(p =>
    p.title.toLowerCase().includes(filterText)
  ) ?? [];
  const sessionItems = catalog?.sessions.filter(s =>
    s.title.toLowerCase().includes(filterText)
  ) ?? [];

  const totalItems = contextItems.length + planItems.length + sessionItems.length;

  // Collapsed state: icon rail
  if (collapsed) {
    return (
      <div style={styles.collapsedContainer}>
        <button
          style={styles.collapseToggle}
          onClick={onToggleCollapse}
          title="Expand catalog"
        >
          <ChevronRightIcon size={16} />
        </button>
        <div style={styles.collapsedIcons}>
          <div style={{ ...styles.collapsedIcon, color: TYPE_COLORS.context }} title={`${contextItems.length} files`}>
            <FileText size={16} />
          </div>
          <div style={{ ...styles.collapsedIcon, color: TYPE_COLORS.plan }} title={`${planItems.length} plans`}>
            <BookOpen size={16} />
          </div>
          <div style={{ ...styles.collapsedIcon, color: TYPE_COLORS.session }} title={`${sessionItems.length} sessions`}>
            <Clock size={16} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>CATALOG</span>
        <button
          style={styles.collapseToggle}
          onClick={onToggleCollapse}
          title="Collapse catalog"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Filter..."
          resultCount={search ? totalItems : undefined}
        />
      </div>

      {/* Sections */}
      <div style={styles.sectionsContainer}>
        {/* Context Files */}
        <Section
          title={`CONTEXT FILES (${contextItems.length})`}
          color={TYPE_COLORS.context}
          expanded={expandedSections.context}
          onToggle={() => toggleSection('context')}
        >
          {loading && contextItems.length === 0 ? (
            <div style={styles.loadingRow}>
              <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Loading...</span>
            </div>
          ) : contextItems.length === 0 ? (
            <div style={styles.emptyRow}>No context files</div>
          ) : (
            contextItems.map(file => (
              <ItemRow
                key={file.id}
                icon={<FileText size={13} />}
                label={file.name}
                sublabel={file.source}
                color={TYPE_COLORS.context}
                onClick={() => onItemClick('context', file)}
              />
            ))
          )}
        </Section>

        {/* Plans */}
        <Section
          title={`PLANS (${planItems.length})`}
          color={TYPE_COLORS.plan}
          expanded={expandedSections.plans}
          onToggle={() => toggleSection('plans')}
        >
          {planItems.length === 0 ? (
            <div style={styles.emptyRow}>No plans</div>
          ) : (
            planItems.map(plan => (
              <ItemRow
                key={plan.id}
                icon={<BookOpen size={13} />}
                label={plan.title}
                sublabel={`${plan.sessions.length} session${plan.sessions.length !== 1 ? 's' : ''}`}
                color={TYPE_COLORS.plan}
                onClick={() => onItemClick('plan', plan)}
              />
            ))
          )}
        </Section>

        {/* Sessions */}
        <Section
          title={`SESSIONS (${sessionItems.length})`}
          color={TYPE_COLORS.session}
          expanded={expandedSections.sessions}
          onToggle={() => toggleSection('sessions')}
        >
          {sessionItems.length === 0 ? (
            <div style={styles.emptyRow}>No saved sessions</div>
          ) : (
            sessionItems.map(session => (
              <ItemRow
                key={session.id}
                icon={<Clock size={13} />}
                label={session.title}
                sublabel={`${session.messageCount} msgs`}
                color={TYPE_COLORS.session}
                onClick={() => onItemClick('session', session)}
              />
            ))
          )}
        </Section>
      </div>

      {/* Footer: Add Context */}
      <div style={styles.footer}>
        <button style={styles.addButton} onClick={onAddContext}>
          <Plus size={14} />
          <span>Add Context</span>
        </button>
      </div>
    </div>
  );
}

// ─── Section Sub-component ────────────────────────────────────

function Section({
  title,
  color,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.section}>
      <button style={styles.sectionHeader} onClick={onToggle}>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span style={{ ...styles.sectionTitle, color }}>{title}</span>
      </button>
      {expanded && <div style={styles.sectionContent}>{children}</div>}
    </div>
  );
}

// ─── Item Row Sub-component ──────────────────────────────────

function ItemRow({
  icon,
  label,
  sublabel,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button style={styles.itemRow} onClick={onClick}>
      <span style={{ color, flexShrink: 0, display: 'inline-flex' }}>{icon}</span>
      <span style={styles.itemLabel}>{label}</span>
      {sublabel && (
        <span style={styles.itemSublabel}>{sublabel}</span>
      )}
    </button>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '240px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRight: `1px solid ${colors.borderSubtle}`,
    backgroundColor: colors.bgSecondary,
    height: '100%',
    overflow: 'hidden',
  },
  collapsedContainer: {
    width: '48px',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRight: `1px solid ${colors.borderSubtle}`,
    backgroundColor: colors.bgSecondary,
    height: '100%',
    paddingTop: '8px',
    gap: '8px',
  },
  collapsedIcons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingTop: '8px',
  },
  collapsedIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 12px 8px',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: colors.textMuted,
    letterSpacing: '0.5px',
  },
  collapseToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: colors.textMuted,
    cursor: 'pointer',
    transition: 'color 150ms ease',
  },
  searchContainer: {
    padding: '0 8px 8px',
    flexShrink: 0,
  },
  sectionsContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '0 4px',
  },
  section: {
    marginBottom: '4px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    width: '100%',
    padding: '6px 8px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: colors.textMuted,
    cursor: 'pointer',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.3px',
    textAlign: 'left' as const,
    transition: 'background-color 150ms ease',
  },
  sectionTitle: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.3px',
  },
  sectionContent: {
    paddingLeft: '4px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '5px 8px 5px 12px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: colors.textPrimary,
    cursor: 'pointer',
    fontSize: '12px',
    textAlign: 'left' as const,
    transition: 'background-color 150ms ease',
    overflow: 'hidden',
  },
  itemLabel: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    fontSize: '12px',
  },
  itemSublabel: {
    fontSize: '10px',
    color: colors.textMuted,
    flexShrink: 0,
  },
  emptyRow: {
    padding: '8px 12px',
    fontSize: '11px',
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    fontSize: '11px',
    color: colors.textMuted,
  },
  footer: {
    padding: '8px',
    borderTop: `1px solid ${colors.borderSubtle}`,
    flexShrink: 0,
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '8px',
    border: `1px dashed ${colors.borderSubtle}`,
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 150ms ease',
  },
};
