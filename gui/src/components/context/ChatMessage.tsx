/**
 * ChatMessage - Renders a single chat message (user or assistant)
 */

import { colors } from '../../styles/theme';
import { MarkdownRenderer } from '../Conversation/MarkdownRenderer';
import type { ChatMessage as ChatMessageType } from '../../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div style={{
      ...styles.container,
      alignItems: isUser ? 'flex-end' : 'flex-start',
    }}>
      <div style={{
        ...styles.bubble,
        backgroundColor: isUser ? colors.bgElevated : 'transparent',
        maxWidth: isUser ? '85%' : '100%',
        border: isUser ? `1px solid ${colors.borderSubtle}` : 'none',
      }}>
        <div style={{
          ...styles.roleLabel,
          color: isUser ? colors.accent : colors.textSecondary,
        }}>
          {isUser ? 'You' : 'Claude'}
        </div>
        {isUser ? (
          <div style={styles.userText}>{message.content}</div>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
        {message.tools && message.tools.length > 0 && (
          <div style={styles.toolsBar}>
            {message.tools.map((tool, i) => (
              <span key={i} style={styles.toolBadge}>{tool}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: '4px 0',
  },
  bubble: {
    borderRadius: '8px',
    padding: '10px 14px',
  },
  roleLabel: {
    fontSize: '11px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  userText: {
    fontSize: '14px',
    color: colors.textPrimary,
    whiteSpace: 'pre-wrap' as const,
    lineHeight: 1.5,
  },
  toolsBar: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: `1px solid ${colors.borderSubtle}`,
  },
  toolBadge: {
    display: 'inline-flex',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 500,
    color: colors.textMuted,
    backgroundColor: colors.bgInput,
    fontFamily: "'JetBrains Mono', monospace",
  },
};
