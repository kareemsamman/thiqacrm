
# تحديثات جدول الوثائق - تصحيح الأعمدة والفلاتر والترتيب

## ملخص المشاكل والحلول

| المشكلة | الحل |
|---------|------|
| السهم باتجاه خاطئ (→) | تغيير إلى (←) |
| خدمات الطريق بدون نوع الخدمة | إضافة نوع الخدمة الفرعي |
| ترتيب التواريخ معكوس | تبديل: البداية ← النهاية |
| عمود "أنشأها" بدون تاريخ | إضافة التاريخ والوقت تحت الاسم |
| عرض عمود الدفع ضيق | زيادة العرض |
| البحث لا يعمل | تفعيل البحث في الـ Query |
| الفلاتر لا تؤثر | موجودة لكن البحث مفقود |
| الترتيب الافتراضي | التأكد من `created_at DESC` |

---

## التغييرات التفصيلية

### 1. إصلاح اتجاه السهم في عمود التأمينات

**قبل:**
```
شامل → اراضي مقدسة
```

**بعد:**
```
شامل ← اراضي مقدسة
```

**لخدمات الطريق:**
```
خدمات الطريق ← شركة اكس ← زجاج وجرار
```

### 2. إضافة نوع الخدمة الفرعي للـ ROAD_SERVICE و ACCIDENT_FEE_EXEMPTION

**مصدر البيانات:**
- `policies.road_service_id` → جدول `road_services`
- `policies.accident_fee_service_id` → جدول `accident_fee_services`

**تحديث الـ Query:**
```typescript
// إضافة للـ select
road_services(id, name, name_ar),
accident_fee_services(id, name, name_ar)
```

**تحديث التنسيق:**
```typescript
// للتأمين العادي
نوع التأمين ← اسم الشركة

// لخدمات الطريق
خدمات الطريق ← اسم الشركة ← نوع الخدمة

// لإعفاء الحوادث
إعفاء حوادث ← اسم الشركة ← نوع الخدمة
```

### 3. إصلاح ترتيب التواريخ

**قبل:**
```
09/02/2027 ← 10/02/2026
(تاريخ النهاية أولاً)
```

**بعد:**
```
10/02/2026 ← 09/02/2027
(تاريخ البداية أولاً ← تاريخ النهاية)
```

### 4. إضافة التاريخ والوقت لعمود "أنشأها"

**قبل:**
```
raghda
```

**بعد:**
```
raghda
10/02/2026 • 14:35
```

### 5. تعديل عرض الأعمدة

| العمود | قبل | بعد |
|--------|-----|------|
| الدفع | `w-[100px]` | `min-w-[130px]` |
| الفترة | `min-w-[180px]` | `min-w-[170px]` |

### 6. تفعيل البحث في الـ Query

**المشكلة:** `searchQuery` موجود في state لكن لا يُستخدم في الـ Query!

**الحل:** إضافة شرط البحث للـ Query:
```typescript
// البحث في الـ client name, file_number, car_number, phone
if (searchQuery.trim()) {
  query = query.or(`
    clients.full_name.ilike.%${searchQuery}%,
    clients.file_number.ilike.%${searchQuery}%,
    clients.phone_number.ilike.%${searchQuery}%,
    cars.car_number.ilike.%${searchQuery}%
  `);
}
```

**ملاحظة:** البحث في العلاقات المتداخلة مع Supabase صعب. الحل البديل: استخدام RPC function أو البحث في الـ frontend بعد الـ fetch.

### 7. الترتيب الافتراضي

موجود حالياً: `.order('created_at', { ascending: false })`

---

## التفاصيل التقنية

### الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/pages/Policies.tsx` | تحديث الـ Query لإضافة road_services و accident_fee_services + تفعيل البحث |
| `src/components/policies/PolicyTableView.tsx` | تحديث عرض التأمينات والتواريخ والأعمدة |
| `src/components/policies/cards/types.ts` | إضافة road_services و accident_fee_services للـ interface |

### تحديث PolicyRecord Interface

```typescript
export interface PolicyRecord {
  // ... existing fields
  road_service_id?: string | null;
  accident_fee_service_id?: string | null;
  road_services?: {
    id: string;
    name: string;
    name_ar: string | null;
  } | null;
  accident_fee_services?: {
    id: string;
    name: string;
    name_ar: string | null;
  } | null;
  created_at?: string; // للتاريخ والوقت
}
```

### تحديث Query في Policies.tsx

```typescript
let query = supabase
  .from('policies')
  .select(`
    *,
    clients(id, full_name, phone_number, file_number, less_than_24),
    cars(id, car_number, car_type, car_value, year),
    insurance_companies(id, name, name_ar),
    road_services(id, name, name_ar),
    accident_fee_services(id, name, name_ar),
    created_by:profiles!policies_created_by_admin_id_fkey(full_name, email),
    branch:branches(id, name, name_ar)
  `, { count: 'exact' })
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
```

### تحديث getInsuranceLines

```typescript
const getInsuranceLines = (group: PolicyGroup) => {
  const allPolicies = [
    ...(group.mainPolicy ? [group.mainPolicy] : []),
    ...group.addons,
  ];

  return allPolicies.map((policy) => {
    const label =
      policy.policy_type_parent === 'THIRD_FULL' && policy.policy_type_child
        ? policyChildLabels[policy.policy_type_child]
        : policyTypeLabels[policy.policy_type_parent];

    const companyName =
      policy.insurance_companies?.name_ar ||
      policy.insurance_companies?.name ||
      '';

    // Service subtype for ROAD_SERVICE and ACCIDENT_FEE_EXEMPTION
    let serviceName = '';
    if (policy.policy_type_parent === 'ROAD_SERVICE' && policy.road_services) {
      serviceName = policy.road_services.name_ar || policy.road_services.name;
    } else if (policy.policy_type_parent === 'ACCIDENT_FEE_EXEMPTION' && policy.accident_fee_services) {
      serviceName = policy.accident_fee_services.name_ar || policy.accident_fee_services.name;
    }

    return { label, companyName, serviceName, policyId: policy.id };
  });
};
```

### تحديث عرض التأمينات (JSX)

```tsx
<TableCell>
  <div className="flex flex-col gap-0.5 text-xs">
    {insuranceLines.map((line) => (
      <div key={line.policyId} className="whitespace-nowrap">
        <span className="font-medium">{line.label}</span>
        {line.companyName && (
          <span className="text-muted-foreground"> ← {line.companyName}</span>
        )}
        {line.serviceName && (
          <span className="text-muted-foreground"> ← {line.serviceName}</span>
        )}
      </div>
    ))}
  </div>
</TableCell>
```

### تحديث عرض التواريخ (JSX)

```tsx
<TableCell>
  <div className="flex flex-col gap-0.5 text-xs">
    {dateRanges.map((range, idx) => (
      <div key={idx} className="whitespace-nowrap">
        <span>{range.start}</span>
        <span className="text-muted-foreground"> ← {range.end}</span>
      </div>
    ))}
  </div>
</TableCell>
```

### تحديث عمود "أنشأها" (JSX)

```tsx
<TableCell>
  <div className="flex flex-col">
    <span className="truncate max-w-[90px] block text-sm">
      {creatorName}
    </span>
    {createdAt && (
      <span className="text-[10px] text-muted-foreground">
        {formatDateTime(createdAt)}
      </span>
    )}
  </div>
</TableCell>
```

### دالة تنسيق التاريخ والوقت

```typescript
const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} • ${hours}:${minutes}`;
};
```

### حل مشكلة البحث

لأن Supabase لا يدعم البحث في العلاقات المتداخلة بسهولة، سنستخدم أحد الحلول:

**الحل 1: RPC Function (مفضل للأداء)**
```sql
CREATE OR REPLACE FUNCTION search_policies(search_term TEXT)
RETURNS SETOF policies AS $$
  SELECT p.*
  FROM policies p
  LEFT JOIN clients c ON p.client_id = c.id
  LEFT JOIN cars ca ON p.car_id = ca.id
  WHERE 
    c.full_name ILIKE '%' || search_term || '%' OR
    c.file_number ILIKE '%' || search_term || '%' OR
    c.phone_number ILIKE '%' || search_term || '%' OR
    ca.car_number ILIKE '%' || search_term || '%'
$$ LANGUAGE SQL;
```

**الحل 2: Frontend Filter (أسهل للتنفيذ)**
```typescript
// بعد الـ fetch، نطبق filter على البيانات
const filteredPolicies = useMemo(() => {
  if (!searchQuery.trim()) return policies;
  const q = searchQuery.toLowerCase().trim();
  return policies.filter(p => {
    const clientName = p.clients?.full_name?.toLowerCase() || '';
    const fileNumber = p.clients?.file_number?.toLowerCase() || '';
    const phone = p.clients?.phone_number?.toLowerCase() || '';
    const carNumber = p.cars?.car_number?.toLowerCase() || '';
    return clientName.includes(q) || fileNumber.includes(q) || 
           phone.includes(q) || carNumber.includes(q);
  });
}, [policies, searchQuery]);
```

---

## خطوات التنفيذ

1. **تحديث `types.ts`**:
   - إضافة `road_services` و `accident_fee_services` للـ PolicyRecord interface
   - إضافة `created_at` للـ PolicyRecord interface

2. **تحديث `Policies.tsx`**:
   - إضافة road_services و accident_fee_services للـ Query
   - إضافة منطق البحث (frontend filter أو RPC)

3. **تحديث `PolicyTableView.tsx`**:
   - تحديث `getInsuranceLines()` لإرجاع `serviceName`
   - تغيير السهم من → إلى ←
   - تبديل ترتيب التواريخ
   - إضافة التاريخ والوقت لعمود "أنشأها"
   - تعديل عرض الأعمدة
