import type { Request, Response } from "express";
import { describe, expect, test, vi } from "vitest";
import { rateLimit } from "./rateLimit.js";

function fakeRes() {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      res.headers[name] = value;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json: vi.fn(),
  };
  return res;
}

describe("rateLimit", () => {
  test("allows max requests per window, then answers 429 with Retry-After until it resets", () => {
    let time = 0;
    const limit = rateLimit({ windowMs: 60_000, max: 2, key: () => "alice", now: () => time });
    const call = () => {
      const res = fakeRes();
      const next = vi.fn();
      limit({} as Request, res as unknown as Response, next);
      return { res, next };
    };

    expect(call().next).toHaveBeenCalled();
    expect(call().next).toHaveBeenCalled();

    time = 15_000;
    const blocked = call();
    expect(blocked.next).not.toHaveBeenCalled();
    expect(blocked.res.statusCode).toBe(429);
    expect(blocked.res.headers["Retry-After"]).toBe("45");

    time = 60_000; // window over
    expect(call().next).toHaveBeenCalled();
  });

  test("counts each key separately", () => {
    let who = "alice";
    const limit = rateLimit({ windowMs: 60_000, max: 1, key: () => who, now: () => 0 });
    const next = vi.fn();

    limit({} as Request, fakeRes() as unknown as Response, next);
    who = "bob";
    limit({} as Request, fakeRes() as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(2);
  });
});
