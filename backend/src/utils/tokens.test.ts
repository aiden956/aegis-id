import { beforeAll, describe, expect, it } from "vitest";

let createAccessToken: typeof import("./tokens.js").createAccessToken;
let verifyAccessToken: typeof import("./tokens.js").verifyAccessToken;
let hashRefreshToken: typeof import("./tokens.js").hashRefreshToken;

describe("token utils", () => {
  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.PORT = "4000";
    process.env.CLIENT_ORIGIN = "http://localhost:5173";
    process.env.DATABASE_URL = "postgresql://aegisid:aegisid_password@localhost:5432/aegisid_db";
    process.env.JWT_ACCESS_SECRET = "test-jwt-access-secret-12345";
    process.env.ACCESS_TOKEN_TTL = "15m";
    process.env.REFRESH_TOKEN_TTL_DAYS = "7";
    process.env.GOOGLE_CLIENT_ID = "";
    process.env.GOOGLE_CLIENT_SECRET = "";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:4000/api/auth/google/callback";
    process.env.GITHUB_CLIENT_ID = "";
    process.env.GITHUB_CLIENT_SECRET = "";
    process.env.GITHUB_REDIRECT_URI = "http://localhost:4000/api/auth/github/callback";
    process.env.TOTP_SECRET_ENCRYPTION_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    process.env.TOTP_ISSUER = "AegisID";

    const tokenUtils = await import("./tokens.js");
    createAccessToken = tokenUtils.createAccessToken;
    verifyAccessToken = tokenUtils.verifyAccessToken;
    hashRefreshToken = tokenUtils.hashRefreshToken;
  });

  it("issues and verifies access token payload", () => {
    const token = createAccessToken({
      sub: "user_1",
      email: "user@aegisid.test",
      role: "USER",
    });
    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe("user_1");
    expect(payload.email).toBe("user@aegisid.test");
    expect(payload.role).toBe("USER");
  });

  it("creates deterministic refresh token hashes", () => {
    const token = "raw-refresh-token-value";
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });
});
