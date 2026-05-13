import crypto from "node:crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { env } from "../../config/env.js";

const encryptionKey = Buffer.from(env.TOTP_SECRET_ENCRYPTION_KEY, "base64");
if (encryptionKey.length !== 32) {
  throw new Error("TOTP_SECRET_ENCRYPTION_KEY must decode to 32 bytes");
}

export const createTotpSecret = () => generateSecret();

export const createOtpAuthUrl = (email: string, secret: string) =>
  generateURI({
    strategy: "totp",
    label: email,
    issuer: env.TOTP_ISSUER,
    secret,
    period: 30,
    digits: 6,
  });

export const createQrCodeDataUrl = async (otpAuthUrl: string) =>
  QRCode.toDataURL(otpAuthUrl, { margin: 1, width: 220 });

export const verifyTotpCode = (secret: string, code: string) =>
  verifySync({
    strategy: "totp",
    secret,
    token: code,
    period: 30,
    digits: 6,
    epochTolerance: 30,
  }).valid;

export const encryptTwoFactorSecret = (secret: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
};

export const decryptTwoFactorSecret = (payload: string) => {
  const [ivBase64, tagBase64, encryptedBase64] = payload.split(":");
  if (!ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error("INVALID_ENCRYPTED_2FA_SECRET");
  }

  const iv = Buffer.from(ivBase64, "base64");
  const tag = Buffer.from(tagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
};
