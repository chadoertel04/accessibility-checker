# ACCESSIBILITY APP

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
