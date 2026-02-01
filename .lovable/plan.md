
# خطة: إصلاح خطأ "relation payments does not exist"

## المشكلة

في الـ migration السابقة، تم استخدام اسم جدول خاطئ:

| المستخدم ❌ | الصحيح ✅ |
|------------|----------|
| `payments` | `policy_payments` |

هذا الخطأ موجود في **3 دوال**:
- `report_client_debts_summary`
- `report_client_debts`
- `report_debt_policies_for_clients`

---

## الحل

إنشاء migration جديدة لإعادة تعريف الدوال الثلاث مع استبدال:
- `FROM payments` → `FROM policy_payments`
- وكذلك إصلاح الشروط لتستخدم الأعمدة الصحيحة:
  - `p.status != 'cancelled'` → `p.cancelled = false`
  - إضافة `p.deleted_at IS NULL`
  - إضافة `p.broker_id IS NULL`
  - التأكد من استبعاد الدفعات المرفوضة: `WHERE refused IS NOT TRUE`

---

## التغييرات التقنية

### migration جديدة

```sql
-- Fix: Replace "payments" with "policy_payments"
-- Fix: Use correct column names (cancelled, deleted_at, etc.)

DROP FUNCTION IF EXISTS public.report_client_debts_summary(text, integer);
DROP FUNCTION IF EXISTS public.report_client_debts(text, integer, integer, integer);
DROP FUNCTION IF EXISTS public.report_debt_policies_for_clients(uuid[]);

-- Recreate with correct table name: policy_payments
-- And correct conditions: cancelled = false, deleted_at IS NULL, etc.
```

---

## الأخطاء التي سيتم إصلاحها

| الخطأ | التصحيح |
|-------|---------|
| `FROM payments` | `FROM policy_payments` |
| `p.status != 'cancelled'` | `p.cancelled = false AND p.deleted_at IS NULL` |
| لم يتم استبعاد الدفعات المرفوضة | `WHERE refused IS NOT TRUE` |
| `c.broker_id IS NULL` | `p.broker_id IS NULL` (على مستوى الوثيقة) |

---

## ملخص الملفات

| الملف | التغيير |
|-------|---------|
| `supabase/migrations/fix_payments_table_name.sql` | إعادة تعريف الدوال الثلاث بالاسم الصحيح |

---

## النتيجة المتوقعة

- ستعمل صفحة "متابعة الديون" بدون أخطاء
- سيظهر بادج عدد العملاء المدينين في الـ Sidebar
- حساب الديون على مستوى الباقة سيعمل بشكل صحيح
