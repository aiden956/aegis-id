import type { User } from "../types/iam";
import { apiRequest } from "./client";

type AuthResponse = {
  user: User;
};

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
  const response = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return response.user;
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
