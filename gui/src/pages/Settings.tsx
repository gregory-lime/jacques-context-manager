import { colors } from '../styles/theme';

export function Settings() {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Settings</h1>
      <p style={styles.description}>
        Configure Jacques preferences and integrations.
      </p>

      {/* Archive Settings */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Archive Settings</h2>

        <div style={styles.setting}>
          <div style={styles.settingLabel}>Archive Filter</div>
          <div style={styles.radioGroup}>
            <label style={styles.radioLabel}>
              <input type="radio" name="filter" defaultChecked />
              <span>Without Tools</span>
              <span style={styles.radioDescription}>
                Removes tool calls and results
              </span>
            </label>
            <label style={styles.radioLabel}>
              <input type="radio" name="filter" />
              <span>Everything</span>
              <span style={styles.radioDescription}>
                Full conversation with all data
              </span>
            </label>
            <label style={styles.radioLabel}>
              <input type="radio" name="filter" />
              <span>Messages Only</span>
              <span style={styles.radioDescription}>
                Just user and assistant messages
              </span>
            </label>
          </div>
        </div>

        <div style={styles.setting}>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" />
            <span>Auto-archive on session end</span>
          </label>
        </div>
      </div>

      {/* Sources */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Sources</h2>
        <div style={styles.placeholder}>
          Source configuration coming soon
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
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
    marginBottom: '32px',
  },
  section: {
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: colors.bgSecondary,
    borderRadius: '8px',
    border: `1px solid ${colors.borderSubtle}`,
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: colors.textPrimary,
    marginBottom: '16px',
  },
  setting: {
    marginBottom: '16px',
  },
  settingLabel: {
    fontSize: '14px',
    color: colors.textSecondary,
    marginBottom: '8px',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    color: colors.textPrimary,
  },
  radioDescription: {
    fontSize: '12px',
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    color: colors.textPrimary,
  },
  placeholder: {
    padding: '24px',
    textAlign: 'center' as const,
    backgroundColor: colors.bgElevated,
    borderRadius: '6px',
    color: colors.textMuted,
  },
};
