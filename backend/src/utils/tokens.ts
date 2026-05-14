import crypto from "node:crypto";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { Response } from "express";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";

type AccessTokenPayload = {
  sub: string;
  role: Role;
  email: string;
};

type TwoFactorChallengePayload = {
  sub: string;
  role: Role;
  email: string;
};

type RecoveryOAuthChallengePayload = {
  sub: string;
  provider: "google" | "github";
};

const accessCookieName = "access_token";
const refreshCookieName = "refresh_token";

export const createAccessToken = (payload: AccessTokenPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET as Secret, {
    expiresIn: env.ACCESS_TOKEN_TTL,
  } as SignOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

export const createTwoFactorChallengeToken = (payload: TwoFactorChallengePayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET as Secret, {
    expiresIn: "5m",
  } as SignOptions);

export const verifyTwoFactorChallengeToken = (token: string): TwoFactorChallengePayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as TwoFactorChallengePayload;

export const createRecoveryOAuthChallengeToken = (
  payload: RecoveryOAuthChallengePayload,
) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET as Secret, {
    expiresIn: "5m",
  } as SignOptions);

export const verifyRecoveryOAuthChallengeToken = (
  token: string,
): RecoveryOAuthChallengePayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as RecoveryOAuthChallengePayload;

export const createRefreshToken = () => crypto.randomBytes(48).toString("hex");

export const hashRefreshToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const refreshExpiryDate = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
};

const cookieBaseConfig = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
};

export const setAccessCookie = (res: Response, token: string) => {
  res.cookie(accessCookieName, token, {
    ...cookieBaseConfig,
    maxAge: 15 * 60 * 1000,
  });
};

export const setRefreshCookie = (res: Response, token: string) => {
  res.cookie(refreshCookieName, token, {
    ...cookieBaseConfig,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(accessCookieName, cookieBaseConfig);
  res.clearCookie(refreshCookieName, cookieBaseConfig);
};

export const cookieNames = {
  accessCookieName,
  refreshCookieName,
};
