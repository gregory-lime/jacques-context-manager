# Explore: Find API data shapes

> Session: `a5df7fb1-50b0-4dec-a722-6129d3f94c9e`
> Date: 2026-02-04
> Tokens: ~26 497

---

Perfect! I found all the type definitions you need. Let me provide a comprehensive summary:

## SessionEntry Type Definition

Located in `/Users/gole/Desktop/jacques-dashboards-smaller-design/gui/src/api/config.ts` (lines 440-523), here's the complete structure:

### Main SessionEntry Interface

```typescript
export interface SessionEntry {
  // Core metadata
  id: string;                           // Session UUID
  jsonlPath: string;                    // Full path to JSONL file
  projectPath: string;                  // Decoded project path
  projectSlug: string;                  // Project name (basename)
  title: string;                        // Session title
  startedAt: string;                    // First timestamp
  endedAt: string;                      // Last timestamp
  
  // Message and tool counts
  messageCount: number;                 // Count of user + assistant messages
  toolCallCount: number;                // Count of tool calls
  
  // Subagent tracking
  hasSubagents: boolean;                // Whether user-visible subagents exist
  subagentIds?: string[];               // User-visible subagent IDs
  
  // Auto-compact tracking
  hadAutoCompact?: boolean;             // Whether auto-compact occurred
  autoCompactAt?: string;               // ISO timestamp of auto-compact
  
  // Token usage
  tokens?: {
    input: number;                      // Fresh input tokens (non-cached)
    output: number;                     // Output tokens generated
    cacheCreation: number;              // Tokens written to cache
    cacheRead: number;                  // Tokens read from cache
  };
  
  // Git info
  gitRepoRoot?: string;                 // Canonical git repo root path
  
  // File metadata
  fileSizeBytes: number;                // File size in bytes
  modifiedAt: string;                   // File modification time
  
  // Session mode
  mode?: 'planning' | 'execution' | null;
  
  // Plans - NOW YOU'RE HERE
  planCount?: number;
  planRefs?: Array<{
    title: string;                      // Plan title extracted from content
    source: 'embedded' | 'write' | 'agent';  // Source type
    messageIndex: number;               // Index of message containing plan
    filePath?: string;                  // File path if written to disk
    agentId?: string;                   // Agent ID for Plan subagent source
    catalogId?: string;                 // Links to PlanEntry.id in .jacques/index.json
  }>;
  
  // Explore agents - NOW YOU'RE HERE
  exploreAgents?: Array<{
    id: string;                         // Agent ID from agent_progress
    description: string;                // Short description from Task tool call
    timestamp: string;                  // *** TIMESTAMP FIELD IS PRESENT ***
    tokenCost?: number;                 // Estimated token cost (input + output)
  }>;
  
  // Web searches - NOW YOU'RE HERE
  webSearches?: Array<{
    query: string;                      // Search query
    resultCount: number;                // Number of results returned
    timestamp: string;                  // *** TIMESTAMP FIELD IS PRESENT ***
  }>;
}
```

## Key Findings

### 1. **exploreAgents** (lines 503-513)
- **Has timestamp?** YES - `timestamp: string` (line 510)
- **Structure**: Each item has `id`, `description`, `timestamp`, and optional `tokenCost`

### 2. **webSearches** (lines 514-522)
- **Has timestamp?** YES - `timestamp: string` (line 521)
- **Structure**: Each item has `query`, `resultCount`, and `timestamp`

### 3. **planRefs** (lines 489-502)
- **Structure**: Each item has:
  - `title` (string) - Plan title
  - `source` ('embedded' | 'write' | 'agent') - Origin type
  - `messageIndex` (number) - Message position
  - `filePath?` (optional) - Path if written to disk
  - `agentId?` (optional) - For Plan subagent source
  - `catalogId?` (optional) - Link to plan catalog entry
- **NO timestamp field** on planRefs items

### Related Type: SessionWebSearch (lines 761-768)
For fetching full web search details, there's also:
```typescript
export interface SessionWebSearch {
  query: string;
  resultCount: number;
  urls: Array<{ title: string; url: string }>;
  response: string;                     // Assistant's synthesized response
  timestamp: string;                    // *** ALSO HAS TIMESTAMP ***
}
```

All type definitions are properly exported from `/Users/gole/Desktop/jacques-dashboards-smaller-design/gui/src/api/index.ts`.