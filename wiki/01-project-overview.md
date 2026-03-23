# 01 — Project Overview and Technologies

← [Wiki Home](./Home.md)

---

## What is Actual Budget?

Actual Budget is a **local-first personal finance tool** written entirely in
TypeScript/JavaScript.  "Local-first" means all budget data lives in a SQLite
database on the user's own device — there is no mandatory cloud service.

An optional **sync server** allows multiple devices to share changes.  Sync is
powered by a CRDT (Conflict-free Replicated Data Type) protocol, and budget
data is **end-to-end encrypted** before leaving the device, so the sync server
only ever stores opaque blobs.

The application ships in three forms:

- **Web app** — served from the sync server and opened in any modern browser
- **Desktop app** — bundled with Electron for Windows, macOS, and Linux
- **Self-hosted server** — a Docker image containing both the sync server and
  the web app

---

## Technology stack

### Languages and runtimes

| Technology | Role | Version | Learn more |
|---|---|---|---|
| **TypeScript** | Primary language for all packages | 5.x (strict mode) | [typescriptlang.org](https://www.typescriptlang.org/docs/) |
| **Node.js** | Runtime for the sync server and build tools | ≥ 22 | [nodejs.org/docs](https://nodejs.org/en/docs) |

### Frontend

| Technology | Role | Learn more |
|---|---|---|
| **React 18** | UI component framework | [react.dev](https://react.dev/) |
| **React Compiler** | Auto-memoization (replaces manual `useMemo`/`useCallback`) | [react.dev/learn/react-compiler](https://react.dev/learn/react-compiler) |
| **Redux** | Global UI state (session, preferences, modals) | [redux.js.org](https://redux.js.org/) |
| **Vite** | Dev server and production bundler for the browser build | [vitejs.dev](https://vitejs.dev/) |

### Desktop

| Technology | Role | Learn more |
|---|---|---|
| **Electron** | Desktop app wrapper (Windows / macOS / Linux) | [electronjs.org/docs](https://www.electronjs.org/docs/latest) |

### Backend

| Technology | Role | Learn more |
|---|---|---|
| **Express.js** | HTTP framework for the sync server | [expressjs.com](https://expressjs.com/) |
| **SQLite** (`better-sqlite3`) | Budget database (client) and server database | [better-sqlite3 docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md) |
| **sql.js** | SQLite compiled to WebAssembly for in-browser use | [sql.js.org](https://sql.js.org/) |

### Sync protocol

| Technology | Role | Learn more |
|---|---|---|
| **CRDT** | Conflict-free data merging across devices | [crdt.tech](https://crdt.tech/) |
| **Protocol Buffers** | Efficient serialization of CRDT messages | [protobuf.dev](https://protobuf.dev/) |

### Tooling

| Technology | Role | Learn more |
|---|---|---|
| **Yarn 4 workspaces** | Monorepo package management | [yarnpkg.com/features/workspaces](https://yarnpkg.com/features/workspaces) |
| **Lage** | Parallel task runner across workspaces (with caching) | [microsoft.github.io/lage](https://microsoft.github.io/lage/) |
| **Vitest** | Fast unit test runner | [vitest.dev](https://vitest.dev/) |
| **Playwright** | End-to-end browser testing | [playwright.dev](https://playwright.dev/) |
| **oxlint + oxfmt** | Linting and formatting (replaces ESLint + Prettier in CI) | [oxc.rs](https://oxc.rs/) |
| **Docusaurus** | Documentation website | [docusaurus.io](https://docusaurus.io/) |

### Infrastructure and DevOps

| Technology | Role | Learn more |
|---|---|---|
| **Docker** | Container image builds | [docs.docker.com](https://docs.docker.com/) |
| **Docker Compose** | Multi-container orchestration | [docs.docker.com/compose](https://docs.docker.com/compose/) |
| **GitHub Actions** | CI/CD pipeline | [docs.github.com/actions](https://docs.github.com/en/actions) |

---

## Key design principles

1. **Local-first** — the budget works fully offline; sync is optional.
2. **End-to-end encryption** — the server never sees unencrypted budget data.
3. **No settings bloat** — resist adding user-facing toggles for every tweak.
4. **Strict typing** — TypeScript strict mode is enforced; avoid `any`.
5. **Functional patterns** — prefer functions over classes; prefer iteration
   over duplication.

---

## Next: [Code Layout →](./02-code-layout.md)
