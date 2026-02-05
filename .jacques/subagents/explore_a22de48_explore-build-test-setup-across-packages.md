# Explore: Explore build/test setup across packages

> Session: `b57856cd-4c15-4383-815c-7aff41a70130`
> Date: 2026-02-03
> Tokens: ~41 266

---

Excellent! Now I have all the information I need. Let me compile a comprehensive report for the user:

## Jacques Context Manager: Build and Test Setup Report

Based on my exploration of the project, here's the complete build and test setup across all packages:

### 1. Root package.json
**Location**: `/Users/gole/Desktop/jacques-context-manager/package.json`

**Node Version Requirement**: `>=18.0.0`

**Available Scripts**:
- `install:all` - Install dependencies for all packages (core, server, dashboard)
- `install:core|server|dashboard` - Install individual packages
- `build:all` - Build all packages (core, server, dashboard, gui)
- `build:core|server|dashboard|gui` - Build individual packages
- `start:server` - Start Jacques server
- `stop:server` - Stop server (checks ~/.jacques/server.pid or kills :4243)
- `restart:server` - Stop and restart server
- `start:dashboard` - Start terminal dashboard
- `start:gui` - Start GUI (Vite dev mode on port 5173)
- `dev:core|server|dashboard|gui` - Run TypeScript watch mode for each package
- `test` - Run server tests
- `test:core` - Run core tests
- `test:dashboard` - Run dashboard tests
- `setup` - Full setup script (node scripts/setup.js)
- `status` - One-shot status check
- `configure` - Configure Claude Code settings (node scripts/configure-claude.js)

**Workspace Configuration**: Monorepo with 4 workspaces: `core`, `server`, `dashboard`, `gui`

---

### 2. server/package.json
**Location**: `/Users/gole/Desktop/jacques-context-manager/server/package.json`

**Package Name**: `@jacques/server`
**Main Entry**: `dist/server.js`
**Bin**: `jacques-mcp` → `./dist/mcp/server.js`
**Node Requirement**: `>=18.0.0`

**Build Scripts**:
- `build` → `tsc` (TypeScript compilation)
- `dev` → `tsc --watch` (Watch mode)
- `start` → `node dist/server.js`
- `start:mcp` → `node dist/mcp/server.js`

**Test Command**: 
```bash
node --experimental-vm-modules ../node_modules/jest/bin/jest.js
```
(Note: Uses `--experimental-vm-modules` for ES module support)

**Dependencies**:
- `@jacques/core: file:../core` (local workspace reference)
- `@modelcontextprotocol/sdk: ^1.11.0` (MCP SDK)
- `ws: ^8.18.0` (WebSocket)
- `zod: ^3.25.0` (Schema validation)

**Dev Dependencies**:
- `@types/jest: ^29.5.14`
- `@types/node: ^22.10.0`
- `@types/ws: ^8.5.13`
- `jest: ^29.7.0`
- `ts-jest: ^29.4.6`
- `typescript: ^5.7.0`

**Exports**: ESM with TypeScript declarations for `.` and `./server`

---

### 3. dashboard/package.json
**Location**: `/Users/gole/Desktop/jacques-context-manager/dashboard/package.json`

**Package Name**: `jacques` (CLI package)
**Main Entry**: `dist/cli.js`
**Bin**: `jacques` → `./dist/cli.js`
**Node Requirement**: `>=18.0.0`

**Build Scripts**:
- `build` → `tsc` (with prebuild: convert-mascot)
- `dev` → `tsc --watch`
- `start` → `node dist/cli.js`
- `convert-mascot` → `tsx scripts/convert-mascot.ts` (PNG to ANSI art)

**Test Command**:
```bash
node --experimental-vm-modules ../node_modules/jest/bin/jest.js
```
(Note: Same ES module support as server)

**Dependencies**:
- `@dqbd/tiktoken: ^1.0.15` (Token counting)
- `@jacques/core: *` (workspace)
- `@jacques/server: *` (workspace)
- `commander: ^12.1.0` (CLI argument parsing)
- `ink: ^6.6.0` (React for TUI)
- `react: ^19.2.4`
- `ws: ^8.18.0` (WebSocket client)

**Dev Dependencies**:
- `@types/jest: ^29.5.14`
- `@types/node: ^22.10.0`
- `@types/react: ^19.2.10`
- `@types/ws: ^8.5.13`
- `jest: ^29.7.0`
- `jimp: ^0.22.10` (Image processing for mascot)
- `ts-jest: ^29.2.0`
- `tsx: ^4.7.0` (TypeScript execution)
- `typescript: ^5.7.0`

---

### 4. core/package.json
**Location**: `/Users/gole/Desktop/jacques-context-manager/core/package.json`

**Package Name**: `@jacques/core`
**Main Entry**: `dist/index.js`
**Node Requirement**: `>=18.0.0`

**Build Scripts**:
- `build` → `tsc`
- `dev` → `tsc --watch`
- `clean` → `rm -rf dist`

**Test Command**:
```bash
node --experimental-vm-modules ../node_modules/jest/bin/jest.js
```

**Dependencies**:
- `@dqbd/tiktoken: ^1.0.15`
- `ws: ^8.18.0`

**Dev Dependencies**:
- `@types/node: ^22.10.0`
- `@types/ws: ^8.5.13`
- `@types/jest: ^29.5.14`
- `jest: ^29.7.0`
- `ts-jest: ^29.2.0`
- `typescript: ^5.7.0`

**Exports**: Multiple entry points for different modules (session, archive, context, sources, storage, utils, handoff)

---

### 5. gui/package.json
**Location**: `/Users/gole/Desktop/jacques-context-manager/gui/package.json`

**Package Name**: `@jacques/gui`
**Type**: Vite + React + TypeScript web app

**Build Scripts**:
- `dev` → `vite` (Dev server on port 5173)
- `build` → `tsc && vite build` (TypeScript compilation + Vite bundle)
- `preview` → `vite preview`
- `test` → `vitest` (Vitest test runner)

**Note**: GUI uses **Vitest** for testing (not Jest like server/dashboard/core)

**Dependencies**:
- `react: ^18.3.1` (different from dashboard/cli which uses ^19.2.4)
- `react-dom: ^18.3.1`
- `react-markdown: ^10.1.0`
- `react-router-dom: ^6.22.3`

**Dev Dependencies**:
- `@types/react: ^18.3.12`
- `@types/react-dom: ^18.3.1`
- `@vitejs/plugin-react: ^4.3.4`
- `typescript: ^5.7.0`
- `vite: ^5.4.11`
- `vitest: ^2.1.8`

---

### 6. hooks/requirements.txt
**Location**: `/Users/gole/Desktop/jacques-context-manager/hooks/requirements.txt`

**Python Dependencies**:
```
tiktoken>=0.5.0
```

**Note**: Minimal Python dependencies. Token estimation for context tracking.

---

### 7. TypeScript Configuration Files

**All Node.js packages (server, dashboard, core) share similar tsconfig**:

```typescript
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",        // ES modules with .js extensions
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "jsx": "react-jsx"           // Only in dashboard
  }
}
```

**GUI tsconfig** (Vite web app):
```typescript
{
  "compilerOptions": {
    "target": "ES2020",          // Slightly lower than Node packages
    "module": "ESNext",
    "moduleResolution": "bundler", // Different for web bundling
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

---

### 8. Jest Configuration

**All three packages (server, dashboard, core) use identical Jest config**:

```javascript
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',  // Strip .js from imports in tests
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
```

**Dashboard adds additional coverage config**:
```javascript
collectCoverageFrom: [
  "src/sources/**/*.ts",
  "src/context/**/*.ts",
  "!src/**/*.d.ts",
]
```

---

### 9. Vite Configuration (GUI)

**Location**: `/Users/gole/Desktop/jacques-context-manager/gui/vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    open: true,  // Auto-open browser
  },
});
```

---

### 10. Summary: Version Requirements & Commands

| Requirement | Version |
|-------------|---------|
| Node.js (all Node packages) | `>=18.0.0` |
| Python (hooks) | (No version specified, assumed 3.x) |
| TypeScript (Node packages) | `^5.7.0` |
| TypeScript (GUI) | `^5.7.0` |
| React (Dashboard/CLI) | `^19.2.4` |
| React (GUI web) | `^18.3.1` |
| Jest (Node packages) | `^29.7.0` |
| Vitest (GUI web) | `^2.1.8` |
| Vite (GUI) | `^5.4.11` |

**Test Command Reference**:
```bash
# Server tests
cd server && npm test
# Expands to: node --experimental-vm-modules ../node_modules/jest/bin/jest.js

# Core tests
cd core && npm test
# Expands to: node --experimental-vm-modules ../node_modules/jest/bin/jest.js

# Dashboard tests
cd dashboard && npm test
# Expands to: node --experimental-vm-modules ../node_modules/jest/bin/jest.js

# GUI tests (different test framework)
cd gui && npm test
# Expands to: vitest
```

---

### 11. GitHub CI Configuration

**Status**: No `.github/` directory found at project root
- No GitHub Actions workflows present
- No CI/CD pipeline configured

---

### 12. Key Architectural Notes

1. **Monorepo**: Uses npm workspaces with 4 packages (core, server, dashboard, gui)
2. **ES Modules**: All Node packages configured for ES modules (`"type": "module"`)
3. **Imports**: All imports must use `.js` extension (enforced by TypeScript config)
4. **Test Command**: Node packages use `--experimental-vm-modules` flag with Jest for ESM support
5. **Port Assignments**:
   - GUI dev: `5173` (Vite default)
   - Server: `4243` (from stop:server script)
   - WebSocket: `4242` (from CLAUDE.md)
6. **Package Manager**: npm (uses package-lock.json)
7. **GUI Exception**: Uses Vitest instead of Jest, Vite instead of plain TypeScript

This completes the comprehensive mapping of the Jacques project's build and test setup.