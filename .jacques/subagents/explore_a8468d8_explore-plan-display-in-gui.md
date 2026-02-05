# Explore: Explore plan display in GUI

> Session: `03949068-ed82-4b1d-a83f-fbf5add62caf`
> Date: 2026-02-03
> Tokens: ~83 250

---

Perfect! Now let me create a comprehensive summary document of my findings. Let me organize the information:

## Exploration Complete: Plan Display System in Jacques GUI

I've thoroughly explored how plans are displayed throughout the Jacques GUI, from data collection through frontend rendering. Here's my comprehensive findings:

### 1. **Plan Detection & Storage (Backend)**

**File**: `/Users/gole/Desktop/jacques-context-manager/core/src/cache/session-index.ts`

Plans are detected during session indexing via the `detectModeAndPlans()` function:

- **Embedded Plans**: Detected from user messages matching trigger patterns (e.g., "Implement the following plan:")
  - Must be ≥100 chars after trigger removal
  - Must contain markdown heading (`#`)
  - Stored with `source: 'embedded'`

- **Written Plans**: Detected from Write tool calls in assistant messages
  - File path must contain "plan" or end with `.plan.md` or be in `.jacques/plans/`
  - Content must look like markdown (heading + list/paragraphs, not code)
  - Stored with `source: 'write'`

**Data Structure** (lines 83-92):
```typescript
planRefs?: Array<{
  title: string;           // Extracted from first markdown heading
  source: 'embedded' | 'write';
  messageIndex: number;    // Location in JSONL
  filePath?: string;       // Only for 'write' source
}>;
```

**Deduplication Logic** (line 336):
- Prevents duplicate entries for the same message index in embedded plans
- Code: `if (!planRefs.some(r => r.messageIndex === index))`

### 2. **Plan Metadata in Session Index**

**File**: `/Users/gole/Desktop/jacques-context-manager/core/src/cache/session-index.ts`

SessionEntry includes:
- `planCount?: number` (line 81) - total count of detected plans
- `planRefs?: Array<{...}>` (line 83) - array of plan references with full metadata

The index is stored in `~/.jacques/cache/sessions-index.json` (~5KB metadata only).

### 3. **HTTP API for Plan Retrieval**

**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts` (lines 833-927)

**Endpoint**: `GET /api/sessions/:id/plans/:messageIndex`

The endpoint:
1. Looks up session in cache (line 847: `getSessionEntry()`)
2. If not cached, searches directly for session file (line 851: `findSessionById()`)
3. Validates `planRefs` exist (line 862)
4. Finds matching plan by `messageIndex` (line 868)
5. For **embedded plans**: Parses JSONL, extracts message content, strips trigger pattern
6. For **written plans**: Reads from disk file path

**Response Format**:
```typescript
{
  title: string;
  source: 'embedded' | 'write';
  messageIndex: number;
  filePath?: string;  // Only for 'write'
  content: string;    // Full plan content
}
```

### 4. **Frontend Data Types & Contracts**

**File**: `/Users/gole/Desktop/jacques-context-manager/gui/src/api/config.ts` (lines 547-556)

The GUI's `SessionEntry` type mirrors the backend:
```typescript
planRefs?: Array<{
  title: string;
  source: 'embedded' | 'write';
  messageIndex: number;
  filePath?: string;
}>;
```

### 5. **Plan Display in Project Dashboard**

**File**: `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/ProjectDashboard.tsx`

**Plan Aggregation** (lines 200-224):
- `aggregateDocuments()` function collects all plans from saved sessions
- Strips "Plan:" prefix for clean display (line 208)
- Groups them in the "ASSETS" section

**Asset Column Component** (lines 344-381):
- Renders plans in scrollable grid
- **Color scheme**: Green (`#34D399`) for plan icon
- **Background**: `rgba(52, 211, 153, 0.10)`
- Each plan shown as mini-document card with:
  - Icon + colored accent bar
  - Title (truncated)
  - Clickable area

**Session History Display** (lines 549-550):
- Shows `PlanIcon` next to session title if `isPlan` flag set
- Shows plan count badge (line 581-585) if `planCount > 0`

### 6. **Plan Detection in Conversation Viewer**

**File**: `/Users/gole/Desktop/jacques-context-manager/gui/src/components/Conversation/PlanNavigator.tsx`

This component **re-detects plans** from the conversation transcript for live display:

**Embedded Plan Detection** (lines 138-166):
- Scans user messages for trigger patterns (lines 32-36)
- Validates: ≥100 chars and contains markdown heading (line 150)
- Extracts title from first `#` heading (line 151)

**Written Plan Detection** (lines 170-205):
- Scans assistant messages for Write tool calls
- Filters out code files using `CODE_FILE_EXTENSIONS` array (lines 41-51)
- Validates file path looks like plan AND content is markdown
- Uses `looksLikeMarkdownPlan()` for validation (lines 64-96)

**Plan Grouping** (lines 213-225):
- Groups by source type (embedded first, then written)
- Shows count per source
- Renders collapsible section with "Plans (N)" header

### 7. **Plan Viewer Modal**

**File**: `/Users/gole/Desktop/jacques-context-manager/gui/src/components/Conversation/PlanViewer.tsx`

**Fetching Plan Content**:
- Uses API endpoint: `/sessions/:sessionId/plans/:messageIndex` (line 37)
- Fetch triggered on component mount (line 30-59)

**Display Features**:
- Modal overlay with header showing source type icon + title
- For embedded: Shows "Embedded Plan" label
- For written: Shows "Written Plan" label + file path (line 88-90)
- Content rendered with `MarkdownRenderer` component
- Escape key closes modal (line 63-70)

### 8. **Plan List Component (Assets Page)**

**File**: `/Users/gole/Desktop/jacques-context-manager/gui/src/components/PlanList.tsx`

Displays plan items in a simple clickable list:
- Each row: Icon + title + date + "View" button
- Styled as elevated card with hover effects
- Formatted date (lines 26-29)
- "No plans yet" message if empty

**Interface**:
```typescript
interface PlanListItem {
  id: string;
  title: string;
  filename: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  sessions: string[];
}
```

### 9. **Badge Data Structure**

**File**: `/Users/gole/Desktop/jacques-context-manager/gui/src/types.ts` (lines 320-341)

`SessionBadges` interface includes:
```typescript
planCount: number;  // Number of plans detected in session
```

Used in Dashboard session cards to show plan count badge.

### 10. **Deduplication Strategy**

**No deduplication in display layer** - plans are:
- Deduplicated at **detection time** (message index check)
- Displayed as-is from index
- The `PlanNavigator` re-detects from transcript to ensure accuracy

**Display filtering logic**:
1. Backend: `detectModeAndPlans()` avoids duplicates per message
2. Frontend: `PlanNavigator` filters by source type, groups by source

### 11. **Color & Visual Consistency**

**Plan Colors Across UI** (from ProjectDashboard.tsx):
- Icon: `#34D399` (emerald green)
- Background: `rgba(52, 211, 153, 0.10)` (light green)
- Consistent with other assets (agents=orange `#FF6600`, searches=blue `#60A5FA`)

**Icons Used**:
- `PlanIcon` from components/Icons.tsx
- `FileText` (lucide-react) for embedded plans in viewer
- `PenTool` (lucide-react) for written plans in viewer

### Summary

The plan display system is well-architected with **clear separation of concerns**:

1. **Detection** happens at index-build time (backend)
2. **Storage** is lightweight metadata only in cache
3. **Fetching** uses REST API for content on-demand
4. **Display** uses multiple components:
   - Dashboard assets grid (aggregated view)
   - Session cards (plan count badge)
   - Conversation viewer (embedded navigator + viewer modal)
   - Archive session view (badge display)

**Key design decisions**:
- No content copying - JSONL read on-demand
- Source-aware rendering (different icons/labels for embedded vs written)
- Trigger-pattern detection ensures plans are semantically meaningful (≥100 chars + markdown)
- Code file exclusion prevents false positives
- Immutable from frontend (read-only display, no editing in GUI)