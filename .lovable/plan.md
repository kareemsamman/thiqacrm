

# تحسينات صفحة تفاصيل تسوية الشركة + تحديث تقرير HTML

## 1. تسريع التعديل المباشر (Inline Edit)
حاليا عند الحفظ يتم إعادة جلب كل البيانات من السيرفر (`fetchCompanyAndPolicies`) مما يسبب بطء. سيتم تحويله إلى **تحديث متفائل (optimistic update)**: تحديث البيانات في الذاكرة فورا ثم إرسال التعديل للسيرفر في الخلفية بدون إعادة تحميل.

## 2. اسم العميل كرابط لصفحة العميل
الضغط على اسم العميل في الجدول سينقل المستخدم إلى `/clients` مع فتح تفاصيل العميل مباشرة (navigate to client page).

## 3. قيمة السيارة قابلة للتعديل المباشر
إضافة `car_value` إلى حقول التعديل المباشر. عند الحفظ يتم تحديث جدول `cars` بالإضافة لجدول `policies`.

## 4. تحديث تقرير HTML (Edge Function)
تحديث `generate-settlement-report` ليشمل الأعمدة الجديدة:
- الشركة المصنعة (manufacturer_name)
- تصنيف السيارة (car_type)
- قيمة السيارة (للشامل فقط)

استعلام الـ cars سيتغير من `cars (car_number)` إلى `cars (car_number, manufacturer_name, car_type, car_value)`.

## 5. إضافة زر بحث في صفحة CompanySettlement الرئيسية
إضافة حقل بحث في منطقة الفلاتر بصفحة `/reports/company-settlement`.

## 6. إزالة زر الطباعة من شريط الفلاتر
إزالة زر الطابعة (Printer) من الفلاتر في `CompanySettlementDetail.tsx` (السطر 650-652).

## التفاصيل التقنية

### ملف: `src/pages/CompanySettlementDetail.tsx`

**تسريع التعديل:**
- بدلا من `fetchCompanyAndPolicies()` بعد الحفظ، تحديث `policies` state مباشرة:
```typescript
setPolicies(prev => prev.map(p => 
  p.id === editingPolicyId 
    ? { ...p, insurance_price: editValues.insurance_price, ... } 
    : p
));
```

**رابط العميل:**
- تغيير خلية اسم العميل ليصبح رابط قابل للنقر:
```typescript
<span className="text-primary cursor-pointer hover:underline"
  onClick={() => navigate(`/clients?clientId=${policy.client?.id}`)}>
  {policy.client?.full_name}
</span>
```

**تعديل قيمة السيارة:**
- إضافة `car_value` في `editValues` state
- إضافة Input في خلية قيمة السيارة عند التعديل
- عند الحفظ: تحديث `supabase.from('cars').update({ car_value }).eq('id', carId)` بالإضافة للبوليصة

**إزالة زر الطباعة:**
- حذف السطور 650-652 (زر Printer)

### ملف: `supabase/functions/generate-settlement-report/index.ts`

**تحديث الاستعلام:**
```sql
cars (car_number, manufacturer_name, car_type, car_value)
```

**أعمدة جديدة في جدول HTML:**
- بعد "رقم السيارة": الشركة المصنعة، تصنيف السيارة
- بعد "النوع": قيمة السيارة (تظهر فقط للشامل)
- إضافة labels عربية لـ car_type
- colspan يتحدث من 10 إلى 13

### ملف: `src/pages/CompanySettlement.tsx`
- إضافة حقل بحث يفلتر الشركات بالاسم

### الملفات المتأثرة

| ملف | تغيير |
|------|--------|
| `src/pages/CompanySettlementDetail.tsx` | تسريع edit، رابط عميل، تعديل car_value، إزالة زر طباعة |
| `supabase/functions/generate-settlement-report/index.ts` | أعمدة جديدة في HTML |
| `src/pages/CompanySettlement.tsx` | إضافة حقل بحث |

