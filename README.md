# AccessMap

Web application for providing detailed information on accessibility options at
different locations using the Google Maps API.

Author: Chad Oertel

## Prerequisites

- Node ^20
- Docker & Docker Compose (for PostgreSQL database)

## Quick Start

- `npm install`
- `npm run dev`

## Environment variables

```
cp .env.example .env
```
- `VITE_GOOGLE_API_KEY`: Google developer console api key.
- `VITE_KEYCLOAK_URL`: Keycloak base URL (for example http://localhost:8080).
- `VITE_KEYCLOAK_REALM`: Realm used by this app.
- `VITE_KEYCLOAK_CLIENT_ID`: OIDC client ID created in the realm.

## PostgreSQL Database

The project uses PostgreSQL for data persistence. A Docker Compose setup is provided for easy local development.

### Starting the Database

```bash
# Start PostgreSQL container (runs in background)
docker compose up -d

# View logs
docker compose logs -f postgres

# Stop the container
docker compose down

# Stop and remove all data (fresh start)
docker compose down -v
```

### Database Configuration

The following environment variables can be set (defaults shown):

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `postgres` | Database user |
| `POSTGRES_PASSWORD` | `postgres` | Database password |
| `POSTGRES_DB` | `accessibility_db` | Database name |
| `POSTGRES_PORT` | `5432` | Host port mapping |

To customize, create a `.env` file or set environment variables before running `docker compose up`:

```bash
POSTGRES_PASSWORD=mysecretpassword docker compose up -d
```

### Database Schema

The scripts in [init-db/](init-db/) run on the container's first start. They create the
`keycloak` database and the `accessibility_reviews` table (one like/dislike plus an optional
note per user, venue and accessibility category). The review API re-applies
[01-create-accessibility-reviews.sql](init-db/01-create-accessibility-reviews.sql) on boot,
so existing volumes pick up schema changes.

## Review API

Community reviews are served by a small Express API in [server/](server/). It verifies
Keycloak tokens and stores reviews in PostgreSQL.

```bash
docker compose up -d     # PostgreSQL + Keycloak
npm run server:dev       # API on http://localhost:3001 (Vite proxies /api to it)
npm run dev              # frontend
npm test                 # frontend + server tests
```

Its settings (`API_PORT`, `API_ALLOWED_ORIGINS`, `DATABASE_URL`, `KEYCLOAK_URL`,
`KEYCLOAK_REALM`) are listed in [.env.example](.env.example). Production builds hide
reviews unless `VITE_REVIEWS_API_URL` points at a deployed API.

## Deployment

Pushes to `main` deploy to GitHub Pages ([deploy.yml](.github/workflows/deploy.yml)). Set these
repository variables first, or the app will not start: `VITE_KEYCLOAK_URL` (a publicly reachable
Keycloak, see below), `VITE_KEYCLOAK_REALM` and `VITE_KEYCLOAK_CLIENT_ID`. Optionally set
`VITE_REVIEWS_API_URL`.

### Deploying Keycloak

Production Keycloak runs on a Linux VPS from [deploy/keycloak/](deploy/keycloak/): Keycloak in
production mode, its own PostgreSQL, and Caddy in front for automatic HTTPS. The realm and the
`accessibility-checker` client (public client, PKCE, redirect URIs for the Pages site) are created
from [realm/accessibility-app.json](deploy/keycloak/realm/accessibility-app.json) on first start, and
anyone can register an account. [deploy-keycloak.yml](.github/workflows/deploy-keycloak.yml)
deploys it on pushes to `main` that touch `deploy/keycloak/`, or by hand from the Actions tab.

One-time setup:

1. **Server:** any VPS with 2 GB RAM or more, Docker Engine with the Compose plugin, and ports 80 and
   443 open. Create a deploy user in the `docker` group and add a public SSH key to its
   `~/.ssh/authorized_keys`.
2. **DNS:** point an A (and AAAA) record such as `auth.example.com` at the server. Caddy
   gets the HTTPS certificate on first start, so DNS must resolve before the first deploy.
3. **GitHub environment:** under Settings → Environments, create an environment named `keycloak`
   and add:

   | Kind | Name | Value |
   |------|------|-------|
   | Variable | `KEYCLOAK_SSH_HOST` | Server IP or hostname |
   | Variable | `KEYCLOAK_SSH_USER` | Deploy user |
   | Variable | `KEYCLOAK_DOMAIN` | `auth.example.com` |
   | Variable | `APP_URL` | `https://chadoertel04.github.io/accessibility-checker` |
   | Variable | `APP_ORIGIN` | `https://chadoertel04.github.io` |
   | Secret | `KEYCLOAK_SSH_KEY` | Private key matching the server's authorized key |
   | Secret | `KEYCLOAK_SSH_KNOWN_HOSTS` | Output of `ssh-keyscan <server>` |
   | Secret | `KEYCLOAK_DB_PASSWORD` | `openssl rand -hex 32` |
   | Secret | `KEYCLOAK_ADMIN_PASSWORD` | `openssl rand -hex 32` |

4. Run **Deploy Keycloak** from the Actions tab. It finishes by fetching
   `https://<KEYCLOAK_DOMAIN>/realms/accessibility-app/.well-known/openid-configuration`.
5. Set the repository variables for the frontend build: `VITE_KEYCLOAK_URL=https://auth.example.com`,
   `VITE_KEYCLOAK_REALM=accessibility-app`, `VITE_KEYCLOAK_CLIENT_ID=accessibility-checker`. Then
   re-run **Deploy to GitHub Pages**. The review API (when deployed) needs `KEYCLOAK_URL` set to
   the same address.
6. Sign in at `https://auth.example.com/admin` as `admin` and change the password. The bootstrap
   password is only used on the first start.

Notes:

- The realm file is imported only when the realm does not exist yet. Later changes, for example a
  new redirect URI, must be made in the admin console or by deleting the realm before a redeploy.
- `KEYCLOAK_DB_PASSWORD` is fixed when the database volume is first created. Changing the secret
  later needs a matching `ALTER USER keycloak PASSWORD '...'` inside the Postgres container.
- Back up the `postgres_data` volume. It holds every user account.

### Connecting to the Database

```bash
# Using psql via Docker
docker compose exec postgres psql -U postgres -d accessibility_db

# Using external client
# Host: localhost
# Port: 5432 (or POSTGRES_PORT)
# Database: accessibility_db
# User: postgres
# Password: postgres
```

## Keycloak Authentication

The project uses [Keycloak](https://www.keycloak.org/) for authentication and identity management. Keycloak runs in development mode alongside PostgreSQL.

### Starting Keycloak

```bash
# Start all services (PostgreSQL + Keycloak)
docker compose up -d

# Start only Keycloak (requires PostgreSQL to be running)
docker compose up -d keycloak

# View Keycloak logs
docker compose logs -f keycloak

# Stop all services
docker compose down
```

### Keycloak Admin Console

Once running, access the Keycloak Admin Console at:
- **URL**: http://localhost:8080/admin
- **Username**: `admin` (or `KEYCLOAK_ADMIN`)
- **Password**: `admin` (or `KEYCLOAK_ADMIN_PASSWORD`)

### Keycloak Configuration

The following environment variables can be set (defaults shown):

| Variable | Default | Description |
|----------|---------|-------------|
| `KEYCLOAK_ADMIN` | `admin` | Admin username |
| `KEYCLOAK_ADMIN_PASSWORD` | `admin` | Admin password |
| `KEYCLOAK_DB` | `keycloak` | Keycloak database name |
| `KEYCLOAK_PORT` | `8080` | Keycloak HTTP port |
| `KEYCLOAK_HEALTH_PORT` | `9000` | Health/metrics port |

### Setting Up a Realm and Client

1. Log in to the [Admin Console](http://localhost:8080/admin)
2. Click **Manage realms** → **Create realm**
3. Enter realm name (e.g., `accessibility-app`) and click **Create**
4. Click **Clients** → **Create client**
5. Set:
   - Client type: `OpenID Connect`
   - Client ID: `accessibility-checker`
6. Click **Next**, enable **Standard flow**, click **Next**
7. Set:
   - Valid redirect URIs: `http://localhost:5173/*` (Vite dev server)
  - Valid post logout redirect URIs: `http://localhost:5173/*`
   - Web origins: `http://localhost:5173`
8. Click **Save**

### App Authentication Wiring

The app initializes Keycloak on startup. Browsing the map needs no login; the Account page and voting on reviews do.

1. Copy environment variables and set your realm/client values:

```bash
cp .env.example .env
```

2. Ensure the following values in `.env` match your Keycloak setup:

```env
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=accessibility-app
VITE_KEYCLOAK_CLIENT_ID=accessibility-checker
```

3. Start backend services and the frontend:

```bash
docker compose up -d
npm run dev
```

4. Open the app at http://localhost:5173. Opening the Account page or voting on a review sends you to Keycloak to sign in.

5. After login, Keycloak redirects back to the app.

### Health & Metrics

- **Health check**: http://localhost:9000/health
- **Readiness**: http://localhost:9000/health/ready
- **Liveness**: http://localhost:9000/health/live
- **Metrics**: http://localhost:9000/metrics

### Production Considerations

The current setup runs Keycloak in **development mode** (`start-dev`). For production:

- Use `start` instead of `start-dev`
- Configure SSL/TLS certificates
- Use strong admin passwords
- Set proper hostname configuration
- Consider using an optimized container image

See the [Keycloak Server Guide](https://www.keycloak.org/guides#server) for production configuration.
