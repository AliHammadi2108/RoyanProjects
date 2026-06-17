# تشغيل نظام المشتريات بشكل دائم على Windows

## الهدف
تشغيل التطبيق في وضع الإنتاج (`npm run start`) تلقائياً عند تشغيل الجهاز أو تسجيل الدخول، مع إعادة التشغيل عند تعطل العملية.

## العنوان
**http://localhost:3000**

## المتطلبات
- Node.js مثبت (مثلاً من nodejs.org)
- ملف `.env` في جذر المشروع (يتضمن `NEXTAUTH_URL=http://localhost:3000`)
- بناء الإنتاج مرة واحدة: `npm run build`

## التثبيت (موصى به — PM2)
1. افتح **PowerShell كمسؤول (Run as Administrator)**.
2. نفّذ:
   ```powershell
   cd E:\Purchase_Web_System
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\scripts\install-autostart.ps1
   ```
3. أعد تشغيل الجهاز للتأكد من البدء التلقائي، أو نفّذ `pm2 resurrect`.

## التشغيل اليدوي (بدون تثبيت الخدمة)
```powershell
cd E:\Purchase_Web_System
.\scripts\start-production.ps1
```
أو بعد البناء: `npm run start -- -p 3000`

## الإدارة اليومية (PM2)
| الأمر | الوظيفة |
|--------|---------|
| `pm2 status` | حالة التطبيق |
| `pm2 logs purchase-web-system` | عرض السجلات |
| `pm2 restart purchase-web-system` | إعادة تشغيل |
| `pm2 stop purchase-web-system` | إيقاف مؤقت |
| `pm2 save` | حفظ القائمة للبدء التلقائي |

## إلغاء التشغيل التلقائي
```powershell
cd E:\Purchase_Web_System
.\scripts\uninstall-autostart.ps1
```

## السجلات (Logs)
- `logs/pm2-out.log` و `logs/pm2-error.log` — مخرجات PM2
- `logs/production-YYYY-MM-DD.log` — عند التشغيل عبر `start-production.ps1`

## بعد تحديث الكود
```powershell
cd E:\Purchase_Web_System
git pull
npm install
npm run build
pm2 restart purchase-web-system
```

## ملاحظات
- لا تستخدم `npm run dev` للتشغيل الدائم؛ استخدم وضع الإنتاج فقط.
- تأكد أن المنفذ 3000 غير مستخدم من برنامج آخر.
- قاعدة البيانات SQLite في المسار المحدد بـ `DATABASE_URL` داخل `.env`.
