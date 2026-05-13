import { Router, type Response } from "express";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/types";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../prisma.js";
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
  beginTwoFactorSetup,
  createSession,
  createGitHubAuthorizationUrl,
  createGoogleAuthorizationUrl,
  createOAuthState,
  disableTwoFactor,
  enableTwoFactor,
  loginLocalUser,
  loginWithOAuthProvider,
  refreshSession,
  registerLocalUser,
  revokeRefreshToken,
  verifyTwoFactorLogin,
} from "./auth.service.js";
import {
  createWebAuthnAuthenticationOptions,
  createWebAuthnRegistrationOptions,
  verifyWebAuthnAuthentication,
  verifyWebAuthnRegistration,
} from "./webauthn.service.js";

export const authRoutes = Router();

const oauthStateCookieName = "oauth_state";
const twoFactorChallengeCookieName = "two_factor_challenge";
const webauthnRegistrationChallengeCookieName = "webauthn_registration_challenge";
const webauthnAuthenticationChallengeCookieName = "webauthn_authentication_challenge";

const cookieBaseConfig = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
};

const redirectToLoginWithError = (error: string) =>
  `${env.CLIENT_ORIGIN}/login?error=${encodeURIComponent(error)}`;

const setTwoFactorChallengeCookie = (res: Response, token: string) => {
  res.cookie(twoFactorChallengeCookieName, token, {
    ...cookieBaseConfig,
    maxAge: 5 * 60 * 1000,
  });
};

const clearTwoFactorChallengeCookie = (res: Response) => {
  res.clearCookie(twoFactorChallengeCookieName, cookieBaseConfig);
};

const setWebAuthnRegistrationChallengeCookie = (res: Response, value: string) => {
  res.cookie(webauthnRegistrationChallengeCookieName, value, {
    ...cookieBaseConfig,
    maxAge: 10 * 60 * 1000,
  });
};

const clearWebAuthnRegistrationChallengeCookie = (res: Response) => {
  res.clearCookie(webauthnRegistrationChallengeCookieName, cookieBaseConfig);
};

const setWebAuthnAuthenticationChallengeCookie = (res: Response, value: string) => {
  res.cookie(webauthnAuthenticationChallengeCookieName, value, {
    ...cookieBaseConfig,
    maxAge: 10 * 60 * 1000,
  });
};

const clearWebAuthnAuthenticationChallengeCookie = (res: Response) => {
  res.clearCookie(webauthnAuthenticationChallengeCookieName, cookieBaseConfig);
};

const getCallbackCode = (value: unknown) => {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  return value;
};

const getCallbackState = (value: unknown) => {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  return value;
};

const getTwoFactorCode = (value: unknown) => {
  if (typeof value !== "string" || value.trim().length < 6) {
    return null;
  }
  return value.trim();
};

const getEmailInput = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed.length === 0 ? undefined : trimmed;
};

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
    clearTwoFactorChallengeCookie(res);
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
    if (result.twoFactorRequired) {
      clearAuthCookies(res);
      setTwoFactorChallengeCookie(res, result.challengeToken);
      return res.status(202).json({ twoFactorRequired: true, user: result.user });
    }

    clearTwoFactorChallengeCookie(res);
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
      details: error instanceof Error ? error.message : "Invalid credentials",
    });

    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    return next(error);
  }
});

authRoutes.post("/auth/2fa/verify-login", async (req, res, next) => {
  const challengeToken = req.cookies[twoFactorChallengeCookieName] as string | undefined;
  const code = getTwoFactorCode(req.body?.code);
  if (!challengeToken || !code) {
    return res.status(400).json({ message: "Missing 2FA challenge or code" });
  }

  try {
    const result = await verifyTwoFactorLogin(challengeToken, code);
    clearTwoFactorChallengeCookie(res);
    setAccessCookie(res, result.accessToken);
    setRefreshCookie(res, result.refreshToken);

    await writeAuditLog({
      actorId: result.user.id,
      targetUserId: result.user.id,
      eventType: "TOTP_LOGIN_SUCCESS",
      success: true,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.json({ user: result.user });
  } catch (error) {
    await writeAuditLog({
      eventType: "TOTP_LOGIN_FAILED",
      success: false,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: error instanceof Error ? error.message : "2FA verification failed",
    });

    if (
      error instanceof Error &&
      (error.message === "INVALID_2FA_CODE" || error.message === "INVALID_2FA_CHALLENGE")
    ) {
      return res.status(401).json({ message: "Invalid authenticator code" });
    }

    return next(error);
  }
});

authRoutes.post("/auth/2fa/setup", requireAuth, async (req, res, next) => {
  try {
    const result = await beginTwoFactorSetup(req.authUser!.id, req.authUser!.email);
    await writeAuditLog({
      actorId: req.authUser!.id,
      targetUserId: req.authUser!.id,
      eventType: "TOTP_SETUP_STARTED",
      success: true,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

authRoutes.post("/auth/2fa/enable", requireAuth, async (req, res, next) => {
  const code = getTwoFactorCode(req.body?.code);
  if (!code) {
    return res.status(400).json({ message: "Invalid authenticator code" });
  }

  try {
    const user = await enableTwoFactor(req.authUser!.id, code);
    await writeAuditLog({
      actorId: user.id,
      targetUserId: user.id,
      eventType: "TOTP_ENABLED",
      success: true,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.json({ user: { ...user, hasPasskey: true } });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "INVALID_2FA_CODE" || error.message === "TOTP_SETUP_REQUIRED")
    ) {
      return res.status(400).json({ message: "Invalid authenticator code" });
    }
    return next(error);
  }
});

authRoutes.post("/auth/2fa/disable", requireAuth, async (req, res, next) => {
  const code = getTwoFactorCode(req.body?.code);
  if (!code) {
    return res.status(400).json({ message: "Invalid authenticator code" });
  }

  try {
    const user = await disableTwoFactor(req.authUser!.id, code);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await writeAuditLog({
      actorId: user.id,
      targetUserId: user.id,
      eventType: "TOTP_DISABLED",
      success: true,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.json({ user });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "INVALID_2FA_CODE" || error.message === "TOTP_NOT_ENABLED")
    ) {
      return res.status(400).json({ message: "Invalid authenticator code" });
    }
    return next(error);
  }
});

authRoutes.post("/auth/webauthn/register/options", requireAuth, async (req, res, next) => {
  try {
    const result = await createWebAuthnRegistrationOptions(
      req.authUser!.id,
      req.authUser!.email,
    );
    setWebAuthnRegistrationChallengeCookie(res, result.challengeState);
    await writeAuditLog({
      actorId: req.authUser!.id,
      targetUserId: req.authUser!.id,
      eventType: "WEBAUTHN_REGISTER_STARTED",
      success: true,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.json({ options: result.options });
  } catch (error) {
    return next(error);
  }
});

authRoutes.post("/auth/webauthn/register/verify", requireAuth, async (req, res, next) => {
  const challengeState = req.cookies[webauthnRegistrationChallengeCookieName] as
    | string
    | undefined;
  if (!challengeState || typeof req.body?.response !== "object") {
    return res.status(400).json({ message: "Missing passkey registration challenge" });
  }

  try {
    const result = await verifyWebAuthnRegistration(
      req.body.response as RegistrationResponseJSON,
      challengeState,
    );
    if (result.userId !== req.authUser!.id) {
      return res.status(400).json({ message: "Passkey registration user mismatch" });
    }
    clearWebAuthnRegistrationChallengeCookie(res);
    await writeAuditLog({
      actorId: req.authUser!.id,
      targetUserId: req.authUser!.id,
      eventType: "WEBAUTHN_REGISTER_SUCCESS",
      success: true,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    return res.status(204).send();
  } catch (error) {
    await writeAuditLog({
      actorId: req.authUser!.id,
      targetUserId: req.authUser!.id,
      eventType: "WEBAUTHN_REGISTER_FAILED",
      success: false,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: error instanceof Error ? error.message : "Unknown passkey registration error",
    });
    return next(error);
  }
});

authRoutes.post("/auth/webauthn/login/options", async (req, res, next) => {
  try {
    const email = getEmailInput(req.body?.email);
    const result = await createWebAuthnAuthenticationOptions(email);
    setWebAuthnAuthenticationChallengeCookie(res, result.challengeState);
    return res.json({ options: result.options });
  } catch (error) {
    if (error instanceof Error && error.message === "WEBAUTHN_ACCOUNT_NOT_READY") {
      return res.status(404).json({ message: "No passkey registered for this account" });
    }
    return next(error);
  }
});

authRoutes.post("/auth/webauthn/login/verify", async (req, res, next) => {
  const challengeState = req.cookies[webauthnAuthenticationChallengeCookieName] as
    | string
    | undefined;
  if (!challengeState || typeof req.body?.response !== "object") {
    return res.status(400).json({ message: "Missing passkey login challenge" });
  }

  try {
    const user = await verifyWebAuthnAuthentication(
      req.body.response as AuthenticationResponseJSON,
      challengeState,
    );
    clearWebAuthnAuthenticationChallengeCookie(res);
    clearTwoFactorChallengeCookie(res);
    const loginResult = await createSession({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    setAccessCookie(res, loginResult.accessToken);
    setRefreshCookie(res, loginResult.refreshToken);

    await writeAuditLog({
      actorId: user.id,
      targetUserId: user.id,
      eventType: "WEBAUTHN_LOGIN_SUCCESS",
      success: true,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    return res.json({ user });
  } catch (error) {
    await writeAuditLog({
      eventType: "WEBAUTHN_LOGIN_FAILED",
      success: false,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: error instanceof Error ? error.message : "Unknown passkey login error",
    });

    if (error instanceof Error && error.message === "WEBAUTHN_LOGIN_FAILED") {
      return res.status(401).json({ message: "Passkey verification failed" });
    }

    return next(error);
  }
});

authRoutes.get("/auth/google", async (_req, res) => {
  try {
    const state = createOAuthState();
    res.cookie(oauthStateCookieName, `google:${state}`, cookieBaseConfig);
    return res.redirect(createGoogleAuthorizationUrl(state));
  } catch {
    return res.redirect(redirectToLoginWithError("oauth_not_configured"));
  }
});

authRoutes.get("/auth/google/callback", async (req, res, next) => {
  const state = getCallbackState(req.query.state);
  const code = getCallbackCode(req.query.code);
  const cookieState = req.cookies[oauthStateCookieName] as string | undefined;
  res.clearCookie(oauthStateCookieName, cookieBaseConfig);

  if (!state || !code || cookieState !== `google:${state}`) {
    return res.redirect(redirectToLoginWithError("oauth_invalid_state"));
  }

  try {
    const result = await loginWithOAuthProvider("google", code);
    if (result.twoFactorRequired) {
      clearAuthCookies(res);
      setTwoFactorChallengeCookie(res, result.challengeToken);
      return res.redirect(`${env.CLIENT_ORIGIN}/verify-2fa`);
    }

    clearTwoFactorChallengeCookie(res);
    setAccessCookie(res, result.accessToken);
    setRefreshCookie(res, result.refreshToken);

    await writeAuditLog({
      actorId: result.user.id,
      targetUserId: result.user.id,
      eventType: "OAUTH_LOGIN_SUCCESS",
      success: true,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: "google",
    });

    const destination = result.user.role === "ADMIN" ? "/admin" : "/dashboard";
    return res.redirect(`${env.CLIENT_ORIGIN}${destination}`);
  } catch (error) {
    await writeAuditLog({
      eventType: "OAUTH_LOGIN_FAILED",
      success: false,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: error instanceof Error ? error.message : "google callback failed",
    });

    if (error instanceof Error && error.message === "OAUTH_EMAIL_ALREADY_USED") {
      return res.redirect(redirectToLoginWithError("oauth_conflict"));
    }

    if (error instanceof Error && error.message === "GOOGLE_OAUTH_NOT_CONFIGURED") {
      return res.redirect(redirectToLoginWithError("oauth_not_configured"));
    }

    return next(error);
  }
});

authRoutes.get("/auth/github", async (_req, res) => {
  try {
    const state = createOAuthState();
    res.cookie(oauthStateCookieName, `github:${state}`, cookieBaseConfig);
    return res.redirect(createGitHubAuthorizationUrl(state));
  } catch {
    return res.redirect(redirectToLoginWithError("oauth_not_configured"));
  }
});

authRoutes.get("/auth/github/callback", async (req, res, next) => {
  const state = getCallbackState(req.query.state);
  const code = getCallbackCode(req.query.code);
  const cookieState = req.cookies[oauthStateCookieName] as string | undefined;
  res.clearCookie(oauthStateCookieName, cookieBaseConfig);

  if (!state || !code || cookieState !== `github:${state}`) {
    return res.redirect(redirectToLoginWithError("oauth_invalid_state"));
  }

  try {
    const result = await loginWithOAuthProvider("github", code);
    if (result.twoFactorRequired) {
      clearAuthCookies(res);
      setTwoFactorChallengeCookie(res, result.challengeToken);
      return res.redirect(`${env.CLIENT_ORIGIN}/verify-2fa`);
    }

    clearTwoFactorChallengeCookie(res);
    setAccessCookie(res, result.accessToken);
    setRefreshCookie(res, result.refreshToken);

    await writeAuditLog({
      actorId: result.user.id,
      targetUserId: result.user.id,
      eventType: "OAUTH_LOGIN_SUCCESS",
      success: true,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: "github",
    });

    const destination = result.user.role === "ADMIN" ? "/admin" : "/dashboard";
    return res.redirect(`${env.CLIENT_ORIGIN}${destination}`);
  } catch (error) {
    await writeAuditLog({
      eventType: "OAUTH_LOGIN_FAILED",
      success: false,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      details: error instanceof Error ? error.message : "github callback failed",
    });

    if (error instanceof Error && error.message === "OAUTH_EMAIL_ALREADY_USED") {
      return res.redirect(redirectToLoginWithError("oauth_conflict"));
    }

    if (error instanceof Error && error.message === "GITHUB_OAUTH_NOT_CONFIGURED") {
      return res.redirect(redirectToLoginWithError("oauth_not_configured"));
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
    clearTwoFactorChallengeCookie(res);
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
    clearTwoFactorChallengeCookie(res);

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
        provider: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            webAuthnCredentials: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { _count, ...publicUser } = user;
    return res.json({ user: { ...publicUser, hasPasskey: _count.webAuthnCredentials > 0 } });
  } catch (error) {
    return next(error);
  }
});
