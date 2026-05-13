import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialDescriptorJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { env } from "../../config/env.js";
import { prisma } from "../../prisma.js";

type RegistrationChallengeState = {
  challenge: string;
  userId: string;
};

type AuthenticationChallengeState = {
  challenge: string;
};

const parseRegistrationState = (rawState: string): RegistrationChallengeState => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawState);
  } catch {
    throw new Error("INVALID_WEBAUTHN_CHALLENGE");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("INVALID_WEBAUTHN_CHALLENGE");
  }

  const challenge = (parsed as { challenge?: unknown }).challenge;
  const userId = (parsed as { userId?: unknown }).userId;
  if (typeof challenge !== "string" || typeof userId !== "string") {
    throw new Error("INVALID_WEBAUTHN_CHALLENGE");
  }

  return { challenge, userId };
};

const parseAuthenticationState = (rawState: string): AuthenticationChallengeState => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawState);
  } catch {
    throw new Error("INVALID_WEBAUTHN_CHALLENGE");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("INVALID_WEBAUTHN_CHALLENGE");
  }

  const challenge = (parsed as { challenge?: unknown }).challenge;
  if (typeof challenge !== "string") {
    throw new Error("INVALID_WEBAUTHN_CHALLENGE");
  }

  return { challenge };
};

const parseTransports = (response: RegistrationResponseJSON) => {
  const transports = response.response?.transports;
  if (!transports || transports.length === 0) {
    return null;
  }
  return JSON.stringify(transports);
};

const parseStoredTransports = (transports?: string | null) => {
  if (!transports) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(transports);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed as AuthenticatorTransportFuture[];
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const resolveDeviceName = (response: RegistrationResponseJSON) =>
  response.response?.transports?.join(", ") ?? null;

const assertVerified = (
  verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>,
) => {
  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("WEBAUTHN_REGISTRATION_FAILED");
  }
  return verification.registrationInfo;
};

const getCredentialIdFromAuthentication = (response: AuthenticationResponseJSON) => {
  if (typeof response.id !== "string" || response.id.length === 0) {
    throw new Error("WEBAUTHN_CREDENTIAL_MISSING");
  }
  return response.id;
};

export const createWebAuthnRegistrationOptions = async (userId: string, email: string) => {
  const existingCredentials = await prisma.webAuthnCredential.findMany({
    where: { userId },
    select: { credentialId: true },
  });

  const excludeCredentials = existingCredentials.map(
    (credential) => ({
      id: credential.credentialId,
      type: "public-key",
    }),
  );

  const options = await generateRegistrationOptions({
    rpName: env.WEBAUTHN_RP_NAME,
    rpID: env.WEBAUTHN_RP_ID,
    userName: email,
    userDisplayName: email,
    userID: new TextEncoder().encode(userId),
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials,
  });

  return {
    options,
    challengeState: JSON.stringify({
      challenge: options.challenge,
      userId,
    }),
  };
};

export const verifyWebAuthnRegistration = async (
  response: RegistrationResponseJSON,
  challengeStateRaw: string,
) => {
  const challengeState = parseRegistrationState(challengeStateRaw);

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challengeState.challenge,
    expectedOrigin: env.WEBAUTHN_ORIGIN,
    expectedRPID: env.WEBAUTHN_RP_ID,
    requireUserVerification: false,
  });

  const registration = assertVerified(verification);
  const credentialId = registration.credential.id;

  const existing = await prisma.webAuthnCredential.findUnique({
    where: { credentialId },
    select: { id: true },
  });
  if (existing) {
    return { userId: challengeState.userId };
  }

  await prisma.webAuthnCredential.create({
    data: {
      userId: challengeState.userId,
      credentialId,
      publicKey: isoBase64URL.fromBuffer(registration.credential.publicKey),
      counter: registration.credential.counter,
      transports: parseTransports(response),
      deviceName: resolveDeviceName(response),
    },
  });

  return { userId: challengeState.userId };
};

export const createWebAuthnAuthenticationOptions = async (email?: string) => {
  let allowCredentials: PublicKeyCredentialDescriptorJSON[] | undefined;
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        webAuthnCredentials: {
          select: { credentialId: true, transports: true },
        },
      },
    });

    if (!user || user.webAuthnCredentials.length === 0) {
      throw new Error("WEBAUTHN_ACCOUNT_NOT_READY");
    }

    allowCredentials = user.webAuthnCredentials.map((credential) => ({
      id: credential.credentialId,
      type: "public-key",
      transports: parseStoredTransports(credential.transports),
    }));
  }

  const options = await generateAuthenticationOptions({
    rpID: env.WEBAUTHN_RP_ID,
    userVerification: "preferred",
    allowCredentials,
  });

  return {
    options,
    challengeState: JSON.stringify({
      challenge: options.challenge,
    }),
  };
};

const verifyAuthentication = async (
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
) => {
  const credentialId = getCredentialIdFromAuthentication(response);
  const storedCredential = await prisma.webAuthnCredential.findUnique({
    where: { credentialId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          isTwoFactorEnabled: true,
          provider: true,
          createdAt: true,
          updatedAt: true,
          name: true,
        },
      },
    },
  });

  if (!storedCredential) {
    throw new Error("WEBAUTHN_CREDENTIAL_NOT_FOUND");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: env.WEBAUTHN_ORIGIN,
    expectedRPID: env.WEBAUTHN_RP_ID,
    credential: {
      id: storedCredential.credentialId,
      publicKey: isoBase64URL.toBuffer(storedCredential.publicKey),
      counter: storedCredential.counter,
      transports: parseStoredTransports(storedCredential.transports),
    },
    requireUserVerification: false,
  });

  if (!verification.verified) {
    return {
      user: storedCredential.user,
      credentialDbId: storedCredential.id,
      verification,
    };
  }

  await prisma.webAuthnCredential.update({
    where: { id: storedCredential.id },
    data: { counter: verification.authenticationInfo.newCounter },
  });

  return {
    user: storedCredential.user,
    credentialDbId: storedCredential.id,
    verification,
  };
};

export const verifyWebAuthnAuthentication = async (
  response: AuthenticationResponseJSON,
  challengeStateRaw: string,
) => {
  const challengeState = parseAuthenticationState(challengeStateRaw);
  const result = await verifyAuthentication(response, challengeState.challenge);
  if (!result.verification.verified) {
    throw new Error("WEBAUTHN_LOGIN_FAILED");
  }

  return result.user;
};
