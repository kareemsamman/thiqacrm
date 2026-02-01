

# خطة: إصلاح خطأ Foreign Key في ربط الباقات المفقودة

## المشكلة

عند محاولة ربط الباقات، يظهر الخطأ:
```
insert or update on table "policies" violates foreign key constraint "policies_group_id_fkey"
```

## السبب الجذري

الكود الحالي في `linkMissingPackages`:
```typescript
const groupId = crypto.randomUUID();

await supabase
  .from('policies')
  .update({ group_id: groupId })
  .in('id', pkg.policy_ids);
```

**المشكلة**: عمود `policies.group_id` له قيد foreign key يشير إلى جدول `policy_groups(id)`.
لا يمكن وضع UUID عشوائي - يجب أن يكون موجوداً في جدول `policy_groups` أولاً!

## كيف يعمل PolicyWizard بشكل صحيح؟

```typescript
// 1. أولاً: إنشاء سجل في policy_groups
const { data: groupData } = await supabase
  .from('policy_groups')
  .insert({
    client_id: clientId,
    car_id: carId,
    name: `باقة - ${new Date().toLocaleDateString('en-GB')}`,
  })
  .select()
  .single();

// 2. ثانياً: استخدام الـ ID الناتج
groupId = groupData.id;

// 3. ثالثاً: إنشاء الوثائق مع هذا الـ groupId
await supabase.from('policies').insert({ ..., group_id: groupId });
```

---

## الحل

### ملف: `src/pages/WordPressImport.tsx`

#### تغيير دالة `linkMissingPackages`:

**قبل:**
```typescript
const linkMissingPackages = async () => {
  for (const pkg of selected) {
    const groupId = crypto.randomUUID();  // ❌ خطأ!
    
    await supabase.from('policies')
      .update({ group_id: groupId })
      .in('id', pkg.policy_ids);
  }
};
```

**بعد:**
```typescript
const linkMissingPackages = async () => {
  for (const pkg of selected) {
    // 1. إنشاء سجل في policy_groups أولاً
    const { data: groupData, error: groupError } = await supabase
      .from('policy_groups')
      .insert({
        client_id: pkg.client_id,
        car_id: pkg.car_id,
        name: `باقة - ${new Date(pkg.first_created).toLocaleDateString('en-GB')}`,
      })
      .select()
      .single();
    
    if (groupError) {
      stats.errors.push(`${pkg.client_name}: ${groupError.message}`);
      continue;
    }
    
    // 2. تحديث الوثائق بالـ group_id الصحيح
    const { error: updateError } = await supabase
      .from('policies')
      .update({ group_id: groupData.id })
      .in('id', pkg.policy_ids);
    
    if (updateError) {
      stats.errors.push(`${pkg.client_name}: ${updateError.message}`);
    } else {
      stats.linked++;
    }
  }
};
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `src/pages/WordPressImport.tsx` | تعديل `linkMissingPackages` لإنشاء سجل في `policy_groups` قبل تحديث الوثائق |

---

## النتيجة المتوقعة

1. ✅ عند ربط "امجد ابو سنينة" أو أي باقة أخرى، يتم إنشاء سجل في `policy_groups` أولاً
2. ✅ ثم يتم تحديث الوثائق بالـ `group_id` الصحيح
3. ✅ لن يظهر خطأ foreign key بعد الآن
4. ✅ الباقات ستظهر بشكل صحيح في تفاصيل العميل

