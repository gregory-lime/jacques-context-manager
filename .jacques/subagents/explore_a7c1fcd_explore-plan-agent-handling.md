# Explore: Explore Plan agent handling

> Session: `03949068-ed82-4b1d-a83f-fbf5add62caf`
> Date: 2026-02-03
> Tokens: ~74 592

---

Perfect! Now I have all the information needed to provide a comprehensive answer. Let me write my findings:

## Comprehensive Analysis: Plan Agent Response Handling in Jacques

Based on my thorough exploration of the codebase, here's how Plan agent responses are handled:

### 1. **Agent Identification and Classification**

In `/Users/gole/Desktop/jacques-context-manager/core/src/session/parser.ts`:
- **Lines 118-123**: `TaskToolInfo` interface defines agent metadata including `subagentType` field that captures agent type ("Explore", "Plan", "general-purpose", etc.)
- **Lines 543-562**: `agent_progress` entries are parsed and linked to their parent Task tool call via `parentToolUseID`
- **Lines 545-560**: The parser extracts:
  - `agentType`: Determined from the parent Task tool call's `subagent_type` field
  - `agentPrompt`: The prompt given to the agent
  - `agentId`: Unique identifier for the subagent
  - `agentMessageContent`: The agent's message content (which contains markdown plans for Plan agents)

### 2. **Current Treatment of Plan Agent Output**

**Status: Plan agent outputs are currently treated identically to other agent types during parsing**, with only one exception:

In `/Users/gole/Desktop/jacques-context-manager/gui/src/components/Conversation/AgentProgressBlock.tsx`:
- **Lines 210-214**: Special rendering logic for Plan agents:
  ```tsx
  content.agentType?.toLowerCase() === 'plan' ? (
    <div style={styles.planResponseContainer}>
      <MarkdownRenderer content={finalResponse} />
    </div>
  )
  ```
- **Lines 417-424**: Plan responses get dedicated styling with green accent border (`#34D399`)
- For other agent types: responses are rendered as plain text in `<pre>` blocks
- **Plan agents are the ONLY agent type that gets markdown rendering** in the GUI

### 3. **Embedded Plans vs Agent-Generated Plans - Critical Gap**

There's a **significant architectural difference**:

**Embedded Plans** (from user messages):
- Detected in `core/src/archive/plan-extractor.ts`
- Extracted during archival with `extractEmbeddedPlans()` 
- Saved to `.jacques/plans/` directory
- Indexed in `.jacques/index.json`
- Included in conversation manifests
- Can be deduplicated and linked to sessions

**Plan Agent Output** (from Plan subagents):
- Currently stored only in `agentMessageContent` within the parsed entry
- **NOT extracted to plan files**
- **NOT indexed in project context**
- **NOT saved to archive**
- **NOT deduplicated**
- Treated as opaque content within the agent_progress entry

### 4. **Server Event Handler**

In `/Users/gole/Desktop/jacques-context-manager/server/src/handlers/event-handler.ts`:
- No plan-specific processing whatsoever
- The event handler is purely session-lifecycle focused (register, activity, context, idle, end)
- Plan extraction happens only in the archive/manifest layer, not in real-time event handling

### 5. **Session Parser Integration Points**

The parser doesn't currently differentiate Plan agent content:

In `core/src/session/parser.ts` (lines 557-558):
```typescript
agentMessageContent: progressEntry.data?.message?.message?.content,
agentType: taskInfo?.subagentType,
```

The `agentMessageContent` is a raw `unknown[]` containing content blocks - it's never processed or validated, just passed through.

### 6. **Manifest Extraction Architecture**

In `/Users/gole/Desktop/jacques-context-manager/core/src/archive/manifest-extractor.ts`:
- **Lines 161-169**: Two sources of plans are detected:
  - `writePlans`: From Write tool calls (lines 162, 363-390)
  - `embeddedPlans`: From user messages (lines 165-169)
- **Plan agent outputs are completely absent** from this detection
- Line 172 combines both: `const plans = [...writePlans, ...embeddedPlans];`

### 7. **Transformation and Storage**

In `/Users/gole/Desktop/jacques-context-manager/core/src/session/transformer.ts`:
- Plan agent content is stored as-is in `MessageContent.agentMessageContent` (line 258)
- No special transformation or extraction
- No plan reference generation

In `/Users/gole/Desktop/jacques-context-manager/core/src/archive/types.ts`:
- `PlanReference` interface (lines 11-20) has `source: "embedded" | "write"` - **no "agent" option**
- Plan agents are completely invisible to the archive system

### 8. **GUI Plan Navigation**

In `/Users/gole/Desktop/jacques-context-manager/gui/src/components/Conversation/PlanNavigator.tsx`:
- Detects only two sources of plans:
  - Embedded plans from user messages (lines 143-161)
  - Write tool calls to plan files (lines 169-205)
- **Plan agent responses are not indexed for navigation**
- Lines 32-36: Same trigger patterns used as in `plan-extractor.ts`

### Key Findings Summary

| Aspect | Implementation | Plan Agent Support |
|--------|---|---|
| **Identification** | `agentType` field in parsed entries | ✅ Yes ("Plan") |
| **GUI Rendering** | MarkdownRenderer for Plan agents | ✅ Yes (lines 210-214) |
| **Content Extraction** | `agentMessageContent` field | ✅ Yes (raw content) |
| **File Persistence** | Saved to `.jacques/plans/` | ❌ No |
| **Indexing** | `.jacques/index.json` | ❌ No |
| **Archive Detection** | `detectPlans()` in manifest-extractor | ❌ No |
| **Deduplication** | SHA-256 + Jaccard similarity | ❌ No |
| **Handoff Integration** | Included in session handoff | ❌ No |
| **Plan References** | `PlanReference` with source field | ❌ No "agent" source |
| **GUI Navigation** | PlanNavigator component | ❌ No |

### Conclusion

**Plan agent responses are currently rendered with markdown support in the GUI but are NOT treated as plans for the broader system.** They remain as opaque content within agent progress entries and are:
- Not extracted to files
- Not indexed
- Not deduplicated
- Not available for cross-session reference
- Not included in session handoffs
- Not searchable in the archive

This is a **significant gap** - while Plan agents can generate markdown plans that are beautifully rendered in the GUI, those plans have no persistence, deduplication, or indexing infrastructure like embedded/written plans do.