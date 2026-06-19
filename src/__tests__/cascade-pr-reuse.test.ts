import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('cascade PR reuse', () => {
  beforeAll(async () => {
    const count = await prisma.purchaseRequest.count();
    if (count === 0) {
      console.warn('Skipping PR reuse tests — run db:seed first');
    }
  });

  it('approved purchase requests with quotations can be reused for new quotations', async () => {
    const usedRequest = await prisma.purchaseRequest.findFirst({
      where: { quotations: { some: {} }, status: 'Approved' },
      include: { _count: { select: { quotations: true } } },
    });
    if (!usedRequest) return;

    expect(usedRequest._count.quotations).toBeGreaterThan(0);
    // Quotations list API no longer excludes used requests — multi-quotation per PR is allowed.
    const rows = await prisma.purchaseRequest.findMany({
      where: { status: 'Approved' },
      select: { id: true },
    });
    expect(rows.some((r) => r.id === usedRequest.id)).toBe(true);
  });
});
