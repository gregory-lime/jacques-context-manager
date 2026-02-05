# Explore: Find server config defaults

> Session: `2675b2c7-1934-40b6-ad55-d193add7730f`
> Date: 2026-02-03
> Tokens: ~24 390

---

Here are the default configuration values from the file:

**Default Configuration Values:**

| Config | Default Value | Environment Variable |
|--------|---------------|----------------------|
| **unixSocketPath** | `/tmp/jacques.sock` | `JACQUES_SOCKET_PATH` |
| **wsPort** | `4242` | `JACQUES_WS_PORT` |
| **httpPort** | `4243` | `JACQUES_HTTP_PORT` |

The file also defines other configuration values like:
- `claudeSettingsPath`: `~/.claude/settings.json`
- `handoffFilename`: `.jacques-handoff.md`
- `autoCompactThreshold`: `95` (from `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` env var)
- `staleSessionCleanupMinutes`: `60`
- `focusWatcherPollMs`: `500`
- `cleanupIntervalMinutes`: `5`