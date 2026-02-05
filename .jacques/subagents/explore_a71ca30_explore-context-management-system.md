# Explore: Explore context management system

> Session: `c113e71d-f804-4875-b8a5-956015ed3948`
> Date: 2026-01-31
> Tokens: ~48 790

---

Perfect! Now I have a complete picture. Let me provide a comprehensive report.

## Context Management System Analysis

I've thoroughly explored the context management system in `dashboard/src/context/`. Here's the complete breakdown:

### 1. **File Addition Flow**

Files are added to context through the **`addContext()` function** in `manager.ts` (lines 176-217):

```
Obsidian Source File → addContext() → Copies to .jacques/context/ → Updates .jacques/index.json
```

**Process Flow:**
1. User selects a markdown file from Obsidian vault (via `AddContextConfirmView`)
2. `addContext()` receives `AddContextOptions`:
   - `cwd`: Project directory
   - `sourceFile`: Path to file in Obsidian vault
   - `name`: Display name
   - `source`: Context source type ("obsidian", "google_docs", "notion", "local")
   - `description`: Optional user-provided description

3. **Manager operations:**
   - Generates unique ID: `generateContextId()` creates format `{slug}-{randomhex}` (e.g., `my-document-a1b2c3`)
   - Sanitizes filename for filesystem safety
   - Creates `.jacques/context/` directory (recursive)
   - Copies source file to `.jacques/context/{sanitized-name}.md`
   - Extracts tags from file's YAML frontmatter
   - Captures file size and metadata
   - Updates index via `addToIndex()`

**Location:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/context/manager.ts`, lines 176-217

---

### 2. **Index Schema (.jacques/index.json)**

**Unified ProjectIndex Format** (`types.ts`, lines 14-20):

```typescript
export interface ProjectIndex {
  version: string;                  // "1.0.0"
  updatedAt: string;               // ISO timestamp of last update
  context: ContextFile[];          // Imported external files
  sessions: SessionEntry[];        // Saved conversations
  plans: PlanEntry[];              // Implementation plans
}
```

**ContextFile Structure** (lines 25-35):

```typescript
export interface ContextFile {
  id: string;                      // Unique: "my-doc-abc123"
  name: string;                    // Display name: "My Document"
  path: string;                    // Relative: ".jacques/context/my-doc.md"
  source: ContextSource;           // "obsidian" | "google_docs" | "notion" | "local"
  sourceFile: string;              // Original path: "/vault/My Document.md"
  addedAt: string;                 // ISO timestamp
  description?: string;            // Optional user notes
  sizeBytes: number;               // File size in bytes
  tags?: string[];                 // Extracted from frontmatter
}
```

**Storage Location:** `.jacques/index.json` in project root

**Legacy Compatibility:** The system automatically migrates from old `{files: []}` format to new `{context: [], sessions: [], plans: []}` format via `migrateIndex()` function (lines 110-118).

---

### 3. **File Copying & Storage**

**Directory Structure:**
```
project-root/
├── .jacques/
│   ├── index.json                 # Main index (unified)
│   ├── context/                   # External context files
│   │   ├── auth-flow.md           # Copied markdown files
│   │   ├── api-design.md
│   │   └── ...
│   ├── sessions/                  # Saved conversations (Phase 7)
│   └── handoffs/                  # Handoff briefings
```

**Copy Process** (`manager.ts`, lines 194-195):

1. **Ensure directory exists:**
   ```typescript
   await fs.mkdir(contextDir, { recursive: true });
   ```

2. **Generate destination path:**
   - Sanitize filename: `"Test @#$ File"` → `"Test-File.md"`
   - Full path: `.jacques/context/test-file.md`
   - Relative path stored in index: `.jacques/context/test-file.md`

3. **Copy file with metadata:**
   ```typescript
   await fs.copyFile(sourceFile, destPath);
   const stats = await fs.stat(destPath);
   sizeBytes = stats.size;
   ```

4. **Extract tags from YAML frontmatter** (`extractTags()`, lines 105-138):
   - Reads copied file's YAML front matter
   - Supports both array and inline formats:
     ```yaml
     tags: [javascript, react]
     tags:
       - api
       - backend
     ```
   - Strips `#` prefix if present
   - Returns sorted, deduplicated array

---

### 4. **Relationship Between Sources and Context Catalog**

**Architecture: Adapter Pattern**

```
External Source → Source Adapter → Context Manager → Index
  (Obsidian)         (obsidian.ts)      (manager.ts)    (indexer.ts)
```

**Source System** (`dashboard/src/sources/`):

1. **Obsidian Adapter** (`obsidian.ts`):
   - `detectObsidianVaults()`: Auto-detects from `~/Library/Application Support/obsidian/obsidian.json`
   - `listVaultFiles()`: Recursively walks vault, finds all `.md` files
   - `buildFileTree()`: Creates hierarchical folder/file structure
   - `getVaultFileTree()`: Combines listing + tree building
   - Returns `ObsidianFile[]` with metadata (size, modification time, relative path)

2. **Source Configuration** (`sources/types.ts`):
   - Stored in `~/.jacques/config.json`
   - Per-source settings: enabled, paths, custom config
   - Extensible for Google Docs, Notion

3. **User Flow in App.tsx** (lines 496-501):
   ```typescript
   const result = await addContext({
     cwd: focusedSession.workspace.project_dir,
     sourceFile: selectedObsidianFile.path,          // Full path from Obsidian
     name: selectedObsidianFile.name,                 // Filename without .md
     source: "obsidian",
     description: addContextDescription || undefined,
   });
   ```

**Key Integration Points:**

- **ObsidianBrowserView**: Displays Obsidian vault files in a tree UI
- **AddContextConfirmView**: Shows file details (size, estimated tokens) before adding
- **App.tsx**: Orchestrates source selection → file browsing → confirmation → `addContext()` call
- **Context Manager**: Handles the actual file copy and index update

---

### 5. **Test Coverage & Expected Behaviors**

**Indexer Tests** (`indexer.test.ts`):
- Reading/writing `.jacques/index.json`
- Creating new indexes when missing
- Appending files to existing indexes
- Preventing duplicates (same ID overwrites, not duplicates)
- Removing files by ID
- Error handling for corrupted JSON

**Manager Tests** (`manager.test.ts`):

| Test | Expected Behavior |
|------|------------------|
| `generateContextId()` | Creates unique slugs with random suffix |
| `sanitizeFilename()` | Converts spaces→dashes, removes special chars, collapses dashes |
| `addContext()` | Copies file, creates directory, extracts tags, updates index |
| `extractTags()` | Parses YAML frontmatter, handles arrays/inline, deduplicates |
| `hasContextFiles()` | Checks if `.jacques/context/` contains `.md` files |
| `formatFileSize()` | Humanizes bytes: "2.0 KB", "2.0 MB" |
| `estimateTokensFromSize()` | ~4.5 chars per token for markdown |
| `formatTokenCount()` | Shows "500" or "1.5k" format |

**Critical Test Cases:**

1. **File uniqueness:** Same name generates different IDs due to random suffix
2. **Tag extraction:** Supports YAML arrays, inline arrays, `#` prefix removal
3. **Special characters:** `"Test @#$ File"` → sanitized to `"Test-File.md"`
4. **No duplication on re-add:** Existing entries by ID are updated, not duplicated

---

### 6. **Key Implementation Details**

**ID Generation** (`generateContextId()`, lines 144-148):
```typescript
const slug = sanitizeFilename(name).toLowerCase().substring(0, 30);
const randomSuffix = Math.random().toString(16).substring(2, 8);
return `${slug}-${randomSuffix}`;  // e.g., "my-document-a1b2c3"
```

**Token Estimation** (`estimateTokensFromSize()`, lines 292-294):
```typescript
// Falls back to character-based if tiktoken unavailable
// English markdown: ~4.5 characters per token
return Math.ceil(bytes / 4.5);
```

**Index Updating** (`indexer.ts`):
- **Read:** `readProjectIndex(cwd)` returns full `ProjectIndex`
- **Write:** `writeProjectIndex(cwd, index)` updates timestamp and writes JSON
- **Add:** `addContextToIndex()` reads → appends/updates → writes
- **Remove:** `removeContextFromIndex()` reads → filters → writes

**Lazy Loading:** 
- Tiktoken encoder lazy-loaded on first token count
- Fallback to character-based estimation if unavailable

---

### 7. **File Paths (Absolute)**

- **Types:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/context/types.ts`
- **Indexer:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/context/indexer.ts`
- **Manager:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/context/manager.ts`
- **Indexer Tests:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/context/indexer.test.ts`
- **Manager Tests:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/context/manager.test.ts`
- **Module Exports:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/context/index.ts`
- **Obsidian Source:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/sources/obsidian.ts`
- **UI Component:** `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/AddContextConfirmView.tsx`

---

This system provides a clean separation of concerns: **sources** handle discovery/listing (Obsidian vaults), **manager** handles file operations (copy, tags, sizing), and **indexer** handles persistence (JSON read/write). The unified `ProjectIndex` schema allows future expansion to sessions, plans, and other knowledge types beyond just external context files.