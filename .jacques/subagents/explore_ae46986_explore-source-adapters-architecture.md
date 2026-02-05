# Explore: Explore source adapters architecture

> Session: `c113e71d-f804-4875-b8a5-956015ed3948`
> Date: 2026-01-31
> Tokens: ~50 735

---

Perfect! Now I have a comprehensive understanding of the LoadContext source adapter architecture. Let me compile my findings into a detailed report.

## Detailed Findings: LoadContext Source Adapter Architecture

### 1. Overall Architecture Overview

The LoadContext system uses a **modular, extensible source adapter pattern** that decouples external source integration from the core dashboard. Here's the high-level structure:

```
dashboard/src/sources/
├── types.ts        # Type definitions for config and source data
├── config.ts       # Configuration management (~/.jacques/config.json)
├── obsidian.ts     # Obsidian vault implementation (fully functional)
├── index.ts        # Module exports (no adapters for Google Docs/Notion yet)
└── tests/          # Comprehensive test coverage (30 tests total)
```

### 2. Core Type System (`dashboard/src/sources/types.ts`)

The architecture defines several key interfaces:

**Global Configuration Interface:**
```typescript
export interface JacquesConfig {
  version: string;
  sources: {
    obsidian?: ObsidianSourceConfig;
    googleDocs?: { enabled: boolean };
    notion?: { enabled: boolean };
  };
}
```

**Obsidian-Specific Configuration:**
```typescript
export interface ObsidianSourceConfig {
  enabled: boolean;
  vaultPath?: string;           // Path to vault on disk
  configuredAt?: string;        // ISO timestamp when configured
}
```

**Detected Vault Information:**
```typescript
export interface ObsidianVault {
  id: string;                   // Unique ID from obsidian.json
  path: string;                 // Full filesystem path
  name: string;                 // Vault name (from basename)
  isOpen?: boolean;             // Whether vault is currently open in Obsidian
}
```

**File Representation:**
```typescript
export interface ObsidianFile {
  path: string;                 // Full absolute path
  relativePath: string;         // Relative to vault root
  name: string;                 // Filename without .md extension
  sizeBytes: number;
  modifiedAt: Date;
}
```

**File Tree Structure (for UI rendering):**
```typescript
export interface FileTreeNode {
  id: string;                   // Unique ID for the node
  name: string;                 // Display name
  type: "folder" | "file";
  depth: number;                // Nesting level (0 = root)
  path: string;
  relativePath: string;
  sizeBytes?: number;           // Files only
  modifiedAt?: Date;            // Files only
  children?: FileTreeNode[];    // Folders only
  fileCount?: number;           // Folders only - recursive count
}
```

**Flattened Tree Item (for rendering with expansion state):**
```typescript
export interface FlatTreeItem {
  id: string;
  name: string;
  type: "folder" | "file";
  depth: number;
  path: string;
  relativePath: string;
  sizeBytes?: number;
  modifiedAt?: Date;
  isExpanded?: boolean;         // Folder expansion state
  fileCount?: number;
}
```

### 3. Configuration System (`dashboard/src/sources/config.ts`)

**File Location:** `~/.jacques/config.json` (in user's home directory)

**Key Functions:**

- **`getJacquesConfig()`** - Reads configuration from file, returns defaults if missing or corrupted
- **`saveJacquesConfig(config)`** - Writes configuration to file, creates ~/.jacques directory if needed
- **`isObsidianConfigured()`** - Checks if Obsidian is enabled AND has a valid vault path
- **`configureObsidian(vaultPath)`** - Sets vault path, enables Obsidian, records timestamp
- **`getObsidianVaultPath()`** - Returns vault path if configured, null otherwise

**Error Handling:** All file operations are wrapped in try-catch blocks that gracefully return defaults on failure.

**Default Configuration Schema:**
```json
{
  "version": "1.0.0",
  "sources": {
    "obsidian": { "enabled": false },
    "googleDocs": { "enabled": false },
    "notion": { "enabled": false }
  }
}
```

**Merge Strategy:** Configuration merges parsed values with defaults, ensuring all expected fields always exist (defensive programming).

### 4. Obsidian Adapter Implementation (`dashboard/src/sources/obsidian.ts`)

The Obsidian adapter is **fully implemented** and demonstrates the expected pattern for other sources.

**Key Implementation Details:**

**Vault Detection (`detectObsidianVaults()`):**
- Reads from macOS Obsidian config: `~/Library/Application Support/obsidian/obsidian.json`
- Parses vault registry from Obsidian's own configuration
- Returns empty array gracefully if Obsidian not installed
- Sorts by open status (open vaults first) then alphabetically
- Uses async function but I/O is actually sync (reads existing config file)

**Vault Validation (`validateVaultPath()`):**
- Checks for `.obsidian/` subdirectory to confirm it's a real vault
- Validates both vault path and `.obsidian` folder existence

**File Listing (`listVaultFiles()`):**
- Recursive async walk of vault directory
- Only includes `.md` files
- Skips all hidden directories (prefixed with `.`)
- Excludes `.obsidian` metadata folder
- Returns files sorted by modification time (most recent first)
- Includes both absolute and relative paths

**Tree Building (`buildFileTree()`):**
- Converts flat file list into hierarchical tree structure
- Uses nested Map builder pattern for O(n) complexity
- Automatically creates folder nodes for nested paths
- Sorts at each level: folders before files, then alphabetically
- Counts files recursively in each folder

**Tree Flattening (`flattenTree()`):**
- Respects folder expansion state (passed as Set of expanded IDs)
- Maintains depth information for UI indentation
- Returns flattened list suitable for scrollable rendering
- Files only visible when parent folders are expanded

**Composite Function:**
```typescript
export async function getVaultFileTree(vaultPath: string): Promise<FileTreeNode[]>
```
- Convenience function that chains `listVaultFiles()` → `buildFileTree()`

### 5. Context Integration (`dashboard/src/context/manager.ts`)

The context manager bridges external sources to project-specific storage:

**File Organization:**
```
.jacques/
├── context/           # Imported context files (per-project)
│   ├── auth-flow.md
│   ├── database-schema.md
│   └── ...
└── index.json         # Project index with metadata about all files
```

**Adding Context:**
```typescript
export async function addContext(options: AddContextOptions): Promise<ContextFile>
```
- Copies source file to `.jacques/context/[sanitized-name].md`
- Extracts metadata (tags from YAML frontmatter, file size)
- Generates unique ID: `slugified-name-randomhex`
- Updates project index with metadata
- Supports tags extraction from both frontmatter and inline #hashtags

**Context File Entry Structure:**
```typescript
export interface ContextFile {
  id: string;                   // Unique identifier
  name: string;                 // Display name
  path: string;                 // Relative path in .jacques/context/
  source: ContextSource;        // "obsidian" | "google_docs" | "notion" | "local"
  sourceFile: string;           // Original file path (before copying)
  addedAt: string;              // ISO timestamp
  description?: string;         // User-provided description
  sizeBytes: number;            // File size
  tags?: string[];              // Extracted tags
}
```

**Unified Project Index (`.jacques/index.json`):**
```typescript
export interface ProjectIndex {
  version: string;
  updatedAt: string;
  context: ContextFile[];       // Imported external context
  sessions: SessionEntry[];     // Saved conversations
  plans: PlanEntry[];           // Implementation plans
}
```

### 6. Component Integration (UI)

Two main components use the sources system:

**`LoadContextView` Component:**
- First screen when user selects "Load Context" from main menu
- Shows two options:
  1. "Load from saved conversations" (enabled: false, marked "soon")
  2. "Load from other sources" (enabled: true)
- Uses same bordered layout with mascot as main dashboard

**`SourceSelectionView` Component:**
- Second screen when user selects "Load from other sources"
- Displays list of available sources with status:
  ```
  > Obsidian              ● Connected
    Google Docs           (coming soon)
    Notion                (coming soon)
  ```
- Buildable source items list with helper function `buildSourceItems(isObsidianConnected)`

### 7. Placeholder Code for Google Docs & Notion

**Current State:**
- No implementation files exist for Google Docs or Notion adapters
- Configuration structure is prepared in `types.ts`:
  ```typescript
  googleDocs?: { enabled: boolean };
  notion?: { enabled: boolean };
  ```
- UI components marked as disabled: `enabled: false` in `SourceSelectionView`
- UI shows "(coming soon)" badge for these sources

**Expected Pattern for Future Implementation:**

Based on the Obsidian adapter, future adapters would follow:

1. **Configuration Interface** (in `types.ts`):
   ```typescript
   export interface GoogleDocsSourceConfig {
     enabled: boolean;
     apiKey?: string;          // or OAuth token
     folderId?: string;        // Drive folder ID
     configuredAt?: string;
   }
   ```

2. **Detection & Authentication** (new file `googledocs.ts`):
   ```typescript
   export async function detectGoogleDocsConnection(): Promise<boolean>
   export async function authenticateGoogleDocs(apiKey: string): Promise<boolean>
   export async function listGoogleDocsFolders(): Promise<GoogleDocsFolder[]>
   ```

3. **File Operations**:
   ```typescript
   export async function listDocumentsInFolder(folderId: string): Promise<GoogleDocsFile[]>
   export async function downloadDocument(docId: string): Promise<string>
   ```

4. **Config Functions** (extend `config.ts`):
   ```typescript
   export function isGoogleDocsConfigured(): boolean
   export function configureGoogleDocs(apiKey: string, folderId: string): boolean
   ```

5. **Export in `index.ts`**:
   ```typescript
   export { detectGoogleDocsConnection, listDocumentsInFolder, ... } from "./googledocs.js"
   ```

### 8. Testing Patterns

**Config Module Tests** (5 tests):
- Default config creation when file missing
- Parsing existing config files
- Error handling for corrupted JSON
- Directory creation
- Configuration writing and validation

**Obsidian Module Tests** (25+ tests):
- Vault detection from Obsidian config
- Vault path validation
- File listing (markdown files only, no hidden directories)
- Nested file discovery
- Tree building and sorting
- Tree flattening with expansion state
- Edge cases (empty vault, missing .obsidian, corrupted config)

**Test Coverage:** ~78 tests total across sources and context modules

### 9. Key Code Patterns & Design Decisions

**Error Resilience:**
- All async operations wrapped in try-catch
- Graceful degradation (returns empty array/false on errors)
- No exceptions thrown to caller

**Lazy-Loaded Dependencies:**
- tiktoken encoder loaded on first use
- Fallback to character-based estimation if unavailable

**Path Handling:**
- Uses `path.join()` for cross-platform compatibility
- Maintains both absolute and relative paths
- Sanitizes filenames for safe filesystem use

**Tree Structure:**
- Nested Map builder pattern (O(n) complexity)
- Folder expansion state is UI concern, not data model
- File count computed recursively for UI hints

**Configuration Merging:**
- Parsed config merged with defaults
- Ensures all fields always exist
- Handles partial config gracefully

---

**Summary:** The LoadContext architecture is well-designed with clear separation of concerns: types define contracts, config manages global settings, adapters implement source-specific logic, and the context manager handles per-project integration. Google Docs and Notion are architecturally ready but awaiting implementation. The Obsidian adapter serves as an excellent template for future sources.