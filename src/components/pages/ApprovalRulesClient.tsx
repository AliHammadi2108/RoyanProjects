'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/ui/DataTable';
import { saveApprovalRule, setApprovalRuleActive } from '@/actions/access-control';

interface RuleRow {
  id: string;
  module: string;
  operationType: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  approvalLevel: number;
  requiredPermission?: string | null;
  isActive: boolean;
  currency?: { code: string } | null;
}

export function ApprovalRulesClient({
  initialData,
  currencies,
}: {
  initialData: RuleRow[];
  currencies: Array<{ id: string; code: string }>;
}) {
  const [rows, setRows] = useState(initialData);
  const [form, setForm] = useState({
    module: 'purchases',
    operationType: 'high_value_po',
    minAmount: 10000,
    maxAmount: undefined as number | undefined,
    currencyId: '',
    requiredPermission: 'operations.approve',
    approvalLevel: 1,
    isActive: true,
  });
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    try {
      const saved = await saveApprovalRule(form);
      setRows((prev) => [...prev, saved as RuleRow]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل الحفظ');
    }
  };

  const columns = [
    { key: 'module', label: 'الوحدة' },
    { key: 'operationType', label: 'العملية' },
    { key: 'approvalLevel', label: 'المستوى' },
    {
      key: 'range',
      label: 'نطاق المبلغ',
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as RuleRow;
        return `${r.minAmount ?? 0} - ${r.maxAmount ?? '∞'}`;
      },
    },
    {
      key: 'isActive',
      label: 'الحالة',
      render: (row: Record<string, unknown>) => (
        <button type="button" className="text-xs text-primary-600" onClick={async () => {
          const r = row as unknown as RuleRow;
          await setApprovalRuleActive(r.id, !r.isActive);
          setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, isActive: !x.isActive } : x)));
        }}>
          {(row.isActive as boolean) ? 'نشط' : 'معطّل'}
        </button>
      ),
    },
  ];

  return (
    <>
      <Header title="قواعد الاعتماد" subtitle="اعتماد العمليات حسب المبلغ والعملة" />
      <PageContainer>
        {error && <div className="alert-error mb-4">{error}</div>}
        <div className="card mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input className="form-input" placeholder="الوحدة" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })} />
          <input className="form-input" placeholder="نوع العملية" value={form.operationType} onChange={(e) => setForm({ ...form, operationType: e.target.value })} />
          <input type="number" className="form-input" placeholder="الحد الأدنى" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: parseFloat(e.target.value) })} />
          <select className="form-input" value={form.currencyId} onChange={(e) => setForm({ ...form, currencyId: e.target.value })}>
            <option value="">أي عملة</option>
            {currencies.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
          <input className="form-input" placeholder="الصلاحية المطلوبة" value={form.requiredPermission} onChange={(e) => setForm({ ...form, requiredPermission: e.target.value })} />
          <button type="button" className="btn-primary" onClick={handleSave}>إضافة قاعدة</button>
        </div>
        <DataTable columns={columns} data={rows as unknown as Record<string, unknown>[]} />
      </PageContainer>
    </>
  );
}
