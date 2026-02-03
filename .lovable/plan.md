

# خطة: تصحيح حساب عدد الوثائق (عدد البطاقات بدل الوثائق الفردية)

## المشكلة

حالياً يظهر "35 سارية" لأن النظام يحسب **كل وثيقة بشكل منفصل**.

المطلوب: حساب **عدد البطاقات** (Cards) وليس الوثائق:
- **الباقة** (مجموعة وثائق بنفس `group_id`) = **1**
- **وثيقة فردية** (بدون `group_id`) = **1**

مثال: لو العميل كريم عنده 14 بطاقة في الواجهة → يجب أن يظهر "14 سارية"

---

## التغييرات المطلوبة

### الملف: `src/components/clients/ClientDetails.tsx`

**تمرير `group_id` إلى `CarFilterChips`:**

```tsx
// السطور 1325-1330
policies={policies.map(p => ({
  car: p.car,
  end_date: p.end_date,
  cancelled: p.cancelled,
  transferred: p.transferred,
  group_id: p.group_id,  // ← إضافة
}))}
```

---

### الملف: `src/components/clients/CarFilterChips.tsx`

#### 1. تحديث Interface لتشمل `group_id`:

```typescript
interface PolicyData {
  car: { id: string } | null;
  end_date: string;
  cancelled: boolean | null;
  transferred: boolean | null;
  group_id: string | null;  // ← إضافة
}
```

#### 2. تحديث منطق الحساب:

**بدلاً من:**
```typescript
const activePolicies = carPolicies.filter(...);
return { activePolicyCount: activePolicies.length }
```

**يصبح:**
```typescript
// حساب عدد البطاقات (packages + standalone)
const countCards = (policyList: PolicyData[], today: Date) => {
  const activePolicies = policyList.filter(p => 
    !p.cancelled && 
    !p.transferred && 
    new Date(p.end_date) >= today
  );
  
  // تجميع حسب group_id
  const grouped = new Set<string>();
  let standaloneCount = 0;
  
  activePolicies.forEach(p => {
    if (p.group_id) {
      grouped.add(p.group_id);
    } else {
      standaloneCount++;
    }
  });
  
  return grouped.size + standaloneCount;
};
```

#### 3. تطبيق على "كل السيارات" وكل سيارة:

```typescript
const carsWithPolicyCounts = useMemo((): CarWithPolicyCount[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return cars.map(car => {
    const carPolicies = policies.filter(p => p.car?.id === car.id);
    
    // حساب البطاقات الفعّالة
    const activeCardCount = countCards(carPolicies, today);
    
    // حساب إجمالي البطاقات
    const totalCardCount = countTotalCards(carPolicies);
    
    return {
      ...car,
      policyCount: totalCardCount,
      activePolicyCount: activeCardCount,
    };
  });
}, [cars, policies]);
```

---

## مثال توضيحي

```text
الوثائق في قاعدة البيانات:
┌────────────────────┬───────────┬────────────┐
│ الوثيقة            │ group_id  │ الحالة     │
├────────────────────┼───────────┼────────────┤
│ إلزامي            │ pkg_001   │ سارية      │
│ شامل              │ pkg_001   │ سارية      │
│ خدمات طريق        │ pkg_001   │ سارية      │
│ إلزامي (فردي)     │ null      │ سارية      │
│ ثالث (فردي)       │ null      │ سارية      │
│ إلزامي            │ pkg_002   │ منتهية     │
│ شامل              │ pkg_002   │ منتهية     │
└────────────────────┴───────────┴────────────┘

الحساب القديم: 7 وثائق (3 سارية من الباقة + 2 فردية + 2 منتهية)
الحساب الجديد: 
  - سارية: 1 (pkg_001) + 2 (فردية) = 3 بطاقات
  - إجمالي: 2 (packages) + 2 (standalone) = 4 بطاقات
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/clients/ClientDetails.tsx` | تمرير `group_id` للمكون |
| `src/components/clients/CarFilterChips.tsx` | تحديث الحساب ليعدّ البطاقات بدل الوثائق |

---

## النتيجة المتوقعة

| الحالة | قبل | بعد |
|--------|-----|-----|
| 14 بطاقة في الواجهة | "35 سارية" | "14 سارية" |
| الباقة بـ 3 وثائق | تُحسب 3 | تُحسب 1 |
| وثيقة فردية | تُحسب 1 | تُحسب 1 |

