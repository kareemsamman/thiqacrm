
الأعراض التي تظهر عندك (فشل تحميل الفاتورة + فشل إرسال SMS بعد إنشاء وثيقة جديدة) لها سبب واضح في الكود الحالي:

- زر **طباعة الفاتورة** في `PolicySuccessDialog` يستدعي `send-invoice-sms` مع `skip_sms: true`، لكن **الـ backend function نفسها تُسقِط الطلب قبل الطباعة** لأنها تشترط وجود ملفات بوليصة في `media_files` + تشترط رقم هاتف العميل—even عند `skip_sms=true`.
- زر **إرسال SMS** يفشل غالبًا لنفس السبب (عدم وجود ملفات بوليصة بعد الإنشاء مباشرة)، بينما المطلوب منك: “أرسل رابط الـ HTML للعميل حتى لو لا توجد ملفات بوليصة”.

هذه الخطة ستصلّح “Create new policy” بالكامل + تجعل كل HTML customer document يحمل Footer موحّد (إيميل/هواتف/واتساب/عنوان) قابل للتعديل من الأدمن، وتضيف “Send HTML link to customer” حيث يلزم.

---

## 1) إصلاح جذري: الطباعة يجب أن تعمل حتى بدون ملفات وبدون رقم هاتف
### التغيير المطلوب (Backend)
**الملف:** `supabase/functions/send-invoice-sms/index.ts`

**المشكلة الحالية:**
- يوجد شرط صارم:
  - إذا لا توجد ملفات بوليصة → يرجع 400
  - إذا لا يوجد رقم هاتف للعميل → يرجع 400  
وهذا يحدث قبل مسار `skip_sms`.

**الحل:**
- تعديل المنطق بحيث:
  - عند `skip_sms=true`:
    - لا نمنع الطباعة بسبب عدم وجود ملفات
    - لا نمنع الطباعة بسبب عدم وجود رقم هاتف
    - نولّد الـ HTML invoice ونرفعه على الـ CDN ونرجع `ab_invoice_url` دائمًا
  - عند `skip_sms=false` (إرسال SMS):
    - الهاتف مطلوب
    - الملفات ليست شرطًا للإرسال (سنرسل رابط الفاتورة HTML دائمًا + روابط ملفات البوليصة فقط إذا موجودة)

**نتيجة متوقعة:**
- بعد إنشاء وثيقة جديدة (حتى لو بدون رفع أي ملف)، زر “طباعة الفاتورة” يفتح الرابط فورًا.

---

## 2) إصلاح جذري للـ SMS: إرسال رابط الـ HTML دائمًا (والملفات اختياري)
### التغيير المطلوب (Backend)
**الملف:** `supabase/functions/send-invoice-sms/index.ts`

**الحل:**
- إزالة/تخفيف شرط “وجود ملفات بوليصة” عند الإرسال.
- بناء رسالة SMS بحيث:
  - تحتوي دائمًا على رابط الفاتورة HTML (`ab_invoice_url`)
  - إذا كانت هناك ملفات بوليصة → نضيف `{{all_policy_urls}}`
  - إذا لا توجد ملفات → نستبدل `{{all_policy_urls}}` بسطر بسيط مثل: “ملفات البوليصة سيتم إرسالها لاحقًا” أو نتركه فارغًا (حسب ما نختاره في التنفيذ)

**ملاحظة مهمة:**
هذا يحقق طلبك: “send for the customer the html to his phone number not only print”.

---

## 3) نفس الإصلاح للباقة (Package)
### التغيير المطلوب (Backend)
**الملف:** `supabase/functions/send-package-invoice-sms/index.ts`

**المشكلة الحالية:**
- يوجد شرط صارم يمنع العملية إذا لا توجد ملفات لأي policy أو للـ main policy حتى لو `skip_sms=true`.

**الحل:**
- عند `skip_sms=true`:
  - لا نمنع طباعة فاتورة الباقة بسبب نقص الملفات أو رقم الهاتف
- عند `skip_sms=false`:
  - الهاتف مطلوب
  - الملفات ليست شرطًا (نرسل رابط فاتورة الباقة HTML دائمًا، ونرفق روابط الملفات إن وجدت)

---

## 4) Footer موحّد في كل HTML “يصل للعميل” مع بيانات قابلة للتعديل من الأدمن
### ما هو المطلوب بالضبط
أنت تريد أن كل مستند HTML يُفتح للعميل يحتوي في الأسفل على:
- Email
- أكثر من رقم هاتف (array)
- WhatsApp link
- Location

وأن الأدمن يقدر يعدلهم (تم إضافة UI في `SmsSettings` بالفعل، وسنستخدم نفس البيانات في كل HTML template).

### التغييرات المطلوبة (Backend – Templates)
سنُدخل نفس footer block (نفس الشكل) داخل هذه المستندات (الأهم للعميل):
1) `supabase/functions/send-invoice-sms/index.ts` (فاتورة وثيقة مفردة)
2) `supabase/functions/send-package-invoice-sms/index.ts` (فاتورة باقة)
3) (موجودة بالفعل) `supabase/functions/generate-client-payments-invoice/index.ts`
4) (موجودة/معدلة) `supabase/functions/generate-payment-receipt/index.ts`
5) (موجودة/معدلة) `supabase/functions/generate-client-report/index.ts`

**تنفيذياً داخل كل function:**
- قراءة `sms_settings` لأخذ:
  - `company_email, company_phones, company_whatsapp, company_location`
- تطبيع رقم الواتساب إلى `wa.me/972...`
- إضافة HTML/CSS للـ footer بشكل موحّد

---

## 5) تحسين UX: إظهار سبب الفشل الحقيقي بدل “فشل في تحميل الفاتورة”
### التغييرات المطلوبة (Frontend)
**الملف:** `src/components/policies/PolicySuccessDialog.tsx`

**المشكلة الحالية:**
- عند الخطأ نعرض toast عام: “فشل في تحميل الفاتورة”
- هذا يخفي السبب الحقيقي (مثلاً: انتهت الجلسة/الخدمة غير مفعلة/أي رسالة من الـ backend)

**الحل:**
- عند فشل `supabase.functions.invoke`:
  - استخراج رسالة الخطأ الحقيقية من response body (نفس أسلوب `Login.tsx` الذي يحاول `ctx.json()`)
  - عرض الرسالة للمستخدم بالعربي (مثلاً: “خدمة الرسائل غير مفعلة” أو “انتهت الجلسة، سجل الدخول مرة أخرى”)
- إضافة state بسيط لعرض “معلومة” داخل الـ dialog عندما:
  - لا يوجد رقم هاتف للعميل
  - خدمة SMS غير مفعلة
  - لا توجد ملفات (لكن لن نمنع الإرسال لأننا سنرسل رابط الـ HTML)

---

## 6) إصلاح خطأ إضافي يسبب فشل/لخبطة: استدعاء خاطئ لـ send-invoice-sms من PolicyWizard
### التغيير المطلوب (Frontend)
**الملف:** `src/components/policies/PolicyWizard.tsx`

**المشكلة الحالية:**
هناك “fire-and-forget” call عند الحفظ:
```ts
supabase.functions.invoke('send-invoice-sms', {
  body: { policyId: policyIdToUse, phoneNumber: clientPhone }
})
```
لكن الـ function تتوقع `policy_id` (وليس `policyId`) ولا تحتاج `phoneNumber`.

**الحل المقترح (الأفضل مع الـ popup الجديد):**
- إزالة هذا الاستدعاء التلقائي نهائيًا (لأنك تريد الاختيار من الـ popup: طباعة أو إرسال)
- هذا يمنع محاولات إرسال غير مقصودة ويمنع أي تعارض مع `invoices_sent_at`.

---

## 7) التوافق + الجودة
### تحديث CORS headers (حسب قواعد المشروع)
في الملفات التي سنعدلها (`send-invoice-sms` و`send-package-invoice-sms`) سنحدّث `corsHeaders` إلى النسخة التي تشمل كل headers المطلوبة.

### عدم تجميد الواجهة
- أزرار الـ dialog ستبقى non-blocking مع spinner موجود
- سنضيف skeleton/disabled states عند فحص الإعدادات إن احتجنا (اختياري)

---

## ملفات سيتم تعديلها
### Frontend
- `src/components/policies/PolicySuccessDialog.tsx`
- `src/components/policies/PolicyWizard.tsx`

### Backend functions
- `supabase/functions/send-invoice-sms/index.ts`
- `supabase/functions/send-package-invoice-sms/index.ts`
- (تحقق/لمس بسيط فقط إن لزم) `supabase/functions/generate-invoice-pdf/index.ts` لضمان نفس footer لو كان مستخدمًا في أي مسار عندك

---

## معايير القبول (Acceptance Criteria)
1) إنشاء وثيقة جديدة بدون رفع ملفات:
   - زر “طباعة الفاتورة” يفتح رابط HTML بنجاح
   - زر “إرسال SMS للعميل” يرسل SMS يحتوي رابط الفاتورة HTML
2) إنشاء وثيقة مع ملفات:
   - SMS يحتوي رابط الفاتورة + روابط ملفات البوليصة
3) تعديل بيانات الشركة من صفحة الأدمن (إيميل/هواتف/واتساب/عنوان):
   - أي Invoice/Receipt/Report HTML جديد يظهر Footer بالبيانات الجديدة
4) عند أي فشل:
   - يظهر سبب واضح للمستخدم بدل رسالة عامة

---

## خطوات اختبار End-to-End (ضرورية قبل الإقفال)
1) سجّل الدخول ثم أنشئ Policy جديد بدون ملفات واضغط “طباعة الفاتورة”.
2) اضغط “إرسال SMS” وتأكد وصول الرسالة ورابط الـ HTML يعمل على هاتف العميل.
3) كرر نفس الاختبار مع Policy فيها ملفات، وتأكد أن روابط الملفات تظهر في الـ SMS.
4) من “إعدادات SMS → بيانات الشركة” غيّر أرقام الهواتف/الإيميل، ثم ولّد فاتورة جديدة وتأكد أن الـ footer تغيّر.
