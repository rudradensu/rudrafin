# 03 — Code Flow

← [Wiki Home](./Home.md) | [← Code Layout](./02-code-layout.md)

---

Understanding how data moves through the system makes it much easier to locate
bugs and add features in the right place.

---

## High-level architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  User device                                                     │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Browser / Electron window                                │  │
│  │                                                           │  │
│  │  ┌──────────────────────┐  message  ┌─────────────────┐  │  │
│  │  │  React UI (UI thread)│◄─────────►│  loot-core      │  │  │
│  │  │  desktop-client      │  bus      │  (Web Worker)   │  │  │
│  │  └──────────────────────┘           │                 │  │  │
│  │                                     │  SQLite budget  │  │  │
│  │                                     │  database       │  │  │
│  │                                     └────────┬────────┘  │  │
│  └───────────────────────────────────────────────│───────────┘  │
│                                                  │              │
│                                  CRDT change records (encrypted) │
└──────────────────────────────────────────────────│──────────────┘
                                                   │ HTTPS
                                                   ▼
                                    ┌──────────────────────────┐
                                    │  sync-server             │
                                    │  (Express + SQLite)      │
                                    │                          │
                                    │  /data/server-files/     │
                                    │  /data/user-files/       │
                                    └──────────────────────────┘
```

---

## Flow 1 — User action (client-only)

This is the most common path: the user edits a transaction, adjusts a budget
amount, or adds a category.

```
1. User interacts with a React component
        │
        ▼
2. Component calls a typed API wrapper
   (packages/loot-core/src/client/api.ts)
   e.g. send('transaction-add', { ... })
        │
        ▼ (postMessage over Web Worker / SharedWorker boundary)
3. Message dispatcher in the worker
   (packages/loot-core/src/server/main.ts)
        │
        ▼
4. Handler function performs SQLite operations
   (packages/loot-core/src/server/{feature}/index.ts)
        │
        ▼
5. SQLite database updated
   (better-sqlite3 in Node / sql.js WASM in browser)
        │
        ▼
6. Response posted back to the UI thread
        │
        ▼
7. React component re-renders with new data
```

**Key insight:** all budget database reads and writes happen inside the Web
Worker (step 3–5), keeping the UI thread free.

---

## Flow 2 — Multi-device sync

When sync is enabled, local changes are replicated to other devices through the
sync server.

```
1. SQLite budget change occurs (Flow 1 above)
        │
        ▼
2. loot-core CRDT module records the change
   (packages/crdt/src/)
        │
        ▼
3. Change is serialized as a Protobuf message
        │
        ▼
4. Message is encrypted with the user's budget key
   (AES-GCM; the key never leaves the device)
        │
        ▼
5. HTTPS POST /sync  →  sync-server
   (packages/sync-server/src/app-sync.ts)
        │
        ▼
6. Server appends the opaque blob to its SQLite DB
   (no decryption — server is blind to the content)
        │
        ▼ (on another device)
7. GET /sync  →  downloads new blobs since last sync
        │
        ▼
8. Blobs decrypted by the client
        │
        ▼
9. CRDT merge applied to local SQLite budget
   (resolves conflicts automatically)
        │
        ▼
10. React UI re-renders with merged data
```

---

## Flow 3 — React component data fetching

```
React component mounts
        │
        ▼ (custom hook, e.g. useAccounts())
loot-core client API called
        │
        ▼ (worker message)
loot-core server executes SQL query
        │
        ▼
Result returned to component
        │
        ▼
Component renders the data

  On data change (another component writes):
        │
        ▼
loot-core broadcasts an event to all listeners
        │
        ▼
Subscribed components re-query and re-render
```

This event-driven pattern means components do not need to share a complex state
tree for budget data — each component subscribes directly to the relevant data.

---

## Flow 4 — Bank import (GoCardless / SimpleFin / Pluggy.ai)

```
1. User clicks "Import transactions from bank"
        │
        ▼
2. React component calls the bank sync API
        │
        ▼
3. HTTPS POST /gocardless/{route}  (or /simplefin / /pluggyai)
   →  sync-server handler
        │
        ▼
4. Server calls the external bank API
   (GoCardless, SimpleFin, or Pluggy.ai)
        │
        ▼
5. Server returns raw transaction data to the client
        │
        ▼
6. loot-core merges transactions into the local SQLite
   (applying rules, deduplication, payee matching)
        │
        ▼
7. React UI shows the imported transactions
```

---

## Flow 5 — Sync server startup

```
Node.js process starts  (CMD: node build/app.js)
        │
        ▼
load-config.js reads environment variables
        │
        ▼
account-db.js bootstrap() opens (or creates) server SQLite
        │
        ▼
Migration runner applies any pending schema migrations
        │
        ▼
Express app is created (app.ts)
  - Registers middleware (cors, rate-limit, body-parser)
  - Mounts routers: /sync, /account, /admin, /openid, …
        │
        ▼
Server listens on ACTUAL_PORT (default: 5006)
```

---

## State ownership summary

| Data                                      | Where it lives                | How it's accessed                    |
| ----------------------------------------- | ----------------------------- | ------------------------------------ |
| Budget transactions, categories, accounts | loot-core SQLite (per-device) | `send()` / `query()` worker messages |
| Sync change records                       | sync-server SQLite            | HTTP `/sync`                         |
| User sessions and auth                    | sync-server SQLite            | HTTP `/account`                      |
| Global UI state (modals, theme, session)  | Redux store                   | `useSelector()` / `useDispatch()`    |
| Server configuration                      | Environment variables         | `load-config.js`                     |

---

## Next: [Making Changes →](./04-making-changes.md)
