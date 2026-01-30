
# خطة: إصلاح نظام الفواتير والإيصالات

## المشاكل المكتشفة

### 1. خطأ في PolicySuccessDialog - "فشل في تحميل الفاتورة"
**السبب**: عند طباعة فاتورة الباقة، يتم إرسال `{ group_id: policyId }` لكن الـ Edge Function يتوقع `{ policy_ids: [...] }`.

**الموقع**: `PolicySuccessDialog.tsx` سطر 43-47

### 2. فاتورة شاملة بجدولين منفصلين
**السبب**: الفاتورة الحالية تعرض قسم "الوثائق" وقسم "الدفعات" كجدولين منفصلين.

**المطلوب**: جدول واحد يشمل: التاريخ، المبلغ، الطريقة، التفاصيل، **رقم السيارة**، نوع التأمين، الحالة.

### 3. لا يوجد زر إيصال لكل دفعة في سجل الدفعات
**المطلوب**: إضافة زر 🧾 لكل دفعة لتوليد إيصال فردي.

---

## التغييرات المطلوبة

### الملف 1: `src/components/policies/PolicySuccessDialog.tsx`

| السطر | التغيير |
|-------|---------|
| 43-47 | تعديل الـ request body ليشمل `policy_ids` بدلاً من `group_id` |

**المنطق الجديد**:
- إذا كانت باقة (`isPackage=true`): جلب جميع policy_ids من `group_id`
- إذا كانت وثيقة مفردة: إرسال `{ policy_id: policyId }` لـ `send-invoice-sms`

**الكود المقترح**:
```typescript
const handlePrintInvoice = async () => {
  setPrintingInvoice(true);
  try {
    let data, error;
    
    if (isPackage) {
      // For package: first get all policy IDs in the group
      const { data: groupPolicies, error: fetchError } = await supabase
        .from('policies')
        .select('id')
        .eq('group_id', policyId);
      
      if (fetchError) throw fetchError;
      
      const policyIds = groupPolicies?.map(p => p.id) || [policyId];
      
      const result = await supabase.functions.invoke('send-package-invoice-sms', {
        body: { policy_ids: policyIds, skip_sms: true }
      });
      data = result.data;
      error = result.error;
    } else {
      // Single policy
      const result = await supabase.functions.invoke('send-invoice-sms', {
        body: { policy_id: policyId, skip_sms: true }
      });
      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    // ...
  }
}
```

---

### الملف 2: `supabase/functions/send-package-invoice-sms/index.ts`

| التغيير | التفاصيل |
|---------|----------|
| إضافة دعم `skip_sms` | لطباعة الفاتورة بدون إرسال SMS |

**المنطق**:
```typescript
const { policy_ids, skip_sms }: { policy_ids: string[], skip_sms?: boolean } = await req.json();

// ... توليد الفاتورة ...

if (!skip_sms) {
  // إرسال SMS
}

return Response({ ..., invoice_url: packageInvoiceUrl });
```

---

### الملف 3: `supabase/functions/send-invoice-sms/index.ts`

| التغيير | التفاصيل |
|---------|----------|
| إضافة دعم `skip_sms` | نفس المنطق |

---

### الملف 4: `supabase/functions/generate-client-payments-invoice/index.ts`

| التغيير | التفاصيل |
|---------|----------|
| دمج الجدولين في جدول واحد | إزالة قسم "الوثائق" المنفصل |
| إضافة عمود "رقم السيارة" | في جدول الدفعات |

**الجدول الجديد**:
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ المبلغ │ التاريخ │ طريقة الدفع │ التفاصيل │ رقم السيارة │ نوع التأمين │ الحالة │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ₪1,000 │ 29/01/26│   نقدي     │    -     │  12-345-67  │   إلزامي   │  مقبول │
│ ₪500   │ 29/01/26│ بطاقة ائتمان│****5678  │  12-345-67  │ ثالث/شامل  │  مقبول │
│        │         │             │ 3 تقسيطات│             │            │        │
│ ₪2,000 │ 29/01/26│    شيك     │ رقم:123  │  12-345-67  │ ثالث/شامل  │ مقبول  │
│        │         │             │15/02/26  │             │            │        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**التغييرات في الكود**:
1. حذف قسم `policiesSummary` المنفصل
2. تعديل `paymentRows` ليشمل عمود رقم السيارة
3. JOIN البيانات من `policy → car` لكل دفعة

---

### الملف 5: `src/components/clients/ClientDetails.tsx`

| التغيير | التفاصيل |
|---------|----------|
| إضافة زر إيصال لكل دفعة | أيقونة 🧾 تفتح `generate-payment-receipt` |

**إضافة في جدول الدفعات**:
```tsx
<TableCell>
  <Button
    variant="ghost"
    size="icon"
    onClick={() => handleGeneratePaymentReceipt(payment.id)}
    disabled={generatingReceipt === payment.id}
  >
    {generatingReceipt === payment.id ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      <Receipt className="h-4 w-4" />
    )}
  </Button>
</TableCell>
```

---

## ملخص الملفات

| الملف | النوع | التغيير |
|-------|-------|---------|
| `PolicySuccessDialog.tsx` | تعديل | إصلاح استدعاء API للباقة |
| `send-package-invoice-sms/index.ts` | تعديل | إضافة `skip_sms` parameter |
| `send-invoice-sms/index.ts` | تعديل | إضافة `skip_sms` parameter |
| `generate-client-payments-invoice/index.ts` | تعديل | جدول واحد مع رقم السيارة |
| `ClientDetails.tsx` | تعديل | زر إيصال لكل دفعة |

---

## النتائج المتوقعة

- ✅ زر "طباعة الفاتورة" يعمل بشكل صحيح بعد إنشاء الوثيقة
- ✅ فاتورة شاملة بجدول واحد يشمل رقم السيارة
- ✅ زر إيصال لكل دفعة في سجل الدفعات
- ✅ إمكانية طباعة الفاتورة بدون إرسال SMS
