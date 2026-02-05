# Explore: Find PlanNavigator and PlanViewer

> Session: `eb1a87a2-a33d-4aa4-a580-f36814767d8f`
> Date: 2026-02-03
> Tokens: ~25 632

---

Perfect! I found and read all the requested files. Here's a summary of what I found:

## Summary of Files Found

### 1. **PlanNavigator.tsx** (411 lines)
Location: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/Conversation/PlanNavigator.tsx`

A React component that displays detected plans in a conversation. Key features:
- Detects embedded plans from user messages (using patterns like "implement the following plan:")
- Detects written plans from Write tool calls to `.md` files
- Groups plans by source (embedded vs. written)
- Shows plan previews and titles
- Highlights the active plan based on current scroll position
- Filters out code files from being considered as plans
- Exports `PlanInfo` interface used by other components

### 2. **PlanViewer.tsx** (254 lines)
Location: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/components/Conversation/PlanViewer.tsx`

A React modal component that displays full plan content. Key features:
- Shows plan title, source (embedded/written), and file path
- Fetches plan content from API endpoint: `/api/sessions/{sessionId}/plans/{messageIndex}`
- Uses MarkdownRenderer to display plan content
- Modal with header, content area, and footer
- Supports keyboard escape to close
- Handles loading, error, and success states
- API URL switches between dev mode (`http://localhost:4243/api`) and production (`/api`)

### 3. **config.ts** (820 lines)
Location: `/Users/gole/Desktop/jacques-gui-redesign/gui/src/api/config.ts`

Comprehensive HTTP API client for communicating with the Jacques server. Contains:

**Key API groups:**
- **Sources API**: Google Docs, Notion, Obsidian configuration and status
- **Archive API**: Conversation archiving, search, statistics, subagent data
- **Sessions API**: Session listing, parsing, index management, session badges
- **Subagent API**: Archived subagent conversations and references

**Notable interfaces:**
- `SessionEntry`: Session metadata without JSONL content
- `ParsedEntry`: Parsed JSONL entry with various content types
- `SessionData`: Complete session with parsed entries and statistics
- `SubagentData`: Subagent conversation data
- `PlanRef`: Plan references with title, source, messageIndex, filePath

**Key functions:**
- `listSessions()`, `getSession()`, `getSessionBadges()`
- `searchArchivedConversations()`, `listArchivedConversations()`
- `rebuildSessionIndex()`, `initializeArchive()` - both with SSE streaming
- `getSubagentFromSession()`, `listSessionSubagents()`

### 4. **api.ts**
This file does NOT exist in the `/Users/gole/Desktop/jacques-gui-redesign/gui/src/` directory.

All three readable files have been returned with full line numbers in the output above.