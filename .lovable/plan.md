
# خطة: إضافة تفاصيل وثائق الباقة على البطاقة

## المشكلة الحالية
البطاقة تعرض badges لكل نوع تأمين في الباقة (إلزامي + ثالث + خدمات طريق + إعفاء رسوم) لكنها تعرض فقط:
- شركة الوثيقة الرئيسية
- تواريخ الوثيقة الرئيسية
- المبلغ الإجمالي

الزبون يحتاج للدخول إلى صفحة التفاصيل لمعرفة شركة كل نوع وتواريخه وسعره.

## الحل المقترح
إضافة قسم "ملخص الباقة" أسفل البيانات الرئيسية يعرض كل وثيقة في الباقة بشكل مختصر وأنيق:

```text
┌───────────────────────────────────────────────────────────────────┐
│ [سارية ✓] [ثالث] + [إلزامي] + [خدمات طريق] + [إعفاء رسوم] [باقة]│
├───────────────────────────────────────────────────────────────────┤
│ الشركة: أراضي مقدسة | السيارة: 8239858 | الفترة: ... | المبلغ: ₪3,600 │
├───────────────────────────────────────────────────────────────────┤
│ ┌─ مكونات الباقة ─────────────────────────────────────────────┐ │
│ │                                                              │ │
│ │  🛡️ إلزامي       أراضي مقدسة    02/02 → 31/01    ₪1,200    │ │
│ │  🚗 ثالث         أراضي مقدسة    02/02 → 31/01    ₪1,500    │ │
│ │  🛣️ خدمات طريق   شركة X        02/02 → 31/01      ₪600    │ │
│ │  💰 إعفاء رسوم   شركة X        02/02 → 31/01      ₪300    │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────┤
│ ملاحظات: ...                                                     │
└───────────────────────────────────────────────────────────────────┘
```

## التصميم المحسن
- **للباقات فقط** (حيث يوجد mainPolicy + addons)
- قسم صغير ومطوي بشكل افتراضي (يمكن توسيعه بنقرة)
- جدول بسيط بأربع أعمدة: النوع | الشركة | الفترة | السعر
- تصميم خفيف لا يثقل البطاقة
- **أو بديلاً**: عرض مباشر بدون طي (compact horizontal list)

## التغييرات التقنية

| الملف | التغيير |
|-------|---------|
| `src/components/clients/PolicyYearTimeline.tsx` | إضافة قسم "مكونات الباقة" داخل PolicyPackageCard |

## الخطوات

1. **تعديل PolicyPackageCard**
   - إضافة prop جديد لتمرير كل الوثائق في الباقة (mainPolicy + addons) مع بياناتها الكاملة
   - إضافة قسم جديد بين "Main Content Grid" و "Notes Section"

2. **قسم مكونات الباقة (للباقات فقط)**
   ```tsx
   {isPackage && pkg.addons.length > 0 && (
     <div className="mt-3 pt-3 border-t border-border/50">
       <div className="text-xs font-medium text-muted-foreground mb-2">
         مكونات الباقة
       </div>
       <div className="space-y-1">
         {/* Main policy */}
         {pkg.mainPolicy && (
           <PackageComponentRow policy={pkg.mainPolicy} />
         )}
         {/* Addons */}
         {pkg.addons.map(addon => (
           <PackageComponentRow key={addon.id} policy={addon} />
         ))}
       </div>
     </div>
   )}
   ```

3. **مكون PackageComponentRow الجديد**
   - صف مدمج صغير لكل وثيقة
   - يعرض: أيقونة النوع + اسم النوع + الشركة + التاريخ + السعر
   - خط صغير (text-xs) وألوان هادئة

## مثال الكود

```tsx
function PackageComponentRow({ policy }: { policy: PolicyRecord }) {
  const typeLabel = getDisplayLabel(policy);
  const typeColor = policyTypeColors[policy.policy_type_parent];
  
  return (
    <div className="flex items-center justify-between text-xs bg-muted/30 rounded-md px-2 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <Badge className={cn("text-[10px] px-1.5 py-0", typeColor)}>
          {typeLabel}
        </Badge>
        <span className="text-muted-foreground truncate">
          {policy.company?.name_ar || policy.company?.name || '-'}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-muted-foreground ltr-nums">
          {formatDate(policy.start_date).slice(0,5)} → {formatDate(policy.end_date).slice(0,5)}
        </span>
        <span className="font-semibold ltr-nums">
          ₪{policy.insurance_price.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
```

## النتيجة المتوقعة
- الزبون يرى كل تفاصيل الباقة مباشرة على البطاقة
- لا حاجة للدخول إلى صفحة التفاصيل لمعرفة شركة كل نوع
- تصميم أنيق ومدمج لا يزحم البطاقة
- يظهر فقط للباقات (الوثائق المنفردة تبقى كما هي)
