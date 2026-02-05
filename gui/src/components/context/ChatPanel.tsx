/**
 * ChatPanel - Main chat area for the context catalog
 *
 * Shows message history, streaming indicator, suggestion chips,
 * and chat input. Handles empty states.
 */

import { useEffect, useRef } from 'react';
import { MessageSquare, Loader } from 'lucide-react';
import { colors } from '../../styles/theme';
import { MarkdownRenderer } from '../Conversation/MarkdownRenderer';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SuggestionChips } from './SuggestionChips';
import type { ChatMessage as ChatMessageType, ProjectCatalog } from '../../types';

interface ChatPanelProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  currentStreamText: string;
  currentTools: string[];
  catalog: ProjectCatalog | null;
  error: string | null;
  projectSelected: boolean;
  onSend: (text: string) => void;
  onAbort: () => void;
}

export function ChatPanel({
  messages,
  isStreaming,
  currentStreamText,
  currentTools,
  catalog,
  error,
  projectSelected,
  onSend,
  onAbort,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  // Auto-scroll to bottom when new messages arrive or streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStreamText]);

  // No project selected
  if (!projectSelected) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <MessageSquare size={32} color={colors.textMuted} />
          <h3 style={styles.emptyTitle}>Select a project</h3>
          <p style={styles.emptyDescription}>
            Choose a project from the sidebar to view its context catalog and start chatting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Messages area */}
      <div ref={scrollRef} style={styles.messagesArea}>
        {!hasMessages && !isStreaming ? (
          // Welcome state
          <div style={styles.welcomeState}>
            <MessageSquare size={24} color={colors.accent} />
            <h3 style={styles.welcomeTitle}>Context Chat</h3>
            <p style={styles.welcomeDescription}>
              Ask questions about your project context, create notes, or get help organizing your knowledge base.
            </p>
          </div>
        ) : (
          // Message list
          <>
            {messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} />
            ))}

            {/* Streaming indicator */}
            {isStreaming && (
              <div style={styles.streamingContainer}>
                <div style={styles.roleLabel}>Claude</div>
                {currentStreamText ? (
                  <MarkdownRenderer content={currentStreamText} />
                ) : (
                  <div style={styles.thinkingRow}>
                    <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>
                      {currentTools.length > 0
                        ? `Using ${currentTools[currentTools.length - 1]}...`
                        : 'Thinking...'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Error display */}
        {error && (
          <div style={styles.errorBar}>
            {error}
          </div>
        )}
      </div>

      {/* Bottom area: suggestions + input */}
      <div style={styles.inputArea}>
        {!hasMessages && !isStreaming && (
          <SuggestionChips catalog={catalog} onSelect={onSend} />
        )}
        <ChatInput
          onSend={onSend}
          onAbort={onAbort}
          isStreaming={isStreaming}
          disabled={!projectSelected}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    height: '100%',
    overflow: 'hidden',
  },
  messagesArea: {
    flex: 1,
    overflow: 'auto',
    padding: '16px 20px',
    minHeight: 0,
  },
  inputArea: {
    padding: '12px 20px 16px',
    borderTop: `1px solid ${colors.borderSubtle}`,
    flexShrink: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '12px',
    padding: '40px',
    textAlign: 'center' as const,
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.textPrimary,
    margin: 0,
  },
  emptyDescription: {
    fontSize: '13px',
    color: colors.textMuted,
    margin: 0,
    maxWidth: '400px',
    lineHeight: 1.5,
  },
  welcomeState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '10px',
    padding: '40px',
    textAlign: 'center' as const,
  },
  welcomeTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.textPrimary,
    margin: 0,
  },
  welcomeDescription: {
    fontSize: '13px',
    color: colors.textSecondary,
    margin: 0,
    maxWidth: '360px',
    lineHeight: 1.5,
  },
  streamingContainer: {
    padding: '10px 14px',
  },
  roleLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: '4px',
  },
  thinkingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: colors.textMuted,
  },
  errorBar: {
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: colors.danger,
    fontSize: '12px',
    marginTop: '8px',
  },
};
