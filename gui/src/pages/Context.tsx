import { colors } from '../styles/theme';

export function Context() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Context</h1>
      <p style={styles.description}>
        Manage context files for your current project.
      </p>

      <div style={styles.placeholder}>
        <span style={styles.icon}>📁</span>
        <p>Context management coming soon</p>
        <p style={styles.hint}>
          Add and manage context files from Obsidian, local files,
          and other sources.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: colors.textPrimary,
    marginBottom: '8px',
  },
  description: {
    fontSize: '14px',
    color: colors.textSecondary,
    marginBottom: '24px',
  },
  placeholder: {
    padding: '64px',
    textAlign: 'center' as const,
    backgroundColor: colors.bgSecondary,
    borderRadius: '8px',
    border: `1px dashed ${colors.borderSubtle}`,
    color: colors.textMuted,
  },
  icon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  hint: {
    fontSize: '13px',
    marginTop: '8px',
    maxWidth: '400px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
};
