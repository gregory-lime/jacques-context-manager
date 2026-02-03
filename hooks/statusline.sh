#!/bin/bash
#
# Jacques statusLine Script
#
# Receives JSON from Claude Code's statusLine feature via stdin.
# Extracts session_id and context_window data.
# Sends context update to Jacques server via Unix socket.
# Displays abbreviated status for Claude Code's status bar.
#

# Skip if running as subprocess, JACQUES_SKIP=1, or ~/.jacques/skip exists
if [ "$JACQUES_SUBPROCESS" = "1" ] || [ "$JACQUES_SKIP" = "1" ] || [ -f "$HOME/.jacques/skip" ]; then
  exit 0
fi

# Read all input from stdin
input=$(cat)

# Exit if no input
if [ -z "$input" ]; then
  exit 0
fi

# Extract key fields using jq
session_id=$(echo "$input" | jq -r '.session_id // empty')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // 0')
remaining_pct=$(echo "$input" | jq -r '.context_window.remaining_percentage // 100')
ctx_size=$(echo "$input" | jq -r '.context_window.context_window_size // 0')
total_input=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
total_output=$(echo "$input" | jq -r '.context_window.total_output_tokens // 0')
model=$(echo "$input" | jq -r '.model.id // "unknown"')
model_display=$(echo "$input" | jq -r '.model.display_name // "Unknown"')
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
project_dir=$(echo "$input" | jq -r '.workspace.project_dir // ""')
transcript_path=$(echo "$input" | jq -r '.transcript_path // ""')

# Extract session title from multiple sources
session_title=""


# Source 1: Try sessions-index.json (has the dynamic title Claude shows in resume list)
if [ -n "$transcript_path" ] && [ -n "$session_id" ]; then
  # Derive the sessions-index.json path from transcript path
  transcript_dir=$(dirname "$transcript_path")
  sessions_index="$transcript_dir/sessions-index.json"
  if [ -f "$sessions_index" ]; then
    session_title=$(jq -r --arg sid "$session_id" '.entries[] | select(.sessionId == $sid) | .summary // empty' "$sessions_index" 2>/dev/null)
  fi
fi

# Source 2: Try transcript summary entries (written during conversation)
if [ -z "$session_title" ] && [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
  session_title=$(grep '"type":"summary"' "$transcript_path" 2>/dev/null | tail -1 | jq -r '.summary // empty' 2>/dev/null)
fi

# Source 3: Fallback to first REAL user message (skip internal Claude Code messages)
if [ -z "$session_title" ] && [ -n "$transcript_path" ] && [ -f "$transcript_path" ]; then
  # Find first user message that is NOT an internal Claude Code message
  raw_title=$(grep '"type":"user"' "$transcript_path" 2>/dev/null | while read -r line; do
    content=$(echo "$line" | jq -r '.message.content // empty' 2>/dev/null)
    # Skip empty content
    [ -z "$content" ] && continue
    # Skip internal Claude Code XML tags and JSON arrays
    first_char="${content:0:1}"
    if [ "$first_char" = "<" ] || [ "$first_char" = "[" ]; then
      continue
    fi
    # Found a real user message
    echo "$content" | tr '\n' ' ' | head -c 50
    break
  done)
  if [ -n "$raw_title" ]; then
    session_title="${raw_title}..."
  fi
fi


# Read auto-compact settings from ~/.claude/settings.json
autocompact_enabled="true"
autocompact_threshold="${CLAUDE_AUTOCOMPACT_PCT_OVERRIDE:-95}"
autocompact_bug_threshold="null"

# Check settings.json for autoCompact setting
if [ -f "$HOME/.claude/settings.json" ]; then
  ac_setting=$(jq -r '.autoCompact // "null"' "$HOME/.claude/settings.json" 2>/dev/null)
  if [ "$ac_setting" = "false" ]; then
    autocompact_enabled="false"
    # Known bug: compaction still triggers at ~78% even when disabled
    autocompact_bug_threshold="78"
  fi
fi

# Only proceed if we have a session_id
if [ -z "$session_id" ]; then
  # No session_id, just show basic status
  printf "ctx:?%%"
  exit 0
fi

# Capture terminal identity for focus detection
iterm_session_id="${ITERM_SESSION_ID:-}"
term_session_id="${TERM_SESSION_ID:-}"
kitty_window_id="${KITTY_WINDOW_ID:-}"
terminal_pid="$$"

# Build terminal_key (same logic as jacques-register-session.py)
if [ -n "$iterm_session_id" ]; then
  terminal_key="ITERM:$iterm_session_id"
elif [ -n "$kitty_window_id" ]; then
  terminal_key="KITTY:$kitty_window_id"
elif [ -n "$term_session_id" ]; then
  terminal_key="TERM:$term_session_id"
else
  terminal_key=""
fi

# Send to Jacques server (if socket exists and server is running)
if [ -S /tmp/jacques.sock ]; then
  # Build JSON payload with autocompact info, terminal identity, and session title
  timestamp=$(date +%s)
  # Escape special characters in session_title for JSON
  escaped_title=$(echo "$session_title" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' | tr '\n' ' ')
  payload=$(cat <<EOF
{"event":"context_update","session_id":"$session_id","used_percentage":$used_pct,"remaining_percentage":$remaining_pct,"context_window_size":$ctx_size,"total_input_tokens":$total_input,"total_output_tokens":$total_output,"model":"$model","model_display_name":"$model_display","cwd":"$cwd","project_dir":"$project_dir","timestamp":$timestamp,"autocompact":{"enabled":$autocompact_enabled,"threshold":$autocompact_threshold,"bug_threshold":$autocompact_bug_threshold},"terminal_key":"$terminal_key","session_title":"$escaped_title","transcript_path":"$transcript_path"}
EOF
)
  
  # Send to socket (non-blocking, ignore errors)
  echo "$payload" | nc -U /tmp/jacques.sock 2>/dev/null &
fi

# Display abbreviated status in Claude Code status bar
# Format: [Model] ctx:XX% [AC:ON/OFF]
# Round percentage for display
used_int=${used_pct%.*}
if [ -z "$used_int" ]; then
  used_int="0"
fi

# Build auto-compact status indicator
if [ "$autocompact_enabled" = "true" ]; then
  ac_indicator="AC:ON@${autocompact_threshold}%"
else
  ac_indicator="AC:OFF"
fi

# Add warning indicator based on context level and auto-compact settings
if [ "$autocompact_enabled" = "false" ] && [ "$used_int" -ge 70 ]; then
  # Warning: Bug may trigger at ~78% even when disabled
  printf "[%s] ctx:%s%% ⚠️78%% [%s]" "$model_display" "$used_int" "$ac_indicator"
elif [ "$used_int" -ge 80 ]; then
  printf "[%s] ctx:%s%% ⚠️ [%s]" "$model_display" "$used_int" "$ac_indicator"
else
  printf "[%s] ctx:%s%% [%s]" "$model_display" "$used_int" "$ac_indicator"
fi
