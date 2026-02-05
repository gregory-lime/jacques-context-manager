# Explore: Find events.EventEmitter usage in GUI

> Session: `fe1d3ee6-9813-4e42-bebf-ac5170fee6fb`
> Date: 2026-01-31
> Tokens: ~54 337

---

Perfect! I now have all the information I need. Let me create a comprehensive report.

## Analysis Report: EventEmitter Import Issue in GUI

### Root Cause Found

The error **"Module 'events' has been externalized for browser compatibility"** is caused by `@jacques/core` exporting code that uses Node.js-specific modules.

### The Problem Chain

1. **Direct Source**: `/Users/gole/Desktop/jacques-context-manager/core/src/client/websocket-client.ts` (lines 8-9, 33)
   - Imports: `import { EventEmitter } from "events";`
   - Extends EventEmitter: `export class JacquesClient extends EventEmitter`

2. **Exported via**: `/Users/gole/Desktop/jacques-context-manager/core/src/client/index.ts` (line 5)
   - Exports: `export { JacquesClient } from "./websocket-client.js";`

3. **Re-exported by**: `/Users/gole/Desktop/jacques-context-manager/core/src/index.ts` (line 42)
   - Exports: `export { JacquesClient } from "./client/index.js";`

4. **Imported in GUI via @jacques/core**:
   - The GUI imports from `@jacques/core` in multiple places dynamically

### Files in GUI Codebase Using @jacques/core

All these files attempt to import from `@jacques/core` in the browser:

1. **`/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Sources.tsx`** (lines 24-31)
   - `await import('@jacques/core')`
   - Uses: `isObsidianConfigured`, `getObsidianVaultPath`, `isGoogleDocsConfigured`, `getGoogleDocsConfig`, `isNotionConfigured`, `getNotionConfig`, `disconnectGoogleDocs`, `disconnectNotion`

2. **`/Users/gole/Desktop/jacques-context-manager/gui/src/pages/GoogleDocsConnect.tsx`** (lines 39, 87)
   - `await import('@jacques/core')`
   - Uses: `getGoogleDocsConfig`, `configureGoogleDocs`

3. **`/Users/gole/Desktop/jacques-context-manager/gui/src/pages/NotionConnect.tsx`** (lines 38, 83)
   - `await import('@jacques/core')`
   - Uses: `getNotionConfig`, `configureNotion`

4. **`/Users/gole/Desktop/jacques-context-manager/gui/src/components/Layout.tsx`** (line 36)
   - `await import('@jacques/core')`
   - Uses: `isObsidianConfigured`, `isGoogleDocsConfigured`, `isNotionConfigured`

### OAuth Files (Browser-Safe)

The local OAuth files in the GUI are browser-safe and don't cause issues:
- `/Users/gole/Desktop/jacques-context-manager/gui/src/oauth/google.ts` - Pure fetch/URL handling
- `/Users/gole/Desktop/jacques-context-manager/gui/src/oauth/notion.ts` - Pure fetch/URL handling  
- `/Users/gole/Desktop/jacques-context-manager/gui/src/oauth/index.ts` - Just exports

### Configuration Files

The `/Users/gole/Desktop/jacques-context-manager/core/src/sources/config.ts` uses Node.js APIs:
- Lines 7-9: `import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";`
- Lines 8-9: `import { homedir } from "os"; import { join, dirname } from "path";`

This is okay because it's only used server-side in dashboard, but becomes problematic when bundled into browser code through the `@jacques/core` export barrel.

### Vite Configuration

`/Users/gole/Desktop/jacques-context-manager/gui/vite.config.ts` doesn't have any configuration to handle or exclude Node.js modules:
- No external definitions
- No ssr configuration
- No resolve aliases to exclude "events"

### Summary of Files Causing the Issue

| File | Issue | Severity |
|------|-------|----------|
| `/Users/gole/Desktop/jacques-context-manager/core/src/client/websocket-client.ts` | Imports Node.js `EventEmitter` | HIGH - Root cause |
| `/Users/gole/Desktop/jacques-context-manager/core/src/sources/config.ts` | Imports Node.js `fs`, `os`, `path` modules | HIGH - File I/O modules |
| `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/Sources.tsx` | Dynamically imports `@jacques/core` | MEDIUM - Trigger point |
| `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/GoogleDocsConnect.tsx` | Dynamically imports `@jacques/core` | MEDIUM - Trigger point |
| `/Users/gole/Desktop/jacques-context-manager/gui/src/pages/NotionConnect.tsx` | Dynamically imports `@jacques/core` | MEDIUM - Trigger point |
| `/Users/gole/Desktop/jacques-context-manager/gui/src/components/Layout.tsx` | Dynamically imports `@jacques/core` | MEDIUM - Trigger point |
| `/Users/gole/Desktop/jacques-context-manager/gui/vite.config.ts` | No external/ssr configuration | MEDIUM - Missing config |