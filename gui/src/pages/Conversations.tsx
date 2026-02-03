import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { colors } from '../styles/theme';
import { ConversationViewer } from '../components/Conversation';
import { TerminalPanel, Badge, SectionHeader, EmptyState } from '../components/ui';
import type { SavedConversation } from '../types';

// Mock data for demonstration
const MOCK_CONVERSATIONS: SavedConversation[] = [
  {
    id: '1',
    title: 'Implementing GUI for Jacques',
    project: 'jacques-context-manager',
    date: '2026-01-31',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        timestamp: Date.now() - 3600000,
        content: [
          {
            type: 'text',
            text: 'Can you help me create a GUI for Jacques? I want a web-based interface that shows real-time session monitoring.',
          },
        ],
      },
      {
        id: 'msg-2',
        role: 'assistant',
        timestamp: Date.now() - 3500000,
        content: [
          {
            type: 'thinking',
            text: 'The user wants to create a GUI for Jacques. This will need:\n1. A React frontend\n2. WebSocket connection to the server\n3. Real-time session display\n4. Conversation viewer\n\nLet me plan the implementation...',
          },
          {
            type: 'text',
            text: "I'll help you create a GUI for Jacques. Let me first explore the existing codebase to understand the structure.",
          },
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'Read',
            input: { file_path: '/Users/gole/Desktop/jacques-context-manager/package.json' },
          },
        ],
      },
      {
        id: 'msg-3',
        role: 'assistant',
        timestamp: Date.now() - 3400000,
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool-1',
            content: '{\n  "name": "jacques-context-manager",\n  "version": "0.1.0",\n  ...\n}',
          },
          {
            type: 'text',
            text: "Based on the project structure, I'll create a Vite + React GUI that connects to the existing WebSocket server. Here's my plan:\n\n1. Create a new `gui/` package\n2. Set up React with TypeScript\n3. Implement real-time session monitoring\n4. Add conversation viewer",
          },
          {
            type: 'code',
            language: 'typescript',
            code: `// Example session card component
function SessionCard({ session }: { session: Session }) {
  return (
    <div className="session-card">
      <h3>{session.project}</h3>
      <ContextMeter metrics={session.context_metrics} />
    </div>
  );
}`,
          },
        ],
      },
      {
        id: 'msg-4',
        role: 'user',
        timestamp: Date.now() - 3300000,
        content: [
          {
            type: 'text',
            text: 'That looks great! Can you also add a conversation viewer that shows collapsible tool calls?',
          },
        ],
      },
      {
        id: 'msg-5',
        role: 'assistant',
        timestamp: Date.now() - 3200000,
        content: [
          {
            type: 'text',
            text: "Absolutely! I'll implement a conversation viewer with:\n\n- Collapsible thinking blocks (collapsed by default)\n- Collapsible tool calls showing file paths\n- Code blocks with syntax highlighting and copy button\n- Question navigator for jumping between user messages\n\nLet me create the components...",
          },
          {
            type: 'tool_use',
            id: 'tool-2',
            name: 'Write',
            input: { file_path: '/gui/src/components/Conversation/ConversationViewer.tsx', content: '...' },
          },
        ],
      },
    ],
    metadata: {
      messageCount: 5,
      toolCallCount: 2,
      estimatedTokens: 2500,
      technologies: ['react', 'typescript', 'vite'],
      filesModified: ['gui/package.json', 'gui/src/App.tsx'],
    },
  },
];

export function Conversations() {
  const [selectedConversation, setSelectedConversation] = useState<SavedConversation | null>(null);

  if (selectedConversation) {
    return (
      <ConversationViewer
        conversation={selectedConversation}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  return (
    <div style={styles.container}>
      <SectionHeader title="Conversations" />
      <p style={styles.description}>
        Browse and view saved conversations from your Claude Code sessions.
      </p>

      {MOCK_CONVERSATIONS.length === 0 ? (
        <TerminalPanel title="conversations" showDots={true}>
          <EmptyState
            icon={MessageSquare}
            title="No saved conversations yet"
            description="Use the dashboard to save conversations from your Claude Code sessions."
          />
        </TerminalPanel>
      ) : (
        <TerminalPanel title="conversations" showDots={true} noPadding={true}>
          {MOCK_CONVERSATIONS.map((conv, index) => (
            <button
              key={conv.id}
              style={styles.conversationCard}
              onClick={() => setSelectedConversation(conv)}
              type="button"
            >
              <div style={styles.cardRow}>
                <span style={styles.lineNum}>{index + 1}</span>
                <div style={styles.cardContent}>
                  <div style={styles.cardHeader}>
                    <span style={styles.cardTitle}>{conv.title}</span>
                    <span style={styles.cardDate}>{conv.date}</span>
                  </div>
                  <div style={styles.cardMeta}>
                    <Badge label={conv.project} variant="default" />
                    <Badge label={`${conv.metadata.messageCount} messages`} variant="default" />
                    <Badge label={`${conv.metadata.toolCallCount} tool calls`} variant="default" />
                  </div>
                  {conv.metadata.technologies && (
                    <div style={styles.cardTags}>
                      {conv.metadata.technologies.map((tech) => (
                        <Badge key={tech} label={tech} variant="default" />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </TerminalPanel>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    padding: '24px',
  },
  description: {
    fontSize: '14px',
    color: colors.textSecondary,
    marginBottom: '24px',
  },
  conversationCard: {
    display: 'block',
    width: '100%',
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: `1px solid ${colors.borderSubtle}`,
    textAlign: 'left' as const,
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
  },
  cardRow: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '16px',
  },
  lineNum: {
    width: '32px',
    fontSize: '11px',
    color: colors.textMuted,
    opacity: 0.4,
    textAlign: 'right' as const,
    paddingRight: '12px',
    flexShrink: 0,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    paddingTop: '2px',
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: colors.textPrimary,
  },
  cardDate: {
    fontSize: '12px',
    color: colors.textMuted,
  },
  cardMeta: {
    display: 'flex',
    gap: '6px',
    marginBottom: '8px',
    flexWrap: 'wrap' as const,
  },
  cardTags: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
};
