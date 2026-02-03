import { colors } from '../styles/theme';
import { TerminalPanel, SectionHeader } from '../components/ui';

export function Settings() {
  return (
    <div style={styles.container}>
      <SectionHeader title="Settings" />
      <p style={styles.description}>
        Configure Jacques preferences and integrations.
      </p>

      {/* Archive Settings */}
      <TerminalPanel title="settings.json" showDots={true}>
        <h3 style={styles.sectionTitle}>Archive Settings</h3>

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
      </TerminalPanel>

      {/* Sources */}
      <TerminalPanel title="sources.json" showDots={true}>
        <h3 style={styles.sectionTitle}>Sources</h3>
        <div style={styles.placeholder}>
          Source configuration coming soon
        </div>
      </TerminalPanel>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  description: {
    fontSize: '14px',
    color: colors.textSecondary,
    marginBottom: '8px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.textPrimary,
    marginBottom: '16px',
    margin: '0 0 16px 0',
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
