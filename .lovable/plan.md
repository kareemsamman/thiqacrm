
# خطة: إزالة زر جلب سعر السيارة + إضافة ملاحظات الوثيقة مع تحرير مباشر

## المطلوب

### 1. إزالة زر جلب قيمة السيارة (RefreshCw)
في خطوة 3 من معالج الوثائق، يوجد زر لجلب قيمة السيارة من API الحكومة. المستخدم يريد إزالته وإبقاء حقل الإدخال فقط.

### 2. عرض ملاحظات الوثيقة مع تحرير مباشر (Inline Edit)
في قائمة الوثائق (PolicyYearTimeline)، إضافة عرض وتحرير الملاحظات:
- إذا كانت هناك ملاحظات: تُعرض تحت بطاقة الوثيقة ويمكن تحريرها بالنقر عليها
- إذا لم تكن هناك ملاحظات: يظهر نص "لا توجد ملاحظات" ويمكن النقر لإضافة ملاحظة

---

## التغييرات التقنية

### الملف 1: `src/components/policies/wizard/Step3PolicyDetails.tsx`
**إزالة زر RefreshCw**

```text
قبل:
┌────────────────────────────────────────┐
│ قيمة السيارة (₪) *                     │
│ ┌─────────────────────────────┬───────┐│
│ │ 85000                       │ [🔄] ││
│ └─────────────────────────────┴───────┘│
└────────────────────────────────────────┘

بعد:
┌────────────────────────────────────────┐
│ قيمة السيارة (₪) *                     │
│ ┌─────────────────────────────────────┐│
│ │ 85000                               ││
│ └─────────────────────────────────────┘│
└────────────────────────────────────────┘
```

- إزالة `fetchingCarValue` state
- إزالة زر Button مع RefreshCw icon
- إزالة wrapper div الذي يحتوي على `flex gap-2`
- إبقاء Input فقط بعرض كامل

---

### الملف 2: `src/components/clients/ClientDetails.tsx`
**إضافة حقل notes للاستعلام**

```typescript
// السطر 341-354 - إضافة notes للاستعلام
.select(`
  id, policy_number, policy_type_parent, policy_type_child, start_date, end_date, 
  insurance_price, profit, cancelled, transferred, group_id,
  transferred_car_number, transferred_to_car_number, transferred_from_policy_id,
  created_at, branch_id, notes,  // ← إضافة notes هنا
  company:insurance_companies(name, name_ar),
  car:cars(id, car_number),
  creator:profiles!policies_created_by_admin_id_fkey(full_name, email)
`)
```

**تحديث PolicyRecord interface**
```typescript
interface PolicyRecord {
  // ... الحقول الموجودة
  notes?: string | null;  // ← إضافة
}
```

---

### الملف 3: `src/components/clients/PolicyYearTimeline.tsx`
**إضافة notes للـ interface وعرضها مع تحرير مباشر**

#### أ) تحديث PolicyRecord interface (السطر 40-60)
```typescript
interface PolicyRecord {
  // ... الحقول الموجودة
  notes?: string | null;  // ← إضافة
}
```

#### ب) تحديث PolicyPackageCard props
```typescript
interface PolicyPackageCardProps {
  // ... الموجود
  onNotesUpdate?: (policyId: string, notes: string) => void;
}
```

#### ج) إضافة prop للتحديث في المكون الرئيسي
```typescript
const handleNotesUpdate = async (policyId: string, notes: string) => {
  const { error } = await supabase
    .from('policies')
    .update({ notes })
    .eq('id', policyId);
  
  if (!error) {
    // تحديث محلي للـ policies state
    // أو إعادة جلب البيانات
  }
};
```

#### د) إضافة عرض الملاحظات في PolicyPackageCard
```text
┌─────────────────────────────────────────────────────┐
│ [الحالة] [النوع] [الباقة] ...                [دفع] │
├─────────────────────────────────────────────────────┤
│ 🏢 الشركة        🚗 السيارة    📅 الفترة    ₪7,055 │
├─────────────────────────────────────────────────────┤
│ 📝 لا توجد ملاحظات                [اضغط للتحرير]   │  ← جديد
│   أو                                                │
│ 📝 هذا العميل يحتاج متابعة... [✏️]                 │  ← جديد
└─────────────────────────────────────────────────────┘
```

#### هـ) منطق التحرير المباشر (Inline Edit)
- استخدام state محلي للتحرير: `editingNotesPolicyId` و `editedNotesValue`
- عند النقر: يتحول النص إلى Textarea
- عند الحفظ (blur أو Enter): يُحدث في قاعدة البيانات
- عند الإلغاء (Escape): يعود للحالة الأصلية

---

## ملخص الملفات المطلوب تعديلها

| الملف | التغيير |
|-------|---------|
| `Step3PolicyDetails.tsx` | إزالة زر RefreshCw وحالة fetchingCarValue |
| `ClientDetails.tsx` | إضافة notes للاستعلام + تحديث interface |
| `PolicyYearTimeline.tsx` | إضافة notes للـ interface + عرض + تحرير مباشر |

---

## النتيجة المتوقعة

1. حقل قيمة السيارة في Step3 يظهر كحقل إدخال بسيط بدون زر جلب
2. كل بطاقة وثيقة في الـ Timeline تعرض الملاحظات (أو "لا توجد ملاحظات")
3. النقر على الملاحظات يفتح تحريراً مباشراً
4. التغييرات تُحفظ تلقائياً عند الخروج من حقل التحرير
