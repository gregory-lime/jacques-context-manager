# Explore: Explore session mode display in GUI

> Session: `2e51d0c0-219c-4fe7-bf1b-c8b9dbf74b99`
> Date: 2026-02-04
> Tokens: ~80 591

---

Perfect! Now I have all the information I need. Let me create a comprehensive report.

## Summary: Session Item Display and Mode Tracking in Jacques

I've completed a thorough exploration of how session items are displayed in the GUI and how session status/mode is tracked. Here's a comprehensive breakdown:

---

## 1. Session Status vs. Mode: Two Different Concepts

### Session Status (3 values)
From `/Users/gole/Desktop/jacques-context-manager/server/src/types.ts` (line 99):
```typescript
export type SessionStatus = 'active' | 'working' | 'idle';
```

This represents real-time activity:
- **`active`**: Session exists but no recent tool/context activity
- **`working`**: Session is currently executing (tool activity detected)
- **`idle`**: Session marked idle by Stop hook

### Session Mode (3 values)
From `/Users/gole/Desktop/jacques-context-manager/gui/src/types.ts` (line 338):
```typescript
mode: 'planning' | 'execution' | null;
```

This is detected from the **transcript content** and indicates work mode:
- **`null`**: No mode detected
- **`planning`**: EnterPlanMode tool was called during the session
- **`execution`**: First user message matched a plan trigger pattern (e.g., "Implement the following plan:")

---

## 2. Server-Side: How Status is Determined

### File: `/Users/gole/Desktop/jacques-context-manager/server/src/session-registry.ts`

**Status assignment:**
- Line 97: New sessions start as `'active'`
- Line 134: Activity events set status to `'working'`
- Line 193: Auto-registered sessions from context_update start as `'active'`

```typescript
registerSession(): status: 'active'
updateActivity(): status: 'working'  // Sets when tool is used
updateContext(): status unchanged (but auto-focuses)
setSessionIdle(): status: 'idle'
```

---

## 3. GUI: How Session Items are Displayed

### File: `/Users/gole/Desktop/jacques-context-manager/gui/src/components/SessionCard.tsx`

**Status Display (line 49-53):**
```typescript
const STATUS_CONFIG = {
  working: { dotColor: '#E67E52', textColor: '#E67E52', pulse: true },  // Orange pulsing
  idle:    { dotColor: '#6B7075', textColor: '#6B7075', pulse: false },  // Gray
  active:  { dotColor: '#4ADE80', textColor: '#4ADE80', pulse: false },  // Green
};
```

**Mode Display (lines 128-142):**
```typescript
{badges?.mode && (
  <span style={{
    ...styles.modePill,
    color: badges.mode === 'planning' ? '#34D399' : '#60A5FA',
    backgroundColor: badges.mode === 'planning'
      ? 'rgba(52, 211, 153, 0.12)'
      : 'rgba(96, 165, 250, 0.12)',
  }}>
    {badges.mode === 'planning'
      ? <><GitBranch size={9} />planning</>
      : <><Play size={9} />executing</>
    }
  </span>
)}
```

**Layout in SessionCard:**
```
┌─ Header Row ─────────────────────┐
│ [●] working  [planning/executing] │ model  time-ago
│                                   │
│ Session Title                     │
│ ████████████░░░ 65% context       │
│ [Search] [n plans] [m agents] →   │
└───────────────────────────────────┘
```

---

## 4. Mode Detection: How Planning vs. Execution is Determined

### File: `/Users/gole/Desktop/jacques-context-manager/core/src/cache/session-index.ts` (lines 256-430)

**Function: `detectModeAndPlans(entries)`**

1. **Planning Mode Detection** (line 275):
   - Scans all entries for `tool_call` with `toolName === 'EnterPlanMode'`
   - If found, sets `mode = 'planning'`
   - Takes precedence over execution mode (line 425)

2. **Execution Mode Detection** (lines 280-316):
   - Checks first real user message (skips internal `<command-` prefixed messages)
   - Tests against `PLAN_TRIGGER_PATTERNS`:
     - `/^implement the following plan[:\s]*/i`
     - `/^here is the plan[:\s]*/i`
     - `/^follow this plan[:\s]*/i`
   - If matched: sets `mode = 'execution'`
   - Must have ≥100 chars of plan content after trigger phrase
   - Must include markdown heading (`#`)

3. **Plan Reference Extraction** (lines 318-421):
   - Embedded plans in all user messages (source: `'embedded'`)
   - Plan agent responses from agent_progress (source: `'agent'`)
   - Write tool calls to plan files (source: `'write'`)

---

## 5. Data Flow: Status and Mode to the GUI

### Active Sessions (Real-Time)

**Request:** `GET /api/sessions/:id/badges` 
**File:** `/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts` (lines 642-745)

Response includes:
```typescript
{
  planCount: number,
  agentCount: number,
  agentTypes: { explore, plan, general },
  fileCount: number,
  mcpCount: number,
  webSearchCount: number,
  mode: 'planning' | 'execution' | null,        // From session-index
  hadAutoCompact: boolean,
  awaitingFirstResponse?: boolean,
}
```

### Hook: `useSessionBadges`
**File:** `/Users/gole/Desktop/jacques-context-manager/gui/src/hooks/useSessionBadges.ts`

- Fetches badges for multiple sessions in parallel
- Caches for 30 seconds (line 17: `CACHE_TTL_MS = 30 * 1000`)
- Called by Dashboard when rendering session cards

### Archived Sessions (Historical)

**Request:** `GET /api/archive/sessions` or `GET /api/archive/conversations/:id`

The `SessionEntry` interface includes `mode` field (optional):
```typescript
mode?: 'planning' | 'execution' | null;
```

Populated during session indexing from JSONL content.

---

## 6. Types Summary

### Server Types (`server/src/types.ts`)
- **`SessionStatus`**: `'active' | 'working' | 'idle'` - Real-time activity
- Session object includes `status: SessionStatus` (line 131)

### GUI Types (`gui/src/types.ts`)
- **`SessionBadges`** (lines 320-341):
  - `mode: 'planning' | 'execution' | null`
  - Used in SessionCard display
  - Fetched via `getSessionBadges()` API

### Cache/Index Types (`core/src/cache/session-index.ts`)
- **`CacheSessionEntry`** (lines 78-79):
  - `mode?: 'planning' | 'execution' | null`
  - Populated by `detectModeAndPlans()`
  - Stored in lightweight session index

---

## 7. Visual Indicator Reference

### Status Indicators (SessionCard Header)
| Status | Dot Color | Text Color | Animation | Meaning |
|--------|-----------|-----------|-----------|---------|
| working | #E67E52 (orange) | Orange | Pulsing | Tool in use |
| idle | #6B7075 (gray) | Gray | None | Not active |
| active | #4ADE80 (green) | Green | None | Session exists |

### Mode Pills (SessionCard Header)
| Mode | Icon | Color | Background | Meaning |
|------|------|-------|------------|---------|
| planning | GitBranch | #34D399 (teal) | rgba(52,211,153,0.12) | EnterPlanMode was called |
| execution | Play | #60A5FA (blue) | rgba(96,165,250,0.12) | Started with plan trigger |
| null | — | — | — | No mode detected |

---

## 8. Key Files and Locations

| Purpose | Path |
|---------|------|
| Status definition | `/Users/gole/Desktop/jacques-context-manager/server/src/types.ts` line 99 |
| Status updates | `/Users/gole/Desktop/jacques-context-manager/server/src/session-registry.ts` lines 97, 134, 193 |
| Mode detection logic | `/Users/gole/Desktop/jacques-context-manager/core/src/cache/session-index.ts` lines 256-430 |
| SessionCard display | `/Users/gole/Desktop/jacques-context-manager/gui/src/components/SessionCard.tsx` |
| Badges API | `/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts` lines 642-745 |
| useSessionBadges hook | `/Users/gole/Desktop/jacques-context-manager/gui/src/hooks/useSessionBadges.ts` |
| Archive display | `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Archive.tsx` line 578 |

---

## 9. Important Distinctions

1. **Status is ephemeral** (real-time): Changes as user interacts with Claude Code
2. **Mode is persistent** (transcript-based): Determined once from transcript history, stored in index
3. **Status comes from hooks** (activity events): Session registry manages based on `activity` and `idle` events
4. **Mode comes from indexing** (content analysis): Parsed from JSONL when session is indexed/cached
5. **Active sessions may not have mode yet** (awaiting first response): Badge endpoint returns empty mode if no content parsed

---

This comprehensive tracking enables the GUI to display rich session context with visual indicators for both real-time activity (status) and high-level work mode (planning vs execution).