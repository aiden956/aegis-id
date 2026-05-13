import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const auditRoutes = Router();

auditRoutes.get(
  "/admin/audit-logs",
  requireAuth,
  requireRole(Role.ADMIN),
  async (_req, res, next) => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      });
      res.json({ logs });
    } catch (error) {
      next(error);
    }
  },
);
