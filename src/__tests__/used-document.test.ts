import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getDocumentUsage } from '@/services/used-document.service';

const prisma = new PrismaClient();

describe('used-document.service', () => {
  beforeAll(async () => {
    const count = await prisma.purchaseRequest.count();
    if (count === 0) {
      console.warn('Skipping usage tests — run db:seed first');
    }
  });

  it('returns not used for isolated purchase request', async () => {
    const request = await prisma.purchaseRequest.findFirst({
      where: { quotations: { none: {} } },
    });
    if (!request) return;

    const usage = await getDocumentUsage('PURCHASE_REQUEST', request.id);
    expect(usage.isUsed).toBe(false);
  });

  it('detects purchase request used by quotation', async () => {
    const quotation = await prisma.quotation.findFirst({
      select: { purchaseRequestId: true },
    });
    if (!quotation) return;

    const usage = await getDocumentUsage('PURCHASE_REQUEST', quotation.purchaseRequestId);
    expect(usage.isUsed).toBe(true);
    expect(usage.childType).toBe('QUOTATION');
  });
});
