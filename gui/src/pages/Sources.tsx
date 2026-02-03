import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../styles/theme';
import { getSourcesStatus, disconnectGoogleDocs, disconnectNotion } from '../api';
import type { SourcesStatus } from '../api';

export function Sources() {
  const [status, setStatus] = useState<SourcesStatus>({
    obsidian: { connected: false },
    googleDocs: { connected: false },
    notion: { connected: false },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStatus() {
      try {
        const sourcesStatus = await getSourcesStatus();
        setStatus(sourcesStatus);
        setError(null);
      } catch (err) {
        console.error('Failed to load source status:', err);
        setError('Could not connect to Jacques server. Make sure jacques is running.');
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, []);

  const handleDisconnect = async (source: 'obsidian' | 'googleDocs' | 'notion') => {
    try {
      if (source === 'googleDocs') {
        await disconnectGoogleDocs();
        setStatus(prev => ({
          ...prev,
          googleDocs: { connected: false },
        }));
      } else if (source === 'notion') {
        await disconnectNotion();
        setStatus(prev => ({
          ...prev,
          notion: { connected: false },
        }));
      }
      // Obsidian disconnect not implemented yet
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Sources</h1>
        <p style={styles.description}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Sources</h1>
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{error}</p>
          <p style={styles.errorHint}>
            Run <code style={styles.code}>jacques</code> in a terminal to start the server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Sources</h1>
      <p style={styles.description}>
        Connect external sources to import context into your projects.
      </p>

      <div style={styles.sourceList}>
        {/* Obsidian */}
        <div style={styles.sourceCard}>
          <div style={styles.sourceHeader}>
            <div style={styles.sourceIcon}>
              <span style={{ fontSize: '24px' }}>O</span>
            </div>
            <div style={styles.sourceInfo}>
              <h3 style={styles.sourceName}>Obsidian</h3>
              <p style={styles.sourceDetail}>
                {status.obsidian.connected
                  ? status.obsidian.detail || 'Connected'
                  : 'Import notes from your Obsidian vault'}
              </p>
            </div>
            <div style={styles.sourceStatus}>
              {status.obsidian.connected ? (
                <span style={styles.connectedBadge}>Connected</span>
              ) : (
                <Link to="/context" style={styles.connectButton}>
                  Configure
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Google Docs */}
        <div style={styles.sourceCard}>
          <div style={styles.sourceHeader}>
            <div style={styles.sourceIcon}>
              <span style={{ fontSize: '24px' }}>G</span>
            </div>
            <div style={styles.sourceInfo}>
              <h3 style={styles.sourceName}>Google Docs</h3>
              <p style={styles.sourceDetail}>
                {status.googleDocs.connected
                  ? status.googleDocs.detail || 'Connected'
                  : 'Import documents from Google Drive'}
              </p>
            </div>
            <div style={styles.sourceStatus}>
              {status.googleDocs.connected ? (
                <div style={styles.connectedActions}>
                  <span style={styles.connectedBadge}>Connected</span>
                  <button
                    style={styles.disconnectButton}
                    onClick={() => handleDisconnect('googleDocs')}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <Link to="/sources/google" style={styles.connectButton}>
                  Connect
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Notion */}
        <div style={styles.sourceCard}>
          <div style={styles.sourceHeader}>
            <div style={styles.sourceIcon}>
              <span style={{ fontSize: '24px' }}>N</span>
            </div>
            <div style={styles.sourceInfo}>
              <h3 style={styles.sourceName}>Notion</h3>
              <p style={styles.sourceDetail}>
                {status.notion.connected
                  ? status.notion.detail || 'Connected'
                  : 'Import pages from your Notion workspace'}
              </p>
            </div>
            <div style={styles.sourceStatus}>
              {status.notion.connected ? (
                <div style={styles.connectedActions}>
                  <span style={styles.connectedBadge}>Connected</span>
                  <button
                    style={styles.disconnectButton}
                    onClick={() => handleDisconnect('notion')}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <Link to="/sources/notion" style={styles.connectButton}>
                  Connect
                </Link>
              )}
            </div>
          </div>
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
    marginBottom: '24px',
  },
  errorBox: {
    backgroundColor: `${colors.danger}15`,
    border: `1px solid ${colors.danger}40`,
    borderRadius: '8px',
    padding: '20px',
  },
  errorText: {
    color: colors.danger,
    fontSize: '14px',
    margin: 0,
  },
  errorHint: {
    color: colors.textSecondary,
    fontSize: '13px',
    marginTop: '8px',
    marginBottom: 0,
  },
  code: {
    backgroundColor: colors.bgInput,
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  sourceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sourceCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: '8px',
    border: `1px solid ${colors.borderSubtle}`,
    padding: '20px',
  },
  sourceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  sourceIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    backgroundColor: colors.bgElevated,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.accent,
    fontWeight: 600,
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: '16px',
    fontWeight: 500,
    color: colors.textPrimary,
    margin: 0,
  },
  sourceDetail: {
    fontSize: '13px',
    color: colors.textSecondary,
    margin: '4px 0 0 0',
  },
  sourceStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  connectedBadge: {
    fontSize: '12px',
    padding: '4px 12px',
    borderRadius: '12px',
    backgroundColor: `${colors.success}20`,
    color: colors.success,
    fontWeight: 500,
  },
  connectedActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  disconnectButton: {
    fontSize: '12px',
    padding: '4px 12px',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: colors.textMuted,
    border: `1px solid ${colors.borderSubtle}`,
    cursor: 'pointer',
  },
  connectButton: {
    fontSize: '13px',
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: colors.accent,
    color: colors.textPrimary,
    textDecoration: 'none',
    fontWeight: 500,
  },
};
