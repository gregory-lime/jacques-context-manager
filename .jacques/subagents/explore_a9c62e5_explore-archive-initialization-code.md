# Explore: Explore archive initialization code

> Session: `942354f0-bd46-4a92-aa5a-798d94c3237e`
> Date: 2026-02-01
> Tokens: ~67 498

---

Perfect! Now I have all the information I need. Let me create a comprehensive investigation report:

## Archive Initialization Flow - Comprehensive Investigation

Based on my thorough code analysis, here's the complete flow and findings:

### 1. GUI Code: Button Click Handler
**File**: `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Archive.tsx`

Lines 391-412 define the `handleInitialize` function:
```typescript
const handleInitialize = () => {
  setIsInitializing(true);
  setInitProgress(null);
  setInitResult(null);

  initializeArchive({
    onProgress: (progress) => {
      setInitProgress(progress);
    },
    onComplete: (result) => {
      setInitResult(result);
      setIsInitializing(false);
      loadArchiveData();
    },
    onError: (errorMsg) => {
      setError(errorMsg);
      setIsInitializing(false);
    },
  });
};
```

The UI shows progress with the "skipped" count displayed at line 510-512:
```typescript
{initProgress.skipped > 0 && (
  <span style={styles.progressSkipped}>Skipped: {initProgress.skipped}</span>
)}
```

---

### 2. API Client: Streaming Implementation
**File**: `/Users/gole/Desktop/jacques-context-manager/gui/src/api/config.ts`

Lines 264-325 define the `initializeArchive` function which:
- Makes a POST request to `/api/archive/initialize`
- Uses **Server-Sent Events (SSE)** for streaming progress updates
- Parses events for `progress`, `complete`, and `error` types
- Passes updates to callback functions

The function returns an abort controller to allow cancellation.

---

### 3. Server Endpoint: HTTP API Handler
**File**: `/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts`

Lines 480-509 define the POST `/api/archive/initialize` endpoint:
```typescript
if (method === 'POST' && url === '/api/archive/initialize') {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const sendSSE = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await initializeArchive({
      saveToLocal: false,
      onProgress: (progress) => {
        sendSSE('progress', progress);
      },
    });
    sendSSE('complete', result);
    res.end();
  } catch (error) {
    sendSSE('error', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.end();
  }
}
```

Key observation: **`saveToLocal: false`** - only saves to global archive, not to local project directories.

---

### 4. Core Archive Logic: Bulk Archiving
**File**: `/Users/gole/Desktop/jacques-context-manager/core/src/archive/bulk-archive.ts`

The `initializeArchive` function (lines 190-267) performs a two-phase operation:

**Phase 1: Scanning** (lines 205-220)
- Calls `listAllSessions()` to find all `.jsonl` files in `~/.claude/projects/`
- Sends initial progress event

**Phase 2: Archiving** (lines 225-254)
- Iterates through all sessions
- For each session:
  1. Checks if already archived using `listManifests()` (lines 238-242)
  2. If already archived: **skips it** and increments `result.skipped`
  3. If not archived: calls `archiveSessionFile()` to process it

---

### 5. Why 69 Documents Are Skipped

**Root Cause**: The `initializeArchive` function checks `archivedIds` (line 223):
```typescript
const archivedIds = new Set(await listManifests());
```

This set contains all session IDs that have **already been archived**. A session is considered "already archived" if:
- Its manifest file exists in `~/.jacques/archive/manifests/{sessionId}.json`

The skip logic (lines 238-242):
```typescript
if (archivedIds.has(session.sessionId)) {
  result.skipped++;
  continue;
}
```

**Your 69 skipped documents** means:
- You have 69 sessions in `~/.claude/projects/` that have already been archived
- These were likely archived from:
  - Previous runs of "Initialize Archive"
  - Manual "Save Context" actions
  - Auto-archiving (if enabled)

---

### 6. What Actually Gets Archived

When a session is NOT already archived, `archiveSessionFile()` is called (lines 139-184):

1. **Parses the JSONL file** (line 145)
2. **Extracts manifest** metadata (lines 152-156)
3. **Applies filter** - always uses `FilterType.WITHOUT_TOOLS` (line 159)
4. **Transforms to SavedContext** format (lines 160-170)
5. **Archives conversation** via `archiveConversation()` (line 173-175)

The archiving process stores:
1. **Manifest**: `~/.jacques/archive/manifests/{sessionId}.json` (~1-2KB metadata)
2. **Conversation**: `~/.jacques/archive/conversations/{projectSlug}/{filename}.json` (full content)
3. **Search Index**: `~/.jacques/archive/index.json` (updated with keywords)
4. **Plans**: `~/.jacques/archive/plans/{projectSlug}/` (if any plans referenced)

---

### 7. Storage Location & Structure

**File**: `/Users/gole/Desktop/jacques-context-manager/core/src/archive/archive-store.ts`

Archive directory structure (`~/.jacques/archive/`):
```
~/.jacques/archive/
├── index.json                           # Search index (inverted keywords)
├── manifests/
│   ├── {sessionId1}.json               # Lightweight metadata (~1-2KB each)
│   ├── {sessionId2}.json
│   └── ...
├── conversations/
│   ├── {projectSlug}/
│   │   ├── YYYY-MM-DD_HH-MM_title_id.json
│   │   ├── YYYY-MM-DD_HH-MM_title_id.json
│   │   └── ...
│   └── {otherProject}/
├── plans/
│   ├── {projectSlug}/
│   │   ├── YYYY-MM-DD_plan-title.md
│   │   └── ...
│   └── ...
└── context/
    └── (empty, for future use)
```

**Manifest content** (ConversationManifest interface, types.ts lines 26-64):
- `id`: Session UUID
- `projectSlug`: Project name
- `title`: Claude's auto-generated summary
- `startedAt`, `endedAt`: Timestamps
- `userQuestions`: Searchable user messages
- `filesModified`: Array of file paths
- `technologies`: Detected tech stack
- `messageCount`, `toolCallCount`: Statistics
- `plans`: Array of plan file references
- Plus metadata for archiving

---

### 8. The "Why Initialize Archive Does Little" Issue

The button appears to do "not much" because:

1. **Most sessions already archived**: If you've clicked "Initialize Archive" before or used "Save Context" frequently, most sessions are already in the manifests directory
2. **Only counts newly archived**: The result shows only newly archived sessions, not the total
3. **No visual indication of duplicates**: The UI doesn't clearly explain that "69 skipped" means "already archived"
4. **No local save**: The server endpoint uses `saveToLocal: false`, so it doesn't save to project `.jacques/` directories

**Improvement suggestions**:
- The result banner should say something like: "Archive initialized: X new, 69 already archived" instead of just "69 skipped"
- Add a button to "Re-initialize" that forces re-archiving
- Show which projects have how many archived conversations

---

### 9. How Sessions Are Identified

Sessions are tracked by:
- **Session ID**: Filename (without `.jsonl`) from `~/.claude/projects/[encoded-path]/[sessionId].jsonl`
- **Project slug**: Directory basename (e.g., `jacques-context-manager`)
- **Project path**: Decoded from the encoded directory name (e.g., `/Users/gole/Desktop/jacques-context-manager`)

Example from `bulk-archive.ts`:
```typescript
const sessionId = entry.name.replace(".jsonl", "");
sessions.push({
  filePath,
  sessionId,
  projectPath: project.projectPath,
  projectSlug: project.projectSlug,
  modifiedAt: stats.mtime,
  sizeBytes: stats.size,
});
```

---

### 10. Key Code Locations Summary

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| GUI Button Handler | `gui/src/pages/Archive.tsx` | 391-412 | Triggers archiving |
| API Client (SSE) | `gui/src/api/config.ts` | 264-325 | Streams progress |
| Server Endpoint | `server/src/http-api.ts` | 480-509 | HTTP handler |
| Core Logic | `core/src/archive/bulk-archive.ts` | 190-267 | Scans & archives |
| Skipping Logic | `core/src/archive/bulk-archive.ts` | 238-242 | Checks `archivedIds` |
| Storage | `core/src/archive/archive-store.ts` | 27, 114-116 | `~/.jacques/archive/` |
| Types | `core/src/archive/types.ts` | 243-256 | `SessionFileInfo` interface |

---

### Summary

The archive initialization system:
1. ✅ Scans all Claude Code sessions from `~/.claude/projects/`
2. ✅ Checks which ones are already archived (by manifest existence)
3. ✅ **Skips already-archived sessions** (your 69 documents)
4. ✅ Archives new sessions with manifest + conversation + index update
5. ✅ Streams progress via SSE to the GUI
6. ⚠️ Only saves to global archive (`~/.jacques/archive/`), not local projects
7. ⚠️ Always filters with `WITHOUT_TOOLS` (loses tool call details)

The "doesn't do much" feeling likely comes from having most sessions already archived from previous runs or manual saves.