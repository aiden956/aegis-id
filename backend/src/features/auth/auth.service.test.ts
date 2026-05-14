import crypto from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  recoveryCode: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  twoFactorSecret: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(async (operations: Array<Promise<unknown>>) =>
    Promise.all(operations),
  ),
}));

const passwordMock = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
}));

const twoFactorMock = vi.hoisted(() => ({
  decryptTwoFactorSecret: vi.fn((value: string) => value),
  verifyTotpCode: vi.fn(),
}));

vi.mock("../../prisma.js", () => ({
  prisma: prismaMock,
}));

vi.mock("../../utils/password.js", () => ({
  hashPassword: vi.fn(),
  verifyPassword: passwordMock.verifyPassword,
}));

vi.mock("./twofactor.service.js", () => ({
  createOtpAuthUrl: vi.fn(),
  createQrCodeDataUrl: vi.fn(),
  createTotpSecret: vi.fn(),
  decryptTwoFactorSecret: twoFactorMock.decryptTwoFactorSecret,
  encryptTwoFactorSecret: vi.fn(),
  verifyTotpCode: twoFactorMock.verifyTotpCode,
}));

const hashRecoveryCode = (code: string) =>
  crypto
    .createHash("sha256")
    .update(code.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .digest("hex");

describe("recovery code regeneration", () => {
  let regenerateRecoveryCodes: typeof import("./auth.service.js").regenerateRecoveryCodes;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.PORT = "4000";
    process.env.CLIENT_ORIGIN = "http://localhost:5173";
    process.env.DATABASE_URL =
      "postgresql://aegisid:aegisid_password@localhost:5432/aegisid_db";
    process.env.JWT_ACCESS_SECRET = "test-jwt-access-secret-12345";
    process.env.ACCESS_TOKEN_TTL = "15m";
    process.env.REFRESH_TOKEN_TTL_DAYS = "7";
    process.env.TOTP_SECRET_ENCRYPTION_KEY =
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    process.env.TOTP_ISSUER = "AegisID";

    ({ regenerateRecoveryCodes } = await import("./auth.service.js"));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.recoveryCode.deleteMany.mockResolvedValue({ count: 10 });
    prismaMock.recoveryCode.createMany.mockResolvedValue({ count: 10 });
  });

  it("requires a password for local password accounts", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: Role.USER,
      isTwoFactorEnabled: true,
      passwordHash: "hash",
    });

    await expect(
      regenerateRecoveryCodes("user-1", {
        secondFactorMethod: "totp",
        secondFactorCode: "123456",
      }),
    ).rejects.toThrow("PASSWORD_REQUIRED");

    expect(prismaMock.recoveryCode.createMany).not.toHaveBeenCalled();
  });

  it("rejects invalid passwords before checking the second factor", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: Role.USER,
      isTwoFactorEnabled: true,
      passwordHash: "hash",
    });
    passwordMock.verifyPassword.mockResolvedValue(false);

    await expect(
      regenerateRecoveryCodes("user-1", {
        password: "wrong-password",
        secondFactorMethod: "totp",
        secondFactorCode: "123456",
      }),
    ).rejects.toThrow("INVALID_PASSWORD");

    expect(prismaMock.twoFactorSecret.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.recoveryCode.createMany).not.toHaveBeenCalled();
  });

  it("requires OAuth re-authentication when the account has no password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: Role.USER,
      isTwoFactorEnabled: true,
      passwordHash: null,
    });

    await expect(
      regenerateRecoveryCodes("user-1", {
        secondFactorMethod: "totp",
        secondFactorCode: "123456",
      }),
    ).rejects.toThrow("OAUTH_REAUTH_REQUIRED");

    expect(prismaMock.recoveryCode.createMany).not.toHaveBeenCalled();
  });

  it("generates ten new codes after password and authenticator verification", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: Role.USER,
      isTwoFactorEnabled: true,
      passwordHash: "hash",
    });
    passwordMock.verifyPassword.mockResolvedValue(true);
    prismaMock.twoFactorSecret.findUnique.mockResolvedValue({
      secretEncrypted: "secret",
    });
    twoFactorMock.verifyTotpCode.mockReturnValue(true);

    const codes = await regenerateRecoveryCodes("user-1", {
      password: "correct-password",
      secondFactorMethod: "totp",
      secondFactorCode: "123456",
    });

    expect(codes).toHaveLength(10);
    expect(prismaMock.recoveryCode.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(prismaMock.recoveryCode.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ userId: "user-1", codeHash: expect.any(String) }),
      ]),
    });
  });

  it("accepts and consumes a valid recovery code before creating the new set", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: Role.USER,
      isTwoFactorEnabled: true,
      passwordHash: "hash",
    });
    passwordMock.verifyPassword.mockResolvedValue(true);
    prismaMock.recoveryCode.findMany.mockResolvedValue([
      {
        id: "recovery-1",
        codeHash: hashRecoveryCode("ABCD-1234-EFGH"),
      },
    ]);
    prismaMock.recoveryCode.update.mockResolvedValue({});

    const codes = await regenerateRecoveryCodes("user-1", {
      password: "correct-password",
      secondFactorMethod: "recovery",
      secondFactorCode: "ABCD-1234-EFGH",
    });

    expect(codes).toHaveLength(10);
    expect(prismaMock.recoveryCode.update).toHaveBeenCalledWith({
      where: { id: "recovery-1" },
      data: { usedAt: expect.any(Date) },
    });
    expect(prismaMock.recoveryCode.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });
});
