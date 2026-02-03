
# خطة: إصلاح مشكلة عرض الباقات المدفوعة بالفيزا

## المشكلة الحالية

عند إنشاء باقة ودفع جزء منها بالفيزا:
1. الوثائق الجديدة تُنشأ مع `group_id` صحيح ✅
2. لكنها تظهر كوثائق منفردة في واجهة العميل ❌

**السبب الجذري:**
الإصلاح السابق في `handleCreateTempPolicy` كان خاطئاً:
- الكود يبحث عن إضافة ELZAMI أولاً، ثم THIRD_FULL
- لكن الوثيقة المؤقتة يجب أن تمثل **الوثيقة الرئيسية** (من Step 3)، وليس الإضافات

```typescript
// الكود الخاطئ:
if (packageMode && packageAddons.some(a => a.enabled)) {
  const elzamiAddon = packageAddons.find(a => a.type === 'elzami' && a.enabled);
  if (elzamiAddon) {
    policyTypeParentValue = 'ELZAMI';  // ❌ خطأ - قد لا يكون هناك إلزامي
  }
}
```

**مثال من البيانات:**
- باقة `f1ef4b13-af49-4530-8341-0b8a7b904b75` تحتوي:
  - منورا THIRD_FULL (الرئيسية) ← نوعها خطأ: يجب أن تكون THIRD أو FULL
  - اراضي مقدسة THIRD_FULL THIRD (إضافة)
  - شركة اكس ROAD_SERVICE (إضافة)

---

## الحل الصحيح

### المبدأ:
1. **الوثيقة المؤقتة** = الوثيقة الرئيسية (ما يُدخله المستخدم في Step 3)
2. **الإضافات** = ما يُفعّله المستخدم في PackageBuilderSection

### التعديلات المطلوبة:

#### 1. إصلاح handleCreateTempPolicy

**الملف:** `src/components/policies/PolicyWizard.tsx`

**التغيير:** إزالة المنطق الخاطئ والاعتماد على بيانات الوثيقة الرئيسية:

```typescript
// الكود الصحيح:
// الوثيقة المؤقتة تستخدم بيانات الوثيقة الرئيسية مباشرة
let policyTypeParentValue = (selectedCategory?.slug || policy.policy_type_parent) as PolicyTypeParent;
let policyTypeChildValue = (policy.policy_type_child || null) as PolicyTypeChild | null;
let tempCompanyId = policy.company_id;
let tempInsurancePrice = pricing.basePrice || parseFloat(policy.insurance_price) || 0;

// لا نغير النوع للإضافات - الوثيقة المؤقتة هي دائماً الرئيسية
```

#### 2. إصلاح عرض الباقات في PolicyTreeView

**المشكلة:** الوثائق القديمة بدون `group_id` تظهر منفردة

**الحل:** لا يمكن إصلاح الوثائق القديمة تلقائياً - تحتاج تحديث يدوي في قاعدة البيانات

---

## التفاصيل التقنية

### التغيير في handleCreateTempPolicy (سطور 471-496):

**قبل (الكود الخاطئ):**
```typescript
let policyTypeParentValue = (selectedCategory?.slug || policy.policy_type_parent) as PolicyTypeParent;
let policyTypeChildValue = (policy.policy_type_child || null) as PolicyTypeChild | null;
let tempCompanyId = policy.company_id;
let tempInsurancePrice = pricing.totalPrice;

// For packages: prioritize ELZAMI addon's type and company
if (packageMode && packageAddons.some(a => a.enabled)) {
  const elzamiAddon = packageAddons.find(a => a.type === 'elzami' && a.enabled);
  if (elzamiAddon) {
    policyTypeParentValue = 'ELZAMI' as PolicyTypeParent;
    policyTypeChildValue = null;
    tempCompanyId = elzamiAddon.company_id || policy.company_id;
    tempInsurancePrice = parseFloat(elzamiAddon.insurance_price) || pricing.totalPrice;
  } else {
    const thirdAddon = packageAddons.find(a => a.type === 'third_full' && a.enabled);
    if (thirdAddon) {
      policyTypeParentValue = 'THIRD_FULL' as PolicyTypeParent;
      policyTypeChildValue = (thirdAddon.policy_type_child as PolicyTypeChild) || null;
      tempCompanyId = thirdAddon.company_id || policy.company_id;
      tempInsurancePrice = parseFloat(thirdAddon.insurance_price) || pricing.totalPrice;
    }
  }
}
```

**بعد (الكود الصحيح):**
```typescript
// الوثيقة المؤقتة = الوثيقة الرئيسية دائماً
let policyTypeParentValue = (selectedCategory?.slug || policy.policy_type_parent) as PolicyTypeParent;
let policyTypeChildValue = (policy.policy_type_child || null) as PolicyTypeChild | null;
let tempCompanyId = policy.company_id;

// للباقات: استخدم سعر الوثيقة الرئيسية فقط (basePrice)، وليس المجموع
let tempInsurancePrice = packageMode 
  ? (pricing.basePrice || parseFloat(policy.insurance_price) || 0)
  : (pricing.totalPrice || parseFloat(policy.insurance_price) || 0);
```

**السبب:**
- `pricing.basePrice` = سعر الوثيقة الرئيسية فقط
- `pricing.totalPrice` = مجموع الباقة كلها
- الوثيقة المؤقتة يجب أن تحتوي سعرها فقط، والإضافات تُنشأ لاحقاً في handleSave

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/policies/PolicyWizard.tsx` | إصلاح handleCreateTempPolicy لاستخدام بيانات الوثيقة الرئيسية |

---

## النتيجة المتوقعة

1. ✅ الوثيقة المؤقتة ستُنشأ بالنوع الصحيح (THIRD أو FULL)
2. ✅ الشركة الصحيحة (منورا مثلاً) ستُستخدم
3. ✅ السعر الصحيح (سعر الوثيقة الرئيسية فقط)
4. ✅ الإضافات ستُنشأ بشكل منفصل في handleSave

---

## ملاحظة بخصوص الوثائق السابقة

الوثائق المُنشأة قبل هذا الإصلاح تحتاج تحديث يدوي:
- تحديث `policy_type_child` للوثائق التي يجب أن تكون THIRD أو FULL
- أو حذفها وإعادة إنشائها بالطريقة الصحيحة
