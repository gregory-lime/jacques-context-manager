import type { ConversationMessage, AgentProgressContent } from '../../types';
import { colors } from '../../styles/theme';

interface SubagentNavigatorProps {
  messages: ConversationMessage[];
  currentIndex: number;
  onNavigate: (messageIndex: number, contentIndex?: number, contentId?: string) => void;
}

interface SubagentInfo {
  agentId: string;
  agentType?: string;
  prompt?: string;
  messageIndex: number;
  contentIndex: number;
}

/**
 * Get icon and color for agent type
 */
function getAgentTypeStyle(agentType?: string): { icon: string; color: string; label: string } {
  switch (agentType?.toLowerCase()) {
    case 'explore':
      return { icon: '🔍', color: '#60A5FA', label: 'Explore' };
    case 'plan':
      return { icon: '📋', color: '#34D399', label: 'Plan' };
    case 'general-purpose':
      return { icon: '🤖', color: '#A78BFA', label: 'General' };
    case 'bash':
      return { icon: '💻', color: '#F472B6', label: 'Bash' };
    default:
      return { icon: '🤖', color: '#9CA3AF', label: agentType || 'Agent' };
  }
}

export function SubagentNavigator({
  messages,
  currentIndex,
  onNavigate,
}: SubagentNavigatorProps) {
  // Extract all subagents from messages
  const subagents: SubagentInfo[] = [];

  messages.forEach((msg, msgIndex) => {
    if (msg.role === 'assistant') {
      msg.content.forEach((content, contentIdx) => {
        if (content.type === 'agent_progress') {
          const agentContent = content as AgentProgressContent;
          if (agentContent.agentId) {
            subagents.push({
              agentId: agentContent.agentId,
              agentType: agentContent.agentType,
              prompt: agentContent.prompt,
              messageIndex: msgIndex,
              contentIndex: contentIdx,
            });
          }
        }
      });
    }
  });

  if (subagents.length === 0) {
    return null;
  }

  // Group by agent type
  const byType = new Map<string, SubagentInfo[]>();
  for (const agent of subagents) {
    const type = agent.agentType || 'unknown';
    const list = byType.get(type) || [];
    list.push(agent);
    byType.set(type, list);
  }

  // Sort types: Explore first, then Plan, then others
  const typeOrder = ['explore', 'plan', 'general-purpose', 'bash'];
  const sortedTypes = Array.from(byType.keys()).sort((a, b) => {
    const aIdx = typeOrder.indexOf(a.toLowerCase());
    const bIdx = typeOrder.indexOf(b.toLowerCase());
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  // Find which agent is currently active (closest to current scroll position)
  const findActiveAgent = () => {
    for (let i = subagents.length - 1; i >= 0; i--) {
      if (subagents[i].messageIndex <= currentIndex) {
        return subagents[i].agentId;
      }
    }
    return subagents[0]?.agentId;
  };

  const activeAgentId = findActiveAgent();

  return (
    <div style={styles.container}>
      <div style={styles.header}>Subagents ({subagents.length})</div>
      <div style={styles.list}>
        {sortedTypes.map((type) => {
          const agents = byType.get(type) || [];
          const typeStyle = getAgentTypeStyle(type);

          return (
            <div key={type} style={styles.typeGroup}>
              <div style={styles.typeHeader}>
                <span style={{ color: typeStyle.color }}>{typeStyle.icon}</span>
                <span style={{ color: typeStyle.color, fontWeight: 500 }}>
                  {typeStyle.label}
                </span>
                <span style={styles.typeCount}>({agents.length})</span>
              </div>
              {agents.map((agent) => {
                const isActive = agent.agentId === activeAgentId;
                const preview = getPromptPreview(agent.prompt);

                return (
                  <button
                    key={agent.agentId}
                    style={{
                      ...styles.item,
                      ...(isActive ? styles.itemActive : {}),
                    }}
                    onClick={() => onNavigate(agent.messageIndex, agent.contentIndex, agent.agentId)}
                    title={agent.prompt}
                    type="button"
                  >
                    <span style={styles.marker}>
                      {isActive ? '▶' : '─'}
                    </span>
                    <span style={styles.preview}>{preview}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getPromptPreview(prompt?: string): string {
  if (!prompt) return 'Agent task';
  const firstLine = prompt.split('\n')[0].trim();
  return firstLine.length > 35 ? firstLine.slice(0, 32) + '...' : firstLine;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    flexShrink: 0,
    borderTop: `1px solid ${colors.borderSubtle}`,
  },
  header: {
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: colors.textSecondary,
    borderBottom: `1px solid ${colors.borderSubtle}`,
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  typeGroup: {
    marginBottom: '12px',
  },
  typeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
  },
  typeCount: {
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '6px 8px',
    border: 'none',
    backgroundColor: 'transparent',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    color: colors.textMuted,
    fontSize: '11px',
    transition: 'all 150ms ease',
    marginLeft: '8px',
  },
  itemActive: {
    backgroundColor: colors.bgElevated,
    color: colors.accent,
  },
  marker: {
    fontSize: '10px',
    flexShrink: 0,
  },
  preview: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
};
