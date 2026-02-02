
# إصلاح: خطأ "فشل في تحميل ملخص التجديدات"

## المشكلة
يوجد **نسختان متداخلتان** من الوظيفة `report_renewals_summary` في قاعدة البيانات:

| OID | نوع `p_end_month` |
|-----|-------------------|
| 73363 | `date` |
| 73365 | `text` |

عندما يتم استدعاء الوظيفة من الواجهة، PostgreSQL لا يستطيع تحديد أي نسخة يستخدم لأن النص يمكن أن يتحول إلى تاريخ أو يبقى نص → **خطأ: function is not unique**

## الحل
إنشاء Migration جديدة تحذف النسخة القديمة (DATE) وتُبقي فقط النسخة الجديدة (TEXT):

```sql
-- Drop the old overload with DATE parameter
DROP FUNCTION IF EXISTS public.report_renewals_summary(date, text, uuid, text);
```

---

## التفاصيل التقنية

### الملف المتأثر
`supabase/migrations/NEW_*.sql`

### الكود
```sql
-- Fix: Remove duplicate function overload causing "function is not unique" error
-- There are two versions of report_renewals_summary:
--   1. p_end_month date (OID 73363) - OLD
--   2. p_end_month text (OID 73365) - NEW (correct one)
-- 
-- Keep only the TEXT version which handles null/empty string properly

DROP FUNCTION IF EXISTS public.report_renewals_summary(date, text, uuid, text);
```

### لماذا هذا يعمل
- النسخة الجديدة (TEXT) موجودة بالفعل وتعمل بشكل صحيح
- حذف النسخة القديمة (DATE) يُزيل التعارض
- الواجهة تُرسل `p_end_month` كـ TEXT فعلاً (مثل `"2026-02-01"`)

---

## النتيجة المتوقعة

**قبل:** 
```
Toast: فشل في تحميل ملخص التجديدات
Console: function report_renewals_summary is not unique
```

**بعد:**
```
كروت الإحصائيات تظهر بشكل طبيعي:
- إجمالي بحاجة للتجديد: 80
- لم يتم التواصل: 57
- تم إرسال SMS: 23
- إلخ...
```

---

## ملفات متأثرة

| الملف | التغيير |
|-------|---------|
| `supabase/migrations/NEW_*.sql` | حذف النسخة القديمة من الوظيفة |
