
# خطة: تحسينات صفحة الديون

## الميزات المطلوبة

| # | المتطلب | الوصف |
|---|---------|-------|
| 2 | تعديل كتابة التاريخ | تحسين صيغة عرض التاريخ في جدول الديون |
| 3 | وصل الدفع فقط | عند إرسال SMS بعد الدفع، إرسال رابط وصل الدفع فقط وليس التقرير الكامل |
| 4 | رابط لصفحة العميل | جعل اسم العميل قابل للنقر للانتقال لصفحته |
| 5 | عرض آخر حركة | بعد تنزيل دفعة، عرض آخر حركة في ملف العميل |
| 6 | اختيار سيارة محددة | إضافة خيار لاختيار سيارة معينة لتسديد الدين عنها |

---

## التغييرات التفصيلية

### 1) تعديل صيغة التاريخ (ملف: `src/pages/DebtTracking.tsx`)

**الوضع الحالي:**
```tsx
{format(new Date(policy.end_date), "dd/MM/yyyy")}
```

**التعديل:** إضافة اسم اليوم بالعربية أو استخدام صيغة أوضح

---

### 2) وصل الدفع فقط عند إرسال SMS (ملف: `src/components/debt/DebtPaymentModal.tsx`)

**الوضع الحالي (السطور 435-467):**
```tsx
const sendPaymentConfirmationSms = async (paidAmount: number) => {
  // يستدعي generate-client-report ويرسل رابط التقرير الكامل
  const { data: reportData } = await supabase.functions.invoke('generate-client-report', {...});
  const message = `...لعرض تقريرك الشامل:\n${reportUrl}`;
};
```

**التعديل:**
- استدعاء `generate-payment-receipt` بدلاً من `generate-client-report`
- إرسال رابط وصل الدفع المحدد فقط
- تعديل نص الرسالة ليكون "لعرض وصل الدفع"

---

### 3) اسم العميل قابل للنقر (ملف: `src/pages/DebtTracking.tsx`)

**الوضع الحالي (السطر 461):**
```tsx
<p className="font-medium">{client.client_name}</p>
```

**التعديل:**
```tsx
<p 
  className="font-medium text-primary cursor-pointer hover:underline"
  onClick={(e) => {
    e.stopPropagation();
    window.location.href = `/clients?open=${client.client_id}`;
  }}
>
  {client.client_name}
</p>
```

---

### 4) عرض آخر حركة في ملف العميل (ملف: `src/components/debt/DebtPaymentModal.tsx`)

**التعديل:**
- بعد حفظ الدفعة بنجاح، الانتقال لصفحة العميل تلقائياً
- أو إظهار رسالة toast تحتوي رابط للعميل

**الكود المقترح:**
```tsx
// بعد نجاح الحفظ
toast.success('تم تسديد الدفعات بنجاح');
// بدلاً من إغلاق المودال فقط، ننتقل لصفحة العميل
window.location.href = `/clients?open=${clientId}`;
```

---

### 5) اختيار سيارة محددة للدفع (ملف: `src/components/debt/DebtPaymentModal.tsx`)

**التعديل:**
إضافة فلتر للسيارات في بداية المودال

**المكونات المطلوبة:**
1. استخراج قائمة السيارات الفريدة من الوثائق
2. إضافة Select لاختيار السيارة
3. فلترة الوثائق المعروضة حسب السيارة المختارة
4. تحديث حسابات المجاميع بناءً على الفلتر

**الكود المقترح:**
```tsx
const [selectedCarFilter, setSelectedCarFilter] = useState<string | null>(null);

// استخراج السيارات الفريدة
const uniqueCars = useMemo(() => {
  const cars = policies
    .filter(p => p.carNumber)
    .map(p => p.carNumber!)
    .filter((v, i, a) => a.indexOf(v) === i);
  return cars;
}, [policies]);

// الوثائق المفلترة
const filteredPolicies = useMemo(() => {
  if (!selectedCarFilter) return policies;
  return policies.filter(p => p.carNumber === selectedCarFilter);
}, [policies, selectedCarFilter]);
```

**واجهة الفلتر:**
```tsx
<Select value={selectedCarFilter || 'all'} onValueChange={(v) => setSelectedCarFilter(v === 'all' ? null : v)}>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="كل السيارات" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">كل السيارات</SelectItem>
    {uniqueCars.map(car => (
      <SelectItem key={car} value={car}>{car}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

## ملخص الملفات المعدلة

| الملف | التغييرات |
|-------|-----------|
| `src/pages/DebtTracking.tsx` | تحسين صيغة التاريخ + جعل اسم العميل رابط |
| `src/components/debt/DebtPaymentModal.tsx` | فلتر السيارات + إرسال وصل الدفع فقط + الانتقال لصفحة العميل |

---

## المتطلبات التقنية

### Edge Function
- `generate-payment-receipt` موجودة وجاهزة للاستخدام
- تُرجع `receiptUrl` لوصل الدفع المحدد

### التوزيع
- بعد اختيار سيارة، يتم الدفع فقط للوثائق المرتبطة بها
- المجاميع (السعر، المدفوع، المتبقي) تتحدث حسب الفلتر
