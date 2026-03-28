# 06 — Testing

← [Wiki Home](./Home.md) | [← Build and DevOps](./05-build-devops.md)

---

## Test overview

| Layer                   | Framework          | Location                            | Run command        |
| ----------------------- | ------------------ | ----------------------------------- | ------------------ |
| Unit                    | Vitest             | Alongside source (`*.test.ts`)      | `yarn test`        |
| E2E (browser)           | Playwright         | `packages/desktop-client/e2e/`      | `yarn e2e`         |
| E2E (Electron)          | Playwright         | `packages/desktop-electron/e2e/`    | `yarn e2e:desktop` |
| Visual regression       | Playwright         | `*-snapshots/` dirs                 | `yarn vrt`         |
| Sync-server integration | Vitest + supertest | `packages/sync-server/src/*.test.*` | see below          |

---

## Running all tests

```bash
yarn test           # parallel across all packages, cached
yarn test:debug     # same but always re-runs (no Lage cache)
```

---

## Unit tests (Vitest)

### Run all

```bash
yarn test
```

### Run for a single package

```bash
yarn workspace @actual-app/core run test           # loot-core
yarn workspace @actual-app/sync-server run test    # sync-server
yarn workspace @actual-app/web run test            # desktop-client
yarn workspace @actual-app/api run test            # api
```

### Run a single file

```bash
yarn workspace @actual-app/core run test -- src/shared/util.test.ts
```

### Watch mode (re-run on save)

```bash
yarn workspace @actual-app/core run test -- --watch
```

---

## End-to-end tests (Playwright)

E2E tests launch a real Chromium browser and exercise the full UI.

### One-time browser install (after fresh clone or Playwright upgrade)

```bash
yarn workspace @actual-app/web run playwright install --with-deps chromium
```

### Run all E2E tests

```bash
yarn e2e
```

### Run a specific file

```bash
yarn workspace @actual-app/web run playwright test accounts.test.ts
```

### Headed browser (great for debugging)

```bash
yarn workspace @actual-app/web run playwright test --headed accounts.test.ts
```

### Interactive debug mode (step through each action)

```bash
yarn workspace @actual-app/web run playwright test --debug accounts.test.ts
```

---

## Visual regression tests

VRT takes screenshots and compares them to stored baseline images.

```bash
yarn vrt
```

Run in Docker for a consistent rendering environment (recommended for
generating baselines that match CI):

```bash
yarn vrt:docker
```

### Updating baselines after an intentional UI change

```bash
yarn workspace @actual-app/web run playwright test --update-snapshots
```

Commit the new snapshot files along with your code change.

---

## Sync-server integration tests

```bash
yarn workspace @actual-app/sync-server run test
```

These tests use **Vitest + supertest** and run against a temporary in-memory
SQLite database. Database migrations are applied automatically before each
test run via `packages/sync-server/vitest.globalSetup.js`.

---

## How test data is generated

### Unit tests — inline fixtures

Unit tests construct only the minimal state they need, defined directly in the
test file. There is no shared fixture database.

```typescript
// Example: loot-core unit test
it('splits a transaction correctly', () => {
  const transaction = {
    id: 'tx1',
    amount: -5000, // $50.00 in cents
    payee: 'Grocery Store',
  };
  const result = splitTransaction(transaction, [2000, 3000]);
  expect(result).toHaveLength(2);
});
```

### E2E tests — demo budget

E2E tests start from a **demo budget** seeded by `loot-core`'s built-in demo
generator. The Playwright `globalSetup` hook (defined in
`packages/desktop-client/playwright.config.ts`) navigates to the UI, selects
"View demo", and waits for the budget to load before any test begins.

The demo budget contains:

- Multiple bank accounts (checking, savings, credit cards)
- Months of historical transactions
- Category groups (Bills, Food, Personal, …)
- Budgeted amounts that match the transactions

### Sync-server tests — temporary SQLite

The sync-server test runner creates a fresh SQLite database in a temp
directory before each test suite. After the suite finishes the database is
deleted. Tests do not share state across files.

---

## Writing new tests

### Unit test (Vitest)

Place the test file alongside the source file; use `.test.ts` (or
`.test.tsx` for React components).

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('returns the expected value', () => {
    expect(myFunction(1, 2)).toBe(3);
  });
});
```

**Best practices:**

- Minimize mocks — prefer real implementations.
- Descriptive test names that read as full sentences.
- One assertion per `it` block where practical.

### E2E test (Playwright)

Add a `.test.ts` file in `packages/desktop-client/e2e/`. Reuse page-object
models from `e2e/page-models/` for common interactions.

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

### Sync-server integration test (Vitest + supertest)

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

```bash
rm -rf .lage
yarn test:debug
```

### Playwright HTML report

```bash
yarn workspace @actual-app/web run playwright show-report
# Opens packages/desktop-client/playwright-report/index.html
```

### Playwright trace viewer

```bash
# Capture a trace during the run
yarn workspace @actual-app/web run playwright test --trace on accounts.test.ts

# Open the trace
yarn workspace @actual-app/web run playwright show-trace \
  packages/desktop-client/test-results/*/trace.zip
```

### Playwright headed + slow motion

```bash
yarn workspace @actual-app/web run playwright test \
  --headed --slow-mo 500 accounts.test.ts
```

---

## Test configuration reference

| File                                           | Purpose                               |
| ---------------------------------------------- | ------------------------------------- |
| `vitest.config.ts` (root)                      | Root Vitest config (Node environment) |
| `packages/loot-core/vitest.config.ts`          | loot-core unit test config            |
| `packages/sync-server/vitest.config.ts`        | sync-server unit test config          |
| `packages/desktop-client/vitest.web.config.ts` | Browser-environment unit tests        |
| `packages/desktop-client/playwright.config.ts` | Playwright E2E and VRT config         |
| `lage.config.js`                               | Lage pipeline (caching + parallelism) |

---

## Next: [Container Deployment →](./07-container-deploy.md)
