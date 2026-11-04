import "dotenv/config";

function readEnv(name: string, fallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${name}`);
}

function buildDatabaseUrl(): string {
  const explicit = process.env.DATABASE_URL?.trim();
  if (explicit) return explicit;

  const user = encodeURIComponent(readEnv("POSTGRES_USER", "postgres"));
  const password = encodeURIComponent(readEnv("POSTGRES_PASSWORD", "postgres"));
  const host = readEnv("POSTGRES_HOST", "localhost");
  const port = readEnv("POSTGRES_PORT", "5432");
  const database = readEnv("POSTGRES_DB", "accessibility_db");

  return `postgres://${user}:${password}@${host}:${port}/${database}`;
}

const keycloakUrl = readEnv("KEYCLOAK_URL", "http://localhost:8080").replace(/\/+$/, "");
const keycloakRealm = readEnv("KEYCLOAK_REALM", "accessibility-app");

export const config = {
  port: Number.parseInt(readEnv("API_PORT", "3001"), 10),
  databaseUrl: buildDatabaseUrl(),
  allowedOrigins: readEnv("API_ALLOWED_ORIGINS", "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  keycloak: {
    issuer: `${keycloakUrl}/realms/${keycloakRealm}`,
    jwksUri: `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/certs`,
  },
  limits: {
    commentMaxLength: 1000,
    placeIdMaxLength: 512,
  },
} as const;
