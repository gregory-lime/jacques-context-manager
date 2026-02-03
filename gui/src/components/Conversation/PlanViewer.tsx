import { useState, useEffect } from 'react';
import { colors } from '../../styles/theme';
import type { PlanInfo } from './PlanNavigator';
import { MarkdownRenderer } from './MarkdownRenderer';

interface PlanViewerProps {
  plan: PlanInfo;
  sessionId: string;
  onClose: () => void;
}

// When served from the same origin, use relative URL
// When in dev mode (Vite), use absolute URL
const API_URL = import.meta.env.DEV ? 'http://localhost:4243/api' : '/api';

interface PlanContent {
  title: string;
  source: 'embedded' | 'write';
  messageIndex: number;
  filePath?: string;
  content: string;
}

export function PlanViewer({ plan, sessionId, onClose }: PlanViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlanContent = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/sessions/${sessionId}/plans/${plan.messageIndex}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError('Plan content not found');
          } else {
            setError(`Failed to load plan: ${response.statusText}`);
          }
          return;
        }

        const data: PlanContent = await response.json();
        setContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    };

    fetchPlanContent();
  }, [sessionId, plan.messageIndex]);

  // Handle keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sourceLabel = plan.source === 'embedded' ? 'Embedded Plan' : 'Written Plan';
  const sourceIcon = plan.source === 'embedded' ? '📋' : '📝';

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleSection}>
            <span style={styles.sourceIcon}>{sourceIcon}</span>
            <div>
              <h2 style={styles.title}>{plan.title}</h2>
              <span style={styles.subtitle}>
                {sourceLabel}
                {plan.filePath && (
                  <span style={styles.filePath}> • {plan.filePath}</span>
                )}
              </span>
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose} type="button">
            ×
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loading && (
            <div style={styles.loading}>
              <span style={styles.spinner}>◐</span>
              Loading plan content...
            </div>
          )}

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          {!loading && !error && content && (
            <div style={styles.planContent}>
              <MarkdownRenderer content={content} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={styles.hint}>Press Escape to close</span>
          <button style={styles.closeButtonSecondary} onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: colors.bgSecondary,
    borderRadius: '12px',
    border: `1px solid ${colors.borderSubtle}`,
    width: '80%',
    maxWidth: '900px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.borderSubtle}`,
  },
  titleSection: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  sourceIcon: {
    fontSize: '24px',
    marginTop: '2px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.textPrimary,
    margin: 0,
    lineHeight: 1.3,
  },
  subtitle: {
    fontSize: '12px',
    color: colors.textMuted,
    marginTop: '4px',
  },
  filePath: {
    fontFamily: 'monospace',
    fontSize: '11px',
  },
  closeButton: {
    padding: '4px 8px',
    fontSize: '24px',
    color: colors.textMuted,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    lineHeight: 1,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
    minHeight: '200px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '48px',
    color: colors.textMuted,
    fontSize: '14px',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
  error: {
    padding: '16px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: `1px solid rgba(239, 68, 68, 0.3)`,
    borderRadius: '8px',
    color: '#EF4444',
    fontSize: '13px',
  },
  planContent: {
    padding: '16px',
    backgroundColor: colors.bgPrimary,
    borderRadius: '8px',
    overflow: 'auto',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: `1px solid ${colors.borderSubtle}`,
  },
  hint: {
    fontSize: '12px',
    color: colors.textMuted,
  },
  closeButtonSecondary: {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: colors.textPrimary,
    backgroundColor: colors.bgElevated,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
