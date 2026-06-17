import { z } from 'zod';
import { PAYMENT_METHOD_VALUES } from '@/lib/constants';

const paymentMethodEnum = z.enum(PAYMENT_METHOD_VALUES);
const emptyToUndefined = (val: unknown) => (val === '' || val === undefined ? undefined : val);
const emptyToNullish = (val: unknown) => (val === '' || val === undefined ? null : val);
const optionalPaymentMethod = z.preprocess(emptyToUndefined, paymentMethodEnum.optional());
const nullishPaymentMethod = z.preprocess(emptyToNullish, paymentMethodEnum.nullish());

/** يقبل null/undefined القادم من SQLite/Prisma */
const nullishString = z.string().nullish();
const nullishId = z.string().nullish();

export const lineItemSchema = z.object({
  itemId: z.string().min(1, 'الصنف مطلوب'),
  itemNameSnapshot: z.string().min(1),
  itemUnitId: nullishId,
  unitId: nullishId,
  factorToBase: z.number().positive().optional().nullable(),
  baseQty: z.number().min(0).optional().nullable(),
  quantity: z.number().positive('الكمية يجب أن تكون أكبر من صفر'),
  unitPrice: z.number().min(0, 'السعر لا يمكن أن يكون سالباً'),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  total: z.number().default(0),
  notes: nullishString,
  packaging: nullishString,
  specs: nullishString,
  expiryDate: nullishString,
  expectedDelivery: nullishString,
  supplierPrice: z.number().optional().nullable(),
  freeQuantity: z.number().optional().nullable(),
});

export const currencySchema = z.object({
  code: z.string().min(2, 'رمز العملة مطلوب').max(10),
  nameAr: z.string().min(1, 'اسم العملة مطلوب'),
  nameEn: z.string().optional(),
  symbol: z.string().min(1, 'رمز العرض مطلوب'),
  rateToBase: z.number().positive('سعر التحويل يجب أن يكون أكبر من صفر'),
  isBase: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const supplierSchema = z.object({
  code: z.string().min(1, 'كود المورد مطلوب'),
  nameAr: z.string().min(1, 'اسم المورد مطلوب'),
  nameEn: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('بريد إلكتروني غير صالح').optional().or(z.literal('')),
  address: z.string().optional(),
  taxNo: z.string().optional(),
  defaultCurrencyId: z.string().min(1, 'العملة الافتراضية مطلوبة'),
  openingBalance: z.number().default(0),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const unitSchema = z.object({
  code: z.string().min(1, 'كود الوحدة مطلوب'),
  nameAr: z.string().min(1, 'اسم الوحدة مطلوب'),
  nameEn: z.string().optional(),
  symbol: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const itemUnitRowSchema = z.object({
  id: z.string().optional(),
  unitId: z.string().min(1, 'الوحدة مطلوبة'),
  isBase: z.boolean().default(false),
  factorToBase: z.number().positive('معامل التحويل يجب أن يكون أكبر من صفر'),
  barcode: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  salePrice: z.number().min(0).optional(),
  isDefaultPurchase: z.boolean().default(false),
  isDefaultSale: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const itemWarehouseReorderSchema = z.object({
  warehouseId: z.string().min(1),
  reorderLevelBaseQty: z.number().min(0).optional(),
  reorderQtyBase: z.number().min(0).optional(),
  enableReorderAlert: z.boolean().default(false),
});

export const itemSchema = z.object({
  code: z.string().min(1, 'كود الصنف مطلوب'),
  nameAr: z.string().min(1, 'اسم الصنف مطلوب'),
  nameEn: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  minStock: z.number().min(0).optional(),
  maxStock: z.number().min(0).optional(),
  reorderLevelBaseQty: z.number().min(0).optional(),
  reorderQtyBase: z.number().min(0).optional(),
  preferredSupplierId: z.string().optional(),
  enableReorderAlert: z.boolean().default(false),
  isStockItem: z.boolean().default(true),
  isActive: z.boolean().default(true),
  itemUnits: z.array(itemUnitRowSchema).min(1, 'يجب إضافة وحدة واحدة على الأقل'),
  itemWarehouseReorders: z.array(itemWarehouseReorderSchema).optional(),
});

export const roleSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  nameAr: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  permissionIds: z.array(z.string()).default([]),
});

export const userPermissionSchema = z.object({
  userId: z.string().min(1),
  permissionId: z.string().min(1),
  effect: z.enum(['allow', 'deny']),
});

export const userSupplierPermissionSchema = z.object({
  userId: z.string().min(1),
  supplierId: z.string().min(1),
  canView: z.boolean().default(true),
  canUseInPurchase: z.boolean().default(false),
  canViewBalance: z.boolean().default(false),
  canEdit: z.boolean().default(false),
  canApproveTransactions: z.boolean().default(false),
});

export const approvalRuleSchema = z.object({
  module: z.string().min(1),
  operationType: z.string().min(1),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  currencyId: z.string().optional(),
  requiredPermission: z.string().optional(),
  approvalLevel: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
});

export const approvalRequestActionSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(['approve', 'reject', 'return_for_edit', 'cancel']),
  notes: z.string().optional(),
});

export const purchaseRequestSchema = z.object({
  branchId: z.string().min(1, 'الفرع مطلوب'),
  departmentId: nullishId,
  requestDate: nullishString,
  requesterUnit: nullishString,
  purchaseType: z.string().default('LOCAL'),
  operationNo: nullishString,
  warehouseId: nullishId,
  supplierId: nullishId,
  currencyId: nullishId,
  exchangeRate: z.number().positive().default(1),
  referenceNo: nullishString,
  qualityLevel: nullishString,
  requiredDate: nullishString,
  notes: nullishString,
  items: z.array(lineItemSchema).min(1, 'يجب إضافة صنف واحد على الأقل'),
});

export const quotationSchema = z.object({
  purchaseRequestId: z.string().min(1, 'طلب الشراء مطلوب'),
  branchId: z.string().min(1),
  supplierId: z.string().min(1, 'المورد مطلوب'),
  paymentMethod: nullishPaymentMethod,
  costMethod: nullishString,
  creditPeriod: z.number().optional(),
  deliveryDays: z.number().optional(),
  paymentTerms: nullishString,
  currencyId: nullishId,
  referenceNo: nullishString,
  expiryDate: nullishString,
  notes: nullishString,
  discount: z.number().default(0),
  extraDiscount: z.number().default(0),
  items: z.array(lineItemSchema).min(1),
});

export const comparisonSchema = z.object({
  purchaseCycleId: z.string().min(1),
  branchId: z.string().min(1),
  quotationIds: z.array(z.string()).min(1, 'يجب اختيار عرض سعر واحد على الأقل'),
  currencyId: z.string().optional(),
  paymentMethod: optionalPaymentMethod,
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string(),
    itemNameSnapshot: z.string(),
    unitId: z.string().optional(),
    supplierId: z.string().optional(),
    supplierName: z.string().optional(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    netAmount: z.number().default(0),
    isSelected: z.boolean().default(false),
    quotationId: z.string().optional(),
    quotationNo: z.string().optional(),
    notes: z.string().optional(),
  })).min(1),
});

export const nominationSchema = z.object({
  technicalComparisonId: z.string().min(1),
  branchId: z.string().min(1),
  supplierId: z.string().optional(),
  comparisonType: z.string().optional(),
  notes: z.string().optional(),
  committeeMembers: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string(),
    itemNameSnapshot: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    supplierId: z.string().optional(),
    supplierName: z.string().optional(),
    quotationId: z.string().optional(),
    isApproved: z.boolean().default(true),
  })).min(1),
});

export const purchaseOrderSchema = z.object({
  supplierNominationId: z.string().optional(),
  purchaseCycleId: z.string().min(1),
  branchId: z.string().min(1),
  supplierId: z.string().min(1, 'المورد مطلوب'),
  warehouseId: z.string().optional(),
  currencyId: z.string().optional(),
  paymentMethod: optionalPaymentMethod,
  expectedArrival: z.string().optional(),
  notes: z.string().optional(),
  discount: z.number().default(0),
  items: z.array(lineItemSchema).min(1),
});

export const inspectionSchema = z.object({
  purchaseOrderId: z.string().min(1),
  warehouseId: z.string().optional(),
  inspectionResult: z.enum(['Accepted', 'Partially Accepted', 'Rejected']),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string(),
    itemNameSnapshot: z.string(),
    quantity: z.number().positive(),
    matchedQty: z.number().min(0),
    unmatchedQty: z.number().min(0),
    freeQuantity: z.number().default(0),
    matchStatus: z.string().default('Pending'),
    notes: z.string().optional(),
  })).min(1),
});

export const receivingSchema = z.object({
  purchaseOrderId: z.string().min(1),
  inspectionId: z.string().optional(),
  branchId: z.string().min(1),
  supplierId: z.string().min(1),
  warehouseId: z.string().optional(),
  supplierInvoiceNo: z.string().optional(),
  supplierInvoiceDate: z.string().optional(),
  currencyId: z.string().optional(),
  exchangeRate: z.number().positive().default(1),
  notes: z.string().optional(),
  items: z.array(z.object({
    itemId: z.string(),
    itemNameSnapshot: z.string(),
    itemUnitId: z.string().optional(),
    unitId: z.string().optional(),
    factorToBase: z.number().positive().optional(),
    receivedQty: z.number().positive('كمية الاستلام يجب أن تكون أكبر من صفر'),
    freeQuantity: z.number().default(0),
    notes: z.string().optional(),
  })).min(1),
});

export const invoiceSchema = z.object({
  purchaseOrderId: z.string().min(1),
  receivingId: z.string().optional(),
  branchId: z.string().min(1),
  supplierId: z.string().min(1),
  paymentMethod: optionalPaymentMethod,
  dueDate: z.string().optional(),
  supplierInvoiceNo: z.string().optional(),
  supplierInvoiceDate: z.string().optional(),
  notes: z.string().optional(),
  discount: z.number().default(0),
  otherExpenses: z.number().default(0),
  items: z.array(lineItemSchema).min(1),
});

export const supplierPaymentAllocationSchema = z.object({
  invoiceId: z.string().min(1),
  allocatedAmount: z.number().positive('مبلغ التخصيص يجب أن يكون أكبر من صفر'),
});

export const supplierPaymentSchema = z.object({
  branchId: z.string().min(1, 'الفرع مطلوب'),
  supplierId: z.string().min(1, 'المورد مطلوب'),
  currencyId: z.string().optional().nullable(),
  exchangeRate: z.number().positive().default(1),
  paymentDate: z.string().optional(),
  paymentMethod: nullishPaymentMethod,
  bankReference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  totalAmount: z.number().positive('مبلغ السند يجب أن يكون أكبر من صفر'),
  allocations: z.array(supplierPaymentAllocationSchema).min(1),
});

export const approvalActionSchema = z.object({
  approvalId: z.string(),
  action: z.enum(['approve', 'reject', 'return', 'cancel']),
  notes: nullishString,
});
