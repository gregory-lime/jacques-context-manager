# Explore: Find remaining projectSlug usage

> Session: `149fd300-5b16-4c88-8f85-e2ce16aa781f`
> Date: 2026-02-03
> Tokens: ~68 783

---

Let me compile my final report now based on the comprehensive search I've done:

## Summary of Remaining `projectSlug` Uses

Based on my thorough search of the codebase, I found **21 files** containing `projectSlug` usage. Here's a detailed breakdown of where **`projectSlug` needs to be evaluated** for potential updating to use `projectId`:

### **CRITICAL STRUCTURAL USES (Keys/Storage)**

These are the primary locations where `projectSlug` is used as a key or for storage organization - these are the most important to review:

1. **`/Users/gole/Desktop/jacques-context-manager/core/src/archive/types.ts`** (Lines 43-45)
   - `projectSlug: string` - Field in `ConversationManifest` (display purposes, **OK**)
   - `projectSlug: string` - Field in `SessionFileInfo` (line 271)

2. **`/Users/gole/Desktop/jacques-context-manager/core/src/archive/search-indexer.ts`** (Lines 245, 292)
   - Line 245: `const projectKey = manifest.projectId || manifest.projectSlug;` - **FALLBACK - Uses projectId with projectSlug fallback (GOOD)**
   - Line 292: `const projectKey = index.projects[projectId] ? projectId : projectId;` - **REDUNDANT LOGIC**

3. **`/Users/gole/Desktop/jacques-context-manager/core/src/archive/archive-store.ts`** (Lines 316-333, 697)
   - Line 316: `listManifestsByProject()` - Comments: "Falls back to projectSlug for old manifests without projectId" (line 316)
   - Line 326: `const key = manifest.projectId || manifest.projectSlug;` - **FALLBACK - Good for backward compat**
   - Line 697: `manifest.projectId !== input.project && manifest.projectSlug !== input.project` - **FALLBACK filtering in search**

4. **`/Users/gole/Desktop/jacques-context-manager/server/src/mcp/search-tool.ts`** (Lines 18, 94, 213, 248)
   - Line 18: `projectSlug: string;` in `ConversationManifest` duplicate interface (OUTDATED - Missing projectId)
   - Line 94: Schema description "Filter by project slug"
   - Line 213: `if (input.project && manifest.projectSlug !== input.project)` - **ONLY CHECKS projectSlug, not projectId**
   - Line 248: `project: manifest.projectSlug` in SearchResult

5. **`/Users/gole/Desktop/jacques-context-manager/core/src/archive/migration.ts`** (Lines 73, 79)
   - Lines 73, 79: Migration logic generates projectId from projectPath - uses projectSlug as fallback for old data (OK for migration)

### **BULK ARCHIVE & MANIFEST EXTRACTION**

6. **`/Users/gole/Desktop/jacques-context-manager/core/src/archive/bulk-archive.ts`** (Lines 66-91, 127, 163, 277)
   - Lines 66-91: `projectSlug` returned from `listAllProjects()` 
   - Line 127: `projectSlug: project.projectSlug` in `SessionFileInfo`
   - Line 163: `archiveSubagentFile()` parameter for logging
   - Line 277: `session.projectSlug` in display context

7. **`/Users/gole/Desktop/jacques-context-manager/core/src/archive/manifest-extractor.ts`** (Lines 130, 186)
   - Line 130: `const projectSlug = path.basename(projectPath);` - Generated from path
   - Line 186: `projectSlug` field in extracted manifest

### **DASHBOARD LEGACY COPIES**

8. **`/Users/gole/Desktop/jacques-context-manager/dashboard/src/archive/types.ts`** (Lines 28, 102)
   - Line 28: `projectSlug: string` in `ConversationManifest` - **MISSING projectId** (outdated duplicate)
   - Line 102: `projects: { [slug: string]: ProjectInfo }` - Uses slug as key, should use projectId

9. **`/Users/gole/Desktop/jacques-context-manager/dashboard/src/archive/manifest-extractor.ts`** - Legacy copy (likely duplicate)

10. **`/Users/gole/Desktop/jacques-context-manager/dashboard/src/archive/archive-store.ts`** - Legacy copy (likely duplicate)

11. **`/Users/gole/Desktop/jacques-context-manager/dashboard/src/archive/search-indexer.ts`** - Legacy copy (likely duplicate)

### **DISPLAY/UI COMPONENTS (Safe - Display Only)**

12. **`/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ArchiveBrowserView.tsx`** (Lines 31-34)
    - Line 34: `projectSlug?: string;` - Display purpose only

13. **`/Users/gole/Desktop/jacques-context-manager/gui/src/components/ActiveSessionViewer.tsx`** - Uses for display

14. **`/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Archive.tsx`** - Uses for display

### **CACHE & SESSION INDEX (Display/Grouping)**

15. **`/Users/gole/Desktop/jacques-context-manager/core/src/cache/session-index.ts`** (Line 44)
    - Line 44: `projectSlug: string` - Display field in `SessionEntry`

16. **`/Users/gole/Desktop/jacques-context-manager/core/src/project/aggregator.ts`** (Lines 60, 64, 152, 156)
    - Lines 60, 64: Used for grouping live sessions (display/filtering purposes)
    - Lines 152, 156: Same use case

### **SUBAGENT STORE**

17. **`/Users/gole/Desktop/jacques-context-manager/core/src/archive/subagent-store.ts`** (Line 44)
    - Line 44: `projectSlug: string` in `ArchivedSubagent` - Display context

### **SERVER HTTP API**

18. **`/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts`** - Uses core modules

### **TEST FILES**

19. **`/Users/gole/Desktop/jacques-context-manager/dashboard/src/archive/manifest-extractor.test.ts`** - Test data

20. **`/Users/gole/Desktop/jacques-context-manager/dashboard/src/archive/search-indexer.test.ts`** - Test data

---

## KEY ISSUES FOUND

### **Most Critical: MCP Search Tool Missing projectId Update**

**File:** `/Users/gole/Desktop/jacques-context-manager/server/src/mcp/search-tool.ts`
- **Line 18**: `interface ConversationManifest` has `projectSlug: string` but is missing `projectId`
- **Line 213**: Filter only checks `manifest.projectSlug !== input.project`, doesn't account for projectId
- **Impact**: Users can't filter by projectId through MCP tool

### **Dashboard Legacy Types Not Updated**

**File:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/archive/types.ts`
- **Line 28**: `ConversationManifest` interface missing `projectId` field
- **Line 102**: `projects: { [slug: string]: ProjectInfo }` uses slug as key instead of projectId
- **Impact**: Dashboard archive module won't work correctly with new projectId-keyed storage

### **Search Indexer Logic Issue**

**File:** `/Users/gole/Desktop/jacques-context-manager/core/src/archive/search-indexer.ts`
- **Line 292**: `const projectKey = index.projects[projectId] ? projectId : projectId;` - Redundant ternary, always returns projectId

### **Archive Store Backward Compat**

**File:** `/Users/gole/Desktop/jacques-context-manager/core/src/archive/archive-store.ts`
- **Lines 326, 697**: Uses fallback logic `manifest.projectId || manifest.projectSlug` - **Good for migration** but need to ensure all new manifests have projectId

---

## SUMMARY TABLE

| Location | Type | Issue | Severity |
|----------|------|-------|----------|
| `server/src/mcp/search-tool.ts:18` | Types | Missing `projectId` field | **HIGH** |
| `server/src/mcp/search-tool.ts:213` | Filter | Only checks projectSlug | **HIGH** |
| `dashboard/src/archive/types.ts:28` | Types | Missing `projectId` field | **HIGH** |
| `dashboard/src/archive/types.ts:102` | Index | Uses slug as key | **MEDIUM** |
| `core/src/archive/search-indexer.ts:245` | Logic | Fallback pattern (OK) | **LOW** |
| `core/src/archive/search-indexer.ts:292` | Logic | Redundant ternary | **LOW** |
| `core/src/archive/archive-store.ts:326` | Logic | Fallback pattern (OK) | **LOW** |
| `core/src/archive/archive-store.ts:697` | Filter | Fallback pattern (OK) | **LOW** |