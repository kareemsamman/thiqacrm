
# خطة: استبعاد العملاء الذين تم تجديد جميع وثائقهم من تبويب التجديدات

## المشكلة الحالية

في تبويب "التجديدات" بصفحة `/reports/policies`:
- العميل "ايمان عليان" يظهر رغم أنه تم تجديد جميع وثائقه
- عند النقر على الصف يظهر "الوثائق المنتهية: 0 وثيقة"
- يجب عدم ظهور العملاء الذين ليس لديهم وثائق تحتاج تجديد

## سبب المشكلة

الدالة `report_renewals` في الـ migration الأخير (`20260202150200`) **لا تحتوي على فلتر** لاستبعاد الوثائق التي تم تجديدها (يوجد وثيقة أحدث لنفس السيارة ونوع التأمين).

الـ migration السابق (`20260202102930`) كان يحتوي على الفلتر الصحيح باستخدام `NOT EXISTS` ولكن تمت إعادة كتابة الدالة بدون هذا الفلتر.

## الحل

### 1. تحديث دالة `report_renewals`

إضافة شرط `NOT EXISTS` لاستبعاد الوثائق المُجددة (التي يوجد لها وثيقة أحدث لنفس العميل + السيارة + نوع التأمين):

```sql
-- داخل WHERE clause:
AND NOT EXISTS (
  SELECT 1 FROM policies newer
  WHERE newer.client_id = p.client_id
    AND newer.car_id = p.car_id
    AND newer.policy_type_parent = p.policy_type_parent
    AND newer.cancelled = false
    AND newer.transferred = false
    AND newer.start_date > p.start_date
    AND newer.end_date > CURRENT_DATE
)
```

### 2. تحديث دالة `report_renewals_summary`

نفس الشرط يجب إضافته ليتطابق العدد في البطاقات مع الجدول.

### 3. تحديث دالة `get_client_renewal_policies`

التأكد من أن الدالة تستخدم نفس الفلتر عند عرض تفاصيل وثائق العميل.

## التغييرات التقنية

### Migration SQL جديد

```sql
-- 1. تحديث report_renewals لاستبعاد الوثائق المُجددة
CREATE OR REPLACE FUNCTION public.report_renewals(...)
...
WHERE p.cancelled = false
  AND p.transferred = false
  -- NEW: استبعاد الوثائق التي تم تجديدها
  AND NOT EXISTS (
    SELECT 1 FROM policies newer
    WHERE newer.client_id = p.client_id
      AND newer.car_id = p.car_id
      AND newer.policy_type_parent = p.policy_type_parent
      AND newer.cancelled = false
      AND newer.transferred = false
      AND newer.start_date > p.start_date
      AND newer.end_date > CURRENT_DATE
  )
```

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| قاعدة البيانات (Migration) | تحديث 3 دوال RPC |

## النتيجة المتوقعة

- ✅ العملاء الذين تم تجديد جميع وثائقهم لن يظهروا في التجديدات
- ✅ البطاقات الإحصائية ستعرض الأرقام الصحيحة
- ✅ الـ PDF المُصدّر سيستبعد الوثائق المُجددة أيضاً
- ✅ تبويب "تم التجديد" يبقى كما هو لعرض العملاء المُجددين
