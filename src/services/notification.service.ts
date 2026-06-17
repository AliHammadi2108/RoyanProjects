import { prisma } from '@/lib/db';
import { NOTIFICATION_TYPES, DOCUMENT_ROUTES } from '@/lib/constants';
import { isAdmin } from '@/lib/permissions';

interface CreateNotificationInput {
  userId: string;
  roleId?: string;
  type: string;
  title: string;
  message: string;
  documentType?: string;
  documentId?: string;
  relatedModule?: string;
  relatedDocumentType?: string;
  relatedDocumentId?: string;
  route?: string;
  approvalId?: string;
  priority?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const actionUrl =
    input.route ||
    (input.documentType && input.documentId
      ? `${DOCUMENT_ROUTES[input.documentType] || '/purchases/tracking'}/${input.documentId}`
      : input.approvalId
        ? '/approvals/inbox'
        : '/notifications');

  if (input.approvalId) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: input.userId,
        approvalId: input.approvalId,
        type: input.type,
        status: { in: ['Unread', 'Read'] },
      },
    });
    if (existing) return existing;
  }

  return prisma.notification.create({
    data: {
      userId: input.userId,
      roleId: input.roleId,
      type: input.type,
      title: input.title,
      message: input.message,
      documentType: input.documentType || input.relatedDocumentType,
      documentId: input.documentId || input.relatedDocumentId,
      relatedModule: input.relatedModule,
      relatedDocumentType: input.relatedDocumentType || input.documentType,
      relatedDocumentId: input.relatedDocumentId || input.documentId,
      route: input.route || actionUrl,
      approvalId: input.approvalId,
      actionUrl,
      priority: input.priority || 'Normal',
      isRead: false,
      status: 'Unread',
    },
  });
}

export async function notifyApprovers(
  approvalId: string,
  documentType: string,
  documentId: string,
  documentNo: string,
  approverUserIds: string[]
) {
  const title = `طلب اعتماد: ${documentNo}`;
  const message = `يوجد مستند جديد بانتظار اعتمادك - ${documentNo}`;

  for (const userId of approverUserIds) {
    await createNotification({
      userId,
      type: NOTIFICATION_TYPES.APPROVAL_REQUEST,
      title,
      message,
      documentType,
      documentId,
      approvalId,
      priority: 'High',
    });
  }
}

export async function notifyDocumentOwner(
  userId: string,
  type: string,
  title: string,
  message: string,
  documentType: string,
  documentId: string
) {
  await createNotification({
    userId,
    type,
    title,
    message,
    documentType,
    documentId,
  });
}

export async function getUserNotifications(userId: string, filters?: {
  status?: string;
  type?: string;
  limit?: number;
}) {
  const admin = await isAdmin(userId);

  return prisma.notification.findMany({
    where: {
      ...(admin ? {} : { userId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.type && { type: filters.type }),
    },
    include: admin ? { user: { select: { nameAr: true, username: true } } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || (admin ? 100 : 50),
  });
}

/** Unread notifications for the header dropdown — always scoped to the current user. */
export async function getDropdownNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: {
      userId,
      status: 'Unread',
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      status: 'Unread',
    },
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { status: 'Read', isRead: true, readAt: new Date() },
  });
}

/** Dismiss from header/dropdown — marks read so it won't appear again in the bell menu. */
export async function dismissNotification(notificationId: string, userId: string) {
  return markAsRead(notificationId, userId);
}

export async function markAsActioned(notificationId: string, userId: string) {
  const admin = await isAdmin(userId);

  return prisma.notification.updateMany({
    where: { id: notificationId, ...(admin ? {} : { userId }) },
    data: { status: 'Actioned', actionedAt: new Date(), readAt: new Date() },
  });
}

export async function markAllAsRead(userId: string) {
  const admin = await isAdmin(userId);

  return prisma.notification.updateMany({
    where: { status: 'Unread', ...(admin ? {} : { userId }) },
    data: { status: 'Read', isRead: true, readAt: new Date() },
  });
}
