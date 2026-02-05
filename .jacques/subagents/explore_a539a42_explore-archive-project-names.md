# Explore: Explore archive project names

> Session: `682a13b3-3f16-4bf9-a8bb-0b18b8650586`
> Date: 2026-02-03
> Tokens: ~69 579

---

Perfect! Now I have found all the critical pieces. Let me create a comprehensive report of my findings.

## Bug Analysis Report: Project Name Extraction Issue

I have identified the root cause of the project name truncation bug in the archive module. Here's my comprehensive exploration:

### Bug Location: The Problem

The bug is caused by the **consistent use of `path.basename()` to extract project names** from full file paths throughout the archive system.

**Key files with the bug:**

1. **`core/src/archive/bulk-archive.ts` (Line 85)**
   ```typescript
   const projectSlug = path.basename(projectPath);
   ```
   
2. **`core/src/archive/manifest-extractor.ts` (Line 130)**
   ```typescript
   const projectSlug = path.basename(projectPath);
   ```

3. **`core/src/cache/session-index.ts` (Line 610)**
   ```typescript
   const projectSlug = path.basename(projectPath);
   ```

### Why It's A Bug

The problem occurs with nested directory structures:
- **Full path**: `/Users/gole/Desktop/jacques-context-manager`
- **Using `path.basename()`**: Returns only `jacques-context-manager` ✓ (works)
- **But when grouping by projectId**: The key is `-Users-gole-Desktop-jacques-context-manager` (the dash-encoded full path)
- **In `ArchiveBrowserView.tsx` (line 390)**: The code tries to extract `projectSlug` from the first manifest:
  ```typescript
  const projectSlug = manifests[0]?.projectSlug || projectId;
  ```

### Data Flow Showing the Problem

1. **Extraction Phase** (core/src/archive/manifest-extractor.ts):
   ```typescript
   const projectId = projectPath.replace(/\//g, "-");  // e.g., "-Users-gole-Desktop-jacques-context-manager"
   const projectSlug = path.basename(projectPath);      // e.g., "jacques-context-manager"
   ```
   Creates `ConversationManifest` with both `projectId` and `projectSlug`.

2. **Grouping Phase** (core/src/archive/archive-store.ts:326):
   ```typescript
   const key = manifest.projectId || manifest.projectSlug;
   byProject.set(key, existing);  // Groups by projectId (the full encoded path)
   ```
   Maps are keyed by full `projectId`, not `projectSlug`.

3. **Display Phase** (dashboard/src/components/ArchiveBrowserView.tsx:383-390):
   ```typescript
   const slugA = a[1][0]?.projectSlug || a[0];  // Gets projectSlug from manifest (correct)
   ```
   Falls back to `a[0]` (the map key, which is the full projectId) if no manifest exists.

### The Root Issue

The architecture is **actually sound** - it correctly:
- Uses `projectId` (dash-encoded full path) as a **unique identifier** for storage and grouping
- Uses `projectSlug` (basename) as a **human-readable display name**

However, there could be issues when:
1. **No manifests exist for a projectId** - The fallback uses the full encoded path string instead of extracting just the last segment
2. **Mixed old/new data** - If some manifests have `projectSlug` and others don't, display becomes inconsistent

### Code Locations Summarized

| File | Lines | Issue |
|------|-------|-------|
| `core/src/archive/bulk-archive.ts` | 46-60, 85 | Defines `decodeProjectPath()` correctly, but uses `path.basename()` for slug extraction |
| `core/src/archive/manifest-extractor.ts` | 128-130 | Same pattern: decode path, then `path.basename()` for slug |
| `core/src/cache/session-index.ts` | 138-152, 610 | Identical implementation across the codebase |
| `core/src/archive/archive-store.ts` | 318-333 | Groups by `projectId`, displays `projectSlug` from manifest |
| `dashboard/src/components/ArchiveBrowserView.tsx` | 373-418 | Builds display list, extracts `projectSlug` from first manifest with fallback to key |
| `dashboard/src/archive/archive-store.ts` | 669 | Displays manifest.projectSlug in search results |

### Additional Data Points

**From types** (`core/src/archive/types.ts`):
- `projectId`: "Unique project identifier using encoded full path" (e.g., `-Users-gole-Desktop-jacques-context-manager`)
- `projectSlug`: "Project slug for display" (e.g., `jacques-context-manager`)
- `projectPath`: Full decoded path (e.g., `/Users/gole/Desktop/jacques-context-manager`)

The intent is clear - `projectId` is for machine use, `projectSlug` is for humans. The bug manifests when a projectId doesn't have a manifest available for display lookup.