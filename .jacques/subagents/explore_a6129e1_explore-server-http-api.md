# Explore: Explore server HTTP API

> Session: `04de25a7-47d2-4f5e-a72d-a06a72ddfa05`
> Date: 2026-02-02
> Tokens: ~56 181

---

Great! Now I have a complete understanding. Let me compile a comprehensive research report:

## HTTP API Structure Research Report

Based on my exploration of `/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts` and the project modules, here's a complete analysis:

### 1. Overall HTTP API Architecture

**File Location**: `/Users/gole/Desktop/jacques-context-manager/server/src/http-api.ts` (1,236 lines)

**Key Characteristics**:
- Node.js HTTP server using native `http` module
- Runs on port 4243 by default
- Supports CORS for cross-origin requests
- Hybrid static file serving (for GUI) + JSON API
- Server-Sent Events (SSE) for progress streaming on long-running operations
- URL pattern matching using regex for parameterized routes

**Core Helper Functions**:
- `parseBody<T>()` - Async JSON body parsing with error handling
- `sendJson(res, status, data)` - Standardized JSON response with CORS headers
- `handleCors()` - CORS preflight (204 response)
- `serveStaticFile()` - Static file serving with MIME type detection
- `getMimeType()` - File extension to MIME type mapping

### 2. Route Organization & Patterns

The API is organized into 5 logical sections (marked by `=== ... ===` comments):

**Section 1: Source Configuration Routes** (`/api/sources/*`)
- Status checking (GET)
- OAuth configuration for Google Docs and Notion (POST/DELETE)
- Configuration persistence via `JacquesConfig`

**Section 2: Sessions API** (`/api/sessions/*`)
- List all sessions (GET /api/sessions)
- Group by project (GET /api/sessions/by-project)
- Get index statistics (GET /api/sessions/stats)
- Rebuild index with SSE progress (POST /api/sessions/rebuild)
- Get single session (GET /api/sessions/:id)
- Get session badges/metadata (GET /api/sessions/:id/badges)
- Get subagent details (GET /api/sessions/:id/subagents/:agentId)
- Get plan content (GET /api/sessions/:id/plans/:messageIndex)

**Section 3: Archive API** (`/api/archive/*`)
- Archive statistics (GET /api/archive/stats)
- List conversations (GET /api/archive/conversations)
- Group conversations by project (GET /api/archive/conversations/by-project)
- Get conversation details (GET /api/archive/conversations/:id)
- Search conversations (POST /api/archive/search)
- Subagent operations (GET/LIST)
- Archive initialization with SSE progress (POST /api/archive/initialize)

**Section 4: Claude Operations API** (`/api/claude/operations/*`)
- List recent operations (GET /api/claude/operations)
- Get debug data for operation (GET /api/claude/operations/:id/debug)

**Section 5: Static File Serving** (GUI)
- SPA routing fallback to index.html

### 3. Core Endpoint Patterns

#### Pattern A: Simple GET (Configuration Status)
```
Route: GET /api/sources/status
- Fetch config
- Build response object
- sendJson(res, 200, data)
- return
```

#### Pattern B: POST with Body Validation
```
Route: POST /api/sources/google
- parseBody<Type>(req) with async handling
- Validate required fields
- Modify config object
- Save to disk
- sendJson() with success/error
```

#### Pattern C: Parameterized Route (Dynamic ID)
```
Route: GET /api/sessions/:id
- Extract ID from URL using regex: url.match(/^\/api\/sessions\/[^/]+$/)
- Validation check
- Try-catch wrapper for core module calls
- Return appropriate status codes (200/404/500)
- Fallback handling (new sessions not yet in cache)
```

#### Pattern D: Progress Streaming (SSE)
```
Route: POST /api/sessions/rebuild
- Set response headers for SSE: 'text/event-stream'
- Define sendSSE() helper: event + data format
- Call async operation with onProgress callback
- Send 'progress' events during execution
- Send 'complete' or 'error' event at end
- res.end()
```

#### Pattern E: Complex Data Aggregation
```
Route: GET /api/sessions/:id (full session)
- Get metadata from cache (fast)
- Parse JSONL if not in cache (fallback)
- Call getEntryStatistics(entries) for aggregation
- Filter subagents (exclude internal: aprompt_suggestion-*, acompact-*)
- Build response object with nested structure
```

### 4. Interaction with Core Modules

**From `@jacques/core`**:

**Cache Module** (Session indexing - hybrid architecture):
```typescript
getSessionIndex()           // Get cached index
buildSessionIndex(opts)     // Rebuild index (slow, with progress)
getSessionEntry(id)         // Fast metadata lookup
getSessionsByProject()      // Group by project (returns Map)
getCacheIndexStats()        // Index file size stats
parseJSONL(path)           // Read session JSONL file directly
getEntryStatistics()       // Aggregate session statistics
listSubagentFiles()        // Find subagent JSONL files
findSessionById()          // Direct file lookup (bypasses cache)
```

**Archive Module**:
```typescript
getArchiveStats()
listAllManifests()
listManifestsByProject()    // Returns Map<project, ConversationManifest[]>
readManifest(id)
searchConversations(input)
readSubagent()
listSubagentsForSession()
createSubagentReference()
initializeArchive(opts)     // Long-running with progress callback
```

**Session/Parser Module**:
```typescript
parseJSONL(path)           // Returns ParsedEntry[]
getEntryStatistics()       // Calculates token counts, tool calls, etc.
```

**Project Module** (Currently NOT imported in http-api.ts):
```typescript
aggregateProjectStatistics(projectPath, liveSessions)
buildProjectSessionList(projectPath, liveSessions, focusedSessionId)
getProjectPlans(projectPath)
readLocalPlanContent(projectPath, plan)
```

### 5. Response Format Conventions

**Success Response**:
```json
{
  "status": 200,
  "data": { /* varies by endpoint */ }
}
```

**Error Response**:
```json
{
  "status": 400|404|500,
  "error": "Human-readable error message"
}
```

**Empty Session Response**:
```json
{
  "metadata": { /* session entry */ },
  "entries": [],
  "statistics": { /* zeros */ },
  "subagents": [],
  "awaitingFirstResponse": true
}
```

**Badges Response** (Quick metadata):
```json
{
  "planCount": 0,
  "agentCount": 0,
  "agentTypes": { "explore": 0, "plan": 0, "general": 0 },
  "fileCount": 0,
  "mcpCount": 0,
  "webSearchCount": 0,
  "mode": null,
  "hadAutoCompact": false
}
```

### 6. Project Aggregator Functions

**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/project/`

**Types** (`types.ts`):
```typescript
// Aggregated project statistics
ProjectStatistics {
  totalSessions, activeSessions, savedSessions, archivedSessions
  totalInputTokens, totalOutputTokens
  totalAgentCalls, totalWebSearches, totalAutoCompacts
  totalHandoffs, totalPlans
  totalDurationMinutes
  modelUsage: Record<string, number>
}

// Single session item for display
ProjectSessionItem {
  id, title, source: "live" | "saved" | "archived"
  date, durationMinutes, model?, contextPercent?
  isActive, isFocused
}
```

**Aggregator Functions** (`aggregator.ts`):

1. **`aggregateProjectStatistics(projectPath, liveSessions)`**
   - Counts live sessions for project
   - Loads saved sessions from `.jacques/index.json`
   - Loads archived manifests
   - Deduplicates by session ID
   - Counts handoffs in project
   - Returns `ProjectStatistics` object

2. **`buildProjectSessionList(projectPath, liveSessions, focusedSessionId)`**
   - Combines live, saved, archived sessions
   - Deduplicates by session ID (live > saved > archived)
   - Maps to `ProjectSessionItem[]`
   - Sorts by date (newest first)
   - Note: Currently NOT used in http-api.ts

3. **`getProjectPlans(projectPath)`**
   - Reads from `.jacques/index.json`
   - Returns `PlanEntry[]`
   - Sorts by updatedAt (newest first)

4. **`readLocalPlanContent(projectPath, plan)`**
   - Reads plan file from `.jacques/` directory
   - Returns content or null if missing

### 7. Key Architectural Insights

**Hybrid Cache Architecture**:
- Lightweight index stores metadata only (fast, cached in memory)
- Full JSONL files read on-demand (slow, but comprehensive)
- Fallback: direct file lookup bypasses stale cache for new sessions

**Data Source Priority**:
1. Live sessions (active in server)
2. Saved sessions (`.jacques/index.json`)
3. Archived sessions (`~/.jacques/archive/`)

**Session Deduplication**:
- Uses `Set<string>` for seen IDs
- Prevents double-counting across sources
- Maintains data freshness by preferring live > saved > archived

**Internal Agent Filtering**:
- Excludes `aprompt_suggestion-*` and `acompact-*` from user-visible counts
- Important for accurate metrics in badges endpoint

**Error Handling Pattern**:
```typescript
try {
  // Call core module function
  const result = await coreFunction()
  sendJson(res, 200, result)
} catch (error) {
  sendJson(res, 500, { error: 'Friendly message' })
}
return
```

### 8. Gap Analysis: Project Module Integration

**Currently NOT imported**:
- `aggregateProjectStatistics`
- `buildProjectSessionList`
- `getProjectPlans`
- `readLocalPlanContent`

**Potential new endpoints could be**:
- `GET /api/projects/:path/stats` - Project-level statistics aggregation
- `GET /api/projects/:path/sessions` - Unified session list for project
- `GET /api/projects/:path/plans` - Plans for specific project
- `GET /api/projects/:path/plans/:planId` - Plan content

**Would require**:
- URL-decoding project path (dashes to slashes)
- Integration with live sessions from server registry
- Optionally: focused session ID from server state

This completes my comprehensive exploration of the HTTP API structure and project aggregator functions.