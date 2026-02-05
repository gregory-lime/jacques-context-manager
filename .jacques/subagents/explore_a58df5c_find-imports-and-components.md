# Explore: Find imports and components

> Session: `03ba075c-5723-4203-9d3a-3f35803d3e96`
> Date: 2026-02-03
> Tokens: ~54 868

---

Perfect! Now let me get a comprehensive summary with all the details. Let me compile my findings:

## Summary of Jacques GUI Redesign Components and Types

Based on my thorough search of `/Users/gole/Desktop/jacques-gui-redesign/gui/src`, here are all the requested items:

### 1. useSessionBadges Hook
**Location**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/hooks/useSessionBadges.ts`

**Exports**:
```typescript
export function useSessionBadges(sessionIds: string[]): {
  badges: Map<string, SessionBadges>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}
```

**Key Details**:
- Takes an array of session IDs
- Returns a Map of sessionId → SessionBadges with loading/error states
- Has 30-second cache TTL for badge data
- Supports force refetch

---

### 2. SessionCard Component
**Location**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/SessionCard.tsx`

**Props Interface**:
```typescript
interface SessionCardProps {
  session: Session;
  isFocused: boolean;
  badges?: SessionBadges;
  onClick?: () => void;
  onPlanClick?: () => void;
  onAgentClick?: () => void;
}
```

**Key Features**:
- Displays session status with pulsing dot indicator
- Shows model name, time since last activity
- Renders ContextMeter for token usage
- Displays plan/agent count indicators
- MCP, web search, and auto-compact badges in footer

---

### 3. ActiveSessionViewer Component
**Location**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/ActiveSessionViewer.tsx`

**Props Interface**:
```typescript
interface ActiveSessionViewerProps {
  sessionId: string;
  onBack: () => void;
}
```

**Key Features**:
- Fetches live session transcripts via `getSession()` API
- Transforms ParsedEntry arrays to ConversationMessage format
- Handles loading, error, and "awaiting first response" states
- Reuses ConversationViewer component for display
- Filters internal CLI messages (command-name, local-command, etc.)

---

### 4. Icons Component File
**Location**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/Icons.tsx`

**Exports Available**:
- `PlanIcon` - File with lines icon (for plans)
- `AgentIcon` - Robot/bot head icon (for agents)
- `StatusDot` - Filled or outline dot for status
- Plus 8 additional icons: SessionsIcon, TokensIcon, ActivityIcon, ModelIcon, HandoffIcon, ClockIcon, ChevronRight, ExternalLinkIcon

**Icon Props Interface**:
```typescript
interface IconProps {
  size?: number;
  color?: string;
  style?: CSSProperties;
}
```

---

### 5. Badge Component from UI
**Location**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/ui/Badge.tsx`

**Props Interface**:
```typescript
interface BadgeProps {
  label: string;
  variant?: BadgeVariant;  // 'plan' | 'agent' | 'mcp' | 'web' | 'compacted' | 'planning' | 'execution' | 'focused' | 'live' | 'idle' | 'working' | 'default'
  icon?: ReactNode;
  size?: BadgeSize;  // 'sm' | 'md'
  onClick?: (e: React.MouseEvent) => void;
}
```

**Variants Supported**: 12 different variants with pre-configured colors, icons, and animations (pulse animations for live/working states)

---

### 6. Session Type from types.ts
**Location**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/types.ts`

**Session Fields**:
```typescript
interface Session {
  session_id: string;
  source: SessionSource;  // 'claude_code' | 'cursor' | string
  cwd: string;
  project: string;
  session_title: string | null;
  terminal?: TerminalIdentity;  // term_program, tty, window_id, terminal_pid
  context_metrics: ContextMetrics | null;  // used_percentage, context_window_size, total_input_tokens, total_output_tokens, is_estimate
  model: ModelInfo | null;  // id, display_name, provider
  workspace: WorkspaceInfo | null;  // project_dir
  autocompact: AutoCompactStatus | null;  // enabled, threshold, bug_threshold
  status: 'idle' | 'working' | 'active';
  last_activity: number;  // timestamp
  registered_at: number;  // timestamp
  transcript_path?: string;
}
```

---

### 7. Lucide-React Icons (Globe and Terminal)
**Package.json Status**: ✅ **Available**
- lucide-react: `^0.469.0`

**Confirmed Imports in Use**:
- `Terminal` - Imported in:
  - `/Users/gole/Desktop/jacques-gui-redesign/gui/src/pages/Dashboard.tsx`
  - `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/Conversation/ConversationViewer.tsx`
  - `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/Conversation/SubagentNavigator.tsx`
  - `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/Conversation/BashProgressBlock.tsx`

- `Globe` - Imported in:
  - `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/SessionCard.tsx`

Both icons are confirmed available and actively used.

---

### 8. useJacquesClient Hook - focusedSessionId Return
**Location**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/hooks/useJacquesClient.ts`

**Returns** ✅ **YES - focusedSessionId is included**

```typescript
export interface UseJacquesClientReturn extends JacquesState {
  sessions: Session[];
  focusedSessionId: string | null;  // <-- HERE
  connected: boolean;
  lastUpdate: number;
  serverLogs: ServerLog[];
  claudeOperations: ClaudeOperation[];
  apiLogs: ApiLog[];
  selectSession: (sessionId: string) => void;
  triggerAction: (sessionId: string, action: 'smart_compact' | 'new_session' | 'save_snapshot') => void;
  toggleAutoCompact: () => void;
}
```

**Usage**:
```typescript
const { focusedSessionId, sessions, connected, ... } = useJacquesClient();
```

---

### SessionBadges Type Definition
**Location**: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/types.ts`

```typescript
export interface SessionBadges {
  planCount: number;
  agentCount: number;
  agentTypes: {
    explore: number;
    plan: number;
    general: number;
  };
  fileCount: number;
  mcpCount: number;
  webSearchCount: number;
  mode: 'planning' | 'execution' | null;
  hadAutoCompact: boolean;
}
```

---

All components, types, and hooks are properly typed and exported. The codebase is well-structured with clear separation of concerns between UI components, hooks for data management, and type definitions.