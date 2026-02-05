# Explore: Explore token extraction code

> Session: `7c99255a-2bfe-4abe-8f4e-6ad99de21f8d`
> Date: 2026-02-02
> Tokens: ~90 151

---

Perfect! Now I have all the information I need. Let me create a comprehensive analysis document:

## Analysis: Token Count Display Issue in Jacques Context Manager

Based on my exploration of the codebase, I've identified the root cause of why token counts are showing very low numbers (like "51 in, 100 out") instead of the actual values (like "5100 in, 10000 out").

### Problem Summary

The token counts being displayed in the archive viewer are **100x too small**. For example:
- Displayed: "51 in, 100 out"  
- Expected: "5100 in, 10000 out"

### Root Cause: Manifests Don't Store Token Data

The issue traces back to the **manifest extraction process**. Here's the data flow:

#### 1. **Manifest Extraction (Core Issue)**

**File**: `/Users/gole/Desktop/jacques-context-manager/core/src/archive/manifest-extractor.ts`

Lines 99-201 show the `extractManifestFromEntries()` function that creates a `ConversationManifest`. The manifest includes:
- `messageCount` (line 176-177)
- `toolCallCount` (line 179)

**BUT it does NOT include any token counts!** The `ConversationManifest` interface (in `/core/src/archive/types.ts`, lines 39-80) has NO fields for:
- `totalInputTokens`
- `totalOutputTokens`  
- `cacheCreation`
- `cacheRead`

#### 2. **Token Data IS Extracted but NOT Stored in Manifest**

When parsing JSONL entries in `/core/src/session/parser.ts` (lines 587-697), the `getEntryStatistics()` function correctly calculates:
- `totalInputTokens` (line 667)
- `totalOutputTokens` (line 668)
- `totalCacheCreation` (line 669)
- `totalCacheRead` (line 670)

**However**, this data is NOT carried into the manifest. The manifest only stores message counts, not token counts.

#### 3. **SavedContext DOES Store Token Data**

The `SavedContext` format (in `/dashboard/src/session/transformer.ts`, lines 16-26) includes:
- `statistics.tokens.totalInput` (line 188)
- `statistics.tokens.totalOutput` (line 189)

This is stored in archived conversation files at `~/.jacques/archive/conversations/[project]/[filename].json`

**But the GUI doesn't read this properly when displaying.**

#### 4. **GUI Reads from Manifest (Wrong Source)**

The server endpoint in `/server/src/http-api.ts` (line 470) returns:
```javascript
const manifest = await readManifest(id);
sendJson(res, 200, { manifest, conversation, subagentRefs });
```

The manifest is returned to the GUI, and the `ConversationViewer` component in `/gui/src/components/Conversation/ConversationViewer.tsx` (lines 59-98) tries to extract tokens from:
1. `conversation.metadata.actualTokens` (line 65) - **DOESN'T EXIST** in the returned data
2. Message-by-message tokens (line 74) - only if individual messages have them

#### 5. **Why Token Counts Appear Low**

In `/gui/src/pages/Archive.tsx` (lines 294-309), the transformation logic tries to use:
```javascript
const actualTokens = archivedData.statistics?.tokens
```

But the **statistics ARE in the archive file**, they're just not being extracted/returned properly.

The fallback is to sum up tokens from individual messages (lines 117-134):
```javascript
if (msg.metadata?.tokens) {
  totalInputTokens += msg.metadata.tokens.input || 0;
  totalOutputTokens += msg.metadata.tokens.output || 0;
}
```

### Why Tokens Are 100x Too Low

When conversations are saved, not all entries have token data. Looking at the archived file `/Users/gole/.jacques/archive/conversations/aivngrd/2026-01-31_18-04_local-command-caveat-caveat-the-messages_d9e9.json`:

- Only `assistant_message` and `tool_call` entries have `metadata.tokens`
- User messages, bash progress, and other entries do NOT
- The GUI sums only entries with tokens, missing many messages

**The "51 in, 100 out" numbers suggest it's counting tokens from maybe 2-3 entries that have token data, while the actual conversation had 50+ assistant messages.**

### The Fix Location

Token data needs to be either:

**Option A**: Add token fields to `ConversationManifest` (quick aggregation at archive time)
- Files: `core/src/archive/types.ts` and `core/src/archive/manifest-extractor.ts`
- Store: `totalInputTokens`, `totalOutputTokens`, `totalCacheCreation`, `totalCacheRead`
- Benefit: One-time calculation at archive time, always available

**Option B**: Return statistics from the archive file properly (requires API change)
- Files: `server/src/http-api.ts` and `gui/src/pages/Archive.tsx`
- Extract and return `conversation.statistics.tokens` from archived JSON
- Benefit: Data already exists, just needs proper passthrough

### Key Files Involved

| File | Purpose | Issue |
|------|---------|-------|
| `core/src/archive/types.ts` | Manifest type definition | Missing token fields |
| `core/src/archive/manifest-extractor.ts` | Extracts manifest from JSONL | Doesn't extract/store tokens |
| `core/src/session/parser.ts` | Parses JSONL entries | Correctly calculates tokens but not used in manifest |
| `dashboard/src/session/transformer.ts` | Transforms to SavedContext | Correctly stores tokens in statistics |
| `server/src/http-api.ts` | Returns archived conversation | Doesn't expose statistics |
| `gui/src/pages/Archive.tsx` | Transforms for GUI display | Looks for actualTokens that don't exist |
| `gui/src/components/Conversation/ConversationViewer.tsx` | Displays tokens | Tries to read from wrong source |

### Token Calculation Already Works Correctly

The parser correctly aggregates tokens across all entries that have token data. The issue is purely one of **storage and retrieval** - the aggregated data isn't being persisted in the manifest and isn't being returned by the server.