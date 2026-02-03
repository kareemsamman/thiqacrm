
# خطة: إصلاح مشكلة الباقات مع دفعات الفيزا

## المشكلة

عند إنشاء باقة (Package) ودفع جزء منها بالفيزا، تظهر الوثيقة **كوثيقة منفردة** بدلاً من باقة:

| السيناريو | النتيجة |
|-----------|---------|
| باقة مع دفع نقدي فقط | ✅ باقة صحيحة مع جميع المكونات |
| باقة مع دفع فيزا (1₪) + نقدي | ❌ وثيقة منفردة بدون مكونات الباقة |

## التحليل التقني

### السبب الجذري

في ملف `PolicyWizard.tsx`:

1. **عند النقر على "ادفع فيزا"** (handleCreateTempPolicy - سطر 390-538):
   - يتم إنشاء وثيقة **منفردة** (standalone) بدون `group_id`
   - لا يتم إنشاء سجل `policy_groups`
   - لا يتم إنشاء وثائق الإضافات (ELZAMI, ROAD_SERVICE, ACCIDENT_FEE)

2. **عند حفظ الوثيقة** (handleSave - سطر 556):
   - سطر 590: `const useTempPolicy = !!tempPolicyId;`
   - سطر 598: `if (!useTempPolicy) { /* إنشاء الباقة هنا */ }`
   - عندما يوجد `tempPolicyId`، يتم **تخطي** كود إنشاء الباقة بالكامل (سطور 600-802)

### تتبع الكود:
```typescript
// سطر 590 - تحقق من وجود وثيقة مؤقتة
const useTempPolicy = !!tempPolicyId;

// سطر 598-802 - كل منطق إنشاء الباقة داخل هذا الشرط
if (!useTempPolicy) {
  // ❌ هذا الكود لا يُنفذ عند دفع الفيزا
  
  // سطر 700-712 - إنشاء مجموعة الباقة
  if (packageMode && packageAddons.some(addon => addon.enabled)) {
    const { data: groupData } = await supabase
      .from('policy_groups')
      .insert({ client_id, car_id, name: `باقة - ${date}` })
      .select().single();
    groupId = groupData.id;
  }
  
  // سطر 715-742 - إنشاء الوثيقة الرئيسية مع group_id
  // سطر 748-801 - إنشاء وثائق الإضافات
}
```

---

## الحل المقترح

### تعديل handleSave لمعالجة الباقات في وضع الفيزا

عند وجود `tempPolicyId` مع `packageMode`، نحتاج:

1. إنشاء سجل `policy_groups` جديد
2. تحديث الوثيقة المؤقتة بإضافة `group_id`
3. إنشاء وثائق الإضافات (ELZAMI, ROAD_SERVICE, إلخ)

### التعديلات المطلوبة:

```typescript
// في handleSave (بعد سطر 597)

if (!useTempPolicy) {
  // ... الكود الحالي للحالة العادية ...
} else {
  // ✅ جديد: معالجة الباقات عند وجود وثيقة مؤقتة (دفع فيزا)
  if (packageMode && packageAddons.some(addon => addon.enabled)) {
    // 1. إنشاء مجموعة الباقة
    const { data: groupData, error: groupError } = await supabase
      .from('policy_groups')
      .insert({
        client_id: tempPolicyClientId,
        car_id: tempPolicyCarId,
        name: `باقة - ${new Date().toLocaleDateString('en-GB')}`,
      })
      .select().single();
    
    if (groupError) throw groupError;
    const groupId = groupData.id;
    
    // 2. تحديث الوثيقة المؤقتة بإضافة group_id
    await supabase
      .from('policies')
      .update({ group_id: groupId })
      .eq('id', tempPolicyId);
    
    // 3. إنشاء وثائق الإضافات
    for (const addon of packageAddons) {
      if (!addon.enabled) continue;
      
      // إنشاء وثيقة الإضافة مع group_id
      await supabase.from('policies').insert({
        client_id: tempPolicyClientId,
        car_id: tempPolicyCarId,
        policy_type_parent: addonTypeMap[addon.type],
        company_id: addon.company_id,
        insurance_price: addon.insurance_price,
        group_id: groupId,
        // ... باقي الحقول
      });
    }
  }
}
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/policies/PolicyWizard.tsx` | إضافة منطق إنشاء الباقة عند وجود tempPolicyId |

---

## النتيجة المتوقعة

1. ✅ الباقات مع دفعات فيزا ستظهر كباقات كاملة
2. ✅ جميع مكونات الباقة (إلزامي، خدمات طريق، إعفاء حوادث) ستُنشأ
3. ✅ الدفعات ستُوزع على جميع وثائق الباقة بشكل صحيح
4. ✅ العرض في ملف العميل سيُظهر "باقة" مع جميع المكونات

---

## التفاصيل التقنية الإضافية

### جلب بيانات الوثيقة المؤقتة:

بما أن الوثيقة المؤقتة تم إنشاؤها قبل الحفظ، نحتاج لجلب `client_id` و `car_id` منها:

```typescript
if (useTempPolicy && packageMode && packageAddons.some(addon => addon.enabled)) {
  // جلب بيانات الوثيقة المؤقتة
  const { data: tempPolicy } = await supabase
    .from('policies')
    .select('client_id, car_id')
    .eq('id', tempPolicyId)
    .single();
  
  if (!tempPolicy) throw new Error('Temp policy not found');
  
  const tempClientId = tempPolicy.client_id;
  const tempCarId = tempPolicy.car_id;
  
  // ... إنشاء الباقة والإضافات ...
}
```

### حساب الربح للإضافات:

يجب استخدام `calculatePolicyProfit` لكل إضافة لحساب:
- `profit`
- `payed_for_company`
- `company_cost_snapshot`

### تحديث insurance_price للوثيقة الرئيسية:

الوثيقة المؤقتة تم إنشاؤها بـ `pricing.totalPrice` (مجموع الباقة)، لكن يجب تحديثها لتحتوي فقط على سعر الوثيقة الرئيسية:

```typescript
await supabase
  .from('policies')
  .update({ 
    group_id: groupId,
    insurance_price: parseFloat(policy.insurance_price) // السعر الفعلي للوثيقة الرئيسية فقط
  })
  .eq('id', tempPolicyId);
```

