# Explore: Explore context tracking flow

> Session: `4e8b242b-82fb-4157-ad12-50fd2139a446`
> Date: 2026-01-31
> Tokens: ~64 678

---

Excellent! Now I have a comprehensive understanding of the system. Let me create a detailed report of my findings.

## Jacques Context Manager - Context Tracking Analysis Report

I've thoroughly investigated the Jacques context manager to understand how context percentages are tracked and displayed. Here's my comprehensive analysis of the system and potential issues:

---

## System Architecture Overview

### Three-Layer Architecture

1. **Hooks Layer** (Python/Bash): Claude Code and Cursor hooks send events via Unix socket
2. **Server Layer** (Node.js/TypeScript): Manages sessions in registry, broadcasts updates via WebSocket
3. **Dashboard Layer** (Ink/React): Receives real-time updates, displays context metrics

---

## Context Data Flow Path

```
statusline.sh or preCompact event
    ↓ (Unix socket /tmp/jacques.sock)
server.ts::handleContextUpdate()
    ↓
session-registry.ts::updateContext()
    ↓ (stores in session.context_metrics)
websocket.ts::broadcastSessionUpdate()
    ↓ (WebSocket port 4242)
dashboard: websocket-client.ts → useJacquesClient hook
    ↓
Components: ContextProgress.tsx, SessionDetails.tsx, ProgressBar.tsx
    ↓
Terminal display
```

---

## Key Files and Their Responsibilities

### 1. **server/src/types.ts** (Lines 57-74: ContextMetrics Interface)
```typescript
export interface ContextMetrics {
  used_percentage: number;           // 0-100
  remaining_percentage: number;      // 0-100
  total_input_tokens: number;        // Actual tokens used
  total_output_tokens: number;       // Output tokens
  context_window_size: number;       // Max context (e.g., 200000)
  is_estimate?: boolean;             // Flag for estimation vs. actual
}
```

**Critical Detail**: All context metrics are stored in `session.context_metrics` field, which can be `null` (line 137).

### 2. **server/src/session-registry.ts** (Context Update Handler)

#### Lines 184-193: Metrics Creation with Defaults
```typescript
const metrics: ContextMetrics = {
  used_percentage: event.used_percentage ?? 0,      // Defaults to 0
  remaining_percentage: event.remaining_percentage ?? 100,
  context_window_size: event.context_window_size ?? 0,
  total_input_tokens: event.total_input_tokens ?? 0,
  total_output_tokens: event.total_output_tokens ?? 0,
  is_estimate: event.is_estimate ?? false,
};
```

**Issue #1: Coalescing to Zero**
- If `used_percentage` is undefined, it becomes 0
- If `context_window_size` is undefined, it becomes 0
- This masks transmission errors

#### Line 232: Auto-Focus on Context Update
```typescript
this.focusedSessionId = event.session_id;  // Context update auto-focuses
```

#### Lines 235-245: Terminal Key and Title Updates
Only updates from `context_update` events if they came from statusLine hook with fresh data.

### 3. **hooks/statusline.sh** (Context Data Source)

#### Lines 25-30: Data Extraction from Claude Code
```bash
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // 0')
remaining_pct=$(echo "$input" | jq -r '.context_window.remaining_percentage // 100')
ctx_size=$(echo "$input" | jq -r '.context_window.context_window_size // 0')
total_input=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_output=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
```

**Issue #2: jq Fallbacks**
- All fields use `// 0` or `// 100` fallback in jq
- If Claude Code doesn't send these fields, they silently default to 0

#### Lines 93-104: Transmission to Server
```bash
if [ -S /tmp/jacques.sock ]; then
  # ... build payload ...
  echo "$payload" | nc -U /tmp/jacques.sock 2>/dev/null &  # Non-blocking
fi
```

**Issue #3: Silent Transmission Failures**
- `2>/dev/null` suppresses errors
- `&` runs in background, so failures are not detected
- Socket not existing silently fails

#### Lines 25-31: Session ID Check
```bash
session_id=$(echo "$input" | jq -r '.session_id // empty')
# ...
if [ -z "$session_id" ]; then
  printf "ctx:?%%"  # <-- Shows "ctx:?" when no session_id
  exit 0
fi
```

**Issue #4: Early Exit for Missing session_id**
- Returns `ctx:?%` immediately if `session_id` is empty

### 4. **dashboard/src/components/ContextProgress.tsx** (Display)

#### Lines 27-35: Null Metrics Handling
```typescript
const metrics = session.context_metrics;

if (!metrics) {
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text color="gray"> Context: Waiting for data...</Text>
    </Box>
  );
}
```

**Issue #5: Shows "Waiting for data" indefinitely**
- If `context_metrics` is null, user sees this message
- No timeout or error indication

#### Lines 37-40: Metric Extraction
```typescript
const percentage = metrics.used_percentage;      // Could be 0
const usedTokens = metrics.total_input_tokens || 0;
const windowSize = metrics.context_window_size || 0;
const isEstimate = metrics.is_estimate ?? false;
```

### 5. **dashboard/src/components/ProgressBar.tsx** (MiniProgress)

#### Lines 62-77: Null Handling
```typescript
export function MiniProgress({
  percentage,
  isEstimate = false,
}: MiniProgressProps): React.ReactElement {
  if (percentage === null) {
    return <Text color="gray">ctx:?%</Text>;  // <-- "ctx:?" display
  }
  // ...
}
```

### 6. **dashboard/src/components/SessionDetails.tsx** (Detailed View)

#### Lines 84-88: Null Check
```typescript
const metrics = session.context_metrics;

if (!metrics) {
  return <Text color="gray">Context metrics not yet available</Text>;
}
```

#### Lines 90-96: Value Extraction with Zero Handling
```typescript
const pct = metrics.used_percentage;      // Could be 0 or null
const total = formatTokens(metrics.context_window_size);
const used = formatTokens(
  metrics.total_input_tokens + metrics.total_output_tokens,
);
```

---

## Potential Issues Where Context Shows 0%, "?", or "Unknown"

### Issue #1: Silent jq Failures in statusline.sh
**Location**: `hooks/statusline.sh` lines 25-30

**Problem**: If Claude Code's stdin JSON is malformed or missing fields, jq silently defaults to 0:
```bash
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // 0')
```

**Impact**: Context always shows 0% even if Claude Code has context data

**When This Occurs**:
- Claude Code statusLine feature disabled
- Claude Code stdin format changed
- jq not installed or broken

---

### Issue #2: Socket Not Listening
**Location**: `hooks/statusline.sh` line 93

**Problem**:
```bash
if [ -S /tmp/jacques.sock ]; then
  echo "$payload" | nc -U /tmp/jacques.sock 2>/dev/null &
fi
```

**Impact**: 
- If server not running, payload is silently discarded
- No error message to user
- Context never reaches dashboard

**When This Occurs**:
- Jacques server not started
- Server crashed
- /tmp/jacques.sock is stale

---

### Issue #3: Metrics Coalescing to Zero in Registry
**Location**: `server/src/session-registry.ts` lines 186-191

**Problem**:
```typescript
const metrics: ContextMetrics = {
  used_percentage: event.used_percentage ?? 0,      // Becomes 0 if undefined
  remaining_percentage: event.remaining_percentage ?? 100,
  context_window_size: event.context_window_size ?? 0,  // Becomes 0 if undefined
  total_input_tokens: event.total_input_tokens ?? 0,
  total_output_tokens: event.total_output_tokens ?? 0,
  is_estimate: event.is_estimate ?? false,
};
```

**Impact**:
- If `context_update` event has undefined fields, they become 0
- Context percentage shows 0%
- Window size shows 0, causing division issues

**When This Occurs**:
- Partial JSON transmitted from hook
- Network corruption
- Event construction bug in hooks

---

### Issue #4: No session_id in statusLine Input
**Location**: `hooks/statusline.sh` lines 25, 69-72

**Problem**:
```bash
session_id=$(echo "$input" | jq -r '.session_id // empty')

if [ -z "$session_id" ]; then
  printf "ctx:?%%"  # <-- Shows question mark
  exit 0
fi
```

**Impact**: Dashboard shows `ctx:?%` in status bar

**When This Occurs**:
- Claude Code doesn't include session_id in statusLine input
- This is a Claude Code internal issue, not Jacques

---

### Issue #5: Auto-Registration Race Condition
**Location**: `server/src/session-registry.ts` lines 134-175

**Problem**: If `context_update` event arrives BEFORE `session_start`:
```typescript
updateContext(event: ContextUpdateEvent): Session {
  let session = this.sessions.get(event.session_id);
  
  if (!session) {
    // Auto-registers with fallback title
    session = {
      // ... lots of initialization ...
      context_metrics: null,  // <-- Starts as null!
    };
  }
  // ... then updates context_metrics below
}
```

**Impact**:
- First `context_update` finds no session and creates one
- But context_metrics is initially null
- Second part of same function sets it (lines 185-193)
- This is correct behavior, but adds complexity

---

### Issue #6: Null Metrics Persists
**Location**: `server/src/session-registry.ts` line 41-58, 130-175

**Problem**: Sessions can exist with `context_metrics: null` if:
- Session registered before any context update
- Context updates stop coming
- statusLine hook fails silently

**Impact**:
- Dashboard shows "Waiting for data..." indefinitely
- Session appears "unknown" to user

---

### Issue #7: Missing Timestamp Field
**Location**: `hooks/statusline.sh` line 95

**Note**: Timestamp is generated in shell script:
```bash
timestamp=$(date +%s)
```

**Potential Issue**: If date command fails or returns invalid value, it could cause problems

---

### Issue #8: Escaped Characters in JSON
**Location**: `hooks/statusline.sh` lines 96-97

```bash
escaped_title=$(echo "$session_title" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | tr '\n' ' ')
```

**Issue**: If special characters break JSON formatting, server parser fails silently

---

## Context Update Event Fields

From `server/src/types.ts` lines 191-210:

```typescript
export interface ContextUpdateEvent extends BaseEvent {
  event: 'context_update';
  used_percentage: number;              // CRITICAL
  remaining_percentage: number;         // Computed as 100 - used_percentage
  context_window_size: number;          // CRITICAL
  total_input_tokens?: number;          // Optional (uses 0 if missing)
  total_output_tokens?: number;         // Optional (uses 0 if missing)
  model: string;                        // Source model
  model_display_name?: string;          // Human-readable model name
  cwd: string;                          // Working directory
  project_dir?: string;                 // Project path
  is_estimate?: boolean;                // True if from hooks, false if from preCompact
  autocompact?: AutoCompactStatus;      // Auto-compact settings
  terminal_key?: string;                // Terminal identifier
  session_title?: string;               // Session title from transcript
}
```

**Critical Fields That Must Not Be Undefined**:
- `used_percentage`
- `context_window_size`
- `model`

---

## Dashboard Display Logic

### When Context Shows as "?"

**Location**: `dashboard/src/components/ProgressBar.tsx` lines 62-64

```typescript
if (percentage === null) {
  return <Text color="gray">ctx:?%</Text>;  // Shows "?"
}
```

**Reasons**:
1. Session not yet registered
2. `context_metrics` is null
3. `used_percentage` is undefined

---

### When Context Shows as "Waiting for data..."

**Location**: `dashboard/src/components/ContextProgress.tsx` lines 29-34

```typescript
if (!metrics) {
  return (
    <Box flexDirection="column" paddingY={1}>
      <Text color="gray"> Context: Waiting for data...</Text>
    </Box>
  );
}
```

**Reasons**:
1. Session exists but no context_update event received yet
2. statusLine hook never fired
3. Server crashed after session registration

---

## Known Working Paths

### Successful Context Update Flow

1. **statusline.sh** receives JSON from Claude Code
2. Extracts `session_id`, context fields using jq
3. Sends via `nc` to `/tmp/jacques.sock` (non-blocking)
4. **unix-socket.ts** receives on socket
5. **session-registry.ts** parses and stores metrics
6. **websocket.ts** broadcasts session update
7. **websocket-client.ts** receives message
8. **useJacquesClient** hook updates React state
9. **Components** re-render with new percentage

---

## Summary of Critical Issues

| Issue | Location | Impact | Severity |
|-------|----------|--------|----------|
| **Silent jq failures** | `statusline.sh:25-30` | Context defaults to 0% | HIGH |
| **No error on socket fail** | `statusline.sh:93-104` | Updates silently lost | HIGH |
| **Null metrics persist** | `session-registry.ts:75` | Shows "Waiting..." forever | MEDIUM |
| **Zero coalescing** | `session-registry.ts:186` | Can't distinguish 0% from no-data | MEDIUM |
| **No session_id** | `statusline.sh:69-72` | Shows "ctx:?" | LOW |
| **Missing timestamp** | `statusline.sh:95` | Rare but possible | LOW |
| **JSON escaping** | `statusline.sh:96-97` | Parser fails silently | MEDIUM |
| **No timeout** | `ContextProgress.tsx:29-34` | Indefinite "Waiting..." message | LOW |

---

## Diagnostic Commands

To troubleshoot context display issues:

```bash
# Check if server is running
ps aux | grep "node.*server"

# Check socket exists
ls -la /tmp/jacques.sock

# Check statusline output manually
echo 'test data' | /path/to/statusline.sh

# Monitor Unix socket traffic
nc -U /tmp/jacques.sock

# Check WebSocket connection
curl ws://localhost:4242

# Monitor server logs
# (Run in separate terminal)
npm run start:server

# Check hook debug log
tail -f /tmp/jacques-hook-debug.log
```

---

## Recommended Fixes

1. **Add error handling** in `statusline.sh` for socket transmission failures
2. **Validate jq output** is not empty/zero before sending
3. **Add timeout** to "Waiting for data..." message in dashboard
4. **Log metrics to debug file** for troubleshooting
5. **Add health check endpoint** to server for dashboard status
6. **Validate required fields** in context_update event before coalescing
7. **Add explicit error states** instead of silent defaults

---

This analysis should help you understand exactly where context percentages can go wrong and provide a foundation for implementing fixes or debugging specific issues.