
# إصلاح مزامنة X-Service + إضافة مزامنة جماعية

## المشاكل الحالية

### 1. المزامنة التلقائية لا تعمل (خطأ في رابط API)
السبب: حقل `رابط API` في الإعدادات يحتوي على الرابط الكامل:
`https://ikwslbhjinlzsfrwyjom.supabase.co/functions/v1/ab-sync-receive`

لكن الكود يضيف `/functions/v1/ab-sync-receive` مرة ثانية، فيصبح الرابط النهائي:
`https://...supabase.co/functions/v1/ab-sync-receive/functions/v1/ab-sync-receive` (خطأ)

نفس المشكلة موجودة في:
- Edge Function `sync-to-xservice` (السطر 136)
- زر "اختبار الاتصال" في الصفحة (السطر 114)
- زر "مسح بيانات" في الصفحة (السطر 136)

### 2. الصفحة لا تنتقل لملف العميل بعد الحفظ
الكود الحالي يفعل ذلك فعلاً (السطر 1752: `navigate(/clients/${clientId})`) -- لكن فقط عند إغلاق نافذة النجاح. سأتحقق إذا كان هناك خطأ في التنفيذ.

### 3. لا توجد طريقة لمزامنة الوثائق الموجودة (1342 وثيقة خدمات)
يجب إضافة زر "مزامنة جماعية" في صفحة إعدادات X-Service.

---

## التغييرات المطلوبة

### 1. إصلاح رابط API في كل مكان

**الحل**: تغيير المنطق ليستخدم `api_url` كقاعدة فقط (بدون مسار الدالة)، وتحديث الـ placeholder والتسمية لتوضيح ذلك. أيضاً تحديث القيمة المخزنة في قاعدة البيانات.

**ملف `supabase/functions/sync-to-xservice/index.ts`**:
- تغيير ليقبل `api_url` كاملاً أو كقاعدة: إذا كان الرابط يحتوي على `/functions/v1/` نستخدمه مباشرة، وإلا نضيف المسار.

**ملف `src/pages/XServiceSettings.tsx`**:
- نفس الإصلاح لزر الاختبار وزر المسح.
- تغيير الـ placeholder ليوضح: `https://xxxxx.supabase.co`
- إضافة ملاحظة توضيحية تحت الحقل.

### 2. إضافة مزامنة جماعية (Bulk Sync)

**ملف `src/pages/XServiceSettings.tsx`**:
- إضافة كارد جديد "مزامنة جماعية" مع:
  - عرض عدد الوثائق المؤهلة (ROAD_SERVICE + ACCIDENT_FEE_EXEMPTION)
  - زر "بدء المزامنة الجماعية"
  - شريط تقدم (Progress bar)
  - عداد: تم X من Y

**ملف `supabase/functions/sync-to-xservice/index.ts`** (أو دالة جديدة `bulk-sync-to-xservice`):
- إنشاء Edge Function جديد `bulk-sync-to-xservice` يقبل قائمة `policy_ids` أو يجلب كل الوثائق المؤهلة
- يعالج بدفعات (batches of 10) لتجنب timeout
- يسجل النتائج في `xservice_sync_log`

**المنطق**: 
- الصفحة تجلب عدد الوثائق المؤهلة أولاً
- عند الضغط، ترسل دفعات من 20 وثيقة كل مرة عبر استدعاءات متتالية
- كل دفعة تُحدّث شريط التقدم
- في النهاية تعرض ملخص: نجح X، فشل Y

### 3. إصلاح التنقل بعد حفظ الوثيقة

الكود الحالي يبدو صحيحاً -- سأتأكد من أن `onSaved` يُنفذ بشكل صحيح وأن الـ navigate يعمل. إذا كان المستخدم يقصد أن الصفحة لا تتحدث (refresh) بعد الحفظ، سأضيف invalidation للبيانات.

---

## القسم التقني

### ملفات سيتم تعديلها:
1. **`supabase/functions/sync-to-xservice/index.ts`** -- إصلاح بناء الرابط (يكتشف تلقائياً إذا كان الرابط كاملاً أو قاعدة)
2. **`src/pages/XServiceSettings.tsx`** -- إصلاح أزرار الاختبار والمسح + إضافة كارد المزامنة الجماعية مع شريط تقدم

### ملفات جديدة:
3. **`supabase/functions/bulk-sync-to-xservice/index.ts`** -- يقبل `{ offset, limit }` ويعالج دفعة من الوثائق، يعيد `{ synced, failed, total, done }`

### تدفق المزامنة الجماعية:

```text
XServiceSettings (UI)
  |-- GET count of eligible policies
  |-- User clicks "بدء المزامنة الجماعية"  
  |-- Loop:
      |-- POST bulk-sync-to-xservice { offset: 0, limit: 20 }
      |-- Update progress bar
      |-- POST bulk-sync-to-xservice { offset: 20, limit: 20 }
      |-- Update progress bar
      |-- ... until done
  |-- Show summary toast
```

### إصلاح الرابط:

```text
// Before (broken):
syncUrl = apiUrl + "/functions/v1/ab-sync-receive"
// If apiUrl = "https://x.supabase.co/functions/v1/ab-sync-receive"
// Result: "https://x.supabase.co/functions/v1/ab-sync-receive/functions/v1/ab-sync-receive" (WRONG)

// After (fixed):
// Detect if apiUrl already contains the function path
if (apiUrl.includes("/functions/v1/")) {
  syncUrl = apiUrl; // use as-is
} else {
  syncUrl = apiUrl + "/functions/v1/ab-sync-receive"; // append path
}
```
