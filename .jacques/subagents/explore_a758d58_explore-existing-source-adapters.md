# Explore: Explore existing source adapters

> Session: `a458b85d-3540-4e73-b9bc-9aa4cdef8199`
> Date: 2026-01-31
> Tokens: ~65 373

---

Excellent! Now I have a comprehensive understanding of the codebase. Let me create a summary document of my findings.

## Comprehensive Exploration Report: Jacques Context Manager Adapter Patterns

Based on my thorough exploration of the jacques-context-manager codebase, here's a detailed analysis of the existing source adapter pattern and architecture for integrating Google Docs and Notion adapters.

---

### 1. EXISTING SOURCE ADAPTER PATTERN

#### Location & Structure
- **Core Sources Module**: `/Users/gole/Desktop/jacques-context-manager/core/src/sources/`
- **Dashboard Sources**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/sources/`

#### Architecture: Three-Layer Pattern

```
├── types.ts          # Type definitions for all sources
├── config.ts         # Configuration management (~/.jacques/config.json)
├── index.ts          # Module exports
└── [source-name].ts  # Source-specific implementation (e.g., obsidian.ts)
```

#### Key Types System (`types.ts`)

**Configuration Interface** (`JacquesConfig`):
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

**Generic File Representation**:
```typescript
export interface FileTreeNode {
  id: string;
  name: string;
  type: "folder" | "file";
  depth: number;
  path: string;
  relativePath: string;
  sizeBytes?: number;
  modifiedAt?: Date;
  children?: FileTreeNode[];
  fileCount?: number;
}

export interface FlatTreeItem {
  id: string;
  name: string;
  type: "folder" | "file";
  depth: number;
  path: string;
  relativePath: string;
  sizeBytes?: number;
  modifiedAt?: Date;
  isExpanded?: boolean;
  fileCount?: number;
}
```

---

### 2. OBSIDIAN IMPLEMENTATION REFERENCE

#### Configuration Module (`config.ts`)
**Functions for Obsidian-specific configuration**:
- `getJacquesConfig()` - Read from `~/.jacques/config.json`
- `saveJacquesConfig()` - Write configuration
- `isObsidianConfigured()` - Check if Obsidian is enabled + has vault path
- `configureObsidian(vaultPath: string)` - Set vault path
- `getObsidianVaultPath()` - Retrieve configured vault path

**Pattern**: Generic config functions + source-specific predicates
- Returns `null`/`false` for unconfigured sources
- Always merges with defaults to prevent missing fields
- Stores `enabled`, optional `vaultPath`, and `configuredAt` timestamp

#### Obsidian-Specific Module (`obsidian.ts`)

**Vault Detection**:
```typescript
export async function detectObsidianVaults(): Promise<ObsidianVault[]>
```
- Reads from macOS config: `~/Library/Application Support/obsidian/obsidian.json`
- Parses vault registry (id → {path, open})
- Returns sorted array (open vaults first, then alphabetically)

**File Listing**:
```typescript
export async function listVaultFiles(vaultPath: string): Promise<ObsidianFile[]>
```
- Recursive directory walk (async)
- Filters: only `.md` files, skips hidden dirs (`.obsidian`, `.*`)
- Returns with full + relative paths, size, modification date
- Sorted by modification time (newest first)

**Tree Building**:
```typescript
export function buildFileTree(files: ObsidianFile[]): FileTreeNode[]
export function flattenTree(nodes: FileTreeNode[], expandedFolders: Set<string>): FlatTreeItem[]
```
- Converts flat file list → nested tree structure
- Counts files in each folder recursively
- Sorts folders before files, alphabetically within types
- Flattens respecting expansion state (for UI rendering)

**Helper Functions**:
- `validateVaultPath()` - Check for `.obsidian` directory
- `getVaultName()` - Extract basename from path
- `getVaultFileTree()` - Convenience wrapper (list + build)

---

### 3. GUI & DASHBOARD ARCHITECTURE

#### GUI Structure (`/Users/gole/Desktop/jacques-context-manager/gui/src/`)

**Component Organization**:
```
gui/src/
├── pages/
│   ├── Dashboard.tsx
│   ├── Conversations.tsx
│   ├── Archive.tsx
│   ├── Context.tsx           ← Context/Source management page (placeholder)
│   └── Settings.tsx          ← Source configuration
├── components/
│   ├── Layout.tsx            ← Sidebar with source status indicators
│   ├── ProjectSelector.tsx
│   ├── SessionCard.tsx
│   └── Conversation/
└── hooks/
    ├── useProjectScope.tsx
    └── useJacquesClient.ts
```

**Source Status Display** (`Layout.tsx`):
```typescript
{/* Sources Section */}
<div style={styles.sourcesSection}>
  <div style={styles.sectionHeader}>SOURCES</div>
  <div style={styles.sourceItem}>
    <span style={styles.navIcon}>▸</span>
    <span>Obsidian</span>
    <span style={styles.statusDot}>●</span>  {/* Enabled = filled dot */}
  </div>
  <div style={{ ...styles.sourceItem, color: colors.textMuted }}>
    <span style={styles.navIcon}>▸</span>
    <span>Google Docs</span>
    <span style={{ ...styles.statusDot, color: colors.textMuted }}>○</span> {/* Disabled = empty dot */}
  </div>
  {/* Notion would follow same pattern */}
</div>
```

**Color Palette** (`gui/src/styles/theme/colors.ts`):
- Soft coral accent: `#E67E52`
- Consistent with Jacques Derrida mascot branding
- Used for active elements, status indicators

#### Settings Page Integration
**Current placeholder** (`gui/src/pages/Settings.tsx`):
```typescript
{/* Sources */}
<div style={styles.section}>
  <h2 style={styles.sectionTitle}>Sources</h2>
  <div style={styles.placeholder}>
    Source configuration coming soon
  </div>
</div>
```

**Expected Pattern**:
- Toggle enable/disable per source
- Configuration button (→ URL/credentials form)
- Status badge (not connected / connected)
- List of loaded files per source

#### Context Page Integration
**Current placeholder** (`gui/src/pages/Context.tsx`):
- Shows placeholder for context file management
- Expects to show loaded context files with source attribution
- File browser tree view (similar to Obsidian)

---

### 4. CONFIGURATION & PERSISTENCE

#### Config Storage Pattern
**Location**: `~/.jacques/config.json`
**Format**: JSON with semantic versioning
```json
{
  "version": "1.0.0",
  "sources": {
    "obsidian": {
      "enabled": true,
      "vaultPath": "/Users/test/Documents/MyVault",
      "configuredAt": "2026-01-31T12:00:00Z"
    },
    "googleDocs": {
      "enabled": false
    },
    "notion": {
      "enabled": false
    }
  }
}
```

**Management Functions**:
1. `getJacquesConfig()` - Reads + merges with defaults
2. `saveJacquesConfig(config)` - Writes with pretty-printing
3. Source-specific predicates: `isObsidianConfigured()` etc.
4. Source-specific setters: `configureObsidian(vaultPath)` etc.

**Error Handling**: 
- Missing config file → returns defaults
- Corrupted JSON → returns defaults
- Directory creation → automatic (recursive: true)

---

### 5. TESTING PATTERNS

#### Test Files Location
- **Config tests**: `dashboard/src/sources/config.test.ts`
- **Obsidian tests**: `dashboard/src/sources/obsidian.test.ts`

#### Testing Strategy: Jest with Module Mocking

**Config Tests** (44 tests):
```typescript
jest.unstable_mockModule("fs", () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));
```

**Test Coverage**:
- Default config when file missing
- Parse existing config files
- Handle corrupted JSON gracefully
- Directory creation logic
- JSON serialization with formatting
- Source-specific predicates

**Obsidian Tests** (37 tests across 6 describe blocks):
1. `detectObsidianVaults` - Parse config, sort, handle missing data
2. `validateVaultPath` - Check `.obsidian` directory existence
3. `listVaultFiles` - Recursive walk, filtering, relative paths
4. `getVaultName` - Basename extraction
5. `buildFileTree` - Tree structure, sorting, counting
6. `flattenTree` - Flattening with expansion state, depth tracking

**Key Testing Pattern**: Mock fs at module level, verify behavior, handle edge cases

---

### 6. CONTEXT MANAGEMENT INTEGRATION

#### Project Index Structure (`core/src/context/types.ts`)
```typescript
export interface ProjectIndex {
  version: string;
  updatedAt: string;
  context: ContextFile[];        // Imported files
  sessions: SessionEntry[];      // Saved conversations
  plans: PlanEntry[];            // Implementation plans
}

export interface ContextFile {
  id: string;
  name: string;
  path: string;                  // Relative: .jacques/context/filename.md
  source: ContextSource;         // "obsidian" | "google_docs" | "notion" | "local"
  sourceFile: string;            // Original file path
  addedAt: string;
  description?: string;
  sizeBytes: number;
  tags?: string[];
}

export type ContextSource = "obsidian" | "google_docs" | "notion" | "local";
```

#### Adding Context Files (`core/src/context/manager.ts`)
```typescript
export async function addContext(options: AddContextOptions): Promise<ContextFile>
```

**Process**:
1. Copy file to `.jacques/context/{id}.md`
2. Extract tags from YAML frontmatter or inline `#tags`
3. Create index entry with metadata
4. Store in project `.jacques/index.json`

**Supports**:
- Frontmatter YAML parsing (tags, tag)
- Relative path tracking
- File size and modification time
- Token counting (tiktoken with fallback)

---

### 7. STORAGE ARCHITECTURE

#### File Organization
```
~/.jacques/
├── config.json                           # Global source configuration
├── archive/                              # Cross-project archive
│   ├── index.json                        # Search index
│   ├── manifests/                        # Conversation metadata
│   └── conversations/[project]/          # Conversation files
└── handoffs/                             # Session continuation files

[project]/.jacques/
├── index.json                            # Project context + sessions + plans
├── context/                              # Imported context files
│   ├── auth-flow.md
│   ├── api-design.md
│   └── ...
└── archive/                              # Local archive
    └── index.json
```

---

### 8. MODULE EXPORT PATTERNS

#### Core Module (`core/src/index.ts`)
**Exports are organized by module with aliases to avoid conflicts**:

```typescript
// Sources module exports
export {
  getDefaultConfig,
  saveJacquesConfig,
  isObsidianConfigured,
  configureObsidian,
  getObsidianVaultPath,
  detectObsidianVaults,
  validateVaultPath,
  listVaultFiles,
  // ...
} from "./sources/index.js";

// With aliases for conflicting names
export { getJacquesConfig as getSourcesJacquesConfig } from "./sources/index.js";
```

**Dashboard Module Exports** (`dashboard/src/sources/index.ts`):
```typescript
export type {
  JacquesConfig,
  ObsidianSourceConfig,
  ObsidianVault,
  ObsidianFile,
  FileTreeNode,
  FlatTreeItem,
} from "./types.js";

export { getDefaultConfig } from "./types.js";

export {
  getJacquesConfig,
  saveJacquesConfig,
  isObsidianConfigured,
  configureObsidian,
  getObsidianVaultPath,
} from "./config.js";

export {
  detectObsidianVaults,
  validateVaultPath,
  listVaultFiles,
  getVaultName,
  buildFileTree,
  flattenTree,
  getVaultFileTree,
} from "./obsidian.js";
```

---

### 9. KEY PATTERNS FOR GOOGLE DOCS & NOTION ADAPTERS

#### What Must Be Implemented for Each New Source

**1. Type Definitions** (extend `types.ts`):
```typescript
export interface GoogleDocsSourceConfig {
  enabled: boolean;
  authenticated?: boolean;
  refreshToken?: string;  // OAuth token storage pattern
  configuredAt?: string;
}

export interface GoogleDocsFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: Date;
  sizeBytes?: number;
  // Different from Obsidian: no local path
}
```

**2. Configuration Functions** (new file like `config.ts`):
```typescript
export function isGoogleDocsConfigured(): boolean { }
export function configureGoogleDocs(refreshToken: string): boolean { }
export function getGoogleDocsAuthToken(): string | null { }
// Authentication flow specific to OAuth
```

**3. Source-Specific Module** (new file like `obsidian.ts`):
```typescript
export async function listGoogleDocFiles(): Promise<GoogleDocsFile[]> { }
export async function getDocumentContent(docId: string): Promise<string> { }
// API-specific operations
```

**4. Integration Points**:
- Add to `JacquesConfig.sources`
- Add to `ContextSource` type union
- Implement source predicates in `config.ts`
- Export from `index.ts`
- Add UI status indicators in `Layout.tsx`
- Add Settings.tsx configuration UI
- Add tests following Obsidian test patterns

---

### 10. IMPORTANT ARCHITECTURAL DECISIONS

#### Key Conventions Observed

1. **File Type Consistency**: All sources export a `FileTreeNode` interface for UI compatibility
2. **Async Operations**: File system operations are async (matches Node.js fs promises API)
3. **Tree Building**: Generic tree structure + flattening logic is reusable across sources
4. **Configuration Merging**: Always merge read config with defaults to prevent undefined errors
5. **Error Handling**: Fail gracefully (return empty array/false) rather than throwing
6. **Lazy Loading**: Avoid requiring heavy dependencies at module load time
7. **Test Mocking**: Mock at module level (jest.unstable_mockModule) for clean test isolation
8. **Type Safety**: Strict interfaces with optional fields for source-specific data
9. **Default Values**: Source placeholders in defaults prevent undefined config sections
10. **Timestamps**: ISO-8601 format for `configuredAt` and file modification times

---

### 11. SUMMARY TABLE: Current vs. Expected States

| Aspect | Current State | Pattern for Adapters |
|--------|---------------|----------------------|
| **Config Types** | JacquesConfig defined, Obsidian implemented | Add GoogleDocsSourceConfig, NotionSourceConfig |
| **Config Functions** | isObsidianConfigured(), configureObsidian() | Create analogues: isGoogleDocsConfigured(), etc. |
| **File Detection** | detectObsidianVaults() reads system config | API-specific: OAuth flow, Google Drive search |
| **File Listing** | listVaultFiles() walks directories | API calls: docs.list(), documents.get() |
| **Tree Building** | buildFileTree() is generic, reusable | Reuse same function, adapt file format |
| **UI Status** | Layout.tsx shows Obsidian status | Add Google Docs and Notion status dots |
| **Settings Page** | Placeholder "coming soon" | Implement auth flows, token management |
| **Context Page** | Placeholder for file browser | Implement file selection from each source |
| **Testing** | 81 tests for Obsidian/config | Follow same mocking patterns for new sources |

---

### 12. FILE PATHS - ABSOLUTE REFERENCES

**Core Sources**:
- `/Users/gole/Desktop/jacques-context-manager/core/src/sources/types.ts`
- `/Users/gole/Desktop/jacques-context-manager/core/src/sources/config.ts`
- `/Users/gole/Desktop/jacques-context-manager/core/src/sources/obsidian.ts`
- `/Users/gole/Desktop/jacques-context-manager/core/src/sources/index.ts`

**Dashboard Sources**:
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/sources/types.ts`
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/sources/config.ts`
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/sources/obsidian.ts`
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/sources/index.ts`

**Tests**:
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/sources/config.test.ts`
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/sources/obsidian.test.ts`

**GUI Integration**:
- `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Context.tsx`
- `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Settings.tsx`
- `/Users/gole/Desktop/jacques-context-manager/gui/src/components/Layout.tsx`

**Context Management**:
- `/Users/gole/Desktop/jacques-context-manager/core/src/context/types.ts`
- `/Users/gole/Desktop/jacques-context-manager/core/src/context/manager.ts`

---

This comprehensive exploration provides a clear roadmap for implementing Google Docs and Notion adapters while maintaining consistency with the existing Obsidian pattern.