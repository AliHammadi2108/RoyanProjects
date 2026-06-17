'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission, hasPermission } from '@/lib/permissions';
import {
  listSupplierPaymentVouchers,
  getSupplierPaymentVoucher,
  getOpenInvoicesForSupplier,
  createSupplierPaymentVoucher,
  updateSupplierPaymentVoucher,
  deleteSupplierPaymentVoucher,
  submitSupplierPaymentForApproval,
  postSupplierPaymentVoucher,
  cancelSupplierPaymentVoucher,
  approveSupplierPaymentVoucher,
  type SupplierPaymentInput,
} from '@/services/supplier-payment.service';
import { getSuppliersWithInvoices } from '@/services/reports/supplier-statement.service';
import { supplierPaymentSchema } from '@/lib/validations';

export async function fetchSupplierPayments(supplierId?: string) {
  const user = await requirePermission('supplier_payment.view');
  return listSupplierPaymentVouchers(user.id, supplierId);
}

export async function fetchSupplierPayment(id: string) {
  const user = await requirePermission('supplier_payment.view');
  const voucher = await getSupplierPaymentVoucher(id);
  if (!voucher) return null;
  return voucher;
}

export async function fetchOpenInvoicesForSupplier(supplierId: string) {
  const user = await requirePermission('supplier_payment.view');
  const canViewAmounts = await hasPermission(user.id, 'supplier_payment.view_amounts');
  const invoices = await getOpenInvoicesForSupplier(user.id, supplierId);
  if (!canViewAmounts) {
    return invoices.map((inv) => ({
      ...inv,
      netTotal: 0,
      paidAmount: 0,
      remainingAmount: 0,
    }));
  }
  return invoices;
}

export async function fetchSuppliersWithInvoices(search?: string) {
  const user = await requirePermission('supplier_payment.view');
  return getSuppliersWithInvoices(user.id, search);
}

export async function saveSupplierPayment(data: unknown, id?: string) {
  const user = id
    ? await requirePermission('supplier_payment.edit')
    : await requirePermission('supplier_payment.create');
  const parsed = supplierPaymentSchema.parse(data) as SupplierPaymentInput;

  const result = id
    ? await updateSupplierPaymentVoucher(user.id, id, parsed)
    : await createSupplierPaymentVoucher(user.id, parsed);

  revalidatePath('/purchases/supplier-payments');
  if (id) revalidatePath(`/purchases/supplier-payments/${id}`);
  return result;
}

export async function removeSupplierPayment(id: string) {
  const user = await requirePermission('supplier_payment.delete');
  const result = await deleteSupplierPaymentVoucher(user.id, id);
  revalidatePath('/purchases/supplier-payments');
  return result;
}

export async function submitSupplierPayment(id: string) {
  const user = await requirePermission('supplier_payment.approve');
  const result = await submitSupplierPaymentForApproval(user.id, id);
  revalidatePath('/purchases/supplier-payments');
  revalidatePath(`/purchases/supplier-payments/${id}`);
  revalidatePath('/approvals/inbox');
  return result;
}

export async function postSupplierPayment(id: string) {
  const user = await requirePermission('supplier_payment.post');
  const result = await postSupplierPaymentVoucher(user.id, id);
  revalidatePath('/purchases/supplier-payments');
  revalidatePath(`/purchases/supplier-payments/${id}`);
  revalidatePath('/reports/supplier-statement');
  revalidatePath('/reports/supplier-balances');
  return result;
}

export async function cancelSupplierPayment(id: string) {
  const user = await requirePermission('supplier_payment.cancel');
  const result = await cancelSupplierPaymentVoucher(user.id, id);
  revalidatePath('/purchases/supplier-payments');
  revalidatePath(`/purchases/supplier-payments/${id}`);
  return result;
}

export async function approveSupplierPayment(id: string) {
  const user = await requirePermission('supplier_payment.approve');
  const result = await approveSupplierPaymentVoucher(user.id, id);
  revalidatePath('/purchases/supplier-payments');
  revalidatePath(`/purchases/supplier-payments/${id}`);
  return result;
}

export async function canViewSupplierPaymentAmounts() {
  const user = await requirePermission('supplier_payment.view');
  return hasPermission(user.id, 'supplier_payment.view_amounts');
}
