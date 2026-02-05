# Explore: Explore token estimation logic

> Session: `02fa9321-cb8c-45e3-afd2-654a76f9985c`
> Date: 2026-02-01
> Tokens: ~74 895

---

Perfect! Now I have a comprehensive understanding. Let me create a detailed report of my findings.

## Summary: Token Estimation in the GUI

I've thoroughly investigated the token estimation system in the GUI and identified the core issue. Here's what I found:

### Current Token Estimation Implementation

**Location**: `gui/src/utils/tokens.ts`

The GUI uses a **very simple, character-based estimation method**:
- `estimateTokens(text)`: Divides text length by 4 (hardcoded approximation)
- `estimateContentTokens(content)`: Routes to appropriate handler based on content type
- Works for text, thinking blocks, tool calls, tool results, and code blocks

```typescript
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // ~4 chars per token is a reasonable approximation for English text
  return Math.ceil(text.length / 4);
}
```

### Why Messages Show 0 Tokens

The issue is a **data transformation problem**:

1. **Server has actual token data**: The `core/src/session/parser.ts` extracts `usage` data from the JSONL format:
   ```typescript
   usage?: {
     inputTokens: number;
     outputTokens: number;
     cacheCreation?: number;
     cacheRead?: number;
   }
   ```

2. **Conversation API doesn't include it**: The GUI's `Archive.tsx` page (line 170) sets `estimatedTokens: 0` when transforming archived conversations:
   ```typescript
   metadata: {
     messageCount: manifest.messageCount,
     toolCallCount: manifest.toolCallCount,
     estimatedTokens: 0, // Will be calculated from messages ← HARDCODED ZERO!
     technologies: manifest.technologies,
     filesModified: manifest.filesModified,
   },
   ```

3. **Message data loses token metadata**: When converting `DisplayMessage` (line 45-60 in Archive.tsx) to `ConversationMessage`, the token data isn't preserved:
   ```typescript
   // DisplayMessage has:
   metadata: {
     model?: string;
     tokens?: { input: number; output: number };
   };
   
   // But ConversationMessage doesn't have a tokens field!
   // So even if tokens exist, they're discarded
   ```

### Data Flow Gap

```
Claude Code JSONL (has usage: {inputTokens, outputTokens})
         ↓
core/src/session/parser.ts (extracts to ParsedEntry.content.usage)
         ↓
server/src/http-api.ts (readManifest returns ConversationManifest)
         ↓
gui/src/pages/Archive.tsx (transformToSavedConversation drops token data)
         ↓
gui/src/components/Conversation (estimateTokens from text only)
```

### What's Available but Unused

The **real token data exists** in the parsed conversation:
- From `RawAssistantEntry.message.usage` in the JSONL files
- Extracted to `ParsedEntry.content.usage` by the parser
- Could be passed through the API response
- Never reaches the GUI

### Solutions Available

There are **three complementary approaches**:

1. **Use actual data**: Extend `ConversationMessage` to include `usage` field, pass it from server → GUI
2. **Improve estimation**: Use tiktoken library (already available in `core/src/session/token-estimator.ts`) for ~90% accuracy
3. **Hybrid approach**: Use actual data when available, fall back to tiktoken, then char-based estimation

### Key Code Locations

| Component | File | Issue |
|-----------|------|-------|
| GUI Token Estimation | `gui/src/utils/tokens.ts` | Character-only (4 chars = 1 token) |
| Message Types | `gui/src/types.ts` | `ConversationMessage` has no `usage` field |
| Archive Transformation | `gui/src/pages/Archive.tsx` (line 170) | `estimatedTokens: 0` hardcoded |
| Real Data Extraction | `core/src/session/parser.ts` (line 182-187) | `usage` field captured but not used |
| Better Tokenizer Available | `core/src/session/token-estimator.ts` | Uses tiktoken cl100k_base encoding |

### Why This Matters

- **Accuracy**: Character-based estimates are 50-70% accurate for Claude
- **Missing data**: Actual token counts exist in original JSONL files
- **Unused code**: `token-estimator.ts` with tiktoken support exists but isn't used in GUI
- **Consistent zero values**: All messages show 0 because the default is never overwritten with real data