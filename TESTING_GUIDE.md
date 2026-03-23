# Testing Guide

This guide explains how to run every category of automated test in this
repository and how to write new tests when fixing bugs or adding features.

---

## Table of contents

1. [Testing overview](#testing-overview)
2. [Quick start](#quick-start)
3. [Unit tests (Vitest)](#unit-tests-vitest)
4. [End-to-end tests (Playwright)](#end-to-end-tests-playwright)
5. [Visual regression tests](#visual-regression-tests)
6. [Sync-server integration tests](#sync-server-integration-tests)
7. [CI pipeline](#ci-pipeline)
8. [Writing new tests](#writing-new-tests)
9. [Debugging failures](#debugging-failures)
10. [Test configuration reference](#test-configuration-reference)

---

## Testing overview

| Layer | Framework | Location | Run command |
|---|---|---|---|
| Unit | Vitest | Alongside source files (`*.test.ts`) | `yarn test` |
| E2E (browser) | Playwright | `packages/desktop-client/e2e/` | `yarn e2e` |
| E2E (Electron) | Playwright | `packages/desktop-electron/e2e/` | `yarn e2e:desktop` |
| Visual regression | Playwright | `*-snapshots/` dirs | `yarn vrt` |
| Sync-server integration | Vitest + supertest | `packages/sync-server/src/*.test.*` | see below |

The project uses **Lage** as a task runner to execute tests in parallel across
all workspaces with smart caching.

---

## Quick start

```bash
# Run all unit tests across every package (recommended first step)
yarn test

# Same, but skip the Lage cache (useful after a rebase or flaky results)
yarn test:debug
```

---

## Unit tests (Vitest)

### Running all unit tests

```bash
yarn test           # cached — skips packages with no changes
yarn test:debug     # no cache — always re-runs everything
```

### Running tests for a single package

```bash
yarn workspace @actual-app/core run test           # loot-core
yarn workspace @actual-app/sync-server run test    # sync-server
yarn workspace @actual-app/api run test            # api package
yarn workspace @actual-app/web run test            # desktop-client
```

### Running a single test file

Vitest accepts a file path filter:

```bash
yarn workspace @actual-app/core run test -- src/shared/util.test.ts
```

---

## End-to-end tests (Playwright)

E2E tests launch a real browser and exercise the full UI.  A built version of
the web front-end is served automatically during the test run.

### Prerequisites

Install the Playwright browsers once (needed after a fresh clone or after
Playwright is upgraded):

```bash
yarn workspace @actual-app/web run playwright install --with-deps chromium
```

### Running E2E tests

```bash
# All E2E tests (headless, Chromium)
yarn e2e

# Or run within the desktop-client workspace
yarn workspace @actual-app/web e2e

# A specific test file
yarn workspace @actual-app/web run playwright test accounts.test.ts

# Headed browser (great for debugging)
yarn workspace @actual-app/web run playwright test --headed accounts.test.ts

# Interactive debug mode (pauses on each step)
yarn workspace @actual-app/web run playwright test --debug accounts.test.ts
```

### Running Electron E2E tests

```bash
yarn e2e:desktop
```

This performs a full production build before running the tests, so it is
slower than the browser tests.

---

## Visual regression tests

Visual regression tests take screenshots and compare them to stored baselines.

```bash
# Run VRT (uses existing snapshots as baselines)
yarn vrt

# Run VRT in Docker for a consistent rendering environment
yarn vrt:docker
```

### Updating snapshots

When an intentional UI change causes a snapshot diff, regenerate the baselines:

```bash
yarn workspace @actual-app/web run playwright test --update-snapshots
```

Commit the updated snapshot files along with your code changes.

---

## Sync-server integration tests

The sync-server tests use **Vitest** with **supertest** to exercise Express
routes against a real (in-memory / temporary) SQLite database.

```bash
yarn workspace @actual-app/sync-server run test
```

Database migrations are applied automatically to a temporary test database
before each test run.  See `packages/sync-server/vitest.config.ts` and
`packages/sync-server/vitest.globalSetup.js` for details.

---

## CI pipeline

The GitHub Actions workflow (`.github/workflows/check.yml`) runs on every pull
request and merge to `master`.  It runs:

1. `yarn typecheck` — TypeScript type checking
2. `yarn lint` — ESLint and oxfmt formatting check
3. `yarn test` — all unit tests via Lage
4. Playwright E2E tests (separate job)

All checks must pass before a PR can be merged.  You can reproduce any CI step
locally with the commands listed in this guide.

---

## Writing new tests

### Unit test (Vitest)

Place the test file alongside the source file being tested and use the `.test.ts`
(or `.test.tsx` for React components) extension.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('returns the expected value', () => {
    expect(myFunction(1, 2)).toBe(3);
  });
});
```

**Best practices:**

- Minimize mocks — prefer real implementations.
- Use descriptive test names that read as sentences.
- One assertion per `it` block where possible.

### E2E test (Playwright)

Add a new `.test.ts` file in `packages/desktop-client/e2e/`.  Reuse the page
models in `e2e/page-models/` for common interactions.

```typescript
import { test, expect } from '@playwright/test';
import { AccountsPage } from './page-models/accountsPage';

test('create a new account', async ({ page }) => {
  const accounts = new AccountsPage(page);
  await accounts.goto();
  await accounts.createAccount('Savings', 1000);
  await expect(page.getByText('Savings')).toBeVisible();
});
```

### Sync-server test (Vitest + supertest)

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
```

---

## Debugging failures

### Lage cache stale

If tests pass locally but fail in CI (or vice versa), clear the Lage cache:

```bash
rm -rf .lage
yarn test:debug
```

### Vitest watch mode

```bash
yarn workspace @actual-app/core run test -- --watch
```

### Playwright trace viewer

When a Playwright test fails in CI a trace archive is uploaded as an artifact.
You can also capture a trace locally:

```bash
yarn workspace @actual-app/web run playwright test --trace on accounts.test.ts
# Then open the trace
yarn workspace @actual-app/web run playwright show-trace test-results/*/trace.zip
```

### Playwright headed + slow motion

```bash
yarn workspace @actual-app/web run playwright test \
  --headed \
  --slow-mo 500 \
  accounts.test.ts
```

---

## Test configuration reference

| File | Purpose |
|---|---|
| `vitest.config.ts` (root) | Root Vitest config (Node environment) |
| `packages/loot-core/vitest.config.ts` | loot-core unit test config |
| `packages/sync-server/vitest.config.ts` | sync-server unit test config |
| `packages/desktop-client/vitest.web.config.ts` | Browser-environment unit tests |
| `packages/desktop-client/playwright.config.ts` | Playwright E2E and VRT config |
| `lage.config.js` | Lage pipeline config (caching and parallelism) |

---

## Additional resources

- [Vitest documentation](https://vitest.dev/)
- [Playwright documentation](https://playwright.dev/)
- [Lage documentation](https://microsoft.github.io/lage/)
- [Installation guide](./INSTALLATION.md)
- [Developer guide](./DEVELOPER_GUIDE.md)
