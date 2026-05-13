import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password utils", () => {
  it("hashes and verifies password", async () => {
    const plainPassword = "AegisID-Password-123";
    const hash = await hashPassword(plainPassword);

    expect(hash).not.toBe(plainPassword);
    await expect(verifyPassword(hash, plainPassword)).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong-password")).resolves.toBe(false);
  });
});
