# Explore: Find Claude CLI debug options

> Session: `b9614f50-82aa-4001-b746-efcc74941c60`
> Date: 2026-02-01
> Tokens: ~41 395

---

Perfect! I now have comprehensive information. Let me compile my findings into a detailed report.

## Research Report: Token Breakdown Options in Claude Code CLI

I've completed a thorough research into how to get detailed token breakdown information from Claude Code CLI. Here are the options available:

### **1. Built-in In-Session Commands**

#### `/context` Slash Command (Official)
This is the primary way to see detailed token breakdown within Claude Code:
- Shows **approximate context usage** across different system components
- Displays **token consumption and remaining context window percentage**
- Provides a breakdown of how individual actions have consumed tokens
- Type `/context` directly in your Claude Code session to invoke it
- Note: This feature was introduced in Claude Code v1.0.86

**Token Data Visible:**
- Current input tokens
- Output tokens
- Cache creation tokens
- Cache read tokens
- Total context percentage used

### **2. Custom Status Line Integration**

The **statusline** feature allows real-time token tracking in the Claude Code interface:
- Configure a custom status line script (Bash, Python, Node.js, etc.)
- Claude Code passes **JSON context data** via stdin updated every 300ms
- The JSON input includes detailed `context_window` object with:
  - `total_input_tokens` / `total_output_tokens` (cumulative)
  - `used_percentage` and `remaining_percentage` (pre-calculated)
  - `current_usage` object containing input/output/cache breakdown
  - Total cost in USD and duration metrics

Add to `.claude/settings.json`:
```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh"
  }
}
```

### **3. CLI Debug & Verbose Flags**

Available command-line flags for debugging:

| Flag | Purpose |
|------|---------|
| `--verbose` | Enables detailed diagnostic output showing internal operations, tool executions, and API communications with timestamps |
| `--debug` | Advanced debugging mode with optional category filtering (e.g., `claude --debug "api,mcp"`) |
| `--debug "api,mcp"` | Filter debug output to specific categories (api, hooks, file, mcp, etc.) |
| `--debug "!statsig,!file"` | Exclude specific categories from debug output |

Example usage:
```bash
claude --verbose --debug "api"
claude --verbose "your prompt here" > debug.log 2>&1
```

### **4. Raw Transcript Files (JSONL)**

Access detailed token data by reading transcript files directly:
- **Location:** `~/.claude/projects/<project-name>/<conversation-id>.jsonl`
- **Format:** Newline-delimited JSON with one event per line
- **Token Data:** Each API response includes `usage` object with:
  - `input_tokens`
  - `output_tokens`
  - `cache_creation_input_tokens`
  - `cache_read_input_tokens`

### **5. Third-Party Analysis Tools**

#### **ccusage** - Official Analysis CLI
- Analyze Claude Code usage from local JSONL files
- Features:
  - View usage by date, week, month, or conversation session
  - Track token usage and costs aggregated multiple ways
  - Separate cache creation and cache read tokens
  - Export to JSON for programmatic use
  - Show cost in USD for each period
  - Run with `npx ccusage` (no installation needed)
  
Visit: [ccusage.com](https://ccusage.com/) or [GitHub](https://github.com/ryoppippi/ccusage)

#### **Other Third-Party Tools:**
- [Claude-Code-Usage-Monitor](https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor) - Real-time monitoring with predictions
- [claude-code-usage-analyzer](https://github.com/aarora79/claude-code-usage-analyzer) - Comprehensive breakdowns by model and token type
- [claude-code-otel](https://github.com/ColeMurray/claude-code-otel) - OpenTelemetry observability solution

### **6. Environment Variables for Debug Logging**

#### **ANTHROPIC_LOG=debug** (Deprecated/Not Recommended)
- Outputs API request/response logs to console
- Can create excessive output making it hard to see actual output
- There's an ongoing discussion to standardize this with `CLAUDE_DEBUG`

#### **CLAUDE_CODE_ENABLE_TELEMETRY=1** (Recommended for Production Monitoring)
- Enables OpenTelemetry-based telemetry export
- Configure with:
  - `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317`
  - `OTEL_EXPORTER_OTLP_PROTOCOL=grpc`
  - Export intervals: `OTEL_METRIC_EXPORT_INTERVAL=10000` (10 seconds)
- Requires OpenTelemetry Collector, Prometheus, and Grafana for visualization
- User prompts are redacted by default (set `OTEL_LOG_USER_PROMPTS=1` to include)

### **7. API-Level Token Access**

If using Claude Code SDK programmatically:
- **Claude Code Analytics API** - Provides token and cost data with breakdowns by model
- **Platform logs** at [platform.claude.com/workspaces/default/logs](https://platform.claude.com/workspaces/default/logs)

### **Quick Start Guide**

**For immediate token visibility:**
1. Type `/context` in Claude Code session
2. Or configure a custom statusline script for real-time display

**For session analysis:**
1. Install/run `ccusage` to analyze transcript files
2. Or write custom script to parse `~/.claude/projects/*/` JSONL files

**For production monitoring:**
1. Set `CLAUDE_CODE_ENABLE_TELEMETRY=1`
2. Configure OpenTelemetry with Prometheus/Grafana

**For debugging API interactions:**
1. Use `claude --verbose --debug "api"`
2. Or set `ANTHROPIC_LOG=debug` (note: creates verbose output)

### **Key Insights**

- Claude Code stores ALL detailed token data in JSONL transcript files
- The `/context` command provides the simplest in-session overview
- StatusLine is the most sophisticated option for continuous monitoring
- `ccusage` is the best third-party tool for post-session analysis
- OpenTelemetry integration is recommended for production environments
- Token breakdown includes cache metrics (creation and read tokens), which significantly impact context efficiency

Sources:
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Status Line Configuration Documentation](https://code.claude.com/docs/en/statusline)
- [Slash Commands Documentation](https://code.claude.com/docs/en/slash-commands)
- [ccusage - Claude Code Usage Analysis](https://ccusage.com/)
- [ccusage GitHub Repository](https://github.com/ryoppippi/ccusage)
- [Monitoring Documentation](https://code.claude.com/docs/en/monitoring-usage)
- [Shipyard: Claude Code Cheat Sheet](https://shipyard.build/blog/claude-code-cheat-sheet/)
- [Shipyard: How to Track Claude Code Usage](https://shipyard.build/blog/claude-code-track-usage/)
- [Claude-Code-Usage-Monitor](https://github.com/Maciek-rodoblog/Claude-Code-Usage-Monitor)
- [claude-code-usage-analyzer](https://github.com/aarora79/claude-code-usage-analyzer)