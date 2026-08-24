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

The database is automatically initialized on first run with the following tables:

- **venues**: Stores venue/location data
- **accessibility_data**: Accessibility information with source attribution
- **user_reports**: User-submitted accessibility corrections
- **opening_hours**: Venue opening hours
- **saved_places**: User's bookmarked places
- **search_history**: Search analytics

See [docker/init-db/01-init-schema.sql](docker/init-db/01-init-schema.sql) for the full schema.

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

The app now initializes Keycloak on startup and protects routes behind login.

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

4. Open the app at http://localhost:5173. Unauthenticated users are redirected to Keycloak.

5. After login, Keycloak redirects back to the app and authenticated routes are available.

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

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from "eslint-plugin-react";

export default tseslint.config({
  // Set the react version
  settings: { react: { version: "18.3" } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs["jsx-runtime"].rules,
  },
});
```
