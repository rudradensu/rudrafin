# 02 — Code Layout

← [Wiki Home](./Home.md) | [← Project Overview](./01-project-overview.md)

---

## Top-level structure

```
actual/                          (repository root)
├── packages/                    # All application packages (Yarn workspaces)
│
├── Dockerfile                   # Development container image
├── sync-server.Dockerfile       # Multi-stage production container image
├── docker-compose.yml           # Development compose file
├── docker-compose.split.yml     # Two-container production compose file
│
├── README.md                    # Project overview + quick-start links
├── NEW_DEVELOPER_ONBOARDING.md  # Comprehensive onboarding guide
├── DEVELOPER_GUIDE.md           # Contributor workflow reference
├── TESTING_GUIDE.md             # Test-running reference
├── INSTALLATION.md              # All deployment options
├── wiki/                        # Deep-dive developer wiki (this directory)
│
├── lage.config.js               # Lage task runner (parallel builds / tests)
├── package.json                 # Root scripts and shared devDependencies
├── tsconfig.json                # Root TypeScript config (project references)
├── tsconfig.root.json           # TypeScript config for root-level files
├── vitest.config.ts             # Root Vitest config
│
├── .github/
│   ├── workflows/               # GitHub Actions CI/CD workflow definitions
│   ├── ISSUE_TEMPLATE/          # Bug / feature / docs issue templates
│   └── PULL_REQUEST_TEMPLATE.md # PR template
│
└── bin/                         # Helper scripts (packaging, release notes)
```

---

## Packages overview

All packages are Yarn workspaces under `packages/`. Run any command with:

```bash
yarn workspace <workspace-name> run <command>
```

| Directory              | Workspace name            | Purpose                                     |
| ---------------------- | ------------------------- | ------------------------------------------- |
| `loot-core`            | `@actual-app/core`        | All budget logic, SQLite, CRDT client       |
| `desktop-client`       | `@actual-app/web`         | React web/desktop UI                        |
| `desktop-electron`     | `desktop-electron`        | Electron desktop wrapper                    |
| `sync-server`          | `@actual-app/sync-server` | Express sync + auth server                  |
| `api`                  | `@actual-app/api`         | Public Node.js scripting API                |
| `component-library`    | `@actual-app/components`  | Shared React design-system components       |
| `crdt`                 | `@actual-app/crdt`        | CRDT protocol + Protobuf serialization      |
| `plugins-service`      | `plugins-service`         | Plugin worker (Web Worker / iframe sandbox) |
| `eslint-plugin-actual` | `eslint-plugin-actual`    | Custom ESLint rules for this codebase       |
| `docs`                 | `docs`                    | Docusaurus documentation website            |

---

## `loot-core` in detail

`loot-core` is the **platform-agnostic core**. It runs in:

- A Web Worker (browser)
- The Electron main process (desktop)
- A plain Node.js process (tests and the API package)

```
packages/loot-core/src/
├── server/                   # "Server" (worker) side logic
│   ├── accounts/             # Account management and bank sync
│   ├── budget/               # Budget calculation engine
│   ├── budgetfiles/          # Budget file import/export
│   ├── db/                   # Low-level SQLite helpers
│   ├── filters/              # Transaction filters
│   ├── migrate/              # In-budget SQLite schema migrations
│   ├── payees/               # Payee management
│   ├── reports/              # Report data queries
│   ├── rules/                # Transaction categorization rules
│   ├── schedules/            # Recurring transaction schedules
│   ├── sync/                 # CRDT sync client
│   ├── transactions/         # Transaction CRUD
│   ├── main.ts               # Worker entry point and message dispatcher
│   └── main-app.ts           # App initialization logic
│
├── client/                   # Client (UI thread) side of the worker bridge
│   ├── api.ts                # Typed API wrappers that call into the worker
│   └── ...
│
├── shared/                   # Pure utilities shared by client and server
│   ├── arithmetic.ts         # Financial arithmetic (integer cents)
│   ├── months.ts             # Month-range helpers
│   ├── transactions.ts       # Transaction utilities
│   ├── rules.ts              # Rule evaluation
│   └── util.ts               # General utilities
│
├── types/                    # TypeScript type definitions (re-exported)
│
└── platform/                 # Platform shims
    ├── platform.ts           # Abstract platform interface
    ├── platform.api.ts       # Node.js / API implementation
    └── platform.electron.ts  # Electron implementation
```

---

## `desktop-client` in detail

```
packages/desktop-client/src/
├── components/               # All React screen components
│   ├── App.tsx               # Root application component
│   ├── FinancesApp.tsx       # Main app layout after login
│   ├── accounts/             # Account list + transaction views
│   ├── budget/               # Budget grid views
│   ├── reports/              # Charts and reports
│   ├── settings/             # User and server settings
│   ├── manager/              # Budget file manager (open / create / close)
│   └── ...                   # Many more feature areas
│
├── hooks/                    # Custom React hooks
│   ├── useNavigate.ts        # Wrapper around react-router navigate
│   └── ...
│
├── redux/                    # Redux store: slices for UI state
│   ├── store.ts
│   └── ...
│
├── queries/                  # React Query hooks for async data fetching
│
├── style/                    # CSS-in-JS theme tokens and global styles
│
└── i18n/                     # Translation function wrappers

packages/desktop-client/e2e/ # Playwright E2E tests
    ├── page-models/          # Reusable page-object models
    └── *.test.ts             # Test files (one per feature area)
```

---

## `sync-server` in detail

```
packages/sync-server/src/
├── app.ts                    # Express app entry point (registers all routers)
├── app-account.js            # User account routes (/account)
├── app-sync.ts               # Budget sync routes (/sync)
├── app-admin.js              # Admin routes (/admin)
├── app-openid.js             # OpenID Connect routes (/openid)
├── app-cors-proxy.js         # CORS proxy (/cors-proxy)
├── app-secrets.js            # Secret storage (/secret)
├── app-gocardless/           # GoCardless bank integration (/gocardless)
├── app-simplefin/            # SimpleFin bank integration (/simplefin)
├── app-pluggyai/             # Pluggy.ai bank integration (/pluggyai)
│
├── account-db.js             # Server SQLite helpers (user/session DB)
├── load-config.js            # Environment variable config loader
├── migrations.ts             # Server DB migration runner
├── sql/                      # Raw SQL schema files
└── migrations/               # Numbered migration files
```

---

## `component-library` in detail

```
packages/component-library/src/
├── Button.tsx, Input.tsx, ...   # Individual UI component files
├── theme.ts                     # Design tokens (colors, spacing, typography)
└── icons/                       # 375+ auto-generated SVG icon components
                                 # (DO NOT edit manually)
```

---

## Configuration files at the root

| File               | Purpose                                                      |
| ------------------ | ------------------------------------------------------------ |
| `package.json`     | Root scripts (`yarn start`, `yarn test`, `yarn lint:fix`, …) |
| `lage.config.js`   | Lage pipeline — defines caching and task order               |
| `tsconfig.json`    | TypeScript project references for all packages               |
| `vitest.config.ts` | Root Vitest config (Node environment default)                |
| `.editorconfig`    | Editor formatting baseline                                   |
| `.yarnrc.yml`      | Yarn 4 settings (plug-n-play mode, plugin config)            |

---

## Next: [Code Flow →](./03-code-flow.md)
