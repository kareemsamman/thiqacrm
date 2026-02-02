

# خطة: إصلاح خطأ "operator does not exist: policy_type_parent = text"

## المشكلة

خطأ في مقارنة نوعي بيانات مختلفين:
- `p.policy_type_parent` هو من نوع ENUM (`policy_type_parent`)
- `p_policy_type` هو من نوع TEXT

PostgreSQL لا يمكنه مقارنة ENUM مع TEXT مباشرة.

**رسالة الخطأ:**
```
operator does not exist: policy_type_parent = text
```

---

## الحل

تحويل ENUM إلى TEXT قبل المقارنة:

```sql
-- قبل (خطأ):
AND (p_policy_type IS NULL OR p.policy_type_parent = p_policy_type)

-- بعد (صحيح):
AND (p_policy_type IS NULL OR p.policy_type_parent::text = p_policy_type)
```

---

## التغييرات المطلوبة

### Migration SQL جديد:

```sql
-- Fix report_renewals - cast ENUM to TEXT for comparison
CREATE OR REPLACE FUNCTION public.report_renewals(...)
...
WHERE ...
  AND (p_policy_type IS NULL OR p.policy_type_parent::text = p_policy_type)
...

-- Fix report_renewals_service - cast ENUM to TEXT for comparison  
CREATE OR REPLACE FUNCTION public.report_renewals_service(...)
...
WHERE ...
  AND (p_policy_type IS NULL OR p.policy_type_parent::text = p_policy_type)
...
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| **Database Migration (جديدة)** | إضافة `::text` لتحويل ENUM إلى TEXT في دالتي `report_renewals` و `report_renewals_service` |

---

## تفاصيل الإصلاح

### في `report_renewals` (سطر 63):
```sql
-- من:
AND (p_policy_type IS NULL OR p.policy_type_parent = p_policy_type)

-- إلى:
AND (p_policy_type IS NULL OR p.policy_type_parent::text = p_policy_type)
```

### في `report_renewals_service` (سطر 185):
```sql
-- من:
AND (p_policy_type IS NULL OR p.policy_type_parent = p_policy_type)

-- إلى:
AND (p_policy_type IS NULL OR p.policy_type_parent::text = p_policy_type)
```

---

## النتيجة المتوقعة

بعد تطبيق الإصلاح:
- صفحة `/reports/policies` ستعمل بدون أخطاء
- فلترة الوثائق حسب النوع (إلزامي، ثالث/شامل، إلخ) ستعمل
- تصدير PDF سيعمل

---

## اختبار

1. اذهب لصفحة `/reports/policies`
2. تأكد أن الصفحة تُحمّل بدون خطأ "فشل في تحميل البيانات"
3. جرب تغيير فلتر "كل الأنواع" إلى نوع محدد
4. تأكد أن البيانات تُعرض بشكل صحيح

