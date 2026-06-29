import type { PurchaseRequestDto } from '@/database/repositories/purchase-request.repository';

/** Map Oracle purchase request DTO to Prisma-shaped list/detail row for existing UI. */
export function toPurchaseRequestListRow(dto: PurchaseRequestDto) {
  return {
    id: String(dto.ser),
    documentNo: dto.documentNo,
    status: dto.status,
    requestDate: dto.date,
    requesterUnit: dto.requesterUnit,
    referenceNo: dto.referenceNo,
    requiredDate: dto.requiredDate,
    notes: dto.description,
    totalAmount: 0,
    purchaseType: 'LOCAL',
    operationNo: null,
    approvalStatus: 'None',
    branchId: 'oracle',
    departmentId: null,
    warehouseId: dto.warehouseCode,
    supplierId: dto.supplierCode,
    currencyId: dto.currencyCode,
    exchangeRate: 1,
    purchaseCycleId: `cycle-${dto.ser}`,
    createdBy: 'oracle',
    updatedBy: null,
    createdAt: dto.date,
    updatedAt: dto.date,
    branch: { id: 'oracle', nameAr: 'Oracle', code: 'ORA' },
    department: null,
    warehouse: dto.warehouseCode
      ? { id: dto.warehouseCode, code: dto.warehouseCode, nameAr: dto.warehouseCode }
      : null,
    supplier: dto.supplierCode
      ? { id: dto.supplierCode, code: dto.supplierCode, nameAr: dto.supplierName ?? dto.supplierCode }
      : null,
    currency: dto.currencyCode
      ? { id: dto.currencyCode, code: dto.currencyCode, nameAr: dto.currencyCode }
      : null,
    creator: { nameAr: 'Oracle' },
    items: dto.lines.map((line, idx) => ({
      id: `${dto.ser}-${line.recordNo}`,
      purchaseRequestId: String(dto.ser),
      itemId: line.itemCode,
      itemNameSnapshot: line.itemCode,
      quantity: line.quantity,
      unitPrice: 0,
      discount: 0,
      tax: 0,
      total: 0,
      factorToBase: line.factorToBase,
      baseQty: line.baseQty,
      sortOrder: idx,
      item: { id: line.itemCode, code: line.itemCode, nameAr: line.itemCode },
    })),
    purchaseCycle: { id: `cycle-${dto.ser}`, cycleNo: dto.documentNo },
    _count: { quotations: 0 },
    quotations: [],
  };
}
