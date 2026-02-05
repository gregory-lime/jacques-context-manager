# Explore: Explore plan storage and structure

> Session: `c6426d56-efd3-416b-a98f-8e7cd55d38b8`
> Date: 2026-02-03
> Tokens: ~65 880

---

Excellent! Now I have a complete picture. Let me create a comprehensive report.

## Comprehensive Plans Storage and Structure Report

Based on my thorough exploration of the codebase, here's how plans are stored and structured in the Jacques context manager:

### 1. Plan Data Types

**PlanReference** (in `/Users/gole/Desktop/jacques-context-manager/core/src/archive/types.ts`):
- `path`: Original path (e.g., `~/.jacques/plans/foo.md` or `~/.claude/plans/foo.md`)
- `name`: Plan filename (e.g., `"foo.md"`)
- `archivedPath`: Path in archive (e.g., `"plans/foo.md"`)
- `source`: Detection method - **`"embedded"` (from user messages) or `"write"` (from Write tool)**

**PlanEntry** (in `/Users/gole/Desktop/jacques-context-manager/core/src/context/types.ts`):
- `id`: Unique identifier (from filename or hash-based)
- `title`: Extracted from first markdown heading in plan content
- `filename`: Date-prefixed filename (e.g., `"2026-02-01_auth-system.md"`)
- `path`: Relative path in project (e.g., `"plans/2026-02-01_auth-system.md"`)
- `createdAt`: ISO timestamp when plan was first indexed
- `updatedAt`: ISO timestamp of last update
- `sessions`: Array of session IDs that reference or use this plan (bidirectional linking)

### 2. Plan File Storage Structure

Plans are stored in two locations:

**Per-Project Plans** (`.jacques/plans/`):
```
{project-root}/
├── .jacques/
│   ├── plans/
│   │   ├── 2026-02-01_auth-system.md
│   │   ├── 2026-02-01_api-refactor.md
│   │   └── 2026-02-01_database-migration.md
│   └── index.json
```

**Global Plans** (optional, for archive):
```
~/.jacques/
├── archive/
│   ├── plans/
│   │   ├── 2026-02-01_auth-system.md
│   │   └── 2026-02-01_api-refactor.md
│   └── conversations/
└── config.json
```

**File Format**: Plain markdown files with the plan content exactly as provided by the user, starting with markdown headings.

### 3. Plan Indexing in `.jacques/index.json`

The unified project index contains all plans:

```json
{
  "version": "1.0.0",
  "updatedAt": "2026-02-01T20:57:07.289Z",
  "plans": [
    {
      "id": "2026-02-01_archive-display-filtering-improvements",
      "title": "Archive Display & Filtering Improvements",
      "filename": "2026-02-01_archive-display-filtering-improvements.md",
      "path": "plans/2026-02-01_archive-display-filtering-improvements.md",
      "createdAt": "2026-02-01T20:57:07.278Z",
      "updatedAt": "2026-02-01T20:57:07.278Z",
      "sessions": [
        "21ea55e2-80bc-4adb-bf99-47e013418abf"
      ]
    }
  ]
}
```

### 4. Plan Detection and Extraction

**Two Sources of Plans:**

#### A. Embedded Plans (from user messages)
- **Module**: `core/src/archive/plan-extractor.ts`
- **Trigger Patterns** (case-insensitive):
  - `^implement the following plan[:\s]*`
  - `^here is the plan[:\s]*`
  - `^follow this plan[:\s]*`

**Validation Requirements:**
1. Content after trigger must be ≥100 characters
2. Must contain at least one markdown heading (`#`)
3. Can handle multiple plans in a single message (split by top-level headings)

**Extraction Process** (`extractEmbeddedPlans()`):
1. Scan all user messages for trigger patterns
2. Extract content after trigger phrase
3. Split into multiple plans if multiple headings present
4. Deduplicate within session and across existing plans
5. Generate `YYYY-MM-DD_title-slug.md` filenames (automatic date prefix)
6. Index in `.jacques/index.json`
7. Return `PlanReference[]` with `source: "embedded"`

#### B. Write Tool Plans (from Write tool calls)
- **Module**: `core/src/archive/manifest-extractor.ts` function `detectPlans()`
- **Detection Logic**: Identifies Write tool calls that target plan paths:
  - Paths starting with `plansDirectory` from settings (default: `~/.claude/plans/`)
  - Paths containing `/plans/`
  - Files matching pattern `*plan*.md`

**Extraction Process** (`detectPlans()`):
1. Scan all Write tool calls
2. Check if target path matches plan patterns
3. Return `PlanReference[]` with `source: "write"`
4. These plans are NOT automatically indexed in `.jacques/index.json` (different storage location)

### 5. Deduplication Strategy

**Three-Level Duplicate Detection** (in `plan-extractor.ts`):

1. **Session-Level Deduplication** (within same session):
   - Uses SHA-256 hash of normalized content
   - Skips if same hash seen in current extraction batch

2. **Exact Hash Match** (across sessions):
   - Reads all existing plans from `.jacques/index.json`
   - Compares SHA-256 hashes
   - If match found, reuses existing `PlanEntry` and adds session ID

3. **Fuzzy Match** (content-based deduplication):
   - **Criteria**: Same normalized title + same length range + high similarity
   - **Length Ranges**: 0-500 chars, 501-2000 chars, 2001+ chars
   - **Similarity Algorithm**: Jaccard similarity of words >3 chars
   - **Threshold**: ≥0.9 (90% similarity required)
   - Prevents duplicates with minor wording differences

**Fingerprinting** (function `generatePlanFingerprint()`):
```typescript
interface PlanFingerprint {
  contentHash: string;           // SHA-256
  titleNormalized: string;       // Lowercased, dash-separated
  lengthRange: string;           // "0-500" | "501-2000" | "2001+"
}
```

### 6. Session Links (Bidirectional Relationships)

**Storage**:
- `PlanEntry.sessions[]` array stores all session IDs that reference the plan
- When same plan is used in multiple sessions, session IDs are merged (deduplicated with `Set`)
- Automatically updated in index when `indexEmbeddedPlan()` is called

**Example** (from actual index):
```json
{
  "id": "2026-02-01_improve-handoff-skill",
  "title": "Plan: Improve Handoff Skill Based on Patterns",
  "filename": "2026-02-01_plan-improve-handoff-skill-based-on.md",
  "path": "plans/2026-02-01_plan-improve-handoff-skill-based-on.md",
  "sessions": [
    "38ceac2d-df45-4064-8a36-488d23eaa7f3",
    "another-session-id"
  ]
}
```

### 7. Plan Content in Archive Manifests

**ConversationManifest Structure** (in `archive/types.ts`):
```typescript
export interface ConversationManifest {
  plans: PlanReference[];  // Both embedded and write-sourced plans
  // ... other manifest fields
}
```

**Plan Collection in `extractManifestFromEntries()`**:
```typescript
// Detect plans from Write tool calls
const writePlans = detectPlans(entries);

// Detect embedded plans from user messages
const embeddedPlans = await extractEmbeddedPlans(entries, projectPath, sessionId);

// Combine both sources
const plans = [...writePlans, ...embeddedPlans];
```

### 8. Filename Generation

**Automatic Naming** (function `generatePlanFilename()`):
- Format: `YYYY-MM-DD_title-slug.md`
- Date: Current date (ISO split on 'T')
- Slug: Title lowercased, non-alphanumeric → dashes, limited to 50 chars
- Example: `2026-02-01_auth-system.md`

**Collision Handling** (function `generateVersionedFilename()`):
- If filename exists with different content: `YYYY-MM-DD_title-slug-v2.md`
- If v2 exists: `YYYY-MM-DD_title-slug-v3.md`
- Continues incrementing until unique filename found

### 9. Plan Title Extraction

**Priority Order** (function `extractPlanTitle()`):
1. First markdown heading: `# Title` → extract text
2. Fallback: First line of content
3. Last resort: Truncate to 77 chars + "..."

**Normalization for Fingerprinting**:
- Lowercase
- Replace non-alphanumeric with dashes
- Remove leading/trailing dashes

### 10. Integration with Archive System

**Manifest Creation Flow**:
1. Session JSONL parsed → `ParsedEntry[]`
2. Both `detectPlans()` and `extractEmbeddedPlans()` run in parallel
3. Results combined into `ConversationManifest.plans`
4. Manifest saved to `~/.jacques/archive/manifests/{sessionId}.json`
5. Embedded plans automatically indexed in `.jacques/index.json`

**Fallback Title Strategy** (when no summary exists):
```typescript
// Strategy 1: Look for plan title in Write tool calls
if (filePath includes "/plans/") extract heading

// Strategy 2: Extract from first user message (skip noise prefixes)
// Strategy 3: Use "Session YYYY-MM-DD" as last resort
```

### 11. Public API Exports

From `core/src/index.ts`, key exports:

**Plan Functions**:
- `extractEmbeddedPlans()` - Main extraction function
- `extractPlanTitle()` - Title extraction
- `PLAN_TRIGGER_PATTERNS` - Trigger patterns array
- `detectPlans()` - Write tool plan detection
- `getPlansDirectory()` - Get plans dir from settings
- `readPlanContent()` - Read plan file content

**Index Operations**:
- `addPlanToIndex()` - Add/update plan in index
- `removePlanFromIndex()` - Remove plan from index
- `readProjectIndex()` - Load full index
- `writeProjectIndex()` - Save full index

**Project Aggregation**:
- `getProjectPlans()` - Get all plans for project
- `readLocalPlanContent()` - Read plan file content

### 12. Real-World Example from Index

From `/Users/gole/Desktop/jacques-context-manager/.jacques/index.json`:

```json
{
  "id": "2026-02-01_plan-extract-and-catalog-embedded-plans-from-sessi",
  "title": "Plan: Extract and Catalog Embedded Plans from Sessions",
  "filename": "2026-02-01_plan-extract-and-catalog-embedded-plans-from-sessi.md",
  "path": "/Users/gole/Desktop/jacques-context-manager/.jacques/plans/2026-02-01_plan-extract-and-catalog-embedded-plans-from-sessi.md",
  "createdAt": "2026-02-01T14:55:39.667Z",
  "updatedAt": "2026-02-01T14:55:39.667Z",
  "sessions": [
    "dcdb490a-3351-4f54-902b-acc20a2ba09a"
  ]
}
```

Note: This entry has an absolute path instead of relative (inconsistent with others - appears to be a data issue).

### 13. Testing Coverage

Full test suite in `plan-extractor.test.ts` (37/37 tests):
- Plan detection with all trigger patterns
- Multiple plans in single message
- Title extraction and truncation
- Fingerprinting and similarity calculation
- Deduplication (exact and fuzzy)
- Session link merging
- Filename versioning
- Error handling

---

This comprehensive infrastructure enables Jacques to:
1. Automatically detect and extract plans from conversations
2. Prevent duplicates through multi-level deduplication
3. Maintain bidirectional links between plans and sessions
4. Store plans in a unified index for cross-session discovery
5. Support both embedded (user message) and write tool plans
6. Archive plans globally alongside conversation manifests