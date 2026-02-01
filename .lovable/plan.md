
# خطة: إضافة عمود اسم الشركة في جدول مكونات الباقة

## المشكلة

جدول "مكونات الباقة" لا يعرض اسم شركة التأمين لكل مكون:
- **حالياً**: نوع التأمين، الفترة، السعر، الربح
- **المطلوب**: نوع التأمين، **الشركة**، الفترة، السعر، الربح

---

## الحل التقني

### تعديل `PackageComponentsTable.tsx`

#### 1. إضافة عمود "الشركة" في رأس الجدول

```tsx
<TableHeader>
  <TableRow className="bg-muted/30">
    <TableHead className="font-bold">نوع التأمين</TableHead>
    <TableHead className="font-bold">الشركة</TableHead>  {/* جديد */}
    <TableHead className="font-bold">الفترة</TableHead>
    <TableHead className="font-bold text-left">السعر</TableHead>
    {isAdmin && <TableHead className="font-bold text-left">الربح</TableHead>}
  </TableRow>
</TableHeader>
```

#### 2. إضافة دالة للحصول على اسم الشركة

```typescript
const getCompanyName = (p: PackagePolicy) => {
  // For ROAD_SERVICE, show the service provider name
  if (p.policy_type_parent === 'ROAD_SERVICE' && p.road_services) {
    return p.road_services.name_ar || p.road_services.name;
  }
  // For ACCIDENT_FEE_EXEMPTION, show the service provider name
  if (p.policy_type_parent === 'ACCIDENT_FEE_EXEMPTION' && p.accident_fee_services) {
    return p.accident_fee_services.name_ar || p.accident_fee_services.name;
  }
  // For other types, show insurance company name
  if (p.insurance_companies) {
    return p.insurance_companies.name_ar || p.insurance_companies.name;
  }
  return '-';
};
```

#### 3. إضافة خلية الشركة في كل صف

```tsx
<TableCell>
  <span className="text-sm font-medium">{getCompanyName(policy)}</span>
</TableCell>
```

#### 4. تحديث colspan في الـ Footer

```tsx
<TableCell colSpan={3} className="text-left">  {/* كان 2 */}
  <span className="text-lg">المجموع</span>
</TableCell>
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| `src/components/policies/PackageComponentsTable.tsx` | إضافة عمود "الشركة" مع عرض اسم الشركة أو مقدم الخدمة |

---

## النتيجة المتوقعة

| نوع التأمين | الشركة | الفترة | السعر | الربح |
|-------------|--------|--------|-------|-------|
| طرف ثالث | **اراضي مقدسة** | 01/02/2026 ← 31/01/2027 | ₪1,200 | ₪300 |
| إلزامي | **اراضي مقدسة** | 01/02/2026 ← 31/01/2027 | ₪2,756 | - |
| خدمات الطريق | **زجاج + ونش ضفة قدس** | 01/02/2026 ← 31/01/2027 | ₪300 | ₪150 |

---

## ملاحظة

اسم الخدمة (مثل "زجاج + ونش ضفة قدس") سيظهر في عمود الشركة لأنواع ROAD_SERVICE و ACCIDENT_FEE_EXEMPTION، بينما اسم شركة التأمين سيظهر لأنواع ELZAMI و THIRD_FULL.
