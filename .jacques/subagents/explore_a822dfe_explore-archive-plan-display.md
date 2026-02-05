# Explore: Explore archive plan display

> Session: `03949068-ed82-4b1d-a83f-fbf5add62caf`
> Date: 2026-02-03
> Tokens: ~95 088

---

Perfect! Now I have a complete picture. Let me create a comprehensive summary report of all the places where plans are displayed in the Jacques GUI.

## Comprehensive Report: Plan Display Locations in Jacques GUI

Based on my thorough analysis of the codebase, here are **ALL the locations where plans can appear or be referenced in the Jacques GUI**:

### **1. ProjectDashboard Page** (`gui/src/pages/ProjectDashboard.tsx`)
**Location**: Assets grid section
- **Component**: AssetColumn with "PLANS" header
- **Data Source**: `aggregateDocuments()` function extracts plans from saved sessions
- **Display Method**: 
  - Plans are displayed as **card items** in a scrollable grid
  - Shows plan title and icon
  - Clickable to navigate to session
  - Plan count badge in project stats header (`{stats.totalPlans > 0 && <StatPill label="Plans" ... />}`)

- **Session History Row**:
  - Plans are indicated with a **PlanIcon badge** showing count
  - Only shows when `planCount > 0`
  - Line 558-560: Icon appears next to session title if `session.isPlan` is true

- **Session Title Detection**:
  - Detects if a session was started with a plan using `formatSessionTitle()` function (lines 81-92)
  - Uses PLAN_TITLE_PATTERNS to identify plan-mode sessions
  - Shows "Plan:" prefix in display title

### **2. ConversationViewer Component** (`gui/src/components/Conversation/ConversationViewer.tsx`)
**Location**: Right panel sidebar
- **Component**: `PlanNavigator` (lines 561-566)
- **Features**:
  - Shows list of all plans detected in current conversation
  - Groups plans by source: "Embedded" (green) vs "Written" (blue)
  - Collapsible/expandable sidebar
  - Shows plan count in header
  - Click to navigate to plan in conversation
  - "View" button to open full plan in modal

- **Modal Display**:
  - `PlanViewer` modal opens when "View" button clicked (lines 576-582)
  - Full-screen modal showing complete plan content
  - Rendered with `MarkdownRenderer` for proper markdown formatting

### **3. PlanNavigator Component** (`gui/src/components/Conversation/PlanNavigator.tsx`)
**Purpose**: Detect and list plans in a conversation
- **Detection Methods**:
  - Scans user messages for trigger patterns:
    - "Implement the following plan:"
    - "Here is the plan:"
    - "Follow this plan:"
  - Scans assistant messages for Write tool calls to `.md` files in `/plans/` directories
  
- **Filtering Logic** (lines 64-96):
  - Validates plan content must be ≥100 chars
  - Must have markdown heading (#)
  - Filters out code files (checks file extensions: `.ts`, `.js`, `.py`, etc.)
  - Checks for code patterns (`import`, `export`, `const`, `function`, etc.)
  - Validates reasonable markdown structure (headings + lists/paragraphs)

- **UI Organization**:
  - Groups by source: Embedded first, then Written
  - Active plan highlighted (closest to current scroll position)
  - Mini preview of plan content on hover
  - Shows plan title extracted from first markdown heading

### **4. PlanViewer Modal** (`gui/src/components/Conversation/PlanViewer.tsx`)
**Purpose**: Display full plan content in a modal
- **Rendering**:
  - Header with plan title, source badge (Embedded/Written), file path
  - Full plan content rendered as markdown
  - Footer with close button and keyboard hint (Escape to close)
  - Centered modal overlay (80% width, max 900px)

- **Data Loading**:
  - Fetches plan content via API endpoint: `GET /api/sessions/{sessionId}/plans/{messageIndex}`
  - Loading state with spinner
  - Error state with clear error message
  - Handles both embedded and written plans

### **5. PlanList Component** (`gui/src/components/PlanList.tsx`)
**Purpose**: Standalone list of project plans
- **Display Format**:
  - Clickable rows with plan icon, title, update date
  - "View" button on each row
  - Empty state if no plans
- **Not currently used in main UI** but available for future use

### **6. AgentProgressBlock Component** (`gui/src/components/Conversation/AgentProgressBlock.tsx`)
**Special Rendering for Plan Agents** (lines 211-214):
- When agent type is "plan", renders response with special styling:
  - Green background: `rgba(52, 211, 153, 0.08)` (#34D399)
  - Left border accent in plan color
  - Uses `MarkdownRenderer` for proper formatting
  - Distinguishes plan responses from other agent types

### **7. Archive Page** (`gui/src/pages/Archive.tsx`)
**Session Display**:
- Shows plan count badge in session rows (lines 316-317)
- Badge format: `"{planCount} plan{s}"`
- Only shows if `session.planCount > 0`
- Uses "plan" variant badge styling

### **8. Server HTTP API** (`server/src/http-api.ts`)
**Endpoint**: `GET /api/sessions/:id/plans/:messageIndex` (lines 828-923)
- Retrieves plan content for display in modal
- Handles two plan types:
  - **Embedded plans** (source: 'embedded'): 
    - Reads from JSONL at specified message index
    - Strips trigger patterns from user message
    - Returns extracted plan content
  - **Written plans** (source: 'write'):
    - Reads from file path stored in planRef
    - Returns full file content

- **Response Format**:
```json
{
  "title": "Plan Title",
  "source": "embedded" | "write",
  "messageIndex": 0,
  "filePath": "path/to/plan.md",
  "content": "# Plan Title\n\n..."
}
```

### **9. Archive Manifest** (`core/src/archive/types.ts`)
**Data Structure** (ConversationManifest, lines 67-68):
- `plans: PlanReference[]` array contains all plans from a conversation
- Each PlanReference has:
  - `path`: Original file path (e.g., `~/.claude/plans/foo.md`)
  - `name`: Filename (e.g., `foo.md`)
  - `archivedPath`: Archive location (e.g., `plans/foo.md`)
  - `source`: "embedded" or "write"

### **10. Manifest Extractor** (`core/src/archive/manifest-extractor.ts`)
**Plan Detection Logic**:
- **detectPlans()** (lines 363-390): Finds plans in Write tool calls
- **extractEmbeddedPlans()** (plan-extractor.ts): Finds plans in user messages
- **Fallback Title Strategy** (lines 210-271): Uses plan title if no summary exists

### **11. Plan-Extractor Module** (`core/src/archive/plan-extractor.ts`)
**Comprehensive Plan Detection**:
- `detectEmbeddedPlans()`: Scans user messages for trigger patterns
- `splitMultiplePlans()`: Handles multiple plans in single message
- `generatePlanFingerprint()`: Creates fingerprint for deduplication
- `findDuplicatePlan()`: Content-based duplicate detection
- `indexEmbeddedPlan()`: Saves plan to project and indexes it
- `extractEmbeddedPlans()`: Main export function combining all above

### **12. SessionEntry API Type** (`gui/src/api/config.ts`, lines 487-496)
**Plan Reference Structure**:
```typescript
planRefs?: Array<{
  title: string;              // Plan title
  source: 'embedded' | 'write';
  messageIndex: number;       // Location in conversation
  filePath?: string;          // For written plans
}>
```

---

## **User Journey: How Plans Surface Across the App**

1. **Active Sessions**: ProjectDashboard displays live sessions with plan badges if in plan mode
2. **Session History**: Shows plan count next to past sessions
3. **Conversation View**: Open archived session → right sidebar shows PlanNavigator with all plans
4. **Plan Details**: Click "View" button → PlanViewer modal displays full plan content
5. **Archive**: Browse archived sessions → see plan count badges per session
6. **Assets Grid**: ProjectDashboard's "PLANS" column aggregates all plans from project

---

## **Key Technical Details**

**Plan Detection Patterns**:
- Embedded: "Implement the following plan:", "Here is the plan:", "Follow this plan:"
- Written: Any Write tool call to files containing "plan" in path/name with markdown content
- Validation: ≥100 chars, has markdown heading (#), valid markdown structure

**Plan Sources**:
1. **Embedded**: Plans pasted into conversation as user messages
2. **Written**: Plans created via Write tool (saved to `.md` files)

**Styling**:
- Embedded plans: Green (#34D399) - FileText icon
- Written plans: Blue (#60A5FA) - PenTool icon

**Deduplication**:
- SHA-256 hash for exact matches
- Jaccard similarity (90% threshold) for fuzzy matches with same title/length

---

This covers **every location** where plans appear in the Jacques GUI, from display to data handling to API endpoints.