import type { ConversationMessage, ToolUseContent } from '../../types';
import { colors } from '../../styles/theme';

interface PlanNavigatorProps {
  messages: ConversationMessage[];
  currentIndex: number;
  onNavigate: (messageIndex: number, contentIndex?: number, contentId?: string) => void;
  onViewPlan?: (planInfo: PlanInfo) => void;
}

export interface PlanInfo {
  title: string;
  source: 'embedded' | 'write';
  messageIndex: number;
  filePath?: string;
}

interface DetectedPlan {
  title: string;
  source: 'embedded' | 'write';
  messageIndex: number;
  contentIndex?: number;
  filePath?: string;
  preview: string;
}

/**
 * Plan trigger patterns (same as in plan-extractor.ts)
 */
const PLAN_TRIGGER_PATTERNS = [
  /^implement the following plan[:\s]*/i,
  /^here is the plan[:\s]*/i,
  /^follow this plan[:\s]*/i,
];

/**
 * Code file extensions that should NOT be considered plans
 */
const CODE_FILE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift',
  '.c', '.cpp', '.h', '.hpp', '.cs', '.php',
  '.vue', '.svelte', '.astro',
  '.css', '.scss', '.less', '.sass',
  '.html', '.htm', '.xml', '.svg',
  '.json', '.yaml', '.yml', '.toml',
  '.sh', '.bash', '.zsh', '.fish',
  '.sql', '.graphql', '.prisma',
];

/**
 * Check if a file path is a code file (not a plan)
 */
function isCodeFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return CODE_FILE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

/**
 * Check if content looks like a markdown plan (not code)
 */
function looksLikeMarkdownPlan(content: string): boolean {
  // Must have a markdown heading
  if (!content.includes('#')) return false;

  // Should not start with import/export/const/function (code patterns)
  const firstNonEmptyLine = content.split('\n').find(line => line.trim().length > 0) || '';
  const codePatterns = [
    /^import\s+/,
    /^export\s+/,
    /^const\s+/,
    /^let\s+/,
    /^var\s+/,
    /^function\s+/,
    /^class\s+/,
    /^interface\s+/,
    /^type\s+/,
    /^def\s+/,
    /^from\s+.*\s+import/,
    /^package\s+/,
    /^use\s+/,
    /^#include/,
    /^#!\//,
  ];
  if (codePatterns.some(pattern => pattern.test(firstNonEmptyLine.trim()))) {
    return false;
  }

  // Must have reasonable markdown structure
  const hasHeading = /^#+\s+.+/m.test(content);
  const hasListOrParagraph = /^[-*]\s+.+/m.test(content) || content.split('\n\n').length > 1;

  return hasHeading && hasListOrParagraph;
}

/**
 * Get icon and color for plan source
 */
function getPlanSourceStyle(source: 'embedded' | 'write'): { icon: string; color: string; label: string } {
  if (source === 'embedded') {
    return { icon: '📋', color: '#34D399', label: 'Embedded' };
  }
  return { icon: '📝', color: '#60A5FA', label: 'Written' };
}

/**
 * Extract title from plan content
 * Prefers first markdown heading, falls back to first line
 */
function extractPlanTitle(content: string): string {
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length <= 50) {
    return firstLine;
  }
  return firstLine.substring(0, 47) + '...';
}

export function PlanNavigator({
  messages,
  currentIndex,
  onNavigate,
  onViewPlan,
}: PlanNavigatorProps) {
  // Extract all plans from messages
  const plans: DetectedPlan[] = [];

  messages.forEach((msg, msgIndex) => {
    // Check user messages for embedded plans
    if (msg.role === 'user') {
      for (const content of msg.content) {
        if (content.type === 'text') {
          const text = content.text.trim();

          // Check for plan trigger patterns
          for (const pattern of PLAN_TRIGGER_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
              const planContent = text.substring(match[0].length).trim();

              // Validate plan content (>100 chars and has markdown heading)
              if (planContent.length >= 100 && looksLikeMarkdownPlan(planContent)) {
                const rawTitle = extractPlanTitle(planContent);
                const title = rawTitle.startsWith('Plan:') ? rawTitle : `Plan: ${rawTitle}`;
                const preview = planContent.split('\n').slice(0, 2).join(' ').substring(0, 60);

                plans.push({
                  title,
                  source: 'embedded',
                  messageIndex: msgIndex,
                  preview: preview + (preview.length >= 60 ? '...' : ''),
                });
              }
              break;
            }
          }
        }
      }
    }

    // Check assistant messages for Write tool calls to plan files
    if (msg.role === 'assistant') {
      msg.content.forEach((content, contentIdx) => {
        if (content.type === 'tool_use') {
          const toolContent = content as ToolUseContent;
          if (toolContent.name === 'Write') {
            const input = toolContent.input as { file_path?: string; content?: string };
            const filePath = input?.file_path || '';
            const fileContent = input?.content || '';

            // Skip code files - they're not plans even if they have "plan" in the name
            if (isCodeFile(filePath)) {
              return;
            }

            // Check if path looks like a plan file AND content looks like markdown
            const pathLooksLikePlan =
              filePath.toLowerCase().includes('plan') ||
              filePath.endsWith('.plan.md') ||
              filePath.includes('.jacques/plans/');

            if (pathLooksLikePlan && looksLikeMarkdownPlan(fileContent)) {
              const title = extractPlanTitle(fileContent);
              const preview = fileContent.split('\n').slice(0, 2).join(' ').substring(0, 60);

              plans.push({
                title: title.startsWith('Plan:') ? title : `Plan: ${title}`,
                source: 'write',
                messageIndex: msgIndex,
                contentIndex: contentIdx,
                filePath,
                preview: preview + (preview.length >= 60 ? '...' : ''),
              });
            }
          }
        }
      });
    }
  });

  if (plans.length === 0) {
    return null;
  }

  // Group by source type
  const bySource = new Map<'embedded' | 'write', DetectedPlan[]>();
  for (const plan of plans) {
    const list = bySource.get(plan.source) || [];
    list.push(plan);
    bySource.set(plan.source, list);
  }

  // Sort sources: Embedded first, then Written
  const sourceOrder: Array<'embedded' | 'write'> = ['embedded', 'write'];
  const sortedSources = Array.from(bySource.keys()).sort((a, b) => {
    return sourceOrder.indexOf(a) - sourceOrder.indexOf(b);
  });

  // Find which plan is currently active (closest to current scroll position)
  const findActivePlan = () => {
    for (let i = plans.length - 1; i >= 0; i--) {
      if (plans[i].messageIndex <= currentIndex) {
        return plans[i];
      }
    }
    return plans[0];
  };

  const activePlan = findActivePlan();

  return (
    <div style={styles.container}>
      <div style={styles.header}>Plans ({plans.length})</div>
      <div style={styles.list}>
        {sortedSources.map((source) => {
          const sourcePlans = bySource.get(source) || [];
          const sourceStyle = getPlanSourceStyle(source);

          return (
            <div key={source} style={styles.sourceGroup}>
              <div style={styles.sourceHeader}>
                <span style={{ color: sourceStyle.color }}>{sourceStyle.icon}</span>
                <span style={{ color: sourceStyle.color, fontWeight: 500 }}>
                  {sourceStyle.label}
                </span>
                <span style={styles.sourceCount}>({sourcePlans.length})</span>
              </div>
              {sourcePlans.map((plan, idx) => {
                const isActive = plan === activePlan;
                const planKey = `${plan.source}-${plan.messageIndex}-${idx}`;

                return (
                  <div key={planKey} style={styles.planItem}>
                    <button
                      style={{
                        ...styles.navButton,
                        ...(isActive ? styles.navButtonActive : {}),
                      }}
                      onClick={() => onNavigate(plan.messageIndex, plan.contentIndex)}
                      title={plan.preview}
                      type="button"
                    >
                      <span style={styles.marker}>
                        {isActive ? '▶' : '─'}
                      </span>
                      <span style={styles.planTitle}>{plan.title}</span>
                    </button>
                    {onViewPlan && (
                      <button
                        style={styles.viewButton}
                        onClick={() => onViewPlan({
                          title: plan.title,
                          source: plan.source,
                          messageIndex: plan.messageIndex,
                          filePath: plan.filePath,
                        })}
                        title="View full plan"
                        type="button"
                      >
                        View
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
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
  sourceGroup: {
    marginBottom: '12px',
  },
  sourceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    textTransform: 'uppercase' as const,
  },
  sourceCount: {
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  planItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: '8px',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    padding: '6px 8px',
    border: 'none',
    backgroundColor: 'transparent',
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    color: colors.textMuted,
    fontSize: '11px',
    transition: 'all 150ms ease',
  },
  navButtonActive: {
    backgroundColor: colors.bgElevated,
    color: colors.accent,
  },
  marker: {
    fontSize: '10px',
    flexShrink: 0,
  },
  planTitle: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  viewButton: {
    padding: '4px 8px',
    fontSize: '10px',
    fontWeight: 500,
    color: colors.textMuted,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    flexShrink: 0,
  },
};
