# قائمة مزامنة الإعداد (Setup Sync Checklist)

> **قاعدة للمطورين:** عند تغيير خطوات التثبيت أو التشغيل يجب تحديث قائمة المزامنة في نفس PR/التغيير.

## مصادر الإعداد الرئيسية

| الملف | الدور |
|-------|--------|
| `scripts/setup-windows.ps1` | **المصدر الوحيد** — npm، .env، Prisma، seed، build، اختصارات، فحص |
| `setup.bat` | يستدعي `setup-windows.ps1` فقط |

## عند تغيير الإعداد

| التغيير | الملفات المرتبطة |
|---------|------------------|
| **حزم npm جديدة** | `package.json` + تأكد من `npm install` في `setup-windows.ps1`؛ أضف الحزمة إلى `$RequiredNpmPackages` في دليل التثبيت |
| **مفاتيح .env** | `.env.example` + `$RequiredEnvKeys` في `setup-windows.ps1` |
| **تغيير Prisma schema** | `prisma/schema.prisma` — يُشغَّل `db:push` و `db:seed` تلقائياً |
| **بيانات seed جديدة** (صلاحيات، مستخدمين، إلخ) | `prisma/seed.ts` — يُشغَّل `db:seed` |
| **خطوات build جديدة** | `package.json` scripts + تأكد في `setup-windows.ps1` إن لزم |
| **تشغيل النظام** | `scripts/start-system.bat` |
| **PM2 / autostart** | `scripts/install-autostart.ps1`، `ecosystem.config.cjs` |

## خطوات الإعداد المعتمدة (مرجع)

1. التحقق من Node.js 20+
2. نسخ `.env` من `.env.example` + `NEXTAUTH_SECRET` عشوائي + `NEXTAUTH_URL`
3. `npm install` (يشمل التبعيات مثل xlsx، jspdf، docx)
4. `npx prisma generate`
5. `npm run db:push`
6. `npm run db:seed`
7. `npm run build`
8. اختصار سطح المكتب (إلا مع `-SkipShortcuts`)
9. فحص ما بعد الإعداد (health/artifacts)
10. PM2 autostart اختياري: `-InstallAutostart` أو `scripts/install-autostart.ps1`

## اختبار سريع

```powershell
# فحص ملفات الإعداد دون تثبيت
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-setup-dryrun.ps1

# تثبيت كامل (نسخة Git)
.\setup.bat
```

## بيانات الدخول الافتراضية

من `db:seed`: `admin` / `admin123`
