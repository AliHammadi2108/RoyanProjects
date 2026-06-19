import { fetchSupplierPayments } from '@/actions/supplier-payments';
import { SupplierPaymentList } from '@/components/pages/SupplierPaymentList';
import { getCurrentUser, hasPermission } from '@/lib/permissions';
import { serializeForClient } from '@/lib/serialize-client';

export default async function SupplierPaymentsPage() {
  const user = await getCurrentUser();
  const [data, canCreate, canViewAmounts] = await Promise.all([
    fetchSupplierPayments(),
    user ? hasPermission(user.id, 'supplier_payment.create') : false,
    user ? hasPermission(user.id, 'supplier_payment.view_amounts') : false,
  ]);

  return (
    <SupplierPaymentList
      data={serializeForClient(data)}
      canCreate={canCreate}
      canViewAmounts={canViewAmounts}
    />
  );
}
