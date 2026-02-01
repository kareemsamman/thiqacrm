
# خطة: عرض نوع التأمين الفرعي (ثالث/شامل) بشكل صحيح

## المشكلة

### في صفحة تفاصيل العميل (Timeline):
- يظهر **"ثالث/شامل"** دائماً بدلاً من عرض النوع الفرعي الفعلي ("ثالث" أو "شامل")

### في جدول مكونات الباقة:
- يظهر **"ثالث/شامل - شامل"** وهو مكرر وغير ضروري
- المطلوب: عرض **"شامل"** أو **"ثالث"** فقط

---

## الحل التقني

### 1. تعديل `PolicyYearTimeline.tsx`

إضافة دالة مساعدة للحصول على الاسم الصحيح:

```typescript
// Helper to get proper label (child type if exists, otherwise parent)
const getDisplayLabel = (policy: PolicyRecord) => {
  if (policy.policy_type_parent === 'THIRD_FULL' && policy.policy_type_child) {
    return policy.policy_type_child === 'THIRD' ? 'ثالث' : 'شامل';
  }
  return policyTypeLabels[policy.policy_type_parent] || policy.policy_type_parent;
};
```

**تحديث الشارة الرئيسية (سطر 778-779):**
```tsx
<Badge className={cn("border text-xs font-semibold", policyTypeColors[pkg.mainPolicy.policy_type_parent])}>
  {getDisplayLabel(pkg.mainPolicy)}
</Badge>
```

**تحديث شارات الإضافات (سطر 784-785):**
```tsx
<Badge className={cn("border text-xs", policyTypeColors[addon.policy_type_parent])}>
  {getDisplayLabel(addon)}
</Badge>
```

---

### 2. تعديل `PackageComponentsTable.tsx`

تعديل دالة `getTypeName` لعرض النوع الفرعي فقط:

**قبل:**
```typescript
const getTypeName = (p: PackagePolicy) => {
  let name = policyTypeLabels[p.policy_type_parent] || p.policy_type_parent;
  if (p.policy_type_child) {
    name += ` - ${policyChildLabels[p.policy_type_child] || p.policy_type_child}`;
  }
  return name;
};
```

**بعد:**
```typescript
const getTypeName = (p: PackagePolicy) => {
  // For THIRD_FULL with a child type, show only the child type (ثالث or شامل)
  if (p.policy_type_parent === 'THIRD_FULL' && p.policy_type_child) {
    return policyChildLabels[p.policy_type_child] || p.policy_type_child;
  }
  // For other types, use the parent label
  return policyTypeLabels[p.policy_type_parent] || p.policy_type_parent;
};
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `src/components/clients/PolicyYearTimeline.tsx` | إضافة دالة `getDisplayLabel` واستخدامها في شارات الباقة |
| `src/components/policies/PackageComponentsTable.tsx` | تعديل `getTypeName` لعرض النوع الفرعي فقط |

---

## النتيجة المتوقعة

### قبل:
- Timeline: **ثالث/شامل** + إلزامي + خدمات طريق
- جدول المكونات: **ثالث/شامل - شامل**

### بعد:
- Timeline: **شامل** + إلزامي + خدمات طريق
- جدول المكونات: **شامل**

---

## ملاحظة

هذا التغيير سيؤثر أيضاً على:
- `PolicyTreeView.tsx` (نفس المنطق)
- أي مكان آخر يستخدم `policyTypeLabels` مع THIRD_FULL

سأتأكد من تحديث جميع الأماكن ذات الصلة.
