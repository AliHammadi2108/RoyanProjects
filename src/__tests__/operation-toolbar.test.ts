import { describe, expect, it } from 'vitest';
import {
  computeToolbarButtons,
  isDocumentEditable,
  isDocumentLocked,
  resolveOperationMode,
} from '@/lib/operation-toolbar';

describe('operation-toolbar', () => {
  it('resolves modes from editability', () => {
    expect(resolveOperationMode(true, true)).toBe('create');
    expect(resolveOperationMode(false, true)).toBe('edit');
    expect(resolveOperationMode(false, false)).toBe('view');
  });

  it('locks approved documents', () => {
    expect(isDocumentLocked('Approved')).toBe(true);
    expect(isDocumentEditable('Draft', false)).toBe(true);
    expect(isDocumentEditable('Approved', false)).toBe(false);
    expect(isDocumentEditable('Draft', true)).toBe(false);
  });

  it('shows save and submit for draft in edit mode with permissions', () => {
    const buttons = computeToolbarButtons({
      operationType: 'purchase_request',
      mode: 'edit',
      permissions: [
        'purchase_requests.create',
        'purchase_requests.update',
        'purchase_requests.submit',
      ],
      isNew: false,
      status: 'Draft',
      documentEditable: true,
    });
    expect(buttons.some((b) => b.id === 'save' && b.visible)).toBe(true);
    expect(buttons.some((b) => b.id === 'submit' && b.visible)).toBe(true);
  });

  it('hides print without permission', () => {
    const buttons = computeToolbarButtons({
      operationType: 'quotation',
      mode: 'view',
      permissions: ['quotations.view'],
      documentId: 'q1',
      status: 'Approved',
    });
    const printBtn = buttons.find((b) => b.id === 'print');
    expect(printBtn?.visible).toBe(true);
    expect(printBtn?.disabled).toBe(true);
  });

  it('hides submit and workflow approval for supplier payment', () => {
    const buttons = computeToolbarButtons({
      operationType: 'supplier_payment',
      mode: 'edit',
      permissions: [
        'supplier_payment.create',
        'supplier_payment.update',
        'supplier_payment.submit',
        'operations.approve',
      ],
      isNew: false,
      status: 'Draft',
      documentEditable: true,
      approvalStatus: 'Pending',
      canApprove: true,
    });
    expect(buttons.some((b) => b.id === 'submit' && b.visible)).toBe(false);
    expect(buttons.some((b) => b.id === 'approve' && b.visible)).toBe(false);
    expect(buttons.some((b) => b.id === 'reject' && b.visible)).toBe(false);
  });

  it('hides submit and workflow approval for invoice', () => {
    const buttons = computeToolbarButtons({
      operationType: 'invoice',
      mode: 'edit',
      permissions: ['invoices.create', 'invoices.update', 'invoices.submit'],
      isNew: false,
      status: 'Draft',
      documentEditable: true,
    });
    expect(buttons.some((b) => b.id === 'submit' && b.visible)).toBe(false);
    expect(buttons.some((b) => b.id === 'approve' && b.visible)).toBe(false);
  });
});
