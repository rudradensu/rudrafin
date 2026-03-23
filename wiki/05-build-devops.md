# 05 — Build and DevOps

← [Wiki Home](./Home.md) | [← Making Changes](./04-making-changes.md)

---

## Local builds

### Build the browser bundle

```bash
yarn build:browser
# Output: packages/desktop-client/build/
```

This script (`./bin/package-browser`) runs Vite in production mode.  The
bundle includes:

- The React UI
- The loot-core browser backend (compiled to JavaScript, runs in a Web Worker)
- The plugins-service worker

### Build the sync server

```bash
yarn build:server
# 1. Runs yarn build:browser (produces the UI bundle)
# 2. Compiles packages/sync-server TypeScript → packages/sync-server/build/
```

### Build the Electron desktop app

```bash
yarn build:desktop
# Output: packages/desktop-electron/release/
# (Calls electron-builder to package the app as a native installer)
```

### Build the API package

```bash
yarn build:api
# Output: packages/api/lib-dist/
```

### Build everything (all packages)

```bash
yarn build
# Uses Lage to run builds in dependency order across all workspaces
```

---

## Production Docker image

The `sync-server.Dockerfile` uses a **three-stage build** to produce a small,
non-root production image.

```
Stage 1 — deps  (node:22-bookworm)
  ├── Install Node.js dependencies (yarn install)
  └── Set up all workspaces

Stage 2 — builder  (from deps)
  ├── Copy source code
  ├── yarn build:server
  │   ├── Build browser bundle (Vite)
  │   └── Compile sync-server TypeScript
  └── yarn workspaces focus --production
      (prune dev dependencies)

Stage 3 — prod  (node:22-bookworm-slim)
  ├── Copy /app/node_modules from builder
  ├── Copy /app/packages/sync-server/build from builder
  ├── Copy UI build into node_modules/@actual-app/web/build
  ├── Run as non-root user "actual" (UID 1001)
  └── ENTRYPOINT: tini → node build/app.js
```

Build command:

```bash
docker build -f sync-server.Dockerfile -t my-actual-server:local .
```

The variable `NODE_OPTIONS=--max_old_space_size=8192` is set during the build
stage because the browser bundle is large and the default Node.js heap limit
(~1.5 GB) is sometimes insufficient.

---

## CI/CD pipeline (GitHub Actions)

All workflow files live in `.github/workflows/`.

### Core checks (every PR and master push)

**`.github/workflows/check.yml`**

| Step | Command | What it checks |
|---|---|---|
| Type check | `yarn typecheck` | TypeScript strict-mode compliance |
| Lint | `yarn lint` | oxlint rules + oxfmt formatting |
| Unit tests | `yarn test` | All Vitest tests via Lage |
| E2E tests | `yarn e2e` | Playwright browser tests |

All four steps must pass before a PR can be merged.

### Build verification

**`.github/workflows/build.yml`** — verifies `yarn build:server` succeeds
(includes the Docker image build check).

### Release workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `docker-release.yml` | Git release tag | Builds and pushes `actualbudget/actual-server:<version>` to Docker Hub |
| `docker-edge.yml` | `master` push | Builds and pushes `actualbudget/actual-server:edge` |
| `electron-master.yml` | `master` push | Builds Electron binaries for Windows/macOS/Linux |
| `publish-npm-packages.yml` | Release tag | Publishes npm packages (`@actual-app/api`, etc.) |
| `netlify-release.yml` | Release tag | Deploys the documentation site to Netlify |

### Other workflows

| Workflow | Purpose |
|---|---|
| `e2e-test.yml` | Runs Playwright E2E tests on PR |
| `vrt-update-generate.yml` | Generates new visual regression snapshots |
| `codeql.yml` | CodeQL security scanning |
| `autofix.yml` | Auto-applies lint fixes to PRs |
| `release-notes.yml` | Collects and formats release notes |
| `ai-generated-release-notes.yml` | AI-assisted release note generation |

---

## Environment variables (sync server)

All options are loaded via `packages/sync-server/src/load-config.js`.

| Variable | Default | Description |
|---|---|---|
| `ACTUAL_PORT` | `5006` | Port to listen on |
| `ACTUAL_DATA_DIR` | `/data` | Directory for all SQLite files |
| `ACTUAL_HTTPS_KEY` | — | Path to TLS private key (enables HTTPS) |
| `ACTUAL_HTTPS_CERT` | — | Path to TLS certificate |
| `ACTUAL_UPLOAD_FILE_SIZE_LIMIT_MB` | `20` | Max budget file upload size |
| `ACTUAL_UPLOAD_SYNC_ENCRYPTED_FILE_SYNC_SIZE_LIMIT_MB` | `50` | Max encrypted sync file size |
| `ACTUAL_LOGIN_METHOD` | `password` | `password`, `header`, or `openid` |
| `ACTUAL_TRUSTED_PROXIES` | — | Comma-separated list of trusted proxy IPs |

Full reference: <https://actualbudget.org/docs/config/>

---

## Lage task runner

[Lage](https://microsoft.github.io/lage/) runs tasks across workspaces in
parallel with smart caching.

```bash
yarn test           # run all tests (uses cache)
yarn test:debug     # run all tests (skip cache)
yarn build          # build all packages in dependency order
```

Lage caches results in `.lage/`.  Clear the cache if tests behave unexpectedly:

```bash
rm -rf .lage
```

Configuration is in `lage.config.js` at the root.

---

## Next: [Testing →](./06-testing.md)
