# Explore: Explore web search data

> Session: `f8a3c98c-94f5-454a-a33d-ccfa8f81916b`
> Date: 2026-02-03
> Tokens: ~60 548

---

Perfect! Now I have comprehensive understanding. Let me compile my findings into a detailed research report.

## Research Summary: Web Search Results Storage and Structure

Based on thorough analysis of the Jacques codebase, here's how web search results are stored and structured:

### 1. JSONL Entry Types for Web Search

Web searches are captured in two distinct **progress entry types**:

**File**: `/Users/gole/Desktop/jacques-context-manager/core/src/session/parser.ts` (lines 87-111, 594-621)

| Entry Type | Progress Data Type | Field | Purpose |
|------------|-------------------|-------|---------|
| Progress | `query_update` | `data.query` | Logs the search query submitted by Claude |
| Progress | `search_results_received` | `data.query`, `data.resultCount` | Logs the number of results returned + query |

Both are categorized as `ParsedEntryType: "web_search"` with `searchType: "query"` or `searchType: "results"`.

### 2. Web Search Data Structure

**In ParsedContent** (`parser.ts`, lines 255-259):
```typescript
interface ParsedContent {
  searchType?: "query" | "results";      // Two-stage tracking
  searchQuery?: string;                   // The search terms used
  searchResultCount?: number;             // Count from search_results_received
  searchUrls?: Array<{                    // URLs extracted from WebSearch tool results
    title: string;
    url: string;
  }>;
}
```

**Key insight**: The parser has a two-pass system:
1. **First pass** (lines 318-342): Categorizes all entries and tracks web search entries by their `parentToolUseID`
2. **Second pass** (lines 344-350): Links `searchUrls` from WebSearch tool results to their corresponding `search_results_received` entries

### 3. URL Extraction Pipeline

**File**: `/Users/gole/Desktop/jacques-context-manager/core/src/session/parser.ts` (lines 376-396)

The parser extracts URLs from **user entries** with `toolUseResult` fields:
```typescript
if (userEntry.toolUseResult?.results) {
  for (const result of userEntry.toolUseResult.results) {
    if (result.content && Array.isArray(result.content)) {
      // result.content contains: Array<{ title: string; url: string }>
      context.webSearchResults.set(toolUseId, result.content);
    }
  }
}
```

**Storage mechanism**: Uses a `ParseContext.webSearchResults` Map:
```typescript
webSearchResults: Map<string, Array<{ title: string; url: string }>>
```

This maps the WebSearch tool's `toolUseId` to its result URLs.

### 4. Data Flow in Session Parsing

Claude Code generates:
1. **assistant entry** → Contains WebSearch tool call with `toolUseId`
2. **progress entry** → `query_update` (logs search query)
3. **user entry** → Contains `toolUseResult` with URL list
4. **progress entry** → `search_results_received` (logs result count)
5. **assistant entry** → Claude's response about the search results

The parser **links** entries 3 and 4 via the `parentToolUseID` field:
- `progress.parentToolUseID` = `assistant.message.content[].toolUseId` (WebSearch tool)
- This creates the connection: `search_results_received` → URLs

### 5. Transformed Output Format

**File**: `/Users/gole/Desktop/jacques-context-manager/core/src/session/transformer.ts` (lines 108-112)

Web searches are **not currently included** in the transformer's `MessageContent`:
```typescript
// Web search
searchType?: "query" | "results";
searchQuery?: string;
searchResultCount?: number;
// NOTE: searchUrls field is missing from transformer output!
```

The transformer intentionally excludes the `searchUrls` field.

### 6. Archive/Search System Integration

**File**: `/Users/gole/Desktop/jacques-context-manager/core/src/archive/manifest-extractor.ts`

Web searches are **NOT currently indexed** for archive search:
- Search indexer extracts keywords from: titles, user questions, files modified, tools used, technologies, context snippets
- Web search queries and URLs are not included in the `ConversationManifest`
- No web search keywords are indexed in `SearchIndex`

### 7. Document Representation Opportunity

To treat web searches as "documents," the system would need:

**Option A: Query + Response Documents**
```
Document 1: Web Search Query
- query: "authentication best practices"
- resultCount: 10
- urls: [
    { title: "OAuth 2.0 Security", url: "..." },
    { title: "JWT Implementation", url: "..." }
  ]
- assistantResponse: {text from following assistant entry}
```

**Option B: Lightweight Search Manifest**
Similar to plan references (`PlanReference` type), add:
```typescript
interface WebSearchReference {
  query: string;
  resultCount: number;
  urls: Array<{ title: string; url: string }>;
  archivedAt: string;
}
```

**Option C: Archive Integration**
Index web search queries + results as searchable documents:
```typescript
// In ConversationManifest
webSearches?: Array<{
  query: string;
  resultCount: number;
  urls: Array<{ title: string; url: string }>;
}>;

// In SearchIndex
keywords["authentication"] → includes reference to this search
```

### 8. Current Implementation Details

**Key entry fields** (from `RawProgressEntry`):
- `data.type: "query_update"` → just logs the search
- `data.type: "search_results_received"` → includes `data.resultCount`
- `data.query` → search terms (available in both)

**Linking mechanism**:
- `RawProgressEntry.parentToolUseID` links to the WebSearch tool call
- This allows finding the corresponding URLs from the tool result

**Token tracking**: Web searches are counted in `ParsedEntry.statistics.webSearches` but don't have token impact (they're metadata, not content).

### 9. File Locations Summary

| File | Content |
|------|---------|
| `/core/src/session/parser.ts` | Complete JSONL parsing, web search categorization, URL extraction |
| `/core/src/session/transformer.ts` | SavedContext transform (missing searchUrls field) |
| `/core/src/archive/types.ts` | ConversationManifest definition (web searches not included) |
| `/core/src/archive/manifest-extractor.ts` | Manifest extraction logic (no web search indexing) |
| `/core/src/archive/search-indexer.ts` | Keyword indexing (web searches not indexed) |

### Key Insights for "Web Searches as Documents"

1. **Two-stage tracking**: Queries are logged separately from results, allowing search intent visibility
2. **URL metadata preserved**: Title + URL pairs are captured, enabling rich linking
3. **Not yet archived**: Web searches are parsed but not indexed for search or archived as distinct documents
4. **Missing in transformer**: The `searchUrls` field is extracted during parsing but **not propagated** to the SavedContext output
5. **Integration ready**: The infrastructure exists (types, parsing, linking) but archive/search integration isn't implemented

This suggests web searches were designed as parseable data but the document/archive features were deferred for Phase 5 (Context Details Breakdown) or beyond.