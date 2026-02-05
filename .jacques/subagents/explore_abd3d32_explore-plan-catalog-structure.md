# Explore: Explore plan catalog structure

> Session: `e3024ee4-e29b-433f-8809-0238f1bda643`
> Date: 2026-02-01
> Tokens: ~53 856

---

Excellent! Now I have a comprehensive understanding of the plan storage system. Let me create a detailed report.

## Summary: Plan Storage and Catalog Architecture

Based on my analysis of the Jacques codebase, here's how plans are currently stored and managed:

### 1. **Storage Locations**

**Global Archive** (shared across projects):
- Path: `~/.jacques/archive/plans/[project]/[filename].md`
- Example: `~/.jacques/archive/plans/jacques-context-manager/2026-01-31_plan-improve-handoff-skill.md`

**Local Project Archive** (per-project):
- Path: `.jacques/plans/[filename].md`
- Example: `.jacques/plans/2026-01-31_plan-improve-handoff-skill.md`

**Original Plan Location** (where user creates plans):
- Path: `~/.claude/plans/[filename].md`
- Configured in `~/.claude/settings.json` via `plansDirectory` field (defaults to `~/.claude/plans`)

### 2. **Plan File Format**

Plans are **standard Markdown files** with optional YAML frontmatter:

```markdown
# Plan Title (extracted as first # heading)

## Section 1
Content...

## Section 2
Content...
```

Key characteristics:
- Title extracted from first `# ` heading using regex: `/^#\s+(.+)$/m`
- Used for both display and filename generation
- Fallback to filename if no heading found

### 3. **Plan Metadata & Indexing**

Plans are indexed in `.jacques/index.json` with full metadata:

```typescript
// PlanEntry type
{
  id: string;              // Unique identifier (slug + hash)
  title: string;           // From plan's # heading
  filename: string;        // Readable: [YYYY-MM-DD]_[title-slug].md
  path: string;            // Relative: plans/[filename]
  createdAt: string;       // ISO timestamp (from file mtime)
  updatedAt: string;       // ISO timestamp (updated when archived)
  sessions: string[];      // Session IDs that created/used this plan
}
```

**Index Structure**:
```json
{
  "version": "1.0.0",
  "updatedAt": "2026-01-31T20:56:00.307Z",
  "context": [...],
  "sessions": [...],
  "plans": [
    {
      "id": "lively-noodling-flurry-L1VzZX",
      "title": "Plan: Improve Handoff Skill Based on wshobson's On-Call Patterns",
      "filename": "2026-01-31_plan-improve-handoff-skill-based-on-wsho.md",
      "path": "plans/2026-01-31_plan-improve-handoff-skill-based-on-wsho.md",
      "createdAt": "2026-01-31T19:15:58.082Z",
      "updatedAt": "2026-01-31T20:01:18.335Z",
      "sessions": ["38ceac2d-df45-4064-8a36-488d23eaa7f3"]
    }
  ]
}
```

### 4. **Plan Detection & Recognition**

Plans are **automatically detected** during conversation archiving via three methods:

**Detection Logic** (in `manifest-extractor.ts:detectPlans()`):

```typescript
function detectPlans(entries: ParsedEntry[]): PlanReference[] {
  // Identifies Write tool calls that reference plan files
  // Matches if file path:
  // 1. Starts with plansDirectory (~/.claude/plans/ by default)
  // 2. Contains /plans/ in path
  // 3. Contains "plan" and ends with .md
  
  // Returns PlanReference objects with:
  // - path: Original file path (~/.claude/plans/foo.md)
  // - name: Just the filename (foo.md)
  // - archivedPath: Archive location (plans/foo.md)
}
```

**Conversation Manifest** tracks plan references:
```typescript
export interface PlanReference {
  path: string;           // Original path (~/.claude/plans/foo.md)
  name: string;           // Filename (foo.md)
  archivedPath: string;   // Archive path (plans/foo.md)
}

// In ConversationManifest:
plans: PlanReference[];
```

### 5. **Plan Archival Flow**

**Full Flow** (`archive-store.ts:archiveConversation()`):

1. **Extract plan references** from conversation manifest
2. **For each plan**:
   - Read original file from `~/.claude/plans/[name].md`
   - Extract title from first `# ` heading
   - Generate readable filename: `YYYY-MM-DD_[title-slug].md`
   - Save to both:
     - Global: `~/.jacques/archive/plans/[project]/[filename].md`
     - Local: `.jacques/plans/[filename].md`
3. **Update `.jacques/index.json`**:
   - Add `PlanEntry` with session reference
   - Merge if plan already exists (add session to `sessions[]` array)
4. **Check duplicates**: Don't re-archive if plan already exists

**Key Functions**:
- `generatePlanFilename()` - Creates `YYYY-MM-DD_[title-slug].md` format
- `extractPlanTitle()` - Extracts title from markdown
- `archivePlan()` - Copies file to archive locations
- `isPlanArchived()` - Prevents duplicate archiving

### 6. **Plan-Session Relationships**

Plans track which sessions **created or modified** them:

```typescript
// In PlanEntry.sessions[]
"sessions": [
  "38ceac2d-df45-4064-8a36-488d23eaa7f3",  // Session ID
  "2c4fddda-3739-4251-bbb8-8c837573456c"   // Another session
]
```

**When a session is archived**:
- Each plan referenced in that session is added to its `sessions[]` array
- Plans are merged if they appear in multiple sessions
- Updated timestamp reflects latest modification

### 7. **Current Code Locations**

| Component | Location | Purpose |
|-----------|----------|---------|
| **Type Definitions** | `core/src/archive/types.ts` | `PlanReference`, `ConversationManifest` |
| **Archive Store** | `core/src/archive/archive-store.ts` | File I/O, `archivePlan()`, `generatePlanFilename()` |
| **Plan Detection** | `core/src/archive/manifest-extractor.ts` | `detectPlans()`, `extractPlanTitle()` |
| **Indexing** | `core/src/context/indexer.ts` | `addPlanToIndex()`, `removePlanFromIndex()` |
| **Index Types** | `core/src/context/types.ts` | `PlanEntry`, `ProjectIndex` |
| **Tests** | `dashboard/src/archive/manifest-extractor.test.ts` | Plan detection test coverage |

### 8. **Example in Practice**

From `.jacques/index.json`:

```json
{
  "id": "lively-noodling-flurry-L1VzZX",
  "title": "Plan: Improve Handoff Skill Based on wshobson's On-Call Patterns",
  "filename": "2026-01-31_plan-improve-handoff-skill-based-on-wsho.md",
  "path": "plans/2026-01-31_plan-improve-handoff-skill-based-on-wsho.md",
  "createdAt": "2026-01-31T19:15:58.082Z",
  "updatedAt": "2026-01-31T20:01:18.335Z",
  "sessions": ["38ceac2d-df45-4064-8a36-488d23eaa7f3"]
}
```

The actual file exists at:
- Original: `~/.claude/plans/2026-01-31_plan-improve-handoff-skill-based-on-wsho.md`
- Global archive: `~/.jacques/archive/plans/jacques-context-manager/2026-01-31_plan-improve-handoff-skill-based-on-wsho.md`
- Local archive: `.jacques/plans/2026-01-31_plan-improve-handoff-skill-based-on-wsho.md`

### 9. **Key Design Decisions**

1. **Readable Filenames**: Uses `YYYY-MM-DD_[title-slug].md` format for human readability
2. **Dual Storage**: Both global (cross-project searchable) and local (project-specific) archives
3. **Automatic Detection**: Plans detected from `Write` tool calls during archiving
4. **Session Tracking**: Plans maintain list of sessions that created/modified them
5. **Merging**: Same plan referenced in multiple sessions gets single entry with merged sessions list
6. **Title Extraction**: Smart extraction from markdown heading with fallback to filename

This architecture enables:
- Cross-project plan search (in global archive via search indexing)
- Project-specific plan history (in local `.jacques/` directory)
- Session-plan traceability (knowing which sessions created which plans)
- Automatic deduplication (same plan isn't re-archived multiple times)