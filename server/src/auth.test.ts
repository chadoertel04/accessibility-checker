import type { Request, Response } from "express";
import { describe, expect, test, vi } from "vitest";
import { readRealmRoles, requireRole } from "./auth.js";

describe("readRealmRoles", () => {
  test("reads Keycloak realm roles and ignores malformed claims", () => {
    expect(readRealmRoles({ realm_access: { roles: ["moderator", 7, "user"] } })).toEqual([
      "moderator",
      "user",
    ]);
    expect(readRealmRoles({})).toEqual([]);
    expect(readRealmRoles({ realm_access: "moderator" })).toEqual([]);
    expect(readRealmRoles({ realm_access: { roles: "moderator" } })).toEqual([]);
  });
});

describe("requireRole", () => {
  const run = (roles: string[] | undefined) => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    const req = { user: roles ? { id: "u1", name: null, roles } : undefined } as Request;
    requireRole("moderator")(req, res as unknown as Response, next);
    return { res, next };
  };

  test("lets moderators through", () => {
    expect(run(["moderator"]).next).toHaveBeenCalled();
  });

  test("answers 403 without the role or without a user", () => {
    for (const roles of [["user"], undefined]) {
      const { res, next } = run(roles);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    }
  });
});
