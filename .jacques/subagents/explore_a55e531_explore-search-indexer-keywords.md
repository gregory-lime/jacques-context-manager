# Explore: Explore search indexer keywords

> Session: `ab61fa17-f520-4541-8961-1521bf7f7753`
> Date: 2026-02-01
> Tokens: ~54 019

---

Perfect! Now I have all the information I need. Let me create a comprehensive analysis document.

## Analysis: Low Keyword Extraction from Search Indexer

Based on my thorough exploration of the archive search indexer and related modules, I've identified several critical reasons why only 7 keywords might be extracted from 700 messages:

### Problem Root Causes

#### 1. **Massive Stop Words List (102 words)**
The `STOP_WORDS` set in `search-indexer.ts` (lines 14-102) filters out 102 common words, including:
- Common verbs: create, make, get, use, want, need, help
- Pronouns and articles: I, you, we, they, me, see, look, know, think
- This is extremely aggressive for a codebase

**Impact**: For a typical 700-message conversation, the vast majority of natural language will be filtered as stop words, leaving only domain-specific terms.

#### 2. **Aggressive Token Filtering**
The `tokenize()` function (lines 116-123) filters tokens by:
- **Minimum length**: ≥ 2 characters (short variable names filtered)
- **Maximum length**: ≤ 50 characters (line 120)
- **Numeric only**: Filters purely numeric tokens
- **Non-word characters**: Splits on `/\W+/` (regex)

This means:
- Single-letter variables (a, b, x) are dropped
- Numbers (123, 456) alone are dropped
- But "456abc" would be kept

#### 3. **Limited Manifest Content Sources**
The indexer only extracts keywords from these sources in `extractKeywordsWithFields()` (lines 139-183):

1. **Title** (weight 2.0) - Single session title
2. **User Questions** (weight 1.5) - Up to ~700 characters total (MAX_QUESTION_LENGTH = 200)
3. **Files Modified** (weight 1.0) - File paths only
4. **Technologies** (weight 1.0) - Pre-detected tech stack
5. **Context Snippets** (weight 0.5) - Only 5 snippets, max 150 chars each (line 22)

**Critical Missing Sources**:
- No indexing of **assistant response text** (only snippets)
- No indexing of **tool names** from toolsUsed
- No indexing of **tool calls** or their parameters
- No indexing of **bash commands** or output
- No indexing of **user message content** beyond first 200 chars

#### 4. **manifest-extractor.ts Extraction Limits**

Looking at what the manifest extractor actually stores:

- **userQuestions**: Extracted with `MAX_QUESTION_LENGTH = 200` (line 16)
  - Each question truncated to 200 chars
  - For 700 messages with maybe 100 user messages, that's only ~20KB of text
  - But still filtered through stop words

- **contextSnippets**: Only `MAX_SNIPPETS = 5` (line 22)
  - Each limited to `MAX_SNIPPET_LENGTH = 150` chars (line 19)
  - Total: ~750 characters from assistant responses
  - Only first 5 assistant messages (line 514)

- **filesModified**: Only the file paths themselves
- **technologies**: Pre-detected patterns only

#### 5. **Compound Impact of Filters**

Example: A 700-message conversation with rich content
- User messages: 100 messages × 200 chars = 20,000 chars
- After stop word filtering: ~30-40% survives = 6,000-8,000 chars
- After tokenization (splitting, deduplicating): ~100-200 unique tokens
- After applying field weights with deduplication: Keywords with highest score kept

**But**: The `contextSnippets` (max 750 chars) are from the FIRST 5 assistant messages only, missing 695 messages of context.

### The 7 Keyword Scenario

With only 7 keywords from 700 messages, this suggests:

**Likely Scenario 1: "Messages Only" Filter**
If the conversation was saved with the `MESSAGES_ONLY` filter (default "without_tools"):
- Only user + assistant messages indexed
- Assistant snippets limited to 5 × 150 chars
- Most assistant text is code/thinking (stripped from snippet extraction)
- Result: Very few unique tokens after stop-word filtering

**Likely Scenario 2: Very Generic Content**
If most content is:
- Installation/setup instructions (lots of stop words)
- Repeated technical patterns (same keywords over and over)
- Tool output (filtered out)
- Code examples (tokenized into common keywords)

**Likely Scenario 3: New Session**
If only the title and first few user messages were processed before archive corruption/rebuild.

### Key Code Evidence

1. **contextSnippets limitation** (manifest-extractor.ts, lines 500-522):
```typescript
if (snippets.length >= MAX_SNIPPETS) {
  break;  // Only takes first 5 snippets!
}
```

2. **Stop word filtering** (search-indexer.ts, line 121):
```typescript
.filter((w) => !STOP_WORDS.has(w))
```

3. **Deduplication** (search-indexer.ts, lines 145-152):
```typescript
if (!existing || existing.score < score) {
  seenKeywords.set(keyword, { field, score });
}
// Only highest-scoring appearance of each keyword is kept
```

4. **Field weight-based deduplication** (search-indexer.ts, line 105-111):
```typescript
const FIELD_WEIGHTS: Record<string, number> = {
  title: 2.0,
  question: 1.5,
  file: 1.0,
  tech: 1.0,
  snippet: 0.5,  // Lowest weight
};
```

### Why Re-Initialization Made It Worse

During re-initialization:
1. Index is cleared: `getDefaultSearchIndex()` (types.ts, lines 193-204)
2. Only manifest fields are re-indexed (no full JSONL re-parsing)
3. If manifests have sparse data (truncated questions, few snippets), only those get indexed
4. No fallback to full conversation content

### Recommendations for Investigation

1. **Check current manifests**: Look at `.jacques/archive/manifests/*.json` - they should show what's actually stored
2. **Verify user questions**: Are they being extracted? (should have 100+ messages worth)
3. **Check archive settings**: Is `filter: "messages_only"` set? That would exclude all tool calls and much content
4. **Test with different sessions**: Archive a new session and see how many keywords it generates
5. **Enable snippet debugging**: Count how many assistant snippets are actually extracted vs. total messages

### Files to Reference

- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/archive/search-indexer.ts` - Core indexing logic
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/archive/manifest-extractor.ts` - Manifest extraction
- `/Users/gole/Desktop/jacques-context-manager/core/src/session/filters.ts` - Content filtering
- `/Users/gole/Desktop/jacques-context-manager/dashboard/src/archive/types.ts` - Type definitions