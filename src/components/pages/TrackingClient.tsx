'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { DOCUMENT_LABELS_AR, DOCUMENT_ROUTES } from '@/lib/constants';
import Link from 'next/link';
import { fetchCycleDetails } from '@/actions/common';

interface Cycle {
  id: string;
  cycleNo: string;
  currentStage: string;
  nextAction: string;
  status: string;
  totalAmount: number;
  isLate: boolean;
  lateDays: number;
  createdAt: string;
  updatedAt: string;
  branch?: { nameAr: string };
  purchaseRequests?: Array<{ documentNo: string; department?: { nameAr: string } }>;
  orders?: Array<{ supplier?: { nameAr: string }; expectedArrival?: string; total: number }>;
}

const STAGE_TABS = [
  { key: 'purchaseRequests', label: 'طلبات الشراء', route: '/purchases/requests' },
  { key: 'quotations', label: 'عروض الأسعار', route: '/purchases/quotations' },
  { key: 'comparisons', label: 'المقارنة الفنية', route: '/purchases/comparisons' },
  { key: 'nominations', label: 'اختيار المورد', route: '/purchases/supplier-selection' },
  { key: 'orders', label: 'أوامر الشراء', route: '/purchases/orders' },
  { key: 'inspections', label: 'فحص المشتريات', route: '/purchases/inspections' },
  { key: 'receivings', label: 'إذن التوريد', route: '/purchases/receivings' },
  { key: 'invoices', label: 'فواتير المشتريات', route: '/purchases/invoices' },
];

export function TrackingClient({
  initialCycles,
  allowedHrefs = [],
}: {
  initialCycles: Cycle[];
  allowedHrefs?: string[];
}) {
  const allowedSet = new Set(allowedHrefs);
  const visibleTabs = STAGE_TABS.filter((tab) => allowedSet.has(tab.route));
  const [cycles] = useState(initialCycles);
  const [selectedCycle, setSelectedCycle] = useState<Cycle | null>(null);
  const [cycleDetails, setCycleDetails] = useState<Record<string, unknown[]> | null>(null);
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key || 'purchaseRequests');
  const [search, setSearch] = useState('');

  const filtered = cycles.filter(
    (c) => !search || c.cycleNo.includes(search) || c.nextAction.includes(search)
  );

  const selectCycle = async (cycle: Cycle) => {
    setSelectedCycle(cycle);
    const details = await fetchCycleDetails(cycle.id);
    if (details) {
      setCycleDetails(details as unknown as Record<string, unknown[]>);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            className="form-input max-w-xs"
            placeholder="بحث برقم العملية..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['رقم العملية', 'التاريخ', 'المرحلة الحالية', 'الإجراء التالي', 'المبلغ', 'الحالة', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((cycle) => (
                <tr
                  key={cycle.id}
                  className={`hover:bg-gray-50 cursor-pointer ${selectedCycle?.id === cycle.id ? 'bg-primary-50' : ''}`}
                  onClick={() => selectCycle(cycle)}
                >
                  <td className="px-4 py-3 font-medium">{cycle.cycleNo}</td>
                  <td className="px-4 py-3">{formatDate(cycle.createdAt)}</td>
                  <td className="px-4 py-3">{DOCUMENT_LABELS_AR[cycle.currentStage] || cycle.currentStage}</td>
                  <td className="px-4 py-3 text-amber-700">{cycle.nextAction}</td>
                  <td className="px-4 py-3">{formatCurrency(cycle.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={cycle.isLate ? 'Late' : cycle.status === 'COMPLETED' ? 'Approved' : 'Pending Approval'} />
                  </td>
                  <td className="px-4 py-3">
                    {cycle.isLate && <span className="text-red-700 text-xs">متأخر {cycle.lateDays} يوم</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCycle && cycleDetails && (
        <div className="card">
          <h3 className="font-bold text-lg mb-4">
            تفاصيل العملية: {selectedCycle.cycleNo}
          </h3>

          <div className="flex gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
            {visibleTabs.map((tab) => {
              const docs = (cycleDetails[tab.key] as Array<{ id: string; documentNo: string; status: string; total?: number; totalAmount?: number }>) || [];
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-primary-500 text-primary-700 font-medium'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label} ({docs.length})
                </button>
              );
            })}
          </div>

          {visibleTabs.map((tab) => {
            if (activeTab !== tab.key) return null;
            const docs = (cycleDetails[tab.key] as Array<{ id: string; documentNo: string; status: string; total?: number; totalAmount?: number }>) || [];

            if (docs.length === 0) {
              return <p key={tab.key} className="text-gray-500 text-sm">لا توجد مستندات في هذه المرحلة</p>;
            }

            return (
              <div key={tab.key} className="space-y-2">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{doc.documentNo}</span>
                      <StatusBadge status={doc.status} />
                      <span className="text-sm text-gray-500">
                        {formatCurrency(doc.totalAmount || doc.total || 0)}
                      </span>
                    </div>
                    <Link href={`${tab.route}/${doc.id}`} className="btn-secondary text-xs">
                      فتح المستند
                    </Link>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
