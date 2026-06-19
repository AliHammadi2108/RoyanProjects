export type ReportSortDir = 'asc' | 'desc';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
  supplierId?: string;
  warehouseId?: string;
  itemId?: string;
  documentType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: ReportSortDir;
  includeDraft?: boolean;
  usageType?: 'used' | 'locked' | 'all';
}

export interface ReportColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'right' | 'left' | 'center';
}

export interface ReportChartPoint {
  label: string;
  value: number;
}

export interface ReportSummary {
  [key: string]: number | string;
}

export interface ReportResult<T = Record<string, unknown>> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  summary: ReportSummary;
  chartData: ReportChartPoint[];
}

export interface OperationsReportRow {
  id: string;
  documentType: string;
  documentTypeLabel: string;
  documentNo: string;
  documentDate: string;
  status: string;
  supplierName?: string;
  warehouseName?: string;
  currencyCode?: string;
  exchangeRate: number;
  totalAmount: number;
  baseQtyTotal?: number;
  route: string;
}

export interface SupplierBalanceRow {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  invoiceCount: number;
  totalInvoiced: number;
  totalPaid: number;
  balance: number;
  currencyCode?: string;
}

export interface SupplierStatementRow {
  id: string;
  movementDate: string;
  movementType: string;
  movementTypeLabel: string;
  documentNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  currencyId?: string;
  currencyCode: string;
  exchangeRate: number;
  dueDate?: string;
  paymentStatus?: string;
  route: string;
}

export interface SupplierStatementSection {
  currencyId: string;
  currencyCode: string;
  currencyNameAr?: string;
  rows: SupplierStatementRow[];
  total: number;
  summary: ReportSummary;
}

export interface SupplierStatementResult extends ReportResult<SupplierStatementRow> {
  sections?: SupplierStatementSection[];
  showInBaseCurrency?: boolean;
  baseCurrencyCode?: string;
}

export interface UsedDocumentRow {
  id: string;
  documentType: string;
  documentTypeLabel: string;
  documentNo: string;
  documentDate: string;
  status: string;
  usageType: 'used' | 'locked';
  childType?: string;
  childNo?: string;
  childRoute?: string;
  route: string;
}

export interface QuantityCostRow {
  itemId: string;
  itemCode: string;
  itemName: string;
  orderedBaseQty: number;
  receivedBaseQty: number;
  invoicedBaseQty: number;
  orderedCost: number;
  invoicedCost: number;
  varianceQty: number;
  varianceCost: number;
}

export interface ApprovalsReportRow {
  id: string;
  documentType: string;
  documentTypeLabel: string;
  documentId: string;
  documentNo?: string;
  status: string;
  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
  totalAmount: number;
  route?: string;
}
