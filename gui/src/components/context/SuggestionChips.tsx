/**
 * SuggestionChips - Inline suggestion chips above chat input
 *
 * Rule-based suggestions based on catalog state.
 * Disappear after first message sent.
 */

import { colors } from '../../styles/theme';
import type { ProjectCatalog } from '../../types';

interface SuggestionChipsProps {
  catalog: ProjectCatalog | null;
  onSelect: (text: string) => void;
}

export function SuggestionChips({ catalog, onSelect }: SuggestionChipsProps) {
  const suggestions = generateSuggestions(catalog);

  if (suggestions.length === 0) return null;

  return (
    <div style={styles.container}>
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          style={styles.chip}
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

function generateSuggestions(catalog: ProjectCatalog | null): string[] {
  if (!catalog) return [];

  const suggestions: string[] = [];

  if (catalog.context.length === 0 && catalog.plans.length === 0) {
    // Empty catalog
    suggestions.push('How do I add context files?');
    suggestions.push('Create a project overview note');
  } else {
    if (catalog.context.length > 0) {
      const firstName = catalog.context[0].name;
      suggestions.push(`Summarize "${firstName}"`);
      suggestions.push("What's missing from my context?");
    }
    if (catalog.plans.length > 0) {
      suggestions.push('Summarize implementation plans');
    }
    if (catalog.context.length > 2) {
      suggestions.push('Create a table of contents');
    }
  }

  return suggestions.slice(0, 4);
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    padding: '0 0 8px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: '16px',
    border: `1px solid ${colors.borderSubtle}`,
    backgroundColor: 'transparent',
    color: colors.textSecondary,
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 150ms ease',
    whiteSpace: 'nowrap' as const,
  },
};
