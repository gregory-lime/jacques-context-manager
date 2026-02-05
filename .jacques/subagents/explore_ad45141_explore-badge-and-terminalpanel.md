# Explore: Explore Badge and TerminalPanel

> Session: `d46bf62f-06b5-4528-8d9d-536564c2e9df`
> Date: 2026-02-03
> Tokens: ~26 321

---

Perfect! Here are the full implementations of both components:

## Badge.tsx
**Location**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/ui/Badge.tsx`

```typescript
import type { ReactNode } from 'react';
import {
  FileText,
  Bot,
  Plug,
  Globe,
  Zap,
  GitBranch,
  Play,
  type LucideIcon,
} from 'lucide-react';
import { colors } from '../../styles/theme';

type BadgeVariant =
  | 'plan'
  | 'agent'
  | 'mcp'
  | 'web'
  | 'compacted'
  | 'planning'
  | 'execution'
  | 'focused'
  | 'live'
  | 'idle'
  | 'working'
  | 'default';

type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: ReactNode;
  size?: BadgeSize;
  onClick?: (e: React.MouseEvent) => void;
}

const variantConfig: Record<
  BadgeVariant,
  { color: string; bg: string; border?: string; Icon?: LucideIcon; dot?: boolean; pulse?: boolean }
> = {
  plan: { color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.15)', border: 'rgba(167, 139, 250, 0.3)', Icon: FileText },
  agent: { color: '#FF6600', bg: 'rgba(255, 102, 0, 0.15)', border: 'rgba(255, 102, 0, 0.3)', Icon: Bot },
  mcp: { color: colors.textSecondary, bg: 'rgba(139, 146, 150, 0.15)', Icon: Plug },
  web: { color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)', Icon: Globe },
  compacted: { color: colors.textMuted, bg: 'rgba(107, 112, 117, 0.15)', Icon: Zap },
  planning: { color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)', Icon: GitBranch },
  execution: { color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)', Icon: Play },
  focused: { color: colors.bgPrimary, bg: colors.accent },
  live: { color: colors.success, bg: 'rgba(74, 222, 128, 0.15)', dot: true, pulse: true },
  idle: { color: colors.textMuted, bg: 'rgba(107, 112, 117, 0.15)', dot: true },
  working: { color: colors.accent, bg: 'rgba(230, 126, 82, 0.15)', dot: true, pulse: true },
  default: { color: colors.textSecondary, bg: 'rgba(139, 146, 150, 0.15)' },
};

export function Badge({ label, variant = 'default', icon, size = 'sm', onClick }: BadgeProps) {
  const config = variantConfig[variant];
  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? '4px' : '6px',
        padding: isSm ? '2px 8px' : '4px 10px',
        fontSize: isSm ? '11px' : '12px',
        fontWeight: 500,
        color: config.color,
        backgroundColor: config.bg,
        border: config.border ? `1px solid ${config.border}` : 'none',
        borderRadius: '6px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 150ms ease',
        whiteSpace: 'nowrap' as const,
        lineHeight: 1.4,
      }}
      onClick={onClick}
    >
      {config.dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: config.color,
            animation: config.pulse ? 'pulse-glow 2s ease-in-out infinite' : 'none',
            flexShrink: 0,
          }}
        />
      )}
      {!config.dot && (icon || config.Icon) && (
        <>
          {icon || (config.Icon && <config.Icon size={isSm ? 12 : 14} />)}
        </>
      )}
      {label}
    </span>
  );
}
```

## TerminalPanel.tsx
**Location**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/ui/TerminalPanel.tsx`

```typescript
import type { ReactNode } from 'react';
import { colors } from '../../styles/theme';

interface TerminalPanelProps {
  title?: string;
  status?: ReactNode;
  showDots?: boolean;
  children: ReactNode;
  headerRight?: ReactNode;
  noPadding?: boolean;
  onClick?: () => void;
}

export function TerminalPanel({
  title,
  status,
  showDots = true,
  children,
  headerRight,
  noPadding = false,
  onClick,
}: TerminalPanelProps) {
  return (
    <div
      style={{
        ...styles.container,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      {/* Chrome bar */}
      <div style={styles.chrome}>
        <div style={styles.chromeLeft}>
          {showDots && (
            <div style={styles.dots}>
              <span style={{ ...styles.dot, backgroundColor: colors.dotRed }} />
              <span style={{ ...styles.dot, backgroundColor: colors.dotYellow }} />
              <span style={{ ...styles.dot, backgroundColor: colors.dotGreen }} />
            </div>
          )}
          {title && <span style={styles.title}>{title}</span>}
        </div>
        <div style={styles.chromeRight}>
          {status}
          {headerRight}
        </div>
      </div>

      {/* Content */}
      <div style={noPadding ? styles.contentNoPadding : styles.content}>
        {children}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: colors.bgPrimary,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'border-color 200ms ease',
  },
  chrome: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '32px',
    padding: '0 12px',
    backgroundColor: colors.bgSecondary,
    borderBottom: `1px solid ${colors.borderSubtle}`,
  },
  chromeLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
  },
  chromeRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  dots: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    opacity: 0.7,
  },
  title: {
    fontSize: '11px',
    color: colors.textMuted,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  content: {
    padding: '16px',
  },
  contentNoPadding: {
    padding: 0,
  },
};
```

Both components are fully self-contained with all styles defined inline. Badge uses a variant system with multiple visual styles, and TerminalPanel provides a macOS-style chrome bar container with configurable title, status indicators, and content areas.