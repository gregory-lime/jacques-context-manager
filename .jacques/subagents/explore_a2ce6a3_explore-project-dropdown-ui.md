# Explore: Explore project dropdown UI

> Session: `682a13b3-3f16-4bf9-a8bb-0b18b8650586`
> Date: 2026-02-03
> Tokens: ~91 319

---

Perfect! Now I have comprehensive understanding. Let me provide the complete analysis to the user:

## Exploration Complete: Project Dropdown/Selector in Jacques Dashboard

I've thoroughly explored the dashboard codebase. Here's what I found:

### 1. **Where Project Lists Come From - Data Flow**

The project list is **NOT a traditional dropdown in the main menu**. Instead, it's part of the **Archive Browser View**, which is accessed via the Settings menu. Here's the complete data flow:

**Source → Population → Display Path:**

```
User triggers "Settings" (menu option 4)
    ↓
App.tsx loads archive browser (line 728-749)
    ↓
listManifestsByProject() called (App.tsx line 738)
    ↓
Core module: core/src/archive/archive-store.ts (line 318-333)
    ↓
Manifests grouped by projectId and sorted by projectSlug
    ↓
buildArchiveList() creates flat item structure (ArchiveBrowserView.tsx line 373-418)
    ↓
ArchiveBrowserView renders grouped items with expand/collapse
```

**File locations for this flow:**
- `/Users/gole/Desktop/jacques-context-manager/core/src/archive/archive-store.ts` (318-333)
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ArchiveBrowserView.tsx` (373-418)
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/App.tsx` (728-803)

### 2. **Project Identification & Naming System**

**Key identifiers in `ConversationManifest`:**

```typescript
// From core/src/archive/types.ts
interface ConversationManifest {
  projectId: string;      // Encoded full path: "-Users-gole-Desktop-jacques-context-manager"
  projectSlug: string;    // Display name: "jacques-context-manager"
  projectPath: string;    // Full path: "/Users/gole/Desktop/jacques-context-manager"
  // ... other fields
}
```

**How Projects Are Grouped:**
- **Primary key:** `projectId` (encoded path) - used for unique grouping and expansion tracking
- **Display key:** `projectSlug` - human-readable project name shown in UI
- Fallback logic: If `projectId` unavailable, uses `projectSlug` for backward compatibility (line 326 in archive-store.ts)

### 3. **Project Population Logic - Core Implementation**

**`listManifestsByProject()` in `/Users/gole/Desktop/jacques-context-manager/core/src/archive/archive-store.ts` (318-333):**

```typescript
export async function listManifestsByProject(): Promise<
  Map<string, ConversationManifest[]>
> {
  const manifests = await listAllManifests();              // Get all archived manifests
  const byProject = new Map<string, ConversationManifest[]>();

  for (const manifest of manifests) {
    // Use projectId if available, fallback to projectSlug for old data
    const key = manifest.projectId || manifest.projectSlug;
    const existing = byProject.get(key) || [];
    existing.push(manifest);
    byProject.set(key, existing);                          // Group by project
  }

  return byProject;
}
```

**Key insight:** Projects are **dynamically populated from archived conversations** - not hardcoded. When a conversation is saved/archived, its manifest includes the project metadata.

### 4. **Display Rendering - ArchiveBrowserView Component**

**File:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ArchiveBrowserView.tsx`

**`buildArchiveList()` function (373-418):**

```typescript
export function buildArchiveList(
  manifestsByProject: Map<string, ConversationManifest[]>,
  expandedProjects: Set<string>
): ArchiveListItem[] {
  const items: ArchiveListItem[] = [];

  // Get entries and sort by projectSlug for display
  const entries = Array.from(manifestsByProject.entries());
  entries.sort((a, b) => {
    const slugA = a[1][0]?.projectSlug || a[0];
    const slugB = b[1][0]?.projectSlug || b[0];
    return slugA.localeCompare(slugB);              // Alphabetical sort by display name
  });

  for (const [projectId, manifests] of entries) {
    const projectSlug = manifests[0]?.projectSlug || projectId;
    const isExpanded = expandedProjects.has(projectId);

    // Add project header with conversation count
    items.push({
      type: "project",
      key: `project-${projectId}`,
      projectId,
      projectSlug,                                   // Used for display (e.g., "jacques-context-manager")
      expanded: isExpanded,
      conversationCount: manifests.length,
    });

    // Add conversations if expanded
    if (isExpanded) {
      for (const manifest of manifests) {
        items.push({
          type: "conversation",
          key: `conv-${manifest.id}`,
          projectId,
          projectSlug,
          manifest,
        });
      }
    }
  }

  return items;
}
```

### 5. **State Management - How Selection Works**

**In App.tsx (216-219):**

```typescript
// State for archive browser
const [archiveManifestsByProject, setArchiveManifestsByProject] = 
  useState<Map<string, ConversationManifest[]>>(new Map());
const [archiveExpandedProjects, setArchiveExpandedProjects] = 
  useState<Set<string>>(new Set());     // Tracks which projects are expanded
const [archiveItems, setArchiveItems] = 
  useState<ArchiveListItem[]>([]);      // Flat list for rendering
```

**Toggle Logic (790-803):**

```typescript
const toggleArchiveProject = useCallback((projectId: string) => {
  setArchiveExpandedProjects((prev) => {
    const next = new Set(prev);
    if (next.has(projectId)) {
      next.delete(projectId);           // Collapse
    } else {
      next.add(projectId);              // Expand
    }
    // Rebuild flat list with new expanded state
    const items = buildArchiveList(archiveManifestsByProject, next);
    setArchiveItems(items);
    return next;
  });
}, [archiveManifestsByProject]);
```

### 6. **Visual Representation**

**ArchiveBrowserView renders (line 178-205):**

```
Project Header (expandable)
  ▶ jacques-context-manager (5)      ← projectSlug + conversation count
  
When expanded ▼:
  Conversation 1 - Jan 31 (2h 15m, 42 msgs)
  Conversation 2 - Jan 30 (1h 30m, 28 msgs)
  ...
```

**HTML Structure in component (lines 178-186):**

```typescript
if (item.type === "project") {
  const expandIcon = item.expanded ? "▼" : "▶";
  contentLines.push(
    <Text key={item.key} color={textColor} bold={isSelected}>
      {isSelected ? "> " : "  "}
      {expandIcon} {item.projectSlug}           {/* Display name */}
      <Text color={MUTED_TEXT}> ({item.conversationCount})</Text>
    </Text>
  );
}
```

### 7. **Complete Component Hierarchy**

```
App.tsx (main state & logic)
  ├─ loadArchiveBrowser() (lines 728-749)
  │   ├─ listManifestsByProject() [core module]
  │   └─ buildArchiveList() [ArchiveBrowserView]
  │
  └─ Dashboard.tsx (renders views)
      └─ ArchiveBrowserView.tsx (renders project list)
          ├─ BrowserHorizontalLayout
          │   └─ Project list with expand/collapse
          └─ BrowserVerticalLayout
              └─ Project list with expand/collapse
```

### 8. **Key Files Summary**

| File | Purpose | Key Content |
|------|---------|-------------|
| `/core/src/archive/archive-store.ts` | Data source | `listManifestsByProject()` - groups manifests by project |
| `/core/src/archive/types.ts` | Type definitions | `ConversationManifest` with projectId/projectSlug |
| `/dashboard/src/components/ArchiveBrowserView.tsx` | Display component | `buildArchiveList()` creates flat structure, renders UI |
| `/dashboard/src/components/App.tsx` | State/logic | Manages expanded projects, loads archive browser |

### 9. **Project Names Displayed**

Projects are displayed using:
1. **Primary:** `manifest.projectSlug` - human-readable folder name (e.g., "jacques-context-manager")
2. **Fallback:** `projectId` if slug unavailable (encoded path)
3. **Sorting:** Alphabetical by projectSlug for clean organization

### 10. **Data Flow Summary**

```
Archive Storage (~/.jacques/archive/manifests/)
    ↓ listAllManifests()
Manifests loaded with projectId + projectSlug metadata
    ↓ listManifestsByProject()
Grouped into Map<projectId, Manifest[]>
    ↓ buildArchiveList()
Flat array of project headers + (optionally) conversations
    ↓ ArchiveBrowserView renders
Project list shown in Archive Browser with expand/collapse UI
    ↓ User presses Enter on project
    ↓ toggleArchiveProject(projectId)
Set<projectId> updated → rebuild flat list → re-render
```

This is NOT a traditional dropdown selector but rather a **collapsible tree browser** where projects are dynamically populated from archived conversations and displayed with human-readable names derived from their project slugs.