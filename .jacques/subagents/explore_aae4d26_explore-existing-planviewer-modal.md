# Explore: Explore existing PlanViewer modal

> Session: `4836df4f-6499-4afa-8229-515cfcc3b17b`
> Date: 2026-02-04
> Tokens: ~30 269

---

Perfect. I now have all five files. Let me provide a comprehensive analysis of each component.

## Complete Implementation Analysis

---

## 1. PlanViewer.tsx - Plan Modal Component

**Props Interface:**
```typescript
interface PlanViewerProps {
  plan: PlanInfo;           // Plan metadata (title, source, messageIndex, etc.)
  sessionId: string;        // Session ID for API calls
  onClose: () => void;      // Callback to close the modal
}
```

**Internal Types:**
```typescript
interface PlanContent {
  title: string;
  source: 'embedded' | 'write' | 'agent';
  messageIndex: number;
  filePath?: string;
  content: string;
}
```

**State Management:**
- `content`: The fetched plan markdown content
- `loading`: Boolean for loading state
- `error`: Error message string or null

**Key Features:**

1. **Dual API Endpoints:**
   - Agent plans: `GET /api/sessions/{sessionId}/subagents/{agentId}`
   - Embedded/written plans: `GET /api/sessions/{sessionId}/plans/{messageIndex}`

2. **Agent Plan Content Extraction:**
   - Loops through `data.entries[]` looking for `type === 'assistant_message'`
   - Joins all assistant text with `\n\n` separator
   - Fallback message: "No plan content found in agent response."

3. **Keyboard Handling:**
   - Escape key closes the modal
   - Event listener attached to `window` on mount, cleaned up on unmount

4. **Source-Based Styling:**
   - `embedded`: FileText icon
   - `write`: PenTool icon  
   - `agent`: Bot icon
   - Displays source label + optional filePath

**Complete Style Objects:**

```typescript
styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
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
    flexDirection: 'column',
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
    display: 'inline-flex',
    alignItems: 'center',
    color: colors.textMuted,
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
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    color: colors.textMuted,
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'color 150ms ease',
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
}
```

**Animations:**
- Loader icon: `animation: 'spin 1s linear infinite'` (defined globally)

**JSX Structure:**
```
overlay (click closes modal)
  └─ modal (click stops propagation)
      ├─ header
      │   ├─ titleSection
      │   │   ├─ sourceIcon (icon)
      │   │   ├─ title
      │   │   └─ subtitle (label + filePath)
      │   └─ closeButton (X icon)
      ├─ content (scrollable, flex: 1)
      │   ├─ loading state (spinner + text)
      │   ├─ error state (red alert box)
      │   └─ planContent (MarkdownRenderer)
      └─ footer
          ├─ hint text
          └─ closeButtonSecondary
```

---

## 2. TerminalPanel.tsx - Mac Window Chrome Component

**Props Interface:**
```typescript
interface TerminalPanelProps {
  title?: string;              // Title in chrome bar
  status?: ReactNode;          // Status content (right side of chrome)
  showDots?: boolean;          // Show macOS traffic light dots (default: true)
  children: ReactNode;         // Panel content
  headerRight?: ReactNode;     // Additional header right content
  noPadding?: boolean;         // Remove content padding (default: false)
  onClick?: () => void;        // Click handler
}
```

**Key Features:**

1. **macOS Window Chrome:**
   - Three colored dots (red, yellow, green) using `colors.dotRed`, `colors.dotYellow`, `colors.dotGreen`
   - Dot styling: width/height 6px, borderRadius 50%, opacity 0.7

2. **Chrome Layout:**
   - **Left side**: Dots + title (monospace font, truncated with ellipsis)
   - **Right side**: Status + headerRight content
   - Height: fixed 32px

3. **Title Properties:**
   - Font: `'JetBrains Mono', 'Fira Code', 'SF Mono', monospace`
   - Size: 11px
   - Overflow handling: `ellipsis` + `nowrap`
   - Color: `colors.textMuted`

4. **Content Padding:**
   - With padding: 16px
   - Without padding: 0 (when `noPadding={true}`)

**Complete Style Objects:**

```typescript
styles = {
  container: {
    backgroundColor: colors.bgPrimary,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'border-color 200ms ease',
    cursor: onClick ? 'pointer' : 'default',
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
    minWidth: 0,  // Enables text truncation in flexbox
  },
  chromeRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,  // Prevents shrinking
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
    whiteSpace: 'nowrap',
  },
  content: {
    padding: '16px',
  },
  contentNoPadding: {
    padding: 0,
  },
}
```

**Animations:**
- Border color transition: `200ms ease`

**JSX Structure:**
```
container (onClick handler)
  ├─ chrome (header bar)
  │   ├─ chromeLeft
  │   │   ├─ dots (conditional)
  │   │   │   ├─ dot (red)
  │   │   │   ├─ dot (yellow)
  │   │   │   └─ dot (green)
  │   │   └─ title (conditional)
  │   └─ chromeRight
  │       ├─ status
  │       └─ headerRight
  └─ content (noPadding variant)
      └─ children
```

---

## 3. MarkdownRenderer.tsx - Markdown Component

**Props Interface:**
```typescript
interface MarkdownRendererProps {
  content: string;     // Markdown content to render
  className?: string;  // Optional CSS class
}
```

**Component Library:**
- Uses `react-markdown` with custom component overrides

**Complete Style Objects:**

```typescript
styles = {
  container: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: colors.textPrimary,
  },
  h1: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.textPrimary,
    margin: '0 0 16px 0',
    paddingBottom: '8px',
    borderBottom: `1px solid ${colors.borderSubtle}`,
  },
  h2: {
    fontSize: '20px',
    fontWeight: 600,
    color: colors.textPrimary,
    margin: '24px 0 12px 0',
  },
  h3: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.textPrimary,
    margin: '20px 0 8px 0',
  },
  h4: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.textSecondary,
    margin: '16px 0 8px 0',
  },
  p: {
    margin: '0 0 12px 0',
  },
  ul: {
    margin: '0 0 12px 0',
    paddingLeft: '24px',
  },
  ol: {
    margin: '0 0 12px 0',
    paddingLeft: '24px',
  },
  li: {
    margin: '4px 0',
  },
  inlineCode: {
    backgroundColor: colors.bgElevated,
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: 'monospace',
    color: colors.accent,
  },
  blockCode: {
    display: 'block',
    backgroundColor: colors.bgPrimary,
    padding: '12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'monospace',
    color: colors.textSecondary,
    overflow: 'auto',
  },
  pre: {
    margin: '0 0 12px 0',
    backgroundColor: colors.bgPrimary,
    borderRadius: '6px',
    overflow: 'auto',
  },
  blockquote: {
    margin: '0 0 12px 0',
    paddingLeft: '16px',
    borderLeft: `3px solid ${colors.accent}`,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '0 0 12px 0',
    fontSize: '13px',
  },
  thead: {
    backgroundColor: colors.bgElevated,
  },
  tr: {
    borderBottom: `1px solid ${colors.borderSubtle}`,
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left',
    fontWeight: 600,
    color: colors.textPrimary,
  },
  td: {
    padding: '8px 12px',
    color: colors.textSecondary,
  },
  a: {
    color: colors.accent,
    textDecoration: 'none',
  },
  strong: {
    fontWeight: 600,
    color: colors.textPrimary,
  },
  em: {
    fontStyle: 'italic',
  },
  hr: {
    border: 'none',
    borderTop: `1px solid ${colors.borderSubtle}`,
    margin: '16px 0',
  },
}
```

**Custom Components Override:**

| Element | Custom Handler | Logic |
|---------|---|---|
| `<code>` | Checks `className` prop | `!className` = inline, else block |
| `<a>` | Opens in new tab | `target="_blank" rel="noopener noreferrer"` |
| All headings | Custom sizing/spacing | h1-h4 with hierarchy |
| Lists | Custom spacing | ul/ol with 24px left padding |
| Tables | Full structure | thead/tbody/tr/th/td with borders |
| Strong/Em | Basic styling | Weight 600 / italic |
| Blockquote | Left border accent | 3px solid accent color |
| Inline code | Highlighted pill | Colored background + padding |
| Block code | Code block | Monospace, scrollable |

**Key Feature - Code Detection:**
```typescript
code: ({ children, className }) => {
  const isInline = !className;  // className indicates language tag (block code)
  return isInline 
    ? <code style={styles.inlineCode}>{children}</code>
    : <code style={styles.blockCode}>{children}</code>;
}
```

**JSX Structure:**
```
container
  └─ ReactMarkdown
      └─ components (all overridden)
          ├─ h1-h4 (headings)
          ├─ p (paragraphs)
          ├─ ul/ol/li (lists)
          ├─ code (inline or block)
          ├─ pre (code block wrapper)
          ├─ blockquote
          ├─ table (full structure)
          ├─ a (links, external)
          ├─ strong/em (text formatting)
          └─ hr (horizontal rule)
```

---

## 4. Badge.tsx - Badge Component

**Props Interface:**
```typescript
interface BadgeProps {
  label: string;                          // Badge text
  variant?: BadgeVariant;                 // Style variant (default: 'default')
  icon?: ReactNode;                       // Custom icon override
  size?: BadgeSize;                       // Size 'sm' | 'md' (default: 'sm')
  onClick?: (e: React.MouseEvent) => void; // Click handler
}

type BadgeVariant = 
  | 'plan'       // Purple (#A78BFA)
  | 'agent'      // Orange (#FF6600)
  | 'mcp'        // Gray
  | 'web'        // Blue (#60A5FA)
  | 'compacted'  // Gray (Zap icon)
  | 'planning'   // Green (#34D399)
  | 'execution'  // Blue (#60A5FA)
  | 'focused'    // Accent color (inverted)
  | 'live'       // Green with pulse dot
  | 'idle'       // Gray with dot
  | 'working'    // Accent with pulse dot
  | 'default';   // Gray

type BadgeSize = 'sm' | 'md';
```

**Variant Configuration:**

```typescript
variantConfig = {
  plan: { 
    color: '#A78BFA', 
    bg: 'rgba(167, 139, 250, 0.15)', 
    border: 'rgba(167, 139, 250, 0.3)', 
    Icon: FileText 
  },
  agent: { 
    color: '#FF6600', 
    bg: 'rgba(255, 102, 0, 0.15)', 
    border: 'rgba(255, 102, 0, 0.3)', 
    Icon: Bot 
  },
  mcp: { 
    color: colors.textSecondary, 
    bg: 'rgba(139, 146, 150, 0.15)', 
    Icon: Plug 
  },
  web: { 
    color: '#60A5FA', 
    bg: 'rgba(96, 165, 250, 0.15)', 
    Icon: Globe 
  },
  compacted: { 
    color: colors.textMuted, 
    bg: 'rgba(107, 112, 117, 0.15)', 
    Icon: Zap 
  },
  planning: { 
    color: '#34D399', 
    bg: 'rgba(52, 211, 153, 0.15)', 
    Icon: GitBranch 
  },
  execution: { 
    color: '#60A5FA', 
    bg: 'rgba(96, 165, 250, 0.15)', 
    Icon: Play 
  },
  focused: { 
    color: colors.bgPrimary, 
    bg: colors.accent 
  },
  live: { 
    color: colors.success, 
    bg: 'rgba(74, 222, 128, 0.15)', 
    dot: true, 
    pulse: true 
  },
  idle: { 
    color: colors.textMuted, 
    bg: 'rgba(107, 112, 117, 0.15)', 
    dot: true 
  },
  working: { 
    color: colors.accent, 
    bg: 'rgba(230, 126, 82, 0.15)', 
    dot: true, 
    pulse: true 
  },
  default: { 
    color: colors.textSecondary, 
    bg: 'rgba(139, 146, 150, 0.15)' 
  },
}
```

**Size Variants:**

| Property | sm | md |
|----------|----|----|
| gap | 4px | 6px |
| padding | 2px 8px | 4px 10px |
| fontSize | 11px | 12px |
| Icon size | 12 | 14 |

**Styling Logic:**

```typescript
span: {
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
  whiteSpace: 'nowrap',
  lineHeight: 1.4,
}
```

**Animations:**
- All transitions: `150ms ease`
- Dot pulse: `animation: 'pulse-glow 2s ease-in-out infinite'` (when `config.pulse === true`)

**Badge Content Logic:**

1. **Dot (if `config.dot === true`):**
   - Width/height: 6px, borderRadius 50%
   - Background: `config.color`
   - Animation: Pulse if `config.pulse === true`
   - flexShrink: 0

2. **Icon (if no dot):**
   - Uses custom `icon` prop if provided
   - Falls back to `config.Icon` from variant
   - Icon size varies by badge size (12 or 14)

3. **Label:** Always rendered

**JSX Structure:**
```
span
  ├─ dot (conditional, if config.dot)
  ├─ icon (conditional, if !config.dot)
  │   └─ custom icon or config.Icon
  └─ label
```

---

## 5. CollapsibleBlock.tsx - Collapsible Container

**Props Interface:**
```typescript
interface CollapsibleBlockProps {
  title: string;                           // Header text
  icon?: ReactNode;                        // Custom icon
  summary?: string;                        // Summary shown when collapsed
  defaultExpanded?: boolean;               // Initial state (default: false)
  forceExpanded?: boolean;                 // Force expand from parent (controlled)
  headerStyle?: React.CSSProperties;       // Custom header styles
  children: ReactNode;                     // Content
}

export interface CollapsibleBlockRef {
  expand: () => void;                      // Method to expand
  scrollIntoView: () => void;              // Scroll to this block
}
```

**State Management:**
- `isExpanded`: Boolean tracking open/closed state
- `containerRef`: DOM reference to container

**useImperativeHandle Methods:**
```typescript
{
  expand: () => setIsExpanded(true),
  scrollIntoView: () => {
    containerRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
  }
}
```

**Key Features:**

1. **Controlled Expansion:**
   - `defaultExpanded` sets initial state
   - `forceExpanded` prop triggers expansion from parent via useEffect

2. **Icon Rotation:**
   - Default icon: `<ChevronRight size={14} />`
   - Rotates 90° when expanded: `transform: isExpanded ? 'rotate(90deg)' : 'none'`
   - Transition: `150ms ease`

3. **Summary Text:**
   - Only shown when **collapsed** and summary provided
   - Right-aligned with `marginLeft: 'auto'`
   - Smaller font: 12px

4. **Content Container:**
   - Class: `jacques-expand-content` (for styling hooks)
   - Only rendered when `isExpanded === true`

**Complete Style Objects:**

```typescript
styles = {
  container: {
    borderRadius: '6px',
    border: `1px solid ${colors.borderSubtle}`,
    overflow: 'hidden',
    marginTop: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '10px 12px',
    minHeight: '44px',  // Touch-friendly
    backgroundColor: colors.bgElevated,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    color: colors.textSecondary,
    fontSize: '13px',
    transition: 'background-color 150ms ease',
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 150ms ease',
    flexShrink: 0,
  },
  title: {
    fontWeight: 500,
  },
  summary: {
    marginLeft: 'auto',
    fontSize: '12px',
    color: colors.textMuted,
  },
  content: {
    padding: '12px',
    backgroundColor: colors.bgInput,
    borderTop: `1px solid ${colors.borderSubtle}`,
  },
}
```

**Animations:**
- Icon rotation: `transform 150ms ease`
- Header background: `background-color 150ms ease`

**JSX Structure:**
```
container (ref)
  ├─ header (button, onClick toggles isExpanded)
  │   ├─ icon span (with rotation transform)
  │   │   └─ icon (custom or ChevronRight)
  │   ├─ title span
  │   └─ summary span (conditional, when collapsed)
  └─ content (conditional, only when isExpanded)
      └─ children
```

---

## Composition Together

### How They Work Together:

**PlanViewer Modal Usage:**
- Displays in overlay with fixed positioning (z-index: 1000)
- Content scrolls independently: `flex: 1, overflow: auto`
- Uses **MarkdownRenderer** to display plan content
- Fetches from API before rendering

**TerminalPanel + PlanViewer:**
- TerminalPanel provides macOS chrome container
- PlanViewer overlays on top with full-screen backdrop
- Can embed plans inside TerminalPanel as content

**Badge Integration:**
- Used for source indicators (plan, agent, mcp, web variants)
- Used for status (live, idle, working with pulse dots)
- Can trigger modals via onClick handlers

**CollapsibleBlock + MarkdownRenderer:**
- Sections expanded/collapsed to show plan details
- Markdown renders inside collapsed content
- Summary text previews when collapsed

### Theme Integration:
All components reference `colors` object from theme:
- `colors.bgPrimary`, `colors.bgSecondary`, `colors.bgElevated`
- `colors.textPrimary`, `colors.textSecondary`, `colors.textMuted`
- `colors.borderSubtle`
- `colors.accent` (primary action color)
- `colors.success`, `colors.dotRed`, `colors.dotYellow`, `colors.dotGreen`

### API URLs:
- Dev mode (Vite): `http://localhost:4243/api`
- Production: `/api` (relative from same origin)

This is the complete implementation mapping for all five components.