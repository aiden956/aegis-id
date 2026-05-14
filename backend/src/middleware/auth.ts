import type { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../prisma.js";
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
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.authUser.id },
      select: { role: true },
    });

    if (!user || user.role !== role) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    req.authUser.role = user.role;
    return next();
  };
};
