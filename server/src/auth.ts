import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { config } from "./config.js";

export interface AuthenticatedUser {
  /** Keycloak subject claim. */
  id: string;
  name: string | null;
  /** Keycloak realm roles, e.g. "moderator". */
  roles: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const jwks = createRemoteJWKSet(new URL(config.keycloak.jwksUri));

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

async function verifyToken(token: string): Promise<AuthenticatedUser> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: config.keycloak.issuer,
  });

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    throw new Error("Token is missing a subject claim");
  }

  // Shown publicly next to comments, so never use preferred_username: it is often an email.
  const name = typeof payload.given_name === "string" ? payload.given_name : null;

  return { id: payload.sub, name, roles: readRealmRoles(payload) };
}

/** Realm roles from a Keycloak token's `realm_access.roles`; anything malformed means no roles. */
export function readRealmRoles(payload: Record<string, unknown>): string[] {
  const access = payload.realm_access;
  if (!access || typeof access !== "object") return [];
  const roles = (access as { roles?: unknown }).roles;
  return Array.isArray(roles) ? roles.filter((role): role is string => typeof role === "string") : [];
}

/** Rejects with 403 unless the signed-in user has `role`. Use after requireAuth. */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.roles.includes(role)) {
      res.status(403).json({ error: "You do not have permission to do this" });
      return;
    }
    next();
  };
}

/** Populates `req.user` when a valid token is present; never rejects. */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = readBearerToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    req.user = await verifyToken(token);
  } catch {
    // Anonymous access is allowed for reads, so an unusable token is ignored.
  }

  next();
}

/** Rejects the request with 401 unless a valid Keycloak token is supplied. */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    req.user = await verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
