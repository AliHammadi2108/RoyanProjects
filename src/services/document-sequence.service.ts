import { prisma } from '@/lib/db';
import { DOCUMENT_PREFIXES } from '@/lib/constants';

export async function getNextDocumentNo(
  documentType: string,
  branchId?: string | null
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = DOCUMENT_PREFIXES[documentType] || 'DOC';

  const sequence = await prisma.$transaction(async (tx) => {
    const existing = await tx.documentSequence.findUnique({
      where: {
        documentType_branchId_year: {
          documentType,
          branchId: branchId || '',
          year,
        },
      },
    });

    if (existing) {
      return tx.documentSequence.update({
        where: { id: existing.id },
        data: { lastNumber: { increment: 1 } },
      });
    }

    return tx.documentSequence.create({
      data: {
        documentType,
        branchId: branchId || '',
        prefix,
        lastNumber: 1,
        year,
      },
    });
  });

  const padded = String(sequence.lastNumber).padStart(5, '0');
  return `${prefix}-${year}-${padded}`;
}
