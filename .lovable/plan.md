
# خطة: إصلاح حساب الديون على مستوى الباقة + عرض تاريخ ووقت الإنشاء

## المشكلة الأولى: جهاد ابو خلف يظهر في قائمة الديون رغم سداد كامل المبلغ

### تحليل المشكلة:

**باقة 2026-2027:**
| نوع الوثيقة | السعر | المدفوع عليها | المتبقي (حسب النظام) |
|-------------|-------|---------------|---------------------|
| إلزامي | ₪3,386 | ₪3,386 | ₪0 ✅ |
| شامل | ₪5,000 | ₪0 | **₪5,000** ❌ |
| سرفيس | ₪500 | ₪5,500 | -₪5,000 |

- **إجمالي الباقة**: ₪8,886
- **إجمالي المدفوع**: ₪8,886
- **الحقيقة**: الباقة مسددة بالكامل!

**السبب**: دالة `report_client_debts` تحسب الدين لكل وثيقة منفردة، ولا تأخذ بعين الاعتبار أن الدفعات يمكن أن تكون موزعة على مستوى الباقة.

### الحل المقترح:

تعديل دوال PostgreSQL الثلاث لحساب الديون على مستوى الباقة:

```sql
-- المنطق الجديد:
-- 1. للوثائق ضمن باقة (group_id NOT NULL):
--    remaining = SUM(insurance_price for group) - SUM(payments for group)
-- 2. للوثائق المنفردة (group_id IS NULL):
--    remaining = insurance_price - SUM(payments)
```

#### 1. تعديل `report_client_debts`

```sql
WITH package_debt AS (
  -- Aggregate by group_id for packages
  SELECT
    p.client_id,
    p.group_id,
    SUM(p.insurance_price)::numeric AS total_price,
    COALESCE(SUM(pp.paid_amount), 0)::numeric AS total_paid,
    MIN(p.end_date::date) AS earliest_expiry
  FROM policies p
  LEFT JOIN (
    SELECT policy_id, SUM(CASE WHEN refused IS NOT TRUE THEN amount ELSE 0 END) as paid_amount
    FROM policy_payments
    GROUP BY policy_id
  ) pp ON pp.policy_id = p.id
  WHERE p.cancelled = false
    AND p.deleted_at IS NULL
    AND p.policy_type_parent <> 'ELZAMI'
    AND p.broker_id IS NULL
    AND p.group_id IS NOT NULL
  GROUP BY p.client_id, p.group_id
),
single_debt AS (
  -- Individual policies without group
  SELECT
    p.client_id,
    NULL::uuid AS group_id,
    p.insurance_price::numeric AS total_price,
    COALESCE(SUM(CASE WHEN pp.refused IS NOT TRUE THEN pp.amount ELSE 0 END), 0)::numeric AS total_paid,
    p.end_date::date AS earliest_expiry
  FROM policies p
  LEFT JOIN policy_payments pp ON pp.policy_id = p.id
  WHERE p.cancelled = false
    AND p.deleted_at IS NULL
    AND p.policy_type_parent <> 'ELZAMI'
    AND p.broker_id IS NULL
    AND p.group_id IS NULL
  GROUP BY p.client_id, p.id, p.insurance_price, p.end_date
),
all_debt AS (
  SELECT * FROM package_debt
  UNION ALL
  SELECT * FROM single_debt
),
client_debt AS (
  SELECT
    c.id AS client_id,
    c.full_name AS client_name,
    c.phone_number,
    SUM(GREATEST(0, d.total_price - d.total_paid))::numeric AS total_owed,
    COUNT(*)::int AS policies_count,
    MIN(d.earliest_expiry) AS earliest_expiry
  FROM all_debt d
  JOIN clients c ON c.id = d.client_id
  WHERE (d.total_price - d.total_paid) > 0
  GROUP BY c.id, c.full_name, c.phone_number
)
-- ... rest of the function
```

---

## المشكلة الثانية: عرض تاريخ ووقت إنشاء الوثيقة

### الوضع الحالي:
- حقل `created_at` موجود في قاعدة البيانات ويتم جلبه في الـ Drawer
- يتم عرض اسم المنشئ فقط ("أنشئ بواسطة: اسم الموظف")
- لا يتم عرض التاريخ والوقت

### الحل:
تعديل `PolicyDetailsDrawer.tsx` لعرض تاريخ ووقت الإنشاء:

**تغيير السطر 1375-1380:**

```tsx
{/* Creator Info with Date/Time */}
<div className="text-xs text-center text-muted-foreground pt-4 border-t space-y-1">
  <p>
    تاريخ الإنشاء: {new Date(policy.created_at).toLocaleDateString('en-GB')} 
    {' '}
    الساعة {new Date(policy.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
  </p>
  {creatorName && <p>أنشئ بواسطة: {creatorName}</p>}
</div>
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `supabase/migrations/new_migration.sql` | تعديل دوال حساب الديون لتجميع الدفعات على مستوى الباقة |
| `src/components/policies/PolicyDetailsDrawer.tsx` | إضافة عرض تاريخ ووقت إنشاء الوثيقة |

---

## النتيجة المتوقعة

1. **جهاد ابو خلف**: سيختفي من قائمة الديون لأن مجموع دفعاته يساوي مجموع أسعار الباقة
2. **عرض الوثيقة**: سيظهر تاريخ ووقت الإنشاء أسفل معلومات الوثيقة

---

## ملاحظة مهمة

هذا التغيير سيؤثر على جميع العملاء الذين لديهم باقات مع دفعات موزعة بشكل غير متساوٍ. النظام سيحسب الدين بشكل صحيح على مستوى الباقة بدلاً من كل وثيقة منفردة.
