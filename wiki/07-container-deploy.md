# 07 — Container Deployment

← [Wiki Home](./Home.md) | [← Testing](./06-testing.md)

---

## Option A — Single-container (quickest)

Runs the sync server and the web front-end in a single Docker container.

### Using the official published image

```bash
docker run \
  --pull=always \
  --restart=unless-stopped \
  -d \
  -p 5006:5006 \
  -v /your/path/to/data:/data \
  --name actual_budget \
  actualbudget/actual-server:latest
```

Open **http://localhost:5006** in a browser.

### Using a locally built image

```bash
# Build from source (from the repository root)
docker build -f sync-server.Dockerfile -t my-actual-server:local .

# Run
docker run -d \
  --restart=unless-stopped \
  -p 5006:5006 \
  -v /your/path/to/data:/data \
  --name actual_budget \
  my-actual-server:local
```

---

## Option B — Two-container Docker Compose (recommended for production)

Separates the database volume from the application process. Benefits:

- Back up the database by exec-ing into the `actual-db` container.
- Upgrade the application without touching the data volume.
- Apply independent resource limits per service.

### Step 1 — Copy the compose file to your server

```bash
scp docker-compose.split.yml user@myserver:/srv/actual/docker-compose.yml
```

### Step 2 — Start the stack

```bash
cd /srv/actual
docker compose up -d
```

### Step 3 — Optional configuration

Edit `docker-compose.yml` and uncomment the `environment:` section to change
the port, enable HTTPS, or adjust upload limits:

```yaml
environment:
  - ACTUAL_PORT=5006
  - ACTUAL_HTTPS_KEY=/data/selfhost.key
  - ACTUAL_HTTPS_CERT=/data/selfhost.crt
  - ACTUAL_UPLOAD_FILE_SIZE_LIMIT_MB=50
```

Full list of options: <https://actualbudget.org/docs/config/>

### What the compose file creates

| Service         | Image                               | Purpose                                                                                  |
| --------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `actual-db`     | `alpine:3.22`                       | Owns the `actual-db-data` named volume; runs a sleep loop so you can exec in for backups |
| `actual-server` | `actualbudget/actual-server:latest` | The Actual Budget sync server; mounts the volume from `actual-db`                        |

The `actual-server` service waits for `actual-db` to report healthy before
starting (using `depends_on: condition: service_healthy`).

---

## Understanding the data volume

Both container options mount a volume at `/data` inside the container:

```
/data/
├── server-files/          # server-side SQLite database (accounts, sessions)
│   ├── account.sqlite
│   └── ...
└── user-files/            # encrypted budget files (one dir per user)
    └── <user-id>/
        └── <budget-id>.sqlite
```

**Always map `/data` to persistent storage.** Containers are ephemeral;
everything inside `/data` must survive container restarts and upgrades.

---

## Enabling HTTPS

### Option 1 — TLS inside the container

Mount your certificate and key into the container and set environment variables:

```bash
docker run -d \
  -p 443:5006 \
  -v /your/certs:/certs:ro \
  -v /your/data:/data \
  -e ACTUAL_HTTPS_KEY=/certs/privkey.pem \
  -e ACTUAL_HTTPS_CERT=/certs/fullchain.pem \
  actualbudget/actual-server:latest
```

### Option 2 — TLS at a reverse proxy (recommended)

Terminate TLS at an nginx, Caddy, or Traefik reverse proxy and forward plain
HTTP to the container. Example Caddy configuration:

```
actual.example.com {
    reverse_proxy localhost:5006
}
```

Caddy automatically obtains and renews a Let's Encrypt certificate.

---

## Docker Hub image tags

| Tag      | Description                                      |
| -------- | ------------------------------------------------ |
| `latest` | Latest stable release                            |
| `edge`   | Built from the latest `master` commit            |
| `25.x.x` | Pinned version tags for reproducible deployments |

---

## Next: [Production Operations →](./08-production.md)
