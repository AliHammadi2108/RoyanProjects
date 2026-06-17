# قائمة مزامنة الإعداد (Setup Sync Checklist)

> **قاعدة للمطوّرين:** أي تغيير يؤثر على التثبيت أو التشغيل الأول يجب تحديث سكربت الإعداد في نفس الـ PR/الالتزام.

## المصدر الوحيد للإعداد

| الملف | الدور |
|-------|--------|
| `scripts/setup-windows.ps1` | **المصدر الوحيد** — npm، .env، Prisma، seed، build، اختصارات، تحقق |
| `setup.bat` | يستدعي `setup-windows.ps1` فقط |
| `installer/post-install.ps1` | غلاف يستدعي `setup-windows.ps1 -InstallerMode` |

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
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-setup-dryrun.ps1

# تثبيت كامل (مستودع Git)
.\setup.bat

# محاكاة ما بعد المُثبّت
powershell -ExecutionPolicy Bypass -File .\installer\post-install.ps1 -DryRun
```

## ملفات المُثبّت (MSI/EXE)

عند تغيير الإعداد، راجع أيضاً:

- `installer/build-installer.ps1`
- `installer/PurchaseSystem.iss`
- `installer/PurchaseSystem.wxs`
- `installer/README.md`

## تسجيل الدخول الافتراضي

بعد `db:seed`: `admin` / `admin123`
