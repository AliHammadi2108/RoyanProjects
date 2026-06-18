/**
 * Removes purchase test operations (documentNo/cycleNo containing "TEST") from dev.db.
 * Does not touch seed users, master data, or unit tests under src/__tests__.
 */
import { PrismaClient } from "@prisma/client";

const TEST = "TEST";

const prisma = new PrismaClient();

type Counts = Record<string, number>;

function docTestWhere() {
  return {
    OR: [
      { documentNo: { contains: TEST } },
      { notes: { contains: TEST } },
    ],
  };
}

function cycleTestWhere() {
  return {
    OR: [
      { cycleNo: { contains: TEST } },
      { notes: { contains: TEST } },
    ],
  };
}

function byCycle(cycleIds: string[]) {
  return { purchaseCycleId: { in: cycleIds } };
}

function cycleOrDoc(cycleIds: string[]) {
  return {
    OR: [byCycle(cycleIds), docTestWhere()],
  };
}

async function collectCycleIds(): Promise<string[]> {
  const fromCycles = await prisma.purchaseCycle.findMany({
    where: cycleTestWhere(),
    select: { id: true },
  });

  const docTypes = [
    prisma.purchaseRequest.findMany({ where: docTestWhere(), select: { purchaseCycleId: true } }),
    prisma.quotation.findMany({ where: docTestWhere(), select: { purchaseCycleId: true } }),
    prisma.technicalComparison.findMany({ where: docTestWhere(), select: { purchaseCycleId: true } }),
    prisma.supplierNomination.findMany({ where: docTestWhere(), select: { purchaseCycleId: true } }),
    prisma.purchaseOrder.findMany({ where: docTestWhere(), select: { purchaseCycleId: true } }),
    prisma.purchaseOrderInspection.findMany({ where: docTestWhere(), select: { purchaseCycleId: true } }),
    prisma.purchaseReceiving.findMany({ where: docTestWhere(), select: { purchaseCycleId: true } }),
    prisma.purchaseInvoice.findMany({ where: docTestWhere(), select: { purchaseCycleId: true } }),
  ] as const;

  const docRows = await Promise.all([...docTypes]);
  const ids = new Set<string>(fromCycles.map((c) => c.id));
  for (const rows of docRows) {
    for (const row of rows) {
      if (row.purchaseCycleId) ids.add(row.purchaseCycleId);
    }
  }
  return [...ids];
}

async function collectDocumentIds(cycleIds: string[]) {
  const where = cycleOrDoc(cycleIds);
  const [
    purchaseRequests,
    quotations,
    comparisons,
    nominations,
    orders,
    inspections,
    receivings,
    invoices,
    vouchers,
  ] = await Promise.all([
    prisma.purchaseRequest.findMany({ where, select: { id: true } }),
    prisma.quotation.findMany({ where, select: { id: true } }),
    prisma.technicalComparison.findMany({ where, select: { id: true } }),
    prisma.supplierNomination.findMany({ where, select: { id: true } }),
    prisma.purchaseOrder.findMany({ where, select: { id: true } }),
    prisma.purchaseOrderInspection.findMany({ where, select: { id: true } }),
    prisma.purchaseReceiving.findMany({ where, select: { id: true } }),
    prisma.purchaseInvoice.findMany({ where, select: { id: true } }),
    prisma.supplierPaymentVoucher.findMany({ where: docTestWhere(), select: { id: true } }),
  ]);

  const ids = {
    purchaseRequest: purchaseRequests.map((r) => r.id),
    quotation: quotations.map((r) => r.id),
    technicalComparison: comparisons.map((r) => r.id),
    supplierNomination: nominations.map((r) => r.id),
    purchaseOrder: orders.map((r) => r.id),
    purchaseOrderInspection: inspections.map((r) => r.id),
    purchaseReceiving: receivings.map((r) => r.id),
    purchaseInvoice: invoices.map((r) => r.id),
    supplierPaymentVoucher: vouchers.map((r) => r.id),
  };

  const allDocIds = [
    ...ids.purchaseRequest,
    ...ids.quotation,
    ...ids.technicalComparison,
    ...ids.supplierNomination,
    ...ids.purchaseOrder,
    ...ids.purchaseOrderInspection,
    ...ids.purchaseReceiving,
    ...ids.purchaseInvoice,
    ...ids.supplierPaymentVoucher,
  ];

  return { ids, allDocIds };
}

export async function cleanupTestOperations(dryRun = false): Promise<Counts> {
  const counts: Counts = {};
  const cycleIds = await collectCycleIds();
  const { ids, allDocIds } = await collectDocumentIds(cycleIds);

  if (dryRun) {
    counts["دورات الشراء"] = cycleIds.length;
    counts["طلبات الشراء"] = ids.purchaseRequest.length;
    counts["عروض الأسعار"] = ids.quotation.length;
    counts["المقارنات الفنية"] = ids.technicalComparison.length;
    counts["ترشيح الموردين"] = ids.supplierNomination.length;
    counts["أوامر الشراء"] = ids.purchaseOrder.length;
    counts["فحص/مطابقة"] = ids.purchaseOrderInspection.length;
    counts["استلام"] = ids.purchaseReceiving.length;
    counts["فواتير الشراء"] = ids.purchaseInvoice.length;
    counts["سندات صرف المورد"] = ids.supplierPaymentVoucher.length;
    return counts;
  }

  await prisma.$transaction(async (tx) => {
    const bump = (key: string, n: number) => {
      counts[key] = (counts[key] ?? 0) + n;
    };

    const invoiceIds = ids.purchaseInvoice;
    const voucherIds = ids.supplierPaymentVoucher;

    bump(
      "تخصيصات سند الصرف",
      (
        await tx.supplierPaymentAllocation.deleteMany({
          where: {
            OR: [
              { invoiceId: { in: invoiceIds } },
              { voucherId: { in: voucherIds } },
            ],
          },
        })
      ).count,
    );

    bump(
      "سندات صرف المورد",
      (
        await tx.supplierPaymentVoucher.deleteMany({
          where: { id: { in: voucherIds } },
        })
      ).count,
    );

    bump(
      "فواتير الشراء",
      (
        await tx.purchaseInvoice.deleteMany({
          where: { id: { in: invoiceIds } },
        })
      ).count,
    );

    bump(
      "استلام",
      (
        await tx.purchaseReceiving.deleteMany({
          where: { id: { in: ids.purchaseReceiving } },
        })
      ).count,
    );

    bump(
      "فحص/مطابقة",
      (
        await tx.purchaseOrderInspection.deleteMany({
          where: { id: { in: ids.purchaseOrderInspection } },
        })
      ).count,
    );

    bump(
      "أوامر الشراء",
      (
        await tx.purchaseOrder.deleteMany({
          where: { id: { in: ids.purchaseOrder } },
        })
      ).count,
    );

    bump(
      "ترشيح الموردين",
      (
        await tx.supplierNomination.deleteMany({
          where: { id: { in: ids.supplierNomination } },
        })
      ).count,
    );

    bump(
      "المقارنات الفنية",
      (
        await tx.technicalComparison.deleteMany({
          where: { id: { in: ids.technicalComparison } },
        })
      ).count,
    );

    bump(
      "عروض الأسعار",
      (
        await tx.quotation.deleteMany({
          where: { id: { in: ids.quotation } },
        })
      ).count,
    );

    bump(
      "طلبات الشراء",
      (
        await tx.purchaseRequest.deleteMany({
          where: { id: { in: ids.purchaseRequest } },
        })
      ).count,
    );

    if (allDocIds.length > 0) {
      bump(
        "حركات مخزون",
        (
          await tx.stockMovement.deleteMany({
            where: { referenceId: { in: allDocIds } },
          })
        ).count,
      );

      bump(
        "مرفقات",
        (
          await tx.attachment.deleteMany({
            where: { entityId: { in: allDocIds } },
          })
        ).count,
      );

      const approvalIds = (
        await tx.approval.findMany({
          where: { documentId: { in: allDocIds } },
          select: { id: true },
        })
      ).map((a) => a.id);

      bump(
        "إشعارات",
        (
          await tx.notification.deleteMany({
            where: {
              OR: [
                { documentId: { in: allDocIds } },
                { relatedDocumentId: { in: allDocIds } },
                ...(approvalIds.length
                  ? [{ approvalId: { in: approvalIds } }]
                  : []),
              ],
            },
          })
        ).count,
      );

      bump(
        "اعتمادات",
        (
          await tx.approval.deleteMany({
            where: { documentId: { in: allDocIds } },
          })
        ).count,
      );

      bump(
        "طلبات الاعتماد",
        (
          await tx.approvalRequest.deleteMany({
            where: { referenceId: { in: allDocIds } },
          })
        ).count,
      );

      bump(
        "سجل التدقيق",
        (
          await tx.auditLog.deleteMany({
            where: { entityId: { in: allDocIds } },
          })
        ).count,
      );
    }

    bump(
      "دورات الشراء",
      (
        await tx.purchaseCycle.deleteMany({
          where: { id: { in: cycleIds } },
        })
      ).count,
    );

    const testSuppliers = await tx.supplier.findMany({
      where: {
        OR: [
          { code: { contains: TEST } },
          { nameAr: { contains: TEST } },
          { nameEn: { contains: TEST } },
          { notes: { contains: TEST } },
        ],
      },
      select: { id: true, code: true },
    });

    for (const s of testSuppliers) {
      try {
        const deleted = await tx.supplier.delete({ where: { id: s.id } });
        void deleted;
        bump("موردين تجريبيين", 1);
      } catch {
        // still referenced by non-test data
      }
    }
  });

  return counts;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const counts = await cleanupTestOperations(dryRun);
  const mode = dryRun ? "(معاينة فقط)" : "(تم الحذف)";
  console.log(`\n=== تنظيف عمليات TEST ${mode} ===\n`);
  for (const [label, n] of Object.entries(counts)) {
    if (n > 0) console.log(`${label}: ${n}`);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`\nالإجمالي: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

