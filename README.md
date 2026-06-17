# نظام إدارة ومتابعة عمليات الشراء

نظام ويب كامل لإدارة دورة المشتريات باللغة العربية (RTL)، مبني على تحليل شاشات نظام ERP قديم.

## التقنيات المستخدمة

- **Next.js 14** (App Router) + TypeScript
- **Prisma ORM** + SQLite
- **NextAuth.js** للمصادقة
- **Tailwind CSS** للتصميم
- **Zod** للتحقق من البيانات
- **Vitest** للاختبارات

## التثبيت على جهاز جديد

**تثبيت تلقائي (Windows):** نقر مزدوج على `setup.bat` في جذر المشروع.

**دليل التركيب الكامل (Windows):** [docs/INSTALL.md](docs/INSTALL.md)

يتضمن: المتطلبات، استنساخ GitHub، إعداد `.env`، قاعدة SQLite، التشغيل، الحسابات التجريبية، التشغيل التلقائي، واستكشاف الأخطاء.

## التشغيل السريع

```bash
# 1. تثبيت الحزم
npm install

# 2. إنشاء ملف .env (انظر docs/INSTALL.md)

# 3. إعداد قاعدة البيانات
npm run db:push
npm run db:seed

# 4. تشغيل النظام
npm run dev
```

افتح المتصفح على: http://localhost:3000

## حسابات تجريبية

| رقم المستخدم | كلمة المرور | الدور |
|--------------|-------------|-------|
| 1 | admin123 | مدير النظام |
| 2 | requester123 | مقدم طلب شراء |
| 3 | officer123 | موظف مشتريات |
| 4 | approver123 | معتمد مشتريات |
| 5 | warehouse123 | مستخدم مخزن |
| 6 | finance123 | مستخدم مالية |

## دورة الشراء الكاملة

```
طلب شراء → اعتماد → عرض سعر → اعتماد → مقارنة فنية → اعتماد
→ ترشيح مورد → أمر شراء → اعتماد → فحص → إذن توريد → فاتورة → مكتمل
```

## الصفحات الرئيسية

| المسار | الوصف |
|--------|-------|
| `/purchases/tracking` | لوحة متابعة العمليات |
| `/purchases/requests` | طلبات الشراء |
| `/purchases/quotations` | عروض الأسعار |
| `/purchases/comparisons` | المقارنة الفنية |
| `/purchases/supplier-selection` | اختيار المورد |
| `/purchases/orders` | أوامر الشراء |
| `/purchases/inspections` | فحص المشتريات |
| `/purchases/receivings` | إذن التوريد |
| `/purchases/invoices` | فواتير المشتريات |
| `/approvals/inbox` | صندوق الاعتمادات |
| `/notifications` | التنبيهات |
| `/settings/approval-matrix` | مصفوفة الاعتماد |

## الاختبارات

```bash
npm run db:push
npm run db:seed
npm test
```

## البناء للإنتاج

```bash
npm run build
npm start
```
