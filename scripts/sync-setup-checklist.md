# قائمة مزامنة الإعداد (Setup Sync Checklist)

> **قاعدة للمطوّرين:** أي تغيير يؤثر على التثبيت أو التشغيل الأول يجب تحديث سكربت الإعداد في نفس الـ PR/الالتزام.

## المصدر الوحيد للإعداد

| الملف | الدور |
|-------|--------|
| `scripts/setup-windows.ps1` | **المصدر الوحيد** — npm، .env، Prisma، seed، build، اختصارات، تحقق |
| `setup.bat` | يستدعي `setup-windows.ps1` فقط |
| `scripts/install-node.ps1` | مساعد اختياري لتثبيت Node عبر winget قبل `setup.bat` |


## مثبّت EXE/MSI (قديم — لا تستخدمه)

`PurchaseSystem-Setup.exe` (Inno) و `installer/post-install.ps1` أُزيلا من المستودع. التثبيت الرسمي: Node 20+ ثم `setup.bat` من جذر المستروع بعد الاستنساخ.
## متى تحدّث الإعداد؟

| التغيير | الملفات المطلوبة |
|---------|------------------|
| **حزمة npm جديدة** | `package.json` + تأكد أن `npm install` في `setup-windows.ps1` كافٍ؛ أضف الحزمة لـ `$RequiredNpmPackages` إن كانت حرجة للتشغيل |
| **متغير بيئة جديد** | `.env.example` + `$RequiredEnvKeys` في `setup-windows.ps1` |
| **تغيير Prisma schema** | `prisma/schema.prisma` — الإعداد يشغّل `db:push` و `db:seed` تلقائياً |
| **بيانات seed جديدة** (صلاحيات، ثيم، مستخدم…) | `prisma/seed.ts` — الإعداد يشغّل `db:seed` |
| **سكربت build جديد** | `package.json` scripts + خطوة في `setup-windows.ps1` إن لزم |
| **مسار تشغيل جديد** | `installer/start-installed.bat`، `scripts/start-system.bat` |
| **PM2 / autostart** | `scripts/install-autostart.ps1`، `ecosystem.config.cjs` |

## خطوات الإعداد الكاملة (الحالية)

1. التحقق من Node.js 20+
2. نسخ `.env` من `.env.example` + `NEXTAUTH_SECRET` عشوائي + `NEXTAUTH_URL`
3. `npm install` (جميع التبعيات بما فيها xlsx، jspdf، docx)
4. `npx prisma generate`
5. `npm run db:push`
6. `npm run db:seed`
7. `npm run build`
8. اختصار سطح المكتب (و قائمة ابدأ في وضع المُثبّت)
9. تحقق من الملفات (health/artifacts)
10. PM2 autostart اختياري: `-InstallAutostart` أو `scripts/install-autostart.ps1`

## اختبار محلي

```powershell
# تجربة منطق الإعداد دون تعديل
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1 -DryRun

# تثبيت كامل (مستودع Git) — يتطلب Node.js 20+ مسبقاً
.\setup.bat
```

## ملفات المُثبّت (MSI/EXE) — مُلغاة

لا تُحدَّث ملفات `installer/` في المستودع. التثبيت الرسمي: **Node 20+** ثم **`setup.bat`** (انظر `docs/INSTALL.md`).

## تسجيل الدخول الافتراضي

بعد `db:seed`: `admin` / `admin123`
