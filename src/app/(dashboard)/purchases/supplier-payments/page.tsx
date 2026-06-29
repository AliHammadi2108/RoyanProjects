import type { ComponentProps } from 'react';
import { fetchSupplierPayments } from '@/actions/supplier-payments';
import { SupplierPaymentList } from '@/components/pages/SupplierPaymentList';
import { hasPermission, requirePermission } from '@/lib/permissions';
import { serializeForClient } from '@/lib/serialize-client';

export default async function SupplierPaymentsPage() {
  const user = await requirePermission('supplier_payment.view');
  const [data, canCreate, canViewAmounts] = await Promise.all([
    fetchSupplierPayments(),
    hasPermission(user.id, 'supplier_payment.create'),
    hasPermission(user.id, 'supplier_payment.view_amounts'),
  ]);

  const listData = serializeForClient(data) as ComponentProps<
    typeof SupplierPaymentList
  >['data'];

  return (
    <SupplierPaymentList
      data={listData}
      canCreate={canCreate}
      canViewAmounts={canViewAmounts}
    />
  );
}
