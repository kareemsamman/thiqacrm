
# خطة إصلاح مشاكل عرض الوثائق والتابعين

## المشاكل المحددة

### 1. الوثيقة الجديدة لا تظهر فوراً (تظهر "وثيقة 3" بدلاً من "وثيقة 4")
**السبب**: على الرغم من أن `onSaved` في `PolicyWizard.tsx` يستدعي `fetchPolicies()` و `fetchPaymentSummary()` بعد تأخير 150ms، إلا أن العداد في الواجهة يعتمد على state `policies` والتي قد لا تُحدّث بشكل صحيح.

**التحليل**:
- الكود في `ClientDetails.tsx` (سطور 1428-1439) يستدعي `Promise.all([fetchPolicies(), fetchPaymentSummary(), fetchPayments(), fetchCars()])` بعد تأخير 100ms
- المشكلة المحتملة: التأخير غير كافٍ أو أن الحالة لا تُحدّث بسبب closure قديم

### 2. معلومات التابعين (الأولاد المسموح لهم بالقيادة) لا تظهر في البطاقات
**السبب**: 
- `PolicyYearTimeline.tsx` لا يجلب معلومات `policy_children` من قاعدة البيانات
- البطاقات لا تعرض مؤشر للتابعين
- الواجهة `PolicyRecord` لا تتضمن عدد التابعين

---

## التغييرات المطلوبة

### الجزء 1: إصلاح التحديث الفوري للوثائق

| الملف | التغيير |
|------|---------|
| `src/components/policies/PolicyWizard.tsx` | زيادة التأخير من 150ms إلى 300ms لضمان اكتمال عمليات الكتابة في قاعدة البيانات |
| `src/components/clients/ClientDetails.tsx` | استدعاء مباشر (بدون `setTimeout` في `Promise.all`) + إضافة `key` للـ `PolicyYearTimeline` لإجبار إعادة العرض |

### الجزء 2: إضافة عرض التابعين في البطاقات

| الملف | التغيير |
|------|---------|
| `src/components/clients/PolicyYearTimeline.tsx` | 1. جلب `policy_children` لكل الوثائق<br>2. إضافة state لتخزين عدد الأولاد لكل وثيقة<br>3. عرض badge "👨‍👦 X سائق" في البطاقات |

---

## التفاصيل التقنية

### 1. تعديل PolicyWizard.tsx
```typescript
// سطر 1067-1069 - زيادة التأخير
setTimeout(() => {
  onSaved?.();
}, 300); // زيادة من 150 إلى 300
```

### 2. تعديل ClientDetails.tsx
```typescript
// سطر 1428-1439 - إضافة key ديناميكي للـ Timeline
const [policiesRefreshKey, setPoliciesRefreshKey] = useState(0);

// في onSaved:
onSaved={async () => {
  setPolicyWizardOpen(false);
  await new Promise(resolve => setTimeout(resolve, 100));
  await Promise.all([
    fetchPolicies(),
    fetchPaymentSummary(),
    fetchPayments(),
    fetchCars(),
  ]);
  setPoliciesRefreshKey(prev => prev + 1); // إجبار إعادة العرض
  onRefresh();
}}

// في JSX:
<PolicyYearTimeline 
  key={policiesRefreshKey}
  policies={filteredPolicies}
  ...
/>
```

### 3. تعديل PolicyYearTimeline.tsx

**إضافة state لعدد التابعين:**
```typescript
const [childrenInfo, setChildrenInfo] = useState<Record<string, number>>({});

// Fetch children count per policy
useEffect(() => {
  const fetchChildrenInfo = async () => {
    if (policies.length === 0) {
      setChildrenInfo({});
      return;
    }

    const policyIds = policies.map(p => p.id);
    
    try {
      const { data } = await supabase
        .from('policy_children')
        .select('policy_id')
        .in('policy_id', policyIds);

      const counts: Record<string, number> = {};
      (data || []).forEach(row => {
        counts[row.policy_id] = (counts[row.policy_id] || 0) + 1;
      });

      setChildrenInfo(counts);
    } catch (error) {
      console.error('Error fetching children info:', error);
    }
  };

  fetchChildrenInfo();
}, [policies]);
```

**تمرير عدد التابعين للبطاقة:**
```typescript
// في سطر 598
const childrenCount = pkg.allPolicyIds.reduce((sum, id) => sum + (childrenInfo[id] || 0), 0);

<PolicyPackageCard
  ...
  childrenCount={childrenCount}
/>
```

**عرض badge التابعين في البطاقة:**
```typescript
// في PolicyPackageCard - إضافة prop
childrenCount?: number;

// في JSX بعد badge "جديدة":
{childrenCount > 0 && (
  <Badge variant="outline" className="gap-1 bg-indigo-500/10 text-indigo-700 border-indigo-500/30">
    <Users className="h-3 w-3" />
    {childrenCount} سائق إضافي
  </Badge>
)}
```

---

## ملخص الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `src/components/policies/PolicyWizard.tsx` | تعديل (زيادة التأخير) |
| `src/components/clients/ClientDetails.tsx` | تعديل (إضافة refresh key) |
| `src/components/clients/PolicyYearTimeline.tsx` | تعديل (جلب وعرض التابعين) |

## النتائج المتوقعة

- ✅ الوثيقة الجديدة تظهر فوراً بعد الإنشاء (العداد يتحدث من 3 إلى 4)
- ✅ badge "سائق إضافي" يظهر على البطاقات التي تحتوي على تابعين
- ✅ التابعين يظهرون في تفاصيل الوثيقة (موجود مسبقاً)
- ✅ التابعين يظهرون في تقرير العميل الشامل (موجود مسبقاً)
- ✅ التابعين يُرسلون مع الفواتير للعميل (موجود مسبقاً في edge function)
