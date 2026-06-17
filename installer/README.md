# مُثبّت Windows (EXE) — نظام المشتريات

يُنشئ هذا المجلد ملف **`PurchaseSystem-Setup.exe`** لتوزيع النظام على أجهزة Windows دون الحاجة إلى Git.

## المتطلبات على جهاز البناء

| الأداة | الغرض |
|--------|--------|
| **Inno Setup 6+** (`iscc`) | إنشاء `installer\dist\PurchaseSystem-Setup.exe` |
| **PowerShell 5.1+** | التشغيل والتجهيز |

```powershell
winget install JRSoftware.InnoSetup
```

## بناء ملف EXE

من جذر المشروع `E:\Purchase_Web_System`:

```powershell
powershell -ExecutionPolicy Bypass -File .\installer\build-installer.ps1
```

- يُنسخ المشروع إلى `installer\staging\app` (بدون `node_modules`، `.next`، `.git`، `prisma\dev.db`، `.env`)
- يُشغَّل `iscc` → **`installer\dist\PurchaseSystem-Setup.exe`**

خيارات:

```powershell
.\installer\build-installer.ps1 -SkipStage    # إعادة التجميع دون نسخ الملفات
.\installer\build-installer.ps1 -PreferWix      # محاولة WiX (MSI) أولاً إن وُجد
```

## متطلبات جهاز المستخدم النهائي

1. **Windows 10/11** (64-bit)
2. **Node.js 20 LTS أو أحدث** — [https://nodejs.org/](https://nodejs.org/)  
   المُثبّت يعرض تنبيهاً إن لم يكن Node موجوداً، ويُOffer تثبيت **winget** أثناء `post-install.ps1`.
3. صلاحيات **مسؤول** لأن التثبيت الافتراضي في `Program Files`.

## خطوات التثبيت على PC آخر

1. انسخ **`PurchaseSystem-Setup.exe`** من `installer\dist\` (لا يُرفع إلى Git).
2. شغّل المُثبّت → اختر المسار (افتراضي: `C:\Program Files\PurchaseWebSystem`).
3. انتظر **إعداد npm / Prisma / seed / build** (قد يستغرق عدة دقائق).
4. إن فشل الإعداد بسبب Node: ثبّت Node ثم من مجلد التثبيت:

```powershell
cd "C:\Program Files\PurchaseWebSystem"
.\setup.bat
```

5. شغّل النظام من اختصار **«نظام المشتريات»** أو:

```text
C:\Program Files\PurchaseWebSystem\installer\start-installed.bat
```

6. المتصفح: `http://localhost:3000` — مستخدم seed: `admin` / `admin123`

## الملفات المهمة

| ملف | الدور |
|-----|--------|
| `PurchaseSystem.iss` | تعريف Inno Setup |
| `post-install.ps1` | يستدعي `..\scripts\setup-windows.ps1` |
| `build-installer.ps1` | تجهيز الملفات وتشغيل `iscc` |
| `start-installed.bat` | تشغيل الإنتاج بعد التثبيت |

**مصدر الإعداد الوحيد:** `scripts\setup-windows.ps1` (يُستدعى أيضاً من `setup.bat` في جذر المشروع).