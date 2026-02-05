# Explore: Find agent count sources

> Session: `324decd2-49e1-4bf8-a334-ce6fc80187b4`
> Date: 2026-02-02
> Tokens: ~90 083

---

Perfect! Now I have all the information I need. Let me compile a comprehensive report.

## Summary Report: Agent/Subagent Count Calculation and Display

I've thoroughly analyzed the archive system and found several key areas where agent/subagent counts are calculated and displayed. Here's what I discovered:

### 1. **Archive List View - Subagent Count Display**
**Location**: `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Archive.tsx:609-614`

Shows subagent badge in session cards:
```typescript
{session.hasSubagents && (
  <>
    <span style={styles.metaDot}>•</span>
    <span style={styles.subagentBadge}>
      {session.subagentIds?.length || '?'} subagents
    </span>
  </>
)}
```

The count comes from `session.subagentIds.length`, which is populated from the session index.

### 2. **Session Index - Where Subagent Counts Are Calculated**
**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/cache/session-index.ts:209-259`

In `extractSessionMetadata()`:
```typescript
// Check for subagents
const subagentFiles = await listSubagentFiles(jsonlPath);
const hasSubagents = subagentFiles.length > 0;

return {
  // ...
  hasSubagents,
  subagentIds: hasSubagents
    ? subagentFiles.map((f: SubagentFile) => f.agentId)
    : undefined,
}
```

**Key Point**: `hasSubagents` and `subagentIds` are determined by scanning the filesystem for subagent JSONL files at `{session-id}/subagents/agent-{agentId}.jsonl`.

### 3. **Subagent File Detection**
**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/session/detector.ts:195-240`

The `listSubagentFiles()` function:
- Looks for a directory at `{session-id}/subagents/` (derived from the main session JSONL path)
- Finds all files matching the pattern `agent-{agentId}.jsonl`
- Extracts agent IDs from the filename

### 4. **Agent Progress Count in Conversation Viewer**
**Location**: `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Archive.tsx:54-264`

In `transformEntriesToMessages()`:
```typescript
// Track seen agent IDs globally to avoid duplicates across all messages
const seenAgentIds = new Set<string>();

// For each agent_progress entry:
if (entry.type === 'agent_progress') {
  const agentId = entry.content.agentId;
  
  // Skip if we've already seen this agent
  if (!agentId || seenAgentIds.has(agentId)) {
    continue;
  }
  
  seenAgentIds.add(agentId);
  // ... add to conversation
}
```

**Key Point**: The viewer DEDUPLICATES agent progress entries by agent ID globally. If Claude Code sends multiple progress entries for the same agent, only one is shown.

### 5. **Agent Count Statistics in Parser**
**Location**: `/Users/gole/Desktop/jacques-context-manager/core/src/session/parser.ts:708-818`

In `getEntryStatistics()`:
```typescript
case "agent_progress":
  agentCalls++;
  break;
```

This counts **each progress entry**, not unique agents.

### 6. **Subagent Navigator - Agent Count Grouping**
**Location**: `/Users/gole/Desktop/jacques-context-manager/gui/src/components/Conversation/SubagentNavigator.tsx:36-143`

Extracts agents and groups by type:
```typescript
const subagents: SubagentInfo[] = [];

messages.forEach((msg, msgIndex) => {
  if (msg.role === 'assistant') {
    msg.content.forEach((content, contentIdx) => {
      if (content.type === 'agent_progress') {
        const agentContent = content as AgentProgressContent;
        if (agentContent.agentId) {
          subagents.push({
            agentId: agentContent.agentId,
            agentType: agentContent.agentType,
            // ...
          });
        }
      }
    });
  }
});

// Group by agent type and count per type
const byType = new Map<string, SubagentInfo[]>();
```

---

### **IDENTIFIED DISCREPANCIES**

1. **Parser's `agentCalls` vs. Unique Agents**
   - `agentCalls` counts **all agent_progress entries** in the JSONL (can be many per agent)
   - `subagentIds` from session index counts **unique agent IDs** based on filesystem
   - These are fundamentally different metrics

2. **Browser Display vs. Server Storage**
   - Archive list uses `sessionEntry.subagentIds?.length` (filesystem-based)
   - Conversation viewer uses deduplicated agent count from entry parsing
   - No single "agent count" metric is exported to the frontend

3. **Two Different Agent Count Sources**
   - **SessionEntry.subagentIds**: From `listSubagentFiles()` scanning `{id}/subagents/` directories (filesystem)
   - **ParsedEntry agent_progress entries**: From parsing JSONL content (text scanning)
   - These could diverge if JSONL has agent_progress entries but no corresponding files, or vice versa

---

### **Key Files and Their Responsibilities**

| File | Responsibility |
|------|-----------------|
| `core/src/session/detector.ts` | Detects subagent files from filesystem at `{id}/subagents/agent-*.jsonl` |
| `core/src/cache/session-index.ts` | Builds index with `hasSubagents` and `subagentIds` based on filesystem |
| `core/src/session/parser.ts` | Counts `agentCalls` entries in JSONL; extracts agent_progress type entries |
| `gui/src/pages/Archive.tsx` | Displays subagent badge using `session.subagentIds.length` |
| `gui/src/components/Conversation/SubagentNavigator.tsx` | Groups agents from parsed entries and counts by type |

All absolute file paths are listed above for reference.