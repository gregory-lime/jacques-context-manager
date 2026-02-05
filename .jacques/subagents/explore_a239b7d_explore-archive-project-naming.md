# Explore: Explore archive project naming

> Session: `cad7fdfd-f529-4128-a7ff-0b3079e47bb4`
> Date: 2026-02-03
> Tokens: ~70 760

---

Perfect! Now I have a clear picture. Let me create a comprehensive report of my findings.

## Analysis Report: Archive System Project Name Mismatch

Based on my thorough exploration of the codebase, I've identified the root cause of the project naming inconsistency issue.

### The Problem

The user reports:
- **Active project path**: `/Users/gole/Desktop/jacques-context-jac-manager`
- **Archive shows project slug**: `manager` (from test project)
- **Dashboard filtering**: Expects `jac-context-jac-manager`, but archived data is under `manager`

### Root Cause: Naive Path.basename() Extraction

**Location**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/archive/manifest-extractor.ts` (Line 156)

```typescript
// Get project slug from path
const projectSlug = path.basename(projectPath);
```

This line uses Node.js `path.basename()` which extracts **only the final directory name** from the project path.

**The issue**:
- Path: `/Users/gole/Desktop/jacques-context-jac-manager`
- `path.basename()` returns: `jacques-context-jac-manager` ✓ (correct)

However, when the project path defaults to `process.cwd()` in writer.ts:

```typescript
export async function saveToArchive(
  context: SavedContext,
  options: SaveToArchiveOptions
): Promise<SaveToArchiveResult> {
  const cwd = options.cwd || process.cwd();
  // ...
  const manifest = extractManifestFromEntries(
    entries,
    cwd,  // <-- This is passed directly
    options.jsonlPath,
    // ...
  );
}
```

**If `process.cwd()` returns something unexpected** (e.g., `/private/tmp`, `/Users/gole/Desktop/jacques/context/manager`, or a subdirectory), `path.basename()` will extract just that final component.

### Evidence from Archive Index

Looking at `~/.jacques/archive/index.json`, I can see multiple projects with inconsistent slug derivation:

```json
{
  "jacques-context-manager": {      // Correct: full basename
    "path": "/Users/gole/Desktop/jacques-context-manager"
  },
  "manager": {                        // WRONG: only final dir name
    "path": "/Users/gole/Desktop/jacques/context/manager"
  },
  "server": {                         // WRONG: only final dir name
    "path": "/Users/gole/Desktop/jacques/context/manager/server"
  },
  "tmp": {                            // WRONG: only final dir name
    "path": "/private/tmp"
  }
}
```

### Where Project Slugs Are Derived and Used

**1. Derivation Point** (manifest-extractor.ts:156):
```typescript
const projectSlug = path.basename(projectPath);
```

**2. Storage Location** (archive-store.ts:354-355):
```typescript
const globalDir = path.join(
  GLOBAL_ARCHIVE_PATH,
  "conversations",
  manifest.projectSlug  // <-- Used here for directory structure
);
```

**3. Filtering Point** (archive-store.ts:626):
```typescript
if (input.project && manifest.projectSlug !== input.project) {
  continue;  // Filter out conversations that don't match
}
```

The dashboard passes `input.project` from the UI, but the stored `projectSlug` might not match if the path structure was different when archived.

### Why This Happens

The inconsistency occurs when:

1. **Session 1**: Saved from directory `/Users/gole/Desktop/jacques-context-jac-manager`
   - `path.basename()` → `jacques-context-jac-manager` ✓

2. **Session 2**: Saved from directory `/Users/gole/Desktop/jacques/context/manager` 
   - `path.basename()` → `manager` (loses parent directories!) ✗

3. **Session 3**: Saved from directory `/Users/gole/Desktop/jacques/context/manager/server`
   - `path.basename()` → `server` ✗

### The Real Issue: Path Context Loss

The `projectSlug` is meant to be a **normalized identifier** for filtering, but it's **not stable** because it only uses the final path component. This means:

- **Projects in nested directories** lose their context
- **Sibling directories with same name** (e.g., `manager` in different locations) collide
- **Searching by "jacques-context-jac-manager"** won't find sessions archived as "manager" because the slug was derived from a subdirectory

### Files Involved

| File | Role |
|------|------|
| `dashboard/src/archive/manifest-extractor.ts` | Derives `projectSlug` (line 156) |
| `dashboard/src/archive/archive-store.ts` | Uses `projectSlug` for storage paths & filtering (lines 354-355, 626) |
| `dashboard/src/storage/writer.ts` | Passes `cwd` to manifest extractor (line 251-254) |
| `dashboard/src/archive/search-indexer.ts` | Indexes conversations by `projectSlug` (line 223-225) |
| `core/src/archive/` | Parallel implementation with same issue |

### Related Code Patterns

The search filtering logic at **archive-store.ts:626** expects exact slug matching:
```typescript
if (input.project && manifest.projectSlug !== input.project) {
  continue;
}
```

But if the user enters the full project name (`jac-context-jac-manager`) and the archived slug is just (`manager`), this filter blocks the results.

---

## Summary

**Root cause**: Naive `path.basename()` extraction only gets the final directory name, losing the hierarchical context that makes project identifiers unique.

**Impact**: Sessions archived from nested or differently-named directories get classified under their subdirectory name, making filtering by project name unreliable.

**Where to fix**: The `projectSlug` derivation logic needs to use either:
1. The full path with encoding (like Claude Code uses dash-encoding)
2. The relative path from a standard projects root
3. The actual project name from Claude Code's configuration