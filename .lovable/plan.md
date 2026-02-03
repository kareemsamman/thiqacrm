
# خطة: تحسينات معالج الوثائق وملف العميل

---

## المتطلبات

### 1. تعطيل زر "التالي" عند اختيار شامل بدون سعر السيارة
عند اختيار نوع التأمين **شامل** (FULL) في الخطوة 3، يجب تعطيل زر "التالي" حتى يتم إدخال قيمة السيارة.

### 2. إضافة نوع السيارة في فلتر السيارات بملف العميل
عرض نوع السيارة (خصوصي، شحن، تاكسي، إلخ) في كل شريحة سيارة.

### 3. عرض عدد الوثائق النشطة والإجمالية
- عرض عدد الوثائق النشطة بجانب العدد الإجمالي
- تحسين UX لجعل المعلومات واضحة ومقروءة

---

## التفاصيل الفنية

### الملف 1: `src/components/policies/wizard/usePolicyWizardState.ts`

**المشكلة الحالية (السطور 226-246):**
```typescript
const step3Valid = !!(policy.company_id && policy.start_date && policy.end_date && policy.insurance_price && ...);
```
لا يتحقق من وجود `full_car_value` عند اختيار شامل.

**الحل:**
إضافة تحقق من قيمة السيارة في `step3Valid`:

```typescript
// Check car value requirement for FULL insurance
const fullInsuranceCarValueValid = 
  policy.policy_type_parent !== 'THIRD_FULL' || 
  policy.policy_type_child !== 'FULL' ||
  !!(policy.full_car_value && parseFloat(policy.full_car_value) > 0);

const step3Valid = !!(
  policy.company_id && 
  policy.start_date && 
  policy.end_date && 
  policy.insurance_price && 
  fullInsuranceCarValueValid &&  // ← إضافة هذا الشرط
  elzamiAddonValid && 
  thirdFullAddonValid && 
  roadServiceAddonValid && 
  accidentFeeAddonValid
);
```

---

### الملف 2: `src/components/clients/CarFilterChips.tsx`

**المشكلة الحالية:**
- لا يعرض نوع السيارة
- يعرض عدد الوثائق الإجمالي فقط
- لا يفرق بين النشطة والمنتهية

**التغييرات المطلوبة:**

#### أ) تحديث Interface لتشمل `car_type`:
```typescript
interface CarRecord {
  id: string;
  car_number: string;
  manufacturer_name: string | null;
  model: string | null;
  year: number | null;
  car_type: string | null;  // ← إضافة
}

interface CarWithPolicyCount extends CarRecord {
  policyCount: number;
  activePolicyCount: number;  // ← إضافة
}
```

#### ب) تحديث Props لتشمل معلومات end_date:
```typescript
interface CarFilterChipsProps {
  cars: CarRecord[];
  policies: { 
    car: { id: string } | null;
    end_date: string;  // ← إضافة
    cancelled: boolean | null;  // ← إضافة
    transferred: boolean | null;  // ← إضافة
  }[];
  selectedCarId: string;
  onSelect: (carId: string) => void;
}
```

#### ج) حساب الوثائق النشطة:
```typescript
const carsWithPolicyCounts = useMemo((): CarWithPolicyCount[] => {
  const today = new Date();
  return cars.map(car => {
    const carPolicies = policies.filter(p => p.car?.id === car.id);
    const activePolicies = carPolicies.filter(p => 
      !p.cancelled && 
      !p.transferred && 
      new Date(p.end_date) >= today
    );
    return {
      ...car,
      policyCount: carPolicies.length,
      activePolicyCount: activePolicies.length,
    };
  });
}, [cars, policies]);

// إجمالي النشطة للكل
const totalActivePolicies = useMemo(() => {
  const today = new Date();
  return policies.filter(p => 
    !p.cancelled && 
    !p.transferred && 
    new Date(p.end_date) >= today
  ).length;
}, [policies]);
```

#### د) تحديث UI لعرض نوع السيارة والوثائق النشطة:

**بطاقة "الكل":**
```jsx
<div className="...">
  <span>الكل</span>
  <div className="flex items-center gap-1">
    <span className="text-success">{totalActivePolicies} سارية</span>
    <span className="text-muted-foreground">/ {totalPolicies}</span>
  </div>
</div>
```

**بطاقة السيارة:**
```jsx
{/* نوع السيارة */}
{car.car_type && (
  <span className="text-[8px] text-black/60 font-medium">
    {carTypeLabels[car.car_type] || car.car_type}
  </span>
)}

{/* عداد الوثائق */}
<div className="absolute -top-2 -left-2 flex items-center gap-0.5">
  {/* الوثائق النشطة */}
  {car.activePolicyCount > 0 && (
    <div className="h-5 w-5 rounded-full bg-success text-white text-[10px] font-bold flex items-center justify-center">
      {car.activePolicyCount}
    </div>
  )}
  {/* إجمالي الوثائق إذا يختلف */}
  {car.policyCount > car.activePolicyCount && (
    <div className="h-4 w-4 rounded-full bg-muted text-muted-foreground text-[9px] font-bold flex items-center justify-center">
      {car.policyCount}
    </div>
  )}
</div>
```

---

### الملف 3: `src/components/clients/ClientDetails.tsx`

**التغييرات المطلوبة:**

تحديث استدعاء `CarFilterChips` لتمرير البيانات الإضافية:

```typescript
<CarFilterChips
  cars={cars}
  policies={policies.map(p => ({
    car: p.car,
    end_date: p.end_date,
    cancelled: p.cancelled,
    transferred: p.transferred,
  }))}
  selectedCarId={policyCarFilter}
  onSelect={setPolicyCarFilter}
/>
```

---

## تصميم UX المقترح

### بطاقة السيارة المحسّنة:

```text
┌─────────────────────────────────────┐
│  🟢 3                              ✓ │  ← 3 وثائق سارية (أخضر)
│  ┌─────────────────────────────────┐ │
│  │  🇮🇱   │   55-722-52            │ │  ← لوحة السيارة
│  │  IL   │   2013 • خصوصي         │ │  ← السنة + نوع السيارة
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### بطاقة "الكل":

```text
┌──────────────────┐
│       🚗        │
│      الكل       │
│   5 سارية / 8   │  ← 5 نشطة من 8 إجمالي
└──────────────────┘
```

---

## الملفات المتأثرة

| الملف | التغيير |
|-------|---------|
| `src/components/policies/wizard/usePolicyWizardState.ts` | إضافة شرط قيمة السيارة في `step3Valid` |
| `src/components/clients/CarFilterChips.tsx` | إضافة نوع السيارة + الوثائق النشطة |
| `src/components/clients/ClientDetails.tsx` | تمرير بيانات الوثائق الإضافية |

---

## النتيجة المتوقعة

1. ✅ زر "التالي" يصبح معطلاً عند اختيار شامل بدون إدخال قيمة السيارة
2. ✅ نوع السيارة (خصوصي، شحن، تاكسي) يظهر في كل بطاقة سيارة
3. ✅ عدد الوثائق النشطة (سارية) يظهر بلون أخضر
4. ✅ العدد الإجمالي يظهر بلون رمادي إذا كان مختلفاً
5. ✅ بطاقة "الكل" تعرض "X سارية / Y" للوضوح
