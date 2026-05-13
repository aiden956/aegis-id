import { Router } from "express";
import { prisma } from "../../prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  clearAuthCookies,
  cookieNames,
  hashRefreshToken,
  setAccessCookie,
  setRefreshCookie,
} from "../../utils/tokens.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import {
  loginLocalUser,
  refreshSession,
  registerLocalUser,
  revokeRefreshToken,
} from "./auth.service.js";

export const authRoutes = Router();

authRoutes.post("/auth/register", async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid register payload",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const result = await registerLocalUser(parsed.data);
    setAccessCookie(res, result.accessToken);
    setRefreshCookie(res, result.refreshToken);

    await writeAuditLog({
      actorId: result.user.id,
      targetUserId: result.user.id,
      eventType: "REGISTER_SUCCESS",
      success: true,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(201).json({ user: result.user });
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
      return res.status(409).json({ message: "Email already exists" });
    }
    return next(error);
  }
});

authRoutes.post("/auth/login", async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid login payload",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const result = await loginLocalUser(parsed.data);
    setAccessCookie(res, result.accessToken);
    setRefreshCookie(res, result.refreshToken);

    await writeAuditLog({
      actorId: result.user.id,
      targetUserId: result.user.id,
      eventType: "LOGIN_SUCCESS",
      success: true,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.json({ user: result.user });
  } catch (error) {
    await writeAuditLog({
      eventType: "LOGIN_FAILED",
      success: false,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: "Invalid credentials",
    });

    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    return next(error);
  }
});

authRoutes.post("/auth/refresh", async (req, res, next) => {
  const refreshToken = req.cookies[cookieNames.refreshCookieName];
  if (!refreshToken) {
    return res.status(401).json({ message: "Missing refresh token" });
  }

  try {
    const result = await refreshSession(refreshToken);
    setAccessCookie(res, result.accessToken);
    setRefreshCookie(res, result.refreshToken);

    await writeAuditLog({
      actorId: result.user.id,
      targetUserId: result.user.id,
      eventType: "REFRESH_TOKEN_ROTATED",
      success: true,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.json({ user: result.user });
  } catch (error) {
    clearAuthCookies(res);

    await writeAuditLog({
      eventType: "REFRESH_TOKEN_FAILED",
      success: false,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: error instanceof Error ? error.message : "Unknown refresh error",
    });

    if (error instanceof Error) {
      if (
        error.message === "INVALID_REFRESH_TOKEN" ||
        error.message === "EXPIRED_REFRESH_TOKEN"
      ) {
        return res.status(401).json({ message: "Invalid refresh token" });
      }
    }

    return next(error);
  }
});

authRoutes.post("/auth/logout", async (req, res, next) => {
  const refreshToken = req.cookies[cookieNames.refreshCookieName] as
    | string
    | undefined;

  try {
    let actorId: string | undefined;
    if (refreshToken) {
      const hashedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash: hashRefreshToken(refreshToken) },
        select: { userId: true },
      });
      actorId = hashedToken?.userId;
    }

    await revokeRefreshToken(refreshToken);
    clearAuthCookies(res);

    await writeAuditLog({
      actorId,
      targetUserId: actorId,
      eventType: "LOGOUT",
      success: true,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

authRoutes.get("/auth/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.authUser!.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isTwoFactorEnabled: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});
