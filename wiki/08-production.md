# 08 — Production Operations

← [Wiki Home](./Home.md) | [← Container Deployment](./07-container-deploy.md)

---

## Starting the stack

```bash
# First start (or after a server reboot)
docker compose -f docker-compose.split.yml up -d

# Check that both containers are running
docker compose -f docker-compose.split.yml ps
```

Expected output:

```
NAME             IMAGE                                STATUS
actual-db        alpine:3.22                          Up (healthy)
actual-server    actualbudget/actual-server:latest    Up (healthy)
```

The application is available at **http://\<host\>:5006**.

---

## Verifying the installation

Open **http://\<host\>:5006** in a browser.  You should see the Actual Budget
setup / login screen.

Or check via the HTTP info endpoint:

```bash
curl http://localhost:5006/info
# {"version":"25.x.x","build":"..."}
```

---

## Setting a password

On the first visit to **http://\<host\>:5006** you are prompted to choose a
server password.  This password protects access to all budget files.

### Resetting a forgotten password

```bash
docker exec -it actual_budget node build/src/scripts/reset-password.js
# Follow the prompts to set a new password
```

---

## Health checks

The container runs an automatic health check every 60 seconds:

```bash
node build/src/scripts/health-check.js
```

Query the health status manually:

```bash
docker inspect --format='{{.State.Health.Status}}' actual-server
# healthy  |  unhealthy  |  starting
```

View recent health-check logs:

```bash
docker inspect --format='{{json .State.Health}}' actual-server | jq
```

---

## Viewing logs

```bash
# Follow live logs
docker compose -f docker-compose.split.yml logs -f actual-server

# Last 100 lines
docker compose -f docker-compose.split.yml logs --tail=100 actual-server

# Single-container setup
docker logs -f actual_budget
```

---

## Updating to a new version

```bash
# Pull the latest image
docker compose -f docker-compose.split.yml pull

# Recreate the application container (zero data loss — data is in the volume)
docker compose -f docker-compose.split.yml up -d
```

For the single-container setup:

```bash
docker stop actual_budget
docker rm actual_budget
docker run --pull=always --restart=unless-stopped -d \
  -p 5006:5006 -v /your/data:/data \
  --name actual_budget actualbudget/actual-server:latest
```

---

## Backing up the database

### Two-container setup (recommended)

The `actual-db` container owns the volume, making it easy to copy data out:

```bash
docker run --rm \
  --volumes-from actual-db \
  -v "$(pwd)/backup:/backup" \
  alpine:3.22 \
  sh -c "cp -r /data /backup/actual-data-$(date +%Y%m%d-%H%M%S)"
```

This creates a timestamped copy of the entire `/data` directory on the host.

### Single-container setup

```bash
docker run --rm \
  --volumes-from actual_budget \
  -v "$(pwd)/backup:/backup" \
  alpine:3.22 \
  sh -c "cp -r /data /backup/actual-data-$(date +%Y%m%d-%H%M%S)"
```

### Automating backups

Add a cron job on the host:

```bash
# /etc/cron.d/actual-backup
0 3 * * * root docker run --rm --volumes-from actual-db \
  -v /backups:/backup alpine:3.22 \
  sh -c "cp -r /data /backup/actual-data-$(date +\%Y\%m\%d-\%H\%M\%S)"
```

---

## Stopping the stack

```bash
# Stop but preserve containers and volumes
docker compose -f docker-compose.split.yml stop

# Stop and remove containers (volumes are preserved)
docker compose -f docker-compose.split.yml down

# Stop and remove containers AND volumes (⚠️ deletes all data)
docker compose -f docker-compose.split.yml down -v
```

---

## Running behind a reverse proxy

Ensure the proxy:

1. Forwards the `Host` header.
2. Does **not** strip `Connection: upgrade` (needed for WebSocket sync).
3. Sets appropriate upload size limits (default server limit is 20 MB).

### Nginx example

```nginx
server {
    listen 443 ssl;
    server_name actual.example.com;

    ssl_certificate     /etc/letsencrypt/live/actual.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/actual.example.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5006;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Caddy example (auto HTTPS)

```
actual.example.com {
    reverse_proxy localhost:5006
}
```

---

## Environment variable quick reference

| Variable | Default | Description |
|---|---|---|
| `ACTUAL_PORT` | `5006` | Port to listen on |
| `ACTUAL_DATA_DIR` | `/data` | Data directory for SQLite files |
| `ACTUAL_HTTPS_KEY` | — | TLS private key path |
| `ACTUAL_HTTPS_CERT` | — | TLS certificate path |
| `ACTUAL_UPLOAD_FILE_SIZE_LIMIT_MB` | `20` | Max upload size (MB) |
| `ACTUAL_LOGIN_METHOD` | `password` | Auth: `password`, `header`, or `openid` |
| `ACTUAL_TRUSTED_PROXIES` | — | Comma-separated trusted proxy IPs |

Full reference: <https://actualbudget.org/docs/config/>

---

## Managed hosting alternatives

If you prefer not to self-host:

| Provider | Notes |
|---|---|
| [PikaPods](https://www.pikapods.com/pods?run=actual) | One-click setup, ~$1.40/month |
| [Fly.io](https://actualbudget.org/docs/install/fly) | ~$1.50/month, detailed guide available |

---

← [Wiki Home](./Home.md)
