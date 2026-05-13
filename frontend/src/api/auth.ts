import type { User } from "../types/iam";
import { apiRequest } from "./client";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";

type AuthResponse = {
  user: User;
};

type LoginResponse =
  | { user: User; twoFactorRequired?: false }
  | { user: User; twoFactorRequired: true };

export const getCurrentUser = async () => {
  const response = await apiRequest<AuthResponse>("/auth/me");
  return response.user;
};

export const refreshSession = async () => {
  const response = await apiRequest<AuthResponse>("/auth/refresh", {
    method: "POST",
  });
  return response.user;
};

export const login = async (email: string, password: string) => {
  const response = await apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return response;
};

export const register = async (name: string, email: string, password: string) => {
  const response = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  return response.user;
};

export const logout = async () => {
  await apiRequest<void>("/auth/logout", {
    method: "POST",
  });
};

export const startOAuthLogin = (provider: "google" | "github") => {
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000/api";
  window.location.assign(`${apiBase}/auth/${provider}`);
};

export const verifyTwoFactorLogin = async (code: string) => {
  const response = await apiRequest<AuthResponse>("/auth/2fa/verify-login", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return response.user;
};

export const beginTwoFactorSetup = async () => {
  return apiRequest<{ qrCodeDataUrl: string; manualEntryKey: string }>("/auth/2fa/setup", {
    method: "POST",
  });
};

export const enableTwoFactor = async (code: string) => {
  const response = await apiRequest<AuthResponse>("/auth/2fa/enable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return response.user;
};

export const disableTwoFactor = async (code: string) => {
  const response = await apiRequest<AuthResponse>("/auth/2fa/disable", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return response.user;
};

export const getWebAuthnRegistrationOptions = async () => {
  const response = await apiRequest<{
    options: PublicKeyCredentialCreationOptionsJSON;
  }>("/auth/webauthn/register/options", {
    method: "POST",
  });
  return response.options;
};

export const verifyWebAuthnRegistration = async (response: RegistrationResponseJSON) => {
  await apiRequest<void>("/auth/webauthn/register/verify", {
    method: "POST",
    body: JSON.stringify({ response }),
  });
};

export const getWebAuthnLoginOptions = async (email?: string) => {
  const response = await apiRequest<{
    options: PublicKeyCredentialRequestOptionsJSON;
  }>("/auth/webauthn/login/options", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return response.options;
};

export const verifyWebAuthnLogin = async (responseBody: AuthenticationResponseJSON) => {
  const response = await apiRequest<AuthResponse>("/auth/webauthn/login/verify", {
    method: "POST",
    body: JSON.stringify({ response: responseBody }),
  });
  return response.user;
};
