import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { env } from "./config/env.js";
import { authRoutes } from "./features/auth/auth.routes.js";
import { usersRoutes } from "./features/users/users.routes.js";
import { auditRoutes } from "./features/audit/audit.routes.js";

export const app = express();

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", app: "AegisID API" });
});

app.use("/api", authRoutes);
app.use("/api", usersRoutes);
app.use("/api", auditRoutes);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});
