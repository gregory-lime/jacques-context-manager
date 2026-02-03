import { BookOpen } from 'lucide-react';
import { TerminalPanel, SectionHeader, EmptyState } from '../components/ui';

export function Context() {
  return (
    <div style={styles.container}>
      <SectionHeader title="Context" />
      <p style={styles.description}>
        Manage context files for your current project.
      </p>

      <TerminalPanel title=".jacques/context/" showDots={true}>
        <EmptyState
          icon={BookOpen}
          title="No context files yet"
          description="Add and manage context files from Obsidian, local files, and other sources."
        />
      </TerminalPanel>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
  },
  description: {
    fontSize: '14px',
    color: '#8B9296',
    marginBottom: '24px',
  },
};
