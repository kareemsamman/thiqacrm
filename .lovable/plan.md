

# تجميع الدفعات في سجل الدفعات - عرض موحد

## المشكلة الحالية

عند الدفع عبر "تسديد ديون":
- المستخدم يُدخل مبلغ واحد (مثلاً 2500 نقدي)
- النظام يُقسم المبلغ على عدة وثائق (300, 400, 1500, 1200, 300)
- سجل الدفعات يعرض **5 سجلات منفصلة** بدلاً من سجل واحد

## الحل المقترح

إضافة **حقل ربط (batch_id)** للدفعات المتعلقة ببعضها، ثم تجميعها في العرض.

---

## التغييرات المطلوبة

### 1. إضافة حقل `batch_id` لجدول `policy_payments`

```sql
ALTER TABLE policy_payments ADD COLUMN batch_id UUID DEFAULT NULL;
CREATE INDEX idx_payments_batch_id ON policy_payments(batch_id);
```

### 2. تعديل `DebtPaymentModal.tsx` لإنشاء `batch_id` مشترك

عند تسجيل دفعة واحدة تُقسم على عدة وثائق:
- إنشاء `batch_id` واحد
- تعيينه لكل سجل دفعة في نفس العملية

```tsx
// قبل إنشاء الدفعات
const batchId = crypto.randomUUID();

// عند إنشاء كل دفعة
const paymentsToInsert = splits.map(split => ({
  policy_id: split.policyId,
  amount: split.amount,
  payment_type: paymentLine.paymentType,
  payment_date: paymentLine.paymentDate,
  batch_id: batchId, // ← ربط الدفعات معاً
  // ... باقي الحقول
}));
```

### 3. تعديل عرض سجل الدفعات في `ClientDetails.tsx`

تجميع الدفعات بـ `batch_id` وعرضها كسجل واحد:

```tsx
// تجميع الدفعات
const groupedPayments = useMemo(() => {
  const groups = new Map();
  
  for (const payment of payments) {
    const key = payment.batch_id || payment.id; // استخدام batch_id أو id الفردي
    
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        payments: [],
        total_amount: 0,
        payment_type: payment.payment_type,
        payment_date: payment.payment_date,
        // ... باقي الحقول المشتركة
      });
    }
    
    const group = groups.get(key);
    group.payments.push(payment);
    group.total_amount += payment.amount;
  }
  
  return Array.from(groups.values());
}, [payments]);
```

### 4. تحديث عرض الجدول

| قبل | بعد |
|-----|-----|
| ₪300 - نقدي - خدمات الطريق | ₪2,500 - نقدي - (ثالث/شامل, خدمات الطريق, إلزامي) |
| ₪400 - نقدي - ثالث/شامل | |
| ₪1,500 - نقدي - ثالث/شامل | |
| ₪1,200 - نقدي - إلزامي | |
| ₪300 - نقدي - خدمات الطريق | |

---

## تفاصيل العرض الجديد

### عمود "نوع التأمين" للدفعات المجمعة

عرض كل أنواع التأمين المشمولة:

```tsx
<TableCell>
  <div className="flex flex-wrap gap-1">
    {uniquePolicyTypes.map(type => (
      <Badge key={type}>{policyTypeLabels[type]}</Badge>
    ))}
  </div>
</TableCell>
```

### خيار توسيع التفاصيل (اختياري)

إضافة سهم صغير لتوسيع الصف وعرض تفاصيل التوزيع:

```
▼ ₪2,500 - نقدي - 06/02/2026
    ├─ ₪300 → خدمات الطريق
    ├─ ₪400 → ثالث/شامل  
    ├─ ₪1,500 → ثالث/شامل
    └─ ₪300 → خدمات الطريق
```

---

## ملخص التغييرات

| الملف | التغيير |
|-------|---------|
| Migration SQL | إضافة حقل `batch_id` |
| `DebtPaymentModal.tsx` | إنشاء وتعيين `batch_id` للدفعات المرتبطة |
| `ClientDetails.tsx` | تجميع الدفعات بـ `batch_id` وعرضها كصف واحد |
| (اختياري) | إضافة توسيع لعرض تفاصيل التوزيع |

---

## الفائدة

- **للمستخدم**: رؤية واضحة - "دفعت 2500 نقدي" بدلاً من 5 سجلات منفصلة
- **للمحاسبة**: البيانات الداخلية تبقى كما هي (كل وثيقة بدفعتها)
- **للتقارير**: يمكن عرض الإجمالي أو التفصيل حسب الحاجة

