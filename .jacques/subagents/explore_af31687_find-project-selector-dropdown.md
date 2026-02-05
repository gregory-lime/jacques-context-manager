# Explore: Find project selector dropdown

> Session: `682a13b3-3f16-4bf9-a8bb-0b18b8650586`
> Date: 2026-02-03
> Tokens: ~85 299

---

Excellent! Now I have a complete picture. Let me create a comprehensive report of my findings:

## Summary

I've found the project selector/dropdown in the Jacques dashboard. Here's what I discovered:

### **Location & Implementation**

The project selector exists but it's **not a traditional dropdown** - it's a **tree-based collapsible list** in the Archive Browser component:

1. **File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ArchiveBrowserView.tsx`
   - Lines 178-186: Renders project headers with expand/collapse icons (▶/▼)
   - Line 184: Displays `{item.projectSlug}` as the project name
   - Projects are expandable/collapsible via Enter key (line 1786-1788 in App.tsx)

2. **Supporting Code**:
   - **App.tsx** (lines 728-803): Handles loading archive manifests via `listManifestsByProject()` and manages `archiveExpandedProjects` state
   - **ArchiveBrowserView.tsx** (lines 373-418): `buildArchiveList()` function flattens the manifests by project, using `projectId` for grouping and `projectSlug` for display

### **How It Works**

**Current Flow:**
```
App.tsx (line 738)
  ↓
listManifestsByProject()  [core/src/archive/archive-store.ts:318]
  ↓ Groups by Map<projectId, ConversationManifest[]>
ArchiveBrowserView.tsx
  ↓
buildArchiveList() flattens with projectId + projectSlug
  ↓
Renders project headers (collapsible)
```

### **The Project Name Issue (Single Words)**

The user is seeing single-word names like "manager", "server", "story" because of how `projectSlug` is generated:

**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/archive/manifest-extractor.ts` (line 130)

```typescript
const projectSlug = path.basename(projectPath);
```

**Problem**: 
- `projectPath` is the full directory path: e.g., `/Users/gole/Desktop/jacques-context-manager`
- `path.basename()` only returns the **last directory name**: `jacques-context-manager` → `jacques-context-manager`
- But if the project is `/Users/gole/projects/manager`, it returns just `manager`

**Data Model**:
- `projectId`: Full path encoded with dashes, e.g., `-Users-gole-Desktop-jacques-context-manager`
- `projectSlug`: Last directory name only, e.g., `jacques-context-manager`
- `projectPath`: Full path, e.g., `/Users/gole/Desktop/jacques-context-manager`

### **Archive Browser UI Elements**

The archive browser (accessed via Settings → Browse Archive or `[S]` in dashboard):
- **Line 182-187**: Shows project header with:
  - Expand icon (▶ collapsed, ▼ expanded)
  - Project name (`projectSlug`)
  - Conversation count `(n)` in muted color
- **Line 195-204**: Shows individual conversations indented under projects:
  - Title, date, duration, message count

### **File Locations**

1. **Terminal Dashboard**:
   - `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ArchiveBrowserView.tsx` - UI component
   - `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/App.tsx` - State management

2. **Core Logic**:
   - `/Users/gole/Desktop/jacques-context-manager/core/src/archive/archive-store.ts` (lines 318-333) - `listManifestsByProject()`
   - `/Users/gole/Desktop/jacques-context-manager/core/src/archive/manifest-extractor.ts` (lines 127-130) - Project ID/slug generation

3. **GUI Version** (if applicable):
   - `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Archive.tsx` (lines 527-561) - Shows expandable project panels (not a dropdown, but collapsible list)

### **Key Insight**

**There is NO dropdown selector**. Instead, there's a:
- **Collapsible project list** in the Terminal Archive Browser
- **Expandable project panels** in the GUI Archive page

Both use the same underlying data structure (manifests grouped by `projectId`), but display the user-friendly `projectSlug` (basename of path) as the project name. This is why single-word project names appear - they're the final directory component of each project path.