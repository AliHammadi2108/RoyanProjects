import { prisma } from '@/lib/db';

interface AuditLogInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValues: input.oldValues ? JSON.stringify(input.oldValues) : null,
      newValues: input.newValues ? JSON.stringify(input.newValues) : null,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}

export async function getAuditLogs(entityType: string, entityId: string) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    include: { user: { select: { id: true, nameAr: true, username: true } } },
    orderBy: { createdAt: 'desc' },
  });
}
