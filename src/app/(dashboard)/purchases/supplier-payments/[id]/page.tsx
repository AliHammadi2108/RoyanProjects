import { fetchSupplierPayment } from '@/actions/supplier-payments';
import { getMasterData, getSessionPermissions } from '@/actions/common';
import { canViewSupplierPaymentAmounts } from '@/actions/supplier-payments';
import { SupplierPaymentForm } from '@/components/pages/SupplierPaymentForm';
import { notFound } from 'next/navigation';

export default async function SupplierPaymentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [voucher, masterData, permissions, canViewAmounts] = await Promise.all([
    fetchSupplierPayment(params.id),
    getMasterData(),
    getSessionPermissions(),
    canViewSupplierPaymentAmounts(),
  ]);

  if (!voucher) notFound();

  return (
    <SupplierPaymentForm
      masterData={masterData}
      existing={JSON.parse(JSON.stringify(voucher))}
      canViewAmounts={canViewAmounts}
      userPermissions={permissions}
    />
  );
}
