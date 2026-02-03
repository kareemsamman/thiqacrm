
# خطة: إصلاح مشكلة التحقق من الدفعات عند الدفع بالفيزا في الباقات

## تشخيص المشكلة

### رسالة الخطأ:
```
Payment total exceeds policy insurance_price (total=3001.00, price=2700.00) (P0001)
```

### تحليل السيناريو من الصورة:
| الدفعة | المبلغ |
|--------|--------|
| دفعة إلزامي تلقائية (مقفلة) | 3,000₪ |
| فيزا (تم الدفع) | 1₪ |
| نقدي | 1,799₪ |
| **المجموع** | **4,800₪** (أو 3,001₪ إذا لم يُحتسب النقدي بعد) |

### السبب الجذري:

عند إنشاء الوثيقة المؤقتة للفيزا (`handleCreateTempPolicy`)، الكود يستخدم **سعر الإضافة الأولى** وليس **سعر الوثيقة الرئيسية**:

```typescript
// السطور 480-502 في PolicyWizard.tsx
if (packageMode && packageAddons.some(a => a.enabled)) {
  const firstAddon = elzamiAddon || thirdAddon || roadAddon || accidentAddon;
  if (firstAddon) {
    tempInsurancePrice = parseFloat(firstAddon.insurance_price) || 0;  // ← 2700₪
  }
}
```

**النتيجة:**
1. الوثيقة المؤقتة تُنشأ بـ `insurance_price = 2700₪` (من الإضافة الأولى)
2. لكن الدفعة المقفلة للإلزامي = `3000₪` (من `policy.insurance_price` الرئيسية)
3. Trigger قاعدة البيانات يقارن الدفعات (3001₪) بسعر الوثيقة (2700₪)
4. **خطأ!**

---

## التحليل التفصيلي

### المشكلة في الكود:

**عند دخول الخطوة 4 (السطور 317-337):**
```typescript
if (nextStep === 4 && policy.policy_type_parent === 'ELZAMI') {
  const totalPrice = parseFloat(policy.insurance_price) || pricing.totalPrice;
  // يُنشئ دفعة مقفلة بـ 3000₪
}
```

هذا يعمل فقط إذا كان النوع الرئيسي هو ELZAMI، لكنه يستخدم `policy.insurance_price` (الوثيقة الرئيسية في Step 3).

**عند إنشاء الوثيقة المؤقتة للفيزا (السطور 480-502):**
```typescript
if (packageMode && packageAddons.some(a => a.enabled)) {
  const firstAddon = elzamiAddon || thirdAddon || ...;
  tempInsurancePrice = parseFloat(firstAddon.insurance_price); // ← مختلف!
}
```

**التناقض:**
- الدفعة المقفلة = `policy.insurance_price` = 3000₪
- الوثيقة المؤقتة = `firstAddon.insurance_price` = 2700₪

---

## الإصلاح المطلوب

### الإصلاح 1: توحيد سعر الوثيقة المؤقتة

**الملف:** `src/components/policies/PolicyWizard.tsx`

**المنطق الجديد:**

عند إنشاء الوثيقة المؤقتة للفيزا في وضع الباقة، يجب استخدام:
1. **إذا كانت الوثيقة الرئيسية ELZAMI:** استخدم `policy.insurance_price` (سعر الإلزامي الرئيسي)
2. **إذا كانت الوثيقة الرئيسية THIRD_FULL وهناك إضافة ELZAMI:** استخدم سعر إضافة ELZAMI

```typescript
// handleCreateTempPolicy (حوالي سطر 476)
let tempInsurancePrice = pricing.totalPrice || parseFloat(policy.insurance_price) || 0;

if (packageMode && packageAddons.some(a => a.enabled)) {
  // إذا كان النوع الرئيسي ELZAMI، استخدم سعر الوثيقة الرئيسية
  if (policy.policy_type_parent === 'ELZAMI') {
    policyTypeParentValue = 'ELZAMI';
    policyTypeChildValue = null;
    tempCompanyId = policy.company_id;
    tempInsurancePrice = parseFloat(policy.insurance_price) || 0;  // ← استخدم سعر الوثيقة الرئيسية
  } else {
    // النوع الرئيسي ليس ELZAMI، استخدم الإضافة الأولى
    const elzamiAddon = packageAddons.find(a => a.type === 'elzami' && a.enabled);
    // ... باقي المنطق الحالي
  }
}
```

### الإصلاح 2: تحديث الوثيقة المؤقتة بسعر الباقة الكامل

**المشكلة الإضافية:** Trigger قاعدة البيانات يتحقق من `insurance_price` للوثيقة الواحدة، لكن الدفعات قد تكون للباقة كلها.

**الحل:** بعد إنشاء `group_id` في `handleSave`، يجب تحديث `insurance_price` للوثيقة المؤقتة ليصبح مجموع الباقة:

```typescript
// في handleSave (بعد إنشاء group_id)
// تحديث الوثيقة المؤقتة لتكون جزءًا من المجموعة
const { error: updateError } = await supabase
  .from('policies')
  .update({ 
    group_id: groupId,
    // لا تغير insurance_price هنا - يبقى سعر المكون الأول
  })
  .eq('id', tempPolicyId);
```

**لكن:** Trigger الآن يستخدم مجموع `group_id` إذا وُجد (انظر migration 20260109162302):
```sql
IF v_group_id IS NOT NULL THEN
  SELECT COALESCE(SUM(pkg.insurance_price), 0)
  INTO v_policy_price
  FROM public.policies pkg
  WHERE pkg.group_id = v_group_id;
END IF;
```

**المشكلة:** الوثيقة المؤقتة لا تحتوي على `group_id` عند إنشائها، والدفعات تُنشأ قبل تحديث `group_id`!

---

## الإصلاح الشامل

### الحل: تأخير التحقق أو تحديث group_id قبل الدفعات

**الخيار الأفضل:** تحديث الوثيقة المؤقتة بـ `group_id` **قبل** إضافة الدفعات:

```typescript
// في handleSave للـ Visa flow:

// 1. إنشاء group_id أولاً
const { data: groupData } = await supabase
  .from('policy_groups')
  .insert({ client_id, car_id, name: 'باقة' })
  .select().single();

// 2. تحديث الوثيقة المؤقتة بـ group_id فوراً
await supabase
  .from('policies')
  .update({ group_id: groupData.id })
  .eq('id', tempPolicyId);

// 3. إنشاء بقية وثائق الباقة
for (const addon of packageAddons) {
  // إنشاء وثيقة الإضافة مع group_id
}

// 4. الآن يمكن إضافة الدفعات - Trigger سيحسب مجموع الباقة
```

**لكن في الكود الحالي:** الدفعات تُنشأ **بعد** تحديث `group_id` وإنشاء الإضافات (السطور 1045-1111)، لكن المشكلة هي أن دفعة الفيزا أُنشئت **قبل** `handleSave` عبر Tranzila!

---

## السبب الحقيقي للمشكلة

دفعة الفيزا (1₪) تُنشأ عبر **Tranzila webhook** (Edge Function) **قبل** أن تصبح الوثيقة جزءًا من الباقة!

**التسلسل:**
1. المستخدم يضيف دفعة فيزا 1₪ ويضغط "ادفع"
2. `handleCreateTempPolicy` يُنشئ الوثيقة المؤقتة بـ `insurance_price = 2700₪` (بدون `group_id`)
3. Tranzila webhook يُنشئ دفعة 1₪ للوثيقة المؤقتة
4. المستخدم يضغط "حفظ الوثيقة"
5. `handleSave` يحاول إضافة الدفعات الأخرى (3000₪ مقفلة + 1799₪ نقدي)
6. Trigger يتحقق: `3000 + 1 = 3001 > 2700` ← **خطأ!**

---

## الحل النهائي

### الإصلاح 1: استخدام pricing.totalPrice للوثيقة المؤقتة

**الملف:** `src/components/policies/PolicyWizard.tsx`

عند إنشاء الوثيقة المؤقتة في وضع الباقة، استخدم **مجموع سعر الباقة** كـ `insurance_price`:

```typescript
// handleCreateTempPolicy (سطر 476)
let tempInsurancePrice = pricing.totalPrice || parseFloat(policy.insurance_price) || 0;

if (packageMode && packageAddons.some(a => a.enabled)) {
  // لا تغير tempInsurancePrice - استخدم pricing.totalPrice (مجموع الباقة)
  // فقط غير النوع والشركة للإضافة الأولى
  const firstAddon = elzamiAddon || thirdAddon || roadAddon || accidentAddon;
  if (firstAddon) {
    policyTypeParentValue = addonTypeMap[firstAddon.type];
    tempCompanyId = firstAddon.company_id || policy.company_id;
    // ← لا تغير tempInsurancePrice!
  }
}
```

### الإصلاح 2: تحديث insurance_price عند إنشاء الباقة

في `handleSave`، بعد إنشاء كل وثائق الباقة، يجب توزيع الأسعار بشكل صحيح.

---

## التغييرات المطلوبة

| الملف | السطور | التغيير |
|-------|--------|---------|
| `src/components/policies/PolicyWizard.tsx` | 476-502 | استخدام `pricing.totalPrice` للوثيقة المؤقتة بدلاً من سعر الإضافة الأولى |
| `src/components/policies/PolicyWizard.tsx` | 912-925 | تحديث الوثيقة المؤقتة بالسعر الصحيح بعد إنشاء الباقة |

---

## ملخص الإصلاح

**التغيير الأساسي في `handleCreateTempPolicy`:**

```typescript
// قبل:
let tempInsurancePrice = pricing.totalPrice || parseFloat(policy.insurance_price) || 0;
// ... ثم
tempInsurancePrice = parseFloat(firstAddon.insurance_price) || 0;

// بعد:
let tempInsurancePrice = pricing.totalPrice || parseFloat(policy.insurance_price) || 0;
// لا نغير السعر - نبقي على pricing.totalPrice
```

**التغيير في `handleSave`:**

عند تحديث الوثيقة المؤقتة بـ `group_id`، يجب تحديث `insurance_price` ليكون سعر **المكون الأول فقط** (ليكون التوزيع صحيحًا)، لكن **قبل** ذلك يجب أن تكون الوثيقة المؤقتة بسعر الباقة الكامل لتمرير التحقق.

---

## النتيجة المتوقعة

1. ✅ الوثيقة المؤقتة تُنشأ بـ `pricing.totalPrice` (مثلاً 4500₪)
2. ✅ Trigger يتحقق: `3000 + 1 + 1799 = 4800 > 4500`... 

**انتظر!** هذا أيضًا سيفشل لأن الدفعات (4800₪) تتجاوز السعر (4500₪)!

**التحقق من البيانات:**
- سعر الباقة الكلي (pricing.totalPrice) يجب أن يساوي مجموع الدفعات أو أكثر
- الدفعة المقفلة = 3000₪ (سعر الإلزامي)
- فيزا = 1₪
- نقدي = 1799₪
- **المجموع = 4800₪**

يجب أن يكون `pricing.totalPrice >= 4800₪` لتمرير التحقق.

**الاستنتاج:** المشكلة ليست فقط في الكود - المستخدم يحاول دفع أكثر من سعر الباقة!

ولكن رسالة الخطأ تقول `price=2700.00`، مما يعني أن الوثيقة المؤقتة أُنشئت بسعر 2700₪ فقط.

**الإصلاح المطلوب:** التأكد من أن الوثيقة المؤقتة تُنشأ بـ `pricing.totalPrice` (الباقة كاملة)، وليس سعر الإضافة الأولى فقط.
