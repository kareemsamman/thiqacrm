
# خطة إصلاح قفل دفعات الفيزا وتحديث البيانات الفوري

## المشاكل المكتشفة

### 1. تحويل دفعة موجودة إلى فيزا في نافذة التعديل
**الوضع الحالي**: يمكن للمستخدم تعديل دفعة موجودة (Cash/Cheque/Transfer) وتحويلها إلى "فيزا"، لكن هذا ليس منطقياً لأن دفعات الفيزا يجب أن تمر عبر Tranzila.

**الحل**: إخفاء خيار "فيزا" من قائمة أنواع الدفع في نافذة **تعديل** الدفعة فقط (Edit Dialog)، مع إبقائه في نافذة **إضافة** دفعات جديدة.

### 2. زر "إضافة الدفعات" يعمل حتى مع وجود فيزا غير مدفوعة
**الوضع الحالي**: عند إضافة سطر دفعة من نوع "فيزا" دون دفعه عبر Tranzila (ادفع الآن)، يظل زر "إضافة الدفعات" فعالاً ويسمح بالحفظ.

**الحل المطلوب**: 
- قفل زر "إضافة الدفعات" عند وجود أي سطر فيزا **غير مدفوع** (`tranzilaPaid === false`)
- إظهار رسالة تنبيه للمستخدم أن عليه إتمام الدفع بالبطاقة أولاً
- السماح بإضافة/حذف أسطر دفعات أخرى

### 3. عدم تحديث البيانات فورياً بعد تعديل/إضافة/حذف الدفعات
**الأماكن المتأثرة**:
- `PolicyPaymentsSection.tsx` (داخل Drawer الوثيقة)
- `PolicyDetailsDrawer.tsx` (تحديث الـ drawer نفسه)
- `ClientDetails.tsx` (الخط الزمني + المحفظة)
- `Policies.tsx` (صفحة الوثائق العامة)
- `PolicyYearTimeline.tsx` (الخط الزمني للوثائق)

**الحل**: تحسين callbacks بعد عمليات الدفع لتشمل تحديث جميع البيانات المرتبطة فوراً بدون الحاجة لـ refresh يدوي.

---

## التغييرات المطلوبة

### الملف 1: `src/components/policies/PolicyPaymentsSection.tsx`

| التغيير | التفاصيل |
|---------|----------|
| إخفاء Visa في Edit | فلترة خيار "visa" من قائمة الأنواع في Edit Dialog |
| قفل زر الإضافة | تعطيل الزر عند وجود فيزا غير مدفوعة |
| رسالة تنبيه | إظهار تنبيه عند محاولة الحفظ مع فيزا غير مدفوعة |

**التغيير 1 - فلترة Visa من Edit Dialog** (حوالي السطر 1053):
```tsx
// في Edit Dialog - قائمة أنواع الدفع
<Select 
  value={editFormData.payment_type} 
  onValueChange={v => setEditFormData(f => ({ ...f, payment_type: v }))}
>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    {/* فلترة visa من القائمة في التعديل فقط */}
    {paymentTypes
      .filter(type => type.value !== 'visa')
      .map((type) => (
        <SelectItem key={type.value} value={type.value}>
          <span className="flex items-center gap-2">
            <type.icon className="h-4 w-4" />
            {type.label}
          </span>
        </SelectItem>
      ))}
  </SelectContent>
</Select>
```

**التغيير 2 - حساب وجود فيزا غير مدفوعة** (حوالي السطر 155):
```tsx
// إضافة متغير جديد
const hasUnpaidVisa = paymentLines.some(p => p.paymentType === 'visa' && !p.tranzilaPaid);

// تعديل isValid ليأخذ بالاعتبار الفيزا
const isValid = paymentLines.length > 0 && 
  totalPaymentAmount > 0 && 
  !isOverpaying &&
  !hasUnpaidVisa && // ← إضافة هذا الشرط
  paymentLines.every(p => {
    if (p.paymentType === 'cheque' && !p.chequeNumber?.trim()) return false;
    return p.amount > 0;
  });
```

**التغيير 3 - رسالة تنبيه** (قبل زر الإضافة في DialogFooter):
```tsx
{hasUnpaidVisa && (
  <div className="flex items-center gap-2 text-amber-600 text-sm">
    <AlertCircle className="h-4 w-4" />
    <span>يرجى إتمام الدفع بالبطاقة أولاً قبل الحفظ</span>
  </div>
)}
```

### الملف 2: `src/components/clients/SinglePolicyPaymentModal.tsx`

| التغيير | التفاصيل |
|---------|----------|
| قفل زر الإضافة | تعطيل الزر عند وجود فيزا غير مدفوعة |
| رسالة تنبيه | إظهار تنبيه واضح |

**التغيير** (حوالي السطر 104-111):
```tsx
const hasUnpaidVisa = paymentLines.some(p => p.paymentType === 'visa' && !p.tranzilaPaid);

const isValid = paymentLines.length > 0 && 
  totalPaymentAmount > 0 && 
  !isOverpaying &&
  !hasUnpaidVisa &&
  paymentLines.every(p => {
    if (p.paymentType === 'cheque' && !p.chequeNumber?.trim()) return false;
    return p.amount > 0;
  });
```

### الملف 3: `src/components/clients/PackagePaymentModal.tsx`

| التغيير | التفاصيل |
|---------|----------|
| قفل زر الإضافة | نفس المنطق - تعطيل عند فيزا غير مدفوعة |

**التغيير** (حوالي السطر 108-115):
```tsx
const hasUnpaidVisa = paymentLines.some(p => p.paymentType === 'visa' && !p.tranzilaPaid);

const isValid = paymentLines.length > 0 && 
  totalPaymentAmount > 0 && 
  !isOverpaying &&
  !hasUnpaidVisa &&
  paymentLines.every(p => {
    if (p.paymentType === 'cheque' && !p.chequeNumber?.trim()) return false;
    return p.amount > 0;
  });
```

### الملف 4: `src/components/debt/DebtPaymentModal.tsx`

| التغيير | التفاصيل |
|---------|----------|
| قفل زر الإضافة | نفس المنطق |

**التغيير** (حوالي السطر 115-122):
```tsx
const hasUnpaidVisa = paymentLines.some(p => p.paymentType === 'visa' && !p.tranzilaPaid);

const isValid = paymentLines.length > 0 && 
  totalPaymentAmount > 0 && 
  !isOverpaying &&
  !hasUnpaidVisa &&
  paymentLines.every(p => {
    if (p.paymentType === 'cheque' && !p.chequeNumber?.trim()) return false;
    return p.amount > 0;
  });
```

### الملف 5: `src/components/policies/PolicyDetailsDrawer.tsx`

| التغيير | التفاصيل |
|---------|----------|
| تحديث فوري | تأكيد أن `handlePaymentsChange` يُحدث كل البيانات |

**الوضع الحالي** (السطر 615-624): الكود موجود ويعمل بشكل صحيح مع delay 150ms + `fetchPolicyDetails()`. **لا حاجة لتغيير**.

### الملف 6: `src/pages/Policies.tsx`

| التغيير | التفاصيل |
|---------|----------|
| تحديث فوري بعد إغلاق Drawer | إزالة setTimeout وتحديث فوري |

**التغيير** (السطر 652-655):
```tsx
<PolicyDetailsDrawer
  open={detailsOpen}
  onOpenChange={setDetailsOpen}
  policyId={selectedPolicyId}
  onUpdated={() => {
    fetchPolicies(); // مباشرة بدون setTimeout
  }}
  // ...
/>
```

### الملف 7: `src/components/clients/PolicyYearTimeline.tsx`

| التغيير | التفاصيل |
|---------|----------|
| تحديث فوري | التأكد من استدعاء `refreshPaymentInfo` بعد عمليات الدفع |

**الوضع الحالي** (السطر 627-630): الكود موجود ويستدعي `refreshPaymentInfo()` بعد `onPaymentAdded()`. **لا حاجة لتغيير**.

---

## ملخص الملفات المتأثرة

| الملف | التغييرات |
|-------|----------|
| `PolicyPaymentsSection.tsx` | 1. إخفاء Visa من Edit 2. قفل زر الإضافة 3. رسالة تنبيه |
| `SinglePolicyPaymentModal.tsx` | قفل زر الإضافة عند فيزا غير مدفوعة |
| `PackagePaymentModal.tsx` | قفل زر الإضافة عند فيزا غير مدفوعة |
| `DebtPaymentModal.tsx` | قفل زر الإضافة عند فيزا غير مدفوعة |
| `Policies.tsx` | تحديث فوري بعد إغلاق Drawer |

---

## النتائج المتوقعة

1. ✅ لا يمكن تحويل دفعة موجودة إلى "فيزا" في التعديل
2. ✅ زر "إضافة الدفعات" مقفل حتى يتم دفع الفيزا عبر Tranzila
3. ✅ رسالة تنبيه واضحة للمستخدم
4. ✅ تحديث فوري للبيانات في كل أجزاء النظام بعد تعديل/إضافة/حذف الدفعات
5. ✅ يمكن للمستخدم إضافة/حذف أسطر دفعات أخرى (غير الفيزا غير المدفوعة)
