# Common Pitfalls, Known Bugs & Lessons Learned

## Common Pitfalls & Solutions

### Timing Issues
**Problem**: statusLine fires BEFORE SessionStart hook
**Solution**: Auto-register sessions from context_update events

### Project Detection
**Problem**: `cwd` in hook input may be `~/.claude`, not the project directory
**Solution**: Always prefer `workspace.project_dir` over `cwd`

### Empty Transcripts
**Problem**: Transcript may be empty at SessionStart
**Solution**: Generate fallback titles using project name

### Cursor Model Confusion
**Problem**: Cursor reports different models in different events
**Solution**: Only use model from `sessionStart` (user's actual model), ignore model from `preCompact` (internal Gemini Flash for summarization)

### Skill Overhead
**Problem**: Cursor injects ALL installed skills into EVERY message (~20k tokens for 17 skills)
**Solution**: Detect skills at session start, add to baseline estimate

### Bash Case Statement Syntax in Hooks
**Problem**: Case patterns with `<` characters in bash break with quoted syntax
```bash
# BROKEN - causes syntax error:
case "$content" in
  '<local-command'*) continue ;;
esac
```
**Solution**: Use first-character checking instead:
```bash
# WORKS:
first_char="${content:0:1}"
if [ "$first_char" = "<" ]; then
  continue
fi
```

### Embedded Plan Detection
**Problem**: Plan content must be ≥100 chars AFTER trigger phrase removal
**Example**: User message "Implement the following plan:\n\n# Title\n\nContent" is 120 chars, but after removing trigger (31 chars), content is only 89 chars
**Solution**: Ensure plan content alone exceeds 100 characters, not including the trigger phrase
**Test gotcha**: When writing tests, account for this when creating test data

### Claude Code Source Field
**Problem**: Claude Code sends `source: "clear"`, `source: "startup"`, `source: "resume"` to indicate how session started, not which AI tool
**Solution**: Normalize these to `claude_code` in session-registry.ts for internal tracking

### Output Tokens in JSONL Are Inaccurate
**Problem**: Claude Code JSONL files record `output_tokens: 1` or very low values (1-9) for every assistant entry, regardless of actual text content length. This appears to be a streaming artifact where only incremental/partial values are logged, not the final totals.
**Evidence**:
- Text with 8,156 characters shows `output_tokens: 1`
- All entries have `stop_reason: null` (incomplete streaming state)
- Sum across entire session gives ~500 output tokens when actual output is 10,000+ tokens
**Solution**: Use **tiktoken** (`@dqbd/tiktoken` with `cl100k_base` encoding) to count actual tokens from:
- Assistant message text (`entry.content.text`)
- Thinking blocks (`entry.content.thinking`)
- Tool call inputs (`JSON.stringify(entry.content.toolInput)`)
**Implementation**: `core/src/session/parser.ts` - `countTokens()` function and `totalOutputTokensEstimated` field
**Note**: Other tools like ccusage, toktrack also have this limitation - they just read the inaccurate JSONL values. Our tiktoken approach gives ~30-100x more accurate estimates.

## Known Bugs & Workarounds

### Claude Code Bug #18264
Even with `autoCompact: false`, compaction still triggers at ~78% context usage.

**Workaround**: Create handoff files before 70% usage to avoid automatic compaction.

## Lessons Learned

### Technical
- statusLine provides `transcript_path` - enables real-time parsing
- Different AI tools have incompatible field names - adapter pattern essential
- tiktoken not available in system Python 3.13 - always implement fallbacks
- JSONL user messages are `type: "user"`, NOT `queue-operation`
- Path encoding uses dashes, keep the leading dash
- Plan `source` field has three values: `"embedded" | "write" | "agent"` — grouping picks best via priority (write > embedded > agent)
- Jaccard similarity is lower than intuitive - 0.9 threshold appropriate for very similar plans
- Plan extraction triggers on Save Context or archive, not during active session
- Session index cache (`~/.jacques/cache/sessions-index.json`) has raw plan detections; catalog manifests (`.jacques/sessions/{id}.json`) have deduplicated planRefs with `catalogId` — server must overlay catalog data onto cache responses
- PlanNavigator must use backend `planRefs` when available (has `catalogId` for content loading); message-based re-detection is a fallback only for uncataloged sessions
- Agent plan content must be read from subagent JSONL (last substantial assistant message), not served as a redirect — the `/api/sessions/:id/plans/:messageIndex` endpoint handles all source types directly

### Process
- Read files before editing (especially for large codebases)
- Test each functionality before moving to next task
- Use TDD when possible (Phase 2, 3 had excellent test coverage)
- Remove dead code aggressively (Phase 7 removed 32.6 KB)
