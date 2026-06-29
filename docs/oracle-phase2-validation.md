# Oracle Phase 2 — Supplemental SQL Validation

> **الحالة:** لم يُنفَّذ على Oracle حيّاً في هذه الجلسة (لا يوجد اتصال Oracle متاح).  
> **التحقق:** `npm run test:oracle-connection` بعد ضبط `.env`.

## خطوات التشغيل على Oracle

1. نشر `APS_TBL.sql` على المخطط `IAS20251` (أو المخطط المحدد في `ORACLE_SCHEMA`).
2. تشغيل `scripts/oracle-supplemental-tables.sql` — جداول `PWS_*` + تسلسلات `PWS_*_SER_SEQ`.
3. إن لم تكن `EX_RATE` / `WAREHOUSE_DETAILS` موجودة في ERP، راجع `scripts/oracle-reference-tables.sql` (DDL معلّق — فك التعليق بعد مطابقة الأعمدة).
4. ضبط `.env`:
   ```env
   DATABASE_PROVIDER=oracle
   ORACLE_HOST=...
   ORACLE_USER=...
   ORACLE_PASSWORD=...
   ORACLE_SCHEMA=IAS20251
   ```
5. `npm run test:oracle-connection`
6. `npm run dev` — جرّب `/settings/suppliers` و `/purchases/requests`.

## ما يتحقق منه الاتصال

- Pool `oracledb` + استعلام `SELECT 1 FROM DUAL`
- وجود جداول APS رئيسية (اختياري في سكربت الاختبار)

## ملاحظات

- وضع SQLite الافتراضي لا يتأثر — لا حاجة لـ Oracle في التطوير اليومي.
- التسلسلات `PWS_*_SER_SEQ` تُستخدم من `src/database/sequence.service.ts` مع fallback `MAX+1 FOR UPDATE`.
