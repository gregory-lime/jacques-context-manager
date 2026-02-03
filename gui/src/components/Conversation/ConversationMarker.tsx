export type MarkerType = 'auto_compact' | 'clear';

interface ConversationMarkerProps {
  type: MarkerType;
  timestamp?: string;
}

export function ConversationMarker({ type, timestamp }: ConversationMarkerProps) {
  const config = markerConfig[type];

  const timeStr = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div style={styles.container}>
      <div style={{ ...styles.line, borderColor: config.color }} />
      <div style={{ ...styles.label, color: config.color, backgroundColor: config.bgColor }}>
        {config.icon} {config.label}
        {timeStr && <span style={styles.time}> • {timeStr}</span>}
      </div>
      <div style={{ ...styles.line, borderColor: config.color }} />
    </div>
  );
}

const markerConfig: Record<MarkerType, { icon: string; label: string; color: string; bgColor: string }> = {
  auto_compact: {
    icon: '⚡',
    label: 'Context Auto-Compacted',
    color: '#f5a623',
    bgColor: 'rgba(245, 166, 35, 0.1)',
  },
  clear: {
    icon: '🔄',
    label: 'Context Cleared',
    color: '#60A5FA',
    bgColor: 'rgba(96, 165, 250, 0.1)',
  },
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '24px 0',
  },
  line: {
    flex: 1,
    height: 0,
    borderTop: '2px dashed',
    opacity: 0.5,
  },
  label: {
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
  },
  time: {
    opacity: 0.7,
  },
};
