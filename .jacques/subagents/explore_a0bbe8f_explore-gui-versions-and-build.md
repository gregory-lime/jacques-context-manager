# Explore: Explore GUI versions and build

> Session: `65129a93-e45b-4801-99c5-3e75cd390d91`
> Date: 2026-02-04
> Tokens: ~51 940

---

Excellent! Now I have the complete picture. Let me create a comprehensive report:

## Summary: TWO Different GUI Implementations

Based on my thorough exploration, here's what I found:

### Project Relationship

You have **3 separate projects** on your Desktop:

1. **`jacques-context-manager/`** - Main git repo with working changes (GIT REPO)
2. **`jacques-content-modal/`** - Static copy (NOT A GIT REPO)
3. Plus 3 other archived experiments: `jacques-context-builder/`, `jacques-dashboards-smaller-design/`, `jacques-gui-redesign/`

The `jacques-content-modal/` directory is a **snapshot copy** of an earlier version that you extracted for reference.

---

### Key Differences Between the Two Versions

#### **jacques-context-manager/gui/** (Current Main Version)

**Routing (Current HEAD):**
```tsx
/ → Dashboard
/archive → Archive
/context → Context
/settings → Settings
/sources → Sources
+ OAuth callbacks
```

**Key Features:**
- Uses `OpenSessionsProvider` wrapper
- Dashboard shows active sessions in grid + history
- **Removed:** ProjectDashboard, Conversations pages
- **ContentModal:** Custom implementation with simple hook API
- **Hooks:**
  - `useAssetModal.ts` (new, untracked)
  - `useOpenSessions.tsx` (new, untracked)
  - `useJacquesClient.ts`, `useNotifications.tsx`, `useProjectScope.tsx`, `useSessionBadges.ts`

**UI Components:**
```tsx
export { ContentModal, useContentModal }  // ← Hook-based API
export { WindowBar }                       // ← New window chrome
```

#### **jacques-content-modal/gui/** (Earlier Branch Version)

**Routing:**
```tsx
/ → Dashboard
/conversations → Conversations (+ :id variant)
/archive → Archive
/project → ProjectDashboard (full-featured)
/context → Context
/settings → Settings
/sources → Sources
+ OAuth callbacks
```

**Key Features:**
- No `OpenSessionsProvider` (removed)
- **Dedicated pages:**
  - `/conversations` - Browse saved conversations
  - `/project` - Detailed project dashboard with plans, subagents, web searches
- **ContentModal:** Different API with `ContentModalSize` type
  - Supports `'sm' | 'md' | 'lg' | 'full'` sizes (vs just `'md' | 'lg'`)
  - Supports `'custom'` mode (not just `'markdown'`)
  - Has `error` prop for error handling
  - Has `icon` prop
- **Hooks:**
  - `useContentModal.ts` (centralized modal state management)
  - No `useAssetModal`, no `useOpenSessions`
  - `useJacquesClient.ts`, `useNotifications.tsx`, `useProjectScope.tsx`, `useSessionBadges.ts`

**UI Components:**
```tsx
export { NotificationCenter }              // ← Different notification system
export { notificationStore }               // ← Global notification state
export { ContentModal }                    // ← Direct component only, no hook
```

---

### Untracked Files (In Progress Changes)

These are NEW or MODIFIED files in the working tree (not committed yet):

**New untracked files (??)**
- `gui/src/components/ui/ContentModal.tsx` - New generic modal
- `gui/src/components/ui/WindowBar.tsx` - Window chrome component
- `gui/src/components/ui/contentModalConfigs.tsx` - Modal config definitions
- `gui/src/components/SidebarSessionList.tsx` - Sidebar for sessions
- `gui/src/hooks/useAssetModal.ts` - Asset modal management
- `gui/src/hooks/useOpenSessions.tsx` - Open sessions provider (new)
- `core/src/archive/plan-cataloger.ts` - Plan cataloging
- `scripts/migrate-plan-catalog.ts` - Migration script

**Modified files (M)**
- `gui/src/App.tsx` - Major refactor: removed Conversations/ProjectDashboard, added OpenSessionsProvider
- `gui/src/pages/Dashboard.tsx` - Expanded from 50 lines to 400+ lines with full feature set
- `gui/src/components/ui/index.ts` - Updated exports
- `gui/src/pages/Archive.tsx` - Enhanced archive functionality
- And many more...

---

### Current State: Refactoring In Progress

Based on git history, you're actively **consolidating/simplifying** the GUI:

**Commits (newest first):**
1. `a2f1ab8` - generic ContentModal with expand buttons
2. `cf6ce43` - two-tier notification system
3. `fd13520` - sidebar rebuild with open session tabs
4. `717d064` - terminal focus + server startup reliability

**What's happening:** The main version (context-manager) is **removing** the ProjectDashboard and Conversations pages and consolidating everything into a unified Dashboard view, while the content-modal version keeps those separate views.

---

### File Comparison Summary

| Aspect | context-manager (Main) | content-modal (Earlier) |
|--------|---|---|
| **Routes** | 5 main pages | 7 main pages |
| **Conversations page** | No | Yes |
| **ProjectDashboard** | No (deleted) | Yes |
| **OpenSessionsProvider** | Yes (new) | No |
| **ContentModal sizes** | 2 sizes (md/lg) | 4 sizes (sm/md/lg/full) |
| **ContentModal modes** | markdown only | markdown + custom |
| **Git status** | Active repo with pending changes | Static copy (no .git) |

---

### Why Two Copies?

The `jacques-content-modal/` appears to be a **reference snapshot** from before a major refactoring. You likely:
1. Created it from an earlier branch to preserve that design approach
2. Continued development in the main repo
3. Left it as-is to compare approaches

**The main active version is `jacques-context-manager/`** - that's where the current work is happening.