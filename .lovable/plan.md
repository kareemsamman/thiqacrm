
# خطة إصلاح مشكلتين: بطاقات الملخص + إصلاح دفعات الإلزامي

## المشكلة 1: بطاقات ملخص التجديدات لا تظهر

### السبب
يوجد **نسختان** من دالة `report_renewals_summary` في قاعدة البيانات:
- النسخة القديمة: معامل واحد فقط `(p_end_month)`
- النسخة الجديدة: 4 معاملات `(p_end_month, p_policy_type, p_created_by, p_search)`

عند استدعاء الدالة، PostgreSQL لا يستطيع تحديد أي نسخة يستخدم، فيظهر خطأ:
```
function report_renewals_summary(date) is not unique
```

### الحل
حذف النسخة القديمة من الدالة والإبقاء على النسخة الجديدة فقط.

```sql
-- حذف النسخة القديمة ذات المعامل الواحد
DROP FUNCTION IF EXISTS public.report_renewals_summary(date);
```

---

## المشكلة 2: خطأ "Failed to fetch" عند إصلاح دفعات الإلزامي

### السبب
الكود يستخدم `.in('policy_id', policyIds)` حيث `policyIds` يحتوي على **1517+ عنصر**. 
Supabase/PostgREST لديه حدود على عدد العناصر في `.in()` مما يسبب فشل الاستعلام.

### الحل
تقسيم الاستعلامات إلى دفعات أصغر (500 عنصر كحد أقصى).

---

## التغييرات المطلوبة

### 1. Database Migration
```sql
-- إزالة الدالة المكررة
DROP FUNCTION IF EXISTS public.report_renewals_summary(date);
```

### 2. ملف `src/pages/WordPressImport.tsx`
تعديل دالة `handleFixElzamiPayments` لتقسيم استعلامات `.in()`:

```typescript
// بدلاً من:
const { data: paidBatch } = await supabase
  .from('policy_payments')
  .select('policy_id')
  .in('policy_id', policyIds)  // ← 1517 عنصر = خطأ!

// نستخدم:
// تقسيم policyIds إلى مجموعات من 500
const chunkSize = 500;
for (let i = 0; i < policyIds.length; i += chunkSize) {
  const chunk = policyIds.slice(i, i + chunkSize);
  const { data } = await supabase
    .from('policy_payments')
    .select('policy_id')
    .in('policy_id', chunk);
  // ...
}
```

---

## ملخص التغييرات

| الملف | التغيير |
|------|---------|
| **Migration** | حذف `report_renewals_summary(date)` المكررة |
| **WordPressImport.tsx** | تقسيم استعلام `.in()` إلى chunks بحجم 500 |

## النتائج المتوقعة

1. ✅ بطاقات الملخص ستظهر بشكل صحيح مع الأعداد
2. ✅ زر "إصلاح الدفعات" سيعمل بدون أخطاء
3. ✅ الأعداد ستتطابق بين الملخص والجدول
