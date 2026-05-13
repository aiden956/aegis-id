import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { prisma } from "../../prisma.js";
import { writeAuditLog } from "../audit/audit.service.js";
import { updateUserRoleSchema } from "./users.schemas.js";

export const usersRoutes = Router();

usersRoutes.get("/admin/users", requireAuth, requireRole(Role.ADMIN), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        provider: true,
        isTwoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

usersRoutes.patch(
  "/admin/users/:userId/role",
  requireAuth,
  requireRole(Role.ADMIN),
  async (req, res, next) => {
    const userIdParam = req.params.userId;
    if (!userIdParam || Array.isArray(userIdParam)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const parsed = updateUserRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid role payload",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: userIdParam },
        select: { id: true, role: true, email: true, name: true },
      });

      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: parsed.data.role },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isTwoFactorEnabled: true,
          provider: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await writeAuditLog({
        actorId: req.authUser!.id,
        targetUserId: existingUser.id,
        eventType: "ROLE_CHANGED",
        success: true,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        details: `${existingUser.role} -> ${updatedUser.role}`,
      });

      return res.json({ user: updatedUser });
    } catch (error) {
      return next(error);
    }
  },
);
