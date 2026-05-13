import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

let app: typeof import("./app.js").app;

describe("app health endpoint", () => {
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

    ({ app } = await import("./app.js"));
  });

  it("returns healthy status", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });
});
