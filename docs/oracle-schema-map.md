# Oracle Schema Map — Purchase Web System

> **مصدر الحقيقة:** `APS_TBL.sql` (Schema: `IAS20251`)  
> **ملف TypeScript:** `src/database/oracleSchemaMap.ts`

## ملخص APS_TBL.sql

الملف يحتوي **24 جدولاً** معرّفاً صراحةً + جداول مرجعية مُشار إليها بـ FK (غير مُعرّفة في الملف):

| # | الجدول | الوصف | PK |
|---|--------|-------|-----|
| 1 | `P_REQUEST` | طلبات الشراء — رئيسي | `PR_SER` |
| 2 | `P_REQUEST_DETAIL` | طلبات الشراء — تفصيلي | (مرتبط بـ `PR_SER`) |
| 3 | `P_ORDER` | أوامر الشراء — رئيسي | `PO_SER` |
| 4 | `P_ORDER_DETAIL` | أوامر الشراء — تفصيلي | (مرتبط بـ `PO_SER`) |
| 5 | `IAS_VND_QUOT_MST` | عروض أسعار الموردين — رئيسي | `QT_SER` |
| 6 | `IAS_VND_QUOT_DTL` | عروض أسعار — تفصيلي | (مرتبط بـ `QT_SER`) |
| 7 | `IAS_APS_QTN_CMPR_MST` | المقارنة الفنية — رئيسي | `DOC_SER` |
| 8 | `IAS_APS_QTN_CMPR_DTL` | المقارنة الفنية — تفصيلي | |
| 9 | `IAS_APS_QTN_CMPR_MMBR` | أعضاء لجنة المقارنة | |
| 10 | `IAS_APS_QTN_CMPR_FLTR_DTL` | فلتر/ترشيح مورد في المقارنة | |
| 11 | `IAS_CHECK_INCM_MST` | فحص المشتريات — رئيسي | `DOC_SER` |
| 12 | `IAS_CHECK_INCM_DTL` | فحص المشتريات — تفصيلي | |
| 13 | `GRN_MASTER` | إذن توريد محلي — رئيسي | `G_SER` |
| 14 | `GRN_DETAIL` | إذن توريد — تفصيلي | |
| 15 | `IAS_PI_BILL_MST` | فاتورة شراء — رئيسي | `BILL_SER` |
| 16 | `IAS_PI_BILL_DTL` | فاتورة شراء — تفصيلي | |
| 17 | `IAS_PI_BILL_EXPND` | مصاريف الفاتورة | |
| 18 | `IAS_PI_BILL_JRNL` | قيود الفاتورة | |
| 19 | `IAS_PI_BILL_MST_ADD_DISC` | خصم إضافي رئيسي | |
| 20 | `IAS_PI_BILL_ADD_DISC_BILLS` | ربط خصم بفواتير | |
| 21 | `IAS_PI_BILL_DTL_ADD_DISC` | خصم إضافي تفصيلي | |
| 22 | `IAS_ITM_MST` | الأصناف — رئيسي | `I_CODE` |
| 23 | `IAS_ITM_DTL` | وحدات الصنف | (`I_CODE`, `ITM_UNT`) |
| 24 | `V_DETAILS` | بيانات الموردين | `V_CODE` |
| 25 | `VENDOR_CURR` | عملات المورد | (`V_CODE`, `A_CY`) |

### جداول مرجعية (FK فقط — غير موجودة في APS_TBL.sql)

`EX_RATE`, `WAREHOUSE_DETAILS`, `COST_CENTERS`, `IAS_PROJECTS`, `IAS_ACTVTY`, `IAS_PORDER_TYPES`, `IAS_PREQ_TYPES`, `ACCOUNT`, `CITIES`, `CNTRY`, `VENDOR_GROUP`, `VENDOR_CLASS`, `IAS_VENDOR_DEGREE`

---

## سلسلة المستندات (Purchase Cycle)

```
P_REQUEST (PR_SER)
    ↓ PR_SER في IAS_VND_QUOT_DTL / P_ORDER_DETAIL
IAS_VND_QUOT_MST (QT_SER)
    ↓ QT_SER في P_ORDER_DETAIL
IAS_APS_QTN_CMPR_MST (DOC_SER)  ← مقارنة فنية + ترشيح مورد
    ↓
P_ORDER (PO_SER)
    ↓ PO_SER في GRN_DETAIL / IAS_CHECK_INCM_DTL
IAS_CHECK_INCM_MST (DOC_SER)    ← فحص
GRN_MASTER (G_SER)                ← استلام
    ↓
IAS_PI_BILL_MST (BILL_SER)       ← فاتورة شراء
```

**حقول الربط الشائعة:** `PUR_NO`, `PUR_SER`, `DOC_SER_REF`, `DOC_NO_REF`, `PR_SER`, `QT_SER`, `PO_SER`, `G_SER`, `BILL_SER`

---

## قواعد القفل (Lock Rules)

| العلم Oracle | المعنى | يمنع التعديل عند = 1 |
|--------------|--------|----------------------|
| `APPROVED` | معتمد | نعم (معظم المستندات) |
| `PROCESSED` / `PO_PROCESSED` / `PRCSSD_FLG` | مُعالَج / مُستخدم | نعم |
| `PO_CLOSED` | أمر شراء مغلق | نعم |
| `PO_LOCKED` | أمر شراء مقفل | نعم |
| `PR_SELECTED` | طلب مُعالَج | نعم |
| `INACTIVE` | موقوف | نعم |
| `BILL_POST` | فاتورة مُرحّلة | نعم |
| `PO_PARTIAL` / `PR_PARTIAL` | مستخدم جزئياً | تحذير فقط |
| `BLK_LST` (V_DETAILS) | قائمة سوداء | منع الشراء |

**تكامل مع التطبيق:** `document-guard.service.ts` + `used-document.service.ts` — ستُعاد كتابتهما لقراءة أعلام Oracle + جدول `PWS_DOC_USAGE`.

---

## جدول: شاشة → جدول Oracle

| الشاشة (عربي) | المسار | Master | Detail | PK | مورد | عملة | مخزن |
|---------------|--------|--------|--------|-----|------|------|------|
| طلبات الشراء | `/purchases/requests` | `P_REQUEST` | `P_REQUEST_DETAIL` | `PR_SER` | `V_CODE` | `A_CY` | `W_CODE` |
| عروض الأسعار | `/purchases/quotations` | `IAS_VND_QUOT_MST` | `IAS_VND_QUOT_DTL` | `QT_SER` | `V_CODE` | `A_CY` | — |
| المقارنة الفنية | `/purchases/comparisons` | `IAS_APS_QTN_CMPR_MST` | `IAS_APS_QTN_CMPR_DTL` | `DOC_SER` | — | `CUR_CODE` | — |
| ترشيح المورد | `/purchases/supplier-selection` | `IAS_APS_QTN_CMPR_MST` | `IAS_APS_QTN_CMPR_FLTR_DTL` | `DOC_SER` | — | — | — |
| أوامر الشراء | `/purchases/orders` | `P_ORDER` | `P_ORDER_DETAIL` | `PO_SER` | `V_CODE` | `CUR_CODE` | `W_CODE` |
| فحص المشتريات | `/purchases/inspections` | `IAS_CHECK_INCM_MST` | `IAS_CHECK_INCM_DTL` | `DOC_SER` | `V_CODE` | — | `W_CODE` |
| إذن التوريد | `/purchases/receivings` | `GRN_MASTER` | `GRN_DETAIL` | `G_SER` | `V_CODE` | `A_CY` | `W_CODE` |
| فواتير الشراء | `/purchases/invoices` | `IAS_PI_BILL_MST` | `IAS_PI_BILL_DTL` | `BILL_SER` | `V_CODE` | `BILL_CURRENCY` | `W_CODE` |
| الموردين | `/settings/suppliers` | `V_DETAILS` | `VENDOR_CURR` | `V_CODE` | — | `A_CY` | — |
| العملات | `/settings/currencies` | `EX_RATE` | — | `CUR_CODE` | — | — | — |
| الأصناف | `/settings/items` | `IAS_ITM_MST` | `IAS_ITM_DTL` | `I_CODE` | — | — | — |
| المخازن | `/settings/warehouses` | `WAREHOUSE_DETAILS` | — | `W_CODE` | — | — | — |
| سند صرف مورد | `/purchases/supplier-payments` | `PWS_SUPPLIER_PAYMENT`* | `PWS_SUPPLIER_PAY_ALLOC`* | `PAY_SER` | `V_CODE` | `A_CY` | — |
| صندوق الاعتمادات | `/approvals/inbox` | `PWS_APPROVAL_REQUEST`* | `PWS_APPROVAL_ACTION`* | `REQ_ID` | — | — | — |
| الإشعارات | `/notifications` | `PWS_NOTIFICATION`* | — | `NOTIF_ID` | — | — | — |

\* جداول تكميلية — انظر `scripts/oracle-supplemental-tables.sql`

---

## أعمدة رئيسية — Master Documents

### P_REQUEST
| Oracle | Prisma/UI | وصف |
|--------|-----------|-----|
| `PR_SER` | id (mapped) | المفتاح الفريد |
| `PR_NO` | docNo | رقم الطلب |
| `PR_DATE` | date | التاريخ |
| `PR_DESC` | description | البيان |
| `W_CODE` | warehouseId | المخزن |
| `V_CODE` | supplierId | المورد |
| `A_CY` | currencyId | العملة |
| `APPROVED` | status (approved) | اعتماد |
| `PR_SELECTED` | isProcessed | مُعالَج |

### P_ORDER
| Oracle | Prisma/UI | وصف |
|--------|-----------|-----|
| `PO_SER` | id | المفتاح |
| `PO_NO` | docNo | رقم الأمر |
| `PO_DATE` | date | التاريخ |
| `V_CODE` | supplierId | المورد |
| `CUR_CODE` | currencyId | العملة |
| `CUR_RATE` | exchangeRate | سعر الصرف |
| `APPROVED` | status | اعتماد |
| `PO_PROCESSED` | isProcessed | مُعالَج |
| `PO_LOCKED` | isLocked | مقفل |

### IAS_PI_BILL_MST
| Oracle | Prisma/UI | وصف |
|--------|-----------|-----|
| `BILL_SER` | id | المفتاح |
| `BILL_NO` | docNo | رقم الفاتورة |
| `BILL_DATE` | date | التاريخ |
| `BILL_CURRENCY` | currencyId | العملة |
| `BILL_RATE` | exchangeRate | سعر الصرف |
| `BILL_AMT` | netTotal | الإجمالي |
| `BILL_POST` | isPosted | مُرحّل |

### V_DETAILS (المورد)
| Oracle | Prisma/UI |
|--------|-----------|
| `V_CODE` | code |
| `V_A_CODE` | accountCode |
| `V_A_NAME` | nameAr |
| `V_E_NAME` | nameEn |
| `V_PHONE` | phone |
| `V_MOBILE` | mobile |
| `V_E_MAIL` | email |
| `V_TAX_CODE` | taxNo |
| `INACTIVE` | isActive (معكوس: 0=نشط) |

### VENDOR_CURR
| Oracle | Prisma/UI |
|--------|-----------|
| `V_CODE` | supplierCode |
| `A_CY` | currencyCode |
| `CUR_DFLT` | isDefault |
| `INACTIVE` | isInactive |

---

## أعمدة البنود المشتركة (Detail)

| Oracle | UI (عربي) | ملاحظة |
|--------|-----------|--------|
| `I_CODE` | كود الصنف | FK → `IAS_ITM_MST` |
| `ITM_UNT` | الوحدة | FK → `IAS_ITM_DTL` |
| `I_QTY` | الكمية | |
| `P_SIZE` | معامل التحويل | factor_to_base |
| `P_QTY` | الكمية الأساسية | base_qty |
| `I_PRICE` | السعر | |
| `DIS_AMT` / `DIS_PER` | الخصم | |
| `VAT_PER` / `VAT_AMT` | الضريبة | |
| `RCRD_NO` | رقم السجل | ترتيب البند |

---

## جداول تكميلية (PWS_*)

انظر `scripts/oracle-supplemental-tables.sql`:
- `PWS_USER`, `PWS_ROLE`, `PWS_PERMISSION` — مصادقة وصلاحيات
- `PWS_APPROVAL_*` — سير اعتماد الويب
- `PWS_NOTIFICATION` — إشعارات
- `PWS_SUPPLIER_PAYMENT` — سندات صرف الموردين
- `PWS_DOC_USAGE` — تتبع استخدام المستندات
- `PWS_AUDIT_LOG` — سجل تدقيق الويب
