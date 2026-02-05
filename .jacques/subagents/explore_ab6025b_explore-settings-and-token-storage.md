# Explore: Explore Settings and token storage

> Session: `b6aa3c40-2343-4f1d-be54-5e181c7ddcaa`
> Date: 2026-02-01
> Tokens: ~63 440

---

Now let me generate a comprehensive report based on my exploration. Here's what I found:

## Jacques Settings Functionality - Comprehensive Report

### 1. **Currently Available Settings**

The Jacques dashboard has a **Settings View** (`dashboard/src/components/SettingsView.tsx`) with the following configurable options:

#### Archive Settings (saved to `~/.jacques/config.json`)
1. **Archive Filter** - 3 options with radio buttons:
   - `everything`: Full context with all data
   - `without_tools`: Remove tool calls/results
   - `messages_only`: Just conversation text
   - **Current setting**: `everything`

2. **Auto-Archive Toggle** - Checkbox for enabling/disabling auto-archiving:
   - When enabled, conversations automatically archive when sessions end
   - **Current setting**: `true`

3. **Archive Statistics** - Display-only read metrics:
   - Total conversations count
   - Total projects count
   - Total size
   - Archive location path

#### Navigation
- `[↑↓]` Navigate between 4 items (3 filter options + 1 auto-archive toggle)
- `[Space/Enter]` Toggle selected option
- `[Esc]` Back to main menu

### 2. **Token Management & Claude Connection Settings**

**Currently absent** - There are NO token management or direct Claude connection settings in the Jacques Settings UI. However:

- Claude Code settings are read from `~/.claude/settings.json` (hooks configuration only, not tokens)
- Jacques reads Claude's `autoCompact` setting via `core/src/utils/settings.ts`
- No Claude API keys or credentials are stored in Jacques config

### 3. **External Source Connection Patterns**

Jacques uses a **centralized credential storage pattern** in `~/.jacques/config.json` for external sources:

#### **Obsidian** (Already Integrated)
```typescript
{
  "obsidian": {
    "enabled": boolean,
    "vaultPath": string,           // Local path (no credentials needed)
    "configuredAt": ISO string
  }
}
```
- **Credentials**: None (local filesystem access only)
- **Configuration flow**: User provides vault path, validated against `.obsidian` directory

#### **Google Docs** (Structure defined, not fully integrated in dashboard UI)
```typescript
{
  "googleDocs": {
    "enabled": boolean,
    "client_id": string,           // OAuth app credentials
    "client_secret": string,       // STORED IN PLAINTEXT in config.json
    "tokens": {
      "access_token": string,      // STORED IN PLAINTEXT
      "refresh_token": string,     // STORED IN PLAINTEXT
      "expires_at": number
    },
    "connected_email": string,
    "configured_at": ISO string
  }
}
```

#### **Notion** (Structure defined, not fully integrated in dashboard UI)
```typescript
{
  "notion": {
    "enabled": boolean,
    "client_id": string,           // OAuth app credentials
    "client_secret": string,       // STORED IN PLAINTEXT in config.json
    "tokens": {
      "access_token": string,      // STORED IN PLAINTEXT
      "refresh_token": string,     // STORED IN PLAINTEXT
      "expires_at": number         // Notion tokens don't expire
    },
    "workspace_id": string,
    "workspace_name": string,
    "configured_at": ISO string
  }
}
```

### 4. **Critical Security Observations**

#### Sensitive Data Storage Pattern (RISKY)
```
~/.jacques/config.json
├── Plain JSON (NOT encrypted)
├── Contains: client_id, client_secret, access_token, refresh_token
├── Permissions: User-readable by default
└── Risk Level: HIGH - Credentials exposed if file is compromised
```

#### Credential Management Functions in `core/src/sources/config.ts`
- `configureGoogleDocs()` - Stores client_secret + access_token in plaintext
- `updateGoogleDocsTokens()` - Updates tokens after refresh
- `configureNotion()` - Stores client_secret + access_token in plaintext
- `disconnectGoogleDocs()` - Wipes Google Docs config
- `disconnectNotion()` - Wipes Notion config

#### Token Refresh Patterns
- **Google Docs**: Active refresh mechanism - checks token expiry, refreshes before 5-minute buffer
- **Notion**: No refresh needed - tokens don't expire per Notion's OAuth design

### 5. **Settings File Locations & Schemas**

#### `~/.jacques/config.json` (Jacques configuration)
```typescript
interface JacquesConfig {
  version: string;                    // "1.0.0"
  sources: {
    obsidian?: ObsidianSourceConfig;
    googleDocs?: GoogleDocsSourceConfig;
    notion?: NotionSourceConfig;
  };
  archive?: ArchiveSettings;          // Optional, defaults provided
}

interface ArchiveSettings {
  filter: ArchiveFilterType;          // "everything" | "without_tools" | "messages_only"
  autoArchive: boolean;               // true | false
}
```

#### `~/.claude/settings.json` (Claude Code settings)
- Contains hooks configuration (SessionStart, PostToolUse, Stop, SessionEnd)
- Contains statusLine command configuration
- Currently read-only from Jacques perspective
- No token storage here

#### Settings Utility Functions
Location: `core/src/utils/settings.ts`
- `getJacquesConfig()` - Read config with defaults
- `setJacquesConfig()` - Write config to disk
- `getArchiveSettings()` / `setArchiveSettings()` - Archive-specific access
- `getArchiveFilter()` / `setArchiveFilter()` - Filter type management
- `getAutoArchiveEnabled()` / `toggleAutoArchive()` - Auto-archive toggle

### 6. **Configuration Flow in Dashboard**

```
App.tsx (main controller)
├── Loads archiveSettings on startup
├── Stores in local state: archiveFilter, autoArchiveEnabled
├── Renders SettingsView with current values
│
└── User navigation (↑↓ arrow keys)
    ├── Selects filter option or auto-archive toggle
    ├── Presses Space/Enter to toggle
    │
    ├── For filter selection:
    │   └── Calls setArchiveFilter(newFilter)
    │       └── Persists to ~/.jacques/config.json
    │
    └── For auto-archive toggle:
        └── Calls toggleAutoArchive()
            └── Persists to ~/.jacques/config.json
```

### 7. **What's Missing (No Token/API Management UI)**

Current Settings View has:
- ✅ Archive filter options (radio buttons)
- ✅ Auto-archive toggle (checkbox)
- ✅ Archive statistics display
- ✅ Simple navigation

Missing (would require new UI):
- ❌ Claude API token configuration
- ❌ Claude Code connection status
- ❌ Google Docs OAuth flow (backend exists, UI missing)
- ❌ Notion OAuth flow (backend exists, UI missing)
- ❌ Token expiry warnings
- ❌ Connection health status
- ❌ Settings for cache, model selection, etc.

### 8. **Key Security Patterns Used**

| Aspect | Pattern | Details |
|--------|---------|---------|
| **Storage** | Plain JSON files | No encryption, permissions-based protection |
| **Credentials** | Direct storage | client_secret, access_token in config.json |
| **Tokens** | In-memory after load | Read once, kept in app memory during session |
| **Refresh** | Automatic for Google | Refreshes before expiry; updates config.json |
| **Disconnection** | Destructive write | Overwrites with `{enabled: false}` |
| **File permissions** | Default umask | Typically 0644, readable by user |
| **Secrets rotation** | Manual re-auth | Must reconfigure source to update credentials |

### Summary

Jacques currently implements a **lightweight, file-based settings system** with:
1. **Archive-focused UI** (filter + auto-archive) accessible via dashboard `[S]` key
2. **Extensible credential storage** for external sources (Obsidian, Google Docs, Notion)
3. **Plain-text credential storage** (security concern for production use)
4. **No Claude API token management** in UI (could be added as future feature)
5. **Patterns ready** for token management but not yet exposed in Settings View

The architecture is designed to scale to multiple sources, but only Obsidian is fully wired into the dashboard UI. Google Docs and Notion connection code exists but lacks dashboard UI integration.