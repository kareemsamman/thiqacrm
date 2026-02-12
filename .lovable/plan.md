

# إصلاح حساب إجمالي المبلغ في الفاتورة الضريبية

## المشكلة
المبلغ الإجمالي ₪97,042 غير صحيح. السبب: عند حساب مبالغ الباقات (packages)، الكود يجلب كل مكونات الباقة بدون تطبيق نفس الفلاتر (ملغاة، تواريخ) المطبقة على الاستعلام الرئيسي.

## السبب التقني

```text
الاستعلام الرئيسي (policies):
  ✅ يفلتر الملغاة (cancelled = false)
  ✅ يفلتر حسب التاريخ (start_date >= X, start_date <= Y)

استعلام مكونات الباقات (allGroupPolicies):
  ❌ لا يفلتر الملغاة
  ❌ لا يفلتر حسب التاريخ
  → يجمع أسعار وثائق ملغاة أو خارج الفترة في المجموع
```

## الحل

### تعديل: `supabase/functions/generate-tax-invoice/index.ts`

1. إضافة فلتر `cancelled = false` على استعلام `allGroupPolicies` (إذا `include_cancelled` = false)
2. إضافة فلتر التواريخ على `allGroupPolicies`
3. هذا يضمن أن مكونات الباقة المحسوبة تطابق نفس شروط الاستعلام الرئيسي

### التغيير المطلوب (سطر 108-117)

**قبل:**
```typescript
const { data: groupData } = await supabase
  .from("policies")
  .select(`...`)
  .in("group_id", groupIds)
  .neq("policy_type_parent", "ELZAMI")
  .is("deleted_at", null);
```

**بعد:**
```typescript
let groupQuery = supabase
  .from("policies")
  .select(`...`)
  .in("group_id", groupIds)
  .neq("policy_type_parent", "ELZAMI")
  .is("deleted_at", null);

if (!include_cancelled) groupQuery = groupQuery.eq("cancelled", false);
if (start_date) groupQuery = groupQuery.gte("start_date", start_date);
if (end_date) groupQuery = groupQuery.lte("start_date", end_date);

const { data: groupData } = await groupQuery;
```

| ملف | تغيير |
|------|--------|
| `supabase/functions/generate-tax-invoice/index.ts` | إضافة فلاتر cancelled + تواريخ على استعلام مكونات الباقات |

