import type { NextFunction, Request, Response } from "express";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  /** Who is counted: a user ID or client IP. */
  key: (req: Request) => string;
  /** Injectable clock for tests. */
  now?: () => number;
}

const PRUNE_ABOVE = 10_000;

/**
 * Fixed-window request limit. Over the limit it answers 429 with Retry-After.
 * shortcut: per-process memory, correct for the single API container; move to
 * Postgres or Redis if the API ever runs more than one instance.
 */
export function rateLimit({ windowMs, max, key, now = Date.now }: RateLimitOptions) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const time = now();

    if (windows.size > PRUNE_ABOVE) {
      for (const [k, w] of windows) if (w.resetAt <= time) windows.delete(k);
    }

    const id = key(req);
    let window = windows.get(id);
    if (!window || window.resetAt <= time) {
      window = { count: 0, resetAt: time + windowMs };
      windows.set(id, window);
    }

    window.count += 1;
    if (window.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((window.resetAt - time) / 1000)));
      res.status(429).json({ error: "Too many requests. Please wait and try again." });
      return;
    }

    next();
  };
}

/** Counts signed-in users by ID and everyone else by IP. */
export const userOrIp = (req: Request): string => req.user?.id ?? `ip:${req.ip ?? "unknown"}`;
