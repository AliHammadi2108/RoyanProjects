# مُثبّت نظام المشتريات (MSI / EXE)

هذا المجلد يحتوي على ملفات بناء **مُثبّت Windows** لتثبيت المشروع على أي جهاز دون نسخ المجلد يدوياً.

## ما الذي يُثبَّت؟

- نسخة من **كود المشروع** (بدون `node_modules`، `.next`، `.git`، `prisma/dev.db`، أو `.env`)
- بعد التثبيت يُشغَّل **`post-install.ps1`** تلقائياً (أو يدوياً) لـ: `npm install`، Prisma، seed، و `npm run build`
- اختصار **«نظام المشتريات»** على سطح المكتب وقائمة ابدأ (Inno Setup + سكربت ما بعد التثبيت)

## متطلبات جهاز المطوّر (لبناء المُثبّت)

| الأداة | الغرض |
|--------|--------|
| **WiX Toolset 3.11+** (`heat`, `candle`, `light`) | يُنتج `PurchaseSystem-Setup.msi` (مفضّل) |
| **أو Inno Setup 6+** (`iscc`) | يُنتج `PurchaseSystem-Setup.exe` |
| **PowerShell 5.1+** | سكربت التجهيز والبناء |

تثبيت سريع (اختر واحداً):

```powershell
winget install WiXToolset.WiXToolset
# أو
winget install JRSoftware.InnoSetup
```

## بناء ملف التثبيت

من جذر المشروع `E:\Purchase_Web_System`:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\build-installer.ps1
```

- يُنشETE ملفات المشروع إلى `installer\staging\app`
- يحاول **WiX** أولاً → `installer\dist\PurchaseSystem-Setup.msi`
- إن لم يتوفر WiX يستخدم **Inno Setup** → `installer\dist\PurchaseSystem-Setup.exe`

خيارات:

```powershell
.\installer\build-installer.ps1 -PreferInno    # إجبار Inno
.\installer\build-installer.ps1 -SkipStage     # إعادة البناء دون إعادة التجهيز
```

## متطلبات جهاز المستخدم النهائي

1. **Windows 10/11** (64-bit)
2. **Node.js 20 LTS أو أحدث** — [https://nodejs.org/](https://nodejs.org/)  
   (المُثبّت **لا** يضم Node.js portable افتراضياً؛ يجب تثبيت Node على الجهاز المستهدف)
3. اتصال **إنترنت** أثناء أول تشغيل لـ `post-install` (تحميل حزم npm)
4. صلاحيات **مدير** للتثبيت في `Program Files`

## تثبيت النظام على جهاز آخر

1. انسخ **`PurchaseSystem-Setup.msi`** أو **`PurchaseSystem-Setup.exe`** من `installer\dist\`
2. شغّل الملف كمسؤول (Next → اختيار المسار الافتراضي `C:\Program Files\PurchaseWebSystem` أو مسار آخر)
3. انتظر انتهاء **إعداد ما بعد التثبيت** (قد يستغرق عدة دقائق)
4. إن ظهرت رسالة عن Node.js: ثبّت Node 20+ ثم شغّل:

```powershell
cd "C:\Program Files\PurchaseWebSystem"
powershell -ExecutionPolicy Bypass -File .\installer\post-install.ps1
```

5. شغّل التطبيق من اختصار **«نظام المشتريات»** أو:

```text
C:\Program Files\PurchaseWebSystem\installer\start-installed.bat
```

6. افتح المتصفح: `http://localhost:3000` — بعد seed الافتراضي: `admin` / `admin123`

## إزالة التثبيت

- **MSI/EXE:** من «إضافة أو إزالة البرامج» → Purchase Web System / نظام المشتريات  
- يُزال مجلد التثبيت؛ قد تبقى `node_modules` و`.next` حسب نوع المُثبّت (Inno يحذفها في إلغاء التثبيت)

## ملفات مهمة

| ملف | الوظيفة |
|-----|---------|
| `build-installer.ps1` | تجهيز + بناء MSI/EXE |
| `PurchaseSystem.wxs` | تعريف WiX |
| `PurchaseSystem.iss` | تعريف Inno Setup |
| `post-install.ps1` | npm، Prisma، build، اختصارات |
| `start-installed.bat` | تشغيل الإنتاج بعد التثبيت |
| `dist\` | مخرجات البناء |

راجع أيضاً: `docs\INSTALL.md` — قسم «تثبيت عبر ملف MSI».

