import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  getDropdownNotifications,
  getUnreadCount,
  dismissNotification,
  getUserNotifications,
} from '@/services/notification.service';

const prisma = new PrismaClient();

describe('notification service', () => {
  let userAId: string;
  let userBId: string;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const users = await prisma.user.findMany({ take: 2, orderBy: { createdAt: 'asc' } });
    if (users.length < 2) throw new Error('Seed data requires at least 2 users');
    userAId = users[0].id;
    userBId = users[1].id;

    const rows = await Promise.all([
      prisma.notification.create({
        data: {
          userId: userAId,
          type: 'TEST',
          title: 'تنبيه أ للمستخدم أ',
          message: 'رسالة اختبار',
          status: 'Unread',
        },
      }),
      prisma.notification.create({
        data: {
          userId: userAId,
          type: 'TEST',
          title: 'تنبيه ب للمستخدم أ',
          message: 'رسالة اختبار',
          status: 'Read',
          isRead: true,
        },
      }),
      prisma.notification.create({
        data: {
          userId: userBId,
          type: 'TEST',
          title: 'تنبيه للمستخدم ب',
          message: 'رسالة اختبار',
          status: 'Unread',
        },
      }),
    ]);
    createdIds.push(...rows.map((r) => r.id));
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { id: { in: createdIds } } });
    await prisma.$disconnect();
  });

  it('returns only current user unread notifications in dropdown', async () => {
    const dropdown = await getDropdownNotifications(userAId);
    const ids = dropdown.map((n) => n.id);

    expect(ids).toContain(createdIds[0]);
    expect(ids).not.toContain(createdIds[1]);
    expect(ids).not.toContain(createdIds[2]);
    expect(dropdown.every((n) => n.status === 'Unread')).toBe(true);
  });

  it('counts unread notifications per user only', async () => {
    const countA = await getUnreadCount(userAId);
    const countB = await getUnreadCount(userBId);
    const dropdownB = await getDropdownNotifications(userBId);

    expect(countA).toBeGreaterThanOrEqual(1);
    expect(countB).toBeGreaterThanOrEqual(1);
    expect(dropdownB.some((n) => n.id === createdIds[2])).toBe(true);
    expect(dropdownB.some((n) => n.id === createdIds[0])).toBe(false);
  });

  it('removes dismissed notification from dropdown results', async () => {
    await dismissNotification(createdIds[0], userAId);

    const dropdown = await getDropdownNotifications(userAId);
    expect(dropdown.some((n) => n.id === createdIds[0])).toBe(false);

    const all = await getUserNotifications(userAId);
    const dismissed = all.find((n) => n.id === createdIds[0]);
    expect(dismissed?.status).toBe('Read');
    expect(dismissed?.isRead).toBe(true);
  });
});
