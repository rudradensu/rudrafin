# Installation Guide

This guide covers every supported way to package and run Actual Budget.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Docker (for container deployments) | 24 or later (with Compose V2) |
| Node.js (for local / CLI deployments) | 22 or later |
| Yarn | 4.9.1 or later |

---

## Option 1 — Single-container Docker deployment (recommended for most users)

This is the simplest way to run Actual Budget.  A single image bundles the
sync-server and the web front-end.

```bash
# Pull and start the latest stable release
docker run \
  --pull=always \
  --restart=unless-stopped \
  -d \
  -p 5006:5006 \
  -v /your/path/to/data:/data \
  --name actual_budget \
  actualbudget/actual-server:latest
```

The server will be available at **http://localhost:5006**.

To update:

```bash
docker stop actual_budget
docker rm actual_budget
docker run --pull=always --restart=unless-stopped -d \
  -p 5006:5006 -v /your/path/to/data:/data \
  --name actual_budget actualbudget/actual-server:latest
```

---

## Option 2 — Two-container Docker Compose deployment

This setup separates concerns: one container owns the SQLite database files and
one container runs the application.  This makes it easier to:

- Back up the database by exec-ing into the `actual-db` container.
- Replace or upgrade the application container independently.
- Apply fine-grained resource limits per service.

### Step 1 — Copy the compose file

Copy `docker-compose.split.yml` from the root of this repository to the
directory where you want to run the server.

### Step 2 — Start the stack

```bash
docker compose -f docker-compose.split.yml up -d
```

The server will be available at **http://localhost:5006**.

### Step 3 — Configuration (optional)

Uncomment and adjust the `environment:` variables in `docker-compose.split.yml`
to change the port, enable HTTPS, or adjust upload limits.  A full list of
options is at https://actualbudget.org/docs/config/.

### Step 4 — Update

```bash
docker compose -f docker-compose.split.yml pull
docker compose -f docker-compose.split.yml up -d
```

### Backing up the database

```bash
# Copy the entire data volume to a local directory
docker run --rm \
  --volumes-from actual-db \
  -v "$(pwd)/backup:/backup" \
  alpine:3.22 \
  sh -c "cp -r /data /backup/actual-data-$(date +%Y%m%d-%H%M%S)"
```

---

## Option 3 — Docker Compose (single container, from sync-server package)

The `packages/sync-server/docker-compose.yml` file uses the published image
with a host-directory volume.  This is the minimal production compose file
and suits users who prefer simplicity over separation of concerns.

```bash
cd packages/sync-server
docker compose up -d
```

---

## Option 4 — Build from source

Use this path when you need a custom image (e.g. a private fork or custom
patches).

```bash
# From the repository root:
docker build -f sync-server.Dockerfile -t my-actual-server:local .
docker run -d -p 5006:5006 -v /your/data:/data my-actual-server:local
```

---

## Option 5 — CLI / npm global install

Node.js 22 or later is required.

```bash
npm install --location=global @actual-app/sync-server
actual-server           # start with defaults
actual-server --config ./config.json   # start with a custom config file
actual-server --reset-password         # reset the admin password
```

---

## Option 6 — Managed hosting

| Provider | Notes |
|---|---|
| [PikaPods](https://www.pikapods.com/pods?run=actual) | One-click, ~$1.40/month |
| [Fly.io](https://actualbudget.org/docs/install/fly) | ~$1.50/month |

---

## Configuration reference

All environment variables and their defaults are documented at
https://actualbudget.org/docs/config/.

---

## Verifying the installation

Open **http://\<host\>:5006** in a browser.  You should see the Actual Budget
setup screen.  If the server is behind a proxy, make sure the proxy forwards
the `Host` header and does not strip `Connection: upgrade`.

---

## Next steps

- [Developer Guide](./DEVELOPER_GUIDE.md) — set up a local development environment
- [Testing Guide](./TESTING_GUIDE.md) — run the automated test suite
