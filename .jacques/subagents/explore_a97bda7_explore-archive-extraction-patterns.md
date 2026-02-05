# Explore: Explore archive extraction patterns

> Session: `6e224ff4-e9e3-488a-98aa-4822dc6f79ec`
> Date: 2026-02-01
> Tokens: ~67 166

---

Perfect! Now I have a comprehensive understanding of the archive system. Let me create a detailed research report:

## Research Report: Archive and Manifest Extraction System

### 1. How Conversation Summaries Are Created

The system uses a **two-layer summarization approach**:

#### A. Manifest Extraction (Lightweight - 1-2KB)
Located in `/Users/gole/Desktop/jacques-context-manager/core/src/archive/manifest-extractor.ts`:

- **ConversationManifest** is the lightweight summary containing:
  - `title` (Claude's auto-generated or extracted from first user message)
  - `userQuestions[]` - Truncated to 200 chars each
  - `filesModified[]` - All Write/Edit tool paths
  - `toolsUsed[]` - Unique tool names (sorted)
  - `technologies[]` - Detected from content using 40+ regex patterns
  - `contextSnippets[]` - First 5 assistant responses (150 chars each, max 5)
  - `messageCount`, `toolCallCount`, `durationMinutes`
  - Metadata: `startedAt`, `endedAt`, `projectSlug`, `archivedAt`

#### B. Full Conversation Context (100-500KB)
Located in `/Users/gole/Desktop/jacques-context-manager/core/src/session/transformer.ts`:

- **SavedContext** is the complete context with all messages:
  - Session metadata (ID, timestamps, model, git branch)
  - Statistics (token counts, duration, cost)
  - Full conversation array (DisplayMessage[])
  - Each message includes: type, content (text/thinking/toolInput), metadata (tokens, cost, duration)

---

### 2. Metadata Extracted vs Full Content

| Data | Manifest | Full Conversation | Purpose | Size Impact |
|------|----------|-------------------|---------|------------|
| Title | ✓ (100 chars max) | ✓ | Searchability + overview | Minimal |
| User Questions | ✓ (200 chars, truncated) | ✓ (full text) | Search + context | ~500 bytes per Q |
| Files Modified | ✓ (paths only) | ✓ (full path list) | Code change tracking | Path string length |
| Tools Used | ✓ (names: Read, Write, Bash, etc.) | ✓ (full toolInput/Output) | Feature tracking | Name length |
| Assistant Responses | ✓ (150 chars, first 5 only) | ✓ (full response text + thinking) | Preview + full context | **HUGE - thinking blocks** |
| Embedded Plans | ✓ (title + path reference) | ✓ (plan content if present) | Plan tracking + context | 10-100KB per plan |
| Context Snippets | ✓ (5 snippets, 150 chars) | ✓ (full response) | Quick preview | ~750 bytes |
| Token Metadata | ✗ | ✓ (input/output tokens) | Cost tracking | Minimal |

---

### 3. Archive Filter Implementation

Located in `/Users/gole/Desktop/jacques-context-manager/core/src/session/filters.ts`:

Three filters with progressive data reduction:

#### Filter 1: "Everything" (EVERYTHING)
- **Includes**: All entries
- **Tokens**: Full conversation size (60-100k typical)
- **Use case**: Complete archival for future reference

#### Filter 2: "Without Tools" (WITHOUT_TOOLS) - DEFAULT
- **Excludes**: `tool_call`, `tool_result` entries
- **Includes**: User messages, assistant messages, system events
- **Tokens**: ~40-60% reduction (removes tool I/O content)
- **Use case**: Lean archival without code execution details
- **Implementation**: Simple type-based filtering in `shouldIncludeEntry()`

#### Filter 3: "Messages Only" (MESSAGES_ONLY)
- **Excludes**: Tools, system events, thinking blocks
- **Includes**: Only user and assistant messages
- **Transforms**: 
  - Removes `content.thinking` field
  - Strips markdown code blocks (`````...``````) from text
  - Replaces with `[code removed]`
- **Tokens**: ~70-80% reduction compared to full
- **Use case**: Pure conversation text for context recovery
- **Implementation**: Two-stage filtering + cleaning

**Filter Application Flow:**
```typescript
applyFilter(entries, filterType):
  1. Filter by type based on switch(filterType)
  2. If MESSAGES_ONLY: clean each entry (strip thinking + code blocks)
  3. Return filtered/cleaned entries
```

---

### 4. Patterns for Reducing Conversation Data While Preserving Meaning

#### A. Tokenization & Keyword Extraction
Located in `/Users/gole/Desktop/jacques-context-manager/core/src/archive/search-indexer.ts`:

```typescript
FIELD_WEIGHTS = {
  title: 2.0,      // Most important
  question: 1.5,   // User intent
  file: 1.0,       // Code changes
  tech: 1.0,       // Stack
  snippet: 0.5,    // Assistant preview (least important)
}

STOP_WORDS: 100+ common words filtered (a, the, and, for, etc.)
```

**Token Extraction Strategy:**
- Split text on `\W+` (non-word chars)
- Filter by length: 2-50 chars (removes noise)
- Remove stop words and pure digits
- Extract path keywords by splitting on `/`, `-`, `_`, `.`

**Result**: ~30-50 keywords per conversation (very compressed)

#### B. Chunking & Truncation Limits
```typescript
// In manifest-extractor.ts
MAX_QUESTION_LENGTH = 200        // Truncate each user Q
MAX_SNIPPET_LENGTH = 150         // Assistant response previews
MAX_SNIPPETS = 5                 // Only keep first 5 responses

// Extract only what's needed:
- First 5 assistant messages (not all 50)
- Last 5 user messages (latest context)
- Only modified files (not all read operations)
- Unique tools (not individual calls)
```

#### C. Content-Based Deduplication
Located in `/Users/gole/Desktop/jacques-context-manager/core/src/archive/plan-extractor.ts`:

```typescript
// SHA-256 hashing for exact duplicates
generatePlanFingerprint(content):
  1. Normalize whitespace
  2. Remove markdown formatting
  3. Hash normalized content
  4. Fast comparison for exact matches

// Jaccard similarity for fuzzy duplicates
calculateSimilarity(plan1, plan2):
  - Split content into words
  - Calculate: intersection / union
  - 0.9 (90%) threshold = very similar plans
  - Prevents duplicate storage
```

#### D. Metadata-Only References
- Store **references** to plans instead of full content in manifest
- Example: `PlanReference { path, name, archivedPath, source }`
- Only full plan content stored when explicitly archived

#### E. Filter-Based Entry Exclusion
```typescript
// Three levels of reduction:

WITHOUT_TOOLS filter:
  - Remove all tool_call/tool_result entries
  - Keeps conversation flow but removes implementation details
  - Reduces by ~40-60%

MESSAGES_ONLY filter:
  - Remove thinking blocks (often 5-20k tokens each)
  - Strip code blocks with [code removed] placeholder
  - Only conversational text remains
  - Reduces by ~70-80%
```

---

### 5. Token-Efficiency Patterns Applied to Manifest

| Element | Strategy | Token Savings |
|---------|----------|---------------|
| User Questions | Truncate to 200 chars + include only | ~90% of question text |
| Assistant Responses | First 5 only, 150 chars each | ~98% of assistant content |
| Tool Calls | Exclude entirely in WITHOUT_TOOLS | ~40% of full conversation |
| Thinking Blocks | Exclude in MESSAGES_ONLY | ~15-20% of assistant messages |
| Code Blocks | Replace with `[code removed]` | ~30-50% of assistant content |
| Plan References | Store title + path, not content | ~95% of plan text |
| Stop Words | Filter 100+ common words | ~40% of keywords |
| Duplicates | Hash-based deduplication | 100% prevention of repeats |

---

### 6. Current Handoff Example (12KB = ~3000 tokens)

From `/Users/gole/Desktop/jacques-context-manager/.jacques/handoffs/2026-02-01T16-00-00-handoff.md`:

**Structure (~1000 token budget breakdown):**
- Project Context (150 tokens) - Tech stack, directories, status
- Current Task (100 tokens) - Goal and approach
- Progress Made (200 tokens) - Numbered list of completed items
- User Decisions (100 tokens) - Key choices made
- Plan Status (100 tokens) - Checklist of phases
- Blockers & Bugs (150 tokens) - Resolved issues
- What Didn't Work (50 tokens) - Anti-patterns
- Warnings & Gotchas (150 tokens) - Gotchas to know
- Next Steps (150 tokens) - Immediately actionable items
- Files Modified + Test Results (50 tokens) - Summary

**Key efficiency techniques used:**
1. Numbered lists (dense information)
2. Tables for structured data (User Decisions, Data comparison)
3. Bullet points with key info only
4. Relative paths instead of full paths (save space)
5. Status indicators (✓ ☑ ⬜) instead of verbose text
6. Linked file names instead of full paths
7. Section headers to organize (scannable)

---

### 7. Recommendations for Token-Efficient Handoff Generation

Based on the archive system patterns:

**For processing 60k input tokens down to 2-3k output:**

1. **Apply Manifest-Only Strategy**
   - Extract ConversationManifest (1-2KB)
   - Never include full conversation body
   - Reference files by path, not content

2. **Use Messages-Only Filter**
   - Remove all tool calls/results
   - Strip thinking blocks (5-20k tokens each)
   - Replace code with `[code removed]`
   - Result: ~50-60% size reduction

3. **Extract by Priority**
   - Title (100 chars)
   - Last 3 user messages (300 chars each)
   - Modified files (paths only, no content)
   - Technologies detected (keywords only)
   - 5 key snippets from assistant (150 chars each)

4. **Use Truncation + Deduplication**
   - 200-char limit per question
   - 150-char limit per snippet
   - Keyword tokenization (30-50 keywords total)
   - SHA-256 hash for duplicate detection

5. **Structured Output Format**
   - Tables for metadata (user decisions, decisions)
   - Bullet lists for items (next steps, blockers)
   - Status indicators (✓ ☑) for progress
   - Section headings for scannability
   - Relative paths, not absolute

6. **Omit Redundant Content**
   - Don't include: Full thinking blocks, code execution output, tool result details
   - Do include: What was changed (files modified), what tools were used, what you learned

---

### Summary

The Jacques archive system achieves 95%+ data reduction through:
1. **Lightweight manifests** (1-2KB) containing only searchable metadata
2. **Progressive filters** (Everything → Without Tools → Messages Only)
3. **Keyword tokenization** with stop words (40+ keywords per conversation)
4. **Content deduplication** using SHA-256 hashes + Jaccard similarity
5. **Truncation limits** on all text fields (200-300 chars)
6. **Reference-based storage** (plan paths instead of content)
7. **Structured output** with tables, lists, and status indicators

This same approach can be applied to handoff generation: **Extract only metadata and references, filter progressively, truncate aggressively, deduplicate content-based, and structure output densely.**