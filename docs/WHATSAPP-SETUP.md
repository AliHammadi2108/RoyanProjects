# دليل إعداد الإرسال التلقائي لواتساب

هذا الدليل يشرح تفعيل **WhatsApp Cloud API** من Meta لإرسال رسائل واتساب تلقائياً من نظام المشتريات (تنبيهات الاعتماد، حد الطلب، إلخ).

> **ملاحظة:** بدون إعداد API يعمل **الإرسال اليدوي** عبر `wa.me` من أي زر واتساب في النظام.

---

## 1. المتطلبات

- حساب [Meta Business](https://business.facebook.com/)
- تطبيق في [Meta for Developers](https://developers.facebook.com/)
- رقم واتساب Business مربوط بالتطبيق
- خادم النظام مع ملف `.env` في جذر المشروع

---

## 2. إنشاء تطبيق WhatsApp على Meta

1. ادخل إلى [developers.facebook.com](https://developers.facebook.com/) → **My Apps** → **Create App**.
2. اختر نوع **Business** ثم أكمل البيانات.
3. من لوحة التطبيق أضف منتج **WhatsApp**.
4. في **WhatsApp → API Setup**:
   - اختر أو أنشئ **WhatsApp Business Account**.
   - أضف رقم هاتف للاختبار (أو رقم الإنتاج بعد التحقق).
5. انسخ:
   - **Temporary access token** (للتجربة) أو أنشئ **System User Token** دائم من Business Settings.
   - **Phone number ID** — رقم طويل مثل `123456789012345` (**ليس** رقم الهاتف نفسه).

---

## 3. إضافة المتغيرات إلى ملف `.env`

افتح `E:\Purchase_Web_System\.env` وأضف (أو عدّل) الأسطر التالية:

```env
# رمز الوصول من Meta (System User Token موصى به للإنتاج)
WHATSAPP_CLOUD_API_TOKEN="EAAxxxxxxxxxxxxxxxxxxxxxxxx"

# معرّف رقم واتساب من لوحة API Setup (Phone number ID)
WHATSAPP_PHONE_NUMBER_ID="123456789012345"

# تفعيل الإرسال التلقائي عند إنشاء التنبيهات
WHATSAPP_AUTO_NOTIFY="true"

# رمز الدولة الافتراضي — اليمن
WHATSAPP_DEFAULT_COUNTRY_CODE="967"

# اختياري: مستلم افتراضي عند غياب رقم الطرف/المستخدم
WHATSAPP_DEFAULT_RECIPIENT="+967773084555"
```

### تحذيرات مهمة

| المتغير | الوصف |
|---------|--------|
| `WHATSAPP_CLOUD_API_TOKEN` | سرّي — لا ترفعه إلى Git |
| `WHATSAPP_PHONE_NUMBER_ID` | معرّف Meta الرقمي — **ليس** `+967...` |
| `WHATSAPP_AUTO_NOTIFY` | `true` لتفعيل الإرسال التلقائي، `false` لتعطيله |

---

## 4. إعادة تشغيل النظام

بعد حفظ `.env`:

```bat
cd E:\Purchase_Web_System
npm run pm2:restart
```

أو:

```bat
scripts\restart-system.bat
```

---

## 5. التحقق من الإعداد

### من واجهة النظام

1. سجّل دخول كمدير.
2. اذهب إلى **إدارة → إعدادات واتساب** (`/settings/whatsapp`).
3. تحقق من:
   - **WhatsApp Cloud API**: أخضر = مُعدّ
   - **الإرسال التلقائي**: مفعّل
4. تأكد أن **رقم هاتفك** مسجّل في الملف الشخصي (مثال: `+967773084555`).
5. اضغط **إرسال رسالة اختبار** — يجب أن تصلك رسالة على واتساب.

### من سطر الأوامر (اختياري)

```powershell
# بعد إعادة التشغيل — راقب السجلات عند إنشاء تنبيه
npm run pm2:logs
```

ابحث عن:
- `[whatsapp] auto notification sent:` — نجاح
- `[whatsapp] auto notification failed:` — خطأ (تحقق من التوكن أو الرقم)

---

## 6. متى يُرسل النظام تلقائياً؟

يُرسل واتساب تلقائياً عند:

- إنشاء **تنبيه** جديد للمستخدم (اعتماد، رفض، حد طلب، إلخ)
- شريط أن:
  - `WHATSAPP_CLOUD_API_TOKEN` و `WHATSAPP_PHONE_NUMBER_ID` مُعرَّفان
  - `WHATSAPP_AUTO_NOTIFY` ليس `false`
  - المستخدم المستهدف لديه **رقم هاتف** صالح في ملفه
  - المستخدم **نشط**

الإرسال اليدوي من نماذج الوثائق والتقارير يعمل عبر زر **إرسال تلقائي** في نافذة واتساب عند توفر API.

---

## 7. تنسيق أرقام اليمن (+967)

| المدخل | يُحوَّل إلى |
|--------|-------------|
| `+967773084555` | `967773084555` |
| `967773084555` | `967773084555` |
| `0773084555` | `967773084555` |
| `773084555` | `967773084555` |

---

## 8. استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| الإرسال التلقائي معطّل | أضف المفاتيح في `.env` وفعّل `WHATSAPP_AUTO_NOTIFY=true` ثم أعد التشغيل |
| `Phone number ID` خاطئ | استخدم المعرّف من Meta وليس رقم الهاتف |
| Token منتهي | أنشئ System User Token دائم من Meta Business |
| الرسالة لا تصل | تأكد أن رقم المستلم مسجّل في واتساب وأن الرقم في `.env` للمستخدم صحيح |
| `(#131030) Recipient phone number not in allowed list` | في وضع التطوير أضف الرقم في **Test recipients** بلوحة Meta |
| لا يظهر زر الإرسال التلقائي | تحقق من صلاحية `whatsapp.send` أو `operations.print` |

---

## 9. الصلاحيات

| الصلاحية | الاستخدام |
|----------|-----------|
| `whatsapp.configure` | صفحة إعدادات واتساب + اختبار الاتصال |
| `whatsapp.send` | إرسال يدوي/تلقائي من الوثائق |
| `whatsapp.auto` | إرسال عبر API من العمليات |

مدير النظام (`admin`) يملك جميع الصلاحيات تلقائياً بعد `npm run db:seed`.

---

## 10. الأمان

- **لا تخزّن** `WHATSAPP_CLOUD_API_TOKEN` في قاعدة البيانات.
- **لا ترفع** ملف `.env` إلى Git.
- يمكن تبديل `WHATSAPP_AUTO_NOTIFY` من `/settings/whatsapp` (يُحدَّث `.env` مباشرة) — أعد تشغيل pm2 بعد التغيير.

---

## 11. مراجع Meta

- [WhatsApp Cloud API — Get Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Send Text Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/text-messages)
- [Access Tokens](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started#system-user-access-tokens)
