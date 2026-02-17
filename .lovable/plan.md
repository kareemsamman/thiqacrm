
# إصلاح المزامنة الجماعية — مشكلة اسم العمود

## المشكلة
المزامنة تظهر "نجح 0، فشل 0" لأن كلا الدالتين (`sync-to-xservice` و `bulk-sync-to-xservice`) تحاولان جلب عمود اسمه `sell_price` من جدول `policies`، لكن هذا العمود غير موجود.

الاسم الصحيح للعمود هو **`insurance_price`** وليس `sell_price`.

هذا يسبب فشل الاستعلام بالكامل في `bulk-sync-to-xservice` (سطر 55) فيعود `policies = null` → يرجع الخطأ "Failed to fetch policies" → الدورة تنتهي بـ 0/0.

نفس المشكلة موجودة في `sync-to-xservice` (سطر 59) مما يفسر لماذا المزامنة التلقائية عند إنشاء وثيقة جديدة لا تعمل أيضاً.

---

## التغييرات المطلوبة

### 1. ملف `supabase/functions/bulk-sync-to-xservice/index.ts`
- سطر 55: تغيير `sell_price` إلى `insurance_price` في الـ select
- سطر 119: تغيير `policy.sell_price` إلى `policy.insurance_price` في payload

### 2. ملف `supabase/functions/sync-to-xservice/index.ts`
- سطر 59: تغيير `sell_price` إلى `insurance_price` في الـ select
- سطر 130: تغيير `policy.sell_price` إلى `policy.insurance_price` في payload

### 3. إعادة نشر الدالتين
بعد التعديل سيتم نشر `sync-to-xservice` و `bulk-sync-to-xservice` تلقائياً.

---

## القسم التقني

السبب الجذري: الدالتان تستخدمان `.select("... sell_price ...")` لكن العمود الفعلي في جدول `policies` هو `insurance_price`. قاعدة Supabase ترجع خطأ عند طلب عمود غير موجود، فتفشل الاستعلامات.

التعديل بسيط — تغيير اسم العمود في مكانين لكل دالة (الـ select والـ payload).

كذلك في payload المرسل إلى X-Service سيبقى اسم الحقل `sell_price` (لأنه هكذا يتوقعه X-Service)، لكن القيمة ستأتي من `policy.insurance_price`.
