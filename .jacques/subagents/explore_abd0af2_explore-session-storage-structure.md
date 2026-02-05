# Explore: Explore session storage structure

> Session: `e3024ee4-e29b-433f-8809-0238f1bda643`
> Date: 2026-02-01
> Tokens: ~66 649

---

Perfect! Now I have comprehensive information. Let me compile my findings.

## Summary: Session Storage and Structure

Based on my exploration of the codebase, here's a complete understanding of how sessions are stored and structured:

### **1. Storage Locations**

**Global Archive** (for cross-project search):
- Path: `~/.jacques/archive/`
- Structure:
  - `manifests/[id].json` - Lightweight metadata (1-2KB each)
  - `conversations/[project-slug]/[id].json` - Full conversation content
  - `index.json` - Keyword inverted index for search
  - `plans/[project]/[filename].md` - Plan files
  - `context/[project]/[filename].md` - External context files

**Local Project Archive** (for project-specific context):
- Path: `[project]/.jacques/`
- Structure:
  - `sessions/[filename].json` - Local conversation copy
  - `plans/[filename].md` - Local plans
  - `context/[filename].md` - Local context
  - `index.json` - Project-unified index

**Project Index** (catalog of all project knowledge):
- Path: `[project]/.jacques/index.json`
- Unified index containing references to sessions, plans, and context

---

### **2. JSON Structure of Saved Sessions**

**Top-level SavedContext** format (from `/session/transformer.ts`):

```typescript
{
  "contextGuardian": {
    "version": "1.0.0",
    "savedAt": "ISO timestamp",
    "sourceFile": "path to JSONL",
    "filterApplied": "everything|without_tools|messages_only"
  },
  "session": {
    "id": "session-uuid",
    "slug": "human-readable name",
    "startedAt": "ISO timestamp",
    "endedAt": "ISO timestamp",
    "model": "claude-opus-4-5-20251101",
    "workingDirectory": "/path/to/project",
    "gitBranch": "optional",
    "claudeCodeVersion": "optional",
    "summary": "optional Claude-generated summary"
  },
  "statistics": {
    "totalEntries": number,
    "userMessages": number,
    "assistantMessages": number,
    "toolCalls": number,
    "hookEvents": number,
    "systemEvents": number,
    "turnCount": number,
    "tokens": {
      "totalInput": number,
      "totalOutput": number,
      "cacheCreation": optional,
      "cacheRead": optional
    },
    "totalDurationMs": optional number,
    "estimatedCost": optional number
  },
  "conversation": [
    // Array of DisplayMessage objects (see below)
  ]
}
```

**DisplayMessage** format:
```typescript
{
  "id": "uuid",
  "type": "user_message|assistant_message|tool_call|tool_result|hook_progress|turn_duration|system_event|error",
  "timestamp": "ISO timestamp",
  "content": {
    "text": "optional message text",
    "thinking": "optional Claude thinking/reasoning",
    "toolName": "optional tool name (Write, Bash, Read, etc.)",
    "toolInput": { /* optional tool input parameters */ },
    "toolResult": "optional tool result string",
    "summary": "optional session summary",
    "eventType": "optional event type",
    "hookEvent": "optional hook event (SessionStart, Stop, etc.)",
    "hookName": "optional hook name",
    "hookCommand": "optional hook command"
  },
  "metadata": {
    "model": "optional model name",
    "tokens": {
      "input": number,
      "output": number
    },
    "costUSD": optional number,
    "durationMs": optional number,
    "parentId": "optional parent message UUID"
  }
}
```

---

### **3. Conversation Manifest** (for search index)

**ConversationManifest** format (from `/archive/types.ts`):

```typescript
{
  "id": "session-uuid",
  "projectSlug": "project-name",
  "projectPath": "/full/path/to/project",
  "archivedAt": "ISO timestamp",
  "autoArchived": boolean,
  
  // Searchable metadata
  "title": "Claude's auto-generated summary or fallback",
  "startedAt": "ISO timestamp",
  "endedAt": "ISO timestamp",
  "durationMinutes": number,
  
  // Extracted from JSONL (no AI needed)
  "userQuestions": ["truncated user message 1", "truncated user message 2", ...],
  "filesModified": ["/absolute/paths/to/files/modified/by/write/edit"],
  "toolsUsed": ["Write", "Read", "Bash", "Edit", ...],
  "technologies": ["react", "typescript", "jest", ...], // Regex-extracted
  
  // Plan detection
  "plans": [
    {
      "path": "/Users/gole/.claude/plans/foo.md",
      "name": "foo.md",
      "archivedPath": "plans/foo.md"
    }
  ],
  
  // Optional
  "contextSnippets": ["first 150 chars of key responses", ...],
  
  // Statistics
  "messageCount": number,
  "toolCallCount": number,
  
  // Manual save metadata
  "userLabel": "optional user-provided label"
}
```

---

### **4. Project Index** (.jacques/index.json)

**ProjectIndex** format (unified catalog):

```typescript
{
  "version": "1.0.0",
  "updatedAt": "ISO timestamp",
  
  "context": [
    {
      "id": "file-uuid",
      "name": "Display name",
      "path": ".jacques/context/filename.md",
      "source": "obsidian|google_docs|notion|local",
      "sourceFile": "/original/path/to/source",
      "addedAt": "ISO timestamp",
      "description": "optional",
      "sizeBytes": number,
      "tags": ["optional", "tags"]
    }
  ],
  
  "sessions": [
    {
      "id": "session-uuid",
      "title": "Session title",
      "filename": "2026-01-31_19-40_session-title_id.json",
      "path": "sessions/2026-01-31_19-40_session-title_id.json",
      "savedAt": "ISO timestamp",
      "startedAt": "ISO timestamp",
      "endedAt": "ISO timestamp",
      "durationMinutes": number,
      "messageCount": number,
      "toolCallCount": number,
      "technologies": ["react", "typescript", ...],
      "userLabel": "optional"
    }
  ],
  
  "plans": [
    {
      "id": "plan-uuid",
      "title": "Plan title from # heading",
      "filename": "2026-01-31_plan-title.md",
      "path": "plans/2026-01-31_plan-title.md",
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp",
      "sessions": ["session-id-1", "session-id-2", ...] // Sessions that used this plan
    }
  ]
}
```

---

### **5. Search Index** (for cross-project discovery)

**SearchIndex** format:

```typescript
{
  "version": "1.0.0",
  "lastUpdated": "ISO timestamp",
  
  "keywords": {
    "authentication": [
      { "id": "session-uuid-1", "score": 5, "field": "title" },
      { "id": "session-uuid-2", "score": 3, "field": "question" },
      { "id": "session-uuid-3", "score": 1, "field": "file" }
    ],
    "jwt": [
      { "id": "session-uuid-1", "score": 4, "field": "title" }
    ]
    // ... more keywords
  },
  
  "projects": {
    "jacques-context-manager": {
      "path": "/Users/gole/Desktop/jacques-context-manager",
      "conversationCount": 42,
      "lastActivity": "ISO timestamp"
    }
    // ... more projects
  },
  
  "metadata": {
    "totalConversations": 42,
    "totalKeywords": 1250
  }
}
```

---

### **6. Real-World Example**

From the codebase's actual `.jacques/index.json`:

```json
{
  "version": "1.0.0",
  "updatedAt": "2026-01-31T20:56:00.307Z",
  "sessions": [
    {
      "id": "8d8472a1-7e10-4cac-97d6-0af343d42930",
      "title": "# Jacques Conversation Archive & Search System",
      "filename": "2026-01-31_16-28_jacques-conversation-archive-search-syst_8d84.json",
      "path": "sessions/2026-01-31_16-28_jacques-conversation-archive-search-syst_8d84.json",
      "savedAt": "2026-01-31T15:28:52.890Z",
      "startedAt": "2026-01-31T13:19:23.822Z",
      "endedAt": "2026-01-31T15:28:36.137Z",
      "durationMinutes": 129,
      "messageCount": 618,
      "toolCallCount": 282,
      "technologies": ["ink", "prisma", "react", "typescript"]
    }
  ]
}
```

---

### **7. Title Extraction Strategy**

Sessions use a priority-based fallback system:

1. **Claude's summary** (from `type: "summary"` JSONL entries) - Most reliable
2. **First user message** - Fallback when no summary
3. **First plan title** - If a plan was created during conversation
4. **"Session [DATE]"** - Last resort

The actual session file shows this in action - the user's first message was truncated to "Session Handoff: Architecture, Skills, and CLI Integration" from a much longer plan document.

---

### **8. Plan References in Sessions**

Plans are **detected automatically** during archiving by:
- Finding all `Write` tool calls to paths in `~/.claude/plans/` or custom `plansDirectory`
- Extracting the first `# Heading` as the plan title
- Creating `PlanReference` objects with original path, filename, and archived path
- Storing these references in the conversation manifest

This enables:
- Multiple plans per conversation
- Plan reuse across conversations (tracked by session IDs in plan entry)
- Bidirectional linking (conversation → plans, plans → sessions)

---

This architecture enables efficient cross-project search while maintaining local project context and supporting bidirectional relationships between sessions, plans, and external context.