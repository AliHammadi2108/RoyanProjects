import { getMasterData, getSessionPermissions } from '@/actions/common';
import { SupplierPaymentForm } from '@/components/pages/SupplierPaymentForm';
import { canViewSupplierPaymentAmounts } from '@/actions/supplier-payments';

export default async function NewSupplierPaymentPage() {
  const [masterData, permissions, canViewAmounts] = await Promise.all([
    getMasterData(),
    getSessionPermissions(),
    canViewSupplierPaymentAmounts(),
  ]);

  return (
    <SupplierPaymentForm
      masterData={masterData}
      isNew
      canViewAmounts={canViewAmounts}
      userPermissions={permissions}
    />
  );
}
