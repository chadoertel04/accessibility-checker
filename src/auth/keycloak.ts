import Keycloak from "keycloak-js";
import type { KeycloakInitOptions } from "keycloak-js";

function getRequiredEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const keycloak = new Keycloak({
  url: getRequiredEnv("VITE_KEYCLOAK_URL"),
  realm: getRequiredEnv("VITE_KEYCLOAK_REALM"),
  clientId: getRequiredEnv("VITE_KEYCLOAK_CLIENT_ID"),
});

let initPromise: Promise<boolean> | null = null;

export function initializeKeycloak(options: KeycloakInitOptions): Promise<boolean> {
  if (!initPromise) {
    initPromise = keycloak.init(options);
  }

  return initPromise;
}
