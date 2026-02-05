# Explore: Explore archive codebase

> Session: `21ea55e2-80bc-4adb-bf99-47e013418abf`
> Date: 2026-02-01
> Tokens: ~57 660

---

Perfect! Let me create a comprehensive summary document for you:

## Archive-Related Code Summary

Based on my thorough exploration of the codebase, here's a detailed understanding of the archive system and related components:

---

### **1. Archive Types (`core/src/archive/types.ts`)**

**Key Interfaces:**

- **`ConversationManifest`** (lines 26-64): Lightweight metadata (~1-2KB) for a conversation including:
  - Session ID, project info, timestamps
  - `userQuestions`: Truncated user messages (max 200 chars each)
  - `filesModified`: Write/Edit tool paths
  - `toolsUsed`: List of tools used
  - `technologies`: Auto-detected tech stack (React, TypeScript, etc.)
  - `plans`: Array of `PlanReference` objects
  - `messageCount`, `toolCallCount`, and optional `contextSnippets`

- **`PlanReference`** (lines 11-20): References to plan files with:
  - `source: "embedded" | "write"` - detection method
  - Path, name, and archivedPath

- **`SearchIndex`** (lines 93-111): Inverted keyword index with:
  - `keywords`: Maps keyword → `IndexReference[]` with scores
  - `projects`: Maps project slug → `ProjectInfo`
  - Metadata for total conversations and keywords

- **`SearchInput`/`SearchOutput`** (lines 116-170): Query parameters and paginated results

- **`ArchiveSettings`** (lines 175-180): Stored in `~/.jacques/config.json`
  - `filter`: "everything" | "without_tools" | "messages_only"
  - `autoArchive`: boolean

---

### **2. Bulk Archiver (`core/src/archive/bulk-archive.ts`)**

**Main Functions:**

- **`decodeProjectPath(encodedDir: string)`** (lines 31-45):
  - Claude encodes paths by replacing `/` with `-` (keeps leading dash for root)
  - Example: `-Users-gole-Desktop-project` → `/Users/gole/Desktop/project`

- **`listAllSessions()`** (lines 86-125):
  - Returns all JSONL session files from `~/.claude/projects/`
  - Sorted by modification time (newest first)
  - Returns `SessionFileInfo[]` with path, sessionId, projectPath, stats

- **`archiveSessionFile(session, options)`** (lines 139-187):
  - Parses JSONL, extracts manifest
  - Applies filter and transforms to `SavedContext`
  - Archives to global and optionally local paths
  - Returns `{ archived: boolean; error?: string }`

- **`initializeArchive(options)`** (lines 193-282):
  - Bulk-archives all sessions with progress callbacks
  - Can force re-archive with `force: true`
  - Respects `filterType` (defaults to EVERYTHING)
  - Returns `ArchiveInitResult` with counts of archived/skipped/errored

---

### **3. Manifest Extractor (`core/src/archive/manifest-extractor.ts`)**

**Key Extraction Functions:**

- **`extractManifest(jsonlPath, projectPath, options)`** (lines 99-109):
  - Parses JSONL and calls `extractManifestFromEntries`

- **`extractManifestFromEntries(entries, projectPath, jsonlPath, options)`** (lines 114-201):
  - Extracts title from summary entry or fallback strategies
  - Calculates session duration from timestamps
  - Calls specialized extractors for questions, files, tools, technologies
  - Detects plans from both Write tool calls and embedded in user messages
  - Returns complete `ConversationManifest`

- **Helper Extractors:**
  - `extractFallbackTitle()` (lines 207-268): Uses plan title → first user message with noise removal
  - `extractUserQuestions()` (lines 273-284): Truncates to 200 chars
  - `extractFilesModified()` (lines 289-307): Deduplicated from Write/Edit tools
  - `extractToolsUsed()` (lines 312-322): Unique tool names sorted
  - `extractTechnologies()` (lines 327-355): 40+ patterns for frameworks, languages, tools, databases
  - `extractContextSnippets()` (lines 392-414): Up to 5 truncated assistant responses (150 chars each)

- **`detectPlans(entries)`** (lines 360-387):
  - Finds plans written during conversation (from `~/.claude/plans/` or custom path)
  - Returns `PlanReference[]` with `source: "write"`

---

### **4. Search Indexer (`core/src/archive/search-indexer.ts`)**

**Core Functions:**

- **`tokenize(text)`** (lines 116-123):
  - Lowercases, splits on non-word chars
  - Filters by length (2-50 chars), excludes stop words, skips pure numbers
  - STOP_WORDS includes: "a", "and", "is", "the", "create", "make", "use", etc. (102 words)

- **`extractPathKeywords(filePath)`** (lines 129-134):
  - Splits on `/`, `\`, `-`, `_`, `.`
  - Example: "src/auth/jwt.ts" → ["src", "auth", "jwt", "ts"]

- **`extractKeywordsWithFields(manifest)`** (lines 139-181):
  - Weights by field: title (2.0), question (1.5), file/tech (1.0), snippet (0.5)
  - Deduplicates keywords, keeps highest score
  - Returns `{ keyword, field, score }[]`

- **`addToIndex(index, manifest)`** (lines 186-243):
  - Updates inverted index for all keywords
  - Updates project info with conversation count and last activity
  - Updates metadata counters

- **`searchIndex(index, query)`** (lines 290-320):
  - Tokenizes query, aggregates scores for matching manifests
  - Returns `{ id, score }[]` sorted by score descending

- **`getIndexStats(index)`** (lines 325-343):
  - Returns statistics for display

---

### **5. Session Detector (`core/src/session/detector.ts`)**

**Key Functions:**

- **`encodeProjectPath(dirPath)`** (lines 38-42):
  - Normalizes path and replaces `/` with `-`

- **`detectCurrentSession(options)`** (lines 48-108):
  - Finds most recently modified `.jsonl` file in project directory
  - Returns `SessionFile | null` with path, sessionId, stats
  - Handles non-existent project directories gracefully

- **`listProjectSessions(options)`** (lines 114-157):
  - Lists all JSONL files for a project, sorted by mtime (newest first)

- **`findSessionById(sessionId, claudeProjectsDir)`** (lines 177-215):
  - Global search across all projects for a specific session ID

---

### **6. Context Types (`core/src/context/types.ts`)**

**Key Interfaces:**

- **`ProjectIndex`** (lines 14-20): Unified index at `.jacques/index.json`
  - `context[]`: Imported files (Obsidian, Google Docs, etc.)
  - `sessions[]`: Saved conversations
  - `plans[]`: Implementation plans

- **`ContextFile`** (lines 25-35): Imported context with source (obsidian, google_docs, notion, local)

- **`SessionEntry`** (lines 40-53): Metadata for saved conversation in local index
  - Title, filename, dates, statistics, technologies

- **`PlanEntry`** (lines 58-66): Plan metadata
  - Bidirectional link to sessions via session IDs array

---

### **7. Archive Store (`core/src/archive/archive-store.ts`)**

**Directory Structure:**
```
~/.jacques/archive/
├── index.json              # Global search index
├── manifests/              # Manifest files by ID
├── conversations/          # By project (nested)
├── plans/                  # By project (nested)
└── context/                # Shared contexts
```

**Filename Generation:**

- **`generateSessionFilename(manifest)`** (lines 57-67):
  - Format: `[YYYY-MM-DD]_[HH-MM]_[title-slug]_[4-char-id].json`
  - Example: `2026-01-31_14-30_jwt-auth-setup_8d84.json`

- **`generatePlanFilename(planPath, options)`** (lines 85-105):
  - Format: `[YYYY-MM-DD]_[title-slug].md`
  - Extracts title from plan content (first `# heading`)

**Core Archive Flow (lines 584-657):**

1. Save manifest to global archive
2. Save conversation (updates unified project index)
3. Archive plan files with bidirectional session links
4. Update global search index

**Search** (lines 666-746):
- Uses `searchIndex()` to find manifests
- Loads and filters by project, date range, technologies
- Paginates results (default 10, max 50)

---

### **8. Session Filters (`core/src/session/filters.ts`)**

**Filter Types:**

- **EVERYTHING**: All entries preserved
- **WITHOUT_TOOLS**: Excludes tool_call, tool_result, bash_progress, mcp_progress
- **MESSAGES_ONLY**: Only user_message and assistant_message entries (strips code blocks and thinking)

**Functions:**
- `shouldIncludeEntry(entry, filterType)`: Boolean test
- `applyFilter(entries, filterType)`: Filters and cleans entries
- `cleanForMessagesOnly(entry)`: Removes thinking and code blocks

---

### **9. Session Transformer (`core/src/session/transformer.ts`)**

**Output Type: `SavedContext`** (lines 16-26):

```typescript
{
  contextGuardian: {
    version: string;
    savedAt: string;
    sourceFile: string;
    filterApplied?: string;
  };
  session: SessionInfo;          // ID, slug, timestamps, model, cwd
  statistics: SessionStatistics; // Counts, tokens, duration, cost
  conversation: DisplayMessage[];
}
```

**`DisplayMessage`** (lines 62-80):
- 12 message types (user, assistant, tool_call, agent_progress, bash_progress, etc.)
- Content varies by type (text, thinking, toolName, agentPrompt, etc.)
- Metadata for additional context

---

### **10. ConversationViewer GUI Component**

**Props:**
- `conversation: SavedConversation`
- `onBack?: () => void`

**Features:**
- Filter tabs: All | Without Tools | Messages Only
- Message expansion/collapse with keyboard shortcuts (`[`, `]`, `e`, `c`)
- Scroll to end (End or Shift+G)
- Token statistics with actual vs. estimated tokens
- Displays technologies, message count, duration
- Smooth scrolling with scroll-to-bottom button

**Layout:**
- Header with back button, title, filters, expand/collapse
- Messages area with scroll tracking
- Question navigator sidebar
- Footer with statistics

---

### **11. AgentProgressBlock GUI Component**

**Props:**
- `content: AgentProgressContent`
- `expanded?: boolean`

**Features:**
- Shows agent ID, prompt summary (first 60 chars)
- Displays full prompt and response text
- Extractable text from message content blocks
- Collapsible block with icon

---

### **12. HTTP API Server (`server/src/http-api.ts`)**

**Key Routes:**

**Archive Routes:**
- `GET /api/archive/stats` - Archive statistics
- `GET /api/archive/conversations` - All manifests
- `GET /api/archive/conversations/by-project` - Grouped by project
- `GET /api/archive/conversations/:id` - Specific conversation with content
- `POST /api/archive/search` - Search with SearchInput parameters
- `POST /api/archive/initialize` - Bulk archive with Server-Sent Events (SSE) progress streaming

**Source Configuration Routes:**
- `GET /api/sources/status` - Connected status for Obsidian, Google Docs, Notion
- `POST /api/sources/google` - Configure Google Docs
- `DELETE /api/sources/google` - Disconnect Google Docs
- `POST /api/sources/notion` - Configure Notion
- `DELETE /api/sources/notion` - Disconnect Notion

**Claude Operations Routes:**
- `GET /api/claude/operations` - Recent operations (50 max)
- `GET /api/claude/operations/:id/debug` - Debug data for operation

**Static File Serving:**
- GUI served from `/` (SPA with fallback to index.html)
- CORS enabled for all origins
- Listens on port 4243 by default

---

### **Data Flow Diagram**

```
JSONL Session File
       ↓
   Parser (parseJSONL)
       ↓
   Manifest Extractor (extractManifest)
       ├─ extractUserQuestions
       ├─ extractFilesModified
       ├─ extractToolsUsed
       ├─ extractTechnologies
       ├─ detectPlans (from Write calls)
       └─ extractEmbeddedPlans (from user messages)
       ↓
  ConversationManifest
       ↓
  Session Transformer + Filter
       ↓
    SavedContext
       ↓
  Archive Store (archiveConversation)
       ├─ Save Manifest
       ├─ Save Conversation (global + local)
       ├─ Archive Plans
       └─ Update Search Index
       ↓
  Global Archive (~/.jacques/archive/)
```

---

### **Key Insights**

1. **Three-tier storage**: Session JSONL → Manifest + SavedContext + Search Index → GUI display
2. **Dual archiving**: Global (`~/.jacques/archive/`) + optional local (`.jacques/`)
3. **Intelligent filtering**: 3 levels (everything, without_tools, messages_only)
4. **Content-aware extraction**: 40+ tech patterns, multi-strategy title detection
5. **Bidirectional linking**: Plans ↔ Sessions via project index
6. **Search optimization**: Inverted index with weighted fields, stop word filtering
7. **SSE progress streaming**: Archive initialization reports progress in real-time
8. **Unified project index**: Consolidates context, sessions, and plans in `.jacques/index.json`

All paths use absolute file references; the system gracefully handles missing files and malformed data while maintaining referential integrity between manifests, conversations, and plans.