import { prisma } from "../../prisma.js";

type WriteAuditLogInput = {
  actorId?: string;
  targetUserId?: string;
  eventType: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
};

export const writeAuditLog = async (input: WriteAuditLogInput) =>
  prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      targetUserId: input.targetUserId,
      eventType: input.eventType,
      success: input.success,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: input.details,
    },
  });
