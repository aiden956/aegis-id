import crypto from "node:crypto";
import { Role, type Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../prisma.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import {
  createAccessToken,
  createRefreshToken,
  createTwoFactorChallengeToken,
  hashRefreshToken,
  refreshExpiryDate,
  verifyTwoFactorChallengeToken,
} from "../../utils/tokens.js";
import {
  createOtpAuthUrl,
  createQrCodeDataUrl,
  createTotpSecret,
  decryptTwoFactorSecret,
  encryptTwoFactorSecret,
  verifyTotpCode,
} from "./twofactor.service.js";

const userPublicSelect = {
  id: true,
  email: true,
  role: true,
  name: true,
  isTwoFactorEnabled: true,
  provider: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type ProviderName = "google" | "github";
export type TwoFactorVerifyMethod = "totp" | "recovery";
export type RecoveryCodeRegenerationInput = {
  password?: string;
  secondFactorMethod: TwoFactorVerifyMethod;
  secondFactorCode: string;
};

type SessionUser = {
  id: string;
  email: string;
  role: Role;
};

export type AuthLoginResult =
  | {
      twoFactorRequired: false;
      user: Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;
      accessToken: string;
      refreshToken: string;
    }
  | {
      twoFactorRequired: true;
      user: Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;
      challengeToken: string;
    };

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const normalizeRecoveryCode = (code: string) =>
  code.toUpperCase().replace(/[^A-Z0-9]/g, "");

const hashRecoveryCode = (code: string) =>
  crypto.createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");

const createRecoveryCodeValue = () => {
  const chars = Array.from({ length: 12 }, () =>
    RECOVERY_CODE_ALPHABET[crypto.randomInt(RECOVERY_CODE_ALPHABET.length)],
  );
  const raw = chars.join("");
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
};

const createRecoveryCodes = async (userId: string, count = RECOVERY_CODE_COUNT) => {
  const plaintextCodes = Array.from({ length: count }, createRecoveryCodeValue);
  const rows = plaintextCodes.map((code) => ({
    userId,
    codeHash: hashRecoveryCode(code),
  }));

  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({
      where: { userId },
    }),
    prisma.recoveryCode.createMany({
      data: rows,
    }),
  ]);

  return plaintextCodes;
};

const verifyUserTotpCode = async (userId: string, code: string) => {
  const twoFactorSecret = await prisma.twoFactorSecret.findUnique({
    where: { userId },
    select: { secretEncrypted: true },
  });
  if (!twoFactorSecret) {
    throw new Error("MISSING_2FA_SECRET");
  }

  const secret = decryptTwoFactorSecret(twoFactorSecret.secretEncrypted);
  const normalizedCode = code.replace(/\s+/g, "");
  if (!verifyTotpCode(secret, normalizedCode)) {
    throw new Error("INVALID_2FA_CODE");
  }
};

const consumeRecoveryCode = async (userId: string, code: string) => {
  const recoveryCodes = await prisma.recoveryCode.findMany({
    where: {
      userId,
      usedAt: null,
    },
    select: {
      id: true,
      codeHash: true,
    },
  });

  const attemptedHash = hashRecoveryCode(code);
  const matchedCode = recoveryCodes.find((item) => item.codeHash === attemptedHash);
  if (!matchedCode) {
    throw new Error("INVALID_RECOVERY_CODE");
  }

  await prisma.recoveryCode.update({
    where: { id: matchedCode.id },
    data: { usedAt: new Date() },
  });
};

export const verifyRecoveryCodeSecondFactor = async (
  userId: string,
  method: TwoFactorVerifyMethod,
  code: string,
) => {
  if (method === "totp") {
    await verifyUserTotpCode(userId, code);
    return;
  }

  await consumeRecoveryCode(userId, code);
};

export const getRecoveryCodeStatus = async (userId: string) => {
  const [total, remaining] = await Promise.all([
    prisma.recoveryCode.count({
      where: { userId },
    }),
    prisma.recoveryCode.count({
      where: {
        userId,
        usedAt: null,
      },
    }),
  ]);

  return {
    total,
    remaining,
  };
};

export const createSession = async (user: SessionUser) => {
  const accessToken = createAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = createRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: refreshExpiryDate(),
    },
  });

  return { accessToken, refreshToken };
};

const toChallengeResult = (
  user: Prisma.UserGetPayload<{ select: typeof userPublicSelect }>,
) => ({
  twoFactorRequired: true as const,
  user,
  challengeToken: createTwoFactorChallengeToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  }),
});

const toSessionResult = async (
  user: Prisma.UserGetPayload<{ select: typeof userPublicSelect }>,
) => {
  const session = await createSession({
    id: user.id,
    email: user.email,
    role: user.role,
  });
  return {
    twoFactorRequired: false as const,
    user,
    ...session,
  };
};

const hasConfiguredTwoFactorSecret = async (userId: string) => {
  const record = await prisma.twoFactorSecret.findUnique({
    where: { userId },
    select: { id: true },
  });
  return Boolean(record);
};

const finalizeLogin = async (
  user: Prisma.UserGetPayload<{ select: typeof userPublicSelect }>,
): Promise<AuthLoginResult> => {
  if (!user.isTwoFactorEnabled) {
    return toSessionResult(user);
  }

  const hasSecret = await hasConfiguredTwoFactorSecret(user.id);
  if (!hasSecret) {
    // Self-heal legacy records created before TOTP secrets were introduced.
    const repairedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isTwoFactorEnabled: false },
      select: userPublicSelect,
    });
    return toSessionResult(repairedUser);
  }

  return toChallengeResult(user);
};

export const registerLocalUser = async (input: {
  name: string;
  email: string;
  password: string;
}) => {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: Role.USER,
      provider: "local",
    },
    select: userPublicSelect,
  });

  const session = await createSession({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return { user, ...session };
};

export const loginLocalUser = async (input: {
  email: string;
  password: string;
}) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      ...userPublicSelect,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isValidPassword = await verifyPassword(user.passwordHash, input.password);
  if (!isValidPassword) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const { passwordHash: _, ...publicUser } = user;
  return finalizeLogin(publicUser);
};

export const verifyTwoFactorLogin = async (
  challengeToken: string,
  code: string,
  method: TwoFactorVerifyMethod,
) => {
  const payload = verifyTwoFactorChallengeToken(challengeToken);

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: userPublicSelect,
  });
  if (!user || !user.isTwoFactorEnabled) {
    throw new Error("INVALID_2FA_CHALLENGE");
  }

  await verifyRecoveryCodeSecondFactor(user.id, method, code);

  const session = await createSession({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user,
    ...session,
  };
};

export const getTwoFactorChallengeUser = async (challengeToken: string) => {
  const payload = verifyTwoFactorChallengeToken(challengeToken);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: userPublicSelect,
  });

  if (!user || !user.isTwoFactorEnabled) {
    throw new Error("INVALID_2FA_CHALLENGE");
  }

  return user;
};

export const refreshSession = async (rawRefreshToken: string) => {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const refreshTokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: userPublicSelect,
      },
    },
  });

  if (!refreshTokenRecord || refreshTokenRecord.revokedAt) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  if (refreshTokenRecord.expiresAt < new Date()) {
    throw new Error("EXPIRED_REFRESH_TOKEN");
  }

  await prisma.refreshToken.update({
    where: { id: refreshTokenRecord.id },
    data: { revokedAt: new Date() },
  });

  const session = await createSession({
    id: refreshTokenRecord.user.id,
    email: refreshTokenRecord.user.email,
    role: refreshTokenRecord.user.role,
  });

  return {
    user: refreshTokenRecord.user,
    ...session,
  };
};

export const revokeRefreshToken = async (rawRefreshToken?: string) => {
  if (!rawRefreshToken) {
    return;
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

const randomState = () => crypto.randomBytes(24).toString("hex");

export const createOAuthState = () => randomState();

const resolveGoogleConfig = () => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  }
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  };
};

const resolveGitHubConfig = () => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw new Error("GITHUB_OAUTH_NOT_CONFIGURED");
  }
  return {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
    redirectUri: env.GITHUB_REDIRECT_URI,
  };
};

export const createGoogleAuthorizationUrl = (state: string) => {
  const config = resolveGoogleConfig();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  return url.toString();
};

export const createGitHubAuthorizationUrl = (state: string) => {
  const config = resolveGitHubConfig();
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);
  return url.toString();
};

const assertResponseOk = async (response: Response) => {
  if (response.ok) {
    return;
  }
  const body = await response.text();
  throw new Error(`OAUTH_HTTP_${response.status}:${body.slice(0, 120)}`);
};

const getGoogleIdentity = async (code: string) => {
  const config = resolveGoogleConfig();

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  await assertResponseOk(tokenResponse);
  const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenPayload.access_token) {
    throw new Error("GOOGLE_ACCESS_TOKEN_MISSING");
  }

  const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
  });
  await assertResponseOk(userResponse);

  const profile = (await userResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (!profile.sub || !profile.email || !profile.email_verified) {
    throw new Error("GOOGLE_PROFILE_INCOMPLETE");
  }

  return {
    providerId: profile.sub,
    email: profile.email.toLowerCase(),
    name: profile.name ?? profile.email,
  };
};

const getGitHubIdentity = async (code: string) => {
  const config = resolveGitHubConfig();

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }),
  });
  await assertResponseOk(tokenResponse);

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenPayload.access_token) {
    throw new Error("GITHUB_ACCESS_TOKEN_MISSING");
  }

  const profileResponse = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenPayload.access_token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  await assertResponseOk(profileResponse);
  const profile = (await profileResponse.json()) as {
    id?: number;
    login?: string;
    name?: string | null;
  };

  const emailsResponse = await fetch("https://api.github.com/user/emails", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenPayload.access_token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  await assertResponseOk(emailsResponse);
  const emails = (await emailsResponse.json()) as Array<{
    email: string;
    primary: boolean;
    verified: boolean;
  }>;

  const email = emails.find((item) => item.primary && item.verified)?.email;
  if (!profile.id || !email) {
    throw new Error("GITHUB_PROFILE_INCOMPLETE");
  }

  return {
    providerId: String(profile.id),
    email: email.toLowerCase(),
    name: profile.name ?? profile.login ?? email,
  };
};

export const getOAuthIdentity = async (provider: ProviderName, code: string) =>
  provider === "google" ? getGoogleIdentity(code) : getGitHubIdentity(code);

export const loginWithOAuthProvider = async (
  provider: ProviderName,
  code: string,
) => {
  const identity = await getOAuthIdentity(provider, code);

  const existingByProvider = await prisma.user.findFirst({
    where: {
      provider,
      providerId: identity.providerId,
    },
    select: userPublicSelect,
  });

  let user = existingByProvider;
  if (!user) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email: identity.email },
      select: { id: true },
    });

    if (existingByEmail) {
      throw new Error("OAUTH_EMAIL_ALREADY_USED");
    }

    user = await prisma.user.create({
      data: {
        email: identity.email,
        name: identity.name,
        role: Role.USER,
        provider,
        providerId: identity.providerId,
      },
      select: userPublicSelect,
    });
  }

  return finalizeLogin(user);
};

export const beginTwoFactorSetup = async (userId: string, email: string) => {
  const secret = createTotpSecret();
  const secretEncrypted = encryptTwoFactorSecret(secret);

  await prisma.twoFactorSecret.upsert({
    where: { userId },
    create: { userId, secretEncrypted },
    update: { secretEncrypted },
  });

  const otpAuthUrl = createOtpAuthUrl(email, secret);
  const qrCodeDataUrl = await createQrCodeDataUrl(otpAuthUrl);

  return {
    manualEntryKey: secret,
    qrCodeDataUrl,
  };
};

export const enableTwoFactor = async (userId: string, code: string) => {
  const record = await prisma.twoFactorSecret.findUnique({
    where: { userId },
    select: { secretEncrypted: true },
  });
  if (!record) {
    throw new Error("TOTP_SETUP_REQUIRED");
  }

  const secret = decryptTwoFactorSecret(record.secretEncrypted);
  const normalizedCode = code.replace(/\s+/g, "");
  if (!verifyTotpCode(secret, normalizedCode)) {
    throw new Error("INVALID_2FA_CODE");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isTwoFactorEnabled: true },
    select: userPublicSelect,
  });

  const recoveryCodes = await createRecoveryCodes(user.id);
  return { user, recoveryCodes };
};

export const regenerateRecoveryCodes = async (
  userId: string,
  input?: RecoveryCodeRegenerationInput,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      isTwoFactorEnabled: true,
      passwordHash: true,
    },
  });
  if (!user || !user.isTwoFactorEnabled) {
    throw new Error("TOTP_NOT_ENABLED");
  }

  if (input) {
    if (!user.passwordHash) {
      throw new Error("OAUTH_REAUTH_REQUIRED");
    }

    if (!input.password) {
      throw new Error("PASSWORD_REQUIRED");
    }
    const validPassword = await verifyPassword(user.passwordHash, input.password);
    if (!validPassword) {
      throw new Error("INVALID_PASSWORD");
    }

    await verifyRecoveryCodeSecondFactor(
      userId,
      input.secondFactorMethod,
      input.secondFactorCode,
    );
  }

  const recoveryCodes = await createRecoveryCodes(userId);
  return recoveryCodes;
};

export const getUserOAuthProvider = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      provider: true,
      providerId: true,
      isTwoFactorEnabled: true,
    },
  });

  if (
    !user ||
    !user.isTwoFactorEnabled ||
    (user.provider !== "google" && user.provider !== "github") ||
    !user.providerId
  ) {
    throw new Error("OAUTH_REAUTH_NOT_AVAILABLE");
  }

  return {
    provider: user.provider as ProviderName,
    providerId: user.providerId,
  };
};

export const verifyOAuthReauthentication = async (
  userId: string,
  provider: ProviderName,
  code: string,
) => {
  const [user, identity] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        provider: true,
        providerId: true,
      },
    }),
    getOAuthIdentity(provider, code),
  ]);

  if (!user || user.provider !== provider || user.providerId !== identity.providerId) {
    throw new Error("OAUTH_REAUTH_MISMATCH");
  }
};

export const disableTwoFactor = async (userId: string, code: string) => {
  const record = await prisma.twoFactorSecret.findUnique({
    where: { userId },
    select: { secretEncrypted: true },
  });
  if (!record) {
    throw new Error("TOTP_NOT_ENABLED");
  }

  const secret = decryptTwoFactorSecret(record.secretEncrypted);
  const normalizedCode = code.replace(/\s+/g, "");
  if (!verifyTotpCode(secret, normalizedCode)) {
    throw new Error("INVALID_2FA_CODE");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { isTwoFactorEnabled: false },
    }),
    prisma.twoFactorSecret.delete({
      where: { userId },
    }),
    prisma.recoveryCode.deleteMany({
      where: { userId },
    }),
  ]);

  return prisma.user.findUnique({
    where: { id: userId },
    select: userPublicSelect,
  });
};
