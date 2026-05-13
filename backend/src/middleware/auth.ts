import type { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { cookieNames, verifyAccessToken } from "../utils/tokens.js";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const accessToken = req.cookies[cookieNames.accessCookieName];

  if (!accessToken) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const payload = verifyAccessToken(accessToken);
    req.authUser = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
};

export const requireRole = (role: Role) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.authUser.role !== role) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    return next();
  };
};
