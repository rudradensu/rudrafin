# 04 — Making Changes

← [Wiki Home](./Home.md) | [← Code Flow](./03-code-flow.md)

---

## Prerequisites

| Tool              | Version    | How to install                                                    |
| ----------------- | ---------- | ----------------------------------------------------------------- |
| Node.js           | ≥ 22       | [nodejs.org](https://nodejs.org/) or `nvm install 22`             |
| Yarn              | ^4.9.1     | `corepack enable` then check with `yarn --version`                |
| Git               | any recent | [git-scm.com](https://git-scm.com/)                               |
| Docker (optional) | 24+        | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) |

On Windows, during Node.js installation select **"Automatically install the
necessary tools"** — this is required to compile the native `better-sqlite3`
module.

---

## Initial setup

```bash
git clone https://github.com/actualbudget/actual.git
cd actual
yarn install          # install dependencies for every workspace
yarn typecheck        # quick sanity-check — should pass on a clean clone
```

> **Always run `yarn` commands from the repository root.** Never `cd` into a
> child workspace.

---

## Starting the development server

### Browser only (fastest to start)

```bash
yarn start
# Vite dev server → http://localhost:3001
```

### Full stack (with sync server)

```bash
yarn start:server-dev
# Sync server → http://localhost:5006
# Vite dev server → http://localhost:3001
```

### Electron desktop

```bash
yarn start:desktop
```

**Tip:** On the setup screen choose **"View demo"** to load a pre-populated
sample budget with realistic accounts, transactions, and categories. This is
much faster than starting from scratch and gives you a real dataset to work
against.

---

## Step-by-step change workflow

```bash
# 1. Create a feature branch
git checkout -b fix/my-bug-description

# 2. Find the right file (see "Where to look" below)
# 3. Make your change

# 4. Type-check (run after every meaningful edit)
yarn typecheck

# 5. Lint and auto-fix
yarn lint:fix

# 6. Run the relevant tests
yarn test                                        # all packages
yarn workspace @actual-app/core run test         # loot-core only
yarn workspace @actual-app/sync-server run test  # sync-server only

# 7. Commit
git add .
git commit -m "fix: correct budget rollover calculation"

# 8. Open a pull request on GitHub
```

---

## Where to look

| Area                     | Path                                       |
| ------------------------ | ------------------------------------------ |
| Budget calculation logic | `packages/loot-core/src/shared/`           |
| Server SQL operations    | `packages/loot-core/src/server/db/`        |
| Transaction rules        | `packages/loot-core/src/server/rules/`     |
| Recurring schedules      | `packages/loot-core/src/server/schedules/` |
| React pages / screens    | `packages/desktop-client/src/components/`  |
| Custom React hooks       | `packages/desktop-client/src/hooks/`       |
| Redux slices             | `packages/desktop-client/src/redux/`       |
| Shared UI components     | `packages/component-library/src/`          |
| Server HTTP routes       | `packages/sync-server/src/app-*.{js,ts}`   |
| Server DB helpers        | `packages/sync-server/src/account-db.js`   |
| Server DB migrations     | `packages/sync-server/migrations/`         |
| Server configuration     | `packages/sync-server/src/load-config.js`  |

---

## Code conventions

### TypeScript

```typescript
// ✅ Use `type` not `interface`
type TransactionProps = {
  id: string;
  amount: number;
};

// ✅ Use inline type imports
import { type Transaction } from '../types';

// ✅ Use `satisfies` for narrowing
const config = { port: 5006 } satisfies ServerConfig;

// ❌ Avoid `any` / `unknown` unless absolutely necessary
// ❌ Avoid type assertions (`as SomeType`, `value!`)
// ❌ Avoid `enum` — use plain objects or maps
```

### React

```tsx
// ✅ Named exports; type props directly
export function MyComponent({
  title,
  amount,
}: {
  title: string;
  amount: number;
}) {
  return (
    <div>
      {title}: {amount}
    </div>
  );
}

// ✅ Use project wrappers, not the library directly
import { useNavigate } from '../hooks/useNavigate'; // not react-router
import { useDispatch, useSelector } from '../redux'; // not react-redux

// ✅ Wrap all user-facing strings for i18n
import { t } from '../i18n';
<button>{t('Save')}</button>;

// ❌ No React.FC / React.FunctionComponent
// ❌ No default exports for components
// ❌ No manual useCallback / useMemo (React Compiler handles it)
```

### Imports order (enforced by ESLint)

```typescript
// 1. React (always first)
import { useState } from 'react';

// 2. Node built-ins
import fs from 'node:fs';

// 3. External packages
import express from 'express';

// 4. Internal @actual-app/* packages
import { Button } from '@actual-app/components';

// 5. Parent imports
import { formatCurrency } from '../../util';

// 6. Sibling imports
import { AccountRow } from './AccountRow';
```

---

## Adding a new server route

1. Create or edit `packages/sync-server/src/app-<feature>.ts`.
2. Export a `handlers` Express Router.
3. Register it in `packages/sync-server/src/app.ts`:
   ```typescript
   import * as myFeature from './app-myfeature';
   app.use('/myfeature', myFeature.handlers);
   ```
4. Add a migration if you need a new database table in
   `packages/sync-server/migrations/`.
5. Write unit tests in `packages/sync-server/src/app-<feature>.test.ts`.

## Adding a new React component

1. Create `packages/desktop-client/src/components/MyComponent.tsx`.
2. Use named exports; type props inline or with a local `type`.
3. Import shared primitives from `@actual-app/components`.
4. Add an E2E test in `packages/desktop-client/e2e/myFeature.test.ts` for
   any user-visible behaviour.

---

## Submitting a pull request

1. Fork the repository and push your feature branch.
2. Ensure all checks pass locally:
   ```bash
   yarn typecheck && yarn lint:fix && yarn test
   ```
3. Generate a release note entry:
   ```bash
   yarn generate:release-notes
   ```
4. Open a PR against `master` and fill in the PR template.
5. Link the related issue with `Fixes #<number>` in the PR description.
6. Keep the PR up to date with `master` by rebasing.

---

## Next: [Build and DevOps →](./05-build-devops.md)
