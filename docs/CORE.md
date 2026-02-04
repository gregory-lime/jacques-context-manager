# Core Package (`@jacques/core`)

Shared business logic used by server, dashboard CLI, and GUI. Must be built first — server and dashboard depend on its compiled `.d.ts` files.

**Build**: `cd core && npx tsc`
**Test**: `cd core && npm test`
**Exports**: 8 submodules via `package.json` exports map

## Module Map

| Module | Import Path | Responsibility |
|--------|-------------|----------------|
| Session | `@jacques/core/session` | JSONL parsing, filtering, token estimation |
| Archive | `@jacques/core/archive` | Cross-project search, plan extraction/dedup |
| Context | `@jacques/core/context` | `.jacques/index.json` CRUD, project knowledge |
| Catalog | `@jacques/core` | Pre-extract JSONL → `.jacques/` manifests |
| Sources | `@jacques/core/sources` | External adapters (Obsidian, Google Docs, Notion) |
| Storage | `@jacques/core/storage` | Save context (JSONL → JSON transformation) |
| Client | `@jacques/core/client` | WebSocket client (`JacquesClient`) |
| Handoff | `@jacques/core/handoff` | Session handoff generation |
| Utils | `@jacques/core/utils` | Settings, Claude token management |
| Cache | `core/src/cache/` | Session index reading (not exported) |
| Project | `core/src/project/` | Aggregation for dashboard |

## Session Module (`core/src/session/`)

Parses Claude Code JSONL transcripts. See `docs/JSONL-FORMAT.md` for the JSONL schema.

- `detector.ts` — Find sessions, list subagent files, encode/decode project paths
- `parser.ts` — Parse JSONL entries, categorize by type, estimate output tokens via tiktoken
- `transformer.ts` — Convert JSONL to SavedContext format
- `filters.ts` — Filter entries by type (messages, tools, thinking)
- `token-estimator.ts` — Token counting with tiktoken `cl100k_base`

## Archive Module (`core/src/archive/`)

Cross-project conversation search and plan management.

- `manifest-extractor.ts` — Extract metadata from sessions (title, files, technologies)
- `plan-extractor.ts` — Detect embedded plans via trigger phrases ("Implement the following plan:")
- `plan-cataloger.ts` — Cross-session dedup: SHA-256 exact match + Jaccard 90% fuzzy match
- `search-indexer.ts` — Tokenize and build keyword inverted index
- `archive-store.ts` — Read/write `~/.jacques/archive/` (manifests, conversations, plans)
- `bulk-archive.ts` — Scan `~/.claude/projects/` and archive all sessions

**Storage**: `~/.jacques/archive/` (index.json, manifests/, conversations/, plans/)

## Context Module (`core/src/context/`)

Manages per-project `.jacques/index.json` (ProjectIndex v2.0.0).

- `types.ts` — Schema: context entries, session entries, plan entries, subagent entries
- `indexer.ts` — CRUD for index.json, v2 migration (adds `subagents: []`)
- `manager.ts` — File operations (copy to `.jacques/context/`, delete, estimate tokens)

**SubagentEntry.type**: `'exploration'` (Explore agent) or `'search'` (web search)

## Catalog Module (`core/src/catalog/`)

Pre-extracts expensive data from JSONL into per-project `.jacques/` for fast loading.

- `extractor.ts` — Single-session extraction: manifest + plan grouping + subagent extraction
- `bulk-extractor.ts` — All sessions for one project or across all projects
- `types.ts` — SessionManifest schema, extraction options

**Within-session plan dedup**: Groups embedded/agent/write detections into logical plans. Priority: write > embedded > agent. Merges sources, filePath, agentId, catalogId into the winner.

**Incremental**: Compares JSONL mtime against manifest `jsonlModifiedAt`. Use `force: true` to re-extract.

**Output**: `.jacques/sessions/{id}.json` (manifest), `.jacques/plans/`, `.jacques/subagents/`

## Sources Module (`core/src/sources/`)

External context adapters for importing documentation into projects.

- `config.ts` — Load/save `~/.jacques/config.json`
- `obsidian.ts` — Vault detection, file listing, tree building
- `googledocs.ts` — OAuth flow, Drive listing, export-to-markdown
- `notion.ts` — OAuth flow, page search, content fetching

## Handoff Module (`core/src/handoff/`)

Session handoff generation for continuing work across sessions.

- `generator.ts` — Extract from transcript (files modified, tools used, recent messages)
- `catalog.ts` — List, read, store handoff files in `.jacques/handoffs/`
- `prompts.ts` — Handoff prompt templates

**Output**: `.jacques/handoffs/{timestamp}-handoff.md`

## Plan Identity System

Plans undergo two-level deduplication:

**Within-session** (`catalog/extractor.ts`): Sort planRefs by messageIndex → `embedded` starts group → `agent`/`write` join → pick best (write > embedded > agent) → merge metadata.

**Cross-session** (`archive/plan-cataloger.ts`): SHA-256 hash → exact match. Same title + 90% Jaccard → fuzzy match. Result: `PlanEntry.sessions[]` tracks all sessions.

**Three detection sources**:
| Source | Trigger | Location |
|--------|---------|----------|
| `embedded` | User pastes plan with trigger phrase | User message in JSONL |
| `agent` | Plan subagent generates plan | Subagent JSONL |
| `write` | Claude writes plan to `.md` file | File on disk |

## Cache Module (`core/src/cache/`)

Lightweight session indexing — reads Claude Code's native `sessions-index.json` with fallback to direct JSONL scanning.

- `session-index.ts` — `readSessionIndex()`, `buildSessionIndex()`, `detectModeAndPlans()`
- Filters out internal agents (auto-compact, prompt_suggestion) from counts
- Sets `hadAutoCompact: true` flag when auto-compact agent detected
