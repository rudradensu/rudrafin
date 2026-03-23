# Developer Guide

A practical guide for contributors who are picking up issues and enhancements
in this repository.

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Cloning and installing](#cloning-and-installing)
3. [Repository layout](#repository-layout)
4. [Development server](#development-server)
5. [Package-level commands](#package-level-commands)
6. [Making a change — workflow](#making-a-change--workflow)
7. [Code conventions](#code-conventions)
8. [Adding a feature or fixing a bug](#adding-a-feature-or-fixing-a-bug)
9. [Submitting a pull request](#submitting-a-pull-request)
10. [Useful references](#useful-references)

---

## Prerequisites

| Tool | Required version | Notes |
|---|---|---|
| Node.js | ≥ 22 | Use [nvm](https://github.com/nvm-sh/nvm) or [asdf](https://asdf-vm.com) to manage versions |
| Yarn | ^4.9.1 | Managed via `packageManager` field — `corepack enable` then `yarn --version` |
| Git | any recent | Required for cloning and commits |
| Docker (optional) | 24+ | Only needed for container-based dev or running the split-container stack |

On Windows, during Node.js installation select **"Automatically install the
necessary tools"** on the *Tools for Native Modules* page.  This is required
to compile `better-sqlite3`.

---

## Cloning and installing

```bash
git clone https://github.com/actualbudget/actual.git
cd actual
yarn install        # installs dependencies for every workspace
yarn typecheck      # quick sanity-check — should pass on a clean clone
```

> **Always run `yarn` commands from the repository root.** Never `cd` into a
> child package and run yarn there.

---

## Repository layout

```
rudrafin/          (cloned as "actual" from the upstream repo)
├── packages/
│   ├── loot-core/          # Platform-agnostic business logic + SQLite budget DB
│   ├── desktop-client/     # React web/desktop UI (Vite, Playwright E2E tests)
│   ├── desktop-electron/   # Electron wrapper for the desktop app
│   ├── sync-server/        # Express sync-server + account SQLite DB
│   ├── api/                # Public Node.js API (for integrations)
│   ├── component-library/  # Shared React UI components and icons
│   ├── crdt/               # CRDT implementation for sync
│   ├── plugins-service/    # Plugin worker service
│   ├── eslint-plugin-actual/ # Custom ESLint rules
│   └── docs/               # Docusaurus documentation site
├── Dockerfile              # Development container
├── sync-server.Dockerfile  # Production container (single image)
├── docker-compose.yml      # Development compose
├── docker-compose.split.yml # Two-container production compose (new)
├── INSTALLATION.md         # Packaging and installation guide (new)
├── DEVELOPER_GUIDE.md      # This file (new)
└── TESTING_GUIDE.md        # Automated testing guide (new)
```

### Key packages in detail

| Package | Workspace name | Description |
|---|---|---|
| `loot-core` | `@actual-app/core` | All budget calculations, shared types, and the client-side SQLite database |
| `desktop-client` | `@actual-app/web` | React UI — components, hooks, pages, and Playwright E2E tests |
| `sync-server` | `@actual-app/sync-server` | Express API, multi-device sync, auth, and integrations (GoCardless, Pluggy, SimpleFin) |
| `component-library` | `@actual-app/components` | Reusable design-system components and 375+ SVG icons |
| `api` | `@actual-app/api` | Scriptable Node.js API for importing/exporting budget data |

---

## Development server

### Browser-only (no sync)

```bash
yarn start           # starts Vite dev server on http://localhost:3001
```

### With sync server

```bash
yarn start:server-dev   # starts sync-server (port 5006) + Vite (port 3001)
```

### Desktop (Electron)

```bash
yarn start:desktop
```

Open http://localhost:3001 in a browser or wait for the Electron window to
appear.  On the setup screen choose **"View demo"** to load a realistic sample
budget instantly.

---

## Package-level commands

Run commands for a specific workspace with:

```bash
yarn workspace <workspace-name> run <command>
```

Examples:

```bash
yarn workspace @actual-app/core run test        # unit tests for loot-core
yarn workspace @actual-app/sync-server run test # unit tests for sync-server
yarn workspace @actual-app/web run build        # production build of the UI
yarn workspace docs start                       # live-preview the docs site
```

---

## Making a change — workflow

1. **Read the code first.**  Find the relevant files before touching anything.
2. **Make focused changes.**  One feature or bug fix per branch.
3. **Type-check after every edit.**
   ```bash
   yarn typecheck
   ```
4. **Lint and auto-fix.**
   ```bash
   yarn lint:fix
   ```
5. **Run the relevant tests.**
   ```bash
   yarn test                           # all packages
   yarn workspace @actual-app/core run test   # only loot-core
   ```
6. **Commit and push.**  See [Submitting a pull request](#submitting-a-pull-request).

---

## Code conventions

### TypeScript

- Use `type` over `interface`.
- Avoid `enum` — use plain objects or maps.
- Avoid `any` / `unknown` unless absolutely necessary.
- Use inline type imports: `import { type MyType } from '...'`.
- Prefer `satisfies` over type assertions (`as` / `!`).

### React

- The project uses the **React Compiler** — avoid manual `useCallback`,
  `useMemo`, and `React.memo` unless a stable identity is required.
- No `React.FC` or `React.FunctionComponent` — type props directly.
- No default exports for components — use named exports.
- Use `useNavigate` from `src/hooks` (not directly from react-router).
- Use `useDispatch`, `useSelector`, `useStore` from `src/redux` (not from
  react-redux directly).

### Imports

ESLint enforces this order (separated by blank lines):
1. React
2. Node built-ins
3. External packages
4. Internal `@actual-app/*` packages
5. Parent (`../`) imports
6. Sibling (`./`) imports
7. Index imports

### Internationalisation (i18n)

All user-facing strings must be wrapped in `<Trans>` or `t()`.  Run
`yarn lint` to catch untranslated strings.

---

## Adding a feature or fixing a bug

### Where to look

| Area | Starting point |
|---|---|
| Budget calculations | `packages/loot-core/src/shared/` |
| Server API routes | `packages/sync-server/src/app-*.{js,ts}` |
| React pages | `packages/desktop-client/src/components/` |
| Custom hooks | `packages/desktop-client/src/hooks/` |
| Shared UI components | `packages/component-library/src/` |
| Database schema / migrations | `packages/sync-server/src/sql/` and `packages/sync-server/migrations/` |
| Configuration options | `packages/sync-server/src/load-config.js` |

### Adding a new server route

1. Create or update a `app-<feature>.{js,ts}` file in `packages/sync-server/src/`.
2. Register the router in `packages/sync-server/src/app.ts`.
3. Add a migration if you need a new database table (`packages/sync-server/migrations/`).
4. Write tests in the corresponding `*.test.{js,ts}` file.

### Adding a new React component

1. Create `packages/desktop-client/src/components/MyComponent.tsx`.
2. Use named exports and type props directly.
3. Import only from `@actual-app/components` for shared UI primitives.

---

## Submitting a pull request

1. Fork the repository and create a branch from `master`.
2. Follow the workflow above — all checks must pass.
3. Generate a release note:
   ```bash
   yarn generate:release-notes
   ```
4. Open a PR and fill in the template.  Link the issue with `Fixes #<number>`.
5. Keep the PR up to date with `master` by rebasing or merging.

---

## Useful references

| Resource | URL |
|---|---|
| Community documentation | https://actualbudget.org/docs |
| Project structure docs | https://actualbudget.org/docs/contributing/project-details |
| Code style guide | `packages/docs/docs/contributing/code-style.md` |
| Configuration options | https://actualbudget.org/docs/config/ |
| Discord community | https://discord.gg/pRYNYr4W5A |
| Installation guide | [INSTALLATION.md](./INSTALLATION.md) |
| Testing guide | [TESTING_GUIDE.md](./TESTING_GUIDE.md) |
