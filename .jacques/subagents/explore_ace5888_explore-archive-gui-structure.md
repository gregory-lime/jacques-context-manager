# Explore: Explore archive GUI structure

> Session: `b1a7eed5-9a35-4ace-a47b-6865d6338fc8`
> Date: 2026-02-02
> Tokens: ~89 504

---

Perfect! Now I have a comprehensive understanding. Let me create a detailed report:

## Archive GUI Components Exploration Report

Based on my thorough exploration of the Jacques codebase, here's a complete breakdown of the archive GUI components and their current structure:

### 1. Archive Browser UI Component

**File**: `/Users/gole/Desktop/jacques-context-manager/dashboard/src/components/ArchiveBrowserView.tsx`

**Current Structure**:
- **List View Only** (No detail panel currently exists)
- Shows conversations grouped by project
- Projects can be expanded/collapsed to reveal conversations
- Fixed 10-row content area with scrollable support

**Displayed Data Per Conversation**:
- `title` - Claude's auto-generated summary (truncated to 25 chars)
- `date` - Formatted as "Jan 31" from `endedAt`
- `duration` - Formatted as "45m" or "2h 30m" from `durationMinutes`
- `message count` - Total messages in conversation

**Example Display**:
```
Archive Browser
─────────────────────────────────
▼ jacques-context-manager (12)
  > Authentication system redesign - Jan 31 (2h 15m, 42 msgs)
  > Fix token estimation bug - Jan 30 (45m, 18 msgs)
```

**Component Props**:
```typescript
interface ArchiveBrowserViewProps {
  items: ArchiveListItem[];
  selectedIndex: number;
  scrollOffset: number;
  terminalWidth: number;
  loading?: boolean;
  error?: string | null;
}
```

### 2. Data Structures

**ConversationManifest** (lightweight metadata, ~1-2KB):
- `id` - Session UUID
- `projectSlug` - Project name
- `projectPath` - Full project path
- `title` - Conversation title
- `startedAt` / `endedAt` - ISO timestamps
- `durationMinutes` - Session length
- `messageCount` / `toolCallCount` - Statistics
- `userQuestions[]` - Array of user messages (truncated)
- `filesModified[]` - Files written/edited
- `toolsUsed[]` - Unique tools called
- `technologies[]` - Auto-detected tech stack
- `plans[]` - Plan files created/edited
- `contextSnippets[]` - Top 5 assistant response snippets
- `userLabel?` - Optional manual label
- `autoArchived` - Boolean (manual vs auto-archive)

**SavedContext** (full conversation content):
```typescript
interface SavedContext {
  contextGuardian: {
    version: string;
    savedAt: string;
    sourceFile: string;
    filterApplied?: string;
  };
  session: {
    id, slug, startedAt, endedAt, claudeCodeVersion,
    model, gitBranch, workingDirectory, summary
  };
  statistics: {
    totalEntries, userMessages, assistantMessages,
    toolCalls, tokens, totalDurationMs, estimatedCost
  };
  conversation: DisplayMessage[];  // Full message array
}
```

### 3. Archive Browser Navigation & Interaction

**Keyboard Controls** (from App.tsx lines 1701-1738):
- `↑/↓` - Navigate projects and conversations
- `Enter` - Expand/collapse projects OR select conversation
- `Esc` - Return to main menu

**Current Selection Behavior**:
- When conversation selected, shows notification (line 1735):
  ```typescript
  showNotification(`Selected: ${selectedItem.manifest.title.substring(0, 30)}...`);
  ```
- **No detail view is opened** - just a notification

### 4. Archive List Item Structure

**ArchiveListItem** (flattened for rendering):
```typescript
interface ArchiveListItem {
  type: "project" | "conversation";
  key: string;
  projectSlug?: string;
  manifest?: ConversationManifest;
  expanded?: boolean;
  conversationCount?: number;
}
```

### 5. Layout & Responsiveness

- **Horizontal Layout** (terminal ≥62 chars):
  - Left: Mascot (14 chars visual width)
  - Right: Content area (remaining width)
  - Border: Full box with corners `╭`, `╮`, `╰`, `╯`
  
- **Vertical Layout** (terminal <62 chars):
  - Full-width list
  - No borders
  - Mascot above content

- **Fixed Height**: 10 rows for content
- **Scroll Indicators**: ▲ more / ▼ N more with arrow overlays

### 6. Available Data in Archive System

**Can be displayed** but currently is NOT:
- `userQuestions` - Full list of user questions (top 5 typically)
- `filesModified` - All files modified (top 5 shown in search UI)
- `toolsUsed` - All tools used in session
- `technologies` - Tech stack tags
- `contextSnippets` - Key assistant response excerpts
- Full `conversation` array (from SavedContext) - All messages

### 7. Related Components

**ArchiveInitProgressView** - Shows archive initialization progress
**SettingsView** - Lists archive statistics (total conversations, projects, size)
**Dashboard** - Routing to archive-browser view

### 8. Functions Available for Reading Archive Data

From `dashboard/src/archive/archive-store.ts`:
- `readConversation(projectSlug, id)` - Returns full SavedContext with all messages
- `readManifest(id)` - Returns ConversationManifest (metadata only)
- `searchConversations(query, options)` - Searches archive
- `getArchiveStats()` - Overall archive statistics

### 9. Key Gap: Right Panel / Detail View

**Currently Missing**:
- No conversation detail component
- No right-side panel showing conversation content
- No message viewer
- Selection just shows a notification (line 1735 in App.tsx)

**What Would Be Needed** for a detail view:
1. New component: `ConversationDetailView.tsx`
2. New view state: `currentView === "archive-detail"`
3. Call to `readConversation()` when conversation selected
4. Panel layout showing manifest metadata + first N messages
5. Scroll/navigation for long conversations

### Summary

The archive browser is currently a **list-only interface** that displays:
- Projects (expandable/collapsible)
- Conversations (6 visible, scrollable)
- Per-conversation: title, date, duration, message count

The system has **rich metadata** available (manifest) and **full conversation content** (SavedContext), but no UI component currently displays them beyond the list view. A right-panel detail view would be the natural next step for exploring archived conversations.