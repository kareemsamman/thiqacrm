
# خطة إصلاح مشاكل معالج الوثائق ومحفظة العميل

## المشاكل المكتشفة

### 1. تواريخ إضافات الباقة لا تُملأ تلقائياً
**الوضع الحالي**: عند تفعيل خدمات الطريق أو رسوم الحادث، التواريخ تظهر فارغة (DD/MM/YYYY)
**السبب**: `useEffect` في `PackageBuilderSection.tsx` يعمل فقط عند تغيير `enabled` لكنه لا يُطبق التواريخ فوراً
**الحل**: تعديل منطق التهيئة ليُطبق التواريخ مباشرة عند التفعيل

### 2. قائمة خدمات الطريق لا تُفلتر حسب أسعار الشركة
**الوضع الحالي**: الـ dropdown يعرض "زجاج" كخيار منفصل، لكن شركة اكس لا تبيع "زجاج" بل تبيع خدمات مركبة
**البيانات المتوفرة في قاعدة البيانات**:
- "زجاج" (id: d7785fc6-4f2a-41d4-9c7c-89a8c341ec64) - لا سعر من شركة اكس
- "زجاج +ونش ضفة قدس" - سعر ₪300 من شركة اكس
- "زجاج +ونش +سيارة بديلة" - سعر ₪500 من شركة اكس
- etc.

**الحل**: 
1. فلترة الخدمات المعروضة حسب `company_road_service_prices` للشركة المختارة
2. بدلاً من عرض كل الخدمات → عرض فقط الخدمات التي لها سعر مُعرّف

### 3. محفظة العميل - إجمالي المدفوع يُظهر ₪0
**الوضع الحالي**: العميل دفع ₪1,000 للإلزامي مباشرة للشركة، لكن المحفظة تُظهر ₪0
**السبب**: الحساب الحالي يستثني دفعات ELZAMI بالكامل
**الحل المطلوب من المستخدم**: 
- إظهار المبلغ المدفوع ₪1,000 للوضوح
- مع ملاحظة أنه ذهب للشركة وليس لـ AB
- تعديل حساب "إجمالي المدفوع" ليشمل كل الدفعات

### 4. محفظة العميل - المتبقي يُظهر ₪300 بدل ₪1,300
**الوضع الحالي**: 
- سعر الباقة = ₪2,300 (إلزامي ₪1,000 + ثالث ₪1,000 + خدمات ₪300)
- المدفوع = ₪1,000 (للإلزامي)
- المتبقي يجب = ₪1,300

**السبب**: الحساب الحالي يستثني سعر ELZAMI من المجموع، فيحسب:
- سعر بدون إلزامي = ₪1,300
- مدفوع = ₪0 (لأن دفعات الإلزامي مستثناة)
- متبقي = ₪1,300 - ₪0 = ₪1,300 ✗ (لكن يظهر ₪300)

**التحليل**: المشكلة أن الدفعات على الإلزامي لا تُحسب ضمن المدفوع للباقة

**الحل**: 
- سعر الباقة = إجمالي كل المكونات (بما فيها ELZAMI)
- المدفوع = كل الدفعات على كل وثائق الباقة
- المتبقي = السعر الإجمالي - المدفوع

### 5. الربح يُظهر ₪100 بدل ₪400 (إجمالي الباقة)
**الوضع الحالي**: يُظهر ربح الوثيقة الرئيسية فقط (ثالث = ₪100)
**المطلوب**: إظهار إجمالي ربح الباقة = ₪100 + ₪300 = ₪400
**الحل**: تعديل عرض الربح ليستخدم `packageTotalProfit` بدل `policy.profit`

---

## التغييرات المطلوبة

### الملف 1: `src/components/policies/wizard/PackageBuilderSection.tsx`

| التغيير | التفاصيل |
|---------|----------|
| تواريخ تلقائية | تطبيق التواريخ فوراً عند toggle الـ enabled |
| فلترة الخدمات | إضافة state لجلب الخدمات المتاحة حسب الشركة المختارة |

**التغيير 1 - تواريخ تلقائية**:
```typescript
// في updateAddon, عند تفعيل addon جديد، نُطبق التواريخ فوراً
const updateAddon = (type, updates) => {
  // إذا كان التحديث يتضمن enabled: true
  if (updates.enabled === true) {
    const thirdFullAddon = addons.find(a => a.type === 'third_full');
    let defaultStart = mainStartDate;
    let defaultEnd = mainEndDate;
    
    // للخدمات، نفضل تواريخ third_full إن وجدت
    if ((type === 'road_service' || type === 'accident_fee_exemption') && 
        thirdFullAddon?.enabled && thirdFullAddon.start_date) {
      defaultStart = thirdFullAddon.start_date;
      defaultEnd = thirdFullAddon.end_date || calculateEndDate(thirdFullAddon.start_date);
    }
    
    // نُضيف التواريخ للتحديث
    updates = {
      ...updates,
      start_date: defaultStart,
      end_date: defaultEnd || calculateEndDate(defaultStart)
    };
  }
  
  // ... باقي المنطق
};
```

**التغيير 2 - فلترة الخدمات حسب أسعار الشركة**:
```typescript
// إضافة state للخدمات المتاحة
const [availableRoadServices, setAvailableRoadServices] = useState<RoadService[]>([]);

// useEffect لجلب الخدمات المتاحة عند تغيير الشركة
useEffect(() => {
  const fetchAvailableServices = async () => {
    if (!roadServiceAddon.company_id) {
      setAvailableRoadServices(filteredRoadServices);
      return;
    }
    
    // جلب الخدمات التي لها أسعار من هذه الشركة
    const { data } = await supabase
      .from('company_road_service_prices')
      .select('road_service_id')
      .eq('company_id', roadServiceAddon.company_id);
    
    const serviceIds = data?.map(d => d.road_service_id) || [];
    
    // فلترة حسب نوع السيارة + الأسعار المتاحة
    const available = filteredRoadServices.filter(rs => serviceIds.includes(rs.id));
    setAvailableRoadServices(available);
  };
  
  fetchAvailableServices();
}, [roadServiceAddon.company_id, carType, roadServices]);
```

### الملف 2: `src/components/clients/ClientDetails.tsx`

| التغيير | التفاصيل |
|---------|----------|
| حساب المدفوع | تضمين كل الدفعات بما فيها ELZAMI |
| حساب المتبقي | السعر الإجمالي - كل المدفوع |

**تعديل fetchPaymentSummary**:
```typescript
const fetchPaymentSummary = async () => {
  // جلب كل الوثائق النشطة (بما فيها ELZAMI)
  const { data: policiesData } = await supabase
    .from('policies')
    .select('id, insurance_price, profit, policy_type_parent, group_id')
    .eq('client_id', client.id)
    .eq('cancelled', false)
    .eq('transferred', false)
    .is('deleted_at', null);

  // حساب السعر الإجمالي (بما فيها ELZAMI للعرض)
  const totalInsurance = policiesData.reduce((sum, p) => sum + (p.insurance_price || 0), 0);
  
  // حساب الربح (ELZAMI = 0)
  const totalProfit = policiesData.reduce((sum, p) => sum + (p.profit || 0), 0);

  // جلب كل الدفعات
  const policyIds = policiesData.map(p => p.id);
  const { data: paymentsData } = await supabase
    .from('policy_payments')
    .select('amount, refused')
    .in('policy_id', policyIds);

  const totalPaid = paymentsData
    .filter(p => !p.refused)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // المتبقي = الإجمالي - المدفوع
  setPaymentSummary({
    total_paid: totalPaid,
    total_remaining: Math.max(0, totalInsurance - totalPaid),
    total_profit: totalProfit,
  });
};
```

### الملف 3: `src/components/policies/PolicyDetailsDrawer.tsx`

| التغيير | التفاصيل |
|---------|----------|
| عرض الربح | استخدام `packageTotalProfit` للباقات |
| تسمية | تغيير "الربح من الوثيقة" → "إجمالي ربح الباقة" |

**تعديل عرض الربح (حوالي السطر 1004)**:
```tsx
// تغيير العنوان
<span className="text-sm font-medium">
  {hasPackage ? 'إجمالي ربح الباقة' : 'الربح من الوثيقة'}
</span>

// تغيير القيمة
<p className="text-3xl font-bold ltr-nums">
  {formatCurrency(hasPackage ? packageTotalProfit : policy.profit)}
</p>
```

---

## ملخص الملفات المتأثرة

| الملف | التغييرات |
|-------|----------|
| `src/components/policies/wizard/PackageBuilderSection.tsx` | 1. تواريخ تلقائية عند التفعيل 2. فلترة الخدمات حسب أسعار الشركة |
| `src/components/clients/ClientDetails.tsx` | تعديل حساب المدفوع والمتبقي ليشمل ELZAMI |
| `src/components/policies/PolicyDetailsDrawer.tsx` | عرض إجمالي ربح الباقة بدل ربح الوثيقة الفردية |

---

## نتائج متوقعة

1. ✅ عند تفعيل خدمات الطريق/رسوم الحادث → التواريخ تُملأ تلقائياً
2. ✅ قائمة الخدمات تُظهر فقط ما تبيعه الشركة المختارة
3. ✅ محفظة العميل تُظهر ₪1,000 كإجمالي مدفوع
4. ✅ المتبقي = ₪2,300 - ₪1,000 = ₪1,300
5. ✅ الربح يُظهر ₪400 (إجمالي الباقة)
