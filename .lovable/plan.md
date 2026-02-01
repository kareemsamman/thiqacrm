
# خطة: إصلاح مشكلتين في إنشاء الوثائق من قبل العمال

## ملخص المشاكل

بعد التحقيق في قاعدة البيانات، اكتشفت مشكلتين:

### المشكلة 1: الوثيقة لا تُنشأ كباقة
**السبب الجذري:** عندما أنشأ العامل الوثيقة، لم يتم تفعيل أي إضافات (إلزامي، خدمات طريق، إعفاء رسوم) في الخطوة 3. المنطق الحالي في السطر 700:
```typescript
if (packageMode && packageAddons.some(addon => addon.enabled)) {
  // Create policy_groups
}
```
**النتيجة:** `group_id = null` → تظهر كوثيقة منفردة

### المشكلة 2: دفعة الفيزا غير ظاهرة للعامل
**السبب الجذري:** عند إنشاء دفعة الفيزا في `tranzila-init`، لا يتم تعيين `branch_id`:
```typescript
// tranzila-init/index.ts line 82-96
.insert({
  policy_id,
  amount,
  payment_type: 'visa',
  // ❌ لا يوجد branch_id هنا!
})
```
**النتيجة:** RLS policy تمنع العمال من رؤية الدفعة لأن `branch_id = null`

---

## الحل التقني

### إصلاح 1: تعيين `branch_id` في `tranzila-init`

#### ملف: `supabase/functions/tranzila-init/index.ts`

**قبل:**
```typescript
const { data: payment, error: paymentError } = await supabase
  .from('policy_payments')
  .insert({
    policy_id,
    amount,
    payment_type: 'visa',
    payment_date,
    notes: notes || null,
    provider: 'tranzila',
    tranzila_index: tranzilaIndex,
    created_by_admin_id: user.id,
    refused: null,
  })
```

**بعد:**
```typescript
// First, fetch the policy to get its branch_id
const { data: policyData, error: policyError } = await supabase
  .from('policies')
  .select('branch_id')
  .eq('id', policy_id)
  .single()

if (policyError) {
  console.error('Policy fetch error:', policyError)
  return new Response(JSON.stringify({ error: 'Policy not found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const { data: payment, error: paymentError } = await supabase
  .from('policy_payments')
  .insert({
    policy_id,
    amount,
    payment_type: 'visa',
    payment_date,
    notes: notes || null,
    provider: 'tranzila',
    tranzila_index: tranzilaIndex,
    created_by_admin_id: user.id,
    refused: null,
    branch_id: policyData?.branch_id || null,  // ✅ تعيين branch_id من الوثيقة
  })
```

---

### إصلاح 2: إصلاح دفعة الفيزا الموجودة يدوياً

يجب تشغيل هذا الاستعلام في قاعدة البيانات لإصلاح دفعات الفيزا الموجودة:

```sql
UPDATE policy_payments pp
SET branch_id = p.branch_id
FROM policies p
WHERE pp.policy_id = p.id
  AND pp.payment_type = 'visa'
  AND pp.branch_id IS NULL
  AND p.branch_id IS NOT NULL;
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `supabase/functions/tranzila-init/index.ts` | جلب `branch_id` من الوثيقة وتعيينه في الدفعة الجديدة |
| قاعدة البيانات | تشغيل migration لإصلاح الدفعات الموجودة |

---

## ملاحظة بخصوص إنشاء الباقات

المشكلة الأولى (الوثيقة ليست باقة) ليست خطأ تقني - العامل ببساطة لم يفعّل أي إضافات. لإنشاء باقة، يجب:

1. اختيار نوع التأمين الأساسي (مثل ثالث/شامل)
2. تفعيل "وضع الباقة" في الخطوة 3
3. تفعيل إضافة واحدة على الأقل (إلزامي، خدمات طريق، أو إعفاء رسوم)

إذا أردت أن يكون إنشاء الباقات إلزامياً أو تلقائياً في حالات معينة، أخبرني وسأعدّل المنطق.
