# Explore: Search GitHub for JSONL token counting

> Session: `a9029535-764d-4a8d-8373-5a4e075eca68`
> Date: 2026-02-01
> Tokens: ~20 320

---

Based on my search, here are the most relevant projects and patterns for parsing Claude Code JSONL transcripts and counting tokens:

## Key Projects Found

### Token Counting & Usage Analysis

1. **ccusage** (https://github.com/ryoppippi/ccusage)
   - CLI tool specifically designed for analyzing Claude Code usage from local JSONL files
   - Offers daily reports, monthly aggregated reports, and usage by conversation session
   - Tracks 5-hour billing windows
   - Website: https://ccusage.com/

2. **claude-code-usage-analyzer** (https://github.com/aarora79/claude-code-usage-analyzer)
   - Comprehensive cost & token usage analyzer for Claude Code
   - Detailed breakdowns by model and token type
   - Uses ccusage CLI tool and LiteLLM pricing data
   - Raw token data stored in `${HOME}/.claude/projects/<project-name>/<conversation-id>.jsonl`

3. **claude-code-otel** (https://github.com/ColeMurray/claude-code-otel)
   - Comprehensive observability solution with Grafana dashboard
   - Monitors active sessions, cost, token usage, lines of code changed
   - Features model cost comparison and API request tracking
   - Token usage breakdown by type

### JSONL Parsing & Conversion Tools

4. **claude-code-transcripts** (https://github.com/simonw/claude-code-transcripts)
   - Converts Claude Code session files (JSON or JSONL) to clean HTML pages
   - Works with both local JSONL files and web-extracted sessions
   - Includes token usage tracking per message and session totals
   - Blog post: https://simonwillison.net/2025/Dec/25/claude-code-transcripts/

5. **claude-code-log** (https://github.com/daaain/claude-code-log)
   - Python CLI converting JSONL to readable HTML
   - Supports cross-session summary matching and date range filtering
   - Rich message type handling (user/assistant/tool use)

6. **claude-JSONL-browser** (https://github.com/withLinda/claude-JSONL-browser)
   - Web-based converter from JSONL to human-readable Markdown
   - Built-in file explorer for managing multiple logs

7. **@constellos/claude-code-kit** (https://www.npmjs.com/package/@constellos/claude-code-kit)
   - TypeScript toolkit with `parseTranscript()` function
   - Parses JSONL and provides access to main agent and subagent messages

### Data & Analysis Approaches

- **DuckDB Analysis** (https://liambx.com/blog/claude-code-log-analysis-with-duckdb)
  - JSONL files can be queried directly using DuckDB
  - Each line represents a single event (user message, AI thought, tool usage)

## Key Patterns for Token Counting

From the CLAUDE.md and search results, the token counting patterns are:

1. **Token Fields in Transcripts**: Each assistant message contains:
   - `input_tokens`
   - `output_tokens`
   - `cache_creation_input_tokens`
   - `cache_read_input_tokens`

2. **Context Calculation Logic**:
   - Parse JSONL transcript file line-by-line
   - Find most recent main chain entry (skip sidechain entries and API errors)
   - Sum: `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`
   - Only main chain entries count; subagent/error entries don't affect primary context

3. **Subagent Aggregation**: 
   - The feature request at https://github.com/anthropics/claude-code/issues/15677 indicates this isn't yet officially exposed
   - Community tools like ccusage calculate this by parsing the JSONL directly

4. **Session Storage**: 
   - Local sessions: `~/.claude/projects/<project-name>/<conversation-id>.jsonl`
   - Each line is a complete JSON object representing one event

## Useful Resources

- **Claude Code Hooks Documentation**: https://code.claude.com/docs/en/hooks
- **Token Counting API Docs**: https://platform.claude.com/docs/en/build-with-claude/token-counting
- **Context Usage Blog**: https://codelynx.dev/posts/calculate-claude-code-context

Sources:
- [GitHub - ryoppippi/ccusage](https://github.com/ryoppippi/ccusage)
- [GitHub - aarora79/claude-code-usage-analyzer](https://github.com/aarora79/claude-code-usage-analyzer)
- [GitHub - ColeMurray/claude-code-otel](https://github.com/ColeMurray/claude-code-otel)
- [GitHub - simonw/claude-code-transcripts](https://github.com/simonw/claude-code-transcripts)
- [GitHub - daaain/claude-code-log](https://github.com/daaain/claude-code-log)
- [GitHub - withLinda/claude-JSONL-browser](https://github.com/withLinda/claude-JSONL-browser)
- [GitHub - constellos/claude-code-kit](https://www.npmjs.com/package/@constellos/claude-code-kit)
- [A new way to extract detailed transcripts from Claude Code](https://simonwillison.net/2025/Dec/25/claude-code-transcripts/)
- [Analyzing Claude Code Interaction Logs with DuckDB](https://liambx.com/blog/claude-code-log-analysis-with-duckdb)
- [How to Calculate Your Claude Code Context Usage](https://codelynx.dev/posts/calculate-claude-code-context)
- [Feature Request: Expose sub-agent context sizes in statusline API](https://github.com/anthropics/claude-code/issues/15677)
- [Expose token usage data to statusline scripts](https://github.com/anthropics/claude-code/issues/11535)