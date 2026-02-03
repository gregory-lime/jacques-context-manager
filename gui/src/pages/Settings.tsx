import { useState, useEffect } from 'react';
import { colors } from '../styles/theme';
import { TerminalPanel, SectionHeader } from '../components/ui';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationCategory } from '../notifications/types';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '../api';

const CATEGORY_LABELS: Record<NotificationCategory, { label: string; description: string }> = {
  context: { label: 'Context thresholds', description: 'Alert at 50%, 70%, 90% usage' },
  operation: { label: 'Large operations', description: 'Claude operations exceeding token threshold' },
  plan: { label: 'Plan creation', description: 'New plan detected in a session' },
  'auto-compact': { label: 'Auto-compact', description: 'Session automatically compacted' },
  handoff: { label: 'Handoff ready', description: 'Handoff file generated for a session' },
};

export function Settings() {
  const {
    settings,
    updateSettings,
    toggleCategory,
  } = useNotifications();

  const [thresholdInput, setThresholdInput] = useState(
    String(settings.largeOperationThreshold),
  );

  // Server-side desktop notification settings
  const [desktopEnabled, setDesktopEnabled] = useState<boolean | null>(null);
  const [desktopLoading, setDesktopLoading] = useState(false);

  // Load server settings on mount
  useEffect(() => {
    getNotificationSettings()
      .then((serverSettings) => {
        setDesktopEnabled(serverSettings.enabled);
      })
      .catch(() => {
        // Server may not be running, that's okay
        setDesktopEnabled(null);
      });
  }, []);

  const handleThresholdBlur = () => {
    const parsed = parseInt(thresholdInput, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      updateSettings({ largeOperationThreshold: parsed });
    } else {
      setThresholdInput(String(settings.largeOperationThreshold));
    }
  };

  const handleToggleDesktop = async () => {
    if (desktopEnabled === null) return;
    setDesktopLoading(true);
    try {
      const updated = await updateNotificationSettings({ enabled: !desktopEnabled });
      setDesktopEnabled(updated.enabled);
    } catch {
      // revert on error
    } finally {
      setDesktopLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <SectionHeader title="Settings" />
      <p style={styles.description}>
        Configure Jacques preferences and integrations.
      </p>

      {/* Notification Settings */}
      <TerminalPanel title="notifications.json" showDots={true}>
        <h3 style={styles.sectionTitle}>Notifications</h3>

        {/* Master toggle (in-app) */}
        <div style={styles.setting}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={() => updateSettings({ enabled: !settings.enabled })}
            />
            <span>Enable in-app notifications</span>
          </label>
        </div>

        {/* Desktop notifications toggle (server-side) */}
        <div style={styles.setting}>
          <div style={styles.settingLabel}>Desktop Notifications</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={desktopEnabled === true}
                disabled={desktopEnabled === null || desktopLoading}
                onChange={handleToggleDesktop}
              />
              <span>
                {desktopEnabled === null ? 'Server not connected' : 'Enable desktop notifications'}
              </span>
            </label>
          </div>
          <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
            Desktop notifications appear even when the browser is closed
          </div>
        </div>

        {/* Per-category toggles */}
        <div style={{ ...styles.setting, opacity: settings.enabled ? 1 : 0.4, pointerEvents: settings.enabled ? 'auto' : 'none' }}>
          <div style={styles.settingLabel}>Categories</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map((cat) => (
              <label key={cat} style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={settings.categories[cat]}
                  onChange={() => toggleCategory(cat)}
                />
                <span>{CATEGORY_LABELS[cat].label}</span>
                <span style={styles.radioDescription}>
                  {CATEGORY_LABELS[cat].description}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Token threshold */}
        <div style={{ ...styles.setting, opacity: settings.enabled && settings.categories.operation ? 1 : 0.4, pointerEvents: settings.enabled && settings.categories.operation ? 'auto' : 'none' }}>
          <div style={styles.settingLabel}>Large operation threshold (tokens)</div>
          <input
            type="number"
            min={1000}
            step={5000}
            value={thresholdInput}
            onChange={(e) => setThresholdInput(e.target.value)}
            onBlur={handleThresholdBlur}
            style={styles.numberInput}
          />
        </div>
      </TerminalPanel>

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
  numberInput: {
    width: '120px',
    padding: '6px 8px',
    fontSize: '13px',
    color: colors.textPrimary,
    backgroundColor: colors.bgInput,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: '4px',
    outline: 'none',
  },
};
