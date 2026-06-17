# دليل التثبيت والتشغيل — نظام إدارة المشتريات

دليل خطوة بخطوة لتركيب النظام على جهاز Windows جديد.
---

## تثبيت عبر ملف MSI / EXE (جهاز آخر بدون Git)

للتثبيت على جهاز لا يحتوي على Git أو كود المصدر، استخدم **مُثبّت Windows** المُبني من مجلد `installer`:

### على جهاز المطور (مرة واحدة)

```powershell
cd E:\Purchase_Web_System
powershell -ExecutionPolicy Bypass -File .\installer\build-installer.ps1
```

الناتج: `installer\dist\PurchaseSystem-Setup.msi` (WiX) أو `PurchaseSystem-Setup.exe` (Inno Setup).

### على جهاز المستخدم

1. ثبّت **Node.js 20 LTS** من [nodejs.org](https://nodejs.org/) إن لم يكن مثبتاً.
2. شغّل `PurchaseSystem-Setup.msi` أو `.exe` **كمسؤول**.
3. انتظر انتهاء إعداد ما بعد التثبيت (npm، قاعدة البيانات، build).
4. شغّل **«نظام المشتريات»** من سطح المكتب أو `installer\start-installed.bat`.
5. افتح `http://localhost:3000` — بعد seed: `admin` / `admin123`.

إذا فشل الإعداد لعدم وجود Node.js:

```powershell
cd "C:\Program Files\PurchaseWebSystem"
powershell -ExecutionPolicy Bypass -File .\installer\post-install.ps1
```

تفاصيل إضافية: [`installer/README.md`](../installer/README.md).


---

## 1. المتطلبات الأساسية

| البرنامج | الإصدار الموصى به | ملاحظات |
|----------|-------------------|---------|
| **Windows** | 10 أو 11 | 64-bit |
| **Node.js** | **20.x LTS** (أو 22.x) | المشروع يستخدم `@types/node ^20` — يُفضَّل [Node.js 20 LTS](https://nodejs.org/) |
| **npm** | يأتي مع Node.js | للتحقق: `node -v` و `npm -v` |
| **Git** | أحدث إصدار | [git-scm.com](https://git-scm.com/download/win) |
| **DB Browser for SQLite** | اختياري | لفتح `prisma/dev.db` ومراجعة البيانات يدوياً |

> **ملاحظة:** لا حاجة لتثبيت SQLite منفصلاً — Prisma يتعامل مع قاعدة SQLite محلياً.

---

## 2. تنزيل المشروع من GitHub

افتح **PowerShell** أو **Command Prompt** ونفّذ:

```powershell
# اختر مجلد التثبيت (مثال)
cd C:\Projects

# استنساخ المستودع
git clone https://github.com/AliHammadi2108/RoyanProjects.git

# الدخول لمجلد المشروع
cd RoyanProjects
```

إذا كان المستودع خاصاً، استخدم حساب GitHub أو Personal Access Token عند الطلب.

---

## 3. تثبيت الحزم

من داخل مجلد المشروع:

```powershell
npm install
```

انتظر حتى يكتمل التثبيت دون أخطاء.

---

## 4. إعداد ملف البيئة `.env`

أنشئ ملفاً باسم `.env` في **جذر المشروع** (بجانب `package.json`).

### قالب `.env` (بدون قيم حقيقية)

```env
# قاعدة البيانات SQLite — الملف يُنشأ تلقائياً داخل prisma/
DATABASE_URL="file:./dev.db"

# مفتاح سري لجلسات NextAuth — استبدله بسلسلة عشوائية طويلة
NEXTAUTH_SECRET="ضع-هنا-سلسلة-عشوائية-طويلة-32-حرف-على-الأقل"

# عنوان التطبيق المحلي
NEXTAUTH_URL="http://localhost:3000"
```

### توليد `NEXTAUTH_SECRET`

في PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

انسخ الناتج وضعه قيمة لـ `NEXTAUTH_SECRET`.

> **مهم:** لا ترفع ملف `.env` إلى GitHub — وهو مُستثنى في `.gitignore`.

---

## 5. إعداد قاعدة البيانات

```powershell
# إنشاء/تحديث جداول SQLite
npx prisma db push

# توليد عميل Prisma (إن لم يُنفَّذ تلقائياً)
npx prisma generate

# تعبئة البيانات الأولية (مستخدمون، أدوار، بيانات تجريبية)
npm run db:seed
```

بعد التنفيذ يُنشأ الملف:

```
prisma/dev.db
```

هذا الملف **محلي لكل جهاز** و**غير مضمّن في Git** — يجب إنشاؤه على كل جهاز جديد.

---

## 6. التشغيل

### وضع التطوير (للتجربة والتعديل)

```powershell
npm run dev
```

### وضع الإنتاج (للاستخدام الدائم على الشبكة المحلية)

```powershell
npm run build
npm run start
```

---

## 7. فتح النظام في المتصفح

افتح:

**http://localhost:3000**

صفحة تسجيل الدخول تطلب **رقم المستخدم** و**كلمة المرور**.

---

## 8. الحسابات التجريبية

| رقم المستخدم | كلمة المرور | الدور |
|:------------:|:-----------:|-------|
| **1** | `admin123` | مدير النظام |
| **2** | `requester123` | مقدم طلب شراء |
| **3** | `officer123` | موظف مشتريات |
| **4** | `approver123` | معتمد مشتريات |
| **5** | `warehouse123` | مستخدم مخزن |
| **6** | `finance123` | مستخدم مالية |

> غيّر كلمات المرور في بيئة الإنتاج الحقيقية.

---

## 9. التشغيل التلقائي عند بدء Windows (اختياري)

للإبقاء على النظام يعمل بعد إعادة تشغيل الجهاز **بدون** فتح Terminal يدوياً، استخدم **وضع الإنتاج** والسكربتات الجاهزة في مجلد `scripts/`.

**دليل مفصّل:** [scripts/README-autostart.md](../scripts/README-autostart.md)

### الخطوات السريعة (PM2 — موصى به)

1. نفّذ مرة واحدة:

```powershell
npm run build
```

2. افتح **PowerShell كمسؤول** من مجلد المشروع:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\install-autostart.ps1
```

3. بعد إعادة تشغيل الجهاز، افتح: **http://localhost:3000**

### تشغيل يدوي بدون تثبيت الخدمة

```powershell
.\scripts\start-production.ps1
```

### إلغاء التشغيل التلقائي

```powershell
.\scripts\uninstall-autostart.ps1
```

### ملاحظة عن مسار المشروع

سكربتات `scripts/` مضبوطة افتراضياً على `E:\Purchase_Web_System`. إذا ثبّت المشروع في مسار آخر (مثل `C:\Projects\RoyanProjects`)، عدّل السطر `$ProjectRoot` في:

- `scripts/install-autostart.ps1`
- `scripts/start-production.bat`
- `scripts/ecosystem.config.cjs` (حقل `cwd`)

أو انسخ المجلد إلى `E:\Purchase_Web_System` كما في الأمثلة.

### أوامر PM2 اليومية

| الأمر | الوظيفة |
|-------|---------|
| `pm2 status` | حالة التطبيق |
| `pm2 logs purchase-web-system` | عرض السجلات |
| `pm2 restart purchase-web-system` | إعادة تشغيل |
| `pm2 stop purchase-web-system` | إيقاف مؤقت |

السجلات في مجلد `logs/` داخل المشروع.

---

## 10. استكشاف الأخطاء

### خطأ `EPERM` عند `prisma generate`

يحدث أحياناً على Windows عند قفل الملفات:

```powershell
# أوقف أي عملية Node تعمل
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# أعد المحاولة
npx prisma generate
```

أغلق أيضاً **Prisma Studio** أو أي برنامج يفتح `dev.db`.

### أخطاء بناء Next.js أو شاشة بيضاء

```powershell
# احذف مجلد البناء المؤقت
Remove-Item -Recurse -Force .next

# أعد البناء
npm run build
npm run start
```

### المنفذ 3000 مستخدم

```powershell
# معرفة العملية التي تستخدم المنفذ
netstat -ano | findstr :3000

# إيقاف العملية (استبدل PID برقم العملية)
taskkill /PID <PID> /F
```

أو شغّل على منفذ آخر:

```powershell
$env:PORT=3001; npm run start
```

ثم افتح `http://localhost:3001` وحدّث `NEXTAUTH_URL` في `.env` accordingly.

### فشل تسجيل الدخول بعد التثبيت

```powershell
npm run db:seed
```

تأكد أن `NEXTAUTH_SECRET` و `NEXTAUTH_URL` موجودان في `.env`.

### قاعدة البيانات فارغة أو مفقودة

```powershell
npx prisma db push
npm run db:seed
```

---

## 11. أوامر إضافية مفيدة

| الأمر | الوظيفة |
|-------|---------|
| `npm run db:studio` | واجهة Prisma لعرض/تعديل البيانات |
| `npm run lint` | فحص جودة الكود |
| `npm test` | تشغيل الاختبارات |
| `npm run db:migrate` | ترحيلات Prisma (إن استُخدمت لاحقاً) |

---

## 12. ملخص سريع (نسخ ولصق)

```powershell
git clone https://github.com/AliHammadi2108/RoyanProjects.git
cd RoyanProjects
npm install
# أنشئ .env (انظر القسم 4)
npx prisma db push
npx prisma generate
npm run db:seed
npm run dev
# افتح http://localhost:3000 — المستخدم 1 / admin123
```

---

## 13. نقل النظام لجهاز آخر مع البيانات

1. انسخ مجلد المشروع **أو** استنسخ من Git.
2. انسخ ملف `prisma/dev.db` من الجهاز القديم إلى `prisma/dev.db` على الجهاز الجديد.
3. انسخ `.env` (أو أنشئه من القالب).
4. نفّذ `npm install` ثم `npx prisma generate`.
5. شغّل `npm run dev` أو `npm run build && npm run start`.

> عند النسخ اليدوي لـ `dev.db` لا حاجة لـ `db:seed` إلا إذا أردت إعادة البيانات الافتراضية.

---

## روابط

- المستودع: https://github.com/AliHammadi2108/RoyanProjects
- Node.js LTS: https://nodejs.org/
- DB Browser for SQLite: https://sqlitebrowser.org/
