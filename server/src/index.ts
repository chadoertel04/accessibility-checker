import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { config } from "./config.js";
import { applySchema, closePool, pool } from "./db.js";
import { moderationRouter } from "./moderation/routes.js";
import { reviewsRouter } from "./reviews/routes.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", config.trustProxy);
app.use(
  cors({
    origin: config.allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 600,
  }),
);
app.use(express.json({ limit: "16kb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

app.use("/api", reviewsRouter);
app.use("/api", moderationRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Express identifies error handlers by arity, so `next` must stay declared.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Client errors: ValidationError and body-parser errors (e.g. malformed JSON) carry a 4xx status.
  const status = (error as { status?: unknown } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ error: (error as Error).message });
    return;
  }

  console.error("[api] Unhandled error:", error);
  res.status(500).json({ error: "Internal server error" });
});

async function start(): Promise<void> {
  await applySchema();

  const server = app.listen(config.port, () => {
    console.log(`[api] Review service listening on http://localhost:${config.port}`);
  });

  const shutdown = () => {
    server.close(() => {
      void closePool().finally(() => process.exit(0));
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error: unknown) => {
  console.error("[api] Failed to start review service:", error);
  process.exit(1);
});
