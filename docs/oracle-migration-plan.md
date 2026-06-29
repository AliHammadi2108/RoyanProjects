# Oracle Migration Plan — Purchase Web System

## الوضع الحالي (Phase 0 — مكتمل التحليل)

| المكوّن | الحالة الحالية |
|---------|----------------|
| Framework | Next.js 14.2 (App Router, RTL Arabic) |
| ORM | Prisma 5.22 → SQLite (`DATABASE_URL=file:./dev.db`) |
| Auth | NextAuth 4 + bcrypt + جداول User/Role/Permission في Prisma |
| Business logic | `src/actions/*`, `src/services/*` (~40 ملف يستخدم `prisma`) |
| Tests | Vitest |
| Oracle prep | `src/database/oracle/`, repositories PoC, schema map |

---

## استراتيجية الهجرة

### لماذا لا Prisma لـ Oracle؟

Prisma 5 لا يدعم Oracle رسمياً. الخيارات:

1. **موصى به:** `oracledb` مباشرة + طبقة Repository (`src/database/repositories/`)
2. بديل: TypeORM/Sequelize مع Oracle — تعقيد إضافي دون فائدة واضحة

### نمط التشغيل المزدوج (Transitional)

```
┌─────────────────────────────────────────┐
│  Next.js App (screens, actions)         │
├─────────────────────────────────────────┤
│  Repository Layer                       │
│  ├─ useOracle() flag from env           │
│  ├─ Oracle repos (oracledb)             │
│  └─ Prisma repos (SQLite) — legacy      │
├─────────────────────────────────────────┤
│  Oracle IAS20251.*  │  SQLite (dev)     │
└─────────────────────────────────────────┘
```

متغير التحكم: `DATABASE_PROVIDER=oracle|sqlite` (يُضاف في Phase 2)

---

## المراحل

### Phase 1 — التحليل والبنية التحتية ✅ (هذه الجلسة)

- [x] تحليل `APS_TBL.sql` (24 جدول + FKs مرجعية)
- [x] `docs/oracle-schema-map.md`
- [x] `src/database/oracleSchemaMap.ts`
- [x] `src/database/oracle/config.ts` — pool, transactions, `q()`
- [x] `scripts/test-oracle-connection.ts`
- [x] `scripts/oracle-supplemental-tables.sql`
- [x] Repositories PoC: `supplier.repository`, `vendor-currency.repository`
- [x] `docs/oracle-migration-plan.md`

### Phase 2 — الاتصال والتبديل التدريجي

- [ ] `npm install oracledb` + `@types/oracledb`
- [ ] تحديث `.env.example` بمتغيرات Oracle
- [ ] `DATABASE_PROVIDER` + `src/lib/db.ts` factory
- [ ] تشغيل `scripts/oracle-supplemental-tables.sql` على Oracle
- [ ] seed للمستخدمين/الصلاحيات في `PWS_*`
- [ ] ربط `test:oracle-connection` في CI (اختياري)

### Phase 3 — Master Data

| الأولوية | الشاشة | Repository |
|----------|--------|------------|
| 1 | الموردين | `supplier.repository` ✅ |
| 2 | عملات المورد | `vendor-currency.repository` ✅ |
| 3 | العملات | `ex-rate.repository` |
| 4 | الأصناف | `item.repository` (IAS_ITM_MST/DTL) |
| 5 | المخازن | `warehouse.repository` |

### Phase 4 — دورة الشراء (بالترتيب)

1. `P_REQUEST` / `P_REQUEST_DETAIL` — طلبات الشراء
2. `IAS_VND_QUOT_MST/DTL` — عروض الأسعار
3. `IAS_APS_QTN_CMPR_*` — مقارنة + ترشيح
4. `P_ORDER` / `P_ORDER_DETAIL` — أوامر الشراء
5. `IAS_CHECK_INCM_*` — فحص
6. `GRN_MASTER/DETAIL` — استلام
7. `IAS_PI_BILL_*` — فواتير

لكل مستند:
- Repository (CRUD + list + search + pagination)
- Mapper Oracle row → DTO → UI labels (عربي)
- Lock guard من أعلام Oracle
- Document usage من `PWS_DOC_USAGE` + حقول `*_SER` المرجعية

### Phase 5 — اعتمادات، إشعارات، مدفوعات

- `PWS_APPROVAL_*` + ربط `approval.service.ts`
- `PWS_NOTIFICATION` + `notification.service.ts`
- `PWS_SUPPLIER_PAYMENT` + `supplier-payment.service.ts`
- كشف حساب المورد من `IAS_PI_BILL_MST` + `PWS_SUPPLIER_PAYMENT`

### Phase 6 — التقارير

- إعادة كتابة `src/services/reports/*` بـ SQL Oracle
- استخدام `BILL_RATE`, `P_QTY`, `BILL_POST` المخزنة وقت العملية
- Pagination بـ `OFFSET/FETCH`

### Phase 7 — إيقاف SQLite

- إزالة Prisma من production path
- الإبقاء على Prisma للاختبارات المحلية إن لزم

---

## متغيرات البيئة

```env
# Oracle (مطلوب للإنتاج)
ORACLE_HOST=localhost
ORACLE_PORT=1521
ORACLE_SERVICE_NAME=ORCL
# ORACLE_SID=ORCL          # بديل عن SERVICE_NAME
ORACLE_USER=ias_user
ORACLE_PASSWORD=           # لا تُخزَّن في الكود
ORACLE_SCHEMA=IAS20251
ORACLE_POOL_MIN=1
ORACLE_POOL_MAX=10
ORACLE_POOL_INCREMENT=1

# مزود البيانات (Phase 2)
# DATABASE_PROVIDER=oracle

# SQLite (تطوير محلي — مؤقت)
DATABASE_URL="file:./dev.db"
```

---

## قواعد التنفيذ

1. **لا تعديل** على جداول/أعمدة APS — القراءة والكتابة بأسماء Oracle الأصلية
2. **Bind parameters** دائماً — لا string concatenation للقيم
3. **Transactions** لكل عملية master/detail
4. **SER sequences** — استخدام sequences Oracle الموجودة أو `PWS_*_SEQ` للجداول التكميلية
5. **الصلاحيات** — فلترة `V_CODE` حسب `PWS_USER_SUPPLIER_PERM`
6. **WhatsApp** — قراءة `V_DETAILS.WHATSAPP_GRP`, `SEND_MSG`

---

## اختبار الهجرة

```bash
# 1. ضبط .env
cp .env.example .env
# عدّل ORACLE_* 

# 2. اختبار الاتصال
npm run test:oracle-connection

# 3. جداول تكميلية (مرة واحدة)
sqlplus user/pass@host:port/service @scripts/oracle-supplemental-tables.sql

# 4. PoC repositories (من Node REPL أو test)
npx tsx -e "import { listSuppliers } from './src/database/repositories'; listSuppliers({pageSize:5}).then(console.log)"
```

---

## الملفات المُنشأة (Phase 1)

```
src/database/oracle/config.ts
src/database/oracle/index.ts
src/database/oracleSchemaMap.ts
src/database/repositories/base.repository.ts
src/database/repositories/supplier.repository.ts
src/database/repositories/vendor-currency.repository.ts
src/database/repositories/index.ts
scripts/test-oracle-connection.ts
scripts/oracle-supplemental-tables.sql
docs/oracle-schema-map.md
docs/oracle-migration-plan.md
```

---

## المخاطر والتخفيف

| الخطر | التخفيف |
|-------|---------|
| جداول مرجعية ناقصة (EX_RATE, WAREHOUSE_DETAILS) | التأكد من نشرها من نظام IAS الكامل |
| اختلاف ترقيم SER | استخدام `*_SER` كمفتاح داخلي موحّد |
| ترميز عربي في COMMENTS | UI labels من التطبيق وليس من COMMENTS |
| Oracle Instant Client | تثبيت client لـ `oracledb` thick mode إن لزم |
