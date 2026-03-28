# New Developer Onboarding Guide

Welcome to **Actual Budget** — a local-first, open-source personal finance tool.
This guide walks you through everything you need to know to become productive as
a new contributor: understanding the codebase, making changes, testing them, and
deploying the application.

---

## Table of contents

1. [Project overview and technologies](#1-project-overview-and-technologies)
2. [Code and files layout](#2-code-and-files-layout)
3. [Code flow](#3-code-flow)
4. [How to make changes](#4-how-to-make-changes)
5. [How to build and DevOps configuration](#5-how-to-build-and-devops-configuration)
6. [How to test and how test data is generated](#6-how-to-test-and-how-test-data-is-generated)
7. [How to view test results](#7-how-to-view-test-results)
8. [How to deploy into a container](#8-how-to-deploy-into-a-container)
9. [How to start the container in production](#9-how-to-start-the-container-in-production)

See also:

- [INSTALLATION.md](./INSTALLATION.md) — full packaging and deployment reference
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) — contributor workflow reference
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) — detailed test-running reference
- [wiki/](./wiki/) — individual deep-dive pages for each topic

---

## 1. Project overview and technologies

Actual Budget is a **local-first personal finance application**. All budget
data is stored in a SQLite database on the user's device. An optional
**sync server** lets multiple devices share changes through CRDT-based
synchronization — without the server ever seeing the unencrypted budget
contents.

### Technology stack

| Layer                     | Technology                                | Learn more                                                                                         |
| ------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Language**              | TypeScript 5 (strict mode)                | [typescriptlang.org](https://www.typescriptlang.org/docs/)                                         |
| **Frontend**              | React 18 + React Compiler                 | [react.dev](https://react.dev/)                                                                    |
| **Build tool (frontend)** | Vite                                      | [vitejs.dev](https://vitejs.dev/)                                                                  |
| **Desktop wrapper**       | Electron                                  | [electronjs.org](https://www.electronjs.org/docs/latest)                                           |
| **Backend / sync server** | Node.js + Express                         | [expressjs.com](https://expressjs.com/)                                                            |
| **Database (budget)**     | SQLite via `better-sqlite3`               | [better-sqlite3 docs](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)          |
| **Database (server)**     | SQLite via `better-sqlite3`               | Same                                                                                               |
| **Sync protocol**         | CRDT (Conflict-free Replicated Data Type) | [crdt.tech](https://crdt.tech/)                                                                    |
| **Monorepo tooling**      | Yarn 4 workspaces + Lage                  | [yarnpkg.com](https://yarnpkg.com/), [microsoft.github.io/lage](https://microsoft.github.io/lage/) |
| **Unit testing**          | Vitest                                    | [vitest.dev](https://vitest.dev/)                                                                  |
| **End-to-end testing**    | Playwright                                | [playwright.dev](https://playwright.dev/)                                                          |
| **Linting / formatting**  | oxlint + oxfmt                            | [oxc.rs](https://oxc.rs/)                                                                          |
| **Type checking**         | TypeScript native (`tsgo`) + lage         | [TypeScript docs](https://www.typescriptlang.org/)                                                 |
| **Containerization**      | Docker + Docker Compose                   | [docs.docker.com](https://docs.docker.com/)                                                        |
| **CI/CD**                 | GitHub Actions                            | [docs.github.com/actions](https://docs.github.com/en/actions)                                      |

---

## 2. Code and files layout

The repository is a **Yarn workspace monorepo**. All packages live under
`packages/`.

```
actual/
├── packages/
│   ├── loot-core/              # Core business logic (platform-agnostic)
│   ├── desktop-client/         # React web/desktop UI
│   ├── desktop-electron/       # Electron wrapper for the desktop app
│   ├── sync-server/            # Express sync + auth server
│   ├── api/                    # Public Node.js API for integrations
│   ├── component-library/      # Shared React UI components and icons
│   ├── crdt/                   # CRDT sync protocol implementation
│   ├── plugins-service/        # Plugin worker service (Web Worker / iframe)
│   ├── eslint-plugin-actual/   # Custom ESLint rules for this codebase
│   └── docs/                   # Docusaurus documentation website
│
├── Dockerfile                  # Development container image
├── sync-server.Dockerfile      # Multi-stage production image
├── docker-compose.yml          # Development compose file
├── docker-compose.split.yml    # Two-container production compose file
│
├── README.md                   # Project overview and quick links
├── INSTALLATION.md             # All deployment options (full reference)
├── DEVELOPER_GUIDE.md          # Contributor workflow guide
├── TESTING_GUIDE.md            # Test-running guide
├── NEW_DEVELOPER_ONBOARDING.md # This file
│
├── lage.config.js              # Lage task runner (parallel test/build pipeline)
├── package.json                # Root scripts and devDependencies
├── tsconfig.json               # Root TypeScript config (project references)
└── .github/workflows/          # CI/CD pipeline definitions
```

### Key packages explained

#### `loot-core` (`@actual-app/core`)

The heart of the application. Contains:

- **Budget calculations** — envelope budget math, rollover logic
- **Shared types** — TypeScript types used by every other package
- **Client-side SQLite** — in-browser SQLite via `sql.js` for the budget file
- **Sync client** — merges incoming CRDT changes into the local SQLite DB
- **AQL (Actual Query Language)** — DSL for querying budgets programmatically

Key directories:

```
packages/loot-core/src/
├── server/         # Server-side logic (budget file operations, schedules, rules)
├── shared/         # Code shared between client and server (months, arithmetic, util)
├── types/          # TypeScript type definitions
└── platform/       # Platform-specific shims (browser vs. Electron vs. Node)
```

#### `desktop-client` (`@actual-app/web`)

The React UI. Runs in the browser and inside Electron.

```
packages/desktop-client/src/
├── components/     # All React components (accounts, budget, reports…)
├── hooks/          # Custom React hooks
├── redux/          # Redux store — app-level state (user, prefs, notifications)
├── queries/        # React Query wrappers for data fetching
├── style/          # Theme tokens and global CSS
└── i18n/           # Translation strings
```

End-to-end tests live in `packages/desktop-client/e2e/`.

#### `sync-server` (`@actual-app/sync-server`)

An Express.js server that:

- Stores and syncs encrypted budget files
- Manages user accounts and authentication
- Proxies external bank data integrations (GoCardless, SimpleFin, Pluggy.ai)

```
packages/sync-server/src/
├── app.ts              # Express app wiring (all routers registered here)
├── app-account.js      # User account management routes
├── app-sync.ts         # Budget file sync routes
├── app-gocardless/     # GoCardless bank integration
├── app-simplefin/      # SimpleFin bank integration
├── app-pluggyai/       # Pluggy.ai bank integration
├── app-admin.js        # Admin panel routes
├── account-db.js       # Server-side SQLite database helpers
├── load-config.js      # Configuration loading from environment variables
└── migrations/         # SQLite schema migrations for the server database
```

#### `component-library` (`@actual-app/components`)

Shared design-system components (`Button`, `Input`, `Menu`, `Select`, …) and
375+ SVG icon components. Do not import these icons manually — they are
auto-generated.

---

## 3. Code flow

Understanding how a user action travels through the system is key to debugging
and adding features.

### 3a. Browser request lifecycle (client-only actions)

```
User action in React component
    │
    ▼
React component calls a send() / query() helper
    │
    ▼
loot-core client API (packages/loot-core/src/server/main.ts)
    │ (via a SharedWorker message bus in the browser)
    ▼
loot-core server (runs in a Web Worker)
    │
    ▼
SQLite budget database (packages/loot-core/src/server/db/)
    │
    ▼
Updated data is returned to the React component
    │
    ▼
React re-renders with new state
```

The Web Worker boundary is important: all budget database access happens inside
a worker so the UI thread is never blocked.

### 3b. Sync flow (multi-device)

```
Local budget change (SQLite)
    │
    ▼
CRDT change record created (packages/crdt/)
    │
    ▼
Change record encrypted on the client
    │
    ▼
HTTP POST /sync  →  sync-server (packages/sync-server/src/app-sync.ts)
    │
    ▼
Server stores the change record in its SQLite DB
    │
    ▼
Other devices poll GET /sync  →  download new change records
    │
    ▼
Client decrypts and applies CRDT changes to local SQLite
```

Budget data is **end-to-end encrypted** — the sync server only stores opaque
encrypted blobs and never has access to the plaintext budget.

### 3c. React component data flow

```
Redux store (global app state: user session, preferences, modals)
    │
    ├── useSelector() hooks
    │
    ▼
React components
    │
    ├── useQuery() / send() calls  →  loot-core (via worker)
    │
    └── useDispatch() calls  →  Redux reducers (local UI state)
```

Key rule: **budget data lives in loot-core's SQLite**; only UI state (which
modal is open, the current theme, session info) lives in Redux.

### 3d. Sync server HTTP routes

| Route prefix  | Handler file      | Purpose                              |
| ------------- | ----------------- | ------------------------------------ |
| `/sync`       | `app-sync.ts`     | Budget file upload/download and sync |
| `/account`    | `app-account.js`  | User registration, login, password   |
| `/admin`      | `app-admin.js`    | Admin dashboard                      |
| `/openid`     | `app-openid.js`   | OpenID Connect SSO                   |
| `/gocardless` | `app-gocardless/` | GoCardless bank import               |
| `/simplefin`  | `app-simplefin/`  | SimpleFin bank import                |
| `/pluggyai`   | `app-pluggyai/`   | Pluggy.ai bank import                |
| `/secret`     | `app-secrets.js`  | Encrypted secrets (API keys)         |

---

## 4. How to make changes

### Prerequisites

| Tool              | Version    | Install                                                           |
| ----------------- | ---------- | ----------------------------------------------------------------- |
| Node.js           | ≥ 22       | [nodejs.org](https://nodejs.org/) or `nvm install 22`             |
| Yarn              | ^4.9.1     | `corepack enable && yarn --version`                               |
| Git               | any recent | [git-scm.com](https://git-scm.com/)                               |
| Docker (optional) | 24+        | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) |

### Initial setup

```bash
git clone https://github.com/actualbudget/actual.git
cd actual
yarn install        # installs all workspace dependencies
yarn typecheck      # should pass on a clean clone
```

> **Always run `yarn` commands from the repository root.**

### Starting the development server

```bash
# Browser-only (no sync — fastest to start)
yarn start
# Opens http://localhost:3001

# With sync server (full stack)
yarn start:server-dev
# Sync server on :5006, UI on :3001

# Desktop (Electron)
yarn start:desktop
```

On the setup screen choose **"View demo"** to load a realistic sample budget
with pre-populated accounts, transactions, categories, and budgeted amounts.

### Typical change workflow

```bash
# 1. Find the relevant file(s)
#    Budget logic  → packages/loot-core/src/
#    UI changes    → packages/desktop-client/src/
#    Server routes → packages/sync-server/src/
#    Shared UI     → packages/component-library/src/

# 2. Make your change

# 3. Type-check
yarn typecheck

# 4. Lint and auto-fix
yarn lint:fix

# 5. Run tests
yarn test                                        # all packages
yarn workspace @actual-app/core run test         # loot-core only
yarn workspace @actual-app/sync-server run test  # sync-server only

# 6. Commit (prefix message with [AI] if AI-generated)
git add .
git commit -m "fix: correct budget rollover calculation"
```

### Where to look for specific areas

| What you want to change      | Starting point                                                         |
| ---------------------------- | ---------------------------------------------------------------------- |
| Budget calculations          | `packages/loot-core/src/shared/`                                       |
| Server API routes            | `packages/sync-server/src/app-*.{js,ts}`                               |
| React pages / screens        | `packages/desktop-client/src/components/`                              |
| Custom React hooks           | `packages/desktop-client/src/hooks/`                                   |
| Shared UI components         | `packages/component-library/src/`                                      |
| Database schema / migrations | `packages/sync-server/src/sql/` and `packages/sync-server/migrations/` |
| Server configuration options | `packages/sync-server/src/load-config.js`                              |

### Code conventions (quick reference)

- Use `type` not `interface`; avoid `enum`; avoid `any`/`unknown`
- Use named exports — no default exports for components
- Import `useNavigate` from `src/hooks`, not directly from `react-router`
- Import `useDispatch`/`useSelector` from `src/redux`, not from `react-redux`
- All user-facing strings must be wrapped with `<Trans>` or `t()`
- The React Compiler is enabled — skip manual `useCallback`/`useMemo`/`React.memo`

See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md#code-conventions) for the full
conventions reference.

---

## 5. How to build and DevOps configuration

### Building for the web browser

```bash
yarn build:browser
# Output: packages/desktop-client/build/
```

### Building the sync server

```bash
yarn build:server
# Builds the browser bundle then compiles the sync-server TypeScript
# Output: packages/sync-server/build/
```

### Building the Electron desktop app

```bash
yarn build:desktop
# Output: packages/desktop-electron/release/
```

### Building a production Docker image from source

```bash
docker build -f sync-server.Dockerfile -t my-actual-server:local .
```

The `sync-server.Dockerfile` uses a **multi-stage build**:

1. **`deps` stage** — installs all yarn dependencies.
2. **`builder` stage** — runs `yarn build:server` (browser bundle + server
   TypeScript compilation). The `NODE_OPTIONS=--max_old_space_size=8192`
   variable is set because the browser bundle is large.
3. **`prod` stage** — copies only built artifacts and production `node_modules`
   into a slim `node:22-bookworm-slim` image, running as a non-root user
   (`actual`, UID 1001).

### CI/CD pipeline

GitHub Actions runs on every PR and `master` merge.

| Workflow file                           | Triggers      | What it does                                                 |
| --------------------------------------- | ------------- | ------------------------------------------------------------ |
| `.github/workflows/check.yml`           | Push / PR     | typecheck, lint, unit tests, E2E tests                       |
| `.github/workflows/build.yml`           | Push / PR     | Verifies the production Docker build                         |
| `.github/workflows/docker-release.yml`  | Release tag   | Builds and pushes `actualbudget/actual-server` to Docker Hub |
| `.github/workflows/docker-edge.yml`     | `master` push | Builds and pushes the `edge` tag                             |
| `.github/workflows/electron-master.yml` | `master` push | Builds the Electron desktop binaries                         |
| `.github/workflows/e2e-test.yml`        | PR            | Runs Playwright E2E tests                                    |

All checks must pass before a PR can be merged.

### Environment variables (sync server)

All server configuration is loaded through `packages/sync-server/src/load-config.js`.
The most common options:

| Variable                           | Default    | Description                                  |
| ---------------------------------- | ---------- | -------------------------------------------- |
| `ACTUAL_PORT`                      | `5006`     | Port the server listens on                   |
| `ACTUAL_DATA_DIR`                  | `/data`    | Where SQLite files are stored                |
| `ACTUAL_HTTPS_KEY`                 | —          | Path to TLS private key                      |
| `ACTUAL_HTTPS_CERT`                | —          | Path to TLS certificate                      |
| `ACTUAL_UPLOAD_FILE_SIZE_LIMIT_MB` | `20`       | Max file upload size                         |
| `ACTUAL_LOGIN_METHOD`              | `password` | Auth method (`password`, `header`, `openid`) |

Full list: <https://actualbudget.org/docs/config/>

---

## 6. How to test and how test data is generated

### Running all tests

```bash
yarn test           # all packages, cached (recommended)
yarn test:debug     # all packages, no cache
```

The project uses **Lage** to run tests across all workspaces in parallel.

### Running tests for a single package

```bash
yarn workspace @actual-app/core run test           # loot-core
yarn workspace @actual-app/sync-server run test    # sync-server
yarn workspace @actual-app/web run test            # desktop-client unit tests
```

### End-to-end (E2E) tests

E2E tests use **Playwright** and exercise the full browser UI.

```bash
# Install browsers (one time, after fresh clone or Playwright upgrade)
yarn workspace @actual-app/web run playwright install --with-deps chromium

# Run all E2E tests (headless)
yarn e2e

# Run a specific E2E test file
yarn workspace @actual-app/web run playwright test accounts.test.ts

# Run with a visible browser (useful for debugging)
yarn workspace @actual-app/web run playwright test --headed accounts.test.ts
```

### How test data is generated

#### Unit tests

Unit tests use small in-line fixtures defined directly in the test files.
There is no shared fixture database — each test creates exactly the state it
needs.

#### E2E tests — demo budget

E2E tests create a fresh budget at the start of each test run using the
**"View demo"** path, which calls `loot-core`'s demo-budget generator. This
produces a realistic budget with:

- Multiple accounts (checking, savings, credit cards)
- Months of historical transactions
- Category groups and categories
- Budgeted amounts that match the sample transactions

The demo generator lives in `packages/loot-core/src/server/` and is invoked
by the Playwright `globalSetup` hook defined in
`packages/desktop-client/playwright.config.ts`.

#### Sync-server integration tests

The sync-server uses **Vitest + supertest** against a temporary in-memory
SQLite database. Schema migrations are applied automatically before each test
run via `packages/sync-server/vitest.globalSetup.js`.

### Writing new tests

**Unit test (Vitest)**

```typescript
// packages/loot-core/src/shared/myModule.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('returns the expected value', () => {
    expect(myFunction(1, 2)).toBe(3);
  });
});
```

**E2E test (Playwright)**

```typescript
// packages/desktop-client/e2e/myFeature.test.ts
import { test, expect } from '@playwright/test';
import { AccountsPage } from './page-models/accountsPage';

test('create a new account', async ({ page }) => {
  const accounts = new AccountsPage(page);
  await accounts.goto();
  await accounts.createAccount('Savings', 1000);
  await expect(page.getByText('Savings')).toBeVisible();
});
```

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for a complete reference.

---

## 7. How to view test results

### Terminal output

Vitest and Playwright both print a summary to the terminal after each run:

```
✓ packages/loot-core    27 tests passed  (1.2 s)
✓ packages/sync-server  14 tests passed  (0.8 s)
✗ packages/desktop-client  1 test failed
  ● accounts › create a new account
    Expected "Savings" to be visible
```

### Playwright HTML report

After an E2E test run an HTML report is generated at
`packages/desktop-client/playwright-report/index.html`. Open it in a browser
for a full visual breakdown including screenshots and step-by-step traces:

```bash
yarn workspace @actual-app/web run playwright show-report
```

### Playwright trace viewer

To replay a failing test step-by-step with network and DOM snapshots:

```bash
# Capture a trace during the test run
yarn workspace @actual-app/web run playwright test --trace on accounts.test.ts

# Open the trace viewer
yarn workspace @actual-app/web run playwright show-trace \
  packages/desktop-client/test-results/*/trace.zip
```

### CI artifacts

When tests fail in GitHub Actions the workflow uploads:

- `playwright-report/` — Playwright HTML report
- `test-results/` — raw trace archives

Download them from the **Artifacts** tab of the failed workflow run.

### Visual regression diffs

When a visual regression test fails Playwright saves:

- `expected.png` — the stored baseline screenshot
- `actual.png` — what the test captured
- `diff.png` — the highlighted pixel differences

All three files appear in `packages/desktop-client/test-results/` and in the
CI artifacts. If the difference is intentional, update the baselines:

```bash
yarn workspace @actual-app/web run playwright test --update-snapshots
```

---

## 8. How to deploy into a container

### Option A — Single-container (quickest)

```bash
docker build -f sync-server.Dockerfile -t my-actual-server:local .
docker run -d \
  --restart=unless-stopped \
  -p 5006:5006 \
  -v /your/path/to/data:/data \
  --name actual_budget \
  my-actual-server:local
```

Or use the official published image:

```bash
docker run -d \
  --restart=unless-stopped \
  -p 5006:5006 \
  -v /your/path/to/data:/data \
  --name actual_budget \
  actualbudget/actual-server:latest
```

### Option B — Two-container Docker Compose (recommended for production)

This setup separates database storage from the application process, making
backups and upgrades simpler.

```bash
# Copy the compose file to your server
cp docker-compose.split.yml /srv/actual/docker-compose.yml
cd /srv/actual

# Start the stack
docker compose up -d
```

The compose file creates:

- **`actual-db`** — an Alpine container that owns the `actual-db-data` volume
  (holds all SQLite files). You can exec into this container to run backups.
- **`actual-server`** — the Actual Budget server, mounting the same volume.

### Persisting data

Both options mount a volume at `/data` inside the container. This directory
contains:

```
/data/
├── server-files/   # server-side SQLite database (accounts, sessions)
└── user-files/     # encrypted budget files (one directory per user)
```

**Always map `/data` to a persistent host volume or named volume.** Losing
`/data` means losing all budget files.

---

## 9. How to start the container in production

### Starting with Docker Compose (recommended)

```bash
# First start
docker compose -f docker-compose.split.yml up -d

# Check status
docker compose -f docker-compose.split.yml ps

# View logs
docker compose -f docker-compose.split.yml logs -f actual-server

# Stop the stack
docker compose -f docker-compose.split.yml down
```

The server is available at **http://\<host\>:5006**.

### Updating to a new version

```bash
docker compose -f docker-compose.split.yml pull
docker compose -f docker-compose.split.yml up -d
```

### Health check

The container runs a built-in health check every 60 seconds:

```bash
node build/src/scripts/health-check.js
```

You can query it manually:

```bash
docker inspect --format='{{.State.Health.Status}}' actual-server
# healthy
```

Or via HTTP:

```bash
curl http://localhost:5006/info
# {"version":"25.x.x","build":"..."}
```

### Backing up the database

```bash
# Copy the data volume contents to a local directory
docker run --rm \
  --volumes-from actual-db \
  -v "$(pwd)/backup:/backup" \
  alpine:3.22 \
  sh -c "cp -r /data /backup/actual-data-$(date +%Y%m%d-%H%M%S)"
```

### Setting a password

On the first visit to **http://\<host\>:5006** you will be prompted to create
a server password. To reset it:

```bash
# For the published image
docker exec -it actual_budget node build/src/scripts/reset-password.js
```

### Running behind a reverse proxy

If you place Actual behind nginx or Caddy ensure:

1. The `Host` header is forwarded.
2. `Connection: upgrade` is not stripped (needed for WebSocket sync).
3. HTTPS is terminated at the proxy; set `ACTUAL_HTTPS_KEY` / `ACTUAL_HTTPS_CERT`
   only if you want TLS inside the container instead.

Example Caddy snippet:

```
actual.example.com {
    reverse_proxy localhost:5006
}
```

---

## Next steps

| Resource                                                 | Description                                      |
| -------------------------------------------------------- | ------------------------------------------------ |
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)               | Full contributor workflow reference              |
| [TESTING_GUIDE.md](./TESTING_GUIDE.md)                   | Complete test-running and test-writing reference |
| [INSTALLATION.md](./INSTALLATION.md)                     | All deployment options and configuration         |
| [Community documentation](https://actualbudget.org/docs) | User and developer documentation                 |
| [Discord](https://discord.gg/pRYNYr4W5A)                 | Get help from the community                      |
| [wiki/](./wiki/)                                         | Deep-dive pages for each topic                   |
