
# خطة: إصلاح خطأ "column prt.status does not exist"

## المشكلة

خطأ في دالة `report_renewals_service_detailed`:
```
column prt.status does not exist
```

## السبب

في الـ migration استخدمنا:
```sql
COALESCE(prt.status, 'not_contacted') AS renewal_status
```

لكن العمود الفعلي في جدول `policy_renewal_tracking` هو `renewal_status` وليس `status`.

## الحل

تحديث الدالة لاستخدام اسم العمود الصحيح:

```sql
CREATE OR REPLACE FUNCTION report_renewals_service_detailed(...)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ...
    COALESCE(prt.renewal_status, 'not_contacted') AS renewal_status  -- ✅ تصحيح
  FROM policies p
  ...
END;
$$;
```

## التغييرات

| الملف | التغيير |
|-------|---------|
| **Database Migration** | إصلاح اسم العمود من `prt.status` إلى `prt.renewal_status` |

## النتيجة المتوقعة

- زر "تصدير PDF" يعمل بدون خطأ
- التقرير يُنشأ بنجاح مع تفاصيل الوثائق لكل زبون
