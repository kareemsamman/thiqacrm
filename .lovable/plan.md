

# تحديث صفحة تفاصيل تسوية الشركة + أرقام إنجليزية في كل الموقع

## التغييرات المطلوبة

### 1. تحويل كل الأرقام العربية إلى إنجليزية في كل الموقع
حاليا يوجد `toLocaleString('ar-EG')` في 10 ملفات مما يُظهر أرقام عربية (٠١٢٣). سيتم استبدالها جميعا بـ `toLocaleString('en-US')` أو استخدام `formatNumber` / `formatCurrency` من `src/lib/utils.ts`.

**الملفات المتأثرة:**
| ملف | عدد الاستبدالات |
|------|----------------|
| `src/pages/CompanySettlementDetail.tsx` | ~10 |
| `src/pages/CompanySettlement.tsx` | ~6 |
| `src/pages/Expenses.tsx` | متعدد |
| `src/components/dashboard/ProfitBreakdownChart.tsx` | 3 |
| `src/components/payments/TranzilaPaymentModal.tsx` | 1 |
| `src/pages/ElzamiCostsReport.tsx` | 1 |
| `src/pages/FinancialReports.tsx` | متعدد |
| `src/pages/BrokerWallet.tsx` | متعدد |
| `src/pages/CompanyWallet.tsx` | متعدد |
| `src/pages/Dashboard.tsx` | متعدد |

### 2. إضافة بحث شامل في صفحة تفاصيل التسوية
إضافة حقل بحث يبحث في كل الأعمدة: اسم العميل، رقم السيارة، نوع السيارة، المبالغ، نوع التأمين.

### 3. ترتيب من الأقدم للأحدث (افتراضي) مع خيار العكس
- تغيير الترتيب الافتراضي من `ascending: false` إلى `ascending: true` (الأقدم أولا)
- إضافة زر لتبديل الترتيب بين قديم-جديد وجديد-قديم

### 4. أعمدة جديدة لبوالص الشامل
- **سعر السيارة** (`car_value`): يظهر فقط عندما تكون البوليصة شامل (THIRD_FULL + child = FULL)
- **نوع/موديل السيارة** (`manufacturer_name`): مثلا Mazda
- **تصنيف السيارة** (`car_type`): خصوصي، تجاري، شحن...

ملاحظة: بيانات `manufacturer_name` و `car_type` و `car_value` موجودة بالفعل في استعلام `cars` الحالي. فقط نحتاج إضافة `manufacturer_name` للـ select وعرض الأعمدة.

### 5. عرض الوثائق الملغية للشركة المختارة
حاليا الفلتر موجود بالفعل (`includeCancelled`). يعمل بشكل صحيح - الملغية تظهر مع badge "ملغية" وشفافية.

### 6. عرض الشيكات المرتبطة بالشركة
إضافة قسم/تبويب جديد يعرض الشيكات التي تم تحويلها لهذه الشركة عبر `outside_cheques` حيث `transferred_to_id = companyId` و `transferred_to_type = 'company'`. حاليا لا توجد بيانات بهذه الطريقة، لكن سنبني البنية جاهزة. سيظهر أيضا رابط لمحفظة الشركة حيث يمكن رؤية كل الدفعات.

### 7. تعديل مباشر (Inline Edit) للمبالغ
عند الضغط على زر التعديل، تتحول خلايا "سعر التأمين" و "المستحق للشركة" و "الربح" إلى حقول إدخال. عند الحفظ، يتم تحديث جدول `policies` مباشرة وإعادة تحميل البيانات.

## التفاصيل التقنية

### ملف: `src/pages/CompanySettlementDetail.tsx`

**تغييرات الاستعلام:**
- إضافة `manufacturer_name` في select الـ cars
- تغيير `.order('created_at', { ascending: false })` إلى `ascending: true`

**State جديد:**
```
searchQuery: string          // نص البحث
sortAsc: boolean (true)      // ترتيب تصاعدي (افتراضي)
editingPolicyId: string|null // البوليصة قيد التعديل
editValues: { insurance_price, payed_for_company, profit }
savingEdit: boolean
```

**فلترة البحث (client-side):**
```
filteredPolicies يُفلتر أيضا حسب searchQuery:
- client.full_name
- car.car_number  
- car.manufacturer_name
- insurance_price / payed_for_company / profit (كنص)
- policy_type label
```

**ترتيب:**
```
filteredPolicies.sort بحسب start_date مع خيار ascending/descending
```

**أعمدة جديدة في الجدول:**
- بعد عمود "السيارة": عمود "الشركة المصنعة" (manufacturer_name)
- بعده: عمود "تصنيف السيارة" (car_type مع labels عربية)
- بعد "نوع التأمين": عمود "قيمة السيارة" (يظهر فقط للشامل)

**Inline Edit:**
- زر التعديل الموجود (Pencil) يفعّل وضع التعديل المباشر للصف
- الخلايا الثلاث (سعر التأمين، المستحق، الربح) تصبح inputs
- أزرار حفظ/إلغاء تظهر في عمود الإجراءات
- عند الحفظ: `supabase.from('policies').update({...}).eq('id', policyId)`

**Interface update:**
```typescript
interface PolicyDetail {
  // ... existing fields
  car: {
    // ... existing fields
    manufacturer_name: string | null;  // إضافة جديدة
  } | null;
}
```

### الملفات المتأثرة (ملخص)

| ملف | تغيير |
|------|--------|
| `src/pages/CompanySettlementDetail.tsx` | بحث، ترتيب، أعمدة جديدة، inline edit، أرقام إنجليزية |
| `src/pages/CompanySettlement.tsx` | أرقام إنجليزية |
| `src/pages/Expenses.tsx` | أرقام إنجليزية |
| `src/components/dashboard/ProfitBreakdownChart.tsx` | أرقام إنجليزية |
| `src/components/payments/TranzilaPaymentModal.tsx` | أرقام إنجليزية |
| `src/pages/ElzamiCostsReport.tsx` | أرقام إنجليزية |
| `src/pages/FinancialReports.tsx` | أرقام إنجليزية |
| `src/pages/BrokerWallet.tsx` | أرقام إنجليزية |
| `src/pages/CompanyWallet.tsx` | أرقام إنجليزية |
| `src/pages/Dashboard.tsx` | أرقام إنجليزية |

