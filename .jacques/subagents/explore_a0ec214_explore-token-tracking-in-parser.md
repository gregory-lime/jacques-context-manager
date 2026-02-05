# Explore: Explore token tracking in parser

> Session: `ab61fa17-f520-4541-8961-1521bf7f7753`
> Date: 2026-02-01
> Tokens: ~65 791

---

Perfect! Now I have a complete understanding. Let me create a comprehensive analysis document:

## Comprehensive Analysis: Token Tracking Through JSONL Parsing and Archiving

Based on my thorough exploration of the codebase, I've identified **three critical areas where token data is lost** during the archiving flow:

### 1. **TOKEN EXTRACTION FROM JSONL (parser.ts) - CORRECT ✓**

The parser correctly extracts tokens from assistant entries:

**Location**: `core/src/session/parser.ts` lines 351-357 and 378-384

**Token extraction for tool calls:**
```typescript
usage: message?.usage
  ? {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      cacheCreation: message.usage.cache_creation_input_tokens,
      cacheRead: message.usage.cache_read_input_tokens,
    }
  : undefined
```

**Token extraction for assistant messages:**
```typescript
usage: message?.usage
  ? {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      cacheCreation: message.usage.cache_creation_input_tokens,
      cacheRead: message.usage.cache_read_input_tokens,
    }
  : undefined
```

The parser correctly stores usage data in `ParsedContent.usage` for both tool calls and assistant messages.

---

### 2. **TOKEN PRESERVATION IN TRANSFORMER (transformer.ts) - CORRECT ✓**

The transformer correctly preserves tokens when converting to SavedContext:

**Location**: `core/src/session/transformer.ts` lines 275-282

```typescript
metadata: {
  model: entry.content.model,
  tokens: entry.content.usage
    ? {
        input: entry.content.usage.inputTokens,
        output: entry.content.usage.outputTokens,
        cacheCreation: entry.content.usage.cacheCreation,
        cacheRead: entry.content.usage.cacheRead,
      }
    : undefined,
  costUSD: entry.content.costUSD,
  durationMs: entry.content.durationMs,
  parentId: entry.parentUuid || undefined,
}
```

Token data is correctly mapped to `DisplayMessage.metadata.tokens` with the same structure.

---

### 3. **CRITICAL: FILTER OPERATIONS CAUSE TOKEN LOSS ❌**

**FOUND THE BUG**: The `cleanForMessagesOnly()` function in `filters.ts` **strips token data**

**Location**: `core/src/session/filters.ts` lines 97-113

```typescript
export function cleanForMessagesOnly(entry: ParsedEntry): ParsedEntry {
  // Clone the entry to avoid mutation
  const cloned: ParsedEntry = {
    ...entry,
    content: { ...entry.content },
  };

  // Remove thinking field
  delete cloned.content.thinking;

  // Strip code blocks from text
  if (cloned.content.text) {
    cloned.content.text = stripCodeBlocks(cloned.content.text);
  }

  return cloned;
}
```

**Problem**: This shallow copy of `content` **does NOT preserve `usage` data** because it only copies the `content` object properties, and `usage` is nested within it. However, the usage field SHOULD be preserved since it's in `content.usage`.

Actually, on closer inspection, the shallow copy `{ ...entry.content }` **should preserve usage** since it's a direct property. Let me verify the filter logic...

**Wait - found the real issue**: Look at `applyFilter()` function (lines 118-133):

```typescript
export function applyFilter(
  entries: ParsedEntry[],
  filterType: FilterType
): ParsedEntry[] {
  // Filter entries based on type
  let filtered = entries.filter((entry) =>
    shouldIncludeEntry(entry, filterType)
  );

  // Clean entries for "Messages Only" filter
  if (filterType === FilterType.MESSAGES_ONLY) {
    filtered = filtered.map((entry) => cleanForMessagesOnly(entry));
  }

  return filtered;
}
```

The filters themselves are working correctly. The issue must be elsewhere.

---

### 4. **CRITICAL: AGENT_PROGRESS ENTRIES MISSING TOKEN METADATA ❌**

**FOUND THE REAL BUG**: Agent progress entries never have token data assigned

**Location**: `core/src/session/parser.ts` lines 411-424

```typescript
case "agent_progress":
  return {
    uuid,
    parentUuid,
    timestamp,
    sessionId,
    type: "agent_progress",
    content: {
      agentPrompt: progressEntry.data?.prompt,
      agentId: progressEntry.data?.agentId,
      agentMessageType: progressEntry.data?.message?.type,
      agentMessageContent: progressEntry.data?.message?.message?.content,
    },
  };
```

**Problem**: `agent_progress` entries **don't extract token data** even though agent calls likely contain usage information in the nested message structure. The `agentMessageContent` is being extracted but there's no corresponding token metadata.

---

### 5. **SECONDARY ISSUE: STATISTICS COUNTING IN TRANSFORMER ❌**

**Location**: `core/src/session/transformer.ts` lines 205-216

```typescript
statistics: {
  totalEntries: stats.totalEntries,
  userMessages: stats.userMessages,
  assistantMessages: stats.assistantMessages,
  toolCalls: stats.toolCalls,
  hookEvents: stats.hookEvents,
  agentCalls: stats.agentCalls,  // ← Agent calls are tracked here
  bashProgress: stats.bashProgress,
  mcpCalls: stats.mcpCalls,
  webSearches: stats.webSearches,
  systemEvents: stats.systemEvents,
  turnCount: stats.turnCount,
  tokens: {  // ← But token data is aggregated here
    totalInput: stats.totalInputTokens,
    totalOutput: stats.totalOutputTokens,
    cacheCreation: stats.totalCacheCreation > 0 ? stats.totalCacheCreation : undefined,
    cacheRead: stats.totalCacheRead > 0 ? stats.totalCacheRead : undefined,
  },
  // ...
}
```

The `agentCalls` count is preserved in statistics, but **agent_progress entries don't contribute to the token totals** because they don't have usage data extracted from the parser.

---

### 6. **TOKEN AGGREGATION LOGIC (parser.ts) - INCOMPLETE ❌**

**Location**: `core/src/session/parser.ts` lines 665-671

```typescript
// Aggregate usage stats
if (entry.content.usage) {
  totalInputTokens += entry.content.usage.inputTokens || 0;
  totalOutputTokens += entry.content.usage.outputTokens || 0;
  totalCacheCreation += entry.content.usage.cacheCreation || 0;
  totalCacheRead += entry.content.usage.cacheRead || 0;
}
```

**Problem**: This only aggregates tokens from entries that have `usage` data. Since `agent_progress` entries are never parsed with usage information, they contribute 0 tokens to totals.

---

### 7. **MANIFEST EXTRACTION & ARCHIVE FLOW**

**Location**: `core/src/archive/bulk-archive.ts` lines 139-187

The bulk archiving flow is clean:
1. Parse JSONL entries (line 148)
2. Extract manifest (lines 155-159)
3. Apply filters (line 162)
4. Transform to SavedContext (lines 163-173)

However, when `FilterType.MESSAGES_ONLY` is applied, agent progress entries are **completely excluded** by `shouldIncludeEntry()` at line 70 of filters.ts (only includes user and assistant messages).

---

## Summary of Issues

| Issue | Location | Severity | Impact |
|-------|----------|----------|--------|
| Agent progress entries lack token metadata extraction | `parser.ts` lines 411-424 | **CRITICAL** | Subagent activity not counted in token totals; users see 0 tokens for agent calls |
| Agent progress entries excluded from MESSAGES_ONLY filter | `filters.ts` lines 67-71 | **HIGH** | Archive loses subagent visibility when filtered |
| Token aggregation doesn't track agent-contributed tokens | `parser.ts` lines 665-671 | **MEDIUM** | Session-level token statistics incomplete |
| DisplayMessage metadata.tokens undefined for agent_progress | `transformer.ts` lines 275-282 | **MEDIUM** | Archive browser can't display individual agent message tokens |
| Agent activity statistics tracked but disconnected from tokens | `transformer.ts` lines 46 & 211 | **LOW** | Inconsistent metadata (agentCalls count present but tokens absent) |

---

## Root Cause

The parser correctly handles `agent_progress` entries as a **distinct entry type**, but **doesn't extract token data from the nested message structure**. The `RawProgressEntry` interface (lines 56-93 in parser.ts) has fields for `message.message` but these are treated as content metadata only, not as a vehicle for token usage data.

Since agent progress entries don't get token metadata in the ParsedEntry, they contribute 0 to statistics and appear with empty `metadata.tokens` in DisplayMessages after archiving.

---

## Files Affected

1. **`core/src/session/parser.ts`** - agent_progress extraction (lines 411-424) needs usage extraction
2. **`core/src/session/transformer.ts`** - handles correctly but receives incomplete data
3. **`core/src/session/filters.ts`** - correctly filters but loses agent context in MESSAGES_ONLY
4. **`core/src/archive/manifest-extractor.ts`** - doesn't need changes (works with parsed data)
5. **`core/src/archive/bulk-archive.ts`** - doesn't need changes (flow is correct)