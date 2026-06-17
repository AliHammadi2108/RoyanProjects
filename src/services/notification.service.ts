import { prisma } from '@/lib/db';
import { NOTIFICATION_TYPES, DOCUMENT_ROUTES } from '@/lib/constants';
import { isAdmin } from '@/lib/permissions';

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  documentType?: string;
  documentId?: string;
  approvalId?: string;
  priority?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const actionUrl =
    input.documentType && input.documentId
      ? `${DOCUMENT_ROUTES[input.documentType] || '/purchases/tracking'}/${input.documentId}`
      : input.approvalId
        ? '/approvals/inbox'
        : '/notifications';

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
      type: input.type,
      title: input.title,
      message: input.message,
      documentType: input.documentType,
      documentId: input.documentId,
      approvalId: input.approvalId,
      actionUrl,
      priority: input.priority || 'Normal',
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

export async function getUnreadCount(userId: string) {
  const admin = await isAdmin(userId);

  return prisma.notification.count({
    where: {
      ...(admin ? {} : { userId }),
      status: 'Unread',
    },
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  const admin = await isAdmin(userId);

  return prisma.notification.updateMany({
    where: { id: notificationId, ...(admin ? {} : { userId }) },
    data: { status: 'Read', readAt: new Date() },
  });
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
    data: { status: 'Read', readAt: new Date() },
  });
}
