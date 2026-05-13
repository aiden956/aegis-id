import { Role } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  refreshExpiryDate,
} from "../../utils/tokens.js";

type SessionUser = {
  id: string;
  email: string;
  role: Role;
};

const createSession = async (user: SessionUser) => {
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
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      isTwoFactorEnabled: true,
    },
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
      id: true,
      email: true,
      role: true,
      name: true,
      passwordHash: true,
      isTwoFactorEnabled: true,
    },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isValidPassword = await verifyPassword(user.passwordHash, input.password);
  if (!isValidPassword) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const session = await createSession({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
    },
    ...session,
  };
};

export const refreshSession = async (rawRefreshToken: string) => {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const refreshTokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
          isTwoFactorEnabled: true,
        },
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
