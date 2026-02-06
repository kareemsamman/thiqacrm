

# تحسينات قسم "النشاط الأخير" - Dashboard

## ملخص المشاكل من الصور المرفقة

| المشكلة | الموقع | الحل |
|---------|--------|------|
| السهم خاطئ `→` | الكارت والـ Popup | تغيير إلى `+` أو فصل بدون سهم |
| لا يظهر من أنشأ الدفعة | كل دفعة في التفاصيل | إضافة اسم المنشئ + التاريخ والوقت |
| الـ Popup يعرض 24 ساعة فقط | Dialog | تغيير ليعرض الشهر الحالي |
| فلترة التاريخ لا تعمل | Dialog | الفلترة تعمل على data محدودة - يجب جلب data أكثر |

---

## التغييرات المطلوبة

### 1. تغيير التنسيق من `→` إلى `+`

**قبل:**
```
إعفاء حوادث → شركة اكس
شامل → اراضي مقدسة
```

**بعد:**
```
إعفاء حوادث + شركة اكس
شامل + اراضي مقدسة
```

**الأماكن المتأثرة:**
- سطر 671: `{group.payments.items[0].companyName && ` → ${group.payments.items[0].companyName}`}`
- سطر 707: `{policy.companyName && <span className="text-muted-foreground">→ {policy.companyName}</span>}`
- سطر 741: `{group.policies[0].companyName && ` → ${group.policies[0].companyName}`}`

**التغيير:**
```tsx
// تغيير كل → إلى +
` + ${companyName}`
```

---

### 2. إضافة اسم المنشئ + التاريخ والوقت لكل دفعة

**الحالة الحالية:** التفاصيل تعرض فقط:
- نوع الدفعة (شيك/نقدًا)
- رقم الشيك
- نوع الوثيقة
- المبلغ

**المطلوب:** إضافة لكل دفعة:
- اسم المنشئ (الموظف/الأدمن)
- التاريخ والوقت

**التنسيق الجديد:**
```
تفاصيل الدفعات:
┌─────────────────────────────────────────────────────────────┐
│ [شيك] #80001251  شامل           ₪1,800                      │
│ أحمد • 10/02/2026 14:35                                     │
├─────────────────────────────────────────────────────────────┤
│ [نقدًا] إعفاء حوادث              ₪100                       │
│ سارة • 10/02/2026 15:20                                     │
└─────────────────────────────────────────────────────────────┘
```

**التغيير في الكود (سطر 679-693):**
```tsx
{group.payments.items.map((item) => (
  <div key={item.id} className="flex flex-col gap-0.5 text-xs border-b last:border-0 pb-1.5 last:pb-0">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn("text-[10px] px-1", PAYMENT_TYPE_COLORS[item.paymentType])}
        >
          {PAYMENT_TYPE_LABELS[item.paymentType] || item.paymentType}
        </Badge>
        {item.chequeNumber && <span className="text-muted-foreground">#{item.chequeNumber}</span>}
        <span className="text-muted-foreground">{item.policyType}</span>
      </div>
      <span className="font-medium ltr-nums">₪{item.amount.toLocaleString()}</span>
    </div>
    {/* Creator name + datetime */}
    <div className="text-[10px] text-muted-foreground">
      {item.createdBy && <span>{item.createdBy}</span>}
      {item.createdBy && item.createdAt && <span> • </span>}
      {item.createdAt && <span>{formatDateTime(item.createdAt)}</span>}
    </div>
  </div>
))}
```

**دالة تنسيق التاريخ والوقت:**
```typescript
const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};
```

---

### 3. تغيير الـ Popup ليعرض الشهر الحالي

**الحالة الحالية:**
- الـ Query يجلب آخر 24 ساعة فقط (`subHours(new Date(), 24)`)
- الفلترة تعمل على هذه البيانات المحدودة

**المشكلة:**
عندما المستخدم يفتح الـ Popup ويختار تاريخ قبل أسبوع - لا توجد بيانات لأن الـ Query أصلاً جلب 24 ساعة فقط!

**الحل:**
1. **Dashboard**: يبقى يعرض آخر 24 ساعة (للأداء)
2. **Popup**: يجلب بيانات الشهر الحالي بـ Query منفصل

**التغييرات:**

#### أ) إضافة Query منفصل للـ Popup (الشهر الحالي)

```typescript
// Query للـ Popup - الشهر الحالي
const { data: dialogActivities = [], isLoading: isDialogLoading } = useQuery({
  queryKey: ["recent-activity-month", branchId],
  queryFn: async () => {
    const results: Activity[] = [];
    const branchFilter = branchId ? { branch_id: branchId } : {};
    
    // أول يوم في الشهر الحالي
    const startOfCurrentMonth = startOfMonth(new Date()).toISOString();

    // Fetch policies for current month
    const { data: policies } = await supabase
      .from("policies")
      .select(`...same select...`)
      .gte("created_at", startOfCurrentMonth)
      .order("created_at", { ascending: false })
      .match(branchFilter)
      .eq("cancelled", false)
      .limit(500);

    // ... same processing logic for policies, payments, clients, cars

    return results;
  },
  enabled: showDialog, // يعمل فقط عند فتح الـ Popup
  staleTime: 60 * 1000,
});
```

#### ب) تعديل الفلترة لتعمل على بيانات الشهر

```typescript
const dialogFilteredActivities = useMemo(() => {
  // استخدام dialogActivities بدلاً من activities
  let filtered = [...dialogActivities];
  
  // ... same filtering logic
}, [dialogActivities, typeFilter, dateFrom, dateTo, dialogSearch]);
```

---

### 4. إصلاح فلترة التاريخ

**المشكلة الحالية:**
الفلترة موجودة في الكود (سطر 433-440) لكنها تعمل على `activities` وهي بيانات 24 ساعة فقط!

**الحل:**
بعد تغيير الـ Query للشهر الحالي، الفلترة ستعمل تلقائياً على البيانات الأوسع.

**إضافة: دعم الأشهر السابقة**
إذا أراد المستخدم رؤية شهر سابق، نحتاج:

```typescript
// State للشهر المختار
const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

// Query يعتمد على الشهر
const { data: dialogActivities = [] } = useQuery({
  queryKey: ["recent-activity-month", branchId, format(selectedMonth, 'yyyy-MM')],
  queryFn: async () => {
    const startDate = startOfMonth(selectedMonth).toISOString();
    const endDate = endOfMonth(selectedMonth).toISOString();
    
    // Fetch with date range
    const { data: policies } = await supabase
      .from("policies")
      .select(`...`)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      ...
  },
  enabled: showDialog,
});
```

---

## ملخص التغييرات على الكود

### الملف: `src/components/dashboard/RecentActivity.tsx`

| رقم السطر | التغيير |
|-----------|---------|
| بعد سطر 27 | إضافة import لـ `startOfMonth`, `endOfMonth`, `format` |
| قبل سطر 211 | إضافة دالة `formatDateTime()` |
| سطر 222-398 | تقسيم إلى Query منفصلين: 24h للـ Dashboard، شهر للـ Popup |
| سطر 671 | تغيير `→` إلى `+` |
| سطر 679-693 | إعادة كتابة لإضافة اسم المنشئ + التاريخ/الوقت |
| سطر 707 | تغيير `→` إلى `+` |
| سطر 741 | تغيير `→` إلى `+` |

---

## واجهة المستخدم المحسّنة

### Dashboard Card (24 ساعة) - بدون تغيير كبير
```
┌─────────────────────────────────────────────┐
│ جمال محمد داري (66)       منذ 21 ساعة       │
├─────────────────────────────────────────────┤
│ 4 دفعات                                     │
│ [نقدًا: ₪100] [شيك: ₪5,400]                │
│ إعفاء حوادث + شركة اكس                     │  ← تغيير السهم
└─────────────────────────────────────────────┘
```

### Popup (الشهر الحالي) - مع تفاصيل كاملة
```
┌─────────────────────────────────────────────────────────────┐
│ تفاصيل الدفعات:                                             │
├─────────────────────────────────────────────────────────────┤
│ [نقدًا] إعفاء حوادث                           ₪100          │
│ أحمد • 10/02/2026 14:35                                     │  ← جديد!
├─────────────────────────────────────────────────────────────┤
│ [شيك] #80001251 شامل                          ₪1,800        │
│ سارة • 10/02/2026 14:40                                     │  ← جديد!
├─────────────────────────────────────────────────────────────┤
│ [شيك] #80001252 شامل                          ₪1,800        │
│ أحمد • 10/02/2026 14:42                                     │  ← جديد!
└─────────────────────────────────────────────────────────────┘
```

---

## خطوات التنفيذ

1. **إضافة دالة `formatDateTime`** لتنسيق التاريخ والوقت
2. **تقسيم الـ Query** إلى:
   - Query للـ Dashboard (24 ساعة) - يبقى كما هو
   - Query للـ Popup (الشهر الحالي) - جديد
3. **تحديث JSX**:
   - تغيير كل `→` إلى `+`
   - إضافة سطر المنشئ + التاريخ/الوقت لكل دفعة
4. **تحديث الفلترة** لتستخدم بيانات الشهر
5. **اختبار**:
   - فلترة التاريخ تعمل
   - البحث يعمل
   - أسماء المنشئين تظهر
   - التوقيت صحيح

