# Explore: Find path normalization patterns

> Session: `eb1a87a2-a33d-4aa4-a580-f36814767d8f`
> Date: 2026-02-03
> Tokens: ~76 956

---

Perfect! I now have comprehensive information. Let me compile the findings:

## Summary: Project Path Normalization and Deduplication

I've found the existing code that handles exactly what you're asking about. Here's how the system works:

### Key Architecture

**File Locations:**
- Main implementation: `/Users/gole/Desktop/jacques-context-manager/core/src/session/detector.ts`
- Tests with examples: `/Users/gole/Desktop/jacques-context-manager/core/src/session/detector.test.ts`
- Session indexing: `/Users/gole/Desktop/jacques-context-manager/core/src/cache/session-index.ts`
- Archive migration: `/Users/gole/Desktop/jacques-context-manager/core/src/archive/migration.ts`
- Manifest extraction: `/Users/gole/Desktop/jacques-context-manager/core/src/archive/manifest-extractor.ts`
- HTTP API usage: `/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts`

### How Path Normalization Works

#### 1. **Encoding** (path → directory name)
Claude Code encodes filesystem paths to directory names by replacing `/` with `-`:
- `/Users/gole/Desktop/jacques-context-manager` → `-Users-gole-Desktop-jacques-context-manager`

Located in `encodeProjectPath()` at line 42 of detector.ts:
```typescript
export function encodeProjectPath(dirPath: string): string {
  const normalized = path.normalize(dirPath);
  return normalized.replace(/\//g, "-");
}
```

#### 2. **Naive Decoding** (directory name → path, unreliable)
Simple reversal that treats all dashes as separators:
```typescript
export function decodeProjectPathNaive(encodedDir: string): string {
  if (!encodedDir.startsWith("-")) {
    return encodedDir;
  }
  return "/" + encodedDir.slice(1).split("-").join("/");
}
```

**Problem**: This breaks for paths containing dashes or underscores:
- `-Users-gole-Desktop-jacques-context-manager` → `/Users/gole/Desktop/jacques/context/manager` ❌
- Should be: `/Users/gole/Desktop/jacques-context-manager` ✅

#### 3. **Authoritative Decoding** (using `sessions-index.json`)
The **only reliable way** to decode is to read the `originalPath` field from `sessions-index.json`, which Claude Code stores in each project directory.

Located in `readOriginalPath()` at line 53 of detector.ts:
```typescript
async function readOriginalPath(
  encodedDir: string,
  claudeProjectsDir?: string
): Promise<string | null> {
  const claudeDir =
    claudeProjectsDir || path.join(os.homedir(), ".claude", "projects");
  const indexPath = path.join(claudeDir, encodedDir, "sessions-index.json");
  try {
    const content = await fs.readFile(indexPath, "utf-8");
    const data = JSON.parse(content);
    return typeof data.originalPath === "string" ? data.originalPath : null;
  } catch {
    return null;
  }
}
```

The public `decodeProjectPath()` function (line 86) **always prefers the authoritative source**:
```typescript
export async function decodeProjectPath(
  encodedDir: string,
  claudeProjectsDir?: string
): Promise<string> {
  const original = await readOriginalPath(encodedDir, claudeProjectsDir);
  return original || decodeProjectPathNaive(encodedDir);  // fallback only if unavailable
}
```

### Real-World Examples from Tests

**Example 1: Project with dashes in name**
```
Encoded: -Users-gole-Desktop-jacques-context-manager
Original Path (from sessions-index.json): /Users/gole/Desktop/jacques-context-manager
Decoding Result: /Users/gole/Desktop/jacques-context-manager ✅
```

**Example 2: Project with underscores (encoded as dashes)**
```
Encoded: -Users-gole-Desktop-marriage-story
Original Path: /Users/gole/Desktop/marriage_story
Decoding Result: /Users/gole/Desktop/marriage_story ✅
```

Test code at line 115-129 in detector.test.ts demonstrates this.

### Deduplication System

The system uses three pieces of data to **deduplicate and normalize** projects:

| Field | Purpose | Example |
|-------|---------|---------|
| **`projectId`** | Encoded full path (unique identifier) | `-Users-gole-Desktop-jacques-context-manager` |
| **`projectPath`** | Decoded full filesystem path | `/Users/gole/Desktop/jacques-context-manager` |
| **`projectSlug`** | Human-readable project name (basename) | `jacques-context-manager` |

Located in session-index.ts (lines 41-44):
```typescript
/** Decoded project path (e.g., "/Users/gole/Desktop/my-project") */
projectPath: string;
/** Project name (basename of project path) */
projectSlug: string;
```

### How Deduplication Works Across the System

**1. Session Indexing** (session-index.ts, line 643-644)
```typescript
const projectPath = await decodeProjectPath(entry.name);
const projectSlug = path.basename(projectPath);
```

**2. Session Grouping** (session-index.ts, line 803)
```typescript
const existing = byProject.get(session.projectSlug) || [];
existing.push(session);
byProject.set(session.projectSlug, existing);
```
Sessions are grouped by `projectSlug` (the readable name).

**3. Archive Manifests** (manifest-extractor.ts)
```typescript
const projectId = projectPath.replace(/\//g, "-");
const projectSlug = path.basename(projectPath);
```
Manifests store both the encoded `projectId` and readable `projectSlug`.

**4. Archive Storage Path** (http-api.ts, lines 1103-1109)
```typescript
const archivePath = join(
  homedir(),
  '.jacques',
  'archive',
  'conversations',
  manifest.projectId || manifest.projectSlug  // Falls back for old data
);
```
Uses `projectId` (encoded) for storage, with fallback to `projectSlug`.

### Migration System

The codebase includes automatic migration (migration.ts) to handle projects with dashes/underscores:

**`migrateProjectPaths()`** (line 177):
- Re-decodes each manifest's `projectId` using the authoritative `decodeProjectPath()`
- Updates stored `projectPath` and `projectSlug` to correct values
- This ensures "jacques/context/manager" never gets confused with "jacques-context-manager"

### Key Insight

The system prevents collisions through:
1. **Primary key**: `projectId` (encoded path) - guaranteed unique, even if two projects have names that look similar
2. **Display name**: `projectSlug` (basename) - human-readable
3. **Full path recovery**: `projectPath` - stored explicitly for accurate reconstruction when migration is needed
4. **Authoritative source**: `sessions-index.json` - Claude Code's own file that guarantees correct decoding

This prevents the "marriage/story" vs "marriage_story" problem because both encode to `-...-marriage-story`, but when decoded they produce different `projectPath` values (`/path/to/marriage_story` vs `/path/to/marriage/story`), which are then used as the source of truth.