# Explore: Research Claude CLI streaming

> Session: `ac1a5cd2-2e62-40c1-a692-206a423bc8c5`
> Date: 2026-02-01
> Tokens: ~42 124

---

Perfect! Now let me create a comprehensive research report. Based on my thorough investigation, I have all the information needed.

## Research Report: Claude Code CLI Streaming Output Support

I've completed a comprehensive investigation of how Claude Code CLI supports streaming output. Here are my findings:

### 1. **Streaming Output Formats Available**

Claude Code CLI provides three output formats via `--output-format`:

| Format | Behavior | Use Case |
|--------|----------|----------|
| `text` (default) | Waits for complete response, outputs plain text | Simple one-shot queries |
| `json` | Waits for complete response, outputs as single JSON object | Structured output, API integration |
| `stream-json` | **Real-time streaming JSON** | Real-time feedback, progressive UI updates |

### 2. **Streaming Key Flags**

Two essential flags control streaming behavior:

- **`--output-format stream-json`**: Enables streaming output (requires `--print` and `--verbose` flags)
- **`--include-partial-messages`**: Includes partial message chunks as they arrive (works **only** with `stream-json` format)

**Important constraint**: When using `--output-format=stream-json`, the `--verbose` flag is required.

### 3. **Current Implementation in Jacques**

The current `llm-generator.ts` uses:
```typescript
const args = [
  "-p",
  userPrompt,
  "--system-prompt",
  systemPrompt,
  "--output-format",
  "json",  // ← Non-streaming, waits for full response
  "--allowedTools",
  "Read,Write,Glob,Grep",
];
```

This **waits for the complete response** before returning. The implementation buffers all output before parsing:
```typescript
proc.stdout?.on("data", (data: Buffer) => {
  stdout += data.toString();  // ← Accumulates entire output
});
```

### 4. **Stream Event Types Available**

When using `--output-format stream-json --include-partial-messages`, Claude Code emits multiple event types in sequence:

| Event Type | Description | Use for Real-Time Feedback |
|------------|-------------|---------------------------|
| `stream_event` (message_start) | Message stream begins | Show "thinking..." indicator |
| `stream_event` (content_block_start) | Content block (text/tool) begins | Show block type |
| `stream_event` (content_block_delta) | **Partial text chunk arrives** | Update UI with incremental text |
| `stream_event` (content_block_stop) | Content block complete | Finalize block display |
| `stream_event` (message_delta) | Stop reason and final metadata | Show completion status |
| `stream_event` (message_stop) | Message stream ends | Final cleanup |
| `assistant` | Complete message object | Alternative to accumulating deltas |

### 5. **Example Stream Output Structure**

```json
// Event 1: Stream starts
{"type":"stream_event","event":{"type":"message_start",...}}

// Events 2-N: Text arrives incrementally
{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"Once upon"}}}
{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":" a"}}}
{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":" time"}}}

// Event N+1: Stream completes
{"type":"stream_event","event":{"type":"message_stop",...}}
```

### 6. **Streaming Support Matrix**

| Requirement | Support | Notes |
|-------------|---------|-------|
| Thinking (extended thinking) | ✅ Likely supported | As `content_block` type | 
| Partial responses | ✅ Full support | `content_block_delta` events |
| Token metrics | ✅ Available | In final `message_delta` |
| Tool calls | ✅ Streamable | As separate content blocks |
| Progress indication | ⚠️ Manual | Not built-in; need to track deltas |
| Usage accounting | ✅ Per-stream update | In `message_delta` events |

### 7. **Opportunities for Jacques Dashboard**

The dashboard's `LLMWorkingView` component currently shows:
- Spinner animation
- Progress percentage
- Elapsed time
- Status message

**To add streaming support**, you could:

1. **Show live output updates**: Parse `content_block_delta` events to display text as it arrives
2. **Real-time progress**: Count deltas to show character accumulation
3. **Thinking indicator**: Detect `content_block` with type `thinking` to show extended thinking status
4. **Token tracking**: Display input/output tokens from `message_delta` events
5. **Graceful cancellation**: Use `AbortSignal` to cleanly terminate stream on user cancel

### 8. **Implementation Pattern**

To modify `llm-generator.ts` for streaming:

```typescript
// Current approach (wait for complete response)
const args = ["--output-format", "json"];
// Accumulates ALL output before parsing

// Streaming approach
const args = [
  "--output-format", "stream-json",
  "--include-partial-messages",
  "--verbose"
];
// Processes events incrementally via newline-delimited JSON
```

Each line would be a complete JSON object (no line breaks within events), enabling line-by-line parsing.

### 9. **Key Constraint for Dashboard Integration**

The dashboard cannot run inline in Claude Code (requires TTY), so streaming would primarily benefit:
- Background handoff generation with visual progress
- Script-based LLM workflows (not interactive TTY)
- Future web-based UI extensions

### 10. **Testing Command**

You can test streaming with:
```bash
claude -p "Say hello" \
  --output-format stream-json \
  --include-partial-messages \
  --verbose | jq 'select(.type=="stream_event")'
```

This demonstrates real-time text arrival via `content_block_delta` events.

### Summary

Claude Code CLI has **full streaming support** via `--output-format=stream-json` and `--include-partial-messages`, enabling real-time feedback with:
- Incremental text chunks (`content_block_delta`)
- Thinking blocks (if extended thinking enabled)
- Live token usage updates
- Proper event sequencing for UI updates

The current Jacques implementation uses non-streaming JSON, which provides full results at the cost of latency during long operations. Switching to streaming would enable interactive progress indication for handoff generation and other LLM operations.