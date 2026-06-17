import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppUrl,
  formatDocumentMessage,
  formatNotificationMessage,
  formatReportMessage,
  formatWhatsAppDocumentTotal,
  formatWhatsAppDocumentStatus,
  normalizePhoneToE164,
  resolveDefaultWhatsAppPhone,
  stripPhoneDigits,
} from '@/lib/whatsapp';

describe('whatsapp', () => {
  describe('normalizePhoneToE164', () => {
    it('normalizes Saudi local numbers', () => {
      expect(normalizePhoneToE164('0501234567', '966')).toBe('966501234567');
      expect(normalizePhoneToE164('+966 50 123 4567', '966')).toBe('966501234567');
    });

    it('normalizes Yemen local numbers', () => {
      expect(normalizePhoneToE164('0773084555')).toBe('967773084555');
      expect(normalizePhoneToE164('773084555')).toBe('967773084555');
    });

    it('keeps international numbers', () => {
      expect(normalizePhoneToE164('966501234567')).toBe('966501234567');
    });

    it('returns null for invalid numbers', () => {
      expect(normalizePhoneToE164('')).toBeNull();
      expect(normalizePhoneToE164('123')).toBeNull();
    });

    it('normalizes Yemen international numbers', () => {
      expect(normalizePhoneToE164('+967773084555')).toBe('967773084555');
    });
  });

  describe('resolveDefaultWhatsAppPhone', () => {
    it('prefers party phone over user phone', () => {
      expect(resolveDefaultWhatsAppPhone('0501111111', '+967773084555')).toBe('0501111111');
    });

    it('falls back to user phone', () => {
      expect(resolveDefaultWhatsAppPhone(null, '+967773084555')).toBe('+967773084555');
    });
  });

  describe('stripPhoneDigits', () => {
    it('removes formatting characters', () => {
      expect(stripPhoneDigits('+966 (50) 123-4567')).toBe('+966501234567');
    });
  });

  describe('buildWhatsAppUrl', () => {
    it('builds url with Yemen default country code', () => {
      const url = buildWhatsAppUrl('مرحباً', '0773084555');
      expect(url).toMatch(/^https:\/\/wa\.me\/967773084555\?text=/);
    });

    it('encodes Arabic text in query string', () => {
      const url = buildWhatsAppUrl('مرحباً — تقرير وثيقة', '966501234567');
      expect(url).toMatch(/^https:\/\/wa\.me\/966501234567\?text=/);
      expect(decodeURIComponent(url.split('text=')[1])).toBe('مرحباً — تقرير وثيقة');
    });

    it('builds url without phone when omitted', () => {
      const url = buildWhatsAppUrl('تنبيه النظام');
      expect(url).toBe(`https://wa.me/?text=${encodeURIComponent('تنبيه النظام')}`);
    });
  });

  describe('formatDocumentMessage', () => {
    it('includes document fields in Arabic template', () => {
      const msg = formatDocumentMessage({
        docTypeLabel: 'فاتورة مشتريات',
        documentNo: 'INV-001',
        documentDate: '2026-06-18',
        status: 'معتمدة',
        total: '1,500.00 ر.س',
        documentUrl: 'http://localhost:3000/purchases/invoices/abc',
      });
      expect(msg).toContain('فاتورة مشتريات');
      expect(msg).toContain('INV-001');
      expect(msg).toContain('معتمدة');
      expect(msg).toContain('1,500.00 ر.س');
      expect(msg).toContain('http://localhost:3000/purchases/invoices/abc');
    });

    it('uses YER symbol from document currency not default SAR', () => {
      const total = formatWhatsAppDocumentTotal(
        { totalAmount: 30000, currency: { symbol: 'ر.ي', code: 'YER' } },
        undefined
      );
      expect(total).toContain('ر.ي');
      expect(total).not.toContain('ر.س');
      expect(total).toContain('30,000.00');

      const msg = formatDocumentMessage({
        docTypeLabel: 'طلب شراء',
        documentNo: 'PR-001',
        status: formatWhatsAppDocumentStatus('Pending Approval'),
        total,
      });
      expect(msg).toContain('30,000.00 ر.ي');
      expect(msg).toContain('بانتظار الاعتماد');
      expect(msg).not.toContain('Pending Approval');
      expect(msg).not.toContain('ر.س');
    });
  });

  describe('formatWhatsAppDocumentTotal', () => {
    it('reads amount and currency from existing document', () => {
      const formatted = formatWhatsAppDocumentTotal({
        totalAmount: 1500,
        currency: { symbol: 'ر.ي', code: 'YER' },
      });
      expect(formatted).toBe('1,500.00 ر.ي');
    });

    it('prefers meta totalAmount over existing when editing', () => {
      const formatted = formatWhatsAppDocumentTotal(
        { totalAmount: 1000, currency: { symbol: 'ر.س', code: 'SAR' } },
        { totalAmount: 2500, currency: { symbol: 'ر.ي', code: 'YER' } }
      );
      expect(formatted).toBe('2,500.00 ر.ي');
    });
  });

  describe('formatNotificationMessage', () => {
    it('includes title message and link', () => {
      const msg = formatNotificationMessage({
        title: 'طلب اعتماد',
        message: 'يوجد مستند بانتظار اعتمادك',
        link: 'http://localhost:3000/approvals/inbox',
      });
      expect(msg).toContain('طلب اعتماد');
      expect(msg).toContain('يوجد مستند بانتظار اعتمادك');
      expect(msg).toContain('http://localhost:3000/approvals/inbox');
    });
  });

  describe('formatReportMessage', () => {
    it('includes summary and attach note', () => {
      const msg = formatReportMessage({
        reportTitle: 'تقرير المشتريات',
        summaryLines: ['إجمالي: 10,000'],
        rowCount: 25,
        attachNote: 'أرفق PDF يدوياً',
      });
      expect(msg).toContain('تقرير المشتريات');
      expect(msg).toContain('إجمالي: 10,000');
      expect(msg).toContain('25');
      expect(msg).toContain('أرفق PDF يدوياً');
    });
  });
});
